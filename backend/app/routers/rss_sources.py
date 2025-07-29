from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select

from app import crud, schemas, models
from app.database import get_db
from .auth import get_current_active_user
from app.crud import validate_rss_url, check_rss_source_exists, create_rss_source_with_validation


router = APIRouter()

@router.post("/", response_model=schemas.RssSource, status_code=status.HTTP_201_CREATED)
async def create_source(
    source: schemas.RssSourceCreate,
    validate_url: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new RSS source for the current user with validation."""
    try:
        if validate_url:
            # Use creation function with validation
            result = await create_rss_source_with_validation(db=db, source=source, user_id=current_user.id)
            return result["rss_source"]
        else:
            # Use original function (backward compatibility)
            return await crud.create_rss_source(db=db, source=source, user_id=current_user.id)
            
    except ValueError as e:
        # Validation failed
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Other errors
        raise HTTPException(status_code=500, detail=f"Failed to create RSS source: {str(e)}")

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

@router.post("/{source_id}/fetch", status_code=status.HTTP_200_OK)
async def fetch_articles_from_source(
    source_id: int,
    force: bool = False,
    days_limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Fetch RSS articles, ensure proper deduplication, and limit time range"""
    source = await crud.get_source_by_id(db, source_id=source_id, user_id=current_user.id)
    if not source:
        raise HTTPException(status_code=404, detail="RSS Source not found")
    
    # Get source info early to avoid async conflicts later
    source_name = source.name or source.url
    source_url = source.url
    
    print(f"🔄 Fetching RSS source: {source_url}")
    print(f"📅 Time limit: Only fetch articles from last {days_limit} days")
    
    # Calculate time boundary
    from datetime import timedelta
    cutoff_date = datetime.now().replace(tzinfo=None) - timedelta(days=days_limit)
    print(f"⏰ Cutoff time: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        from app.services.rss_parser import fetch_rss_feed
        fetched_articles = await fetch_rss_feed(source_url)
        
        if not fetched_articles:
            return {
                "message": "No articles found in RSS source",
                "new_articles": 0,
                "total_checked": 0
            }
        
        new_articles_count = 0
        duplicate_count = 0
        error_count = 0
        too_old_count = 0
        articles_to_create = []
        
        print(f"📊 Got {len(fetched_articles)} articles from RSS...")
        
        # Phase 1: Filter and validate articles
        for i, article_data in enumerate(fetched_articles):
            try:
                article_url = article_data.get('article_url')
                article_title = article_data.get('title', 'No Title')
                
                print(f"🔍 Processing article {i+1}: {article_title[:30]}...")
                
                # Handle timezone issues
                published_date = article_data.get('published_date')
                if published_date:
                    if isinstance(published_date, str):
                        try:
                            from dateutil import parser
                            published_date = parser.parse(published_date)
                        except:
                            published_date = datetime.now()
                    
                    if published_date.tzinfo is not None:
                        published_date = published_date.replace(tzinfo=None)
                    
                    if published_date < cutoff_date:
                        too_old_count += 1
                        print(f"    ⏰ Skip - Article too old ({published_date.strftime('%Y-%m-%d')})")
                        continue
                else:
                    published_date = datetime.now()
                    article_data['published_date'] = published_date
                    print(f"    📅 No publish time, using current time")
                
                article_data['published_date'] = published_date.replace(tzinfo=None) if published_date.tzinfo else published_date
                
                # Check if already exists in database
                existing_check = select(models.Article).filter(
                    models.Article.article_url == article_url,
                    models.Article.source_id == source_id
                )
                result = await db.execute(existing_check)
                existing = result.scalars().first()
                
                if existing and not force:
                    duplicate_count += 1
                    print(f"    📋 Skip - Already exists in database (ID: {existing.id})")
                    continue
                
                if not article_url or not article_title:
                    error_count += 1
                    print(f"    ❌ Skip - Missing required fields")
                    continue
                
                if force and existing:
                    await db.delete(existing)
                    print(f"    🔄 Force mode - Mark old article for deletion (ID: {existing.id})")
                
                article_data['fetched_at'] = datetime.now()
                articles_to_create.append(article_data)
                print(f"    ✅ Ready to create new article")
                
            except Exception as e:
                error_count += 1
                print(f"    ❌ Processing failed: {str(e)}")
                continue
        
        # Phase 2: Batch create articles
        if articles_to_create:
            print(f"\n💾 Batch creating {len(articles_to_create)} articles...")
            
            for article_data in articles_to_create:
                try:
                    article_schema = schemas.ArticleCreate(**article_data)
                    db_article = await crud.create_article(db, article=article_schema, source_id=source_id)
                    new_articles_count += 1
                    print(f"    ✅ Article added to session ({article_data.get('title', '')[:30]}...)")
                except Exception as e:
                    error_count += 1
                    print(f"    ❌ Failed to create article: {str(e)}")
            
            # Commit transaction
            try:
                await db.commit()
                print(f"✅ Successfully committed {new_articles_count} new articles to database")
            except Exception as e:
                await db.rollback()
                print(f"❌ Commit failed, rolled back: {str(e)}")
                raise
        else:
            print("📋 No new articles to create")
        
        await db.close()
        
        result = {
            "message": f"✅ Fetch completed",
            "source_name": source_name,
            "source_url": source_url,
            "time_filter": {
                "days_limit": days_limit,
                "cutoff_date": cutoff_date.isoformat(),
                "description": f"Only fetch articles from last {days_limit} days"
            },
            "statistics": {
                "total_articles_in_rss": len(fetched_articles),
                "new_articles_added": new_articles_count,
                "duplicate_articles_skipped": duplicate_count,
                "too_old_articles_skipped": too_old_count,
                "errors": error_count
            },
            "force_mode": force
        }
        
        if new_articles_count == 0 and duplicate_count > 0:
            result["message"] = "🔄 No new articles - All articles already exist"
        elif new_articles_count == 0 and too_old_count > 0:
            result["message"] = f"⏰ No new articles - All articles older than {days_limit} days"
        elif new_articles_count == 0:
            result["message"] = "⚠️ No valid articles found in RSS source"
            
        print(f"📊 Final result: Added {new_articles_count}, Duplicates {duplicate_count}, Too old {too_old_count}, Errors {error_count}")
        return result
        
    except Exception as e:
        await db.rollback()
        print(f"❌ Fetch failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fetch failed: {str(e)}")

@router.get("/{source_id}/articles-debug")
async def debug_articles(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Debug: View articles in database"""
    try:
        # Get all articles for this source
        query = select(models.Article).filter(models.Article.source_id == source_id)
        result = await db.execute(query)
        articles = result.scalars().all()
        
        # Count duplicate URLs
        url_count = {}
        for article in articles:
            url = article.article_url
            url_count[url] = url_count.get(url, 0) + 1
        
        duplicates = {url: count for url, count in url_count.items() if count > 1}
        
        return {
            "source_id": source_id,
            "total_articles": len(articles),
            "unique_urls": len(url_count),
            "duplicate_urls": duplicates,
            "recent_articles": [
                {
                    "id": a.id,
                    "title": a.title[:50] + "...",
                    "url": a.article_url,
                    "fetched_at": a.fetched_at.isoformat()
                }
                for a in articles[-5:]
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/{source_id}/clean-duplicates")
async def clean_duplicate_articles(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Clean duplicate articles, keep only the newest ones"""
    source = await crud.get_source_by_id(db, source_id=source_id, user_id=current_user.id)
    if not source:
        raise HTTPException(status_code=404, detail="RSS Source not found")
    
    try:
        # Find all articles, group by URL
        query = select(models.Article).filter(models.Article.source_id == source_id).order_by(models.Article.id)
        result = await db.execute(query)
        all_articles = result.scalars().all()
        
        # Group by URL
        url_groups = {}
        for article in all_articles:
            url = article.article_url
            if url not in url_groups:
                url_groups[url] = []
            url_groups[url].append(article)
        
        deleted_count = 0
        
        # For each URL group, keep only the newest one
        for url, articles in url_groups.items():
            if len(articles) > 1:
                # Keep the newest (highest ID)
                articles_sorted = sorted(articles, key=lambda x: x.id, reverse=True)
                keep_article = articles_sorted[0]
                delete_articles = articles_sorted[1:]
                
                print(f"🔄 URL {url[:50]}... Keep ID:{keep_article.id}, Delete {len(delete_articles)} articles")
                
                for article in delete_articles:
                    await db.delete(article)
                    deleted_count += 1
        
        await db.commit()
        
        return {
            "message": f"✅ Cleanup completed, deleted {deleted_count} duplicate articles",
            "source_id": source_id,
            "total_articles_before": len(all_articles),
            "unique_urls": len(url_groups),
            "duplicates_removed": deleted_count,
            "articles_remaining": len(all_articles) - deleted_count
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")    
    
@router.post("/validate", status_code=status.HTTP_200_OK)
async def validate_rss_source(
    url: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Validate if RSS URL is available"""
    try:
        validation_result = await validate_rss_url(url)
        
        # Check for duplicates
        from app.crud import check_rss_source_exists
        is_duplicate = await check_rss_source_exists(db, url, current_user.id)
        
        return {
            "url": url,
            "validation": validation_result,
            "is_duplicate": is_duplicate,
            "message": "RSS source validation completed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
    

@router.get("/{source_id}/stats")
async def get_source_statistics(
    source_id: int,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get RSS source statistics"""
    source = await crud.get_source_by_id(db, source_id, current_user.id)
    if not source:
        raise HTTPException(status_code=404, detail="RSS Source not found")
    
    # Count articles
    from datetime import timedelta
    cutoff_date = datetime.now() - timedelta(days=days)
    
    query = (
        select(func.count(models.Article.id))
        .filter(
            models.Article.source_id == source_id,
            models.Article.fetched_at >= cutoff_date
        )
    )
    result = await db.execute(query)
    article_count = result.scalar()
    
    return {
        "source_name": source.name,
        "source_url": source.url,
        "articles_last_30_days": article_count,
        "created_at": source.created_at,
        "last_fetch": "Need to add last_fetch field to model"
    }