"""Pydantic schemas cho request/response của UKT API."""

from pydantic import BaseModel, Field
from typing import Annotated, Literal


ID_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9_.:@-]*$"
MAX_STUDENT_IDS_PER_BATCH = 200
MAX_INTERACTIONS_PER_REQUEST = 500
MAX_UNIX_TIMESTAMP = 4_102_444_800  # 2100-01-01T00:00:00Z

StudentId = Annotated[
    str,
    Field(
        min_length=1,
        max_length=128,
        pattern=ID_PATTERN,
        description="Stable student/user ID safe for Redis keys",
    ),
]
KCId = Annotated[
    str,
    Field(
        min_length=1,
        max_length=128,
        pattern=ID_PATTERN,
        description="Knowledge Component ID, ví dụ: 'dao_ham'",
    ),
]


class Interaction(BaseModel):
    question_id: int = Field(..., ge=0, le=1_000_000_000, description="ID của câu hỏi")
    kc_id: KCId
    response: int = Field(..., ge=0, le=1, description="1 = đúng, 0 = sai")
    timestamp: int = Field(..., ge=0, le=MAX_UNIX_TIMESTAMP, description="Unix timestamp lúc trả lời")


class KCState(BaseModel):
    mu: float = Field(..., description="Mức thành thạo ước lượng (0–1)")
    sigma: float = Field(..., description="Độ không chắc chắn epistemic")
    p_correct: float = Field(..., description="Xác suất trả lời đúng câu tiếp theo")
    aleatory_flag: bool = Field(False, description="True nếu nghi đoán mò / làm ẩu")


class PredictRequest(BaseModel):
    student_id: StudentId
    interactions: list[Interaction] = Field(..., min_length=1, max_length=MAX_INTERACTIONS_PER_REQUEST)
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
    student_id: StudentId
    knowledge_state: dict[str, KCState] = Field(default_factory=dict)


class BatchStateRequest(BaseModel):
    student_ids: list[StudentId] = Field(..., min_length=1, max_length=MAX_STUDENT_IDS_PER_BATCH)


class BatchStateResponse(BaseModel):
    states: dict[str, dict[str, KCState]] = Field(default_factory=dict)


class UpdateRequest(BaseModel):
    student_id: StudentId
    kc_id: KCId
    rating: Literal["hard", "ok", "easy"]


class UpdateResponse(BaseModel):
    kc_id: str
    updated_mu: float
    updated_sigma: float
    p_correct: float
