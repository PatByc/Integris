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

    @field_validator("nip")
    @classmethod
    def validate_nip(cls, v: str) -> str:
        return _validate_nip(v)


class CompanyOut(BaseModel):
    id: UUID
    name: str
    nip: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MembershipOut(BaseModel):
    company: CompanyOut
    role: str

    model_config = {"from_attributes": True}
