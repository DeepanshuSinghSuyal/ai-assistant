import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

class DayMemoryManager:
    """
    Tracks and persists day-long context, conversations, and software learning topics.
    Ensures the assistant maintains understanding of your world across sessions throughout the day.
    """
    def __init__(self, memory_dir: Path = Path(".memory")):
        self.memory_dir = memory_dir
        self.memory_dir.mkdir(parents=True, exist_ok=True)
        self.today_str = datetime.now().strftime("%Y-%m-%d")
        self.memory_file = self.memory_dir / f"day_{self.today_str}.json"
        
        self.data: Dict[str, Any] = self._load_or_init()
        self.current_session_id = len(self.data["sessions"])
        self.current_session: Dict[str, Any] = {
            "session_id": self.current_session_id,
            "started_at": datetime.now().isoformat(),
            "ended_at": None,
            "turns": [],
            "topics": []
        }
        self.data["sessions"].append(self.current_session)
        self.save()

    def _load_or_init(self) -> Dict[str, Any]:
        if self.memory_file.exists():
            try:
                with open(self.memory_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        
        return {
            "date": self.today_str,
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "daily_summary": "Beginning of the day.",
            "sessions": []
        }

    def save(self):
        """Persists the current state to disk."""
        self.data["last_updated"] = datetime.now().isoformat()
        if self.current_session:
            self.current_session["ended_at"] = datetime.now().isoformat()
        try:
            with open(self.memory_file, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Memory Error] Could not save daily memory: {e}")

    def add_user_turn(self, text: str):
        """Records user's spoken words with timestamp."""
        if not text.strip():
            return
        turn = {
            "role": "user",
            "text": text.strip(),
            "time": datetime.now().strftime("%H:%M:%S")
        }
        self.current_session["turns"].append(turn)
        self.save()

    def add_assistant_turn(self, text: str):
        """Records assistant's spoken words with timestamp."""
        if not text.strip():
            return
        turn = {
            "role": "assistant",
            "text": text.strip(),
            "time": datetime.now().strftime("%H:%M:%S")
        }
        self.current_session["turns"].append(turn)
        self.save()

    def get_tutor_system_prompt(self) -> str:
        """
        Builds the specialized Software Tutor & Co-Pilot system instruction
        combined with today's contextual memory.
        """
        now_time = datetime.now().strftime("%I:%M %p")
        lines = [
            "ROLE & IDENTITY:",
            "You are the user's real-time Software Tutor and interactive Co-Pilot.",
            f"Current local time: {now_time} on {self.today_str}.",
            "You work collaboratively with the Vision Observer Agent, which feeds you visual snapshots of the user's screen in real time as they talk and work.",
            "",
            "TUTORING & COLLABORATION PRINCIPLES:",
            "1. You are helping the user learn and master software (such as Blender, Unreal Engine, VS Code, Photoshop, Premiere, Figma, terminal commands, or new tools).",
            "2. When the user asks a question, refer directly to what is visible on their screen: the active software, toolbars, menus, panels, viewport modes, or code.",
            "3. Provide precise, actionable steps: give exact hotkeys (e.g. 'Press Tab to enter Edit Mode', 'Use Ctrl+Shift+P'), exact button names, and panel locations.",
            "4. KEEP SPOKEN REPLIES CONCISE AND NATURAL (1 to 3 conversational sentences). Do NOT speak in robotic bulleted lists or monologue. Be like a smart mentor sitting right next to them.",
            "5. If you spot an error, an unselected vertex/object, or an incorrect setting in their software, proactively guide them to fix it.",
            "",
            "### CONTEXT OF WHAT THE USER HAS WORKED ON TODAY:"
        ]

        prior_sessions = [s for s in self.data["sessions"] if s["session_id"] < self.current_session_id and s["turns"]]
        
        if not prior_sessions:
            lines.append("This is the first learning session today. Starting fresh.")
        else:
            lines.append(f"Earlier today, the user had {len(prior_sessions)} prior session(s):")
            for idx, s in enumerate(prior_sessions[-3:], start=1):
                started = s.get("started_at", "earlier")
                try:
                    time_part = datetime.fromisoformat(started).strftime("%I:%M %p")
                except Exception:
                    time_part = "earlier"
                
                turns = s.get("turns", [])
                user_msgs = [t["text"] for t in turns if t["role"] == "user"]
                if user_msgs:
                    lines.append(f"- Session at {time_part}: User practiced: {' | '.join(user_msgs[-3:])}")

        return "\n".join(lines)
