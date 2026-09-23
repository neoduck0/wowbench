import { UNIVERSE_VS, UNIVERSE_FS, PARTICLE_VS, PARTICLE_FS } from "./shaders.js?v=4";
import { Soundscape } from "./audio.js";

const WORLDS = [
  { num: "01", name: "Black Sun", line: "A mass that learned how to listen." },
  { num: "02", name: "Prism Sea", line: "Light, folding itself into knives." },
  { num: "03", name: "Synapse", line: "The thought before the thought." },
  { num: "04", name: "Glass Nave", line: "A cathedral that grew from silence." },
  { num: "05", name: "Iris Bloom", line: "Something looking back." },
  { num: "06", name: "Eventide", line: "The last color the universe remembers." },
];

const LEAKS = [
  "228, 194, 122",
  "180, 110, 255",
  "90, 220, 140",
  "150, 170, 220",
  "255, 90, 150",
  "255, 120, 60",
];

const $ = (id) => document.getElementById(id);

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    throw new Error(log);
  }
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p));
  }
  return p;
}

function loc(gl, p, name) {
  return gl.getUniformLocation(p, name);
}

class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    if (!this.gl) throw new Error("WebGL2 is required.");

    const gl = this.gl;
    this.universe = program(gl, UNIVERSE_VS, UNIVERSE_FS);
    this.particles = program(gl, PARTICLE_VS, PARTICLE_FS);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const coarse = matchMedia("(pointer: coarse)").matches || innerWidth < 720;
    this.count = coarse ? 3500 : 11000;
    const seeds = new Float32Array(this.count * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    this.pvao = gl.createVertexArray();
    gl.bindVertexArray(this.pvao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const aSeed = gl.getAttribLocation(this.particles, "aSeed");
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 3, gl.FLOAT, false, 0, 0);

    this.uUni = {
      resolution: loc(gl, this.universe, "uResolution"),
      time: loc(gl, this.universe, "uTime"),
      mouse: loc(gl, this.universe, "uMouse"),
      world: loc(gl, this.universe, "uWorld"),
      shock: loc(gl, this.universe, "uShock"),
      shockPos: loc(gl, this.universe, "uShockPos"),
      audio: loc(gl, this.universe, "uAudio"),
      enter: loc(gl, this.universe, "uEnter"),
      idle: loc(gl, this.universe, "uIdle"),
    };
    this.uPar = {
      time: loc(gl, this.particles, "uTime"),
      world: loc(gl, this.particles, "uWorld"),
      resolution: loc(gl, this.particles, "uResolution"),
      mouse: loc(gl, this.particles, "uMouse"),
      enter: loc(gl, this.particles, "uEnter"),
      dpr: loc(gl, this.particles, "uDpr"),
      audio: loc(gl, this.particles, "uAudio"),
    };

    this.mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    this.world = 0;
    this.target = 0;
    this.enter = 0;
    this.shock = 0;
    this.shockPos = { x: 0.5, y: 0.5 };
    this.quality = 1;
    this.frames = 0;
    this.last = performance.now();
    this.started = false;
    this.raf = 0;

    this.resize = this.resize.bind(this);
    addEventListener("resize", this.resize);
    this.resize();
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    this.dpr = dpr;
    const scale = this.quality;
    const w = Math.max(1, Math.floor(innerWidth * dpr * scale));
    const h = Math.max(1, Math.floor(innerHeight * dpr * scale));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  begin() {
    this.started = true;
    this.t0 = performance.now();
  }

  setTarget(i) {
    this.target = Math.max(0, Math.min(5, i));
  }

  pulse(nx, ny) {
    this.shock = 0.0001;
    this.shockPos.x = nx;
    this.shockPos.y = ny;
  }

  frame(now, audioLevel) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    this.frames++;
    if (this.frames > 45) {
      if (dt > 0.033 && this.quality > 0.55) {
        this.quality = Math.max(0.55, this.quality - 0.04);
        this.resize();
      } else if (dt < 0.018 && this.quality < 1) {
        this.quality = Math.min(1, this.quality + 0.015);
        this.resize();
      }
    }

    this.mouse.x += (this.mouse.tx - this.mouse.x) * (1 - Math.exp(-dt * 8));
    this.mouse.y += (this.mouse.ty - this.mouse.y) * (1 - Math.exp(-dt * 8));
    this.world += (this.target - this.world) * (1 - Math.exp(-dt * 3.4));
    if (this.started) this.enter = Math.min(1, this.enter + dt * 0.55);
    if (this.shock > 0) this.shock = Math.min(1, this.shock + dt * 0.85);
    if (this.shock >= 1) this.shock = 0;

    const gl = this.gl;
    const t = (now - (this.t0 || now)) / 1000;
    const idle = t;

    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);
    gl.useProgram(this.universe);
    gl.uniform2f(this.uUni.resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uUni.time, t);
    gl.uniform2f(this.uUni.mouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.uUni.world, this.world);
    gl.uniform1f(this.uUni.shock, this.shock);
    gl.uniform2f(this.uUni.shockPos, this.shockPos.x, this.shockPos.y);
    gl.uniform1f(this.uUni.audio, audioLevel);
    gl.uniform1f(this.uUni.enter, this.enter);
    gl.uniform1f(this.uUni.idle, idle);
    gl.drawArrays(gl.TRIANGLES, 0, 3);


  }

  capture() {
    return this.canvas.toDataURL("image/png");
  }
}

function fail(msg) {
  window.__glError = msg;
  const box = $("fail");
  box.classList.add("show");
  box.querySelector("p").textContent = msg;
}

function boot() {
  const canvas = $("stage");
  let engine;
  try {
    engine = new Engine(canvas);
  } catch (err) {
    fail(err.message || "This browser cannot render the observatory.");
    return;
  }

  const sound = new Soundscape();
  const hud = $("hud");
  const gate = $("gate");
  const card = $("worldCard");
  const numEl = card.querySelector(".num");
  const nameEl = card.querySelector("h2");
  const lineEl = card.querySelector("p");
  const coords = $("coords");
  const dots = [...document.querySelectorAll(".nav button")];
  const cursor = $("cursor");
  const autoFlag = $("autoFlag");
  const muteBtn = $("muteBtn");
  const help = $("help");

  if (matchMedia("(pointer: coarse)").matches) document.body.classList.add("coarse");

  let shownWorld = -1;
  let lastInput = performance.now();
  let autoplay = false;
  let autoDir = 1;
  let muted = false;
  let running = true;
  let cardTimer = 0;
  let wheelLock = false;

  const flashCard = (i) => {
    const w = WORLDS[i];
    numEl.textContent = w.num;
    nameEl.textContent = w.name;
    lineEl.textContent = w.line;
    $("worldNum").textContent = w.num;
    dots.forEach((d, idx) => d.classList.toggle("on", idx === i));
    document.documentElement.style.setProperty("--leak", LEAKS[i]);
    document.title = `APHELION — ${w.name}`;
    card.classList.remove("flash");
    void card.offsetWidth;
    card.classList.add("flash", "show");
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => card.classList.remove("show"), 3400);
    shownWorld = i;
  };

  const setWorld = (i, fromAuto = false, snap = false) => {
    const next = Math.max(0, Math.min(5, i));
    if (snap) engine.world = next;
    engine.setTarget(next);
    sound.setWorld(next);
    if (!fromAuto) {
      lastInput = performance.now();
      autoplay = false;
      autoFlag.classList.remove("on");
    }
  };

  const pointer = (e) => {
    const x = e.clientX ?? (e.touches && e.touches[0].clientX) ?? innerWidth / 2;
    const y = e.clientY ?? (e.touches && e.touches[0].clientY) ?? innerHeight / 2;
    engine.mouse.tx = x / innerWidth;
    engine.mouse.ty = 1 - y / innerHeight;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
  };

  addEventListener("pointermove", (e) => {
    pointer(e);
    lastInput = performance.now();
    if (autoplay) {
      autoplay = false;
      autoFlag.classList.remove("on");
    }
  });

  addEventListener("pointerdown", (e) => {
    if (gate.classList.contains("gone")) {
      const nx = e.clientX / innerWidth;
      const ny = 1 - e.clientY / innerHeight;
      engine.pulse(nx, ny);
      sound.pulse();
    }
    const t = e.target;
    cursor.classList.toggle("hot", Boolean(t.closest && t.closest("button, a, .hit")));
  });

  addEventListener("pointerover", (e) => {
    const t = e.target;
    cursor.classList.toggle("hot", Boolean(t.closest && t.closest("button, a, .hit")));
  });

  addEventListener(
    "wheel",
    (e) => {
      if (!gate.classList.contains("gone")) return;
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      if (dir === 0) return;
      if (wheelLock) return;
      wheelLock = true;
      setWorld(Math.round(engine.target) + dir);
      setTimeout(() => (wheelLock = false), 520);
    },
    { passive: false }
  );

  let touchY = null;
  addEventListener("touchstart", (e) => {
    touchY = e.touches[0].clientY;
    pointer(e);
  }, { passive: true });
  addEventListener("touchend", (e) => {
    if (touchY == null || !gate.classList.contains("gone")) return;
    const y = (e.changedTouches[0] || {}).clientY;
    if (y == null) return;
    const dy = touchY - y;
    if (Math.abs(dy) > 48) setWorld(Math.round(engine.target) + (dy > 0 ? 1 : -1));
    touchY = null;
  });

  addEventListener("keydown", (e) => {
    lastInput = performance.now();
    autoplay = false;
    autoFlag.classList.remove("on");
    if (e.key === "ArrowRight" || e.key === "ArrowDown") setWorld(Math.round(engine.target) + 1);
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") setWorld(Math.round(engine.target) - 1);
    if (e.key >= "1" && e.key <= "6") setWorld(Number(e.key) - 1);
    if (e.key === " " && gate.classList.contains("gone")) {
      e.preventDefault();
      engine.pulse(engine.mouse.x, engine.mouse.y);
      sound.pulse();
    }
    if (e.key === "m" || e.key === "M") toggleMute();
    if (e.key === "f" || e.key === "F") toggleFull();
    if (e.key === "?" || e.key === "h" || e.key === "H") help.classList.toggle("open");
    if (e.key === "Escape") help.classList.remove("open");
    if (e.key === "s" || e.key === "S") snapshot();
  });

  dots.forEach((btn, i) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setWorld(i);
    });
  });

  const toggleMute = () => {
    muted = !muted;
    sound.setMuted(muted);
    muteBtn.classList.toggle("on", muted);
    muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
    muteBtn.querySelector("use")?.setAttribute("href", muted ? "#icon-muted" : "#icon-sound");
    $("muteIcon").innerHTML = muted
      ? '<path d="M4 10v4h3l4 4V6L7 10H4z"/><path d="M16 10l4 4m0-4l-4 4"/>'
      : '<path d="M4 10v4h3l4 4V6L7 10H4z"/><path d="M15 9a3.5 3.5 0 010 6"/><path d="M17.5 7a6 6 0 010 10"/>';
  };

  const toggleFull = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {}
  };

  const snapshot = () => {
    const a = document.createElement("a");
    a.href = engine.capture();
    a.download = `aphelion-${WORLDS[Math.round(engine.world)].name.toLowerCase().replace(" ", "-")}.png`;
    a.click();
  };

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMute();
  });
  $("fullBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFull();
  });
  $("helpBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    help.classList.toggle("open");
  });
  help.addEventListener("click", () => help.classList.remove("open"));
  help.querySelector(".help-card").addEventListener("click", (e) => e.stopPropagation());

  let entered = false;
  const enter = async () => {
    if (entered) return;
    entered = true;
    try {
      await sound.start();
    } catch (_) {}
    sound.setWorld(engine.target);
    engine.begin();
    gate.classList.add("gone");
    hud.classList.add("on");
    flashCard(Math.round(engine.target));
  };

  $("enterBtn").addEventListener("click", enter);
  gate.addEventListener("click", (e) => {
    if (e.target.closest("#enterBtn") || e.target === gate || e.target.closest(".gate-inner")) enter();
  });
  addEventListener("keydown", (e) => {
    if (!gate.classList.contains("gone") && (e.key === "Enter" || e.key === " ")) enter();
  });

  const tickCoords = () => {
    const t = performance.now() / 1000;
    const raH = ((18 + engine.mouse.x * 2 + t * 0.01) % 24).toFixed(0).padStart(2, "0");
    const raM = (Math.floor((t * 7 + engine.mouse.y * 60) % 60)).toString().padStart(2, "0");
    const dec = (-23 + engine.world * 4.2 + Math.sin(t * 0.2) * 0.4).toFixed(1);
    const km = (152.1 + engine.world * 8.4 + Math.sin(t * 0.13) * 0.2).toFixed(1);
    coords.textContent = `RA ${raH}h ${raM}m  ·  DEC ${dec}°  ·  ${km} Mkm`;
  };

  const loop = (now) => {
    if (!running) return;
    if (document.hidden) {
      engine.raf = requestAnimationFrame(loop);
      return;
    }
    const level = sound.getLevel() * 4.5;
    engine.frame(now, Math.min(1, level));

    const idx = Math.round(engine.world);
    if (entered && idx !== shownWorld && Math.abs(engine.world - idx) < 0.08) flashCard(idx);

    if (engine.started && now - lastInput > 9000) {
      if (!autoplay) {
        autoplay = true;
        autoFlag.classList.add("on");
      }
      engine.target += 0.00135 * autoDir;
      if (engine.target >= 5) {
        engine.target = 5;
        autoDir = -1;
      } else if (engine.target <= 0) {
        engine.target = 0;
        autoDir = 1;
      }
      sound.setWorld(engine.target);
    }

    tickCoords();
    engine.raf = requestAnimationFrame(loop);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && sound.ctx) sound.ctx.suspend();
    else if (sound.ctx && !muted) sound.ctx.resume();
  });

  engine.raf = requestAnimationFrame(loop);

  const params = new URLSearchParams(location.search);
  if (params.has("play")) {
    const raw = params.get("world");
    setTimeout(() => {
      if (raw != null) {
        const w = Number(raw);
        if (Number.isFinite(w)) setWorld(w, false, true);
      }
      enter();
    }, 80);
  }
}

boot();
