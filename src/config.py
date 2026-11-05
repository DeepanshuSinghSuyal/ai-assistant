import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Explicitly load .env file from project root regardless of current working directory
load_dotenv(PROJECT_ROOT / ".env")

@dataclass
class Config:
    project_root: Path = PROJECT_ROOT
    api_key: str = os.getenv("GEMINI_API_KEY", "")
    model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
    
    # Audio configuration
    sample_rate_in: int = int(os.getenv("SAMPLE_RATE_IN", "16000"))
    sample_rate_out: int = int(os.getenv("SAMPLE_RATE_OUT", "24000"))
    audio_channels: int = int(os.getenv("AUDIO_CHANNELS", "1"))
    
    # Screen capture configuration
    screen_fps: float = float(os.getenv("SCREEN_FPS", "1.0"))
    screen_jpeg_quality: int = int(os.getenv("SCREEN_JPEG_QUALITY", "70"))
    screen_max_width: int = int(os.getenv("SCREEN_MAX_WIDTH", "1280"))
    screen_max_height: int = int(os.getenv("SCREEN_MAX_HEIGHT", "720"))
    snapshot_interval: float = float(os.getenv("SNAPSHOT_INTERVAL", "5.0"))
    
    # Voice setting: Aoede, Charon, Fenrir, Kore, Puck
    voice_name: str = os.getenv("VOICE_NAME", "Puck")
    
    # Memory persistence
    memory_dir: Path = PROJECT_ROOT / os.getenv("MEMORY_DIR", ".memory")

config = Config()

