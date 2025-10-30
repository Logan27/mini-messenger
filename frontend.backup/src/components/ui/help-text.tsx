import React from 'react'
import { HelpCircle, Info, AlertTriangle, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpTextProps {
  children: React.ReactNode
  variant?: 'default' | 'info' | 'warning' | 'tip'
  className?: string
  icon?: boolean
  title?: string
}

const HelpText: React.FC<HelpTextProps> = ({
  children,
  variant = 'default',
  className,
  icon = true,
  title
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'tip':
        return 'bg-green-50 border-green-200 text-green-800'
      default:
        return 'bg-muted border-border text-muted-foreground'
    }
  }

  const getIcon = () => {
    switch (variant) {
      case 'info':
        return <Info className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'tip':
        return <Lightbulb className="h-4 w-4" />
      default:
        return <HelpCircle className="h-4 w-4" />
    }
  }

  return (
    <div className={cn(
      'rounded-md border p-3 text-sm',
      getVariantClasses(),
      className
    )}>
      <div className="flex items-start gap-2">
        {icon && (
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
        )}
        <div className="flex-1">
          {title && (
            <h4 className="font-medium mb-1">{title}</h4>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Specialized help text components for common use cases
export const FormHelpText: React.FC<{
  children: React.ReactNode
  htmlFor?: string
  className?: string
}> = ({ children, htmlFor, className }) => (
  <p 
    id={htmlFor ? `${htmlFor}-help` : undefined}
    className={cn('text-sm text-muted-foreground mt-1', className)}
  >
    {children}
  </p>
)

export const ErrorHelpText: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <p className={cn('text-sm text-destructive mt-1', className)}>
    {children}
  </p>
)

export const SuccessHelpText: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <p className={cn('text-sm text-green-600 mt-1', className)}>
    {children}
  </p>
)

export const KeyboardShortcutHelp: React.FC<{
  shortcut: string | string[]
  description: string
  className?: string
}> = ({ shortcut, description, className }) => {
  const shortcuts = Array.isArray(shortcut) ? shortcut : [shortcut]
  
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <span>{description}:</span>
      <div className="flex gap-1">
        {shortcuts.map((key, index) => (
          <React.Fragment key={key}>
            {index > 0 && <span>+</span>}
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export const NewFeatureHelp: React.FC<{
  feature: string
  description: string
  onLearnMore?: () => void
  className?: string
}> = ({ feature, description, onLearnMore, className }) => (
  <HelpText 
    variant="info" 
    className={cn('relative', className)}
    title={`New: ${feature}`}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        {description}
      </div>
      {onLearnMore && (
        <button
          onClick={onLearnMore}
          className="ml-2 text-sm font-medium underline hover:no-underline"
        >
          Learn more
        </button>
      )}
    </div>
    <div className="absolute -top-1 -right-1">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
      </span>
    </div>
  </HelpText>
)

export const ProTipHelp: React.FC<{
  tip: string
  className?: string
}> = ({ tip, className }) => (
  <HelpText 
    variant="tip" 
    className={className}
    title="Pro Tip"
  >
    {tip}
  </HelpText>
)

export const SecurityHelp: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <HelpText 
    variant="warning" 
    className={className}
    title="Security Notice"
  >
    {children}
  </HelpText>
)

export default HelpText