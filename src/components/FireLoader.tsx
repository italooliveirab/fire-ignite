import { Flame } from "lucide-react";

interface Props {
  label?: string;
  fullscreen?: boolean;
}

export function FireLoader({ label = "Acendendo o FIRE...", fullscreen = true }: Props) {
  const wrapper = fullscreen
    ? "fixed inset-0 z-[100] flex items-center justify-center bg-background"
    : "flex items-center justify-center py-16";

  return (
    <div className={wrapper}>
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px]" />
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          {/* Pulse rings */}
          <span className="absolute h-24 w-24 rounded-2xl border border-primary/40 fire-pulse-ring" />
          <span className="absolute h-24 w-24 rounded-2xl border border-primary/30 fire-pulse-ring" style={{ animationDelay: "0.6s" }} />

          {/* Embers rising */}
          <span className="absolute -bottom-2 left-1/4 h-1.5 w-1.5 rounded-full bg-gold fire-ember" style={{ animationDelay: "0s" }} />
          <span className="absolute -bottom-2 left-1/2 h-1 w-1 rounded-full bg-ember fire-ember" style={{ animationDelay: "0.4s" }} />
          <span className="absolute -bottom-2 right-1/4 h-1.5 w-1.5 rounded-full bg-primary fire-ember" style={{ animationDelay: "0.8s" }} />
          <span className="absolute -bottom-2 left-[60%] h-1 w-1 rounded-full bg-gold fire-ember" style={{ animationDelay: "1.2s" }} />

          {/* Logo */}
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-fire flex items-center justify-center shadow-fire fire-logo-flicker">
            <Flame className="h-10 w-10 text-white" strokeWidth={2.5} fill="rgba(255,255,255,0.15)" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="font-display font-extrabold text-2xl tracking-tight fire-shimmer">FIRE</div>
          <div className="text-xs text-muted-foreground animate-pulse">{label}</div>
        </div>
      </div>
    </div>
  );
}