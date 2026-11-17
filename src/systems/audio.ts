// Som do jogo gerado por código (Web Audio): efeitos e música medieval.
// Não precisa de nenhum arquivo de áudio.

import { Save } from './save';

export type Sfx =
  | 'clang' | 'thud' | 'whoosh' | 'crack' | 'crumble' | 'coin' | 'horn'
  | 'launch' | 'boom' | 'victory' | 'defeat' | 'click' | 'thunder' | 'place';

type MusicMode = 'menu' | 'battle' | null;

// Ré dórico: notas em Hz
const N: Record<string, number> = {
  D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, Bb2: 116.54, C3: 130.81,
  D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, Bb3: 233.08, C4: 261.63,
  D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, Bb4: 466.16, C5: 523.25, D5: 587.33,
};

// Música épica em Ré menor: cordas graves, coro/metais e tambores de guerra.
// (sem melodias "saltitantes" — clima de batalha medieval séria)
const CHORDS = [
  { bass: 'D2', pad: ['D3', 'F3', 'A3'] }, // Ré menor
  { bass: 'Bb2', pad: ['Bb2', 'D3', 'F3'] }, // Si bemol
  { bass: 'C3', pad: ['C3', 'E3', 'G3'] }, // Dó
  { bass: 'A2', pad: ['A2', 'E3', 'A3'] }, // Lá (quinta, tensão)
];
// [passo inicial, nota, duração em passos] — 16 passos por compasso
type Phrase = [number, string, number][];
const BRASS_BATTLE: Phrase[] = [
  [[0, 'D4', 8], [8, 'F4', 4], [12, 'E4', 4]],
  [[0, 'D4', 8], [8, 'Bb3', 8]],
  [[0, 'C4', 8], [8, 'E4', 4], [12, 'G4', 4]],
  [[0, 'A3', 16]],
];
const CHOIR_MENU: Phrase[] = [
  [[0, 'A3', 12], [12, 'D4', 4]],
  [[0, 'F3', 16]],
  [[0, 'G3', 8], [8, 'E3', 8]],
  [[0, 'E3', 16]],
];

class AudioSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private noise!: AudioBuffer;
  private last = new Map<Sfx, number>();
  private mode: MusicMode = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private rainNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  constructor() {
    // navegadores só liberam som depois de um toque do usuário
    const unlock = () => {
      this.ensure();
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    // app minimizado (ou outra aba): silencia; voltou: continua
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  /** Efeitos sonoros ligados. */
  get enabled() {
    return Save.get().sound !== false;
  }

  setEnabled(v: boolean) {
    Save.get().sound = v;
    Save.persist();
    if (this.ctx) this.sfxGain.gain.setTargetAtTime(v ? 0.5 : 0, this.ctx.currentTime, 0.05);
  }

  /** Música ligada (botão de mudo da música, separado dos efeitos). */
  get musicOn() {
    return Save.get().music !== false;
  }

  setMusicOn(v: boolean) {
    Save.get().music = v;
    Save.persist();
    if (this.ctx) this.musicGain.gain.setTargetAtTime(v ? 0.16 : 0, this.ctx.currentTime, 0.1);
  }

  private ensure() {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 0.16 : 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.enabled ? 0.5 : 0;
    this.sfxGain.connect(this.master);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.mode) this.startScheduler();
  }

  // ---------------- blocos de som ----------------
  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, out: AudioNode, slideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(t: number, dur: number, vol: number, filter: BiquadFilterType, f0: number, f1: number, out: AudioNode, q = 1) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  }

  /** Toca um efeito sonoro (com limite para não embolar). */
  play(name: Sfx, volume = 1) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const minGap: Partial<Record<Sfx, number>> = { clang: 0.05, thud: 0.05, whoosh: 0.06, crack: 0.08, coin: 0.05 };
    const prev = this.last.get(name) ?? -1;
    if (now - prev < (minGap[name] ?? 0.02)) return;
    this.last.set(name, now);
    const out = this.ctx.createGain();
    out.gain.value = volume;
    out.connect(this.sfxGain);
    const p = 0.9 + Math.random() * 0.2; // variação de tom
    const t = now;
    switch (name) {
      case 'clang':
        // choque de espadas: harmônicos metálicos + chiado
        [1850, 2770, 4130, 5600].forEach((f, i) => this.tone(f * p, t, 0.22 - i * 0.03, i % 2 ? 'square' : 'sine', 0.12 / (i + 1), out));
        this.burst(t, 0.07, 0.35, 'bandpass', 5000, 2500, out, 2);
        break;
      case 'thud':
        this.tone(140 * p, t, 0.16, 'sine', 0.5, out, 55);
        this.burst(t, 0.09, 0.3, 'lowpass', 900, 200, out);
        break;
      case 'whoosh':
        this.burst(t, 0.18, 0.12, 'bandpass', 2600 * p, 700, out, 3);
        break;
      case 'crack':
        this.burst(t, 0.12, 0.35, 'lowpass', 1600, 300, out);
        this.tone(90 * p, t, 0.1, 'triangle', 0.25, out, 60);
        break;
      case 'crumble':
        this.burst(t, 1.1, 0.55, 'lowpass', 1400, 80, out);
        [0, 0.12, 0.27, 0.45].forEach((d) => this.tone(70 * p, t + d, 0.25, 'sine', 0.45, out, 35));
        break;
      case 'coin':
        this.tone(1320 * p, t, 0.09, 'square', 0.06, out);
        this.tone(1980 * p, t + 0.07, 0.16, 'square', 0.06, out);
        break;
      case 'horn': {
        // berrante do chefe
        const ctx = this.ctx;
        [110, 165, 220].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 900;
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(f * 0.94, t);
          o.frequency.linearRampToValueAtTime(f, t + 0.25);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.16 / (i + 1), t + 0.25);
          g.gain.setValueAtTime(0.16 / (i + 1), t + 1.1);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
          o.connect(lp).connect(g).connect(out);
          o.start(t);
          o.stop(t + 1.7);
        });
        break;
      }
      case 'launch':
        this.tone(220 * p, t, 0.12, 'triangle', 0.3, out, 90);
        this.burst(t, 0.25, 0.2, 'bandpass', 900, 300, out, 2);
        break;
      case 'boom':
        this.tone(80 * p, t, 0.4, 'sine', 0.7, out, 30);
        this.burst(t, 0.5, 0.5, 'lowpass', 1200, 100, out);
        break;
      case 'victory':
        ['C4', 'E4', 'G4', 'C5'].forEach((n, i) => this.tone(N[n] ?? 523, t + i * 0.14, 0.5, 'triangle', 0.25, out));
        this.tone(N.C4, t + 0.56, 0.9, 'triangle', 0.2, out);
        this.tone(N.G4, t + 0.56, 0.9, 'triangle', 0.15, out);
        break;
      case 'defeat':
        ['A4', 'F4', 'D4', 'A3'].forEach((n, i) => this.tone(N[n], t + i * 0.22, 0.6, 'triangle', 0.22, out));
        break;
      case 'click':
        this.tone(900, t, 0.04, 'square', 0.05, out);
        break;
      case 'place':
        this.tone(320 * p, t, 0.08, 'triangle', 0.2, out, 200);
        this.burst(t, 0.06, 0.15, 'lowpass', 1200, 400, out);
        break;
      case 'thunder':
        this.burst(t, 2.2, 0.6, 'lowpass', 700, 60, out);
        this.tone(50, t, 1.2, 'sine', 0.4, out, 30);
        break;
    }
  }

  // ---------------- chuva (ruído contínuo) ----------------
  setRain(on: boolean) {
    if (!this.ctx) return;
    if (on && !this.rainNode) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 1500;
      const g = this.ctx.createGain();
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.07, this.ctx.currentTime, 0.8);
      src.connect(f).connect(g).connect(this.sfxGain);
      src.start();
      this.rainNode = { src, gain: g };
    } else if (!on && this.rainNode) {
      const r = this.rainNode;
      r.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
      setTimeout(() => r.src.stop(), 1500);
      this.rainNode = null;
    }
  }

  // ---------------- música ----------------
  music(mode: MusicMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.step = 0;
    if (!mode) {
      if (this.timer) window.clearInterval(this.timer);
      this.timer = null;
      return;
    }
    if (this.ctx) this.startScheduler();
  }

  private startScheduler() {
    if (this.timer) window.clearInterval(this.timer);
    this.nextTime = this.ctx!.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 30);
  }

  private schedule() {
    if (!this.ctx || !this.mode) return;
    const battle = this.mode === 'battle';
    const stepDur = 60 / (battle ? 100 : 66) / 4;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime, battle);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  /** Voz sustentada (cordas / coro / metais): ataque lento, filtro grave. */
  private voice(freq: number, t: number, dur: number, vol: number, opts: { types: OscillatorType[]; cutoff: number; attack: number; release: number; vibrato?: number }) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = opts.cutoff;
    lp.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + opts.attack);
    g.gain.setValueAtTime(vol, t + Math.max(opts.attack, dur - opts.release));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + opts.release);
    lp.connect(g).connect(this.musicGain);
    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    if (opts.vibrato) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = 5;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = freq * opts.vibrato;
      lfo.connect(lfoGain);
      lfo.start(t);
      lfo.stop(t + dur + opts.release + 0.1);
    }
    opts.types.forEach((type, i) => {
      [-1, 1].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.detune.value = det * (6 + i * 4); // leve desafinação = som "largo" de orquestra
        if (lfoGain) lfoGain.connect(o.frequency);
        const og = ctx.createGain();
        og.gain.value = 0.5 / opts.types.length;
        o.connect(og).connect(lp);
        o.start(t);
        o.stop(t + dur + opts.release + 0.1);
      });
    });
  }

  /** Tambor de guerra grave (tipo taiko). */
  private warDrum(t: number, vol: number, low = 62) {
    this.tone(low, t, 0.45, 'sine', vol, this.musicGain, 36);
    this.burst(t, 0.12, vol * 0.5, 'lowpass', 500, 120, this.musicGain);
  }

  private playStep(step: number, t: number, battle: boolean) {
    const bar = Math.floor(step / 16) % 4;
    const loop = Math.floor(step / 64);
    const s = step % 16;
    const chord = CHORDS[bar];
    const stepDur = 60 / (battle ? 100 : 66) / 4;

    if (battle) {
      // cordas graves em colcheias (ostinato tenso)
      if (s % 2 === 0) {
        const pattern = [chord.bass, chord.bass, chord.pad[2], chord.bass, chord.bass, chord.pad[1], chord.pad[2], chord.bass];
        const n = pattern[(s / 2) % 8];
        this.voice(N[n] ?? N[chord.bass], t, stepDur * 1.6, 0.11, { types: ['sawtooth'], cutoff: 750, attack: 0.01, release: 0.06 });
      }
      // acorde de fundo (pad)
      if (s === 0) chord.pad.forEach((n) => this.voice(N[n], t, stepDur * 16, 0.05, { types: ['sawtooth', 'triangle'], cutoff: 1100, attack: 0.5, release: 0.6 }));
      // metais (frase heroica) — entram a partir da 2ª volta
      if (loop % 2 === 1) {
        for (const [st, n, len] of BRASS_BATTLE[bar]) {
          if (st === s) this.voice(N[n], t, stepDur * len, 0.13, { types: ['sawtooth', 'square'], cutoff: 1500, attack: 0.08, release: 0.25, vibrato: 0.004 });
        }
      }
      // tambores de guerra
      if (s === 0 || s === 6 || s === 8) this.warDrum(t, 0.6);
      if (s === 12 || (bar === 3 && s === 14)) this.warDrum(t, 0.45, 80);
      if (s === 4 || s === 12) this.burst(t, 0.08, 0.08, 'bandpass', 1200, 700, this.musicGain, 1.5);
    } else {
      // menu: coro suave + acorde + harpa grave, bem calmo
      if (s === 0) chord.pad.forEach((n) => this.voice(N[n], t, stepDur * 16, 0.05, { types: ['triangle', 'sawtooth'], cutoff: 900, attack: 1.0, release: 1.2 }));
      for (const [st, n, len] of CHOIR_MENU[bar]) {
        if (st === s) this.voice(N[n], t, stepDur * len, 0.08, { types: ['sine', 'triangle'], cutoff: 1800, attack: 0.6, release: 0.8, vibrato: 0.006 });
      }
      if (s % 4 === 0) {
        const n = chord.pad[(s / 4) % 3];
        this.tone((N[n] ?? 146) / 2, t, 1.2, 'triangle', 0.08, this.musicGain);
      }
      if (s === 0) this.warDrum(t, 0.3, 55);
    }
  }
}

export const Sound = new AudioSystem();
