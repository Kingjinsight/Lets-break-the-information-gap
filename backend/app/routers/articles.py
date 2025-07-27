from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app import crud, schemas, models
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.services.rss_parser import fetch_rss_feed

router = APIRouter()

@router.post("/fetch/{source_id}", status_code=status.HTTP_200_OK)
async def fetch_articles_from_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    source = await crud.get_source_by_id(db, source_id=source_id, user_id=current_user.id)
    if not source:
        raise HTTPException(status_code=404, detail="RSS Source not found")
    
    fetched_articles = await fetch_rss_feed(source.url)
    if not fetched_articles:
        return {"message": "No new articles found or feed could not be processed."}
        
    new_articles_count = 0
    for article_data in fetched_articles:
        article_schema = schemas.ArticleCreate(**article_data)
        await crud.create_article(db, article=article_schema, source_id=source_id)
        new_articles_count += 1
            
    await db.commit()
            
    return {"message": f"Successfully fetched and saved {new_articles_count} new articles."}

