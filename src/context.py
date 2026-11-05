import asyncio
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

@dataclass
class SharedWorldContext:
    """
    Central blackboard shared between the Vision Observer Agent and the Tutor Agent.
    Coordinates speech-gated visual inspection, change detection, and screen state.
    """
    active_software: str = "Unknown"
    screen_summary: str = "Assistant initializing..."
    screen_label: str = "Display 1"
    
    # Visual change tracking
    last_frame_sent_time: float = 0.0
    last_diff_score: float = 0.0
    total_frames_sent: int = 0
    
    # State flags
    is_user_speaking: bool = False
    video_paused: bool = False
    
    # Async events for cross-agent signaling
    speech_detected_event: asyncio.Event = field(default_factory=asyncio.Event)
    force_snapshot_event: asyncio.Event = field(default_factory=asyncio.Event)
    
    def on_speech_started(self):
        """Called by AudioEngine when user voice energy is detected."""
        self.is_user_speaking = True
        self.speech_detected_event.set()

    def on_speech_ended(self):
        self.is_user_speaking = False

    def trigger_force_snapshot(self):
        """Called when user presses [S] to force immediate visual inspection."""
        self.force_snapshot_event.set()

    def record_frame_sent(self):
        self.last_frame_sent_time = time.time()
        self.total_frames_sent += 1

