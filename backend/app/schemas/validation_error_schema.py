from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ValidationErrorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    invoice_draft_id: UUID | None
    rule_name: str
    field_path: str | None
    message: str
    created_at: datetime
