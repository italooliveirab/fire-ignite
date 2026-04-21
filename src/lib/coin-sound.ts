// Som "moedas caindo" sintetizado via Web Audio. Sem precisar de MP3.
// Funciona após primeira interação do usuário (política de autoplay dos browsers).
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function coinPing(c: AudioContext, when: number, freq: number, dur = 0.18, gain = 0.25) {
  const osc = c.createOscillator();
  const env = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = freq;
  filt.Q.value = 8;
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, when);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, when + dur);
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(gain, when + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(filt).connect(env).connect(c.destination);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

/** Toca som de moedas caindo (várias notas ricocheteando). */
export function playCoinSound() {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + 0.02;
  // sequência de "pings" descendentes simulando moedas caindo
  const notes: Array<[number, number, number]> = [
    [t0 + 0.00, 1760, 0.28],
    [t0 + 0.07, 1480, 0.22],
    [t0 + 0.14, 2090, 0.20],
    [t0 + 0.22, 1320, 0.24],
    [t0 + 0.32, 1760, 0.18],
    [t0 + 0.40, 990, 0.30],
    [t0 + 0.52, 1480, 0.16],
    [t0 + 0.62, 880, 0.34],
  ];
  notes.forEach(([t, f, d]) => coinPing(c, t, f, d, 0.22));
  // "boom" baixo final pra dar peso
  const boom = c.createOscillator();
  const env = c.createGain();
  boom.type = "sine";
  boom.frequency.setValueAtTime(180, t0 + 0.65);
  boom.frequency.exponentialRampToValueAtTime(60, t0 + 1.0);
  env.gain.setValueAtTime(0, t0 + 0.65);
  env.gain.linearRampToValueAtTime(0.18, t0 + 0.68);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 1.0);
  boom.connect(env).connect(c.destination);
  boom.start(t0 + 0.65);
  boom.stop(t0 + 1.05);
}

/** Som curto pra eventos secundários (novo lead, pagamento gerado). */
export function playPingSound() {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + 0.02;
  coinPing(c, t0, 1320, 0.18, 0.18);
  coinPing(c, t0 + 0.09, 1760, 0.16, 0.16);
}

/** Garante que o AudioContext está "destravado" — chamar dentro de um handler de clique. */
export function unlockAudio() {
  getCtx();
}
