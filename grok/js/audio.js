const TUNINGS = [
  { drone: 49.0, fifth: 73.5, shimmer: 196.0 },
  { drone: 61.74, fifth: 92.5, shimmer: 246.94 },
  { drone: 55.0, fifth: 82.5, shimmer: 220.0 },
  { drone: 43.65, fifth: 65.41, shimmer: 174.61 },
  { drone: 65.41, fifth: 98.0, shimmer: 261.63 },
  { drone: 36.71, fifth: 55.0, shimmer: 146.83 },
];

export class Soundscape {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.data = null;
    this.nodes = null;
    this.muted = false;
    this.started = false;
    this.targetVol = 0.2;
  }

  async start() {
    if (this.started) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    master.connect(analyser);
    this.analyser = analyser;
    this.data = new Uint8Array(analyser.frequencyBinCount);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.7;

    const delay = ctx.createDelay();
    delay.delayTime.value = 0.28;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    delay.connect(fb);
    fb.connect(delay);
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.22;
    delay.connect(delayGain);
    delayGain.connect(master);

    filter.connect(master);
    filter.connect(delay);

    const makeOsc = (type, freq, gain) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g);
      g.connect(filter);
      o.start();
      return { o, g };
    };

    const drone = makeOsc("sine", 49, 0.22);
    const drone2 = makeOsc("triangle", 49.15, 0.07);
    const fifth = makeOsc("sine", 73.5, 0.08);
    const shimmer = makeOsc("sine", 196, 0.03);

    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const n = noiseBuf.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 900;
    noiseFilter.Q.value = 0.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.018;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(filter);
    noise.start();

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    this.nodes = { filter, drone, drone2, fifth, shimmer, noiseGain };
    this.started = true;

    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(this.muted ? 0 : this.targetVol, now + 2.4);
  }

  setWorld(w) {
    if (!this.nodes || !this.ctx) return;
    const i = Math.max(0, Math.min(5, w));
    const a = TUNINGS[Math.floor(i)];
    const b = TUNINGS[Math.min(5, Math.floor(i) + 1)];
    const f = i - Math.floor(i);
    const lerp = (x, y) => x + (y - x) * f;
    const t = this.ctx.currentTime;
    const glide = 1.6;
    this.nodes.drone.o.frequency.linearRampToValueAtTime(lerp(a.drone, b.drone), t + glide);
    this.nodes.drone2.o.frequency.linearRampToValueAtTime(lerp(a.drone, b.drone) * 1.003, t + glide);
    this.nodes.fifth.o.frequency.linearRampToValueAtTime(lerp(a.fifth, b.fifth), t + glide);
    this.nodes.shimmer.o.frequency.linearRampToValueAtTime(lerp(a.shimmer, b.shimmer), t + glide);
    this.nodes.filter.frequency.linearRampToValueAtTime(540 + i * 90, t + glide);
  }

  pulse() {
    if (!this.ctx || !this.nodes || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 220 + Math.random() * 180;
    const g = ctx.createGain();
    g.gain.value = 0.0;
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.stop(t + 1.2);

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.value = 0.05;
    const nf = ctx.createBiquadFilter();
    nf.type = "highpass";
    nf.frequency.value = 1200;
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(this.master);
    noise.start(t);
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.master || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : this.targetVol, t + 0.25);
  }

  getLevel() {
    if (!this.analyser || !this.data) return 0;
    this.analyser.getByteTimeDomainData(this.data);
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) {
      const v = (this.data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / this.data.length);
  }
}
