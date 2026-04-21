import { Flame } from "lucide-react";
import { useBrand } from "@/hooks/useBrand";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, { box: string; icon: string; title: string; sub: string }> = {
  sm: { box: "h-8 w-8", icon: "h-4 w-4", title: "text-lg", sub: "text-[10px]" },
  md: { box: "h-10 w-10", icon: "h-5 w-5", title: "text-xl", sub: "text-[10px]" },
  lg: { box: "h-12 w-12", icon: "h-6 w-6", title: "text-2xl", sub: "text-[10px]" },
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
        <div className={cn(s.box, "border border-border bg-card flex items-center justify-center overflow-hidden shrink-0")}>
          <img src={logoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain p-0.5" />
        </div>
      ) : (
        <div className={cn(s.box, "bg-primary flex items-center justify-center shrink-0")}>
          <Flame className={cn(s.icon, "text-primary-foreground")} strokeWidth={2.5} />
        </div>
      )}
      <div className="min-w-0">
        <div className={cn("font-display leading-none text-foreground truncate uppercase tracking-tight", s.title)}>{companyName}</div>
        {subtitle && (
          <div className={cn("uppercase tracking-[0.25em] text-muted-foreground mt-1 font-mono", s.sub)}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}
