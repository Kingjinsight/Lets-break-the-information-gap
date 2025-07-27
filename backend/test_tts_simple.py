import google.genai as genai
from google.genai import types
import wave
from app.config import settings

def pcm_to_wav(pcm_data: bytes, output_path: str, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2):
    """Convert raw PCM data to WAV format"""
    with wave.open(output_path, 'wb') as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(sample_width) 
        wav_file.setframerate(sample_rate)   
        wav_file.writeframes(pcm_data)

def test_tts_with_wav():
    client = genai.Client(api_key=settings.google_api_key)
    
    simple_script = "Joe: Hello everyone, welcome to our test podcast. Jane: Thank you Joe, this is a test of our audio system."
    
    try:
        print("Testing TTS with WAV conversion...")
        response = client.models.generate_content(
            model=settings.tts_model_name,
            contents=[simple_script],
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
        

        audio_data = response.candidates[0].content.parts[0].inline_data.data
        mime_type = response.candidates[0].content.parts[0].inline_data.mime_type
        
        print(f"Audio data length: {len(audio_data)} bytes")
        print(f"MIME type: {mime_type}")
        
 
        with open("test_output.pcm", "wb") as f:
            f.write(audio_data)
        print("Raw PCM saved to test_output.pcm")

        pcm_to_wav(audio_data, "test_output.wav")
        print("WAV file saved to test_output.wav")

        pcm_to_wav(audio_data, "test_output_stereo.wav", channels=2)
        print("Stereo WAV saved to test_output_stereo.wav")
        
        return True
        
    except Exception as e:
        print(f"TTS test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_tts_with_wav()
    print(f"TTS with WAV conversion {'PASSED' if success else 'FAILED'}")