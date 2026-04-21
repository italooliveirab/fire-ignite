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

const accentMap: Record<NonNullable<Props["accent"]>, string> = {
  fire: "text-primary",
  neon: "text-info",
  gold: "text-gold",
  success: "text-success",
  warning: "text-warning",
};

export function StatCard({ label, value, icon: Icon, trend, accent = "fire", className }: Props) {
  return (
    <div className={cn(
      "relative bg-card border border-border p-5 transition-colors hover:border-primary group",
      className,
    )}>
      <div className="flex items-start justify-between mb-6">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <Icon className={cn("h-4 w-4", accentMap[accent])} strokeWidth={2} />
        )}
      </div>
      <div className="font-display text-4xl text-foreground leading-none tracking-tight">{value}</div>
      {trend && (
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-3">
          {trend}
        </div>
      )}
      {/* corner accent */}
      <div className="absolute bottom-0 right-0 h-2 w-8 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
