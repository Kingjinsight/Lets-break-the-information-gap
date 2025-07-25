from sqlalchemy.ext.asyncio import AsyncSession
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

