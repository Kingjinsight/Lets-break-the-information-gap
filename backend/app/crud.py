from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from sqlalchemy import text
from . import models, schemas
import httpx
import feedparser
from urllib.parse import urlparse

async def get_user_by_email(db: AsyncSession, email: str):
    query = select(models.User).filter(models.User.email == email)
    result = await db.execute(query)
    return result.scalars().first()


async def create_user(db: AsyncSession, user: schemas.UserCreate, hashed_password: str):
    db_user = models.User(
        email=user.email,
        username=user.username,
        password_hash=hashed_password
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    result = await db.execute(
        select(models.User).options(
            selectinload(models.User.rss_sources),
            selectinload(models.User.podcasts)
        ).filter(models.User.id == db_user.id)
    )
    return result.scalars().first()

async def create_rss_source(db: AsyncSession, source: schemas.RssSourceCreate, user_id: int):
    """Create a new RSS source and associate it with a user."""
    db_source = models.RssSource(**source.model_dump(), user_id=user_id)
    db.add(db_source)
    await db.commit()
    await db.refresh(db_source)
    return db_source

async def get_sources_by_user(db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100):
    """Get all RSS sources for a specific user."""
    query = select(models.RssSource).filter(models.RssSource.user_id == user_id).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def delete_source(db: AsyncSession, source_id: int, user_id: int):
    """Delete an RSS source belonging to a specific user."""
    query = select(models.RssSource).filter(models.RssSource.id == source_id, models.RssSource.user_id == user_id)
    result = await db.execute(query)
    db_source = result.scalars().first()
    if db_source:
        await db.delete(db_source)
        await db.commit()
        return db_source
    return None

async def create_article(db: AsyncSession, article: schemas.ArticleCreate, source_id: int):
    """
    Creates a new Article object and adds it to the database session.
    This function does NOT commit the transaction.
    """
    db_article = models.Article(**article.model_dump(), source_id=source_id)
    db.add(db_article)
    return db_article

async def get_source_by_id(db: AsyncSession, source_id: int, user_id: int):
    """Get a single RSS source by its ID, ensuring it belongs to the user."""
    query = (
        select(models.RssSource)
        .filter(models.RssSource.id == source_id, models.RssSource.user_id == user_id)
    )
    result = await db.execute(query)
    return result.scalars().first()


async def get_articles_for_today(db: AsyncSession, user_id: int) -> list[models.Article]:
    """Get all articles for a user that were fetched today."""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(hours=8)
    
    query = (
        select(models.Article)
        .join(models.RssSource)
        .filter(models.RssSource.user_id == user_id)
        .filter(models.Article.fetched_at >= today_start)
    )
    
    result = await db.execute(query)
    return result.scalars().all()


async def create_podcast(db: AsyncSession, podcast_data: dict):
    """Create podcast record"""
    # Fix: Use correct field names to create podcast
    db_podcast = models.Podcast(
        owner_id=podcast_data["owner_id"],
        title=podcast_data.get("title"),
        script=podcast_data.get("script"),
        audio_file_path=podcast_data["audio_file_path"]
    )
    
    db.add(db_podcast)
    await db.flush()
    
    # If there are article associations
    if "article_ids" in podcast_data:
        for article_id in podcast_data["article_ids"]:
            article = await get_article_by_id(db, article_id)
            if article:
                db_podcast.articles.append(article)
    
    await db.commit()
    await db.refresh(db_podcast)
    return db_podcast

async def get_articles_by_ids(db: AsyncSession, article_ids: list[int]) -> list[models.Article]:
    """Get articles by their IDs."""
    query = select(models.Article).filter(models.Article.id.in_(article_ids))
    result = await db.execute(query)
    return result.scalars().all()

async def validate_rss_url(url: str) -> dict:
    """Validate if RSS URL is available and return basic info"""
    try:
        # 1. Check URL format
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return {
                "valid": False,
                "error": "Invalid URL format",
                "details": "URL must include protocol (http/https) and domain"
            }
        
        # 2. Try to get RSS content
        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True, timeout=10.0)
            response.raise_for_status()
        
        # 3. Try to parse RSS
        feed = feedparser.parse(response.text)
        
        # 4. Check if it's a valid RSS/Atom feed
        if not hasattr(feed, 'feed') or not feed.entries:
            return {
                "valid": False,
                "error": "Not a valid RSS/Atom feed",
                "details": "Content returned by URL cannot be parsed as RSS format, or has no article entries"
            }
        
        # 5. Extract basic RSS info
        feed_title = getattr(feed.feed, 'title', 'Unknown Feed')
        feed_description = getattr(feed.feed, 'description', '')
        total_entries = len(feed.entries)
        
        return {
            "valid": True,
            "feed_info": {
                "title": feed_title,
                "description": feed_description[:200] + "..." if len(feed_description) > 200 else feed_description,
                "total_articles": total_entries,
                "latest_article": feed.entries[0].title if feed.entries else "No articles"
            }
        }
        
    except httpx.TimeoutException:
        return {
            "valid": False,
            "error": "Request timeout",
            "details": "RSS source response time too long, please check if URL is correct"
        }
    except httpx.HTTPStatusError as e:
        return {
            "valid": False,
            "error": f"HTTP error {e.response.status_code}",
            "details": "Cannot access RSS source, URL may not exist or server error"
        }
    except Exception as e:
        return {
            "valid": False,
            "error": "RSS parsing failed",
            "details": str(e)
        }
    
async def check_rss_source_exists(db: AsyncSession, url: str, user_id: int) -> bool:
    """Check if user has already added the same RSS source"""
    # Normalize URL (remove trailing slash, unify protocol, etc.)
    normalized_url = url.rstrip('/').lower()
    
    query = select(models.RssSource).filter(
        models.RssSource.user_id == user_id,
        models.RssSource.url.ilike(f"%{normalized_url}%")
    )
    result = await db.execute(query)
    existing = result.scalars().first()
    return existing is not None

async def create_rss_source_with_validation(db: AsyncSession, source: schemas.RssSourceCreate, user_id: int):
    """Create RSS source with full validation"""
    
    # 1. Validate if RSS URL is available
    validation_result = await validate_rss_url(source.url)
    if not validation_result["valid"]:
        raise ValueError(f"RSS validation failed: {validation_result['error']} - {validation_result['details']}")
    
    # 2. Check for duplicates
    if await check_rss_source_exists(db, source.url, user_id):
        raise ValueError("You have already added this RSS source")
    
    # 3. If no name provided, use RSS feed title
    source_data = source.model_dump()
    if not source_data.get('name') and validation_result.get('feed_info'):
        source_data['name'] = validation_result['feed_info']['title']
    
    # 4. Create RSS source
    db_source = models.RssSource(**source_data, user_id=user_id)
    db.add(db_source)
    await db.commit()
    await db.refresh(db_source)
    
    return {
        "rss_source": db_source,
        "feed_info": validation_result.get('feed_info', {})
    }

async def get_article_by_id(db: AsyncSession, article_id: int, user_id: int = None) -> models.Article:
    """Get article by ID, optionally verify it belongs to user"""
    if user_id:
        query = (
            select(models.Article)
            .join(models.RssSource)
            .filter(
                models.Article.id == article_id,
                models.RssSource.user_id == user_id
            )
        )
    else:
        query = select(models.Article).filter(models.Article.id == article_id)
    
    result = await db.execute(query)
    return result.scalars().first()


async def associate_articles_with_podcast(
    db: AsyncSession, 
    podcast_id: int, 
    article_ids: list[int]
) -> bool:
    """Implement native SQL to associate articles and podcast"""
    try:
        if not article_ids:
            return True
        
        print(f"🔗 Associating {len(article_ids)} articles with podcast {podcast_id}")
        
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
            
            count_sql = text("""
                SELECT COUNT(*) FROM podcast_articles 
                WHERE podcast_id = :podcast_id
            """)
            result = await db.execute(count_sql, {"podcast_id": podcast_id})
            count = result.scalar()
            
            print(f"✅ Association completed: {count} articles linked to podcast {podcast_id}")
            return True
            
    except Exception as e:
        print(f"❌ Association failed: {e}")
        await db.rollback()
        return False

async def get_podcast_with_articles(db: AsyncSession, podcast_id: int, user_id: int):
    """Fetch podcast and its articles safely"""
    query = (
        select(models.Podcast)
        .options(selectinload(models.Podcast.articles))
        .filter(
            models.Podcast.id == podcast_id,
            models.Podcast.owner_id == user_id
        )
    )
    
    result = await db.execute(query)
    return result.scalar_one_or_none()