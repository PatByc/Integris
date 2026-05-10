from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company, CompanyMembership, Profile


async def get_user_membership(db: AsyncSession, user_id: UUID) -> CompanyMembership | None:
    result = await db.execute(
        select(CompanyMembership).where(CompanyMembership.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_company(db: AsyncSession, company_id: UUID) -> Company | None:
    result = await db.execute(select(Company).where(Company.id == company_id))
    return result.scalar_one_or_none()


async def create_company(db: AsyncSession, name: str, nip: str) -> Company:
    company = Company(name=name, nip=nip)
    db.add(company)
    await db.flush()
    await db.refresh(company)
    return company


async def create_membership(
    db: AsyncSession, company_id: UUID, user_id: UUID, role: str
) -> CompanyMembership:
    membership = CompanyMembership(company_id=company_id, user_id=user_id, role=role)
    db.add(membership)
    await db.flush()
    await db.refresh(membership)
    return membership


async def upsert_profile(db: AsyncSession, user_id: UUID, email: str) -> Profile:
    stmt = (
        insert(Profile)
        .values(id=user_id, email=email)
        .on_conflict_do_update(index_elements=["id"], set_={"email": email})
        .returning(Profile)
    )
    result = await db.execute(stmt)
    await db.flush()
    return result.scalar_one()
