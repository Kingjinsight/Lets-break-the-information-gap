import google.genai as genai
from google.genai import types
from pathlib import Path
import wave
import time
from app.config import settings

client = genai.Client(api_key=settings.google_api_key)

PODCASTS_DIR = Path("podcasts")
PODCASTS_DIR.mkdir(exist_ok=True)

def pcm_to_wav(pcm_data: bytes, output_path: str, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2):
    """
    Convert raw PCM data to WAV format
    """
    with wave.open(output_path, 'wb') as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)   
        wav_file.writeframes(pcm_data)

def estimate_tokens(text: str) -> int:
    """Rough token estimation: 1 token ≈ 4 characters"""
    return len(text) // 4

def split_script_into_chunks(script: str, max_chunk_size: int = 400) -> list:
    """
    Split script into smaller chunks while preserving speaker turns
    """
    lines = script.strip().split('\n')
    chunks = []
    current_chunk = []
    current_size = 0
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        line_size = len(line)
        
        if current_size + line_size > max_chunk_size and current_chunk:
            chunks.append('\n'.join(current_chunk))
            current_chunk = [line]
            current_size = line_size
        else:
            current_chunk.append(line)
            current_size += line_size

    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    
    return chunks

def combine_wav_files(wav_files: list, output_path: str):
    """Combine multiple WAV files into one"""
    combined_data = b''
    
    for wav_file in wav_files:
        with wave.open(wav_file, 'rb') as wav:
            combined_data += wav.readframes(wav.getnframes())
    
    pcm_to_wav(combined_data, output_path)

def _generate_audio_chunk_sync(script_chunk: str, chunk_index: int, output_filename: str, max_retries: int = 3) -> str:
    """Generate audio for a single script chunk"""
    
    for attempt in range(max_retries):
        try:
            print(f"Generating chunk {chunk_index + 1}, attempt {attempt + 1}/{max_retries}")
            print(f"Chunk preview: {script_chunk[:100]}...")
            print(f"Chunk tokens: {estimate_tokens(script_chunk)}")
            
            response = client.models.generate_content(
                model=settings.tts_model_name,
                contents=[script_chunk],
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                            speaker_voice_configs=[
                                types.SpeakerVoiceConfig(
                                    speaker='Joe',
                                    voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='aoede'))
                                ),
                                types.SpeakerVoiceConfig(
                                    speaker='Jane',
                                    voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='charon'))
                                ),
                            ]
                        )
                    )
                )
            )

            # Extract audio data
            audio_data = response.candidates[0].content.parts[0].inline_data.data
            print(f"Chunk {chunk_index + 1} generated: {len(audio_data)} bytes")

            # Save chunk
            chunk_filename = f"chunk_{chunk_index}_{output_filename}"
            if not chunk_filename.endswith('.wav'):
                chunk_filename = chunk_filename.rsplit('.', 1)[0] + '.wav'
            
            chunk_path = PODCASTS_DIR / chunk_filename
            
            pcm_to_wav(audio_data, str(chunk_path))
            print(f"Chunk {chunk_index + 1} saved to {chunk_path}")
            
            return str(chunk_path)
            
        except Exception as e:
            print(f"Chunk {chunk_index + 1}, attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
            else:
                raise e

def _generate_audio_direct(script: str, output_filename: str) -> str:
    """Try to generate the full script at once"""
    print("Attempting direct generation...")
    
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
                            voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='aoede'))
                        ),
                        types.SpeakerVoiceConfig(
                            speaker='Jane',
                            voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='charon'))
                        ),
                    ]
                )
            )
        )
    )

    # Extract audio data
    audio_data = response.candidates[0].content.parts[0].inline_data.data
    print(f"Generated audio: {len(audio_data)} bytes")

    # Save file
    if not output_filename.endswith('.wav'):
        output_filename = output_filename.rsplit('.', 1)[0] + '.wav'
    
    output_path = PODCASTS_DIR / output_filename
    pcm_to_wav(audio_data, str(output_path))
    
    print(f"Audio saved to {output_path}")
    return str(output_path)

def _generate_audio_chunked(script: str, output_filename: str) -> str:
    """Generate audio in chunks and combine"""
    print("Using chunked generation approach...")
    
    chunks = split_script_into_chunks(script, max_chunk_size=400)
    print(f"Split into {len(chunks)} chunks")
    
    chunk_files = []
    
    try:
        for i, chunk in enumerate(chunks):
            print(f"Processing chunk {i + 1}/{len(chunks)} ({estimate_tokens(chunk)} tokens)")
            chunk_file = _generate_audio_chunk_sync(chunk, i, output_filename)
            chunk_files.append(chunk_file)
            
           
            if i < len(chunks) - 1:
                time.sleep(2)
        
        # Combine chunks
        print("Combining audio chunks...")
        final_output = PODCASTS_DIR / output_filename
        if not str(final_output).endswith('.wav'):
            final_output = PODCASTS_DIR / (output_filename.rsplit('.', 1)[0] + '.wav')
        
        combine_wav_files(chunk_files, str(final_output))
        
        # Clean up
        for chunk_file in chunk_files:
            Path(chunk_file).unlink()
        
        print(f"Final combined audio saved to {final_output}")
        return str(final_output)
        
    except Exception as e:
        # Clean up on error
        for chunk_file in chunk_files:
            try:
                Path(chunk_file).unlink()
            except:
                pass
        raise e

def _generate_audio_sync(script: str, output_filename: str) -> str:
    """
    Generate multi-speaker audio with token limit checking
    """
    print("Generating multi-speaker audio from script...")
    print(f"Script length: {len(script)} characters")
    
    estimated_tokens = estimate_tokens(script)
    print(f"Estimated tokens: {estimated_tokens}")
    
    if estimated_tokens > 30000:
        print(f"⚠️  Script likely exceeds 32k token limit! ({estimated_tokens} estimated tokens)")
        print("Truncating script to fit within limit...")
        
        max_chars = 28000 * 4
        script = script[:max_chars]
        print(f"Truncated to {len(script)} characters ({estimate_tokens(script)} estimated tokens)")
    
    if estimated_tokens <= 5000:
        try:
            print("Script is small enough, trying direct generation...")
            return _generate_audio_direct(script, output_filename)
        except Exception as e:
            print(f"Direct generation failed: {e}")
            if any(keyword in str(e).lower() for keyword in ["context", "token", "length", "timeout", "disconnected"]):
                print("Error suggests size/timeout issue. Trying chunked approach...")
                return _generate_audio_chunked(script, output_filename)
            else:
                raise e
    else:
        print("Script is large, using chunked approach...")
        return _generate_audio_chunked(script, output_filename)

async def generate_podcast_audio(script: str, output_filename: str) -> str:
    """
    Async wrapper for the synchronous TTS generation
    """
    from fastapi.concurrency import run_in_threadpool
    return await run_in_threadpool(_generate_audio_sync, script, output_filename)