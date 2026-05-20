from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company, CompanyMembership
from app.repositories.company_repository import (
    create_company,
    create_membership,
    get_user_membership,
    upsert_profile,
)
from app.services import audit_service


async def ensure_profile(db: AsyncSession, user_id: UUID, email: str) -> None:
    await upsert_profile(db, user_id, email)


async def create_company_for_user(
    db: AsyncSession,
    user_id: UUID,
    email: str,
    name: str,
    nip: str,
    plan_type: str = "testing",
    user_metadata: Optional[dict] = None,
) -> tuple[Company, CompanyMembership]:
    existing = await get_user_membership(db, user_id)
    if existing is not None:
        raise HTTPException(status_code=409, detail="User already belongs to a company")

    tos_accepted_at: Optional[datetime] = None
    tos_version: Optional[str] = None
    if user_metadata:
        raw_ts = user_metadata.get("tos_accepted_at")
        if raw_ts:
            tos_accepted_at = datetime.fromisoformat(raw_ts).replace(tzinfo=timezone.utc)
        tos_version = user_metadata.get("tos_version")

    await upsert_profile(db, user_id, email, tos_accepted_at=tos_accepted_at, tos_version=tos_version)

    try:
        company = await create_company(db, name=name, nip=nip, plan_type=plan_type)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A company with this NIP already exists")

    membership = await create_membership(db, company_id=company.id, user_id=user_id, role="owner")

    if tos_accepted_at is not None:
        await audit_service.log(
            db,
            company_id=company.id,
            event_type="user.tos_accepted",
            user_id=user_id,
            metadata={"tos_version": tos_version, "tos_accepted_at": tos_accepted_at.isoformat()},
        )

    return company, membership
