import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/app/stores/authStore';
import apiClient from '@/services/apiClient';
import { MessageCircle } from 'lucide-react';

const loginSchema = z.object({
  identifier: z.string().min(3, 'Username or email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/auth/login', {
        identifier: data.identifier,
        password: data.password,
      });

      const { user, accessToken, refreshToken } = response.data.data;

      login(user, accessToken);

      toast.success('Login successful!', {
        description: `Welcome back, ${user.username}!`,
        duration: 3000,
      });

      navigate('/chats');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Login failed', {
        description: error.response?.data?.error || 'Invalid credentials',
        duration: 4000,
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
          <MessageCircle className="w-8 h-8 text-primary-foreground" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-foreground mb-2">Sign In</h2>
        <p className="text-sm text-center text-muted-foreground mb-6">
          Welcome back to Messenger
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username/Email */}
          <div>
            <Label htmlFor="identifier" className="block mb-2 text-sm font-medium text-foreground">
              Username or Email
            </Label>
            <Input
              id="identifier"
              type="text"
              placeholder="Enter your username or email"
              {...register('identifier')}
              className="w-full"
              disabled={isSubmitting}
            />
            {errors.identifier && (
              <p className="text-destructive text-sm mt-1">{errors.identifier.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="block mb-2 text-sm font-medium text-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              {...register('password')}
              className="w-full"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
