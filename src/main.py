import asyncio
import os
import sys
import threading
from pathlib import Path
from typing import Optional

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import numpy as np
import sounddevice as sd
from google import genai
from google.genai import types

from src.config import config
from src.screen import ScreenCaptureEngine, RegionSelectorGUI, ScreenRegion
from src.observer import ScreenSnapper
from src.audio import AudioVoiceRecorder
from src.memory import DayMemoryManager
from src.server import VisualizerTelemetryServer
from src.personas import PERSONAS, DEFAULT_PERSONA, get_persona, list_personas
from src.desktop_overlay import launch_overlay_thread
from src.ui import TerminalUI

ui = TerminalUI()

class AudioPlayer:
    """Manages 24kHz speaker output stream for Gemini Live's native voice."""
    def __init__(self, samplerate: int = 24000):
        self.samplerate = samplerate
        self.stream: Optional[sd.OutputStream] = None

    def start(self):
        try:
            self.stream = sd.OutputStream(
                samplerate=self.samplerate,
                channels=1,
                dtype='int16'
            )
            self.stream.start()
        except Exception as e:
            ui.print_notice(f"Audio output init warning: {e}", style="yellow")

    def play_chunk(self, pcm_bytes: bytes):
        if self.stream and pcm_bytes:
            try:
                arr = np.frombuffer(pcm_bytes, dtype=np.int16)
                self.stream.write(arr)
            except Exception:
                pass

    def stop(self):
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass


class GeminiLiveTutorAssistant:
    def __init__(self, api_key: str, model_name: str, target_region: Optional[ScreenRegion], initial_persona: str = DEFAULT_PERSONA):
        self.api_key = api_key
        self.model_name = model_name
        self.current_persona_key = initial_persona if initial_persona in PERSONAS else DEFAULT_PERSONA
        
        self.client = genai.Client(api_key=self.api_key)
        self.action_queue: asyncio.Queue = asyncio.Queue()
        self.viz_server = VisualizerTelemetryServer(
            http_port=8765,
            ws_port=8766,
            on_client_message=self._handle_client_message
        )
        self.screen_engine = ScreenCaptureEngine(
            target_region=target_region,
            max_w=config.screen_max_width,
            max_h=config.screen_max_height,
            jpeg_quality=config.screen_jpeg_quality
        )
        self.snapper = ScreenSnapper(
            screen_engine=self.screen_engine,
            interval_sec=config.snapshot_interval,
            viz_server=self.viz_server
        )
        self.audio_player = AudioPlayer(samplerate=config.sample_rate_out)
        self.memory = DayMemoryManager(memory_dir=config.memory_dir)
        self.running = True
        self.reconnect_needed = False

    async def _handle_client_message(self, payload: dict):
        """Dispatches incoming telemetry websocket messages into the async action queue."""
        msg_type = payload.get("type")
        data = payload.get("data") or {}
        if msg_type:
            await self.action_queue.put({"type": msg_type, "data": data, "source": "ws"})

    async def _terminal_input_reader(self):
        """Reads non-blocking terminal input in background worker thread."""
        while self.running:
            try:
                line = await asyncio.to_thread(input, "\n[YOU] > ")
                if line is not None:
                    await self.action_queue.put({
                        "type": "terminal_input",
                        "data": {"text": line.strip()},
                        "source": "terminal"
                    })
            except (EOFError, KeyboardInterrupt):
                await self.action_queue.put({"type": "quit", "data": {}, "source": "terminal"})
                break
            except Exception:
                break

    def refresh_hud(self):
        ui.clear_screen()
        persona = get_persona(self.current_persona_key)
        ui.print_hud(
            model=self.model_name,
            screen_label=self.screen_engine.get_status_label(),
            interval_sec=self.snapper.interval_sec,
            total_snaps=self.snapper.total_snaps_taken,
            persona_name=persona.name,
            voice_name=persona.voice
        )

    async def _handle_recrop(self):
        ui.print_notice("Opening crop overlay... Click & drag over your software window.", style="yellow")
        
        def open_gui():
            selector = RegionSelectorGUI()
            return selector.get_selection()

        try:
            new_region = await asyncio.to_thread(open_gui)
            if new_region:
                self.screen_engine.set_region(new_region)
                await self.snapper.force_snapshot()
                self.viz_server.broadcast_event("snapshot", {"label": self.screen_engine.get_status_label()})
                ui.print_notice(f"✓ Target area locked: {new_region.width}x{new_region.height}", style="bold green")
            else:
                ui.print_notice("Crop cancelled. Keeping previous screen area.", style="dim")
        except Exception as e:
            ui.print_error(f"Could not crop area: {e}")

    async def _process_model_turn(self, session, prompt_label: str):
        """Streams Gemini Live's audio and transcript tokens."""
        ui.start_model_turn()
        transcript_chunks = []

        async for response in session.receive():
            server_content = response.server_content
            if not server_content:
                continue

            # Real-time native voice playback via sounddevice
            if server_content.model_turn and server_content.model_turn.parts:
                for part in server_content.model_turn.parts:
                    if part.inline_data and part.inline_data.data:
                        self.audio_player.play_chunk(part.inline_data.data)

            # Synchronous subtitle transcript streaming
            if server_content.output_transcription and server_content.output_transcription.text:
                text_piece = server_content.output_transcription.text
                ui.print_model_chunk(text_piece)
                transcript_chunks.append(text_piece)
                self.viz_server.broadcast_event("output_chunk", {"text": text_piece})

            if server_content.turn_complete:
                ui.end_model_turn()
                full_reply = "".join(transcript_chunks).strip()
                self.memory.add_user_turn(prompt_label)
                if full_reply:
                    self.memory.add_assistant_turn(full_reply)
                    self.viz_server.broadcast_event("turn_complete", {"full_text": full_reply})
                break

    async def _handle_mic_turn(self, session):
        """Records voice clip and sends it with active screen frame."""
        ui.print_notice("🎙️ Recording audio (speak now for 4 seconds)...", style="bold green")
        self.viz_server.broadcast_event("recording_start", {"duration": 4.0})
        recorder = AudioVoiceRecorder(sample_rate=config.sample_rate_in, channels=config.audio_channels)
        audio_clip = await recorder.record_clip(4.0)
        self.viz_server.broadcast_event("recording_end", {})

        if not audio_clip:
            ui.print_notice("No audible sound detected.", style="yellow")
            return

        prompt_label = "🎙️ [Spoken Microphone Audio]"
        self.viz_server.broadcast_event("query", {"text": prompt_label})
        self.viz_server.broadcast_event("processing", {"prompt": prompt_label})

        jpeg_bytes = self.screen_engine.capture_frame_jpeg()
        video_blob = types.Blob(data=jpeg_bytes, mime_type="image/jpeg")
        audio_blob = types.Blob(data=audio_clip, mime_type="audio/wav")

        await session.send_realtime_input(video=video_blob)
        await asyncio.sleep(0.12)
        await session.send_realtime_input(media_chunks=[audio_blob])
        await self._process_model_turn(session, prompt_label)

    async def _handle_text_turn(self, session, text: str):
        """Sends text prompt combined with fresh screen frame."""
        self.viz_server.broadcast_event("query", {"text": text})
        self.viz_server.broadcast_event("processing", {"prompt": text})

        jpeg_bytes = self.screen_engine.capture_frame_jpeg()
        video_blob = types.Blob(data=jpeg_bytes, mime_type="image/jpeg")

        await session.send_realtime_input(video=video_blob)
        await asyncio.sleep(0.12)
        await session.send_realtime_input(text=text)
        await self._process_model_turn(session, text)

    async def run(self):
        loop = asyncio.get_running_loop()
        self.audio_player.start()
        
        # 1. Start 3D Architecture Visualizer & Auto-Launch in Browser
        viz_url = self.viz_server.start(loop, auto_open=True)
        snapper_task = asyncio.create_task(self.snapper.run_loop())
        input_task = asyncio.create_task(self._terminal_input_reader())

        self.refresh_hud()
        ui.print_notice(f"🌐 3D Architecture Visualizer: [bold white underline]{viz_url}[/bold white underline]", style="bold cyan")
        ui.print_notice(f"🦊 Roamies Desktop Companion: [bold white underline]{viz_url}/desktop.html[/bold white underline]", style="bold cyan")

        while self.running:
            persona = get_persona(self.current_persona_key)
            tutor_instruction = self.memory.get_tutor_system_prompt(self.current_persona_key)
            live_config = types.LiveConnectConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=persona.voice
                        )
                    )
                ),
                system_instruction=types.Content(
                    parts=[types.Part.from_text(text=tutor_instruction)]
                ),
                output_audio_transcription=types.AudioTranscriptionConfig()
            )

            # Broadcast active persona to visualizer and companion
            self.viz_server.broadcast_event("persona_change", {
                "key": persona.key,
                "name": persona.name,
                "voice": persona.voice,
                "look": persona.look,
                "title": persona.title
            })

            ui.print_notice(f"Connecting to Gemini Live as [bold white]{persona.name}[/bold white] (Voice: {persona.voice})...", style="dim cyan")

            try:
                async with self.client.aio.live.connect(model=self.model_name, config=live_config) as session:
                    self.reconnect_needed = False
                    self.refresh_hud()
                    ui.print_notice(f"⚡ Connected! Active Persona: [bold yellow]{persona.name}[/bold yellow] ({persona.voice} Voice) | Speak or type your question.\n", style="bold green")

                    while self.running and not self.reconnect_needed:
                        action = await self.action_queue.get()
                        action_type = action.get("type")
                        data = action.get("data", {})

                        if action_type in ["quit", "exit"]:
                            ui.print_notice("Saving session memory and exiting...", style="yellow")
                            self.running = False
                            break

                        elif action_type == "switch_persona":
                            target = (data.get("persona") or data.get("key") or "").lower().strip()
                            if target in PERSONAS and target != self.current_persona_key:
                                self.current_persona_key = target
                                new_p = get_persona(self.current_persona_key)
                                ui.print_notice(f"🎭 Switched to {new_p.name} ({new_p.voice} Voice). Reconnecting Live Session...", style="bold yellow")
                                self.reconnect_needed = True
                                break
                            continue

                        elif action_type == "circle_crop":
                            bbox = data.get("bbox", [])
                            if len(bbox) == 4:
                                x, y, w, h = bbox
                                crop_bytes = self.screen_engine.capture_rect_jpeg(x, y, w, h)
                                prompt_text = (
                                    "The user circled this specific UI element or button on screen with their mouse. "
                                    "Inspect this circled region closely and provide direct, actionable guidance on what it does or how to use it."
                                )
                                prompt_label = f"⭕ [Circled Area {w}x{h} at {x},{y}]"
                                ui.print_notice(f"⭕ Circled area received: {w}x{h} at ({x}, {y})", style="bold cyan")
                                self.viz_server.broadcast_event("query", {"text": prompt_label})
                                self.viz_server.broadcast_event("processing", {"prompt": prompt_label})

                                video_blob = types.Blob(data=crop_bytes, mime_type="image/jpeg")
                                await session.send_realtime_input(video=video_blob)
                                await asyncio.sleep(0.12)
                                await session.send_realtime_input(text=prompt_text)
                                await self._process_model_turn(session, prompt_label)
                            continue

                        elif action_type == "terminal_input":
                            user_input = data.get("text", "").strip()
                            if not user_input:
                                continue

                            cmd = user_input.lower()

                            if cmd in ["q", "/q", "quit", "exit"]:
                                ui.print_notice("Saving session memory and exiting...", style="yellow")
                                self.running = False
                                break

                            elif cmd in ["s", "/s", "snap"]:
                                await self.snapper.force_snapshot()
                                ui.print_notice("📸 Fresh screen snapshot captured & sent to 3D view!", style="bold cyan")
                                continue

                            elif cmd in ["r", "/r", "crop"]:
                                await self._handle_recrop()
                                continue

                            elif cmd in ["d", "/d", "display", "monitor"]:
                                new_lbl = self.screen_engine.cycle_monitor()
                                await self.snapper.force_snapshot()
                                ui.print_notice(f"🖥️  Switched to {new_lbl}", style="bold cyan")
                                continue

                            elif cmd in ["c", "/c", "clear"]:
                                self.refresh_hud()
                                continue

                            elif cmd in ["o", "/o", "overlay"]:
                                ui.print_notice("Launching Roamies floating desktop overlay...", style="bold cyan")
                                launch_overlay_thread(f"{viz_url}/desktop.html")
                                continue

                            elif cmd.startswith("p") or cmd.startswith("/p") or cmd.startswith("/persona"):
                                parts = user_input.split()
                                if len(parts) > 1 and parts[1].lower() in PERSONAS:
                                    self.current_persona_key = parts[1].lower()
                                else:
                                    # Cycle to next persona
                                    keys = list(PERSONAS.keys())
                                    idx = keys.index(self.current_persona_key) if self.current_persona_key in keys else 0
                                    self.current_persona_key = keys[(idx + 1) % len(keys)]
                                
                                new_p = get_persona(self.current_persona_key)
                                ui.print_notice(f"🎭 Switched persona to: {new_p.name} ({new_p.voice} Voice)", style="bold yellow")
                                self.reconnect_needed = True
                                break

                            elif cmd in ["v", "/v", "voice", "mic"]:
                                await self._handle_mic_turn(session)
                                continue

                            else:
                                await self._handle_text_turn(session, user_input)
                                continue

                        elif action_type == "web_query":
                            query_text = data.get("text", "").strip()
                            if query_text:
                                ui.print_notice(f"🌐 Query from companion: {query_text}", style="bold cyan")
                                await self._handle_text_turn(session, query_text)
                            continue

                        elif action_type == "recording_start":
                            await self._handle_mic_turn(session)
                            continue

            except (KeyboardInterrupt, EOFError):
                ui.print_notice("\nSession ended by user (Ctrl+C).", style="yellow")
                self.running = False
                break
            except Exception as e:
                if not self.running:
                    break
                if not self.reconnect_needed:
                    ui.print_notice(f"Connection reset ({e}). Re-establishing Gemini Live in 1s...", style="bold yellow")
                    await asyncio.sleep(1.0)

        # Cleanup
        self.snapper.running = False
        snapper_task.cancel()
        input_task.cancel()
        await asyncio.gather(snapper_task, input_task, return_exceptions=True)
        self.audio_player.stop()
        self.viz_server.stop()
        self.memory.save()
        ui.print_notice("✓ Learning session saved to memory. Keep practicing!\n", style="bold green")


def prompt_screen_mode():
    monitors = ScreenCaptureEngine.get_monitors()
    
    ui.console.print("\n[bold cyan]Select Software Learning View:[/bold cyan]")
    choice_map = {}
    idx = 1
    for m in monitors:
        primary_tag = " (Primary)" if m["is_primary"] else ""
        ui.console.print(f"  [bold green][{idx}][/bold green] Display {m['index']}: {m['width']}x{m['height']}{primary_tag}")
        choice_map[str(idx)] = ("monitor", m)
        idx += 1

    partial_idx = idx
    ui.console.print(f"  [bold green][{partial_idx}][/bold green] Crop Software Window (Drag box over any application)")
    choice_map[str(partial_idx)] = ("partial", None)

    choice = input(f"\nEnter choice [1-{partial_idx}] (default 1): ").strip()
    if not choice or choice not in choice_map:
        choice = "1"

    action, data = choice_map[choice]

    if action == "partial":
        ui.console.print("\n[cyan]Opening transparent crop tool... Click and drag a box over your software.[/cyan]")
        selector = RegionSelectorGUI()
        selected = selector.get_selection()
        if selected:
            ui.console.print(f"[green]✓ Target locked: {selected.width}x{selected.height} at ({selected.left}, {selected.top})[/green]\n")
            return selected
        else:
            ui.console.print("[yellow]No region selected. Defaulting to Display 1.[/yellow]\n")
            return None
    else:
        m = data
        if m.get("is_primary"):
            return None
        return ScreenRegion(left=m["left"], top=m["top"], width=m["width"], height=m["height"], label=f"Display {m['index']}")


def check_api_key() -> str:
    api_key = config.api_key.strip()
    if not api_key:
        ui.console.print("\n[bold yellow]⚠️  GEMINI_API_KEY is not set.[/bold yellow]")
        api_key = input("Enter your Gemini API Key: ").strip()
        if api_key:
            env_file = config.project_root / ".env"
            try:
                with open(env_file, "a", encoding="utf-8") as f:
                    f.write(f"\nGEMINI_API_KEY={api_key}\n")
                ui.console.print("[green]✓ Saved API key to .env for future sessions.[/green]\n")
            except Exception:
                pass
        else:
            ui.print_error("Cannot start assistant without an API key.")
            sys.exit(1)
    return api_key


def main():
    api_key = check_api_key()
    
    model_name = config.model
    initial_persona = DEFAULT_PERSONA
    auto_overlay = False

    # CLI arguments parser
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        arg = args[i]
        if arg == "--overlay":
            auto_overlay = True
        elif arg in ["--persona", "-p"] and i + 1 < len(args):
            initial_persona = args[i + 1].lower()
            i += 1
        elif not arg.startswith("-"):
            model_name = arg
        i += 1

    target_region = prompt_screen_mode()

    if auto_overlay:
        launch_overlay_thread("http://localhost:8765/desktop.html")

    assistant = GeminiLiveTutorAssistant(
        api_key=api_key,
        model_name=model_name,
        target_region=target_region,
        initial_persona=initial_persona
    )

    try:
        asyncio.run(assistant.run())
    except KeyboardInterrupt:
        ui.print_notice("Learning session ended (Ctrl+C). Memory saved.", style="bold green")

if __name__ == "__main__":
    main()
