// Som de venda estilo Eduzz — "ding" de sino agudo curto.
// Carregado de /sounds/sale-ding.mp3 (servido pelo /public).

let coinAudio: HTMLAudioElement | null = null;
let pingAudio: HTMLAudioElement | null = null;
let unlocked = false;

function getCoin(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!coinAudio) {
    coinAudio = new Audio("/sounds/sale-ding.mp3");
    coinAudio.preload = "auto";
    coinAudio.volume = 0.85;
  }
  return coinAudio;
}

function getPing(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!pingAudio) {
    // Reutiliza o mesmo arquivo em volume mais baixo para o "ping" de novo lead
    pingAudio = new Audio("/sounds/sale-ding.mp3");
    pingAudio.preload = "auto";
    pingAudio.volume = 0.35;
  }
  return pingAudio;
}

/** Destrava o áudio na primeira interação do usuário (requisito dos navegadores). */
export function unlockAudio() {
  if (unlocked) return;
  const a = getCoin();
  if (!a) return;
  a.muted = true;
  a.play().then(() => {
    a.pause();
    a.currentTime = 0;
    a.muted = false;
    unlocked = true;
  }).catch(() => { /* ignora — destrava na próxima tentativa */ });
}

export function playCoinSound() {
  const a = getCoin();
  if (!a) return;
  try {
    a.currentTime = 0;
    void a.play().catch((e) => console.warn("[coin] play falhou", e));
  } catch (e) { console.warn("[coin]", e); }
}

export function playPingSound() {
  const a = getPing();
  if (!a) return;
  try {
    a.currentTime = 0;
    void a.play().catch(() => { /* silencioso */ });
  } catch { /* noop */ }
}
