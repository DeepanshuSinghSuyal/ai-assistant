import io
import wave
import asyncio
import numpy as np
import sounddevice as sd
from typing import Optional

class AudioVoiceRecorder:
    """Records voice audio clips for multimodal speech-to-text input."""
    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        self.sample_rate = sample_rate
        self.channels = channels

    def record_clip_sync(self, duration_sec: float = 4.0) -> bytes:
        """Synchronously records mic audio for duration_sec and returns WAV bytes."""
        num_frames = int(duration_sec * self.sample_rate)
        audio_data = sd.rec(num_frames, samplerate=self.sample_rate, channels=self.channels, dtype='int16')
        sd.wait()

        # Check if actual sound was recorded (RMS)
        rms = float(np.sqrt(np.mean(audio_data.astype(np.float32) ** 2)))
        if rms < 150.0:
            return b""  # Pure silence

        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wav_file:
            wav_file.setnchannels(self.channels)
            wav_file.setsampwidth(2)
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(audio_data.tobytes())

        return buf.getvalue()

    async def record_clip(self, duration_sec: float = 4.0) -> bytes:
        """Asynchronously records audio without blocking the event loop."""
        return await asyncio.to_thread(self.record_clip_sync, duration_sec)
