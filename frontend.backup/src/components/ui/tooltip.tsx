import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { Info, HelpCircle, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?: 'default' | 'info' | 'warning' | 'help'
  }
>(({ className, sideOffset = 4, variant = 'default', children, ...props }, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'help':
        return 'bg-green-50 border-green-200 text-green-800'
      default:
        return 'bg-popover text-popover-foreground'
    }
  }

  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-w-xs",
        getVariantClasses(),
        className
      )}
      {...props}
    >
      {children}
    </TooltipPrimitive.Content>
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Helper components for common tooltip patterns
export const InfoTooltip: React.FC<{
  content: React.ReactNode
  className?: string
  side?: "top" | "right" | "bottom" | "left"
}> = ({ content, className, side = "top" }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center rounded-full w-4 h-4 text-muted-foreground hover:text-foreground transition-colors",
          className
        )}
        aria-label="Information"
      >
        <Info className="h-3 w-3" />
      </button>
    </TooltipTrigger>
    <TooltipContent side={side} variant="info">
      {content}
    </TooltipContent>
  </Tooltip>
)

export const HelpTooltip: React.FC<{
  content: React.ReactNode
  className?: string
  side?: "top" | "right" | "bottom" | "left"
}> = ({ content, className, side = "top" }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center rounded-full w-4 h-4 text-muted-foreground hover:text-foreground transition-colors",
          className
        )}
        aria-label="Help"
      >
        <HelpCircle className="h-3 w-3" />
      </button>
    </TooltipTrigger>
    <TooltipContent side={side} variant="help">
      {content}
    </TooltipContent>
  </Tooltip>
)

export const WarningTooltip: React.FC<{
  content: React.ReactNode
  className?: string
  side?: "top" | "right" | "bottom" | "left"
}> = ({ content, className, side = "top" }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center rounded-full w-4 h-4 text-muted-foreground hover:text-foreground transition-colors",
          className
        )}
        aria-label="Warning"
      >
        <AlertCircle className="h-3 w-3" />
      </button>
    </TooltipTrigger>
    <TooltipContent side={side} variant="warning">
      {content}
    </TooltipContent>
  </Tooltip>
)

export const IconTooltip: React.FC<{
  content: React.ReactNode
  children: React.ReactNode
  className?: string
  side?: "top" | "right" | "bottom" | "left"
  variant?: 'default' | 'info' | 'warning' | 'help'
}> = ({ content, children, className, side = "top", variant = 'default' }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      {children}
    </TooltipTrigger>
    <TooltipContent side={side} variant={variant} className={className}>
      {content}
    </TooltipContent>
  </Tooltip>
)

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }