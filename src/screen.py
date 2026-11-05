import io
import time
import tkinter as tk
from dataclasses import dataclass
from typing import Optional, Dict, Any, List
import mss
from PIL import Image, ImageGrab

@dataclass
class ScreenRegion:
    left: int
    top: int
    width: int
    height: int
    label: str = "Custom Region"

    def to_mss_dict(self) -> Dict[str, int]:
        return {
            "left": int(self.left),
            "top": int(self.top),
            "width": int(self.width),
            "height": int(self.height)
        }

class RegionSelectorGUI:
    """A lightweight transparent fullscreen overlay to crop/snip a region with mouse drag."""
    def __init__(self):
        self.root = tk.Tk()
        self.root.attributes("-alpha", 0.35)
        self.root.attributes("-fullscreen", True)
        self.root.attributes("-topmost", True)
        self.root.config(bg="#11111b", cursor="crosshair")

        self.canvas = tk.Canvas(self.root, cursor="crosshair", bg="#11111b", highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)

        self.start_x = None
        self.start_y = None
        self.cur_x = None
        self.cur_y = None
        self.rect_id = None
        self.text_id = None
        self.selected_region: Optional[ScreenRegion] = None

        # Banner text
        sw = self.root.winfo_screenwidth()
        self.canvas.create_text(
            sw // 2, 40,
            text="[ DRAG TO CROP SCREEN AREA ]  •  Press ENTER to confirm  •  ESC to cancel",
            fill="#00ffcc",
            font=("Consolas", 14, "bold")
        )

        self.canvas.bind("<ButtonPress-1>", self.on_press)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)
        self.root.bind("<Return>", self.on_confirm)
        self.root.bind("<Escape>", self.on_cancel)

    def on_press(self, event):
        self.start_x = event.x
        self.start_y = event.y
        if self.rect_id:
            self.canvas.delete(self.rect_id)
        if self.text_id:
            self.canvas.delete(self.text_id)
        self.rect_id = self.canvas.create_rectangle(
            self.start_x, self.start_y, self.start_x, self.start_y,
            outline="#00ffcc", width=2, fill="#00ffff", stipple="gray25"
        )
        self.text_id = self.canvas.create_text(
            self.start_x, self.start_y - 15,
            text="", fill="#00ffcc", font=("Consolas", 11, "bold")
        )

    def on_drag(self, event):
        self.cur_x = event.x
        self.cur_y = event.y
        if self.rect_id:
            self.canvas.coords(self.rect_id, self.start_x, self.start_y, self.cur_x, self.cur_y)
        
        # Update resolution tag
        w = abs(self.cur_x - self.start_x)
        h = abs(self.cur_y - self.start_y)
        if self.text_id:
            mid_x = (self.start_x + self.cur_x) // 2
            top_y = min(self.start_y, self.cur_y) - 15
            self.canvas.coords(self.text_id, mid_x, top_y)
            self.canvas.itemconfig(self.text_id, text=f"{w} x {h} px")

    def on_release(self, event):
        self.cur_x = event.x
        self.cur_y = event.y
        x1 = min(self.start_x, self.cur_x)
        y1 = min(self.start_y, self.cur_y)
        x2 = max(self.start_x, self.cur_x)
        y2 = max(self.start_y, self.cur_y)
        w = x2 - x1
        h = y2 - y1

        if w > 20 and h > 20:
            self.selected_region = ScreenRegion(left=x1, top=y1, width=w, height=h, label=f"Region {w}x{h}")
            self.root.after(150, self.root.destroy)

    def on_confirm(self, event=None):
        self.root.destroy()

    def on_cancel(self, event=None):
        self.selected_region = None
        self.root.destroy()

    def get_selection(self) -> Optional[ScreenRegion]:
        self.root.mainloop()
        return self.selected_region


class ScreenCaptureEngine:
    """Manages high-performance desktop frame grabs using MSS with ImageGrab fallback."""
    def __init__(self, target_region: Optional[ScreenRegion] = None, max_w: int = 1280, max_h: int = 720, jpeg_quality: int = 70):
        self._sct = mss.MSS()
        self.region = target_region
        self.max_w = max_w
        self.max_h = max_h
        self.jpeg_quality = jpeg_quality
        self.monitors = self.get_monitors()
        self.current_monitor_idx = 1

    @staticmethod
    def get_monitors() -> List[Dict[str, Any]]:
        """Returns detected monitors, skipping virtual combined bounding box (index 0)."""
        with mss.MSS() as sct:
            monitors = []
            for i, m in enumerate(sct.monitors[1:], start=1):
                monitors.append({
                    "index": i,
                    "left": m["left"],
                    "top": m["top"],
                    "width": m["width"],
                    "height": m["height"],
                    "is_primary": m.get("is_primary", (i == 1)),
                    "name": m.get("name", f"Display {i}")
                })
            return monitors

    def set_region(self, region: Optional[ScreenRegion]):
        self.region = region

    def cycle_monitor(self) -> str:
        """Cycles to next connected monitor and clears custom region."""
        if not self.monitors:
            self.monitors = self.get_monitors()
        
        num_mons = len(self.monitors)
        if num_mons > 0:
            self.current_monitor_idx = (self.current_monitor_idx % num_mons) + 1
            self.region = None
            cur_m = self.monitors[self.current_monitor_idx - 1]
            return f"Display {cur_m['index']} ({cur_m['width']}x{cur_m['height']})"
        return "Display 1"

    def get_status_label(self) -> str:
        if self.region:
            return f"Region {self.region.width}x{self.region.height}"
        return f"Display {self.current_monitor_idx}"

    def capture_frame_pil(self) -> Image.Image:
        """Captures frame from specified monitor or region and returns PIL Image."""
        if self.region:
            monitor_bbox = self.region.to_mss_dict()
        else:
            idx = min(self.current_monitor_idx, len(self._sct.monitors) - 1)
            monitor_bbox = self._sct.monitors[idx]

        try:
            sct_img = self._sct.grab(monitor_bbox)
            img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
        except Exception:
            # Fallback to ImageGrab on Windows if BitBlt fails during heavy GPU init
            bbox_tuple = (
                monitor_bbox["left"],
                monitor_bbox["top"],
                monitor_bbox["left"] + monitor_bbox["width"],
                monitor_bbox["top"] + monitor_bbox["height"],
            )
            img = ImageGrab.grab(bbox=bbox_tuple)

        orig_w, orig_h = img.size
        if orig_w > self.max_w or orig_h > self.max_h:
            ratio = min(self.max_w / orig_w, self.max_h / orig_h)
            new_size = (int(orig_w * ratio), int(orig_h * ratio))
            img = img.resize(new_size, Image.Resampling.BILINEAR)

        return img

    def capture_frame_jpeg(self) -> bytes:
        """Captures frame and returns JPEG bytes."""
        img = self.capture_frame_pil()
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=self.jpeg_quality, optimize=True)
        return output.getvalue()
