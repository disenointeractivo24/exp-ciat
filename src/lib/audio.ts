// Procedural soundscape (no audio files): wind, water, birds by day; crickets & frogs by night.

class Soundscape {
  ctx: AudioContext | null = null;
  master!: GainNode;
  day!: GainNode;
  nightBus!: GainNode;
  wind!: GainNode;
  water!: GainNode;
  nightMix = 0;
  focus = 0; // seated contemplation boost
  enabled = true;
  private timers: number[] = [];

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.day = ctx.createGain(); this.day.connect(this.master);
    this.nightBus = ctx.createGain(); this.nightBus.gain.value = 0; this.nightBus.connect(this.master);

    const noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = 0.985 * b + 0.015 * w; d[i] = b * 6 + w * 0.08; }

    // wind
    const wsrc = ctx.createBufferSource(); wsrc.buffer = noise; wsrc.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 0.6;
    this.wind = ctx.createGain(); this.wind.gain.value = 0.12;
    wsrc.connect(wf).connect(this.wind).connect(this.master);
    wsrc.start();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 0.06;
    lfo.connect(lg).connect(this.wind.gain); lfo.start();

    // water lapping
    const asrc = ctx.createBufferSource(); asrc.buffer = noise; asrc.loop = true; asrc.playbackRate.value = 0.7;
    const af = ctx.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 700;
    this.water = ctx.createGain(); this.water.gain.value = 0.05;
    asrc.connect(af).connect(this.water).connect(this.master);
    asrc.start();
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.31;
    const lg2 = ctx.createGain(); lg2.gain.value = 0.035;
    lfo2.connect(lg2).connect(this.water.gain); lfo2.start();

    this.schedule(() => this.birdPhrase(), 1400, 4200);
    this.schedule(() => this.cricket(), 160, 520);
    this.schedule(() => this.frog(), 1500, 4000);
    this.apply();
  }

  private schedule(fn: () => void, min: number, max: number) {
    const loop = () => {
      fn();
      this.timers.push(window.setTimeout(loop, min + Math.random() * (max - min)));
    };
    this.timers.push(window.setTimeout(loop, min));
  }

  private pan(dst: AudioNode) {
    const ctx = this.ctx!;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.random() * 1.6 - 0.8;
    p.connect(dst);
    return p;
  }

  birdPhrase() {
    const ctx = this.ctx!;
    if (this.nightMix > 0.7) return;
    const out = this.pan(this.day);
    const t0 = ctx.currentTime + 0.02;
    const kind = Math.floor(Math.random() * 3);
    const notes = 3 + Math.floor(Math.random() * 5);
    const base = 2200 + Math.random() * 1800;
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      const t = t0 + i * (kind === 0 ? 0.11 : kind === 1 ? 0.18 : 0.07);
      const f = base * (kind === 1 ? 1 - i * 0.06 : 1 + Math.sin(i) * 0.15);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (kind === 2 ? 1.5 : 0.75), t + 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.03, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + 0.12);
    }
  }

  cricket() {
    const ctx = this.ctx!;
    if (this.nightMix < 0.2) return;
    const out = this.pan(this.nightBus);
    const t0 = ctx.currentTime + 0.01;
    const f = 4300 + Math.random() * 600;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f;
      const t = t0 + i * 0.045;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.018, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.04);
    }
  }

  frog() {
    const ctx = this.ctx!;
    if (this.nightMix < 0.3) return;
    const out = this.pan(this.nightBus);
    const t0 = ctx.currentTime + 0.01;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 900;
      const t = t0 + i * 0.22;
      o.frequency.setValueAtTime(260 + Math.random() * 80, t);
      o.frequency.exponentialRampToValueAtTime(170, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 0.2);
    }
  }

  chime() {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const t0 = ctx.currentTime + 0.02;
    [784, 988, 1175, 1568].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = t0 + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 1.5);
    });
  }

  click() {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.05);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.08);
  }

  setNight(m: number) { if (Math.abs(m - this.nightMix) > 0.02) { this.nightMix = m; this.apply(); } }
  setFocus(f: number) { this.focus = f; this.apply(); }
  setEnabled(e: boolean) { this.enabled = e; this.apply(); }

  apply() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = this.enabled ? 0.55 + this.focus * 0.45 : 0;
    this.master.gain.setTargetAtTime(vol, t, 0.6);
    this.day.gain.setTargetAtTime(1 - this.nightMix * 0.9, t, 0.8);
    this.nightBus.gain.setTargetAtTime(this.nightMix, t, 0.8);
    this.wind.gain.setTargetAtTime(0.12 - this.nightMix * 0.05, t, 0.8);
  }
}

export const sound = new Soundscape();
