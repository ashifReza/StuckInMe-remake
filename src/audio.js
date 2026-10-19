// All sound is synthesized with WebAudio, so the game ships with no audio files.
let ctx = null;
let master, musicBus, sfxBus;
let muted = false;
let current = null;
let noiseBuf = null;

const VOL = 0.7;

function ensureNoise() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function tone(type, f0, f1, dur, vol, delay = 0, bus = sfxBus) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol, freq, ftype = 'bandpass', delay = 0, q = 1) {
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource();
  s.buffer = ensureNoise();
  const f = ctx.createBiquadFilter();
  f.type = ftype;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(sfxBus);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

const SFX = {
  punch: () => { noise(0.08, 0.5, 1400, 'bandpass', 0, 0.8); tone('square', 200, 90, 0.07, 0.08); },
  kick: () => { noise(0.14, 0.55, 700, 'lowpass'); tone('sine', 140, 45, 0.16, 0.35); },
  ember: () => { noise(0.2, 0.4, 900, 'bandpass'); tone('sawtooth', 160, 60, 0.18, 0.12); },
  hit: () => { tone('square', 420, 110, 0.08, 0.12); noise(0.06, 0.4, 3000, 'highpass'); },
  clink: () => { tone('square', 1900, 1500, 0.06, 0.08); tone('sine', 2600, 2400, 0.12, 0.08); },
  jump: () => tone('triangle', 280, 560, 0.1, 0.12),
  djump: () => { tone('sine', 500, 900, 0.14, 0.12); noise(0.12, 0.15, 4000, 'highpass'); },
  land: () => noise(0.06, 0.15, 400, 'lowpass'),
  dash: () => noise(0.2, 0.35, 2400, 'highpass'),
  beam: () => { tone('sawtooth', 180, 900, 0.45, 0.14); tone('sine', 880, 1320, 0.5, 0.2); noise(0.45, 0.25, 1800, 'bandpass'); },
  crescent: () => tone('sine', 700, 1400, 0.25, 0.14),
  hurt: () => { tone('sawtooth', 320, 60, 0.3, 0.2); noise(0.2, 0.4, 600, 'lowpass'); },
  enemyDie: () => { noise(0.35, 0.4, 500, 'lowpass'); tone('sine', 220, 40, 0.35, 0.25); },
  shoot: () => tone('triangle', 600, 300, 0.2, 0.1),
  howl: () => { tone('sawtooth', 120, 70, 0.7, 0.15); tone('sawtooth', 123, 72, 0.7, 0.12); },
  heal: () => { tone('sine', 400, 800, 0.5, 0.18); tone('sine', 600, 1200, 0.5, 0.1, 0.1); },
  pickup: () => { tone('sine', 880, 880, 0.08, 0.12); tone('sine', 1320, 1320, 0.12, 0.12, 0.07); },
  unlock: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone('sine', f, f, 0.5, 0.16, i * 0.09)),
  door: () => [392, 494, 587, 784].forEach((f, i) => tone('triangle', f, f * 1.01, 0.8, 0.1, i * 0.12)),
  select: () => tone('sine', 660, 660, 0.06, 0.08),
  confirm: () => { tone('sine', 660, 660, 0.08, 0.1); tone('sine', 990, 990, 0.12, 0.1, 0.06); },
  page: () => noise(0.18, 0.12, 2500, 'bandpass', 0, 0.5),
  roar: () => { tone('sawtooth', 90, 45, 1.2, 0.25); tone('sawtooth', 93, 47, 1.2, 0.2); noise(1, 0.3, 300, 'lowpass'); },
  bossHit: () => { tone('square', 300, 80, 0.1, 0.12); noise(0.1, 0.35, 1500, 'bandpass'); },
  thorn: () => { noise(0.25, 0.4, 900, 'bandpass'); tone('square', 120, 60, 0.2, 0.08); },
  gameover: () => [392, 349, 311, 262].forEach((f, i) => tone('triangle', f, f, 0.9, 0.12, i * 0.35)),
  heartbeat: () => { tone('sine', 70, 40, 0.18, 0.45); tone('sine', 66, 38, 0.22, 0.35, 0.24); },
  whisper: () => { noise(0.7, 0.18, 2200, 'bandpass', 0, 3); tone('sawtooth', 110, 90, 0.6, 0.04); },
  shatter: () => { noise(0.6, 0.6, 3500, 'highpass'); noise(0.9, 0.5, 400, 'lowpass'); [1800, 2400, 3100].forEach((f, i) => tone('square', f, f * 0.7, 0.3, 0.05, i * 0.05)); },
  victory: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone('sine', f, f, 0.7, 0.14, i * 0.16)),
};

// Each theme: root frequency, scale (semitones), pulse = boss heartbeat
const THEMES = {
  menu: { root: 110, scale: [0, 3, 7, 10, 12, 15], cutoff: 700 },
  story: { root: 98, scale: [0, 3, 5, 7, 10, 12], cutoff: 600 },
  level: { root: 110, scale: [0, 2, 3, 7, 8, 12], cutoff: 900 },
  boss: { root: 82.4, scale: [0, 1, 5, 7, 8, 12], cutoff: 1300, pulse: true },
  ending: { root: 130.8, scale: [0, 4, 7, 9, 12, 16], cutoff: 1200 },
};

function startMusic(name, variant = 0) {
  const th = THEMES[name];
  const root = th.root * Math.pow(2, (variant % 5) / 12);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, ctx.currentTime);
  out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.5);
  out.connect(musicBus);

  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = th.cutoff;
  filt.connect(out);
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoG.gain.value = th.cutoff * 0.4;
  lfo.connect(lfoG).connect(filt.frequency);
  lfo.start();

  const nodes = [lfo];
  // Drone pad
  [[1, 'sawtooth', 0.05], [1.5, 'triangle', 0.06], [2.003, 'sine', 0.05], [0.5, 'sine', 0.12]].forEach(([m, type, v]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = root * m;
    o.detune.value = (Math.random() - 0.5) * 12;
    const g = ctx.createGain();
    g.gain.value = v;
    o.connect(g).connect(filt);
    o.start();
    nodes.push(o);
  });

  // Music-box bells drifting over the drone
  let step = 0;
  const bell = () => {
    if (!ctx) return;
    const semis = th.scale[Math.floor(Math.random() * th.scale.length)];
    const f = root * 4 * Math.pow(2, semis / 12);
    tone('sine', f, f, 2.2, 0.05, 0, out);
    tone('sine', f * 2, f * 2, 0.8, 0.012, 0, out);
    if (th.pulse) {
      tone('sine', 60, 40, 0.25, 0.3, 0, out);
      if (step % 2 === 0) tone('sine', 60, 40, 0.25, 0.22, 0.22, out);
      noise(0.1, 0.05, 6000, 'highpass');
    }
    step++;
  };
  const interval = setInterval(bell, th.pulse ? 750 : 1300 + Math.random() * 600);
  return { out, nodes, interval, name, variant };
}

function stopMusic(m) {
  if (!m) return;
  clearInterval(m.interval);
  const t = ctx.currentTime;
  m.out.gain.cancelScheduledValues(t);
  m.out.gain.setValueAtTime(Math.max(m.out.gain.value, 0.0001), t);
  m.out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  m.nodes.forEach((n) => n.stop(t + 1.3));
}

export const Audio = {
  init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOL;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.5;
      musicBus.connect(master);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.8;
      sfxBus.connect(master);
    } catch (e) {
      ctx = null;
    }
  },
  play(name) {
    if (!ctx || muted || !SFX[name]) return;
    SFX[name]();
  },
  music(name, variant = 0) {
    if (!ctx) return;
    if (current && current.name === name && current.variant === variant) return;
    stopMusic(current);
    current = startMusic(name, variant);
  },
  toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : VOL;
    return muted;
  },
  get muted() {
    return muted;
  },
};
