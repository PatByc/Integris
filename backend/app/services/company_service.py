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


async def ensure_profile(db: AsyncSession, user_id: UUID, email: str) -> None:
    await upsert_profile(db, user_id, email)


async def create_company_for_user(
    db: AsyncSession,
    user_id: UUID,
    email: str,
    name: str,
    nip: str,
    plan_type: str = "testing",
) -> tuple[Company, CompanyMembership]:
    existing = await get_user_membership(db, user_id)
    if existing is not None:
        raise HTTPException(status_code=409, detail="User already belongs to a company")

    await upsert_profile(db, user_id, email)

    try:
        company = await create_company(db, name=name, nip=nip, plan_type=plan_type)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A company with this NIP already exists")

    membership = await create_membership(db, company_id=company.id, user_id=user_id, role="owner")
    return company, membership
