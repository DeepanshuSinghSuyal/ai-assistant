import asyncio
import os
import sys

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from pathlib import Path
from typing import Optional
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
from src.ui import TerminalUI

ui = TerminalUI()

class AudioPlayer:
    """Manages 24kHz speaker output stream for Gemini Live's native voice."""
    def __init__(self, samplerate: int = 24000):
        self.samplerate = samplerate
        self.stream: Optional[sd.OutputStream] = None

    def start(self):
        self.stream = sd.OutputStream(
            samplerate=self.samplerate,
            channels=1,
            dtype='int16'
        )
        self.stream.start()

    def play_chunk(self, pcm_bytes: bytes):
        if self.stream and pcm_bytes:
            arr = np.frombuffer(pcm_bytes, dtype=np.int16)
            self.stream.write(arr)

    def stop(self):
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass


class GeminiLiveTutorAssistant:
    def __init__(self, api_key: str, model_name: str, target_region: Optional[ScreenRegion]):
        self.api_key = api_key
        self.model_name = model_name
        
        self.client = genai.Client(api_key=self.api_key)
        self.viz_server = VisualizerTelemetryServer(http_port=8765, ws_port=8766)
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

    def refresh_hud(self):
        ui.clear_screen()
        ui.print_hud(
            model=self.model_name,
            screen_label=self.screen_engine.get_status_label(),
            interval_sec=self.snapper.interval_sec,
            total_snaps=self.snapper.total_snaps_taken
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

    async def run(self):
        loop = asyncio.get_running_loop()
        self.audio_player.start()
        
        # 1. Start 3D Architecture Visualizer & Auto-Launch in Browser
        viz_url = self.viz_server.start(loop, auto_open=True)

        snapper_task = asyncio.create_task(self.snapper.run_loop())

        tutor_instruction = self.memory.get_tutor_system_prompt()
        live_config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=config.voice_name
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part.from_text(text=tutor_instruction)]
            ),
            output_audio_transcription=types.AudioTranscriptionConfig()
        )

        self.refresh_hud()
        ui.print_notice(f"🌐 3D Architecture Visualizer: [bold white underline]{viz_url}[/bold white underline] (Opened in browser)", style="bold cyan")
        ui.print_notice(f"Connecting to Gemini Live ({self.model_name})...", style="dim cyan")

        while self.running:
            try:
                async with self.client.aio.live.connect(model=self.model_name, config=live_config) as session:
                    ui.print_notice("⚡ Connected to Gemini Live! Speak or type your question.\n", style="bold green")

                    while self.running:
                        # Wait for user input (typed directly or dictated via microphone)
                        user_input = await asyncio.to_thread(input, "\n[YOU] > ")
                        user_input = user_input.strip()

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
                            ui.print_notice(f"🌐 3D Architecture Visualizer: [bold white underline]{viz_url}[/bold white underline]", style="bold cyan")
                            continue

                        # Check for microphone voice recording
                        if cmd in ["v", "/v", "voice", "mic"]:
                            ui.print_notice("🎙️ Recording audio (speak now for 4 seconds)...", style="bold green")
                            self.viz_server.broadcast_event("recording_start", {"duration": 4.0})
                            recorder = AudioVoiceRecorder(sample_rate=config.sample_rate_in, channels=config.audio_channels)
                            audio_clip = await recorder.record_clip(4.0)
                            self.viz_server.broadcast_event("recording_end", {})

                            if not audio_clip:
                                ui.print_notice("No audible sound detected.", style="yellow")
                                continue

                            prompt_label = "🎙️ [Spoken Microphone Audio]"
                            self.viz_server.broadcast_event("query", {"text": prompt_label})
                            self.viz_server.broadcast_event("processing", {"prompt": prompt_label})

                            jpeg_bytes = self.screen_engine.capture_frame_jpeg()
                            video_blob = types.Blob(data=jpeg_bytes, mime_type="image/jpeg")
                            audio_blob = types.Blob(data=audio_clip, mime_type="audio/wav")

                            await session.send_realtime_input(video=video_blob)
                            await asyncio.sleep(0.15)
                            await session.send_realtime_input(media_chunks=[audio_blob])
                        else:
                            # 1. Broadcast user query and transition 3D core into processing
                            self.viz_server.broadcast_event("query", {"text": user_input})
                            self.viz_server.broadcast_event("processing", {"prompt": user_input})

                            # 2. Grab fresh screen frame
                            jpeg_bytes = self.screen_engine.capture_frame_jpeg()
                            video_blob = types.Blob(data=jpeg_bytes, mime_type="image/jpeg")

                            # 3. Send screen frame + user question into Gemini Live
                            await session.send_realtime_input(video=video_blob)
                            await asyncio.sleep(0.15)
                            await session.send_realtime_input(text=user_input)

                        # 4. Receive Gemini Live's native voice + streaming transcript
                        ui.start_model_turn()
                        transcript_chunks = []

                        async for response in session.receive():
                            server_content = response.server_content
                            if not server_content:
                                continue

                            # Play native voice audio chunks through speakers in real time
                            if server_content.model_turn and server_content.model_turn.parts:
                                for part in server_content.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        self.audio_player.play_chunk(part.inline_data.data)

                            # Print spoken transcript to terminal simultaneously & stream to 3D visualizer
                            if server_content.output_transcription and server_content.output_transcription.text:
                                text_piece = server_content.output_transcription.text
                                ui.print_model_chunk(text_piece)
                                transcript_chunks.append(text_piece)
                                self.viz_server.broadcast_event("output_chunk", {"text": text_piece})

                            if server_content.turn_complete:
                                ui.end_model_turn()
                                full_reply = "".join(transcript_chunks).strip()
                                self.memory.add_user_turn(user_input)
                                if full_reply:
                                    self.memory.add_assistant_turn(full_reply)
                                    self.viz_server.broadcast_event("turn_complete", {"full_text": full_reply})
                                break

            except (KeyboardInterrupt, EOFError):
                ui.print_notice("\nSession ended by user (Ctrl+C).", style="yellow")
                self.running = False
                break
            except Exception as e:
                if not self.running:
                    break
                ui.print_notice(f"Connection reset ({e}). Re-establishing Gemini Live in 1s...", style="bold yellow")
                await asyncio.sleep(1.0)

        # Cleanup
        self.snapper.running = False
        snapper_task.cancel()
        await asyncio.gather(snapper_task, return_exceptions=True)
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
    if len(sys.argv) > 1 and sys.argv[1].strip():
        model_name = sys.argv[1].strip()

    target_region = prompt_screen_mode()

    assistant = GeminiLiveTutorAssistant(
        api_key=api_key,
        model_name=model_name,
        target_region=target_region
    )

    try:
        asyncio.run(assistant.run())
    except KeyboardInterrupt:
        ui.print_notice("Learning session ended (Ctrl+C). Memory saved.", style="bold green")

if __name__ == "__main__":
    main()
