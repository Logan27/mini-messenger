import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';
import { Lock } from 'lucide-react';

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await apiClient.post(`/auth/reset-password/${token}`, {
        password: data.password,
      });
      toast.success('Password reset successful!', {
        description: 'You can now log in with your new password.',
        duration: 5000,
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Reset password failed:', error);
      const errorMessage = error.response?.data?.error?.message
        || error.response?.data?.message
        || 'Failed to reset password. Please try again.';

      toast.error('Reset failed', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-chat-bg">
      <div className="w-full max-w-md p-8 bg-card rounded-xl shadow-md border border-border">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-primary rounded-full shadow-md">
          <Lock className="w-8 h-8 text-primary-foreground" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-foreground mb-2">Reset Password</h2>
        <p className="text-sm text-center text-muted-foreground mb-6">
          Enter your new password
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* New Password */}
          <div>
            <Label htmlFor="password" className="block mb-2 text-sm font-medium text-foreground">
              New Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              {...register('password')}
              className="w-full"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <Label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-foreground">
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              {...register('confirmPassword')}
              className="w-full"
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2"
          >
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
