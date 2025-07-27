from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from app.database import AsyncSessionLocal
from app import models, schemas, crud
from .auth import get_current_active_user
from app.services import script_writer, tts_service

router = APIRouter()

@router.post("/generate", response_model=schemas.Podcast)
async def generate_podcast_endpoint(
    current_user: models.User = Depends(get_current_active_user)
):
    try:
        print("Fetching articles from database...")
        async with AsyncSessionLocal() as session:
            articles = await crud.get_articles_for_today(session, user_id=current_user.id)
            if not articles:
                raise HTTPException(status_code=404, detail="No new articles found for today.")
            
            articles_data = [
                {"id": article.id, "title": article.title, "content": article.content}
                for article in articles
            ]
            article_ids = [article.id for article in articles]


        print("Generating script from articles...")
        final_script = await run_in_threadpool(
            script_writer.generate_script_from_articles, articles_data
        )

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        output_filename = f"user_{current_user.id}_{timestamp}.wav"

        print("Generating audio from script...")
        audio_file_path = await tts_service.generate_podcast_audio(final_script, output_filename)


        print("Saving podcast record to database...")
        async with AsyncSessionLocal() as session:
            try:
                podcast_data = {
                    "user_id": current_user.id,
                    "title": f"Daily Podcast - {timestamp}",
                    "script": final_script,
                    "audio_file_path": audio_file_path,
                    "article_ids": article_ids
                }
                
                db_podcast = await crud.create_podcast(session, podcast_data)
                await session.commit()
                
                print("Podcast created successfully!")
                return db_podcast
                
            except Exception as db_error:
                await session.rollback()
                print(f"Database save failed: {db_error}")
                return {
                    "id": 0,
                    "user_id": current_user.id,
                    "title": f"Daily Podcast - {timestamp}",
                    "script": final_script,
                    "audio_file_path": audio_file_path,
                    "created_at": datetime.now(),
                    "article_ids": article_ids
                }
                    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in podcast generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate podcast: {str(e)}")

@router.post("/test-tts")
async def test_tts_endpoint():
    """Simple test endpoint to verify TTS service works"""
    
    test_script = """Joe: Hello everyone, welcome to our daily news podcast. I'm Joe.
Jane: And I'm Jane. Today we're discussing some fascinating technology developments.
Joe: That's right Jane. Let's dive into today's stories.
Jane: Sounds great, Joe. Let's get started."""
    
    try:
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        test_filename = f"test_tts_{timestamp}.wav"
        
        print("Testing TTS with simple script...")
        audio_file_path = await tts_service.generate_podcast_audio(test_script, test_filename)
        
        return {
            "status": "success", 
            "message": "TTS test completed successfully",
            "audio_file": audio_file_path,
            "script": test_script
        }
        
    except Exception as e:
        print(f"TTS test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS test failed: {str(e)}")
    

@router.post("/generate-chunked")
async def generate_podcast_chunked():
    """Test chunked audio generation"""
    
    # Test with a medium-length script
    test_script = """Joe: Welcome everyone to today's tech news podcast. I'm Joe, and we're covering some fascinating developments in AI and climate technology.
Jane: Thanks Joe. I'm excited to discuss these breakthrough technologies that are reshaping our world.
Joe: Let's start with the AI revolution. Jane, what's the most significant development you've seen recently?
Jane: The advances in machine learning are truly remarkable. We're seeing AI applications in healthcare that can diagnose diseases earlier than ever before.
Joe: That's incredible. How is this impacting patient outcomes?
Jane: Early detection means better treatment options and higher survival rates. It's revolutionizing personalized medicine.
Joe: Now let's talk about climate technology. What innovations are giving you hope?
Jane: Carbon capture technology has made huge strides. New methods can remove CO2 from the atmosphere more efficiently than ever.
Joe: How realistic is large-scale deployment of these technologies?
Jane: Very realistic. Several pilot projects are already showing promising results, and costs are dropping rapidly.
Joe: That's encouraging news for our planet's future. Thanks for joining us today, Jane.
Jane: Thank you Joe. It's always a pleasure to discuss these important developments."""
    
    try:
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        test_filename = f"chunked_test_{timestamp}.wav"
        
        print("Testing chunked TTS generation...")
        audio_file_path = await tts_service.generate_podcast_audio(test_script, test_filename)
        
        return {
            "status": "success", 
            "message": "Chunked TTS completed successfully",
            "audio_file": audio_file_path,
            "script_length": len(test_script)
        }
        
    except Exception as e:
        print(f"Chunked TTS test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chunked TTS failed: {str(e)}")