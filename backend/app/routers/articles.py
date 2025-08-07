from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update, text
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from app import crud, schemas, models
from app.database import get_db
from app.routers.auth import get_current_active_user

router = APIRouter()

@router.get("/today", response_model=List[schemas.Article])
async def get_today_articles(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get today's article list with all necessary fields"""
    try:
        articles = await crud.get_articles_for_today(db, current_user.id)
        
        article_responses = []
        for article in articles:
            source_data = None
            if article.source:
                source_data = {
                    "id": article.source.id,
                    "name": article.source.name,
                    "url": article.source.url,
                    "created_at": article.source.created_at,
                    "user_id": article.source.user_id
                }
            
            article_dict = {
                "id": article.id,
                "title": article.title,
                "content": article.content,
                "article_url": article.article_url,
                "link": article.article_url,
                "author": article.author,
                "published_date": article.published_date,
                "published_at": article.published_date or article.created_at,
                "fetched_at": article.fetched_at,
                "created_at": article.created_at,
                "source_id": article.source_id,
                "summary": article.summary or "",
                "is_read": article.is_read,
                "read_at": article.read_at,
                "source": source_data
            }
            article_responses.append(article_dict)
        
        return article_responses
        
    except Exception as e:
        print(f"❌ Error fetching articles: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch articles: {str(e)}")

@router.put("/{article_id}/read")
async def mark_article_as_read(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Mark an article as read"""
    try:
        query = (
            select(models.Article)
            .join(models.RssSource)
            .where(
                and_(
                    models.Article.id == article_id,
                    models.RssSource.user_id == current_user.id
                )
            )
        )
        
        result = await db.execute(query)
        article = result.scalar_one_or_none()
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        update_query = (
            update(models.Article)
            .where(models.Article.id == article_id)
            .values(is_read=True, read_at=datetime.utcnow())
        )
        
        await db.execute(update_query)
        await db.commit()
        
        return {"message": "Article marked as read", "success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"❌ Error marking article as read: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark article as read: {str(e)}")

@router.put("/{article_id}/unread")
async def mark_article_as_unread(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Mark an article as unread"""
    try:
        query = (
            select(models.Article)
            .join(models.RssSource)
            .where(
                and_(
                    models.Article.id == article_id,
                    models.RssSource.user_id == current_user.id
                )
            )
        )
        
        result = await db.execute(query)
        article = result.scalar_one_or_none()
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        update_query = (
            update(models.Article)
            .where(models.Article.id == article_id)
            .values(is_read=False, read_at=None)
        )
        
        await db.execute(update_query)
        await db.commit()
        
        return {"message": "Article marked as unread", "success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"❌ Error marking article as unread: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark article as unread: {str(e)}")

@router.post("/select-for-podcast")
async def create_podcast_from_selected_articles(
    request: schemas.PodcastCreateEnhanced,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Generate podcast from selected articles"""
    try:
        query = (
            select(models.Article)
            .join(models.RssSource)
            .where(
                and_(
                    models.Article.id.in_(request.article_ids),
                    models.RssSource.user_id == current_user.id
                )
            )
        )
        
        result = await db.execute(query)
        valid_articles = result.scalars().all()
        
        if not valid_articles:
            raise HTTPException(status_code=400, detail="No valid articles selected")

        articles_data = []
        
        for article in valid_articles:
            article_data = {
                "id": article.id,
                "title": article.title,
                "content": article.content,
                "author": getattr(article, 'author', 'Unknown Author'),
                "article_url": getattr(article, 'article_url', '')
            }
            articles_data.append(article_data)

        # Create podcast
        podcast_title = request.title or f"Custom Podcast - {datetime.now().strftime('%Y-%m-%d')}"
        
        db_podcast = models.Podcast(
            owner_id=current_user.id,
            title=podcast_title,
            script="",
            audio_file_path="",
            status="pending"
        )
        
        db.add(db_podcast)
        await db.flush()
        
        podcast_id = db_podcast.id
        
        insert_values = []
        for article_data in articles_data:
            insert_values.append(f"({podcast_id}, {article_data['id']})")
        
        if insert_values:
            insert_sql = text(f"""
                INSERT INTO podcast_articles (podcast_id, article_id) 
                VALUES {','.join(insert_values)}
                ON CONFLICT DO NOTHING
            """)
            
            await db.execute(insert_sql)
        
        await db.commit()

        try:
            # Import Celery task without triggering database operations
            from app.tasks import generate_podcast_task
            
            print(f"🎯 About to submit Celery task...")
            print(f"📊 Task data: podcast_id={podcast_id}, user_id={current_user.id}, articles_count={len(articles_data)}")
            
            # Submit task with basic data types only (no SQLAlchemy objects)
            task = generate_podcast_task.delay(
                podcast_id=podcast_id,  # Use captured ID (int)
                user_id=current_user.id,  # Use captured ID (int)
                articles_data=articles_data  # Use pre-extracted data (list of dicts)
            )
            
            task_id = str(task.id) if task.id else None
            print(f"✅ Task submitted successfully! Task ID: {task_id}")
            print(f"📋 Task state: {task.state}")
            
        except ImportError as e:
            print(f"⚠️ Celery import failed: {e}")
            task_id = "celery-not-configured"
        except Exception as e:
            print(f"❌ Task submission error: {e}")
            import traceback
            traceback.print_exc()
            task_id = "task-failed"
        
        return {
            "message": "Podcast creation started",
            "podcast_id": podcast_id,  # Use captured ID
            "title": podcast_title,
            "task_id": task_id,
            "articles_count": len(articles_data),
            "status": "processing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating podcast: {str(e)}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create podcast: {str(e)}")
    
    
@router.get("/stats")
async def get_article_stats(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get article statistics for the current user"""
    try:

        total_query = (
            select(func.count(models.Article.id))
            .join(models.RssSource)
            .where(models.RssSource.user_id == current_user.id)
        )
        
        result = await db.execute(total_query)
        total_articles = result.scalar() or 0

        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        today_query = (
            select(func.count(models.Article.id))
            .join(models.RssSource)
            .where(
                and_(
                    models.RssSource.user_id == current_user.id,
                    models.Article.fetched_at >= today_start
                )
            )
        )
        
        result = await db.execute(today_query)
        today_count = result.scalar() or 0
        

        source_stats_query = (
            select(
                models.RssSource.name.label('source'),
                func.count(models.Article.id).label('count')
            )
            .select_from(models.RssSource)
            .join(models.Article)
            .where(models.RssSource.user_id == current_user.id)
            .group_by(models.RssSource.name)
        )
        
        source_result = await db.execute(source_stats_query)
        source_stats = source_result.all()
        
        return {
            "total_articles": total_articles,
            "articles_today": today_count,
            "source_stats": [
                {"source": stat.source or "Unknown", "count": stat.count}
                for stat in source_stats
            ]
        }
        
    except Exception as e:
        print(f"❌ Article stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get article statistics: {str(e)}")