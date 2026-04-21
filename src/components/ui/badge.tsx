import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-[10px] font-bold font-display uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary/10 text-primary",
        secondary: "border-border bg-card text-foreground",
        destructive: "border-destructive bg-destructive/10 text-destructive",
        outline: "border-border text-muted-foreground",
        solid: "border-primary bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
