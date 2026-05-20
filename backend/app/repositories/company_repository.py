from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company, CompanyMembership, Profile


async def get_user_membership(db: AsyncSession, user_id: UUID) -> CompanyMembership | None:
    result = await db.execute(
        select(CompanyMembership)
        .where(CompanyMembership.user_id == user_id)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_company(db: AsyncSession, company_id: UUID) -> Company | None:
    result = await db.execute(select(Company).where(Company.id == company_id))
    return result.scalar_one_or_none()


async def create_company(db: AsyncSession, name: str, nip: str, plan_type: str = "testing") -> Company:
    company = Company(name=name, nip=nip, plan_type=plan_type)
    db.add(company)
    await db.flush()
    await db.refresh(company)
    return company


async def check_upload_limit(db: AsyncSession, company_id: UUID) -> tuple[int, int, bool]:
    from app.core.plan_limits import PLAN_LIMITS
    company = await get_company(db, company_id)
    if company is None:
        return 0, -1, False
    now = datetime.now(timezone.utc)
    reset_at = company.monthly_reset_at
    if reset_at.tzinfo is None:
        reset_at = reset_at.replace(tzinfo=timezone.utc)
    if now.year != reset_at.year or now.month != reset_at.month:
        company.docs_uploaded_this_month = 0
        company.monthly_reset_at = now
        await db.flush()
    used = company.docs_uploaded_this_month
    limit = PLAN_LIMITS.get(company.plan_type, 25)
    is_at_limit = limit != -1 and used >= limit
    return used, limit, is_at_limit


async def increment_upload_count(db: AsyncSession, company_id: UUID) -> None:
    await db.execute(
        update(Company)
        .where(Company.id == company_id)
        .values(docs_uploaded_this_month=Company.docs_uploaded_this_month + 1)
    )


async def create_membership(
    db: AsyncSession, company_id: UUID, user_id: UUID, role: str
) -> CompanyMembership:
    membership = CompanyMembership(company_id=company_id, user_id=user_id, role=role)
    db.add(membership)
    await db.flush()
    await db.refresh(membership)
    return membership


async def upsert_profile(
    db: AsyncSession,
    user_id: UUID,
    email: str,
    tos_accepted_at: Optional[datetime] = None,
    tos_version: Optional[str] = None,
) -> Profile:
    values: dict = {"id": user_id, "email": email}
    if tos_accepted_at is not None:
        values["tos_accepted_at"] = tos_accepted_at
    if tos_version is not None:
        values["tos_version"] = tos_version

    update_set: dict = {"email": email}
    if tos_accepted_at is not None:
        update_set["tos_accepted_at"] = tos_accepted_at
    if tos_version is not None:
        update_set["tos_version"] = tos_version

    stmt = (
        insert(Profile)
        .values(**values)
        .on_conflict_do_update(index_elements=["id"], set_=update_set)
        .returning(Profile)
    )
    result = await db.execute(stmt)
    await db.flush()
    return result.scalar_one()
