import { useEffect, useRef } from "react";

/**
 * Performant canvas of floating ember particles. Subtle, fixed background.
 * Auto-pauses if reduced motion is preferred or tab is hidden.
 */
export function EmberCanvas({ density = 50, className }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    };

    const spawn = (): Particle => {
      const hueChoices = [18, 28, 38, 45]; // ember oranges/golds
      return {
        x: Math.random() * width,
        y: height + Math.random() * 40,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.25 + Math.random() * 0.6),
        r: 0.6 + Math.random() * 1.6,
        life: 0,
        maxLife: 220 + Math.random() * 380,
        hue: hueChoices[Math.floor(Math.random() * hueChoices.length)],
      };
    };

    const particles: Particle[] = Array.from({ length: density }, () => {
      const p = spawn();
      p.y = Math.random() * height;
      p.life = Math.random() * p.maxLife;
      return p;
    });

    let raf = 0;
    let running = true;

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life += 1;
        p.x += p.vx + Math.sin((p.life + i * 13) * 0.01) * 0.15;
        p.y += p.vy;
        if (p.life >= p.maxLife || p.y < -10) {
          particles[i] = spawn();
          continue;
        }
        const lifeRatio = p.life / p.maxLife;
        const alpha =
          lifeRatio < 0.15 ? lifeRatio / 0.15 :
          lifeRatio > 0.7 ? Math.max(0, 1 - (lifeRatio - 0.7) / 0.3) :
          1;
        const a = alpha * 0.55;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grad.addColorStop(0, `hsla(${p.hue}, 100%, 65%, ${a})`);
        grad.addColorStop(0.4, `hsla(${p.hue}, 100%, 50%, ${a * 0.4})`);
        grad.addColorStop(1, `hsla(${p.hue}, 100%, 40%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();
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