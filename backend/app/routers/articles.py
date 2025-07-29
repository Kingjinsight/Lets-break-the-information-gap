from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app import crud, schemas, models
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.services.rss_parser import fetch_rss_feed

router = APIRouter()


@router.get("/today", response_model=List[schemas.Article])
async def get_today_articles(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get today's article list"""
    articles = await crud.get_articles_for_today(db, current_user.id)
    return articles

@router.post("/select-for-podcast")
async def create_podcast_from_selected_articles(
    article_ids: List[int],
    title: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Generate podcast from selected articles"""
    # Validate articles belong to current user
    articles = await crud.get_articles_by_ids(db, article_ids)
    valid_articles = []
    
    for article in articles:
        # Check if article belongs to user's RSS sources
        if article.source.user_id == current_user.id:
            valid_articles.append(article)
    
    if not valid_articles:
        raise HTTPException(status_code=400, detail="No valid articles selected")

