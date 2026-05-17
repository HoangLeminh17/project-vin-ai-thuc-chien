"""
UKT Microservice — FastAPI wrapper cho UKT model
POST /predict  → knowledge state (µ, σ) per KC
POST /update   → cập nhật state sau study session
GET  /health   → kiểm tra server
"""

from fastapi import FastAPI, HTTPException, Request, Depends
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

from app.schemas import (
    PredictRequest,
    PredictResponse,
    StateResponse,
    BatchStateRequest,
    BatchStateResponse,
    UpdateRequest,
    UpdateResponse,
)
from app.ukt_engine import UKTEngine
from app.state_store import StateStore
from app.notifications import notify_model_loaded, notify_error

from app.logging_config import configure_logging

# Configure structured logging early.
configure_logging()
logger = logging.getLogger(__name__)

def get_engine(req: Request) -> UKTEngine:
    engine = getattr(req.app.state, 'engine', None)
    if engine is None:
        raise HTTPException(status_code=503, detail='UKT engine not initialized')
    return engine


def get_store(req: Request) -> StateStore:
    store = getattr(req.app.state, 'store', None)
    if store is None:
        raise HTTPException(status_code=503, detail='UKT state store not initialized')
    return store

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading UKT model...")
    try:
        # Attach long-lived objects to app.state instead of module-level globals.
        app.state.engine = UKTEngine()
        app.state.store = StateStore()
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

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
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
async def health(req: Request):
    return {"status": "ok", "model_loaded": getattr(req.app.state, 'engine', None) is not None}


@app.get("/state/{student_id}", response_model=StateResponse)
async def state(student_id: str, store: StateStore = Depends(get_store)):
    return StateResponse(
        student_id=student_id,
        knowledge_state=store.get(student_id) or {},
    )


@app.post("/state/batch", response_model=BatchStateResponse)
async def state_batch(req: BatchStateRequest, store: StateStore = Depends(get_store)):
    states = store.get_many(req.student_ids)
    return BatchStateResponse(states=states)


@app.post("/predict", response_model=PredictResponse)
async def predict(
    req: PredictRequest,
    engine: UKTEngine = Depends(get_engine),
    store: StateStore = Depends(get_store),
):
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
async def update(
    req: UpdateRequest,
    engine: UKTEngine = Depends(get_engine),
    store: StateStore = Depends(get_store),
):
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
