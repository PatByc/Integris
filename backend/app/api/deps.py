from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.company import CompanyMembership
from app.repositories.company_repository import get_user_membership


async def get_current_user(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization[7:]

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_data = response.json()
    return {
        "user_id": UUID(user_data["id"]),
        "email": user_data["email"],
    }


async def get_current_membership(
    user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> CompanyMembership:
    membership = await get_user_membership(db, user["user_id"])
    if membership is None:
        raise HTTPException(status_code=403, detail="No company membership found")
    return membership
