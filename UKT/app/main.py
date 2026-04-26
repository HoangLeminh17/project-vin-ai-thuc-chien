"""
UKT Microservice — FastAPI wrapper cho UKT model
POST /predict  → knowledge state (µ, σ) per KC
POST /update   → cập nhật state sau study session
GET  /health   → kiểm tra server
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.schemas import PredictRequest, PredictResponse, UpdateRequest, UpdateResponse
from app.ukt_engine import UKTEngine
from app.state_store import StateStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Khởi động model 1 lần duy nhất khi server start ──────────────────────────
engine: UKTEngine = None
store: StateStore = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine, store
    logger.info("Loading UKT model...")
    engine = UKTEngine()
    store = StateStore()
    logger.info("UKT model ready.")
    yield
    logger.info("Shutting down.")

app = FastAPI(
    title="UKT Knowledge Tracing API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # production: chỉ định domain frontend
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": engine is not None}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """
    Nhận lịch sử tương tác của 1 học sinh,
    trả về knowledge state (µ, σ) cho từng KC
    và danh sách KC ưu tiên cần học.
    """
    if not req.interactions:
        raise HTTPException(status_code=400, detail="interactions không được rỗng")

    # Lấy state cũ từ store (nếu có)
    prior_state = store.get(req.student_id)

    # Chạy UKT inference
    result = engine.predict(
        interactions=req.interactions,
        prior_state=prior_state,
        total_minutes=req.total_minutes,
    )

    # Lưu state mới
    store.set(req.student_id, result.knowledge_state)

    return result


@app.post("/update", response_model=UpdateResponse)
def update(req: UpdateRequest):
    """
    Cập nhật knowledge state sau khi học sinh đánh giá
    thẻ học (hard / ok / easy).
    """
    current = store.get(req.student_id)
    if not current:
        raise HTTPException(status_code=404, detail="Chưa có state cho student_id này")

    updated = engine.update_state(
        current_state=current,
        kc_id=req.kc_id,
        rating=req.rating,          # "hard" | "ok" | "easy"
    )
    store.set(req.student_id, updated)

    return UpdateResponse(
        kc_id=req.kc_id,
        updated_mu=updated[req.kc_id]["mu"],
        updated_sigma=updated[req.kc_id]["sigma"],
        p_correct=updated[req.kc_id]["p_correct"],
    )
