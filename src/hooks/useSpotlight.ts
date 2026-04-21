import { useCallback, useRef } from "react";

/**
 * Tracks cursor position over an element and writes --mx / --my CSS
 * variables (for .spotlight-card glow) plus a subtle 3D tilt transform.
 * Zero re-renders. Respects prefers-reduced-motion.
 */
export function useSpotlight<T extends HTMLElement = HTMLDivElement>(opts?: {
  maxTilt?: number; // degrees
  scale?: number;
}) {
  const maxTilt = opts?.maxTilt ?? 6;
  const scale = opts?.scale ?? 1.015;
  const ref = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const onMouseMove = useCallback(
    (e: React.MouseEvent<T>) => {
      const el = ref.current;
      if (!el) return;
      const clientX = e.clientX;
      const clientY = e.clientY;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const px = (clientX - rect.left) / rect.width; // 0..1
        const py = (clientY - rect.top) / rect.height; // 0..1
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        if (!reduced) {
          const ry = (px - 0.5) * 2 * maxTilt; // rotateY
          const rx = -(py - 0.5) * 2 * maxTilt; // rotateX
          el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
          el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
          el.style.setProperty("--tilt-scale", `${scale}`);
        }
      });
    },
    [maxTilt, scale, reduced],
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
    el.style.setProperty("--tilt-scale", `1`);
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}