import { useEffect } from "react";

/**
 * Global "fire spark" ripple on every clickable element.
 * Listens at the document level and injects a short-lived span at the click point.
 */
export function ClickSpark() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const trigger = target.closest<HTMLElement>(
        'button, a, [role="button"], [data-radix-collection-item], summary, label[for]',
      );
      if (!trigger) return;
      // Skip disabled controls
      if (trigger.hasAttribute("disabled") || trigger.getAttribute("aria-disabled") === "true") return;

      const rect = trigger.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const prevPos = trigger.style.position;
      const prevOverflow = trigger.style.overflow;
      const computed = getComputedStyle(trigger);
      if (computed.position === "static") trigger.style.position = "relative";
      // keep overflow as-is so sparks can spill slightly; we use mix-blend

      const spark = document.createElement("span");
      spark.className = "fire-ripple";
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      trigger.appendChild(spark);

      const cleanup = () => {
        spark.remove();
        if (!prevPos) trigger.style.removeProperty("position");
        if (!prevOverflow) trigger.style.removeProperty("overflow");
      };
      spark.addEventListener("animationend", cleanup, { once: true });
      setTimeout(cleanup, 800);
    };

    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  return null;
}