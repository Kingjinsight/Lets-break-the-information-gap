from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .config import settings
from .database import engine, Base
from .routers import auth, rss_sources, articles, podcasts

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(rss_sources.router, prefix="/api/v1/rss-sources", tags=["RSS Sources"])
app.include_router(articles.router, prefix="/api/v1/articles", tags=["Articles"])
app.include_router(podcasts.router, prefix="/api/v1/podcasts", tags=["Podcasts"])

@app.get("/")
def read_root():
    return {"Hello": "World"}