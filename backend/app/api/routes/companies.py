from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.repositories.company_repository import get_company, get_user_membership
from app.schemas.company_schema import CompanyCreate, CompanyOut, MembershipOut
from app.services.company_service import create_company_for_user

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post("", response_model=MembershipOut, status_code=201)
async def create_company(
    body: CompanyCreate,
    user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> MembershipOut:
    company, membership = await create_company_for_user(
        db,
        user_id=user["user_id"],
        email=user["email"],
        name=body.name,
        nip=body.nip,
    )
    await db.commit()
    return MembershipOut(
        company=CompanyOut.model_validate(company),
        role=membership.role,
    )


@router.get("/me", response_model=MembershipOut)
async def get_my_company(
    user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> MembershipOut:
    membership = await get_user_membership(db, user["user_id"])
    if membership is None:
        raise HTTPException(status_code=404, detail="No company found")
    company = await get_company(db, membership.company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="No company found")
    return MembershipOut(
        company=CompanyOut.model_validate(company),
        role=membership.role,
    )
