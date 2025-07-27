from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from . import models, schemas

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
        .options(selectinload(models.RssSource.articles))
        .filter(models.RssSource.id == source_id, models.RssSource.user_id == user_id)
    )
    result = await db.execute(query)
    return result.scalars().first()


async def get_articles_for_today(db: AsyncSession, user_id: int) -> list[models.Article]:
    """Get all articles for a user that were fetched today."""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = (
        select(models.Article)
        .join(models.RssSource)
        .filter(models.RssSource.user_id == user_id)
        .filter(models.Article.fetched_at >= today_start)
    )
    
    result = await db.execute(query)
    return result.scalars().all()


async def create_podcast(db: AsyncSession, user_id: int, file_path: str, articles_to_link: list[models.Article]):
    db_podcast = models.Podcast(user_id=user_id, audio_file_path=file_path)
    db_podcast.articles.extend(articles_to_link)
    
    db.add(db_podcast)
    await db.commit()
    await db.refresh(db_podcast)
    return db_podcast

async def get_articles_by_ids(db: AsyncSession, article_ids: list[int]) -> list[models.Article]:
    """Get articles by their IDs."""
    query = select(models.Article).filter(models.Article.id.in_(article_ids))
    result = await db.execute(query)
    return result.scalars().all()