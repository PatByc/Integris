from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


def _validate_nip(nip: str) -> str:
    if not nip.isdigit() or len(nip) != 10:
        raise ValueError("NIP must be exactly 10 digits")
    weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
    checksum = sum(int(nip[i]) * weights[i] for i in range(9)) % 11
    if checksum == 10 or checksum != int(nip[9]):
        raise ValueError("Invalid NIP checksum")
    return nip


class CompanyCreate(BaseModel):
    name: str
    nip: str
    plan_type: str = "testing"

    @field_validator("nip")
    @classmethod
    def validate_nip(cls, v: str) -> str:
        return _validate_nip(v)

    @field_validator("plan_type")
    @classmethod
    def validate_plan_type(cls, v: str) -> str:
        if v not in {"testing", "starter", "growth", "enterprise"}:
            raise ValueError("Invalid plan_type")
        return v


class CompanyOut(BaseModel):
    id: UUID
    name: str
    nip: str
    ocr_confidence_threshold: int
    plan_type: str
    docs_uploaded_this_month: int
    monthly_reset_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class CompanySettingsUpdate(BaseModel):
    ocr_confidence_threshold: int

    @field_validator("ocr_confidence_threshold")
    @classmethod
    def validate_threshold(cls, v: int) -> int:
        if not (0 <= v <= 100):
            raise ValueError("Threshold must be 0–100")
        return v


class MembershipOut(BaseModel):
    company: CompanyOut
    role: str
    monthly_limit: int = -1

    model_config = {"from_attributes": True}
