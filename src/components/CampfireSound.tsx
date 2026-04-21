import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { fireEvents } from "@/lib/fire-events";

const STORAGE_KEY = "fire_campfire_sound";

/**
 * Procedural campfire crackle synthesized with Web Audio API.
 * - Continuous brown-noise bed (low rumble of flames)
 * - Random "crackle" pops scheduled in a loop
 * - Zero audio files; toggle persisted in localStorage
 */
export function CampfireSound() {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);
  const crackleTimerRef = useRef<number | null>(null);

  // restore preference
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        // wait for user interaction; we don't auto-play.
        // We just remember the preference and let them re-enable.
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      ctxRef.current = ctx;
      await ctx.resume();

      // Master gain — soft volume
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      masterRef.current = master;
      // fade in
      master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.6);

      // ---- Brown noise bed (warm flame rumble) ----
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      noise.loop = true;

      // shape it: lowpass for warm rumble + slow LFO for "breathing"
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      lp.Q.value = 0.6;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.55;

      // LFO modulating noiseGain to mimic fire breathing
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.18;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.18;
      lfo.connect(lfoGain).connect(noiseGain.gain);
      lfo.start();

      noise.connect(lp).connect(noiseGain).connect(master);
      noise.start();
      noiseRef.current = noise;

      // ---- Random crackles ----
      const scheduleCrackle = () => {
        if (!ctxRef.current || !masterRef.current) return;
        const now = ctxRef.current.currentTime;

        // Burst of 1-4 short pops
        const pops = 1 + Math.floor(Math.random() * 4);
        for (let i = 0; i < pops; i++) {
          const t = now + i * (0.02 + Math.random() * 0.05);
          createPop(ctxRef.current, masterRef.current, t);
          // Fire a visual spark in sync with each pop's onset time
          const lead = Math.max(0, (t - now) * 1000);
          window.setTimeout(() => fireEvents.emitCrackle(), lead);
        }

        // Next crackle in 180–900ms
        const delay = 180 + Math.random() * 720;
        crackleTimerRef.current = window.setTimeout(scheduleCrackle, delay);
      };
      scheduleCrackle();

      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    } catch {
      // Audio not supported / blocked
    }
  };

  const stop = () => {
    if (crackleTimerRef.current) {
      clearTimeout(crackleTimerRef.current);
      crackleTimerRef.current = null;
    }
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      const closeAt = ctx.currentTime + 0.5;
      const targetCtx = ctx;
      setTimeout(() => {
        try { noiseRef.current?.stop(); } catch { /* ignore */ }
        try { targetCtx.close(); } catch { /* ignore */ }
      }, Math.max(0, (closeAt - ctx.currentTime) * 1000));
    }
    ctxRef.current = null;
    masterRef.current = null;
    noiseRef.current = null;
    try { localStorage.setItem(STORAGE_KEY, "0"); } catch { /* ignore */ }
  };

  const toggle = async () => {
    if (enabled) {
      stop();
      setEnabled(false);
    } else {
      await start();
      setEnabled(true);
    }
  };

  return (
    <button
      onClick={toggle}
      data-spark="gold"
      aria-label={enabled ? "Desligar som de fogueira" : "Ligar som de fogueira"}
      title={enabled ? "Som de fogueira: ligado" : "Som de fogueira: ligado em silêncio — clique para ativar"}
      className={cn(
        "fixed bottom-5 right-5 z-50 h-11 w-11 rounded-full border backdrop-blur-xl",
        "flex items-center justify-center shadow-card-premium transition-all",
        enabled
          ? "bg-primary/15 border-primary/50 text-primary shadow-fire"
          : "bg-card/80 border-border text-muted-foreground hover:text-primary hover:border-primary/40",
      )}
    >
      {enabled ? (
        <>
          <Volume2 className="h-5 w-5" />
          <span className="absolute inset-0 rounded-full border border-primary/40 animate-pulse-glow pointer-events-none" />
        </>
      ) : (
        <VolumeX className="h-5 w-5" />
      )}
    </button>
  );
}

function createPop(ctx: AudioContext, dest: AudioNode, when: number) {
  // Tiny noise burst with sharp envelope = crackle pop
  const dur = 0.04 + Math.random() * 0.08;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length); // decaying noise
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1200 + Math.random() * 3200;
  bp.Q.value = 1.4 + Math.random() * 1.5;

  const g = ctx.createGain();
  const peak = 0.06 + Math.random() * 0.12;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peak, when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  src.connect(bp).connect(g).connect(dest);
  src.start(when);
  src.stop(when + dur + 0.01);
}