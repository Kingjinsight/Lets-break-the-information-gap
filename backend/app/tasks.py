from celery import current_task
from app.celery_app import celery_app
from app.services import script_writer, tts_service
from app import models
from app.config import settings
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import asyncio
import os

def get_sync_database_url():
    """Convert async database URL to sync version"""
    url = settings.database_url
    print(f"🔍 Original database URL: {url[:50]}...")
    
    # Convert to psycopg2 format (sync version)
    if "postgresql+psycopg://" in url:
        sync_url = url.replace("postgresql+psycopg://", "postgresql://")
    elif "postgresql://" in url and "psycopg" not in url:
        # If already basic PostgreSQL URL, use directly
        sync_url = url
    else:
        # Other cases, try to clean to basic format
        sync_url = url.replace("postgresql+psycopg://", "postgresql://")
    
    print(f"🔄 Converted URL: {sync_url[:50]}...")
    return sync_url

# Initialize sync database connection for Celery
try:
    sync_database_url = get_sync_database_url()
    
    sync_engine = create_engine(
        sync_database_url,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={
            "options": "-c timezone=utc"
        }
    )
    SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
    print(f"✅ Sync database engine created successfully")
except Exception as e:
    print(f"❌ Failed to create sync database engine: {e}")
    print(f"🔧 Please check if psycopg2-binary is installed")
    sync_engine = None
    SyncSessionLocal = None

@celery_app.task(bind=True)
def generate_podcast_task(self, podcast_id: int, user_id: int, articles_data: list):
    """Generate podcast Celery task - Complete sync version with fixed field names"""
    try:
        print(f"🎙️ Starting podcast generation, Podcast ID: {podcast_id}")
        
        # Check database connection
        if not SyncSessionLocal:
            raise Exception("Database connection not available in Celery worker")
        
        # Get user's Google API key from settings
        user_google_api_key = None
        with SyncSessionLocal() as db:
            user_settings_query = select(models.UserSettings).filter(models.UserSettings.user_id == user_id)
            user_settings = db.execute(user_settings_query).scalars().first()
            if user_settings and user_settings.google_api_key:
                user_google_api_key = user_settings.google_api_key
                print(f"✅ Using user's Google API key")
            else:
                print(f"⚠️ No user API key found, using system default")
        
        self.update_state(
            state='PROGRESS',
            meta={'current': 10, 'total': 100, 'status': 'Generating script...'}
        )
        
        # 1. Generate script with user's API key
        print(f"📝 Starting script generation for {len(articles_data)} articles...")
        script = script_writer.generate_script_from_articles(articles_data, api_key=user_google_api_key)
        
        if not script:
            raise Exception("Script generation failed")
        
        print(f"✅ Script generation completed: {len(script)} characters")
        
        # Update progress: Script completed
        self.update_state(
            state='PROGRESS',
            meta={'current': 40, 'total': 100, 'status': 'Script generated, creating audio...'}
        )
        
        # 2. Generate audio
        print(f"🎵 Starting audio generation...")
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        audio_filename = f"podcast_{podcast_id}_{user_id}_{timestamp}.wav"
        
        try:
            # Run TTS generation in asyncio context with user's API key
            audio_path = asyncio.run(tts_service.generate_podcast_audio(script, audio_filename, api_key=user_google_api_key))
            print(f"✅ Audio generation completed: {audio_path}")
        except Exception as audio_error:
            print(f"⚠️ Audio generation failed: {audio_error}")
            # Continue with script-only podcast
            audio_path = ""
        
        # Update progress: Audio completed
        self.update_state(
            state='PROGRESS',
            meta={'current': 90, 'total': 100, 'status': 'Updating database...'}
        )
        
        # 3. Update database using sync operations
        def update_podcast_record():
            """Update podcast record using sync SQLAlchemy"""
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    with SyncSessionLocal() as db:
                        print(f"🔍 Looking for podcast ID: {podcast_id} (attempt {attempt + 1})")
                        
                        # Query podcast record using sync session
                        podcast_query = select(models.Podcast).where(models.Podcast.id == podcast_id)
                        result = db.execute(podcast_query)
                        podcast = result.scalar_one_or_none()
                        
                        if not podcast:
                            # Debug: List recent podcasts to see what exists
                            recent_podcasts = db.execute(
                                select(models.Podcast.id, models.Podcast.title, models.Podcast.created_at)
                                .order_by(models.Podcast.created_at.desc())
                                .limit(5)
                            ).fetchall()
                            print(f"❌ Podcast {podcast_id} not found. Recent podcasts: {[(p.id, p.title, p.created_at) for p in recent_podcasts]}")
                            
                            if attempt < max_retries - 1:
                                print(f"⏳ Retrying in 3 seconds...")
                                import time
                                time.sleep(3)
                                continue
                            return False
                        
                        print(f"✅ Found podcast: {podcast.id} - {podcast.title}")
                        
                        # Update podcast fields
                        podcast.script = script
                        podcast.audio_file_path = audio_path if audio_path else ""
                        podcast.status = "completed" if audio_path else "script_only"
                        podcast.generated_at = datetime.utcnow()
                        
                        # Commit changes
                        db.commit()
                        print(f"✅ Database updated successfully")
                        return True
                        
                except Exception as db_error:
                    print(f"❌ Database update failed (attempt {attempt + 1}/{max_retries}): {db_error}")
                    import traceback
                    traceback.print_exc()
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(3)
                    continue
            
            return False
        
        # Run database update
        success = update_podcast_record()
        
        if success:
            result = {
                'podcast_id': podcast_id,
                'audio_path': audio_path,
                'script_length': len(script),
                'status': 'completed' if audio_path else 'script_only',
                'has_audio': bool(audio_path and os.path.exists(audio_path))
            }
            
            print(f"🎉 Podcast generation completed!")
            print(f"📊 Result: {result}")
            
            return result
        else:
            raise Exception(f"Failed to update podcast record {podcast_id}")
            
    except Exception as e:
        error_message = str(e)
        print(f"❌ Task failed: {error_message}")
        
        self.update_state(
            state='FAILURE',
            meta={
                'error': error_message,
                'podcast_id': podcast_id,
                'timestamp': datetime.now().isoformat()
            }
        )
        raise