import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/app/stores/authStore'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/shared/lib/validations/auth'
import { toast } from 'sonner'

interface ForgotPasswordFormProps {
  onBackToLogin?: () => void
  onSuccess?: () => void
}

export const ForgotPasswordForm = ({ onBackToLogin, onSuccess }: ForgotPasswordFormProps) => {
  const { forgotPassword, isLoading, error, clearError } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      clearError()
      await forgotPassword(data.email)

      toast.success('Reset email sent!', {
        description: 'Check your email for password reset instructions.',
      })

      onSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email'

      toast.error('Reset Failed', {
        description: errorMessage,
      })

      setError('email', { message: errorMessage })
    }
  }

  const isDisabled = isLoading || isSubmitting

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          {onBackToLogin && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBackToLogin}
              disabled={isDisabled}
              className="p-0 h-auto"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
        </div>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              disabled={isDisabled}
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive" role="alert">
                {errors.email.message}
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
            <Mail className="mr-2 h-4 w-4" />
            Send Reset Email
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