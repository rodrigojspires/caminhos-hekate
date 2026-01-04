import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--temple-accent-gold))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--temple-accent-gold))] text-[#1b1405] shadow-[var(--temple-glow-candle)] hover:bg-[hsl(var(--temple-accent-gold))]/90 hover:shadow-[var(--temple-glow-candle)]",
        destructive:
          "bg-red-700 text-red-50 hover:bg-red-600/90",
        outline:
          "border border-[hsl(var(--temple-border-subtle))] bg-transparent text-[hsl(var(--temple-accent-gold))] hover:bg-[hsl(var(--temple-accent-gold))]/10",
        secondary:
          "bg-[hsl(var(--temple-surface-2))] text-[hsl(var(--temple-text-primary))] hover:bg-[hsl(var(--temple-accent-gold))]/15",
        ghost:
          "text-[hsl(var(--temple-text-secondary))] hover:bg-[hsl(var(--temple-accent-gold))]/10 hover:text-[hsl(var(--temple-text-primary))]",
        link:
          "text-[hsl(var(--temple-accent-gold))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
