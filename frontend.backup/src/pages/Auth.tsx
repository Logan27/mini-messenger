// No longer needed - using URL params instead
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/app/stores/authStore'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm'
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password'

const Auth = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuthStore()

  // Get current mode from URL params
  const mode = (searchParams.get('mode') as AuthMode) || 'login'
  const token = searchParams.get('token')

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  // Handle mode changes
  const switchToMode = (newMode: AuthMode) => {
    const newParams = new URLSearchParams(searchParams)
    if (newMode === 'login') {
      newParams.delete('mode')
      newParams.delete('token')
    } else {
      newParams.set('mode', newMode)
      if (newMode !== 'reset-password') {
        newParams.delete('token')
      }
    }
    setSearchParams(newParams)
  }

  const handleForgotPasswordSuccess = () => {
    // Could show a success message or switch back to login
    switchToMode('login')
  }

  const handleResetPasswordSuccess = () => {
    switchToMode('login')
  }

  // Render the appropriate form based on mode
  const renderForm = () => {
    switch (mode) {
      case 'register':
        return (
          <RegisterForm
            onSwitchToLogin={() => switchToMode('login')}
          />
        )

      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onBackToLogin={() => switchToMode('login')}
            onSuccess={handleForgotPasswordSuccess}
          />
        )

      case 'reset-password':
        return (
          <ResetPasswordForm
            token={token || undefined}
            onBackToLogin={() => switchToMode('login')}
            onSuccess={handleResetPasswordSuccess}
          />
        )

      default:
        return (
          <LoginForm
            onSwitchToRegister={() => switchToMode('register')}
            onSwitchToForgotPassword={() => switchToMode('forgot-password')}
          />
        )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#dfe5e9] px-3 xs:px-4 py-6 xs:py-8">
      <div className="w-full max-w-md bg-[#ffffff] rounded-xl shadow-lg border border-[#e5e5e5] p-6 xs:p-8">
        {/* Skip to main content for screen readers */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[#0088cc] text-white px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>

        <main id="main-content" role="main">
          {renderForm()}
        </main>
      </div>
    </div>
  )
}

export default Auth