import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  accent?: "fire" | "neon" | "gold" | "success" | "warning";
  className?: string;
}

const accentMap: Record<NonNullable<Props["accent"]>, { icon: string; ring: string; glow: string }> = {
  fire:    { icon: "text-primary", ring: "bg-primary/10 border-primary/30", glow: "from-primary/20" },
  neon:    { icon: "text-info",    ring: "bg-info/10 border-info/30",       glow: "from-info/20" },
  gold:    { icon: "text-gold",    ring: "bg-gold/10 border-gold/30",       glow: "from-gold/20" },
  success: { icon: "text-success", ring: "bg-success/10 border-success/30", glow: "from-success/20" },
  warning: { icon: "text-warning", ring: "bg-warning/10 border-warning/30", glow: "from-warning/20" },
};

export function StatCard({ label, value, icon: Icon, trend, accent = "fire", className }: Props) {
  const a = accentMap[accent];
  return (
    <div className={cn(
      "group relative card-premium p-5 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-card-hover",
      className,
    )}>
      {/* glow corner */}
      <div className={cn("pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br to-transparent", a.glow)} />
      <div className="relative flex items-start justify-between mb-5">
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
          {label}
        </span>
        {Icon && (
          <div className={cn("h-9 w-9 rounded-lg border flex items-center justify-center", a.ring)}>
            <Icon className={cn("h-4 w-4", a.icon)} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="relative font-display text-3xl md:text-[32px] font-semibold text-foreground leading-tight tracking-tight">
        {value}
      </div>
      {trend && (
        <div className="relative text-xs text-muted-foreground mt-2">
          {trend}
        </div>
      )}
    </div>
  );
}
