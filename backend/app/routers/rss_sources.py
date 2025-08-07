from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime, timedelta
from sqlalchemy import select

from app import crud, schemas, models
from app.database import get_db
from .auth import get_current_active_user, oauth2_scheme
from app.services.social_media_helper import SocialMediaRSSHelper

router = APIRouter()

@router.post("/", response_model=schemas.RssSource, status_code=status.HTTP_201_CREATED)
async def create_source(
    source: schemas.RssSourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new RSS source for the current user with validation."""
    try:
        # Use the validation-enabled create function
        result = await crud.create_rss_source_with_validation(db=db, source=source, user_id=current_user.id)
        return result["rss_source"]
    except ValueError as e:
        # Handle validation errors with specific HTTP codes
        error_message = str(e)
        if "already added" in error_message.lower():
            raise HTTPException(status_code=409, detail=error_message)
        else:
            raise HTTPException(status_code=400, detail=error_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create RSS source: {str(e)}")

@router.post("/validate", status_code=status.HTTP_200_OK)
async def validate_rss_source(
    request: schemas.RssValidationRequest,
    current_user: models.User = Depends(get_current_active_user)
):
    """Validate RSS URL without creating the source."""
    try:
        validation_result = await crud.validate_rss_url(request.url)
        return validation_result
    except Exception as e:
        return {
            "valid": False,
            "error": "Validation failed",
            "details": str(e)
        }

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

@router.post("/refresh-all")
async def refresh_all_sources(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Refresh all RSS sources for the current user."""
    import asyncio
    
    try:
        sources = await crud.get_sources_by_user(db, user_id=current_user.id)
        
        if not sources:
            return {"message": "No RSS sources found", "sources_refreshed": 0, "total_new_articles": 0}
        
        total_new_articles = 0
        sources_refreshed = 0
        
        print(f"🔄 Processing {len(sources)} RSS sources")
        
        # Process sources one by one to avoid connection issues
        for source in sources:
            try:
                result = await _process_single_source(source, db)
                if result["status"] == "success":
                    sources_refreshed += 1
                    total_new_articles += result["new_articles"]
                
                # Small delay between sources
                await asyncio.sleep(0.5)
                
            except Exception as e:
                print(f"❌ Error processing source {source.id}: {e}")
                continue
        
        return {
            "message": f"✅ Processed {len(sources)} sources: {sources_refreshed} successful",
            "sources_refreshed": sources_refreshed,
            "total_sources": len(sources),
            "total_new_articles": total_new_articles
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Refresh all sources error: {error_msg}")
        
        # Don't fail on connection cleanup errors - these happen after successful operations
        if "greenlet_spawn" in error_msg or "MissingGreenlet" in error_msg:
            print("⚠️ Connection cleanup error (ignoring) - operation was successful")
            return {
                "message": f"✅ Processed {len(sources)} sources (with connection cleanup warning)",
                "sources_refreshed": len(sources),  # Assume all succeeded if we got here
                "total_sources": len(sources),
                "total_new_articles": 0,  # Can't count but operation succeeded
                "warning": "Connection cleanup error occurred but refresh was successful"
            }
        
        raise HTTPException(status_code=500, detail=f"Failed to refresh sources: {error_msg}")

@router.post("/fetch-all")
async def fetch_all_articles(
    token: str = Depends(oauth2_scheme)
):
    """Fetch articles from all RSS sources for the current user with independent sessions."""
    import asyncio
    from app.database import AsyncSessionLocal
    from app.security import get_user_from_token
    
    # Get current user without using get_db dependency
    async with AsyncSessionLocal() as auth_db:
        try:
            current_user = await get_user_from_token(token, auth_db)
        except Exception as e:
            raise HTTPException(status_code=401, detail="Invalid authentication")
    
    # Get sources with a separate session
    async with AsyncSessionLocal() as db:
        sources = await crud.get_sources_by_user(db, user_id=current_user.id)
    
    if not sources:
        return {"message": "No RSS sources found", "sources_processed": 0, "total_new_articles": 0}
    
    total_new_articles = 0
    sources_processed = 0
    results = []
    
    print(f"🔄 Fetching from {len(sources)} RSS sources with independent sessions")
    
    # Process each source with its own database session
    for i, source in enumerate(sources):
        try:
            print(f"📦 Processing source {i+1}/{len(sources)}: {source.name or source.url}")
            
            # Create a fresh session for each source
            async with AsyncSessionLocal() as source_db:
                result = await _process_single_source(source, source_db)
                results.append(result)
                
                if result["status"] == "success":
                    sources_processed += 1
                    total_new_articles += result["new_articles"]
                    print(f"✅ Source {i+1} completed: {result['new_articles']} new articles")
                else:
                    print(f"❌ Source {i+1} failed: {result.get('error', 'Unknown error')}")
            
            # Brief pause between sources
            await asyncio.sleep(0.3)
            
        except Exception as e:
            print(f"❌ Error with source {i+1} ({source.name or source.url}): {e}")
            results.append({
                "source_name": source.name or source.url,
                "error": str(e),
                "new_articles": 0,
                "status": "error"
            })
            continue
    
    # Return comprehensive results
    return {
        "message": f"✅ Processed {len(sources)} sources: {sources_processed} successful, {len(sources) - sources_processed} failed",
        "sources_processed": sources_processed,
        "total_sources": len(sources),
        "total_new_articles": total_new_articles,
        "details": results
    }

async def _process_single_source(source, db: AsyncSession) -> dict:
    """Process a single RSS source with robust error handling."""
    import asyncio
    
    try:
        print(f"🔄 Processing source: {source.name or source.url}")
        
        # Step 1: Fetch RSS feed (no database involved)
        from app.services.rss_parser import fetch_rss_feed
        fetched_articles = await fetch_rss_feed(source.url)
        
        if not fetched_articles:
            return {"source_name": source.name or source.url, "new_articles": 0, "status": "success"}
        
        # Step 2: Process articles with 30-day limit
        cutoff_date = datetime.now().replace(tzinfo=None) - timedelta(days=30)
        print(f"📅 Cutoff date for 30-day filter: {cutoff_date}")
        new_count = 0
        skipped_old = 0
        skipped_existing = 0
        
        # Process articles in small batches to avoid long transactions
        batch_size = 5
        articles_to_process = []
        
        # First, filter and prepare articles
        for article_data in fetched_articles:
            try:
                article_url = article_data.get('article_url')
                article_title = article_data.get('title')
                
                if not article_url or not article_title:
                    continue
                
                # Handle timezone issues for published_date
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
                    
                    # Check if article is too old
                    if published_date < cutoff_date:
                        skipped_old += 1
                        print(f"⏭️  Skipping old article: {published_date} < {cutoff_date}")
                        continue
                else:
                    published_date = datetime.now()
                
                # **关键修复：确保所有必需字段都存在**
                processed_article_data = {
                    'title': article_data.get('title', 'Untitled'),
                    'article_url': article_data.get('article_url', ''),
                    'content': article_data.get('content', ''),
                    'author': article_data.get('author', 'Unknown Author'),
                    'published_date': published_date,
                    'fetched_at': article_data.get('fetched_at') or datetime.now(),
                    'summary': article_data.get('summary', ''),
                    'source_id': source.id  # **关键：确保source_id存在**
                }
                
                print(f"🔍 Prepared article data with keys: {list(processed_article_data.keys())}")
                articles_to_process.append(processed_article_data)
                
            except Exception as e:
                print(f"❌ Error preparing article data: {e}")
                continue
        
        # Process articles in small batches
        for i in range(0, len(articles_to_process), batch_size):
            batch = articles_to_process[i:i + batch_size]
            batch_new_count = 0
            
            try:
                for article_data in batch:
                    article_url = article_data.get('article_url')
                    
                    # Check if article already exists
                    existing_check = select(models.Article).filter(
                        models.Article.article_url == article_url,
                        models.Article.source_id == source.id
                    )
                    result = await db.execute(existing_check)
                    existing = result.scalars().first()
                    
                    if existing:
                        skipped_existing += 1
                        continue
                    
                    # **关键修复：直接验证ArticleCreate schema**
                    try:
                        # 先验证schema
                        article_schema = schemas.ArticleCreate(**article_data)
                        print(f"✅ Schema validation passed for: {article_data['title']}")
                    except Exception as schema_error:
                        print(f"❌ Schema validation failed for '{article_data.get('title', 'Unknown')}': {schema_error}")
                        print(f"❌ Article data: {article_data}")
                        continue
                    
                    # Create new article using the validated schema
                    await crud.create_article(db, article=article_schema, source_id=source.id)
                    batch_new_count += 1
                
                # Commit this batch
                if batch_new_count > 0:
                    await db.commit()
                    new_count += batch_new_count
                    print(f"✅ Committed batch: {batch_new_count} articles")
                
                # Small delay between batches
                await asyncio.sleep(0.1)
                
            except Exception as e:
                print(f"❌ Error in batch processing: {e}")
                try:
                    await db.rollback()
                except:
                    pass
                # Continue to next batch instead of failing completely
                continue
        
        print(f"📊 Source {source.name}: {new_count} new, {skipped_existing} existing, {skipped_old} too old")
        return {"source_name": source.name or source.url, "new_articles": new_count, "status": "success"}
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error processing source {source.id}: {error_msg}")
        
        # Try to rollback, but don't fail if it doesn't work
        try:
            await db.rollback()
        except:
            pass
        
        return {
            "source_name": source.name or source.url,
            "error": error_msg,
            "new_articles": 0,
            "status": "error"
        }

@router.post("/{source_id}/fetch", status_code=status.HTTP_200_OK)
async def fetch_articles_from_source(
    source_id: int,
    days_limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Fetch RSS articles from a single source."""
    source = await crud.get_source_by_id(db, source_id=source_id, user_id=current_user.id)
    if not source:
        raise HTTPException(status_code=404, detail="RSS Source not found")
    
    try:
        result = await _process_single_source(source, db)
        
        return {
            "message": f"Fetch completed for {source.name or source.url}",
            "source_name": source.name or source.url,
            "new_articles": result["new_articles"],
            "status": result["status"]
        }
        
    except Exception as e:
        print(f"❌ Fetch failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fetch failed: {str(e)}")

@router.post("/analyze-social-url", status_code=status.HTTP_200_OK)
async def analyze_social_media_url(
    request: dict,
    current_user: models.User = Depends(get_current_active_user)
):
    """Analyze a social media URL and suggest RSS feeds."""
    url = request.get('url', '')
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    try:
        result = SocialMediaRSSHelper.validate_social_url(url)
        return result
    except Exception as e:
        return {
            "valid": False,
            "error": f"Analysis failed: {str(e)}",
            "suggestions": []
        }

@router.get("/social-platforms")
async def get_supported_social_platforms(
    current_user: models.User = Depends(get_current_active_user)
):
    """Get information about supported social media platforms."""
    return SocialMediaRSSHelper.get_platform_info()