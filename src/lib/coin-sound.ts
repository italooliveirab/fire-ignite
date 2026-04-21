// "Cha-ching" estilo Kiwify/Eduzz: sino metálico brilhante (FM) + cascata de moedas + sustain.
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// Sino metálico via FM (carrier + modulator) — núcleo do "ching!".
function bell(c: AudioContext, when: number, freq: number, dur = 1.6, gain = 0.35) {
  const out = masterGain ?? c.destination;
  const carrier = c.createOscillator();
  const mod = c.createOscillator();
  const modGain = c.createGain();
  const env = c.createGain();
  const hp = c.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 600;

  carrier.type = "sine";
  mod.type = "sine";
  carrier.frequency.value = freq;
  // razão inarmônica = brilho metálico
  mod.frequency.value = freq * 3.01;
  modGain.gain.setValueAtTime(freq * 4.5, when);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.4, when + dur);

  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(gain, when + 0.004);
  env.gain.exponentialRampToValueAtTime(0.001, when + dur);

  mod.connect(modGain).connect(carrier.frequency);
  carrier.connect(hp).connect(env).connect(out);
  carrier.start(when); mod.start(when);
  carrier.stop(when + dur + 0.05); mod.stop(when + dur + 0.05);
}

// "Tilintar" curto de moeda (banda alta com decaimento rápido).
function coinTink(c: AudioContext, when: number, freq: number, dur = 0.14, gain = 0.18) {
  const out = masterGain ?? c.destination;
  const osc = c.createOscillator();
  const env = c.createGain();
  const bp = c.createBiquadFilter();
  bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 14;
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, when);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.7, when + dur);
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(gain, when + 0.003);
  env.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(bp).connect(env).connect(out);
  osc.start(when); osc.stop(when + dur + 0.04);
}

// Ruído branco curto = "shimmer" do sino.
function shimmer(c: AudioContext, when: number, dur = 0.3, gain = 0.08) {
  const out = masterGain ?? c.destination;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const src = c.createBufferSource();
  const hp = c.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 4000;
  const env = c.createGain();
  env.gain.setValueAtTime(gain, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + dur);
  src.buffer = buf;
  src.connect(hp).connect(env).connect(out);
  src.start(when); src.stop(when + dur);
}

/** Som "cha-ching" de venda (Kiwify/Eduzz style). */
export function playCoinSound() {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + 0.02;

  // 1) "CHA!" — sino brilhante batendo
  bell(c, t0, 1760, 1.4, 0.35);          // A6 metálico
  bell(c, t0 + 0.005, 2637, 1.2, 0.22);  // E7 — adiciona brilho
  shimmer(c, t0, 0.25, 0.10);

  // 2) "CHING!" — segundo toque do sino, mais alto, sustain longo
  bell(c, t0 + 0.18, 2349, 1.8, 0.32);   // D7
  bell(c, t0 + 0.185, 3520, 1.4, 0.18);  // A7 — sparkle
  shimmer(c, t0 + 0.18, 0.35, 0.09);

  // 3) Cascata de moedas caindo (tinidos rápidos descendentes)
  const coins: Array<[number, number]> = [
    [0.30, 3136], [0.36, 2637], [0.42, 3520], [0.48, 2093],
    [0.55, 2794], [0.62, 1760], [0.70, 2349], [0.79, 1568],
    [0.88, 1976], [0.98, 1318],
  ];
  coins.forEach(([dt, f], i) => coinTink(c, t0 + dt, f, 0.12, 0.16 - i * 0.008));

  // 4) "Boom" baixo discreto pra dar peso (caixa registradora)
  const out = masterGain ?? c.destination;
  const boom = c.createOscillator();
  const env = c.createGain();
  boom.type = "sine";
  boom.frequency.setValueAtTime(140, t0);
  boom.frequency.exponentialRampToValueAtTime(50, t0 + 0.4);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(0.22, t0 + 0.01);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
  boom.connect(env).connect(out);
  boom.start(t0); boom.stop(t0 + 0.5);
}

/** Som curto pra eventos secundários (novo lead, pagamento gerado). */
export function playPingSound() {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + 0.02;
  bell(c, t0, 1760, 0.6, 0.22);
  bell(c, t0 + 0.08, 2637, 0.5, 0.14);
  shimmer(c, t0, 0.15, 0.06);
}

/** Garante que o AudioContext está "destravado" — chamar dentro de um handler de clique. */
export function unlockAudio() {
  getCtx();
}
