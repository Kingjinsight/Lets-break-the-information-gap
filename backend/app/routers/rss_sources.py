from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app import crud, schemas, models
from app.database import get_db
from .auth import get_current_active_user

router = APIRouter()

@router.post("/", response_model=schemas.RssSource, status_code=status.HTTP_201_CREATED)
async def create_source(
    source: schemas.RssSourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new RSS source for the current user."""
    return await crud.create_rss_source(db=db, source=source, user_id=current_user.id)

@router.get("/", response_model=List[schemas.RssSource])
async def read_sources(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Retrieve all RSS sources for the current user."""
    sources = await crud.get_sources_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return sources

@router.delete("/{source_id}", response_model=schemas.RssSource)
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete an RSS source for the current user."""
    deleted_source = await crud.delete_source(db, source_id=source_id, user_id=current_user.id)
    if not deleted_source:
        raise HTTPException(status_code=404, detail="RSS Source not found")
    return deleted_source