import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-temple-input="true"
        className={cn(
          "flex h-10 w-full rounded-md border border-hekate-gold/20 bg-black/20 px-3 py-2 text-sm text-hekate-pearl ring-offset-card file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-hekate-pearl/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hekate-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
