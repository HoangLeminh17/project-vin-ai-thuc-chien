"""Pydantic schemas cho request/response của UKT API."""

from pydantic import BaseModel, Field
from typing import Literal


class Interaction(BaseModel):
    question_id: int = Field(..., description="ID của câu hỏi")
    kc_id: str = Field(..., description="Knowledge Component ID, ví dụ: 'dao_ham'")
    response: int = Field(..., ge=0, le=1, description="1 = đúng, 0 = sai")
    timestamp: int = Field(..., description="Unix timestamp lúc trả lời")


class KCState(BaseModel):
    mu: float = Field(..., description="Mức thành thạo ước lượng (0–1)")
    sigma: float = Field(..., description="Độ không chắc chắn epistemic")
    p_correct: float = Field(..., description="Xác suất trả lời đúng câu tiếp theo")
    aleatory_flag: bool = Field(False, description="True nếu nghi đoán mò / làm ẩu")


class PredictRequest(BaseModel):
    student_id: str = Field(..., description="ID học sinh (UUID hoặc string)")
    interactions: list[Interaction] = Field(..., min_length=1)
    total_minutes: int = Field(45, ge=5, le=180, description="Thời gian học còn lại")


class PredictResponse(BaseModel):
    student_id: str
    knowledge_state: dict[str, KCState]
    priority_order: list[str] = Field(
        ..., description="KC yếu nhất → mạnh nhất"
    )
    next_card_kc: str = Field(
        ..., description="KC tối ưu cho thẻ tiếp theo (zone of proximal dev.)"
    )
    aleatory_flags: list[str] = Field(
        default_factory=list,
        description="Danh sách KC bị phát hiện có aleatory uncertainty cao"
    )
    session_recommendation: Literal["explore", "exploit"] = Field(
        ...,
        description="explore = học KC mới, exploit = củng cố KC đã gần nắm"
    )


class StateResponse(BaseModel):
    student_id: str
    knowledge_state: dict[str, KCState] = Field(default_factory=dict)


class BatchStateRequest(BaseModel):
    student_ids: list[str] = Field(..., min_length=1)


class BatchStateResponse(BaseModel):
    states: dict[str, dict[str, KCState]] = Field(default_factory=dict)


class UpdateRequest(BaseModel):
    student_id: str
    kc_id: str
    rating: Literal["hard", "ok", "easy"]


class UpdateResponse(BaseModel):
    kc_id: str
    updated_mu: float
    updated_sigma: float
    p_correct: float
