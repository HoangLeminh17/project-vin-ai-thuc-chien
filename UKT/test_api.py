"""
Test suite cho UKT API.
Chạy: pytest test_api.py -v
Hoặc: python test_api.py  (không cần pytest)
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import asyncio
import time
import threading
import types
from types import SimpleNamespace

# ── Helpers ───────────────────────────────────────────────────────────────────

def make_interaction(kc_id: str, response: int, question_id: int = 1, ts_offset: int = 0):
    from app.schemas import Interaction
    return Interaction(
        question_id=question_id,
        kc_id=kc_id,
        response=response,
        timestamp=int(time.time()) + ts_offset,
    )


def make_interactions_for_student():
    """Chuỗi tương tác mô phỏng học sinh học Toán."""
    return [
        make_interaction("dao_ham",   1, q_id, i*60)
        for i, q_id in enumerate([1, 2, 3])
    ] + [
        make_interaction("tich_phan", 0, q_id, (3+i)*60)
        for i, q_id in enumerate([4, 5, 6])
    ] + [
        make_interaction("gioi_han",  1, 7,  7*60),
        make_interaction("gioi_han",  0, 8,  8*60),
        make_interaction("ma_tran",   0, 9,  9*60),
        make_interaction("ma_tran",   0, 10, 10*60),
    ]


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_bayesian_engine_basic():
    """UKTEngine hoạt động với BayesianKT (không cần PyTorch)."""
    from app.ukt_engine import UKTEngine

    engine = UKTEngine()
    interactions = make_interactions_for_student()

    result = engine.predict(
        interactions=interactions,
        prior_state=None,
        total_minutes=45,
    )

    # Knowledge state có đủ KC
    assert "dao_ham" in result.knowledge_state
    assert "tich_phan" in result.knowledge_state

    # µ của dao_ham (3/3 đúng) > µ của tich_phan (3/3 sai)
    mu_dh = result.knowledge_state["dao_ham"].mu
    mu_tp = result.knowledge_state["tich_phan"].mu
    assert mu_dh > mu_tp, f"Expected dao_ham ({mu_dh:.3f}) > tich_phan ({mu_tp:.3f})"

    # priority_order: tich_phan phải ở trên (yếu hơn)
    assert result.priority_order[0] in ["tich_phan", "ma_tran"], \
        f"Weak KC should be first, got: {result.priority_order}"

    print("[PASS] test_bayesian_engine_basic")
    print(f"  dao_ham  µ={mu_dh:.3f}")
    print(f"  tich_phan µ={mu_tp:.3f}")
    print(f"  priority_order: {result.priority_order}")


def test_sigma_represents_uncertainty():
    """σ phản ánh uncertainty: ít data → σ cao, nhiều data → σ thấp."""
    from app.ukt_engine import UKTEngine

    engine = UKTEngine()

    # Ít tương tác
    few = [make_interaction("khai_niem_A", 1, i) for i in range(2)]
    result_few = engine.predict(few, None, 45)

    # Nhiều tương tác
    many = [make_interaction("khai_niem_B", 1, i) for i in range(20)]
    result_many = engine.predict(many, None, 45)

    sigma_few  = result_few.knowledge_state["khai_niem_A"].sigma
    sigma_many = result_many.knowledge_state["khai_niem_B"].sigma

    assert sigma_few > sigma_many, \
        f"Ít data nên sigma cao hơn: {sigma_few:.3f} vs {sigma_many:.3f}"
    print("[PASS] test_sigma_represents_uncertainty")
    print(f"  sigma (2 interactions):  {sigma_few:.3f}")
    print(f"  sigma (20 interactions): {sigma_many:.3f}")


def test_aleatory_flag_detection():
    """Phát hiện đoán mò: 3 sai liên tiếp → đột ngột đúng."""
    from app.ukt_engine import _is_aleatory

    # Lucky guess pattern
    lucky = [
        make_interaction("kc_x", 0, i, i*30) for i in range(3)
    ] + [make_interaction("kc_x", 1, 3, 90)]

    assert _is_aleatory(lucky, "kc_x"), "Nên phát hiện lucky guess"

    # Careless pattern
    careless = [
        make_interaction("kc_y", 1, i, i*30) for i in range(3)
    ] + [make_interaction("kc_y", 0, 3, 90)]

    assert _is_aleatory(careless, "kc_y"), "Nên phát hiện careless mistake"

    # Normal pattern — không nên flag
    normal = [make_interaction("kc_z", 1, i, i*30) for i in range(5)]
    assert not _is_aleatory(normal, "kc_z"), "Không nên flag pattern bình thường"

    print("[PASS] test_aleatory_flag_detection")


def test_next_card_zone_of_proximal_development():
    """next_card_kc chọn KC có P(correct) gần 0.7 nhất."""
    from app.ukt_engine import UKTEngine

    engine = UKTEngine()
    # kc_hard: sai hết → p_correct thấp (~0.15)
    # kc_easy: đúng hết → p_correct cao (~0.84)
    # kc_medium: xen kẽ 1đúng-1sai → mu~0.5, sau đó thêm đúng → ~0.67, gần 0.7 nhất
    # Dùng pattern xen kẽ để không trigger aleatory flag
    medium_interactions = []
    for i in range(20):
        medium_interactions.append(make_interaction("kc_medium", i % 2, i + 20, (i+20)*30))
    # Thêm 5 đúng cuối để đẩy p_correct lên gần 0.7
    for i in range(5):
        medium_interactions.append(make_interaction("kc_medium", 1, i+40, (i+40)*30))

    interactions = (
        [make_interaction("kc_hard",   0, i,    i*30) for i in range(10)] +
        [make_interaction("kc_easy",   1, i+10, (i+10)*30) for i in range(10)] +
        medium_interactions
    )
    result = engine.predict(interactions, None, 45)

    # Kiểm tra kc_medium không bị aleatory flag
    assert not result.knowledge_state["kc_medium"].aleatory_flag, "kc_medium không nên bị aleatory flag"

    # KC gần 0.7 nhất nên là kc_medium
    assert result.next_card_kc == "kc_medium", \
        f"Nên chọn kc_medium (zone of proximal dev.), got: {result.next_card_kc}\n" \
        f"p_correct values: { {kc: round(s.p_correct,3) for kc,s in result.knowledge_state.items()} }"
    print("[PASS] test_next_card_zone_of_proximal_development")
    print(f"  next_card_kc = {result.next_card_kc}")
    for kc, s in result.knowledge_state.items():
        print(f"  {kc}: µ={s.mu:.3f}, p_correct={s.p_correct:.3f}")


def test_update_state_ratings():
    """update_state thay đổi µ đúng chiều với rating."""
    from app.ukt_engine import UKTEngine

    engine = UKTEngine()
    base_state = {"kc_test": {"mu": 0.5, "sigma": 0.3, "p_correct": 0.5, "aleatory_flag": False}}

    easy_state = engine.update_state(dict(base_state), "kc_test", "easy")
    hard_state = engine.update_state(dict(base_state), "kc_test", "hard")

    assert easy_state["kc_test"]["mu"] > base_state["kc_test"]["mu"], "easy → µ tăng"
    assert hard_state["kc_test"]["mu"] < base_state["kc_test"]["mu"], "hard → µ giảm"
    print("[PASS] test_update_state_ratings")
    print("  base µ = 0.500")
    print(f"  easy µ = {easy_state['kc_test']['mu']:.3f}")
    print(f"  hard µ = {hard_state['kc_test']['mu']:.3f}")


def test_time_calibration():
    """Ít thời gian → exploit, nhiều thời gian → explore."""
    from app.ukt_engine import UKTEngine

    engine = UKTEngine()
    interactions = make_interactions_for_student()

    result_short = engine.predict(interactions, None, total_minutes=8)
    result_long  = engine.predict(interactions, None, total_minutes=60)

    assert result_short.session_recommendation == "exploit"
    assert result_long.session_recommendation  == "explore"
    print("[PASS] test_time_calibration")
    print(f"  8 phút  → {result_short.session_recommendation}")
    print(f"  60 phút → {result_long.session_recommendation}")


def test_prior_state_integration():
    """State cũ được tích hợp vào prediction mới (Bayesian update)."""
    from app.ukt_engine import UKTEngine

    engine = UKTEngine()
    interactions = [make_interaction("kc_abc", 1, i, i*30) for i in range(3)]

    # Lần 1: không có prior
    result1 = engine.predict(interactions, None, 45)
    mu1 = result1.knowledge_state["kc_abc"].mu

    # Lần 2: có prior từ lần 1 (simulate đã học trước đó)
    prior = {kc: {"mu": s.mu, "sigma": s.sigma, "p_correct": s.p_correct, "aleatory_flag": s.aleatory_flag}
             for kc, s in result1.knowledge_state.items()}
    result2 = engine.predict(interactions, prior, 45)
    mu2 = result2.knowledge_state["kc_abc"].mu

    # µ lần 2 nên cao hơn hoặc bằng lần 1 (prior tích lũy)
    assert mu2 >= mu1 - 0.01, f"Prior state phải được tích hợp: mu1={mu1:.3f}, mu2={mu2:.3f}"
    print("[PASS] test_prior_state_integration")
    print(f"  µ without prior: {mu1:.3f}")
    print(f"  µ with prior:    {mu2:.3f}")


def test_state_store_memory():
    """StateStore in-memory hoạt động đúng."""
    from app.state_store import StateStore
    from app.schemas import KCState

    store = StateStore()
    state = {"kc_1": {"mu": 0.7, "sigma": 0.2, "p_correct": 0.65, "aleatory_flag": False}}

    store.set("student_001", state)
    retrieved = store.get("student_001")
    assert retrieved == state, "State phải được lưu và lấy đúng"

    model_state = {"kc_2": KCState(mu=0.5, sigma=0.3, p_correct=0.52, aleatory_flag=False)}
    store.set("student_002", model_state)
    assert store.get("student_002") == {
        "kc_2": {"mu": 0.5, "sigma": 0.3, "p_correct": 0.52, "aleatory_flag": False}
    }, "StateStore phai normalize Pydantic KCState truoc khi luu"

    store.delete("student_001")
    assert store.get("student_001") is None, "State phải bị xóa"
    store.delete("student_002")
    assert store.get("student_002") is None, "State phai bi xoa"
    print("[PASS] test_state_store_memory")


def test_state_store_update_is_atomic_for_same_student():
    """Concurrent update() calls for one student must not drop writes."""
    from app.state_store import StateStore

    original_redis_url = os.environ.pop("REDIS_URL", None)
    try:
        store = StateStore()
    finally:
        if original_redis_url is not None:
            os.environ["REDIS_URL"] = original_redis_url

    def increment(current):
        count = (current or {}).get("counter", {}).get("count", 0)
        time.sleep(0.001)
        next_state = {"counter": {"count": count + 1}}
        return next_state, count + 1

    threads = [
        threading.Thread(target=lambda: store.update("student_atomic", increment))
        for _ in range(25)
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert store.get("student_atomic") == {"counter": {"count": 25}}
    print("[PASS] test_state_store_update_is_atomic_for_same_student")


def test_state_store_reports_redis_fallback_degraded():
    """Configured Redis failure should be visible to health checks."""
    from app.state_store import StateStore

    original_redis_url = os.environ.get("REDIS_URL")
    os.environ["REDIS_URL"] = "redis://127.0.0.1:1/0"
    try:
        store = StateStore()
    finally:
        if original_redis_url is None:
            os.environ.pop("REDIS_URL", None)
        else:
            os.environ["REDIS_URL"] = original_redis_url

    assert store.persistence_backend == "memory"
    assert store.degraded is True
    assert store.degradation_reason == "redis_unavailable"
    print("[PASS] test_state_store_reports_redis_fallback_degraded")


def test_health_reports_persistence_degradation():
    """Health endpoint should expose degraded memory fallback state."""
    instrumentator = types.ModuleType("prometheus_fastapi_instrumentator")
    instrumentator.Instrumentator = lambda: SimpleNamespace(
        instrument=lambda _app: SimpleNamespace(expose=lambda _app: None)
    )
    sys.modules.setdefault("prometheus_fastapi_instrumentator", instrumentator)
    otel_instrumentation = types.ModuleType("opentelemetry.instrumentation")
    otel_fastapi = types.ModuleType("opentelemetry.instrumentation.fastapi")
    otel_fastapi.FastAPIInstrumentor = SimpleNamespace(instrument_app=lambda _app: None)
    sys.modules.setdefault("opentelemetry.instrumentation", otel_instrumentation)
    sys.modules.setdefault("opentelemetry.instrumentation.fastapi", otel_fastapi)

    from app.main import health

    store = SimpleNamespace(
        persistence_backend="memory",
        degraded=True,
        degradation_reason="redis_unavailable",
    )
    req = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(engine=object(), store=store)))

    payload = asyncio.run(health(req))

    assert payload["status"] == "degraded"
    assert payload["model_loaded"] is True
    assert payload["persistence"] == "memory"
    assert payload["degraded"] is True
    assert payload["degradation_reason"] == "redis_unavailable"
    print("[PASS] test_health_reports_persistence_degradation")


# ── Runner ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    tests = [
        test_bayesian_engine_basic,
        test_sigma_represents_uncertainty,
        test_aleatory_flag_detection,
        test_next_card_zone_of_proximal_development,
        test_update_state_ratings,
        test_time_calibration,
        test_prior_state_integration,
        test_state_store_memory,
        test_state_store_update_is_atomic_for_same_student,
        test_state_store_reports_redis_fallback_degraded,
        test_health_reports_persistence_degradation,
    ]

    passed = 0
    failed = 0
    print("=" * 56)
    print("UKT API Test Suite")
    print("=" * 56)
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"[FAIL] {test.__name__}: {e}")
            failed += 1
        print()

    print("=" * 56)
    print(f"Kết quả: {passed} passed, {failed} failed")
    print("=" * 56)
    sys.exit(0 if failed == 0 else 1)
