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

    def print_hud(self, model: str, screen_label: str, interval_sec: float, total_snaps: int):
        """Displays a clean status bar across the top."""
        self.console.print(Rule(title="[bold cyan]⚡ AR ASSISTANT // SOFTWARE TUTOR (SNAPSHOT MODE)[/bold cyan]", style="cyan"))
        
        status_badge = "[bold green]● READY[/bold green]"
        screen_badge = f"[bold cyan]👁️ SCREEN: {screen_label} (Every {interval_sec:g}s)[/bold cyan]"
        snaps_badge = f"[dim white]{total_snaps} snaps[/dim white]"
        speed_badge = "[bold magenta]⚡ <1.5s STREAMING[/bold magenta]"
        
        self.console.print(f"  {status_badge}   │   {screen_badge} ({snaps_badge})   │   {speed_badge}")
        self.console.print(
            "[dim]Commands: [bold yellow]Type question[/bold yellow] | "
            "[bold yellow]v[/bold yellow] Speak into mic | "
            "[bold yellow]s[/bold yellow] Force fresh snap | "
            "[bold yellow]r[/bold yellow] Re-crop area | "
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
