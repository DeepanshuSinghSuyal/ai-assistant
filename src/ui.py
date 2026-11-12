import os
import sys
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.rule import Rule

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

console = Console(legacy_windows=False)

class TerminalUI:
    def __init__(self):
        self.console = console

    def clear_screen(self):
        os.system("cls" if os.name == "nt" else "clear")

    def print_hud(self, model: str, screen_label: str, interval_sec: float, total_snaps: int, persona_name: str = "JARVIS", voice_name: str = "Charon"):
        """Displays a clean status bar across the top."""
        self.console.print(Rule(title="[bold cyan]⚡ AR ASSISTANT // SOFTWARE TUTOR & DESKTOP COMPANION[/bold cyan]", style="cyan"))
        
        status_badge = f"[bold green]● READY[/bold green]"
        persona_badge = f"[bold yellow]🎭 {persona_name} ({voice_name})[/bold yellow]"
        screen_badge = f"[bold cyan]👁️ SCREEN: {screen_label} ({total_snaps} snaps)[/bold cyan]"
        speed_badge = "[bold magenta]⚡ <1.5s STREAMING[/bold magenta]"
        
        self.console.print(f"  {status_badge}   │   {persona_badge}   │   {screen_badge}   │   {speed_badge}")
        self.console.print(
            "[dim]Commands: [bold yellow]Type question[/bold yellow] | "
            "[bold yellow]p[/bold yellow] Switch Persona | "
            "[bold yellow]o[/bold yellow] Overlay Window | "
            "[bold yellow]v[/bold yellow] Speak Mic | "
            "[bold yellow]s[/bold yellow] Fresh Snap | "
            "[bold yellow]r[/bold yellow] Crop | "
            "[bold yellow]q[/bold yellow] Quit[/dim]"
        )
        self.console.print(Rule(style="dim cyan"))

    def start_model_turn(self):
        self.console.print("\n[bold green]TUTOR ›[/bold green] ", end="")
        sys.stdout.flush()

    def print_model_chunk(self, text: str):
        """Streams assistant text directly to the console with zero buffering."""
        if not text:
            return
        sys.stdout.write(text)
        sys.stdout.flush()

    def end_model_turn(self):
        sys.stdout.write("\n\n")
        sys.stdout.flush()

    def print_user_query(self, text: str):
        self.console.print(f"\n[bold magenta]YOU ›[/bold magenta] [white]{text}[/white]")

    def print_notice(self, message: str, style: str = "cyan"):
        self.console.print(f"[{style}]ℹ️  {message}[/{style}]")

    def print_error(self, message: str):
        self.console.print(f"[bold red]❌ Error:[/bold red] {message}")
