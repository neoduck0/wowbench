const canvas = document.querySelector('#universe');
const loader = document.querySelector('#loader');
const loaderNumber = document.querySelector('#loaderNumber');
const soundToggle = document.querySelector('#soundToggle');
const systemMessage = document.querySelector('#systemMessage');
const flash = document.querySelector('#flash');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
const state = { progress: 0, chapter: 0, renderChapter: 0, burst: 0, fractured: false, lastChapter: 0 };

const vertexSource = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * .5 + .5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
out vec4 outColor;
in vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;
uniform float uProgress;
uniform float uChapter;
uniform float uBurst;

#define PI 3.14159265359

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float value = 0.0, amp = .5;
  mat2 rot = mat2(.8,.6,-.6,.8);
  for (int i=0; i<5; i++) {
    value += amp * noise(p);
    p = rot*p*2.03 + 11.7;
    amp *= .48;
  }
  return value;
}
mat2 rotate2d(float a) { float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

void main() {
  vec2 uv = (gl_FragCoord.xy-.5*uResolution.xy)/uResolution.y;
  vec2 mouse = (uMouse-.5*vec2(1.0,-1.0));
  mouse.x *= uResolution.x/uResolution.y;
  float time = uTime * .13;
  float w0 = 1.0-smoothstep(.0,.8,uChapter);
  float w1 = smoothstep(.0,.7,uChapter)*(1.0-smoothstep(.7,1.4,uChapter));
  float w2 = smoothstep(1.0,1.7,uChapter)*(1.0-smoothstep(1.7,2.4,uChapter));
  float w3 = smoothstep(2.0,2.7,uChapter);
  float fade = smoothstep(3.0,3.7,uChapter);
  vec2 p = uv;
  float energy = max(uBurst, dot(uv-mouse,uv-mouse)*.012);
  p *= 1.0 + energy*.7;
  p = rotate2d(time*.4) * p;

  // Deep chromatic fog shared by every world.
  vec2 q = p*1.4;
  float fogA = fbm(q + vec2(time*.2,-time*.13));
  float fogB = fbm(q*1.6 + fogA*2.0 - vec2(time*.18,time*.11));
  vec3 color = vec3(.004,.006,.018);
  color += vec3(.015,.08,.13)*fogA*exp(-length(p)*.75);
  color += vec3(.24,.015,.15)*fogB*exp(-length(p)*1.3);

  // WORLD 00: a crystalline creature in a violet nebula.
  vec2 a = rotate2d(-time*.18)*p;
  float crystal = 0.0;
  for (int i=0; i<5; i++) {
    float fi=float(i);
    float angle=fi*1.256+sin(time+fi)*.12;
    vec2 c=vec2(cos(angle),sin(angle))*(.26+fi*.035);
    vec2 q2=abs(a-c)-vec2(.025,.13);
    crystal += exp(-abs(sdHexagon(a-c))*16.0)*(.6+.4*sin(time*2.+fi));
  }
  float body = exp(-pow(length(a*vec2(1.0,1.35)),1.25)*2.8);
  float core = exp(-length(a)*4.5);
  color += w0*(vec3(.20,.03,.38)*fogA + crystal*vec3(.55,.95,1.0)*.45);
  color += w0*(body*vec3(.26,.08,.48)*.75 + core*vec3(.65,.95,1.0)*.55);
  color += w0*pow(max(0.0,1.0-abs(a.y+sin(a.x*8.0-time)*.06)*10.0),2.0)*vec3(.4,.9,1.0)*.08;

  // WORLD 01: liquid aurora ribbons.
  vec2 b = rotate2d(sin(time)*.18)*p;
  float ribbon=0.0;
  for (int i=0; i<3; i++) {
    float fi=float(i);
    float path=sin(b.x*2.8+time*(1.1+fi*.3)+fi*2.0)*(.11+fi*.055);
    float dist=abs(b.y-path);
    ribbon += exp(-dist*(34.0-fi*5.0))*(.5+.5*sin(b.x*5.0+time*1.7));
  }
  vec3 aurora = mix(vec3(.0,.9,.85),vec3(1.0,.05,.52),smoothstep(-.7,.6,b.y));
  color += w1*ribbon*aurora*.7;
  color += w1*exp(-length(p)*1.7)*vec3(.1,.9,.75)*.45;

  // WORLD 02: an impossible machine in an electric field.
  vec2 c = rotate2d(time*.27)*p;
  vec2 g = abs(fract(c*7.0+vec2(time*.13,0.0))-.5)/7.0;
  float grid = min(g.x,g.y);
  float field = exp(-grid*85.0);
  float box = max(abs(c.x)-.32,abs(c.y)-.22);
  float boxEdge = exp(-abs(box)*75.0);
  float disk = exp(-abs(length(c)-.27)*38.0);
  float beams = exp(-abs(sin(atan(c.y,c.x)*6.0+time*2.0))*10.0)*(1.0-smoothstep(.2,.8,length(c)))*.35;
  color += w2*(field*vec3(.08,.3,.45)*.45 + boxEdge*vec3(.85,.05,.4)*.5);
  color += w2*(disk*vec3(.9,.95,.2)*.45 + beams*vec3(.0,.7,1.0)*.35);

  // WORLD 03: event horizon.
  vec2 d = rotate2d(-time*.08)*p;
  float radius=length(d*vec2(1.0,1.02));
  float ring=exp(-abs(radius-.305)*65.0);
  float ripple=sin(radius*65.0-time*2.4)*exp(-radius*7.0)*.035;
  float horizon=1.0-smoothstep(.26,.31,radius);
  color *= 1.0-w3*horizon*.92;
  color += w3*(ring*vec3(.25,.85,1.0)*.7 + ripple*vec3(.5,.2,.7));
  color += w3*exp(-radius*1.4)*vec3(.02,.05,.09);

  // Infinite star field, streaking on descent.
  float stretch=1.0+smoothstep(.2,.95,uProgress)*14.0;
  vec2 sp=rotate2d(time*.15)*uv*vec2(1.0,.16);
  vec2 cell=floor(sp*70.0);
  vec2 local=fract(sp*70.0)-.5;
  float star=step(.986,hash(cell+floor(uTime*.25)));
  star*=smoothstep(.06,.0,length(local));
  color += star*vec3(.65,.85,1.0)*.5;

  // Chromatic shockwave and bloom.
  color += uBurst*vec3(1.0,.32,.8)*exp(-abs(radius-.05-uBurst*.5)*5.0)*1.5;
  color = 1.0-exp(-color*1.25);
  color = pow(color,vec3(.86));
  float vignette=1.0-smoothstep(.25,1.35,length(uv*.82));
  color*=.68+.32*vignette;
  outColor=vec4(color,1.0);
}`;

// This declaration appears only inside GLSL, kept separate for readability above.
const sdHexagonGLSL = `
float sdHexagon(vec2 p) {
  const vec3 k=vec3(-.866025404,.5,.577350269);
  p=abs(p);
  p-=2.0*min(dot(k.xy,p),0.0)*k.xy;
  p-=vec2(clamp(p.x,-k.z*1.732,k.z*1.732),p.y);
  return length(p)*sign(p.y);
}
`;

function initUniverse() {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) {
    document.body.classList.add('no-webgl');
    return initFallback();
  }

  let vertex, fragment, program;
  try {
    vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource.replace('// This declaration appears only inside GLSL, kept separate for readability above.', '').replace('mat2 rotate2d(float a)', sdHexagonGLSL + '\nmat2 rotate2d(float a)'));
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) {
    console.error(error);
    document.body.classList.add('no-webgl');
    return;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, 'uResolution'),
    mouse: gl.getUniformLocation(program, 'uMouse'),
    time: gl.getUniformLocation(program, 'uTime'),
    progress: gl.getUniformLocation(program, 'uProgress'),
    chapter: gl.getUniformLocation(program, 'uChapter'),
    burst: gl.getUniformLocation(program, 'uBurst')
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  let start = performance.now();
  function frame(now) {
    pointer.x += (pointer.tx - pointer.x) * .045;
    pointer.y += (pointer.ty - pointer.y) * .045;
    state.burst *= .965;
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.mouse, pointer.x, pointer.y);
    gl.uniform1f(uniforms.time, (now - start) / 1000);
    gl.uniform1f(uniforms.progress, state.progress);
    gl.uniform1f(uniforms.chapter, state.renderChapter);
    gl.uniform1f(uniforms.burst, state.burst);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (!reducedMotion) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader), source);
    throw new Error('Shader compilation failed');
  }
  return shader;
}

function initFallback() {
  const ctx = canvas.getContext('2d');
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const stars = Array.from({ length: 130 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), hue: Math.random() > .5 ? 190 : 300 }));
  function draw(now) {
    ctx.fillStyle = '#03030a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createRadialGradient(innerWidth * (.5 + pointer.x * .08), innerHeight * (.5 + pointer.y * .08), 0, innerWidth / 2, innerHeight / 2, innerWidth * .7);
    g.addColorStop(0, `hsla(${190 + state.chapter * 70}, 80%, 32%, .6)`);
    g.addColorStop(.3, `hsla(${280 + state.chapter * 25}, 80%, 20%, .5)`);
    g.addColorStop(1, '#020206');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    stars.forEach(s => {
      const x = ((s.x + now * .00001 * (1 + s.z * 8)) % 1) * innerWidth;
      const y = s.y * innerHeight;
      ctx.fillStyle = `hsla(${s.hue},80%,80%,${.25 + s.z * .6})`;
      ctx.fillRect(x, y, s.z * 2, s.z * 2);
    });
    if (!reducedMotion) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

function initScroll() {
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('.side-index a')];
  const copies = [...document.querySelectorAll('.reveal-block')];

  function update() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const raw = max > 0 ? scrollY / max : 0;
    state.progress = raw;

    // Blend between worlds at the visual center of each full-height chapter.
    const centers = chapters.map(section => section.offsetTop + section.offsetHeight * .42);
    let renderChapter = 0;
    for (let i = 0; i < centers.length - 1; i++) {
      if (scrollY >= centers[i]) {
        const blend = Math.min(1, Math.max(0, (scrollY - centers[i]) / (centers[i + 1] - centers[i])));
        renderChapter = Math.min(3, i + blend);
      }
    }
    state.renderChapter = renderChapter;
    const current = Math.min(3, Math.round(renderChapter));
    if (current !== state.lastChapter) {
      state.chapter = current;
      state.lastChapter = current;
      links.forEach((link, i) => link.classList.toggle('is-active', i === current));
      if (current === 1) showMessage('CHROMATIC LIFE-FORM DETECTED');
      if (current === 2) showMessage('PHYSICAL LAWS: OPTIONAL');
      if (current === 3) showMessage('SIGNAL LOST. SIGNAL FOUND.');
    }
    document.querySelector('#worldDepth').textContent = `DEPTH ${(raw * 9999.99).toFixed(2).padStart(7, '0')}`;
  }
  addEventListener('scroll', update, { passive: true });
  update();

  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  }), { threshold: .3 });
  copies.forEach(copy => observer.observe(copy));
}

function initPointer() {
  const cursor = document.querySelector('.cursor');
  const reticle = document.querySelector('.reticle');
  addEventListener('pointermove', event => {
    pointer.tx = event.clientX / innerWidth;
    pointer.ty = 1 - event.clientY / innerHeight;
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    reticle.style.transform = `translate(calc(-50% + ${(pointer.tx-.5)*14}px), calc(-50% + ${(.5-pointer.ty)*14}px))`;
  }, { passive: true });

  document.querySelectorAll('button, a, .chapter__copy').forEach(el => {
    el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
  });

  if (!reducedMotion && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * .15;
        const y = (e.clientY - r.top - r.height / 2) * .15;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => el.style.transform = '');
    });
  }
}

let messageTimer;
function showMessage(text) {
  systemMessage.textContent = `◉ ${text}`;
  systemMessage.classList.add('is-visible');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => systemMessage.classList.remove('is-visible'), 2600);
}

function shockwave(strength = 1) {
  state.burst = strength;
  flash.animate([{ opacity: 0 }, { opacity: .55 }, { opacity: 0 }], { duration: 650, easing: 'ease-out' });
}

function initActions() {
  document.querySelector('#enterButton').addEventListener('click', () => {
    shockwave(1.2);
    enableSound();
    showMessage('DESCENT AUTHORIZED');
    setTimeout(() => document.querySelector('#bloom').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }), 450);
  });
  document.querySelector('#fractureButton').addEventListener('click', () => {
    shockwave(1.5);
    state.fractured = !state.fractured;
    document.body.classList.toggle('is-fractured', state.fractured);
    showMessage(state.fractured ? 'SKY FRACTURE: STABLE' : 'SKY RESTORED: UNFORTUNATELY');
  });
  document.querySelector('#restartButton').addEventListener('click', () => {
    shockwave(1.3);
    showMessage('REMEMBERING WHERE YOU STARTED');
    setTimeout(() => scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }), 350);
  });
  addEventListener('keydown', e => {
    if (e.code === 'Space' && !['BUTTON', 'A'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      scrollBy({ top: innerHeight * .8, behavior: 'smooth' });
      shockwave(.25);
    }
  });
}

// A tiny generative ambient engine—no audio files required.
let audioContext, masterGain, isAudioOn = false;
function makeAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  audioContext = new AC();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioContext.destination);

  [55, 82.4, 110, 164.8].forEach((frequency, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    osc.type = i % 2 ? 'sine' : 'triangle';
    osc.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = 180 + i * 80;
    gain.gain.value = .025 / (i + 1);
    osc.connect(filter).connect(gain).connect(masterGain);
    osc.start();
  });

  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const noiseGain = audioContext.createGain();
  noise.buffer = buffer;
  noise.loop = true;
  filter.type = 'bandpass';
  filter.frequency.value = 700;
  filter.Q.value = .6;
  noiseGain.gain.value = .012;
  noise.connect(filter).connect(noiseGain).connect(masterGain);
  noise.start();

  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  lfo.frequency.value = .08;
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();
}

async function enableSound() {
  if (!audioContext) makeAudio();
  if (!audioContext) return;
  await audioContext.resume();
  isAudioOn = true;
  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.linearRampToValueAtTime(.65, audioContext.currentTime + 1.2);
  soundToggle.classList.add('is-on');
  soundToggle.setAttribute('aria-pressed', 'true');
  soundToggle.querySelector('.sound-toggle__text').textContent = 'SOUND ON';
  showMessage('AMBIENT SIGNAL CONNECTED');
}
function disableSound() {
  if (!audioContext) return;
  masterGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + .4);
  isAudioOn = false;
  soundToggle.classList.remove('is-on');
  soundToggle.setAttribute('aria-pressed', 'false');
  soundToggle.querySelector('.sound-toggle__text').textContent = 'SOUND OFF';
}
soundToggle.addEventListener('click', () => isAudioOn ? disableSound() : enableSound());

function initLoader() {
  document.body.classList.add('is-loading');
  let amount = 0;
  const timer = setInterval(() => {
    amount += Math.random() * 11;
    if (amount >= 100) {
      amount = 100;
      clearInterval(timer);
      setTimeout(() => {
        loader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        setTimeout(() => showMessage('ALL SYSTEMS IMPROBABLY NORMAL'), 900);
      }, 350);
    }
    loaderNumber.textContent = String(Math.floor(amount)).padStart(2, '0');
  }, 90);
}

try {
  initUniverse();
  initScroll();
  initPointer();
  initActions();
  initLoader();
} catch (error) {
  console.error(error);
  loader.querySelector('p').textContent = 'RENDERING REALITY FAILED';
}
