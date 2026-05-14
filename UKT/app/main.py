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
import os
from prometheus_fastapi_instrumentator import Instrumentator

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from app.schemas import PredictRequest, PredictResponse, StateResponse, UpdateRequest, UpdateResponse
from app.ukt_engine import UKTEngine
from app.state_store import StateStore
from app.notifications import notify_model_loaded, notify_error

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Khởi động model 1 lần duy nhất khi server start ──────────────────────────
engine: UKTEngine = None
store: StateStore = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine, store
    logger.info("Loading UKT model...")
    try:
        engine = UKTEngine()
        store = StateStore()
        logger.info("UKT model ready.")
        await notify_model_loaded()
    except Exception as e:
        logger.error(f"Failed to load UKT model: {e}")
        await notify_error(str(e))
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

# Prometheus Instrumentation
Instrumentator().instrument(app).expose(app)

# OpenTelemetry Instrumentation (Optional)
if os.getenv("ENABLE_OTEL", "false").lower() == "true":
    try:
        resource = Resource(attributes={
            "service.name": "ukt-service",
            "environment": os.getenv("ENVIRONMENT", "production")
        })

        provider = TracerProvider(resource=resource)
        processor = BatchSpanProcessor(OTLPSpanExporter(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector.railway.internal:4317"),
            insecure=True
        ))
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)

        FastAPIInstrumentor.instrument_app(app)
        logger.info("OpenTelemetry instrumentation enabled.")
    except Exception as e:
        logger.warning(f"Failed to initialize OpenTelemetry: {e}. Tracing is disabled.")
else:
    logger.info("OpenTelemetry instrumentation is disabled (ENABLE_OTEL=false).")

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": engine is not None}


@app.get("/state/{student_id}", response_model=StateResponse)
def state(student_id: str):
    return StateResponse(
        student_id=student_id,
        knowledge_state=store.get(student_id) or {},
    )


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
    result.student_id = req.student_id

    # Lưu state mới
    store.set(req.student_id, result.knowledge_state)

    return result


@app.post("/update", response_model=UpdateResponse)
def update(req: UpdateRequest):
    """
    Cập nhật knowledge state sau khi học sinh đánh giá
    thẻ học (hard / ok / easy).
    """
    current = store.get(req.student_id) or {}

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
