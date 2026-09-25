const $ = (selector) => document.querySelector(selector);
const canvas = $("#universe");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const gl = canvas.getContext("webgl", {
  antialias: false,
  alpha: false,
  powerPreference: "high-performance",
});
let scene = 0,
  sceneBlend = 0,
  journey = false,
  zoom = 0,
  dragX = 0,
  dragY = 0;
let targetX = 0,
  targetY = 0,
  pointerDown = false,
  previousX = 0,
  previousY = 0;
let audioContext,
  audioGain,
  audioOn = false,
  activeNote = 0;

const scenes = [
  {
    name: "SAGITTARIUS A*",
    detail: "SUPERMASSIVE BLACK HOLE",
    title: "Even light has its limits.",
    kicker: "FIELD NOTE 001 / THE SINGULARITY",
    body: "At the heart of our galaxy sits a boundary beyond which light cannot return. The luminous material around it tells a story the darkness itself never can. This artistic observatory imagines that extraordinary contrast: a brilliant, restless universe orbiting an absolute silence.",
    fact: "THE IDEA → An event horizon is a boundary, not a solid surface.",
    color: "#f5a27b",
    frequency: 55,
  },
  {
    name: "THE LAST LIGHT",
    detail: "STELLAR EXPLOSION",
    title: "Go out with a universe.",
    kicker: "FIELD NOTE 002 / THE SUPERNOVA",
    body: "A massive star can spend millions of years holding itself together, then transform in a spectacular explosion. In that upheaval, material is scattered into space, becoming part of the next generation of stars and worlds. An ending, seen from a wider perspective, can be an act of creation.",
    fact: "THE IDEA → Stellar explosions help enrich the cosmos with heavy elements.",
    color: "#e5a6ce",
    frequency: 65.41,
  },
  {
    name: "EINSTEIN–ROSEN BRIDGE",
    detail: "HYPOTHETICAL SPACETIME TUNNEL",
    title: "Take the impossible route.",
    kicker: "FIELD NOTE 003 / THE WORMHOLE",
    body: "Imagine folding a map until two distant points touch. A wormhole is a theoretical idea that plays with a similar possibility in spacetime. No traversable wormhole has been observed. For now, this passage belongs to mathematics, imagination, and the very human urge to ask: what if?",
    fact: "THE IDEA → A hypothetical shortcut, still beyond observational evidence.",
    color: "#8fcbd7",
    frequency: 73.42,
  },
];

const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float mode;
uniform float zoom;
uniform vec2 drag;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float f=0.;float a=.5;for(int i=0;i<4;i++){f+=a*noise(p);p=p*2.03+7.1;a*=.5;}return f;}
mat2 rotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 blackhole(vec2 uv){
  vec2 p=rotate(-.33+drag.x*.28)*uv;float r=length(p);float a=atan(p.y,p.x);
  float radius=.94;
  float distort=fbm(vec2(a*4.+time*.05,r*17.-time*.14));
  float halo=exp(-abs(r-radius)*9.5);
  float ring=exp(-abs(r-radius)*75.);
  float outer=exp(-abs(r-1.01)*21.)*.45;
  vec3 color=vec3(1.,.36,.12)*(halo*.3+outer*.3);
  color+=vec3(1.,.75,.43)*ring*(.6+distort*.7);
  float diskY=.23+drag.y*.06;
  float dr=length(vec2(p.x,p.y/diskY));
  float da=atan(p.y/diskY,p.x);
  float diskMask=smoothstep(.99,1.18,dr)*(1.-smoothstep(2.55,3.05,dr));
  float bands=sin(dr*105.+fbm(vec2(da*5.+time*.11,dr*13.))*8.-time*.35)*.5+.5;
  float filaments=fbm(vec2(dr*50.,da*4.-time*.3));
  float disk=diskMask*(.19+bands*.5+filaments*.7)*pow(1.2/dr,1.7);
  float visibility = p.y<0. ? 1. : smoothstep(.91,1.04,r);
  color+=mix(vec3(.9,.22,.065),vec3(1.,.85,.61),pow(filaments,.5))*disk*visibility*1.65;
  float softDisk=exp(-abs(p.y)*8.)*exp(-abs(abs(p.x)-1.35)*1.8)*.08;
  color+=vec3(.95,.3,.1)*softDisk;
  float edge = smoothstep(.87,.94,r);
  if(p.y>0.) color*=edge;
  else color*=max(edge,diskMask);
  float arc=exp(-abs(r-.963)*140.)*(.5+.5*sin(a+1.));
  color+=vec3(1.,.92,.77)*arc*.6;
  color+=vec3(.22,.085,.045)*exp(-r*.9)*smoothstep(.94,1.3,r);
  return color;
}
vec3 supernova(vec2 p){
 float r=length(p);float a=atan(p.y,p.x);float pulse=.03*sin(time*.55);
 float n=fbm(vec2(a*3.+time*.025,r*3.5-time*.07));
 float clouds=fbm(p*2.8+time*.025);
 float shell=exp(-abs(r-(1.2+n*.6+pulse))*6.5);
 float filament=pow(.5+.5*sin(a*34.+n*24.+r*11.-time*.2),3.);
 float core=exp(-r*8.)*3.;
 vec3 c=mix(vec3(.3,.08,.3),vec3(1.,.39,.35),n)*shell*(.4+filament)*1.8;
 c+=vec3(.28,.16,.38)*exp(-r*.7)*clouds*.4;
 c+=vec3(1.,.82,.61)*core;
 c+=vec3(.85,.51,.69)*exp(-abs(p.y)*100.)*exp(-abs(p.x)*1.5)*.5;
 c+=vec3(1.,.66,.7)*exp(-abs(p.x)*100.)*exp(-abs(p.y)*2.)*.35;
 return c;
}
vec3 wormhole(vec2 p){
 p=rotate(time*.03+drag.x*.3)*p;float r=length(p);float a=atan(p.y,p.x);
 float warp=1./max(r,.06);float spiral=a+warp*.6-time*.25;
 float n=fbm(vec2(cos(spiral),sin(spiral))*3.+vec2(r*8.-time*.1));
 float rings=pow(.5+.5*sin(warp*18.-time*.8+n*3.),9.);
 float striations=pow(.5+.5*sin(a*65.+warp*5.+time*.2),14.);
 float mask=smoothstep(.2,.56,r)*(1.-smoothstep(1.4,2.8,r));
 vec3 c=mix(vec3(.07,.25,.39),vec3(.39,.82,.9),n)*mask*(rings*.8+striations*.3+.09);
 c+=vec3(.42,.83,.95)*exp(-abs(r-.55)*40.)*.75;
 c+=vec3(.09,.25,.35)*exp(-abs(r-.85)*2.)*.4;
 return c;
}
void main(){
 vec2 st=gl_FragCoord.xy/resolution;float aspect=resolution.x/resolution.y;
 bool mobile=aspect<.9;
 vec2 center=mobile?vec2(.53,.405):vec2(.705,.555);
 center=mix(center,vec2(.5,.56),zoom);
 float scale=mobile?7.7:5.4;
 vec2 uv=(st-center)*vec2(aspect,1.)*scale;
 uv/=1.+zoom*.45;
 uv+=drag*vec2(.07,.025);
 vec3 color=vec3(.027,.034,.043);
 vec2 stars=st*vec2(aspect,1.)*310.;vec2 cell=floor(stars);vec2 local=fract(stars)-.5;
 float h=hash(cell);float star=smoothstep(.996,1.,h)*exp(-length(local)*20.);
 color+=vec3(.62,.69,.77)*star*(.5+.5*sin(time*.4+h*90.));
 float dust=fbm(st*vec2(aspect,1.)*7.);
 color+=vec3(.075,.047,.042)*pow(dust,3.)*.2;
 vec3 object;
 if(mode<.001){object=blackhole(uv);}
 else if(mode<.999){object=mix(blackhole(uv),supernova(uv),mode);}
 else if(mode<1.001){object=supernova(uv);}
 else if(mode<1.999){object=mix(supernova(uv),wormhole(uv),mode-1.);}
 else{object=wormhole(uv);}
 float screenFade=mobile?1.:smoothstep(.25,.46,st.x);
 color+=object*mix(screenFade,1.,zoom);
 float angle=atan(uv.y,uv.x);float distance=length(uv);
 float streak=pow(max(0.,sin(angle*173.+sin(angle*31.)*9.)),55.);
 float travel=pow(.5+.5*sin(distance*3.-time*3.+angle*17.),12.);
 color+=vec3(.35,.42,.5)*streak*travel*smoothstep(.8,4.,distance)*zoom*.6;
 color+=vec3(hash(gl_FragCoord.xy+fract(time))-.5)*.008;
 color=1.-exp(-color*1.2);
 gl_FragColor=vec4(color,1.);
}`;

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("visible"), 3200);
}

if (gl) {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  try {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(
      ["resolution", "time", "mode", "zoom", "drag"].map((k) => [
        k,
        gl.getUniformLocation(program, k),
      ]),
    );
    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    new ResizeObserver(resize).observe(canvas);
    resize();
    let previous = 0,
      elapsed = 0;
    function draw(now) {
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (!document.hidden) {
        if (!reducedMotion.matches) elapsed += delta;
        const easing = 1 - Math.exp(-delta * 4.5);
        sceneBlend += (scene - sceneBlend) * easing;
        zoom += ((journey ? 1 : 0) - zoom) * easing;
        dragX += (targetX - dragX) * easing;
        dragY += (targetY - dragY) * easing;
        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
        gl.uniform1f(uniforms.time, elapsed);
        gl.uniform1f(uniforms.mode, sceneBlend);
        gl.uniform1f(uniforms.zoom, zoom);
        gl.uniform2f(uniforms.drag, dragX, dragY);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  } catch (error) {
    console.error("Renderer unavailable:", error);
    fallback();
  }
} else fallback();

function fallback() {
  canvas.style.background =
    "radial-gradient(ellipse at 70% 48%,#030406 0 11%,#f5bd86 11.3%,#94452a 12%,#251714 15%,#080a0c 35%)";
}
function setScene(next) {
  scene = next;
  document.querySelectorAll("[data-scene]").forEach((button) => {
    const active = Number(button.dataset.scene) === scene;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("#object-name").textContent = scenes[scene].name;
  $("#object-detail").textContent = scenes[scene].detail;
  document.documentElement.style.setProperty("--accent", scenes[scene].color);
  if (audioContext && audioOn) retune();
}
document
  .querySelectorAll("[data-scene]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      setScene(Number(button.dataset.scene)),
    ),
  );
function setJourney(value) {
  journey = value;
  $("#experience").classList.toggle("journey", value);
  $("#enter").setAttribute("aria-expanded", String(value));
  if (value) $("#return").focus({ preventScroll: true });
  else $("#enter").focus({ preventScroll: true });
}
$("#enter").addEventListener("click", () => setJourney(true));
$("#return").addEventListener("click", () => setJourney(false));
canvas.addEventListener("pointerdown", (event) => {
  pointerDown = true;
  previousX = event.clientX;
  previousY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!pointerDown) return;
  targetX += (event.clientX - previousX) * 0.009;
  targetY = Math.max(
    -2,
    Math.min(2, targetY + (event.clientY - previousY) * 0.008),
  );
  previousX = event.clientX;
  previousY = event.clientY;
});
canvas.addEventListener("pointerup", () => (pointerDown = false));
canvas.addEventListener("pointercancel", () => (pointerDown = false));
document.addEventListener("keydown", (event) => {
  if (
    $("#note-dialog").open ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
  )
    return;
  if (event.key === "Escape" && journey) setJourney(false);
  if (event.key === "ArrowRight") setScene((scene + 1) % 3);
  if (event.key === "ArrowLeft") setScene((scene + 2) % 3);
});

const oscillators = [];
function retune() {
  oscillators.forEach((oscillator, i) =>
    oscillator.frequency.setTargetAtTime(
      scenes[scene].frequency * [1, 1.5, 2.002][i],
      audioContext.currentTime,
      1.2,
    ),
  );
}
$("#sound").addEventListener("click", async () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioGain = audioContext.createGain();
      audioGain.gain.value = 0;
      audioGain.connect(audioContext.destination);
      [1, 1.5, 2.002].forEach((multiple, i) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        gain.gain.value = [0.5, 0.2, 0.1][i];
        oscillator.type = "sine";
        oscillator.frequency.value = scenes[scene].frequency * multiple;
        oscillator.connect(gain);
        gain.connect(audioGain);
        oscillator.start();
        oscillators.push(oscillator);
      });
    }
    await audioContext.resume();
    audioOn = !audioOn;
    audioGain.gain.setTargetAtTime(
      audioOn ? 0.14 : 0,
      audioContext.currentTime,
      0.5,
    );
    $("#sound").setAttribute("aria-pressed", String(audioOn));
    $("#sound-label").textContent = audioOn ? "SOUND ON" : "SOUND OFF";
  } catch {
    toast("Sound is unavailable in this browser.");
  }
});
document.addEventListener("visibilitychange", () => {
  if (audioContext && audioGain)
    audioGain.gain.setTargetAtTime(
      !document.hidden && audioOn ? 0.14 : 0,
      audioContext.currentTime,
      0.3,
    );
});
$("#fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else toast("Fullscreen is not supported in this browser.");
  } catch {
    toast("Fullscreen is not available in this window.");
  }
});
document.addEventListener("fullscreenchange", () =>
  $("#fullscreen").setAttribute(
    "aria-label",
    document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen",
  ),
);

document.querySelectorAll("[data-note]").forEach((button) =>
  button.addEventListener("click", () => {
    activeNote = Number(button.dataset.note);
    const note = scenes[activeNote];
    $("#note-kicker").textContent = note.kicker;
    $("#note-title").textContent = note.title;
    $("#note-body").textContent = note.body;
    $("#note-fact").textContent = note.fact;
    $("#note-dialog").showModal();
  }),
);
$(".dialog-close").addEventListener("click", () => $("#note-dialog").close());
$("#note-dialog").addEventListener("click", (event) => {
  if (event.target === $("#note-dialog")) {
    const bounds = event.target.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      event.target.close();
  }
});
$("#note-explore").addEventListener("click", () => {
  $("#note-dialog").close();
  setScene(activeNote);
  $("#experience").scrollIntoView({
    behavior: reducedMotion.matches ? "instant" : "smooth",
  });
  document
    .querySelector(`.scene-tab[data-scene="${activeNote}"]`)
    .focus({ preventScroll: true });
});
function updateClock() {
  $("#time").textContent = new Date().toISOString().slice(11, 19) + " UTC";
}
updateClock();
setInterval(updateClock, 1000);
