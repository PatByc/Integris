from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class OcrResultOut(BaseModel):
    id: UUID
    raw_text: str | None
    page_count: int | None
    provider: str
    attempt_number: int
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
