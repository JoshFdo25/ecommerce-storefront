import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface FloatingInputProps
  extends React.ComponentProps<typeof Input> {
  label: string
  endAdornment?: React.ReactNode
}

const FloatingInput = React.forwardRef<React.ElementRef<typeof Input>, FloatingInputProps>(
  ({ className, label, id, endAdornment, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <Input
          id={id}
          className={cn(
            "peer block w-full appearance-none bg-background px-3 pb-2 pt-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring h-12",
            className
          )}
          ref={ref}
          placeholder=" "
          {...props}
        />
        <Label
          htmlFor={id}
          className={cn(
            "absolute left-2 top-0 z-10 origin-[0] -translate-y-1/2 scale-75 transform cursor-text bg-background px-1 text-sm text-muted-foreground duration-200",
            "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100",
            "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-primary",
            "peer-focus-visible:top-0 peer-focus-visible:-translate-y-1/2 peer-focus-visible:scale-75"
          )}
        >
          {label}
        </Label>
        {endAdornment}
      </div>
    )
  }
)
FloatingInput.displayName = "FloatingInput"

export { FloatingInput }
