import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpotlight } from "@/hooks/useSpotlight";

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  accent?: "fire" | "neon" | "gold" | "success" | "warning";
  variant?: "default" | "premium";
  className?: string;
}

const accentMap = {
  fire: "from-primary/20 to-transparent border-primary/30 text-primary",
  neon: "from-info/20 to-transparent border-info/30 text-info",
  gold: "from-gold/20 to-transparent border-gold/30 text-gold",
  success: "from-success/20 to-transparent border-success/30 text-success",
  warning: "from-warning/20 to-transparent border-warning/30 text-warning",
};

export function StatCard({ label, value, icon: Icon, trend, accent = "fire", variant = "default", className }: Props) {
  const { ref, onMouseMove, onMouseLeave } = useSpotlight();
  return (
    <div className={cn(
      "spotlight-card relative overflow-hidden rounded-2xl bg-card border border-border p-5 shadow-card-premium transition-all hover:border-primary/40 hover:-translate-y-0.5",
      variant === "premium" && "statcard-premium border-transparent shadow-fire",
      className,
    )}
    data-spot={accent}
    ref={ref}
    onMouseMove={onMouseMove}
    onMouseLeave={onMouseLeave}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", accentMap[accent].split(" ").slice(0, 2).join(" "))} />
      <span className="spotlight-shine" aria-hidden />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
          {Icon && (
            <div className={cn("h-9 w-9 rounded-lg border flex items-center justify-center bg-background/40", accentMap[accent].split(" ").slice(2).join(" "))}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="font-display text-3xl font-bold text-foreground">{value}</div>
        {trend && <div className="text-xs text-muted-foreground mt-1.5">{trend}</div>}
      </div>
    </div>
  );
}
