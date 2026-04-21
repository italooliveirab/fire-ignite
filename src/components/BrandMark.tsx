import { Flame } from "lucide-react";
import { useBrand } from "@/hooks/useBrand";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, { box: string; icon: string; title: string; sub: string }> = {
  sm: { box: "h-9 w-9 rounded-lg", icon: "h-5 w-5", title: "text-lg", sub: "text-[10px]" },
  md: { box: "h-11 w-11 rounded-xl", icon: "h-6 w-6", title: "text-xl", sub: "text-[10px]" },
  lg: { box: "h-12 w-12 rounded-xl", icon: "h-6 w-6", title: "text-2xl", sub: "text-[10px]" },
};

export function BrandMark({
  size = "md",
  subtitle,
  className,
  animated = false,
}: {
  size?: Size;
  subtitle?: string;
  className?: string;
  /** When true, applies the FireLoader flame animation + ember sparks. */
  animated?: boolean;
}) {
  const { logoUrl, companyName } = useBrand();
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex items-center justify-center shrink-0">
        {animated && (
          <>
            <span className={cn("absolute rounded-2xl border border-primary/40 fire-pulse-ring", s.box)} />
            <span className={cn("absolute rounded-2xl border border-primary/30 fire-pulse-ring", s.box)} style={{ animationDelay: "0.6s" }} />
            <span className="absolute -bottom-1 left-[28%] h-1 w-1 rounded-full bg-gold fire-ember" />
            <span className="absolute -bottom-1 left-[55%] h-[3px] w-[3px] rounded-full bg-ember fire-ember" style={{ animationDelay: "0.5s" }} />
            <span className="absolute -bottom-1 right-[24%] h-1 w-1 rounded-full bg-primary fire-ember" style={{ animationDelay: "1s" }} />
          </>
        )}
        {logoUrl ? (
          <div className={cn(s.box, "flex items-center justify-center overflow-hidden shrink-0", animated && "fire-logo-flicker")}>
            <img src={logoUrl} alt={`${companyName} logo`} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className={cn(s.box, "bg-gradient-fire flex items-center justify-center shadow-fire shrink-0", animated && "fire-logo-flicker")}>
            <Flame className={cn(s.icon, "text-white")} strokeWidth={2.5} fill={animated ? "rgba(255,255,255,0.15)" : undefined} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className={cn("font-display font-bold leading-none truncate", s.title, animated ? "fire-shimmer" : "text-foreground")}>{companyName}</div>
        {subtitle && (
          <div className={cn("uppercase tracking-[0.25em] text-muted-foreground mt-0.5", s.sub)}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}
