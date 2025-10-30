import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/app/stores/authStore'
import { resetPasswordSchema, type ResetPasswordFormData, checkPasswordStrength } from '@/shared/lib/validations/auth'
import { toast } from 'sonner'

interface ResetPasswordFormProps {
  token?: string
  onSuccess?: () => void
  onBackToLogin?: () => void
}

export const ResetPasswordForm = ({ token, onSuccess, onBackToLogin }: ResetPasswordFormProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { resetPassword, isLoading, error, clearError } = useAuthStore()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      token: token || '',
    },
  })

  const watchedPassword = watch('password')
  const passwordStrength = checkPasswordStrength(watchedPassword || '')

  // Auto-fill token from URL if not provided
  useEffect(() => {
    if (!token) {
      const urlParams = new URLSearchParams(window.location.search)
      const urlToken = urlParams.get('token')
      if (urlToken) {
        // This would need to be handled by the parent component or router
        console.log('Token found in URL:', urlToken)
      }
    }
  }, [token])

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      clearError()
      await resetPassword(data.token, data.password)
      setIsSuccess(true)

      toast.success('Password reset successful!', {
        description: 'You can now log in with your new password.',
      })

      // Redirect to login after a short delay
      setTimeout(() => {
        onSuccess?.()
      }, 2000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed'

      toast.error('Reset Failed', {
        description: errorMessage,
      })

      setError('password', { message: errorMessage })
    }
  }

  const isDisabled = isLoading || isSubmitting

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Password Reset</CardTitle>
          <CardDescription className="text-center">
            Your password has been successfully reset. You can now log in with your new password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button
            className="w-full"
            onClick={onBackToLogin}
          >
            Continue to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Reset password</CardTitle>
        <CardDescription className="text-center">
          Enter your new password below.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                autoComplete="new-password"
                disabled={isDisabled}
                {...register('password')}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : 'password-strength'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isDisabled}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Password Strength Indicator */}
            {watchedPassword && (
              <div id="password-strength" className="space-y-2">
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.isValid ? 'bg-green-500' : 'bg-destructive'
                    }`}
                    style={{ width: `${passwordStrength.percentage}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`flex items-center gap-1 ${
                    passwordStrength.isValid ? 'text-green-600' : 'text-destructive'
                  }`}>
                    Password strength: {passwordStrength.isValid ? 'Good' : 'Weak'}
                  </span>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {passwordStrength.feedback.map((feedback, index) => (
                      <li key={index}>• {feedback}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {errors.password && (
              <p id="password-error" className="text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                autoComplete="new-password"
                disabled={isDisabled}
                {...register('confirmPassword')}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isDisabled}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className="text-sm text-destructive" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md" role="alert">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isDisabled}>
            {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password
          </Button>

          {/* Back to Login */}
          {onBackToLogin && (
            <div className="text-center text-sm">
              <Button
                type="button"
                variant="link"
                className="px-0 font-normal"
                onClick={onBackToLogin}
                disabled={isDisabled}
              >
                Back to login
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}