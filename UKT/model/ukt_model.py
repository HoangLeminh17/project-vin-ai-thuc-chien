"""
Adapter cho UKT model từ repo gốc:
https://github.com/UncertaintyForKnowledgeTracing/UKT

Cách dùng:
1. Clone repo UKT vào thư mục model/ukt_src/
2. Copy checkpoint .pt vào model/checkpoints/
3. Set env var UKT_CHECKPOINT_PATH=model/checkpoints/ukt_best.pt
"""

import torch
import torch.nn as nn
import math


class WassersteinSelfAttention(nn.Module):
    """
    Wasserstein-based self-attention từ paper UKT (Section: Wasserstein-Based Self-Attention).
    Thay thế dot-product attention bằng negative 2-Wasserstein distance.
    """

    def __init__(self, d_model: int):
        super().__init__()
        self.d_model = d_model
        self.scale = math.sqrt(d_model)

    def wasserstein_distance(self, mu1, sigma1, mu2, sigma2):
        """
        W2 distance giữa hai Gaussian:
        W2² = ||µ1 - µ2||² + trace(σ1 + σ2 - 2*(σ1^0.5 * σ2 * σ1^0.5)^0.5)
        Approximation cho diagonal covariance: W2² = ||µ1-µ2||² + ||√σ1-√σ2||²
        """
        mean_dist = torch.sum((mu1 - mu2) ** 2, dim=-1)
        std_dist  = torch.sum((torch.sqrt(sigma1 + 1e-8) - torch.sqrt(sigma2 + 1e-8)) ** 2, dim=-1)
        return mean_dist + std_dist

    def forward(self, q_mu, q_sigma, k_mu, k_sigma, v_mu, v_sigma):
        """
        Args:
            q_mu, q_sigma: (B, 1, D) — query (current KC)
            k_mu, k_sigma: (B, T, D) — keys (history)
            v_mu, v_sigma: (B, T, D) — values (interaction embeddings)
        Returns:
            h_mu, h_sigma: (B, D) — retrieved knowledge state
        """
        # Score = negative W2 distance (B, T)
        scores = -self.wasserstein_distance(
            q_mu.expand_as(k_mu), q_sigma.expand_as(k_sigma),
            k_mu, k_sigma,
        )

        # Causal mask (chỉ attend đến quá khứ)
        k_mu.size(1)
        attn_weights = torch.softmax(scores / self.scale, dim=-1)   # (B, T)

        # Weighted sum of values
        w = attn_weights.unsqueeze(-1)        # (B, T, 1)
        h_mu    = (w * v_mu).sum(dim=1)      # (B, D)
        h_sigma = (w * v_sigma).sum(dim=1)   # (B, D)

        return h_mu, h_sigma


class StochasticEmbedding(nn.Module):
    """
    Stochastic embedding layer: mỗi interaction → (µ, σ) Gaussian.
    µ biểu diễn base knowledge, σ biểu diễn uncertainty.
    """

    def __init__(self, n_kc: int, n_questions: int, d_model: int):
        super().__init__()
        self.kc_mu    = nn.Embedding(n_kc + 1, d_model, padding_idx=0)
        self.kc_sigma = nn.Embedding(n_kc + 1, d_model, padding_idx=0)
        self.resp_mu  = nn.Embedding(3, d_model)        # 0=wrong, 1=correct, 2=pad
        self.resp_sigma = nn.Embedding(3, d_model)
        self.elu = nn.ELU()

    def forward(self, kc_ids, responses):
        """
        Args:
            kc_ids:    (B, T) — KC indices
            responses: (B, T) — 0/1
        Returns:
            mu, sigma: (B, T, D)
        """
        mu    = self.kc_mu(kc_ids) + self.resp_mu(responses)
        sigma = self.elu(self.kc_sigma(kc_ids) + self.resp_sigma(responses)) + 1.0
        return mu, sigma


class UKTModel(nn.Module):
    """
    Simplified UKT model theo paper.
    Để dùng với checkpoint từ repo gốc, implement load_from_checkpoint()
    mapping state_dict key names.
    """

    def __init__(
        self,
        n_kc: int = 200,
        n_questions: int = 20000,
        d_model: int = 128,
        n_heads: int = 4,
        n_layers: int = 2,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.embedding = StochasticEmbedding(n_kc, n_questions, d_model)
        self.attention_layers = nn.ModuleList([
            WassersteinSelfAttention(d_model) for _ in range(n_layers)
        ])
        self.ffn_mu = nn.Sequential(
            nn.Linear(d_model * 2, d_model), nn.ReLU(), nn.Linear(d_model, d_model)
        )
        self.ffn_sigma = nn.Sequential(
            nn.Linear(d_model * 2, d_model), nn.ReLU(), nn.Linear(d_model, d_model), nn.ELU()
        )
        self.predictor = nn.Linear(d_model * 2, 1)
        self.dropout = nn.Dropout(dropout)

    def forward(self, kc_ids, responses):
        """
        Args:
            kc_ids:    (B, T)
            responses: (B, T)
        Returns:
            logits: (B, T) — xác suất trả lời đúng câu kế tiếp
            h_mu:   (B, T, D)
            h_sigma:(B, T, D)
        """
        mu, sigma = self.embedding(kc_ids, responses)

        for attn in self.attention_layers:
            h_mu_list, h_sigma_list = [], []
            for t in range(mu.size(1)):
                q_mu    = mu[:, t:t+1, :]
                q_sigma = sigma[:, t:t+1, :]
                if t == 0:
                    h_mu_t    = torch.zeros_like(q_mu.squeeze(1))
                    h_sigma_t = torch.ones_like(q_mu.squeeze(1))
                else:
                    h_mu_t, h_sigma_t = attn(
                        q_mu, q_sigma,
                        mu[:, :t, :], sigma[:, :t, :],
                        mu[:, :t, :], sigma[:, :t, :],
                    )
                h_mu_list.append(h_mu_t)
                h_sigma_list.append(h_sigma_t)

            h_mu    = torch.stack(h_mu_list, dim=1)
            h_sigma = torch.stack(h_sigma_list, dim=1)
            # FFN refinement
            cat_mu    = torch.cat([h_mu, mu], dim=-1)
            cat_sigma = torch.cat([h_sigma, sigma], dim=-1)
            mu    = self.ffn_mu(cat_mu)
            sigma = self.ffn_sigma(cat_sigma) + 1.0
            mu    = self.dropout(mu)

        logits = self.predictor(torch.cat([mu, sigma], dim=-1)).squeeze(-1)
        return logits, mu, sigma

    @classmethod
    def load_from_checkpoint(cls, path: str) -> "UKTModel":
        """
        Load checkpoint từ repo gốc UKT.
        Nếu key names khác → cần map thủ công ở đây.
        """
        checkpoint = torch.load(path, map_location="cpu")
        config = checkpoint.get("config", {})
        model = cls(
            n_kc=config.get("n_kc", 200),
            n_questions=config.get("n_questions", 20000),
            d_model=config.get("d_model", 128),
            n_layers=config.get("n_layers", 2),
        )
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict, strict=False)
        return model
