import { useEffect, useRef } from "react";
import { fireEvents } from "@/lib/fire-events";

/**
 * Performant canvas of floating ember particles. Subtle, fixed background.
 * Auto-pauses if reduced motion is preferred or tab is hidden.
 */
export function EmberCanvas({ density = 25, className }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // Mobile-friendly: cap DPR and density to keep 60fps on low-end devices
    const isMobile = window.matchMedia?.("(max-width: 768px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5);
    const effectiveDensity = isMobile ? Math.round(density * 0.35) : density;
    // Throttle to ~30fps to dramatically reduce CPU on low-end devices
    const FRAME_INTERVAL = 1000 / 30;
    let lastFrame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    type Particle = {
      x: number; y: number; vx: number; vy: number;
      r: number; life: number; maxLife: number; hue: number;
      burst?: boolean;
    };

    const spawn = (originX?: number, originY?: number, burst = false): Particle => {
      const hueChoices = [18, 28, 38, 45]; // ember oranges/golds
      return {
        x: originX ?? Math.random() * width,
        y: originY ?? height + Math.random() * 40,
        vx: burst ? (Math.random() - 0.5) * 1.6 : (Math.random() - 0.5) * 0.25,
        vy: burst ? -(0.6 + Math.random() * 1.6) : -(0.25 + Math.random() * 0.6),
        r: burst ? 1.0 + Math.random() * 1.8 : 0.6 + Math.random() * 1.6,
        life: 0,
        maxLife: burst ? 80 + Math.random() * 140 : 220 + Math.random() * 380,
        hue: hueChoices[Math.floor(Math.random() * hueChoices.length)],
        burst,
      };
    };

    const particles: Particle[] = Array.from({ length: effectiveDensity }, () => {
      const p = spawn();
      p.y = Math.random() * height;
      p.life = Math.random() * p.maxLife;
      return p;
    });
    // Transient burst sparks (spawned by audio crackles), pruned on death
    const burstParticles: Particle[] = [];
    const MAX_BURSTS = isMobile ? 60 : 140;

    const unsubscribe = fireEvents.on((x, y) => {
      // Default burst origin: bottom band, random X
      const ox = x ?? Math.random() * width;
      const oy = y ?? height - 30 - Math.random() * Math.min(140, height * 0.25);
      const count = isMobile ? 4 + Math.floor(Math.random() * 3) : 6 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        if (burstParticles.length >= MAX_BURSTS) break;
        burstParticles.push(spawn(ox + (Math.random() - 0.5) * 18, oy, true));
      }
    });

    let raf = 0;
    let running = true;

    const tick = (now: number = 0) => {
      if (now - lastFrame < FRAME_INTERVAL) {
        if (running) raf = requestAnimationFrame(tick);
        return;
      }
      lastFrame = now;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      // Steady ambient particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life += 1;
        p.x += p.vx + Math.sin((p.life + i * 13) * 0.01) * 0.15;
        p.y += p.vy;
        if (p.life >= p.maxLife || p.y < -10) {
          particles[i] = spawn();
          continue;
        }
        drawParticle(ctx, p, 0.55);
      }
      // Transient bursts (audio-synced) — drawn brighter
      for (let i = burstParticles.length - 1; i >= 0; i--) {
        const p = burstParticles[i];
        p.life += 1;
        // Slight gravity slowdown so they arc upward then fade
        p.vy += 0.012;
        p.x += p.vx;
        p.y += p.vy;
        if (p.life >= p.maxLife || p.y < -10) {
          burstParticles.splice(i, 1);
          continue;
        }
        drawParticle(ctx, p, 0.95);
      }
      if (running) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribe();
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={
        className ??
        "pointer-events-none fixed inset-0 -z-[1] h-full w-full opacity-60"
      }
    />
  );
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number; r: number; life: number; maxLife: number; hue: number },
  intensity: number,
) {
  const lifeRatio = p.life / p.maxLife;
  const alpha =
    lifeRatio < 0.15 ? lifeRatio / 0.15 :
    lifeRatio > 0.7 ? Math.max(0, 1 - (lifeRatio - 0.7) / 0.3) :
    1;
  const a = alpha * intensity;
  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
  grad.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${a})`);
  grad.addColorStop(0.4, `hsla(${p.hue}, 100%, 50%, ${a * 0.4})`);
  grad.addColorStop(1, `hsla(${p.hue}, 100%, 40%, 0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
  ctx.fill();
}