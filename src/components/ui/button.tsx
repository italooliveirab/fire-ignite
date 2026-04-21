import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[2.25]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary hover:bg-[#FF5A00] hover:border-[#FF5A00]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive hover:opacity-90",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-card hover:border-primary hover:text-primary",
        secondary:
          "bg-card text-foreground border border-border hover:bg-accent",
        ghost:
          "border border-transparent text-foreground hover:bg-card hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline border-none",
        brutal:
          "bg-primary text-primary-foreground border border-foreground shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none",
      },
      size: {
        default: "h-10 px-4 text-xs font-bold",
        sm: "h-8 px-3 text-[11px] font-bold",
        lg: "h-12 px-6 text-sm font-bold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
