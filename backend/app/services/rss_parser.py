import feedparser
import asyncio
import aiohttp
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
import logging

from app import models, schemas
from app.database import get_db

logger = logging.getLogger(__name__)

async def fetch_rss_feed(url: str) -> List[Dict]:
    """Fetch and parse RSS feed"""
    try:
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    articles = []
                    for entry in feed.entries:
                        published_date = None
                        if hasattr(entry, 'published_parsed') and entry.published_parsed:
                            try:
                                published_date = datetime(*entry.published_parsed[:6])
                                if published_date.tzinfo is None:
                                    published_date = published_date.replace(tzinfo=timezone.utc)
                                print(f"📅 Parsed publish time: {published_date}")
                            except (TypeError, ValueError) as e:
                                print(f"⚠️  Error parsing published time: {e}")
                                published_date = datetime.now(timezone.utc)
                        else:
                            published_date = datetime.now(timezone.utc)
                        
                        content = ""
                        summary = ""
                        
                        if hasattr(entry, 'content') and entry.content:
                            content = entry.content[0].value if isinstance(entry.content, list) else entry.content
                        elif hasattr(entry, 'description'):
                            content = entry.description
                            
                        if hasattr(entry, 'summary'):
                            summary = entry.summary
                        elif hasattr(entry, 'description'):
                            summary = entry.description[:500] + "..." if len(entry.description) > 500 else entry.description
                        
                        author = "Unknown Author"
                        if hasattr(entry, 'author'):
                            author = entry.author
                        elif hasattr(entry, 'authors') and entry.authors:
                            author = entry.authors[0].get('name', 'Unknown Author')
                        
                        article_data = {
                            'title': entry.title if hasattr(entry, 'title') else 'Untitled',
                            'article_url': entry.link if hasattr(entry, 'link') else '',
                            'content': content,
                            'author': author,
                            'published_date': published_date,
                            'fetched_at': datetime.now(timezone.utc),
                            'summary': summary
                        }
                        
                        articles.append(article_data)
                    
                    print(f"✅ Successfully parsed {len(articles)} articles")
                    return articles
                else:
                    print(f"❌ Failed to fetch RSS feed: HTTP {response.status}")
                    return []
                    
    except Exception as e:
        print(f"❌ Error fetching RSS feed: {str(e)}")
        return []

async def process_articles_for_source(
    db: AsyncSession,
    source: models.RssSource,
    articles_data: List[Dict]
) -> Tuple[int, int, int]:
    """Process articles for a specific RSS source"""
    new_count = 0
    existing_count = 0
    old_count = 0
    
    cutoff_date = datetime.now(timezone.utc).replace(day=1).replace(month=datetime.now().month-1 if datetime.now().month > 1 else 12)
    print(f"📅 Cutoff date for 30-day filter: {cutoff_date}")
    
    for article_data in articles_data:
        try:
            published_date = article_data.get('published_date')
            if published_date and published_date < cutoff_date:
                print(f"⏭️  Skipping old article: {published_date} < {cutoff_date}")
                old_count += 1
                continue
            
            existing_query = select(models.Article).where(
                and_(
                    models.Article.article_url == article_data['article_url'],
                    models.Article.source_id == source.id
                )
            )
            result = await db.execute(existing_query)
            existing_article = result.scalar_one_or_none()
            
            if existing_article:
                existing_count += 1
                continue
            
            article_create_data = {
                'title': article_data.get('title', 'Untitled'),
                'article_url': article_data.get('article_url', ''),
                'content': article_data.get('content', ''),
                'author': article_data.get('author', 'Unknown Author'),
                'published_date': article_data.get('published_date'),
                'fetched_at': article_data.get('fetched_at') or datetime.now(timezone.utc),
                'summary': article_data.get('summary', ''),
                'source_id': source.id
            }
            
            print(f"🔍 Creating article with data: {list(article_create_data.keys())}")
            
            try:
                article_create = schemas.ArticleCreate(**article_create_data)
            except Exception as validation_error:
                print(f"❌ Validation error for article '{article_data.get('title', 'Unknown')}': {validation_error}")
                print(f"❌ Article data keys: {list(article_create_data.keys())}")
                print(f"❌ Article data: {article_create_data}")
                continue
            
            new_article = models.Article(
                title=article_create.title,
                content=article_create.content,
                article_url=article_create.article_url,
                author=article_create.author,
                published_date=article_create.published_date,
                fetched_at=article_create.fetched_at,
                source_id=source.id,
                summary=article_create.summary or '',
                is_read=False,
                read_at=None
            )
            
            db.add(new_article)
            new_count += 1
            
        except Exception as e:
            print(f"❌ Error processing individual article '{article_data.get('title', 'Unknown')}': {str(e)}")
            continue
    
    try:
        await db.commit()
        print(f"📊 Source {source.name}: {new_count} new, {existing_count} existing, {old_count} too old")
    except Exception as e:
        await db.rollback()
        print(f"❌ Error committing articles for source {source.name}: {str(e)}")
        new_count = 0
    
    return new_count, existing_count, old_count

async def fetch_all_rss_sources(db: AsyncSession, user_id: int) -> Dict:
    """Fetch articles from all RSS sources for a user"""
    try:
        query = select(models.RssSource).where(models.RssSource.user_id == user_id)
        result = await db.execute(query)
        sources = result.scalars().all()
        
        if not sources:
            return {
                "success": True,
                "message": "No RSS sources found",
                "total_new_articles": 0,
                "sources_processed": 0
            }
        
        print(f"🔄 Fetching from {len(sources)} RSS sources with independent sessions")
        
        total_new_articles = 0
        sources_processed = 0
        
        for i, source in enumerate(sources, 1):
            print(f"📦 Processing source {i}/{len(sources)}: {source.name}")
            try:
                from app.database import AsyncSessionLocal
                async with AsyncSessionLocal() as source_db:
                    print(f"🔄 Processing source: {source.name}")
                    
                    articles_data = await fetch_rss_feed(source.url)
                    
                    if not articles_data:
                        print(f"⚠️  No articles found for source: {source.name}")
                        continue
                    
                    print(f"📰 RSS parsing result: {len(articles_data)} articles")
                    
                    source_query = select(models.RssSource).where(models.RssSource.id == source.id)
                    source_result = await source_db.execute(source_query)
                    current_source = source_result.scalar_one()
                    
                    new_count, existing_count, old_count = await process_articles_for_source(
                        source_db, current_source, articles_data
                    )
                    
                    total_new_articles += new_count
                    sources_processed += 1
                    
                    print(f"✅ Source {i} completed: {new_count} new articles")
                    
            except Exception as e:
                print(f"❌ Error processing source {source.name}: {str(e)}")
                continue
        
        return {
            "success": True,
            "message": f"Successfully processed {sources_processed} sources",
            "total_new_articles": total_new_articles,
            "sources_processed": sources_processed
        }
        
    except Exception as e:
        print(f"❌ Error in fetch_all_rss_sources: {str(e)}")
        return {
            "success": False,
            "message": f"Error fetching RSS sources: {str(e)}",
            "total_new_articles": 0,
            "sources_processed": 0
        }

async def validate_rss_url(url: str) -> schemas.RssValidationResult:
    """Validate RSS URL"""
    try:
        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    if feed.bozo:
                        return schemas.RssValidationResult(
                            valid=False,
                            error="Invalid RSS format",
                            details=str(feed.bozo_exception)
                        )
                    
                    feed_info = {
                        "title": getattr(feed.feed, 'title', 'Unknown'),
                        "description": getattr(feed.feed, 'description', ''),
                        "entries_count": len(feed.entries)
                    }
                    
                    return schemas.RssValidationResult(
                        valid=True,
                        feed_info=feed_info
                    )
                else:
                    return schemas.RssValidationResult(
                        valid=False,
                        error=f"HTTP {response.status}",
                        details=f"Failed to fetch URL: {response.status}"
                    )
    except asyncio.TimeoutError:
        return schemas.RssValidationResult(
            valid=False,
            error="Timeout",
            details="Request timed out after 15 seconds"
        )
    except Exception as e:
        return schemas.RssValidationResult(
            valid=False,
            error="Network error",
            details=str(e)
        )