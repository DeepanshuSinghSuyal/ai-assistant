/**
 * AR ASSISTANT // ROAMIES DESKTOP COMPANION BRIDGE
 * Integrates KenKaiii/Roamies animations, circle gestures, and personas with Gemini Live.
 */

(() => {
  const R = window.Roamie;
  if (!R) return;

  // Persona definitions mapping to Gemini Live Voice Models
  const PERSONAS = {
    jarvis: { look: "jarvis", name: "JARVIS", voice: "Charon", icon: "⚡" },
    roamie: { look: "classic", name: "Roamie", voice: "Puck", icon: "🦊" },
    luna:   { look: "anime",   name: "Luna",   voice: "Kore",  icon: "🌸" },
    sarah:  { look: "sarah",   name: "Sarah",  voice: "Aoede", icon: "💎" },
    adrian: { look: "adrian",  name: "Adrian", voice: "Fenrir", icon: "⚔️" }
  };

  let currentPersonaKey = "jarvis";
  let activeSocket = null;
  let isCirclingActive = false;
  let circlePoints = [];
  let isRecording = false;

  // -------------------------------------------------------------
  // 1. WEBSOCKET TELEMETRY CONNECTION
  // -------------------------------------------------------------
  function connectWebSocket() {
    try {
      const wsUrl = window.location.port === "8765"
        ? "ws://" + window.location.hostname + ":8766"
        : "ws://127.0.0.1:8766";
      const ws = new WebSocket(wsUrl);
      activeSocket = ws;

      ws.onopen = () => {
        console.log("[Roamies Bridge] Connected to Gemini Live telemetry!");
        updateHudStatus("LIVE LINKED");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleAssistantEvent(payload.type, payload.data || {});
        } catch (e) {}
      };

      ws.onerror = () => {
        updateHudStatus("STANDALONE");
      };

      ws.onclose = () => {
        setTimeout(connectWebSocket, 2000);
      };
    } catch (e) {
      setTimeout(connectWebSocket, 2000);
    }
  }

  function sendWebSocket(type, data) {
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(JSON.stringify({ type, data }));
    }
  }

  // -------------------------------------------------------------
  // 2. ASSISTANT EVENT DISPATCHER
  // -------------------------------------------------------------
  function handleAssistantEvent(eventType, data) {
    const creature = getActiveCreature();

    if (eventType === "recording_start") {
      setCompanionMode("listen", 0.8);
      showSpeechBubble("Listening...");
    } else if (eventType === "recording_end") {
      setCompanionMode("idle");
    } else if (eventType === "snapshot") {
      if (creature?.face) creature.face.set("wide", 0.3);
    } else if (eventType === "processing" || eventType === "processing_start") {
      setCompanionMode("think", 0.5);
      showSpeechBubble("Thinking...");
    } else if (eventType === "output_chunk") {
      setCompanionMode("talk", 0.9);
      appendSpeechBubble(data.text || "");
    } else if (eventType === "turn_complete" || eventType === "response") {
      setTimeout(() => {
        setCompanionMode("idle", 0);
        fadeSpeechBubble();
      }, 2500);
    } else if (eventType === "persona_change") {
      const pKey = data.key || data.persona;
      if (pKey && PERSONAS[pKey]) {
        switchPersona(pKey, false);
      }
    }
  }

  function getActiveCreature() {
    return R.tiles?.[0]?.creature || null;
  }

  function setCompanionMode(mode, voiceLevel = 0.5) {
    const c = getActiveCreature();
    if (!c) return;

    if (c.face) {
      if (mode === "listen") c.face.set("wide", 1.5);
      else if (mode === "think") c.face.set("look", 1.5);
      else if (mode === "talk") c.face.set("talk1", 0.4);
    }

    // Trigger Roamies voice amplitude / state
    if (R.jarvis && c.kit?.setLook) {
      // Let jarvis or character render with real voice
      c.env.voice = voiceLevel;
    }
  }

  // -------------------------------------------------------------
  // 3. PERSONA SWITCHER LOGIC
  // -------------------------------------------------------------
  function switchPersona(personaKey, notifyBackend = true) {
    const p = PERSONAS[personaKey];
    if (!p) return;

    currentPersonaKey = personaKey;
    const c = getActiveCreature();
    if (c && c.kit && c.kit.setLook) {
      c.kit.setLook(p.look);
    }

    // Update HUD indicator
    document.querySelectorAll(".persona-btn").forEach((btn) => {
      if (btn.getAttribute("data-key") === personaKey) btn.classList.add("active");
      else btn.classList.remove("active");
    });

    showSpeechBubble(`${p.icon} Switched to ${p.name} (${p.voice} Voice)`);
    setTimeout(fadeSpeechBubble, 2000);

    if (notifyBackend) {
      sendWebSocket("switch_persona", { persona: personaKey });
    }
  }

  // -------------------------------------------------------------
  // 4. "CIRCLE TO ASK" MOUSE GESTURE
  // -------------------------------------------------------------
  function setupCircleGesture() {
    let isMouseDown = false;

    window.addEventListener("mousedown", (e) => {
      // Circle mode activates with Alt key or when isCirclingActive is toggled
      if (e.altKey || isCirclingActive) {
        isMouseDown = true;
        circlePoints = [[e.clientX, e.clientY]];
        R.pen?.({ ev: "start", x: e.clientX, y: e.clientY });
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (isMouseDown && (e.altKey || isCirclingActive)) {
        circlePoints.push([e.clientX, e.clientY]);
        R.pen?.({ ev: "pt", x: e.clientX, y: e.clientY });
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (isMouseDown) {
        isMouseDown = false;
        if (circlePoints.length > 5) {
          // Snap pen stroke
          R.pen?.({ ev: "snap", from: 0 });

          // Compute circled bounding box
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const [x, y] of circlePoints) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }

          const pad = 12;
          const bbox = [
            Math.max(0, Math.floor(minX - pad)),
            Math.max(0, Math.floor(minY - pad)),
            Math.ceil(maxX - minX + pad * 2),
            Math.ceil(maxY - minY + pad * 2)
          ];

          // Point to circled area with Roamies companion
          showSpeechBubble("Captured circled region! Analyzing...");
          sendWebSocket("circle_crop", { bbox });
        } else {
          R.pen?.({ ev: "drop" });
        }
        setTimeout(() => R.pen?.({ ev: "fade", after: 0.5 }), 800);
      }
    });
  }

  // -------------------------------------------------------------
  // 5. FLOATING HUD DOCK & SPEECH BUBBLE
  // -------------------------------------------------------------
  function buildCompanionHUD() {
    const hud = document.createElement("div");
    hud.id = "roamies-hud";
    hud.innerHTML = `
      <style>
        #roamies-hud {
          position: fixed;
          top: 16px;
          right: 20px;
          z-index: 2147483640;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(8, 14, 16, 0.82);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(120, 255, 226, 0.28);
          border-radius: 9999px;
          padding: 6px 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          font-family: "Martian Mono", monospace;
          user-select: none;
        }
        .persona-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #dcfff6;
          border-radius: 9999px;
          padding: 5px 11px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .persona-btn:hover {
          background: rgba(120, 255, 226, 0.18);
          border-color: #78ffe2;
          transform: translateY(-1px);
        }
        .persona-btn.active {
          background: linear-gradient(135deg, #78ffe2 0%, #28c4b8 100%);
          color: #051214;
          font-weight: 700;
          border-color: #78ffe2;
          box-shadow: 0 0 12px rgba(120, 255, 226, 0.4);
        }
        .hud-divider {
          width: 1px;
          height: 18px;
          background: rgba(255, 255, 255, 0.18);
          margin: 0 4px;
        }
        .action-pill-btn {
          background: rgba(120, 255, 226, 0.08);
          border: 1px solid #78ffe2;
          color: #78ffe2;
          border-radius: 9999px;
          padding: 5px 12px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-pill-btn.active {
          background: #78ffe2;
          color: #051214;
          font-weight: 700;
        }
        #companion-speech-bubble {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2147483640;
          background: rgba(6, 22, 24, 0.92);
          border: 1px solid #78ffe2;
          color: #dcfff6;
          padding: 10px 20px;
          border-radius: 12px;
          font-family: "Martian Mono", monospace;
          font-size: 13px;
          max-width: 580px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        #companion-speech-bubble.visible {
          opacity: 1;
        }
      </style>

      <div class="persona-group" style="display: flex; gap: 6px;">
        <button class="persona-btn active" data-key="jarvis">⚡ JARVIS (Charon)</button>
        <button class="persona-btn" data-key="roamie">🦊 ROAMIE (Puck)</button>
        <button class="persona-btn" data-key="luna">🌸 LUNA (Kore)</button>
        <button class="persona-btn" data-key="sarah">💎 SARAH (Aoede)</button>
        <button class="persona-btn" data-key="adrian">⚔️ ADRIAN (Fenrir)</button>
      </div>

      <div class="hud-divider"></div>

      <button id="circle-toggle-btn" class="action-pill-btn" title="Hold ALT or click to circle any button on screen">⭕ CIRCLE</button>
      <button id="mic-toggle-btn" class="action-pill-btn" title="Click or hold V to talk">🎙️ TALK</button>
    `;
    document.body.appendChild(hud);

    // Speech bubble container
    const bubble = document.createElement("div");
    bubble.id = "companion-speech-bubble";
    document.body.appendChild(bubble);

    // Event listeners
    hud.querySelectorAll(".persona-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-key");
        switchPersona(key);
      });
    });

    const circleBtn = document.getElementById("circle-toggle-btn");
    circleBtn.addEventListener("click", () => {
      isCirclingActive = !isCirclingActive;
      if (isCirclingActive) {
        circleBtn.classList.add("active");
        showSpeechBubble("⭕ Circling Mode: Drag mouse over any button or area to analyze it!");
      } else {
        circleBtn.classList.remove("active");
        fadeSpeechBubble();
      }
    });

    const micBtn = document.getElementById("mic-toggle-btn");
    micBtn.addEventListener("click", () => {
      isRecording = !isRecording;
      if (isRecording) {
        micBtn.classList.add("active");
        sendWebSocket("recording_start", {});
        showSpeechBubble("🎙️ Listening to your question...");
      } else {
        micBtn.classList.remove("active");
        sendWebSocket("recording_end", {});
        showSpeechBubble("Processing question...");
      }
    });
  }

  function showSpeechBubble(text) {
    const b = document.getElementById("companion-speech-bubble");
    if (!b) return;
    b.innerText = text;
    b.classList.add("visible");
  }

  function appendSpeechBubble(chunk) {
    const b = document.getElementById("companion-speech-bubble");
    if (!b) return;
    if (b.innerText === "Thinking..." || b.innerText === "Processing question...") {
      b.innerText = chunk;
    } else {
      b.innerText += chunk;
    }
    b.classList.add("visible");
  }

  function fadeSpeechBubble() {
    const b = document.getElementById("companion-speech-bubble");
    if (b) b.classList.remove("visible");
  }

  function updateHudStatus(status) {
    console.log("[Roamies Status]:", status);
  }

  // -------------------------------------------------------------
  // INITIALIZATION ON DOM READY
  // -------------------------------------------------------------
  window.addEventListener("DOMContentLoaded", () => {
    buildCompanionHUD();
    setupCircleGesture();
    connectWebSocket();

    // Check URL parameters for starting look
    const qs = new URLSearchParams(location.search);
    const initialLook = qs.get("look") || "jarvis";
    switchPersona(initialLook, false);
  });
})();
