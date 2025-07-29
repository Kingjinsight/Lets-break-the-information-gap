# backend/app/routers/podcasts.py - 完全解决 greenlet 错误
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta
from pathlib import Path
import os

from app import crud, schemas, models
from app.database import get_db, AsyncSessionLocal
from .auth import get_current_active_user
from app.services import script_writer, tts_service
from app.tasks import generate_podcast_task

router = APIRouter()

# ======================= Core Podcast Features =======================

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_podcast(
    podcast_data: schemas.PodcastCreate,
    title: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a podcast from selected articles"""
    try:
        user_id = current_user.id
        
        # Get articles
        articles = []
        for article_id in podcast_data.article_ids:
            article = await crud.get_article_by_id(db, article_id, user_id)
            if not article:
                raise HTTPException(status_code=404, detail=f"Article {article_id} not found")
            articles.append(article)
        
        # Create podcast
        podcast_title = title or f"Custom Podcast - {datetime.now().strftime('%Y-%m-%d')}"
        
        db_podcast = models.Podcast(
            owner_id=user_id,
            title=podcast_title,
            script="",
            audio_file_path=""
        )
        
        for article in articles:
            db_podcast.articles.append(article)
        
        db.add(db_podcast)
        await db.commit()
        await db.refresh(db_podcast)

        articles_data = [
            {
                "id": article.id,
                "title": article.title,
                "content": article.content,
                "author": getattr(article, 'author', 'Unknown Author'),
                "article_url": getattr(article, 'article_url', '')
            }
            for article in articles
        ]
        
        # Submit Celery task
        task = generate_podcast_task.delay(
            podcast_id=db_podcast.id,
            user_id=user_id,
            articles_data=articles_data
        )
        
        return {
            "message": "Podcast creation started",
            "podcast_id": db_podcast.id,
            "title": podcast_title,
            "task_id": task.id,
            "articles_count": len(articles),
            "status": "processing"
        }
        
    except Exception as e:
        await db.rollback()
        print(f"❌ Create podcast error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-today")
async def generate_today_podcast(
    title: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Generate podcast from today's articles"""
    try:
        print("📰 Getting today's articles...")
        
        user_id = current_user.id
        print(f"🔍 User ID extracted: {user_id}")
        
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(hours=8)
        
        query = (
            select(models.Article)
            .join(models.RssSource)
            .filter(
                models.RssSource.user_id == user_id,
                models.Article.fetched_at >= today_start
            )
            #.limit(20)
        )
        
        result = await db.execute(query)
        articles = result.scalars().all()
        
        if not articles:
            raise HTTPException(status_code=404, detail="No articles found for today")
        
        print(f"✅ Found {len(articles)} articles for today")
        
        articles_data = []
        article_ids = []
        
        for article in articles:
            try:
                article_data = {
                    "id": article.id,
                    "title": article.title,
                    "content": article.content or "",
                    "author": getattr(article, 'author', 'Unknown Author') or 'Unknown Author',
                    "article_url": getattr(article, 'article_url', '') or ''
                }
                articles_data.append(article_data)
                article_ids.append(article.id)
            except Exception as article_error:
                print(f"⚠️ Skipping article due to error: {article_error}")
                continue
        
        if not articles_data:
            raise HTTPException(status_code=500, detail="Failed to extract article data")
        
        print(f"✅ Extracted data from {len(articles_data)} articles")
        
        podcast_title = title or f"Daily Briefing - {datetime.now().strftime('%B %d, %Y')}"
        
        db_podcast = models.Podcast(
            owner_id=user_id,
            title=podcast_title,
            script="",
            audio_file_path=""
        )
        
        db.add(db_podcast)
        await db.commit()
        await db.refresh(db_podcast)
        
        podcast_id = db_podcast.id
        print(f"✅ Podcast record created: ID {podcast_id}")
        
        try:
            print("🔗 Creating article associations using raw SQL...")
            
            from sqlalchemy import text
            
            insert_values = []
            for article_id in article_ids:
                insert_values.append(f"({podcast_id}, {article_id})")
            
            if insert_values:
                insert_sql = text(f"""
                    INSERT INTO podcast_articles (podcast_id, article_id) 
                    VALUES {','.join(insert_values)}
                    ON CONFLICT DO NOTHING
                """)
                
                await db.execute(insert_sql)
                await db.commit()
                print(f"✅ Successfully associated {len(insert_values)} articles with podcast")
            
        except Exception as assoc_error:
            print(f"⚠️ Article association failed: {assoc_error}")

        task = generate_podcast_task.delay(
            podcast_id=podcast_id,
            user_id=user_id,
            articles_data=articles_data
        )
        
        return {
            "message": "Today's podcast generation started",
            "podcast_id": podcast_id,
            "title": podcast_title,
            "task_id": task.id,
            "articles_count": len(articles_data),
            "status": "processing",
            "check_progress_url": f"/api/v1/podcasts/task/{task.id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"❌ Generate today podcast error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ======================= Task Management =======================

@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Get task status"""
    try:
        from app.celery_app import celery_app
        task = celery_app.AsyncResult(task_id)
        
        if task.state == 'PENDING':
            response = {
                'state': task.state,
                'status': 'Task is waiting to be processed'
            }
        elif task.state != 'FAILURE':
            response = {
                'state': task.state,
                'result': task.result
            }
        else:
            response = {
                'state': task.state,
                'error': str(task.info)
            }
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ======================= Podcast Management =======================

@router.get("/", response_model=List[schemas.PodcastResponse])
async def get_user_podcasts(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get user's podcasts"""
    try:
        user_id = current_user.id
        
        query = (
            select(models.Podcast)
            .options(selectinload(models.Podcast.articles))
            .filter(models.Podcast.owner_id == user_id)
            .offset(skip)
            .limit(limit)
            .order_by(models.Podcast.created_at.desc())
        )
        
        result = await db.execute(query)
        podcasts = result.scalars().all()
        
        return podcasts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{podcast_id}", response_model=schemas.PodcastResponse)
async def get_podcast_detail(
    podcast_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get podcast detail"""
    try:
        user_id = current_user.id
        
        query = (
            select(models.Podcast)
            .options(selectinload(models.Podcast.articles))
            .filter(
                models.Podcast.id == podcast_id,
                models.Podcast.owner_id == user_id
            )
        )
        
        result = await db.execute(query)
        podcast = result.scalar_one_or_none()
        
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        return podcast
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{podcast_id}")
async def delete_podcast(
    podcast_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete podcast"""
    try:
        user_id = current_user.id
        
        query = select(models.Podcast).filter(
            models.Podcast.id == podcast_id,
            models.Podcast.owner_id == user_id
        )
        
        result = await db.execute(query)
        podcast = result.scalar_one_or_none()
        
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        # Delete audio file if exists
        if podcast.audio_file_path and os.path.exists(podcast.audio_file_path):
            try:
                os.remove(podcast.audio_file_path)
            except Exception as e:
                print(f"Warning: Could not delete audio file: {e}")
        
        await db.delete(podcast)
        await db.commit()
        
        return {"message": "Podcast deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ======================= Audio Streaming =======================

@router.get("/{podcast_id}/audio")
async def stream_podcast_audio(
    podcast_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Stream podcast audio"""
    try:
        user_id = current_user.id
        
        query = select(models.Podcast).filter(
            models.Podcast.id == podcast_id,
            models.Podcast.owner_id == user_id
        )
        
        result = await db.execute(query)
        podcast = result.scalar_one_or_none()
        
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        if not podcast.audio_file_path or not os.path.exists(podcast.audio_file_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        def iterfile(file_path: str):
            with open(file_path, mode="rb") as file_like:
                yield from file_like
        
        return StreamingResponse(
            iterfile(podcast.audio_file_path),
            media_type="audio/wav",
            headers={"Content-Disposition": f"attachment; filename=podcast_{podcast_id}.wav"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ======================= System Status =======================

@router.get("/system/status")
async def get_system_status():
    """Get system status"""
    try:
        from app.celery_app import celery_app
        import redis
        
        # Check Celery
        celery_status = "unknown"
        try:
            inspect = celery_app.control.inspect()
            stats = inspect.stats()
            celery_status = "running" if stats else "stopped"
        except Exception:
            celery_status = "error"
        
        # Check Redis
        redis_status = "unknown"
        try:
            r = redis.Redis(host='localhost', port=6379, db=0)
            r.ping()
            redis_status = "running"
        except Exception:
            redis_status = "error"
        
        return {
            "celery": celery_status,
            "redis": redis_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))