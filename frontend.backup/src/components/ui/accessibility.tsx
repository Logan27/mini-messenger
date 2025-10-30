import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Skip link component for keyboard navigation
export const SkipLink: React.FC<{
  href: string
  children: React.ReactNode
  className?: string
}> = ({ href, children, className }) => (
  <a
    href={href}
    className={cn(
      'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-ring',
      className
    )}
  >
    {children}
  </a>
)

// Live region component for screen reader announcements
export const LiveRegion: React.FC<{
  children: React.ReactNode
  politeness?: 'polite' | 'assertive' | 'off'
  className?: string
}> = ({ children, politeness = 'polite', className }) => (
  <div
    aria-live={politeness}
    aria-atomic="true"
    className={cn('sr-only', className)}
  >
    {children}
  </div>
)

// Visually hidden component for screen reader only content
export const VisuallyHidden: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <span className={cn('sr-only', className)}>
    {children}
  </span>
)

// Focus trap component for modals and dialogs
export const FocusTrap: React.FC<{
  children: React.ReactNode
  isActive: boolean
  onEscape?: () => void
}> = ({ children, isActive, onEscape }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement

    // Get all focusable elements within the container
    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    if (focusableElements && focusableElements.length > 0) {
      // Focus the first element
      focusableElements[0].focus()
    }

    // Handle escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.()
      }
    }

    // Handle tab key to trap focus
    const handleTab = (event: KeyboardEvent) => {
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleTab)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleTab)

      // Restore focus to the previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [isActive, onEscape])

  return <div ref={containerRef}>{children}</div>
}

// Announcer component for programmatic screen reader announcements
export const useAnnouncer = () => {
  const [announcement, setAnnouncement] = useState('')

  const announce = (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message)
    
    // Clear the announcement after it's been read
    setTimeout(() => {
      setAnnouncement('')
    }, 1000)
  }

  const AnnouncerComponent = () => (
    <LiveRegion politeness="polite">
      {announcement}
    </LiveRegion>
  )

  return { announce, AnnouncerComponent }
}

// Keyboard navigation hook
export const useKeyboardNavigation = (
  items: Array<{ id: string; element?: HTMLElement }>,
  onSelect?: (id: string) => void
) => {
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % items.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex((prev) => (prev - 1 + items.length) % items.length)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (focusedIndex >= 0 && items[focusedIndex]) {
          onSelect?.(items[focusedIndex].id)
        }
        break
      case 'Escape':
        setFocusedIndex(-1)
        break
    }
  }

  useEffect(() => {
    if (focusedIndex >= 0 && items[focusedIndex]?.element) {
      items[focusedIndex].element?.focus()
    }
  }, [focusedIndex, items])

  return { focusedIndex, handleKeyDown, setFocusedIndex }
}

// ARIA description hook
export const useAriaDescription = (descriptions: Record<string, string>) => {
  const [describedBy, setDescribedBy] = useState<Record<string, string>>({})

  const addDescription = (id: string, description: string) => {
    setDescribedBy(prev => ({ ...prev, [id]: description }))
  }

  const removeDescription = (id: string) => {
    setDescribedBy(prev => {
      const newDescriptions = { ...prev }
      delete newDescriptions[id]
      return newDescriptions
    })
  }

  const getAriaDescribedBy = (id: string) => {
    return Object.keys(describedBy)
      .filter(key => describedBy[key].includes(id))
      .join(' ')
  }

  return { addDescription, removeDescription, getAriaDescribedBy }
}

// Color contrast checker utility
export const checkColorContrast = (foreground: string, background: string): {
  ratio: number
  passes: {
    AA: boolean
    AAA: boolean
    AALarge: boolean
    AAALarge: boolean
  }
} => {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  // Calculate relative luminance
  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const fgRgb = hexToRgb(foreground)
  const bgRgb = hexToRgb(background)

  const fgLuminance = getLuminance(fgRgb)
  const bgLuminance = getLuminance(bgRgb)

  const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05)

  return {
    ratio: Math.round(ratio * 100) / 100,
    passes: {
      AA: ratio >= 4.5,
      AAA: ratio >= 7,
      AALarge: ratio >= 3,
      AAALarge: ratio >= 4.5
    }
  }
}

// Screen reader detection hook
export const useScreenReaderDetection = () => {
  const [hasScreenReader, setHasScreenReader] = useState(false)

  useEffect(() => {
    // Basic detection - this is not foolproof but can help
    const userAgent = navigator.userAgent.toLowerCase()
    const hasScreenReaderInUA = userAgent.includes('nvda') || userAgent.includes('jaws') || userAgent.includes('dragon')

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Check for high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches

    setHasScreenReader(hasScreenReaderInUA || prefersReducedMotion || prefersHighContrast)
  }, [])

  return hasScreenReader
}

// Accessible button component with proper keyboard support
export const AccessibleButton: React.FC<{
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  ariaLabel?: string
  ariaDescribedBy?: string
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost'
}> = ({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  className,
  variant = 'primary'
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
      event.preventDefault()
      onClick()
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2'
      case 'secondary':
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-2 focus:ring-ring focus:ring-offset-2'
      case 'ghost':
        return 'hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2'
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2'
    }
  }

  return (
    <button
      onClick={onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 px-4 py-2',
        getVariantClasses(),
        className
      )}
      type="button"
    >
      {children}
    </button>
  )
}

export default {
  SkipLink,
  LiveRegion,
  VisuallyHidden,
  FocusTrap,
  useAnnouncer,
  useKeyboardNavigation,
  useAriaDescription,
  checkColorContrast,
  useScreenReaderDetection,
  AccessibleButton
}