import google.genai as genai
from google.genai import types
import wave
import time
import asyncio
from pathlib import Path
from fastapi import HTTPException
from app.config import settings

PODCASTS_DIR = Path("podcasts")
PODCASTS_DIR.mkdir(exist_ok=True)

def pcm_to_wav(pcm_data: bytes, output_path: str, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2):
    """Convert raw PCM data to WAV format"""
    with wave.open(output_path, 'wb') as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)

def _combine_wav_files(wav_files: list, output_path: str):
    """Combine multiple WAV files"""
    if not wav_files:
        raise Exception("No files to combine")
    
    # Read first file to get audio parameters
    with wave.open(wav_files[0], 'rb') as first_wav:
        params = first_wav.getparams()
    
    # Create output file
    with wave.open(output_path, 'wb') as output_wav:
        output_wav.setparams(params)
        
        # Merge files one by one
        for wav_file in wav_files:
            with wave.open(wav_file, 'rb') as input_wav:
                output_wav.writeframes(input_wav.readframes(input_wav.getnframes()))
    
    print(f"🔗 Merge completed: {len(wav_files)} files → {output_path}")

def _calculate_optimal_chunks(script: str, max_chunks: int = 15) -> int:
    """
    Intelligently calculate optimal number of segments - limit to max_chunks API calls
    """
    script_length = len(script)
    
    chars_per_chunk = 1200
    
    # Calculate ideal number of segments
    ideal_chunks = (script_length + chars_per_chunk - 1) // chars_per_chunk
    
    # Limit maximum segments
    optimal_chunks = min(ideal_chunks, max_chunks)
    
    print(f"📊 Script length: {script_length} characters")
    print(f"💡 Ideal segments: {ideal_chunks} segments")
    print(f"🎯 Actual segments: {optimal_chunks} segments (limit ≤{max_chunks})")
    print(f"📏 Approx per segment: {script_length // optimal_chunks} characters")
    
    return optimal_chunks

def _split_script_intelligent(script: str, num_chunks: int) -> list:
    """
    Intelligent script splitting - split by natural dialogue boundaries
    """
    print(f"✂️ Intelligently splitting script into {num_chunks} segments...")
    
    # Split by lines and preserve dialogue structure
    lines = [line.strip() for line in script.split('\n') if line.strip()]
    
    # Find all dialogue start positions (Joe: or Jane:)
    dialogue_starts = []
    for i, line in enumerate(lines):
        if line.startswith('Joe:') or line.startswith('Jane:'):
            dialogue_starts.append(i)
    
    if len(dialogue_starts) < num_chunks:
        print(f"⚠️ Dialogue segments ({len(dialogue_starts)}) less than target segments ({num_chunks})")
        print("📝 Using simple character splitting...")
        return _split_script_by_chars(script, num_chunks)
    
    # Calculate characters per segment
    total_chars = len(script)
    target_chars_per_chunk = total_chars // num_chunks
    
    chunks = []
    current_chunk_lines = []
    current_chunk_chars = 0
    dialogue_index = 0
    
    for i, line in enumerate(lines):
        current_chunk_lines.append(line)
        current_chunk_chars += len(line) + 1  # +1 for newline
        
        # Check if should end current chunk
        should_end_chunk = False
        
        # Condition 1: reached target characters and current is end of dialogue
        if (current_chunk_chars >= target_chars_per_chunk and 
            i + 1 < len(lines) and 
            (lines[i + 1].startswith('Joe:') or lines[i + 1].startswith('Jane:'))):
            should_end_chunk = True
        
        # Condition 2: generated enough segments, put remaining content in last segment
        if len(chunks) == num_chunks - 1:
            should_end_chunk = False  # Last segment contains all remaining content
        
        # Condition 3: current segment too long, force split
        if current_chunk_chars > target_chars_per_chunk * 1.5:
            should_end_chunk = True
        
        if should_end_chunk and len(chunks) < num_chunks - 1:
            chunk_text = '\n'.join(current_chunk_lines)
            chunks.append(chunk_text)
            print(f"📋 Segment {len(chunks)}: {len(chunk_text)} characters")
            
            current_chunk_lines = []
            current_chunk_chars = 0
    
    # Add last segment
    if current_chunk_lines:
        final_chunk = '\n'.join(current_chunk_lines)
        chunks.append(final_chunk)
        print(f"📋 Segment {len(chunks)} (last): {len(final_chunk)} characters")
    
    print(f"✅ Intelligent splitting completed: {len(chunks)} segments")
    return chunks

def _split_script_by_chars(script: str, num_chunks: int) -> list:
    """
    Simple character splitting - fallback solution
    """
    chars_per_chunk = len(script) // num_chunks
    chunks = []
    
    for i in range(num_chunks):
        start = i * chars_per_chunk
        if i == num_chunks - 1:
            end = len(script)
        else:
            end = (i + 1) * chars_per_chunk
            # Try to split at period or newline
            while end < len(script) and script[end] not in '.!\n':
                end += 1
            if end >= len(script):
                end = len(script)
        
        chunk = script[start:end].strip()
        if chunk:
            chunks.append(chunk)
            print(f"📋 Segment {len(chunks)}: {len(chunk)} characters")
    
    return chunks

def _generate_single_chunk(script: str, output_filename: str, api_key: str = None) -> str:
    """
    Generate single audio segment - Use non-streaming API for better stability
    """
    # Use user's API key if provided, otherwise fall back to system default
    google_api_key = api_key or settings.google_api_key
    client = genai.Client(api_key=google_api_key)
    
    try:
        print(f"🎵 Generating audio segment: {len(script)} characters")
        start_time = time.time()
        
        # Use non-streaming API (suitable for short segments, more stable)
        response = client.models.generate_content(
            model=settings.tts_model_name,
            contents=[script],
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                        speaker_voice_configs=[
                            types.SpeakerVoiceConfig(
                                speaker='Joe',
                                voice_config=types.VoiceConfig(
                                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='charon')
                                )
                            ),
                            types.SpeakerVoiceConfig(
                                speaker='Jane',
                                voice_config=types.VoiceConfig(
                                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='aoede')
                                )
                            ),
                        ]
                    )
                )
            )
        )
        
        elapsed_time = time.time() - start_time
        print(f"✅ API response time: {elapsed_time:.2f} seconds")
        
        # Extract audio data
        if (not response.candidates or 
            not response.candidates[0].content.parts or
            not hasattr(response.candidates[0].content.parts[0], 'inline_data')):
            raise Exception("No audio data in API response")
        
        audio_data = response.candidates[0].content.parts[0].inline_data.data
        
        # Save audio file
        if not output_filename.endswith('.wav'):
            output_filename = output_filename.rsplit('.', 1)[0] + '.wav'
        
        output_path = PODCASTS_DIR / output_filename
        pcm_to_wav(audio_data, str(output_path))
        
        file_size = output_path.stat().st_size / 1024  # KB
        print(f"💾 Audio segment saved: {output_path} ({file_size:.1f} KB)")
        
        return str(output_path)
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Audio segment generation failed: {error_msg}")
        raise Exception(f"Segment generation failed: {error_msg}")

def _generate_audio_sync(script: str, output_filename: str, api_key: str = None) -> str:
    """
    Intelligent segmented TTS generation - Automatically calculate optimal number of segments
    """
    print(f"🎬 Starting intelligent segmented audio generation: {len(script)} characters")
    
    # Intelligently calculate number of segments (max 10 segments to protect quota)
    num_chunks = _calculate_optimal_chunks(script, max_chunks=15)
    
    print(f"💎 Will consume {num_chunks} TTS quota calls (total 15/day)")
    
    if num_chunks == 1:
        print("📝 Script is short, using single call...")
        try:
            return _generate_single_chunk(script, output_filename, api_key)
        except Exception as e:
            if "timeout" in str(e).lower() or "disconnected" in str(e).lower():
                print("⚠️ Single call timeout, forcing split into 2 segments...")
                num_chunks = 2
            else:
                raise e
    
    # Intelligently split script
    chunks = _split_script_intelligent(script, num_chunks)
    
    if len(chunks) != num_chunks:
        print(f"⚠️ Actual segments ({len(chunks)}) don't match plan ({num_chunks})")
    
    # Generate audio segments
    chunk_files = []
    failed_chunks = []
    
    print(f"🎵 Starting generation of {len(chunks)} audio segments...")
    
    for i, chunk in enumerate(chunks):
        chunk_filename = f"chunk_{i+1:02d}_{output_filename}"
        
        try:
            print(f"\n🎯 Processing segment {i+1}/{len(chunks)}...")
            chunk_path = _generate_single_chunk(chunk, chunk_filename, api_key)
            chunk_files.append(chunk_path)
            
            # API call interval (avoid rate limiting)
            if i < len(chunks) - 1:
                print("⏱️ Waiting 3 seconds to avoid API limits...")
                time.sleep(3)
                
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Segment {i+1} failed: {error_msg}")
            failed_chunks.append(i+1)
            
            # Stop immediately if quota issue
            if "quota" in error_msg.lower() or "resource_exhausted" in error_msg.lower():
                print("🚫 Quota exhausted, stopping processing")
                break
            
            # Continue with next segment for other errors
            continue
    
    # Check results
    if not chunk_files:
        raise Exception("All audio segments generation failed")
    
    if failed_chunks:
        print(f"⚠️ Failed segments: {failed_chunks}")
        print(f"✅ Successful segments: {len(chunk_files)}/{len(chunks)}")
    
    # Merge audio files
    if not output_filename.endswith('.wav'):
        output_filename = output_filename.rsplit('.', 1)[0] + '.wav'
    
    final_output = PODCASTS_DIR / output_filename
    _combine_wav_files(chunk_files, str(final_output))
    
    # Clean up temporary files
    for chunk_file in chunk_files:
        try:
            Path(chunk_file).unlink()
            print(f"🗑️ Cleaned temp file: {Path(chunk_file).name}")
        except:
            pass
    
    file_size = final_output.stat().st_size / 1024 / 1024  # MB
    print(f"\n🎉 Intelligent segmentation processing completed!")
    print(f"💾 Final file: {final_output} ({file_size:.1f} MB)")
    print(f"💰 Total consumed: {len(chunk_files)} TTS quota calls")
    print(f"📊 Success rate: {len(chunk_files)}/{len(chunks)} ({len(chunk_files)/len(chunks)*100:.1f}%)")
    
    return str(final_output)

# Async wrapper - compatible with existing code
async def generate_podcast_audio(script: str, output_filename: str, api_key: str = None) -> str:
    """Async wrapper"""
    from fastapi.concurrency import run_in_threadpool
    return await run_in_threadpool(_generate_audio_sync, script, output_filename, api_key)

def estimate_tokens(text: str) -> int:
    """Estimate token count for text"""
    return len(text.split()) * 1.3

async def generate_podcast_audio_with_retry(
    script: str, 
    output_filename: str,
    api_key: str = None,
    max_retries: int = 3
) -> str:
    """Podcast audio generation with retry mechanism"""
    for attempt in range(max_retries):
        try:
            return await generate_podcast_audio(script, output_filename, api_key)
        except Exception as e:
            if "quota" in str(e).lower():
                raise HTTPException(
                    status_code=429, 
                    detail="TTS quota exhausted. Please try tomorrow."
                )
            
            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=500,
                    detail=f"Audio generation failed after {max_retries} attempts: {str(e)}"
                )
            
            print(f"⚠️ Attempt {attempt + 1} failed, retrying...")
            await asyncio.sleep(5)