/**
 * AR ASSISTANT // LIVE 3D COGNITIVE PICTURE-BOOK ENGINE
 * Ultra-Luxury Studio Aesthetic: Liquid Silver, Polished Chrome, Platinum & Obsidian. Zero Neon.
 * Full Real-Time Integration with Terminal AI Assistant Lifecycle.
 */

// -------------------------------------------------------------
// CHAPTER STORYBOOK DATA (General-Purpose AI Software Tutor)
// -------------------------------------------------------------
const CHAPTERS = [
  {
    id: "perception",
    nodeKey: "whisper",
    tag: "CHAPTER I // 04",
    stage: "AUDIO PERCEPTION",
    title: "Audio Perception",
    subtitle: "Speech & Intent Ingestion",
    badge: "LIVE VOICE STREAM",
    image: "assets/chapter1_perception.svg",
    prose: "Captures speech and conversational questions in real time. When you speak, the acoustic capsule illuminates, transforming voice into clean intent with zero audio buffer lag.",
    pills: ["Zero Audio Buffer Delay", "Speech & Intent Ingestion", "16,000 Hz Input Stream"],
    activeSystem: "Audio Perception Capsule",
    camPos: { x: -6.5, y: 3.2, z: 6.0 },
    lookAt: { x: -7.5, y: 2.8, z: -0.5 }
  },
  {
    id: "vision",
    nodeKey: "vision",
    tag: "CHAPTER II // 04",
    stage: "SPATIAL OBSERVER",
    title: "The Spatial Eye",
    subtitle: "1-Second Workspace Observer",
    badge: "1.0s DISCRETE SAMPLING",
    image: "assets/chapter2_vision.svg",
    prose: "Continuously samples your active software window every 1.0 second. Each discrete blink captures a high-resolution workspace snapshot with zero streaming lag or GPU saturation.",
    pills: ["1.0s Discrete Blink", "Threaded Workspace Capture", "Zero Video Bandwidth Waste"],
    activeSystem: "Spatial Aperture Prism",
    camPos: { x: -6.5, y: -2.5, z: 6.5 },
    lookAt: { x: -7.5, y: -2.8, z: 1.5 }
  },
  {
    id: "core",
    nodeKey: "core",
    tag: "CHAPTER III // 04",
    stage: "COGNITIVE SYNTHESIS",
    title: "Multimodal Fusion Core",
    subtitle: "Gemini 3.1 Live Arbitration",
    badge: "FULL-DUPLEX CORE",
    image: "assets/chapter3_core.svg",
    prose: "The master arbitration brain. Fuses the 1-second visual workspace snapshot with your spoken prompt, arbitrating context and generating real-time intelligence in under 1.8 seconds.",
    pills: ["Cross-Modal Arbitration", "< 1.8s Response Turnaround", "Full-Duplex Bidi WebSockets"],
    activeSystem: "Gemini Multimodal Live Core",
    camPos: { x: 0, y: 2.0, z: 8.5 },
    lookAt: { x: 0, y: 0.2, z: 0 }
  },
  {
    id: "voice",
    nodeKey: "voice",
    tag: "CHAPTER IV // 04",
    stage: "EXPRESSION LAYER",
    title: "Acoustic Harmony",
    subtitle: "24kHz Native Voice & Transcript",
    badge: "NATIVE VOX OUT",
    image: "assets/chapter4_voice.svg",
    prose: "Streams native 24kHz linear PCM audio directly to your hardware while synchronized text subtitles stream simultaneously in the terminal with zero robotic delay.",
    pills: ["24,000 Hz Linear PCM", "Synchronized Text Output", "Zero-Lag WASAPI Playback"],
    activeSystem: "Parabolic Sound Emitter",
    camPos: { x: 6.5, y: 2.8, z: 6.5 },
    lookAt: { x: 7.5, y: 2.2, z: 1.0 }
  }
];

class PictureBookVisualizer {
  constructor() {
    this.canvas = document.getElementById("webgl-canvas");
    this.currentChapterIndex = 0;
    this.nodes = {};
    this.splines = [];
    this.particles = [];
    this.isTourRunning = false;
    this.tourTimer = null;
    this.isFreeOrbit = false;
    this.isSimulating = false;

    // Live AI Terminal State Tracking
    this.currentSystemState = "IDLE"; // IDLE, RECORDING, PROCESSING, STREAMING
    this.processingSpeedMultiplier = 1.0;
    this.corePulseSpeed = 1.0;
    this.totalSnapshotsReceived = 0;

    this.initScene();
    this.setupStudioEnvironment();
    this.initMaterials();
    this.build3DArchitecture();
    this.buildPipelineFlows();
    this.initDOMControls();
    this.connectLiveTelemetry();
    this.setChapter(0, true);
    this.animate();
  }

  // -------------------------------------------------------------
  // SCENE & CAMERA INITIALIZATION
  // -------------------------------------------------------------
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0d);
    this.scene.fog = new THREE.FogExp2(0x0a0a0d, 0.022);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 3.5, 14);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 28;
    this.controls.minDistance = 3.5;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;

    // Direct Studio Lights (Zero Neon)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(12, 18, 12);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe2e8f0, 2.2);
    rimLight.position.set(-14, 10, -12);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 1.2);
    fillLight.position.set(0, -8, 10);
    this.scene.add(fillLight);

    // Reflective Studio Floor Disc
    const floorGeo = new THREE.CircleGeometry(24, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c10,
      roughness: 0.4,
      metalness: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5.8;
    this.scene.add(floor);

    // Concentric Platinum Hairline Rings
    for (let r = 4; r <= 20; r += 4) {
      const ringGeo = new THREE.RingGeometry(r - 0.02, r + 0.02, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x334155,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45
      });
      const gridRing = new THREE.Mesh(ringGeo, ringMat);
      gridRing.rotation.x = -Math.PI / 2;
      gridRing.position.y = -5.78;
      this.scene.add(gridRing);
    }
  }

  // -------------------------------------------------------------
  // PROCEDURAL PMREM STUDIO ENVIRONMENT (Zero Neon Reflections)
  // -------------------------------------------------------------
  setupStudioEnvironment() {
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      pmremGenerator.compileEquirectangularShader();

      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x1a1a24);

      // Large Overhead Daylight Softbox
      const topSoftboxGeo = new THREE.PlaneGeometry(16, 16);
      const topSoftboxMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const topSoftbox = new THREE.Mesh(topSoftboxGeo, topSoftboxMat);
      topSoftbox.position.set(0, 12, 0);
      topSoftbox.rotation.x = Math.PI / 2;
      envScene.add(topSoftbox);

      // Left High-Contrast Specular Light Strip
      const leftStrip = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 18),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      );
      leftStrip.position.set(-14, 4, 8);
      leftStrip.lookAt(0, 0, 0);
      envScene.add(leftStrip);

      // Right Cool Specular Light Strip
      const rightStrip = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 18),
        new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
      );
      rightStrip.position.set(14, 4, 8);
      rightStrip.lookAt(0, 0, 0);
      envScene.add(rightStrip);

      const renderTarget = pmremGenerator.fromScene(envScene);
      this.scene.environment = renderTarget.texture;
      pmremGenerator.dispose();
    } catch (err) {
      console.warn("PMREM Studio generation fallback active:", err);
    }
  }

  // -------------------------------------------------------------
  // SHINY SILVER, CHROME & PLATINUM MATERIALS
  // -------------------------------------------------------------
  initMaterials() {
    // Polished Mirror Chrome
    this.matChrome = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.98,
      roughness: 0.08
    });

    // Brushed Platinum
    this.matPlatinum = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.22
    });

    // Dark Titanium Steel
    this.matTitanium = new THREE.MeshStandardMaterial({
      color: 0x1e2025,
      metalness: 0.92,
      roughness: 0.35
    });

    // Frosted Optical Crystal Glass
    this.matCrystal = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.05,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 1.5,
      transparent: true,
      opacity: 0.88
    });

    // Hairline Silver Spline Material
    this.matSpline = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.3
    });
  }

  // -------------------------------------------------------------
  // 3D ARCHITECTURAL MODELS
  // -------------------------------------------------------------
  build3DArchitecture() {
    // 1. CENTRAL COGNITIVE CORE (Gemini Multimodal Live)
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.2, 0);

    // Liquid Silver Faceted Core (Icosahedron)
    const coreGeo = new THREE.IcosahedronGeometry(1.65, 2);
    const coreMesh = new THREE.Mesh(coreGeo, this.matChrome);
    coreGroup.add(coreMesh);
    this.coreMesh = coreMesh;

    // Gyroscopic Ring 1 (Outer - Polished Chrome)
    const ring1Geo = new THREE.TorusGeometry(2.6, 0.05, 16, 120);
    const ring1 = new THREE.Mesh(ring1Geo, this.matChrome);
    coreGroup.add(ring1);
    this.gimbal1 = ring1;

    // Gyroscopic Ring 2 (Middle - Brushed Platinum)
    const ring2Geo = new THREE.TorusGeometry(2.2, 0.04, 16, 120);
    const ring2 = new THREE.Mesh(ring2Geo, this.matPlatinum);
    ring2.rotation.x = Math.PI / 4;
    coreGroup.add(ring2);
    this.gimbal2 = ring2;

    // Gyroscopic Ring 3 (Inner - Dark Titanium)
    const ring3Geo = new THREE.TorusGeometry(1.9, 0.035, 16, 120);
    const ring3 = new THREE.Mesh(ring3Geo, this.matTitanium);
    ring3.rotation.y = Math.PI / 3;
    coreGroup.add(ring3);
    this.gimbal3 = ring3;

    this.scene.add(coreGroup);
    this.nodes.core = coreGroup;

    // 2. AUDIO PERCEPTION SOUND CAPSULE (Speech Ingestion)
    const audioGroup = new THREE.Group();
    audioGroup.position.set(-7.5, 2.8, -0.5);

    // Floating Acoustic Capsule
    const capsuleGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.6, 32);
    const capsuleMesh = new THREE.Mesh(capsuleGeo, this.matChrome);
    audioGroup.add(capsuleMesh);
    this.audioCapsuleMesh = capsuleMesh;

    // Hemisphere caps
    const capTopGeo = new THREE.SphereGeometry(0.75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const capTop = new THREE.Mesh(capTopGeo, this.matPlatinum);
    capTop.position.y = 0.8;
    audioGroup.add(capTop);

    const capBot = new THREE.Mesh(capTopGeo, this.matPlatinum);
    capBot.position.y = -0.8;
    capBot.rotation.x = Math.PI;
    audioGroup.add(capBot);

    // Acoustic Resonance Orbit Rings
    this.audioRings = [];
    for (let i = 1; i <= 3; i++) {
      const ringGeo = new THREE.TorusGeometry(0.9 + i * 0.35, 0.02, 12, 64);
      const ring = new THREE.Mesh(ringGeo, this.matPlatinum);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.3 + i * 0.25;
      audioGroup.add(ring);
      this.audioRings.push(ring);
    }

    this.scene.add(audioGroup);
    this.nodes.whisper = audioGroup;

    // 3. SPATIAL EYE OBSERVER (1-Second Screen Sampling)
    const visionGroup = new THREE.Group();
    visionGroup.position.set(-7.5, -2.8, 1.5);

    // Precision Aperture Frame
    const frameGeo = new THREE.BoxGeometry(2.4, 1.5, 0.3);
    const frameMesh = new THREE.Mesh(frameGeo, this.matPlatinum);
    visionGroup.add(frameMesh);

    // Optical Lens Barrel
    const lensBarrelGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.45, 32);
    const lensBarrel = new THREE.Mesh(lensBarrelGeo, this.matChrome);
    lensBarrel.rotation.x = Math.PI / 2;
    lensBarrel.position.z = 0.15;
    visionGroup.add(lensBarrel);
    this.visionBarrel = lensBarrel;

    // Crystal Optical Pupil (Blinks on 1s snapshot)
    const pupilGeo = new THREE.SphereGeometry(0.55, 32, 16);
    const pupilMesh = new THREE.Mesh(pupilGeo, this.matCrystal);
    pupilMesh.position.z = 0.25;
    visionGroup.add(pupilMesh);
    this.visionPupil = pupilMesh;

    this.scene.add(visionGroup);
    this.nodes.vision = visionGroup;

    // 4. ACOUSTIC VOICE EMITTER (24kHz Native Voice Out)
    const voiceGroup = new THREE.Group();
    voiceGroup.position.set(7.5, 2.2, 1.0);

    // Parabolic Sound Horn
    const hornGeo = new THREE.ConeGeometry(1.3, 2.0, 32, 1, true);
    const hornMesh = new THREE.Mesh(hornGeo, this.matChrome);
    hornMesh.rotation.z = -Math.PI / 2;
    voiceGroup.add(hornMesh);
    this.voiceHorn = hornMesh;

    // Floating Harmonic Wave Discs
    this.voiceRings = [];
    for (let i = 1; i <= 3; i++) {
      const waveGeo = new THREE.RingGeometry(0.35 * i, 0.38 * i, 32);
      const waveMesh = new THREE.Mesh(waveGeo, this.matPlatinum);
      waveMesh.rotation.y = Math.PI / 2;
      waveMesh.position.x = 0.6 + i * 0.45;
      voiceGroup.add(waveMesh);
      this.voiceRings.push(waveMesh);
    }

    this.scene.add(voiceGroup);
    this.nodes.voice = voiceGroup;
  }

  // -------------------------------------------------------------
  // DATA PIPELINE SPLINES & PARTICLE FLOW
  // -------------------------------------------------------------
  buildPipelineFlows() {
    const pathways = [
      { from: this.nodes.whisper.position, to: this.nodes.core.position, mid: new THREE.Vector3(-4, 2.4, 0.2) },
      { from: this.nodes.vision.position, to: this.nodes.core.position, mid: new THREE.Vector3(-4, -1.8, 1.2) },
      { from: this.nodes.core.position, to: this.nodes.voice.position, mid: new THREE.Vector3(4, 1.8, 0.8) }
    ];

    pathways.forEach((path, idx) => {
      const curve = new THREE.QuadraticBezierCurve3(path.from, path.mid, path.to);
      this.splines.push(curve);

      // Hairline Guide Tube
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.025, 8, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, this.matSpline);
      this.scene.add(tubeMesh);

      // Data Packet Points along Curve
      const count = 30;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        pPos[i * 3] = 0;
        pPos[i * 3 + 1] = 0;
        pPos[i * 3 + 2] = 0;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));

      const pMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.14,
        transparent: true,
        opacity: 0.95
      });

      const pSystem = new THREE.Points(pGeo, pMat);
      this.scene.add(pSystem);

      this.particles.push({
        curve: curve,
        system: pSystem,
        progress: Array.from({ length: count }, (_, k) => k / count),
        baseSpeed: 0.0032 + idx * 0.0004,
        speed: 0.0032 + idx * 0.0004
      });
    });
  }

  // -------------------------------------------------------------
  // CHAPTER LOGIC & PICTURE-BOOK STORY NAVIGATION
  // -------------------------------------------------------------
  setChapter(index, instant = false) {
    if (index < 0) index = CHAPTERS.length - 1;
    if (index >= CHAPTERS.length) index = 0;
    this.currentChapterIndex = index;

    const ch = CHAPTERS[index];

    // Update DOM Text & Visuals
    const chTag = document.getElementById("ch-tag");
    const chStage = document.getElementById("ch-stage");
    const chTitle = document.getElementById("ch-title");
    const chSubtitle = document.getElementById("ch-subtitle");
    const chImage = document.getElementById("ch-image");
    const chBadgeText = document.getElementById("ch-badge-text");
    const chProse = document.getElementById("ch-prose");
    const chPills = document.getElementById("ch-pills");

    if (chTag) chTag.innerText = ch.tag;
    if (chStage) chStage.innerText = ch.stage;
    if (chTitle) chTitle.innerText = ch.title;
    if (chSubtitle) chSubtitle.innerText = ch.subtitle;
    if (chBadgeText) chBadgeText.innerText = ch.badge;
    if (chProse) chProse.innerText = ch.prose;

    if (chImage) {
      chImage.style.display = "block";
      chImage.src = ch.image;
    }

    if (chPills) {
      chPills.innerHTML = ch.pills.map(p => `<span class="pill-item">${p}</span>`).join("");
    }

    // Update Dots Active State
    document.querySelectorAll(".dot-btn").forEach((dot, idx) => {
      if (idx === index) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });

    // Animate Camera to active 3D component unless user is in Free Orbit
    if (!this.isFreeOrbit) {
      this.flyCamera(ch.camPos, ch.lookAt, instant ? 0 : 1300);
    }
  }

  flyCamera(targetPos, lookAtPos, duration = 1200) {
    if (duration === 0) {
      this.camera.position.set(targetPos.x, targetPos.y, targetPos.z);
      this.controls.target.set(lookAtPos.x, lookAtPos.y, lookAtPos.z);
      this.controls.update();
      return;
    }

    new TWEEN.Tween(this.camera.position)
      .to(targetPos, duration)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    new TWEEN.Tween(this.controls.target)
      .to(lookAtPos, duration)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();
  }

  // -------------------------------------------------------------
  // REAL-TIME TERMINAL AI SYNCHRONIZATION (THE COMPLETE CIRCLE)
  // -------------------------------------------------------------
  connectLiveTelemetry() {
    const statusText = document.getElementById("live-status-text");
    const connectionBadge = document.getElementById("live-connection-badge");

    try {
      const wsUrl = window.location.port === "8765"
        ? "ws://" + window.location.hostname + ":8766"
        : "ws://127.0.0.1:8766";
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (statusText) statusText.innerText = "LIVE LINKED";
        if (connectionBadge) connectionBadge.classList.add("linked");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleAssistantEvent(payload.type, payload.data || {});
        } catch (e) {}
      };

      ws.onerror = () => {
        if (statusText) statusText.innerText = "STANDALONE DEMO";
      };
    } catch (e) {
      if (statusText) statusText.innerText = "STANDALONE DEMO";
    }
  }

  handleAssistantEvent(eventType, data) {
    // -------------------------------------------------------------
    // STAGE 2: SPATIAL EYE 1-SECOND SNAPSHOT BLINK
    // -------------------------------------------------------------
    if (eventType === "snapshot") {
      this.totalSnapshotsReceived++;
      this.triggerSpatialEyeBlink(this.totalSnapshotsReceived);
    }

    // -------------------------------------------------------------
    // STAGE 1: AUDIO RECORDING / USER SPEAKING
    // -------------------------------------------------------------
    else if (eventType === "recording_start") {
      this.setSystemState("RECORDING");
      this.highlightCycleStep("step-audio");
      this.glowAudioNode(true);
      
      const promptPill = document.getElementById("prompt-state-pill");
      if (promptPill) {
        promptPill.innerText = "RECORDING...";
        promptPill.className = "stream-status-pill recording";
      }
    }

    else if (eventType === "recording_end") {
      this.glowAudioNode(false);
      const promptPill = document.getElementById("prompt-state-pill");
      if (promptPill) {
        promptPill.innerText = "CAPTURED";
        promptPill.className = "stream-status-pill";
      }
    }

    // -------------------------------------------------------------
    // STAGE 1 -> 3: USER PROMPT RECEIVED & ENTERED
    // -------------------------------------------------------------
    else if (eventType === "query" || eventType === "prompt_received") {
      const promptText = data.text || data.prompt || "User question";
      this.displayCurrentPrompt(promptText);
      this.glowAudioNode(true);
      setTimeout(() => this.glowAudioNode(false), 600);
    }

    // -------------------------------------------------------------
    // STAGE 3: MULTIMODAL FUSION CORE PROCESSING ANIMATION
    // -------------------------------------------------------------
    else if (eventType === "processing" || eventType === "processing_start") {
      const promptText = data.prompt || data.text;
      if (promptText) this.displayCurrentPrompt(promptText);

      this.setSystemState("PROCESSING");
      this.highlightCycleStep("step-core");
      this.startCoreProcessingAnimation();
    }

    // -------------------------------------------------------------
    // STAGE 4: NATIVE VOICE & TRANSCRIPT OUTPUT STREAMING
    // -------------------------------------------------------------
    else if (eventType === "output_chunk") {
      this.setSystemState("STREAMING");
      this.highlightCycleStep("step-voice");
      this.appendResponseText(data.text || "");
      this.radiateVoiceRings();
    }

    // -------------------------------------------------------------
    // COMPLETION: FULL CIRCLE FINISHED -> RETURN TO IDLE
    // -------------------------------------------------------------
    else if (eventType === "turn_complete" || eventType === "response") {
      if (data.full_text) {
        const respBox = document.getElementById("live-response-display");
        if (respBox) respBox.innerText = `"${data.full_text}"`;
      }
      this.finishCycleAndReturnToIdle();
    }

    else if (eventType === "idle") {
      this.resetToIdle();
    }
  }

  // -------------------------------------------------------------
  // VISUAL LIFECYCLE CONTROLLERS
  // -------------------------------------------------------------
  setSystemState(state) {
    this.currentSystemState = state;
    const stageHeader = document.getElementById("live-stage-state");

    if (stageHeader) {
      if (state === "RECORDING") stageHeader.innerText = "🎙️ AUDIO RECORDING ACTIVE";
      else if (state === "PROCESSING") stageHeader.innerText = "⚡ SYNTHESIZING FUSION CORE...";
      else if (state === "STREAMING") stageHeader.innerText = "🔊 STREAMING NATIVE SPEECH & TEXT";
      else if (state === "COMPLETE") stageHeader.innerText = "✓ CYCLE COMPLETE";
      else stageHeader.innerText = "● SYSTEM READY / AWAITING SPEECH";
    }
  }

  highlightCycleStep(stepId) {
    document.querySelectorAll(".cycle-step").forEach(step => {
      if (step.id === stepId) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });
  }

  // 1-Second Spatial Eye Camera Shutter Blink
  triggerSpatialEyeBlink(count) {
    const hbDot = document.getElementById("spatial-eye-hb");
    const countDisplay = document.getElementById("snap-counter-display");

    if (hbDot) {
      hbDot.classList.add("blink");
      setTimeout(() => hbDot.classList.remove("blink"), 180);
    }

    if (countDisplay) {
      countDisplay.innerText = `1.0s BLINK (${count} SNAPS)`;
    }

    // Quick camera iris aperture pulse in 3D
    if (this.visionPupil) {
      new TWEEN.Tween(this.visionPupil.scale)
        .to({ x: 1.25, y: 1.25, z: 1.25 }, 90)
        .yoyo(true)
        .repeat(1)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    }
  }

  // Audio Node Glow when user speaks or records
  glowAudioNode(isGlowing) {
    if (!this.audioCapsuleMesh) return;
    const targetScale = isGlowing ? 1.2 : 1.0;
    new TWEEN.Tween(this.audioCapsuleMesh.scale)
      .to({ x: targetScale, y: targetScale, z: targetScale }, 250)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    // Pulse surrounding resonance rings
    this.audioRings.forEach((ring, idx) => {
      const ringScale = isGlowing ? 1.35 + idx * 0.1 : 1.0;
      new TWEEN.Tween(ring.scale)
        .to({ x: ringScale, y: ringScale, z: ringScale }, 300)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();
    });
  }

  displayCurrentPrompt(text) {
    const promptBox = document.getElementById("live-prompt-display");
    const promptPill = document.getElementById("prompt-state-pill");
    const respBox = document.getElementById("live-response-display");

    if (promptBox) promptBox.innerText = `"${text}"`;
    if (promptPill) {
      promptPill.innerText = "SUBMITTED";
      promptPill.className = "stream-status-pill";
    }
    if (respBox) respBox.innerText = "...";
  }

  startCoreProcessingAnimation() {
    this.processingSpeedMultiplier = 3.6;

    // Accelerated pulse of faceted core
    new TWEEN.Tween(this.coreMesh.scale)
      .to({ x: 1.38, y: 1.38, z: 1.38 }, 300)
      .yoyo(true)
      .repeat(3)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();

    // Accelerate particle pipelines into core
    this.particles.forEach(p => {
      p.speed = p.baseSpeed * 3.5;
    });

    const promptPill = document.getElementById("prompt-state-pill");
    if (promptPill) {
      promptPill.innerText = "FUSING CONTEXT";
      promptPill.className = "stream-status-pill processing";
    }
  }

  appendResponseText(chunk) {
    const respBox = document.getElementById("live-response-display");
    const outPill = document.getElementById("output-state-pill");

    if (outPill) {
      outPill.innerText = "SPEAKING";
      outPill.className = "stream-status-pill streaming";
    }

    if (respBox) {
      if (respBox.innerText === "..." || respBox.innerText.startsWith("(AI response")) {
        respBox.innerText = chunk;
      } else {
        respBox.innerText += chunk;
      }
      respBox.scrollTop = respBox.scrollHeight;
    }
  }

  radiateVoiceRings() {
    this.voiceRings.forEach((ring, i) => {
      new TWEEN.Tween(ring.scale)
        .to({ x: 1.45 + i * 0.15, y: 1.45 + i * 0.15, z: 1.45 + i * 0.15 }, 200)
        .yoyo(true)
        .repeat(1)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    });
  }

  finishCycleAndReturnToIdle() {
    this.setSystemState("COMPLETE");

    // All cycle steps light up briefly to celebrate the complete loop
    document.querySelectorAll(".cycle-step").forEach(step => step.classList.add("active"));

    // Smoothly restore particle speed and core rotation
    this.particles.forEach(p => {
      p.speed = p.baseSpeed;
    });

    new TWEEN.Tween(this)
      .to({ processingSpeedMultiplier: 1.0 }, 1400)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    const outPill = document.getElementById("output-state-pill");
    const promptPill = document.getElementById("prompt-state-pill");
    if (outPill) {
      outPill.innerText = "COMPLETE";
      outPill.className = "stream-status-pill";
    }
    if (promptPill) {
      promptPill.innerText = "RESOLVED";
      promptPill.className = "stream-status-pill";
    }

    // Return to resting idle state after 2.0s
    setTimeout(() => {
      this.resetToIdle();
    }, 2000);
  }

  resetToIdle() {
    this.setSystemState("IDLE");
    this.processingSpeedMultiplier = 1.0;

    document.querySelectorAll(".cycle-step").forEach(step => step.classList.remove("active"));
    const eyeStep = document.getElementById("step-vision");
    if (eyeStep) eyeStep.classList.add("active-blink");

    const outPill = document.getElementById("output-state-pill");
    const promptPill = document.getElementById("prompt-state-pill");
    if (outPill) outPill.innerText = "STANDBY";
    if (promptPill) promptPill.innerText = "READY";
  }

  // -------------------------------------------------------------
  // SIMULATE FULL LIVE CYCLE (For Academic & Teacher Demo)
  // -------------------------------------------------------------
  simulateLiveLifecycleDemo() {
    if (this.isSimulating) return;
    this.isSimulating = true;

    // Step 1: User speaks question
    this.handleAssistantEvent("recording_start", {});
    this.displayCurrentPrompt("How do I split a video clip and add a cross-dissolve transition?");

    setTimeout(() => {
      this.handleAssistantEvent("recording_end", {});
      
      // Step 2: 1s Spatial Eye Snapshot
      this.handleAssistantEvent("snapshot", { count: this.totalSnapshotsReceived + 1 });

      setTimeout(() => {
        // Step 3: Fusion Core Processing
        this.handleAssistantEvent("processing", { prompt: "How do I split a video clip and add a cross-dissolve transition?" });

        setTimeout(() => {
          // Step 4: Assistant Streams Native Speech & Text
          const replyWords = [
            "To split the clip, ",
            "place your playhead at the cut point ",
            "and press Ctrl+B. ",
            "Then drag a Cross Dissolve transition ",
            "from the Effects library directly onto the edit cut."
          ];

          let wordIdx = 0;
          const streamInterval = setInterval(() => {
            if (wordIdx < replyWords.length) {
              this.handleAssistantEvent("output_chunk", { text: replyWords[wordIdx] });
              wordIdx++;
            } else {
              clearInterval(streamInterval);
              this.handleAssistantEvent("turn_complete", { full_text: replyWords.join("") });
              this.isSimulating = false;
            }
          }, 320);

        }, 1100);

      }, 500);

    }, 1200);
  }

  // -------------------------------------------------------------
  // DOM EVENTS & CONTROLS
  // -------------------------------------------------------------
  initDOMControls() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.getElementById("prev-ch-btn")?.addEventListener("click", () => {
      this.stopTeacherTour();
      this.setChapter(this.currentChapterIndex - 1);
    });

    document.getElementById("next-ch-btn")?.addEventListener("click", () => {
      this.stopTeacherTour();
      this.setChapter(this.currentChapterIndex + 1);
    });

    document.querySelectorAll(".dot-btn").forEach(dot => {
      dot.addEventListener("click", () => {
        this.stopTeacherTour();
        const idx = parseInt(dot.getAttribute("data-index"), 10);
        this.setChapter(idx);
      });
    });

    const tourBtn = document.getElementById("teacher-tour-btn");
    tourBtn?.addEventListener("click", () => {
      if (this.isTourRunning) this.stopTeacherTour();
      else this.startTeacherTour();
    });

    document.getElementById("pulse-btn")?.addEventListener("click", () => {
      this.simulateLiveLifecycleDemo();
    });

    const storyModeBtn = document.getElementById("mode-storybook-btn");
    const freeOrbitBtn = document.getElementById("mode-free-orbit-btn");
    const resetStageBtn = document.getElementById("reset-stage-btn");

    storyModeBtn?.addEventListener("click", () => {
      this.isFreeOrbit = false;
      storyModeBtn.classList.add("active");
      freeOrbitBtn?.classList.remove("active");
      this.setChapter(this.currentChapterIndex);
    });

    freeOrbitBtn?.addEventListener("click", () => {
      this.isFreeOrbit = true;
      freeOrbitBtn.classList.add("active");
      storyModeBtn?.classList.remove("active");
      this.flyCamera({ x: 0, y: 3.5, z: 14 }, { x: 0, y: 0, z: 0 }, 1000);
    });

    resetStageBtn?.addEventListener("click", () => {
      this.isFreeOrbit = false;
      storyModeBtn?.classList.add("active");
      freeOrbitBtn?.classList.remove("active");
      this.setChapter(0);
    });
  }

  startTeacherTour() {
    this.isTourRunning = true;
    this.isFreeOrbit = false;
    const tourBtn = document.getElementById("teacher-tour-btn");
    const btnText = document.getElementById("tour-btn-text");
    if (tourBtn) tourBtn.classList.add("active");
    if (btnText) btnText.innerText = "PAUSE AUTO-TOUR";

    this.tourTimer = setInterval(() => {
      this.setChapter((this.currentChapterIndex + 1) % CHAPTERS.length);
    }, 7500);
  }

  stopTeacherTour() {
    if (!this.isTourRunning) return;
    this.isTourRunning = false;
    if (this.tourTimer) {
      clearInterval(this.tourTimer);
      this.tourTimer = null;
    }
    const tourBtn = document.getElementById("teacher-tour-btn");
    const btnText = document.getElementById("tour-btn-text");
    if (tourBtn) tourBtn.classList.remove("active");
    if (btnText) btnText.innerText = "AUTO-TOUR FOR TEACHER";
  }

  // -------------------------------------------------------------
  // ANIMATION & RENDER LOOP
  // -------------------------------------------------------------
  animate() {
    requestAnimationFrame(() => this.animate());
    TWEEN.update();

    const time = performance.now() * 0.001;
    const speedMult = this.processingSpeedMultiplier;

    // Central Core Gyroscopic Gimbals Rotation (Accelerates during processing!)
    if (this.gimbal1) this.gimbal1.rotation.z = time * 0.45 * speedMult;
    if (this.gimbal2) this.gimbal2.rotation.x = time * -0.6 * speedMult;
    if (this.gimbal3) this.gimbal3.rotation.y = time * 0.8 * speedMult;
    if (this.coreMesh) {
      this.coreMesh.rotation.y = time * 0.3 * speedMult;
      this.coreMesh.rotation.x = Math.sin(time * 0.5 * speedMult) * 0.15;
    }

    // Gentle Subsystem Hover
    if (this.nodes.whisper) this.nodes.whisper.position.y = 2.8 + Math.sin(time * 1.4) * 0.12;
    if (this.nodes.vision) this.nodes.vision.position.y = -2.8 + Math.cos(time * 1.2) * 0.12;
    if (this.nodes.voice) this.nodes.voice.position.y = 2.2 + Math.sin(time * 1.5 + 1) * 0.12;

    // Animate Data Particles along Spline Curves
    this.particles.forEach(p => {
      const positions = p.system.geometry.attributes.position.array;
      const count = p.progress.length;

      for (let i = 0; i < count; i++) {
        p.progress[i] = (p.progress[i] + p.speed) % 1.0;
        const pt = p.curve.getPointAt(p.progress[i]);
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
      }
      p.system.geometry.attributes.position.needsUpdate = true;
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate on DOM Ready
window.addEventListener("DOMContentLoaded", () => {
  new PictureBookVisualizer();
});
