import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showReportButton?: boolean
  supportEmail?: string
  className?: string
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
  reportSent: boolean
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      reportSent: false
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
      // Here you would typically send to your error monitoring service
      // e.g., Sentry.captureException(error, { contexts: { react: errorInfo } })
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      reportSent: false
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleCopyError = () => {
    const errorDetails = this.getErrorDetails()
    navigator.clipboard.writeText(errorDetails).then(() => {
      // Could show a toast notification here
      console.log('Error details copied to clipboard')
    })
  }

  handleReportError = () => {
    const errorDetails = this.getErrorDetails()
    const subject = encodeURIComponent(`Error Report - ${this.state.errorId}`)
    const body = encodeURIComponent(errorDetails)
    const mailtoUrl = this.props.supportEmail
      ? `mailto:${this.props.supportEmail}?subject=${subject}&body=${body}`
      : `mailto:support@example.com?subject=${subject}&body=${body}`
    
    window.open(mailtoUrl)
    this.setState({ reportSent: true })
  }

  getErrorDetails = (): string => {
    const { error, errorInfo, errorId } = this.state
    const userAgent = navigator.userAgent
    const url = window.location.href
    const timestamp = new Date().toISOString()

    return `
Error ID: ${errorId}
Timestamp: ${timestamp}
URL: ${url}
User Agent: ${userAgent}

Error: ${error?.name}
Message: ${error?.message}
Stack: ${error?.stack}

Component Stack: ${errorInfo?.componentStack}
`.trim()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className={cn("min-h-[400px] flex items-center justify-center p-4", this.props.className)}>
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </CardDescription>
              {this.state.errorId && (
                <p className="text-xs text-muted-foreground mt-2">
                  Error ID: {this.state.errorId}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium text-foreground mb-1">Error Details:</p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoHome}>
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleCopyError}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Error
                </Button>
                {(this.props.showReportButton !== false) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleReportError}
                    className="flex-1"
                    disabled={this.state.reportSent}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {this.state.reportSent ? 'Report Sent' : 'Report Error'}
                  </Button>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.error('Error details:', this.state.error, this.state.errorInfo)}
                  className="w-full"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Log Error Details
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Specialized error boundaries for different contexts
export const ChatErrorBoundary: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <ErrorBoundary
    className={className}
    fallback={
      <div className={cn("flex-1 flex items-center justify-center p-4", className)}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle>Chat Error</CardTitle>
            <CardDescription>
              There was an error loading the chat. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Refresh Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)

export const MessageErrorBoundary: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <ErrorBoundary
    className={className}
    fallback={
      <div className={cn("p-4 text-center", className)}>
        <p className="text-sm text-muted-foreground">
          Unable to display this message.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)

export default ErrorBoundary