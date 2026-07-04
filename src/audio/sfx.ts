/**
 * Sound effects synthesized with the Web Audio API — no audio assets.
 * Everything is guarded so the module is a no-op in non-browser (test)
 * environments and while muted.
 */

const STORAGE_KEY = '304-muted';

let ctx: AudioContext | null = null;
let muted =
  typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';

export const isMuted = () => muted;

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* private mode etc. — mute state just won't persist */
  }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  when?: number;
  slideTo?: number;
}

function tone(freq: number, dur: number, opts: ToneOpts = {}) {
  if (muted) return;
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + (opts.when ?? 0);
  const osc = c.createOscillator();
  osc.type = opts.type ?? 'triangle';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
  const gain = c.createGain();
  const peak = opts.gain ?? 0.1;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Band-passed noise burst — the "flick" of a card hitting the felt. */
function flick(dur = 0.05, gain = 0.16, when = 0, freq = 2400) {
  if (muted) return;
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + when;
  const length = Math.max(1, Math.ceil(c.sampleRate * dur));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.9;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  /** A card being played onto the table. */
  playCard: () => flick(0.05, 0.18, 0, 2600),
  /** A quick riffle for each deal. */
  deal: () => {
    for (let i = 0; i < 6; i++) flick(0.04, 0.09, i * 0.06, 1700 + i * 160);
  },
  bid: () => tone(540, 0.09, { type: 'sine', gain: 0.08 }),
  pass: () => tone(320, 0.12, { type: 'sine', gain: 0.06, slideTo: 230 }),
  /** Trick swept to the winner. */
  trick: () => {
    tone(660, 0.1, { gain: 0.07 });
    tone(880, 0.13, { when: 0.09, gain: 0.07 });
  },
  /** The hidden trump is flipped face up. */
  reveal: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, { when: i * 0.08, gain: 0.08 }));
  },
  roundWin: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, { when: i * 0.11, gain: 0.09 }));
  },
  roundLose: () => {
    [392, 330, 262].forEach((f, i) =>
      tone(f, 0.28, { when: i * 0.15, type: 'sawtooth', gain: 0.045 }),
    );
  },
};
