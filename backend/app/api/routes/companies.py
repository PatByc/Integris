from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_membership, get_current_user
from app.core.database import get_db
from app.core.plan_limits import PLAN_LIMITS
from app.models.company import CompanyMembership
from app.repositories.company_repository import get_company, get_user_membership
from app.schemas.company_schema import CompanyCreate, CompanyOut, CompanySettingsUpdate, MembershipOut
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
        plan_type=body.plan_type,
        user_metadata=user.get("user_metadata"),
    )
    await db.commit()
    return MembershipOut(
        company=CompanyOut.model_validate(company),
        role=membership.role,
        monthly_limit=PLAN_LIMITS.get(company.plan_type, 25),
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
        monthly_limit=PLAN_LIMITS.get(company.plan_type, 25),
    )


@router.patch("/me/settings", response_model=CompanyOut)
async def update_company_settings(
    body: CompanySettingsUpdate,
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> CompanyOut:
    if membership.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    company = await get_company(db, membership.company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="No company found")
    company.ocr_confidence_threshold = body.ocr_confidence_threshold
    await db.commit()
    await db.refresh(company)
    return CompanyOut.model_validate(company)
