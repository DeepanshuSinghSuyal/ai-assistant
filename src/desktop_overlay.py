"""
AR ASSISTANT // DESKTOP OVERLAY RUNNER
Launches a transparent, frameless, always-on-top desktop companion window
powered by pywebview and KenKaiii/Roamies.
"""

import sys
import threading
import time

def run_desktop_overlay(url: str = "http://localhost:8765/desktop.html"):
    """Launches the floating transparent desktop companion."""
    try:
        import webview
    except ImportError:
        print("[!] pywebview is not installed. Run: uv pip install pywebview")
        return

    # Screen dimensions for placing in bottom-right corner
    window = webview.create_window(
        title="AR Companion",
        url=url,
        width=520,
        height=480,
        frameless=True,
        easy_drag=True,
        on_top=True,
        transparent=True,
        background_color='#00000000'
    )
    webview.start()

def launch_overlay_thread(url: str = "http://localhost:8765/desktop.html"):
    """Starts overlay in a dedicated daemon thread."""
    t = threading.Thread(target=run_desktop_overlay, args=(url,), daemon=True)
    t.start()
    return t

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/desktop.html"
    run_desktop_overlay(url)
