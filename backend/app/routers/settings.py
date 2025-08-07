from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app import crud, schemas, models
from app.routers.auth import get_current_active_user

router = APIRouter()

@router.get("/", response_model=schemas.UserSettings)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get user settings"""
    settings = await crud.get_user_settings(db, current_user.id)
    return settings

@router.put("/", response_model=schemas.UserSettings)
async def update_settings(
    settings_update: schemas.UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update user settings"""
    try:
        settings = await crud.update_user_settings(db, current_user.id, settings_update)
        return settings
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
