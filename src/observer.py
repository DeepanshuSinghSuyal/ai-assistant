import asyncio
import time
from typing import Optional
from PIL import Image

from src.screen import ScreenCaptureEngine

class ScreenSnapper:
    """
    Captures discrete screen snapshots every N seconds (default: 1.0s)
    and keeps the latest frame ready in memory for instant tutor questions.
    Broadcasts real-time snapshot telemetry to the 3D visualizer so the Spatial Eye blinks.
    """
    def __init__(self, screen_engine: ScreenCaptureEngine, interval_sec: float = 1.0, viz_server = None):
        self.screen_engine = screen_engine
        self.interval_sec = interval_sec
        self.viz_server = viz_server
        self.latest_frame: Optional[Image.Image] = None
        self.last_snap_time: float = 0.0
        self.total_snaps_taken: int = 0
        self.running: bool = True
        self.is_paused: bool = False

    def sync_capture(self) -> Image.Image:
        """Captures frame using screen engine."""
        return self.screen_engine.capture_frame_pil()

    async def force_snapshot(self) -> Image.Image:
        """Forces an immediate snapshot right now."""
        frame = await asyncio.to_thread(self.sync_capture)
        self.latest_frame = frame
        self.last_snap_time = time.time()
        self.total_snaps_taken += 1
        if self.viz_server:
            self.viz_server.broadcast_event("snapshot", {
                "count": self.total_snaps_taken,
                "timestamp": self.last_snap_time,
                "forced": True
            })
        return frame

    async def run_loop(self):
        """Background loop: captures a fresh snapshot every interval_sec."""
        # Initial capture on start
        try:
            await self.force_snapshot()
        except Exception:
            pass

        while self.running:
            try:
                await asyncio.sleep(self.interval_sec)
                if not self.running:
                    break

                if not self.is_paused:
                    frame = await asyncio.to_thread(self.sync_capture)
                    self.latest_frame = frame
                    self.last_snap_time = time.time()
                    self.total_snaps_taken += 1
                    if self.viz_server:
                        self.viz_server.broadcast_event("snapshot", {
                            "count": self.total_snaps_taken,
                            "timestamp": self.last_snap_time,
                            "forced": False
                        })

            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(1.0)
