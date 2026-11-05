import os
import sys
import json
import asyncio
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Set

import websockets

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

class CustomHTTPHandler(SimpleHTTPRequestHandler):
    """Serves files from the web/ directory with proper MIME types."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def log_message(self, format, *args):
        # Silence standard HTTP access logs in terminal
        pass


class VisualizerTelemetryServer:
    """
    Spins up a local HTTP server for the 3D visualization and an event
    WebSocket for real-time telemetry animation.
    """
    def __init__(self, http_port: int = 8765, ws_port: int = 8766):
        self.http_port = http_port
        self.ws_port = ws_port
        self.http_server: HTTPServer = None
        self.http_thread: threading.Thread = None
        self.ws_clients: Set = set()
        self.running = False
        self._loop: asyncio.AbstractEventLoop = None

    def _run_http(self):
        try:
            self.http_server = HTTPServer(("127.0.0.1", self.http_port), CustomHTTPHandler)
            self.http_server.serve_forever()
        except Exception:
            pass

    async def _ws_handler(self, websocket):
        self.ws_clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            self.ws_clients.discard(websocket)

    def broadcast_event(self, event_type: str, data: dict = None):
        """Broadcasts event to 3D visualizer clients (e.g. snapshot, query, response)."""
        if not self.ws_clients:
            return
        payload = json.dumps({"type": event_type, "data": data or {}})
        for ws in list(self.ws_clients):
            try:
                if self._loop and not self._loop.is_closed():
                    asyncio.run_coroutine_threadsafe(ws.send(payload), self._loop)
            except Exception:
                pass

    def start(self, loop: asyncio.AbstractEventLoop, auto_open: bool = True) -> str:
        self._loop = loop
        self.running = True

        # 1. Start HTTP Server in background thread
        self.http_thread = threading.Thread(target=self._run_http, daemon=True)
        self.http_thread.start()

        # 2. Start WebSocket telemetry server in asyncio loop
        try:
            ws_server_coro = websockets.serve(self._ws_handler, "127.0.0.1", self.ws_port)
            loop.create_task(ws_server_coro)
        except Exception:
            pass

        url = f"http://localhost:{self.http_port}"
        
        # 3. Automatically open browser
        if auto_open:
            threading.Timer(0.6, lambda: webbrowser.open(url)).start()

        return url

    def stop(self):
        self.running = False
        if self.http_server:
            try:
                self.http_server.shutdown()
                self.http_server.server_close()
            except Exception:
                pass

