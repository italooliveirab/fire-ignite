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
}: {
  size?: Size;
  subtitle?: string;
  className?: string;
}) {
  const { logoUrl, companyName } = useBrand();
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {logoUrl ? (
        <div className={cn(s.box, "bg-card border border-border flex items-center justify-center overflow-hidden shrink-0")}>
          <img src={logoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain p-1" />
        </div>
      ) : (
        <div className={cn(s.box, "bg-gradient-fire flex items-center justify-center shadow-fire shrink-0")}>
          <Flame className={cn(s.icon, "text-white")} strokeWidth={2.5} />
        </div>
      )}
      <div className="min-w-0">
        <div className={cn("font-display font-bold leading-none text-foreground truncate", s.title)}>{companyName}</div>
        {subtitle && (
          <div className={cn("uppercase tracking-[0.25em] text-muted-foreground mt-0.5", s.sub)}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}
