"""
UKT Engine — wraps PyTorch UKT model với fallback Bayesian heuristic.

Cấu trúc:
  - Nếu có checkpoint PyTorch → dùng model thật
  - Nếu chưa có → dùng BayesianKT (Beta distribution) làm approximation
    đủ tốt để demo và thu thập data thực để train sau
"""

import math
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Cố gắng load PyTorch UKT ─────────────────────────────────────────────────
try:
    import torch  # noqa: F401
    from model.ukt_model import UKTModel
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch không tìm thấy → dùng BayesianKT fallback")


class UKTEngine:
    """
    Wrapper thống nhất:
      - predict(interactions) → KCState per KC
      - update_state(state, kc_id, rating) → updated state
    """

    def __init__(self):
        self.model = None
        checkpoint = os.getenv("UKT_CHECKPOINT_PATH", "")

        if TORCH_AVAILABLE and checkpoint and os.path.exists(checkpoint):
            self._load_pytorch_model(checkpoint)
        else:
            logger.info("Dùng BayesianKT approximation (chưa có UKT checkpoint)")

    def _load_pytorch_model(self, path: str):
        """Load UKT checkpoint từ repo gốc."""
        try:
            self.model = UKTModel.load_from_checkpoint(path)
            self.model.eval()
            logger.info(f"UKT model loaded từ {path}")
        except Exception as e:
            logger.error(f"Load model thất bại: {e} → fallback BayesianKT")
            self.model = None

    # ── Public API ────────────────────────────────────────────────────────────

    def predict(
        self,
        interactions: list,
        prior_state: Optional[dict],
        total_minutes: int,
    ) -> object:
        """
        Trả về PredictResponse-compatible dict.
        Dispatch sang PyTorch hoặc Bayesian tùy availability.
        """
        if self.model is not None:
            return self._predict_pytorch(interactions, prior_state, total_minutes)
        return self._predict_bayesian(interactions, prior_state, total_minutes)

    def update_state(self, current_state: dict, kc_id: str, rating: str) -> dict:
        """
        Cập nhật (µ, σ) sau khi học sinh tự đánh giá thẻ.
        rating: "hard" | "ok" | "easy"
        """
        state = dict(current_state)
        if kc_id not in state:
            state[kc_id] = {"mu": 0.5, "sigma": 0.5, "p_correct": 0.5, "aleatory_flag": False}

        kc = dict(state[kc_id])
        # Bayesian update đơn giản: rating ảnh hưởng đến alpha/beta ngầm
        delta = {"hard": -0.08, "ok": 0.03, "easy": 0.12}[rating]
        sigma_delta = {"hard": 0.04, "ok": -0.02, "easy": -0.05}[rating]

        kc["mu"] = float(max(0.01, min(0.99, kc["mu"] + delta)))
        kc["sigma"] = float(max(0.05, min(0.95, kc["sigma"] + sigma_delta)))
        kc["p_correct"] = _sigmoid(4 * (kc["mu"] - 0.5))
        state[kc_id] = kc
        return state

    # ── PyTorch path ──────────────────────────────────────────────────────────

    def _predict_pytorch(self, interactions, prior_state, total_minutes):
        """
        Gọi UKT model thật:
        1. Build sequence tensor từ interactions
        2. Forward pass → (mu, sigma) per KC
        3. Wasserstein attention output → knowledge state
        4. Aleatory contrastive filter
        """
        import torch
        seq = _build_sequence_tensor(interactions)
        with torch.no_grad():
            mu, sigma = self.model(seq)   # shape: (n_kc,)

        kc_ids = list({i.kc_id for i in interactions})
        knowledge_state = {}
        for idx, kc_id in enumerate(kc_ids):
            m = float(mu[idx])
            s = float(sigma[idx])
            knowledge_state[kc_id] = {
                "mu": m,
                "sigma": s,
                "p_correct": _sigmoid(4 * (m - 0.5)),
                "aleatory_flag": _is_aleatory(interactions, kc_id),
            }

        return _build_response(interactions[0].student_id if hasattr(interactions[0], 'student_id') else "unknown",
                               knowledge_state, total_minutes)

    # ── Bayesian fallback ─────────────────────────────────────────────────────

    def _predict_bayesian(self, interactions, prior_state, total_minutes):
        """
        Approximation bằng Beta distribution per KC.
        - alpha = #correct + 1  (prior = Beta(1,1) uniform)
        - beta  = #wrong   + 1
        - µ  = alpha / (alpha + beta)   → mean của Beta
        - σ  = sqrt(µ(1-µ)/(alpha+beta+1))  → std của Beta
        - Aleatory flag: interaction bất thường (chuỗi đúng → đột ngột sai)
        """
        from collections import defaultdict
        kc_correct = defaultdict(int)
        kc_total   = defaultdict(int)

        # Tích hợp prior state nếu có
        kc_alpha = defaultdict(lambda: 1.0)
        kc_beta_  = defaultdict(lambda: 1.0)
        if prior_state:
            for kc_id, s in prior_state.items():
                mu_p = s.get("mu", 0.5) if isinstance(s, dict) else s.mu
                sig_p = s.get("sigma", 0.3) if isinstance(s, dict) else s.sigma
                # Reconstruct pseudo-counts từ Beta distribution
                n = max(1, (mu_p * (1 - mu_p)) / (sig_p ** 2 + 1e-6) - 1)
                kc_alpha[kc_id] = mu_p * n
                kc_beta_[kc_id] = (1 - mu_p) * n

        for interaction in interactions:
            kc = interaction.kc_id
            kc_total[kc] += 1
            if interaction.response == 1:
                kc_correct[kc] += 1
                kc_alpha[kc] += 1
            else:
                kc_beta_[kc] += 1

        knowledge_state = {}
        all_kcs = set(kc_alpha.keys()) | set(kc_total.keys())

        for kc_id in all_kcs:
            a = kc_alpha[kc_id]
            b = kc_beta_[kc_id]
            mu    = a / (a + b)
            sigma = math.sqrt(a * b / ((a + b) ** 2 * (a + b + 1)))
            knowledge_state[kc_id] = {
                "mu": round(mu, 4),
                "sigma": round(sigma, 4),
                "p_correct": round(_sigmoid(4 * (mu - 0.5)), 4),
                "aleatory_flag": _is_aleatory(interactions, kc_id),
            }

        student_id = getattr(interactions[0], 'student_id', 'unknown') if interactions else 'unknown'
        return _build_response(student_id, knowledge_state, total_minutes)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _is_aleatory(interactions: list, kc_id: str) -> bool:
    """
    Heuristic phát hiện aleatory uncertainty:
    - Nếu học sinh trả lời đúng liên tiếp ≥3 lần rồi đột ngột sai → có thể làm ẩu
    - Nếu sai liên tiếp ≥3 lần rồi đột ngột đúng → có thể đoán mò
    Đây là approximation của aleatory contrastive filter trong UKT gốc.
    """
    kc_responses = [i.response for i in interactions if i.kc_id == kc_id]
    if len(kc_responses) < 4:
        return False

    for i in range(len(kc_responses) - 3):
        window = kc_responses[i:i+4]
        # 3 đúng liên tiếp → sai (careless)
        if window[:3] == [1, 1, 1] and window[3] == 0:
            return True
        # 3 sai liên tiếp → đúng (lucky guess)
        if window[:3] == [0, 0, 0] and window[3] == 1:
            return True
    return False


def _build_sequence_tensor(interactions):
    """Convert interaction list → PyTorch tensor cho UKT model."""
    import torch
    seq = [[i.question_id, hash(i.kc_id) % 1000, i.response] for i in interactions]
    return torch.tensor(seq, dtype=torch.float32).unsqueeze(0)  # (1, T, 3)


def _build_response(student_id: str, knowledge_state: dict, total_minutes: int):
    """Build PredictResponse object từ knowledge_state dict."""
    from app.schemas import PredictResponse, KCState

    # Sắp xếp: µ thấp nhất + σ cao nhất → ưu tiên học trước
    priority_order = sorted(
        knowledge_state.keys(),
        key=lambda kc: (knowledge_state[kc]["mu"] - knowledge_state[kc]["sigma"])
    )

    # Zone of proximal development: P(correct) gần 0.7 nhất
    target = 0.7
    next_card_kc = min(
        [kc for kc in knowledge_state if not knowledge_state[kc]["aleatory_flag"]]
        or list(knowledge_state.keys()),
        key=lambda kc: abs(knowledge_state[kc]["p_correct"] - target)
    )

    aleatory_flags = [kc for kc, s in knowledge_state.items() if s["aleatory_flag"]]

    # Còn ít thời gian → exploit (củng cố), nhiều thời gian → explore (mở rộng)
    recommendation = "exploit" if total_minutes < 15 else "explore"

    return PredictResponse(
        student_id=student_id,
        knowledge_state={kc: KCState(**s) for kc, s in knowledge_state.items()},
        priority_order=priority_order,
        next_card_kc=next_card_kc,
        aleatory_flags=aleatory_flags,
        session_recommendation=recommendation,
    )
