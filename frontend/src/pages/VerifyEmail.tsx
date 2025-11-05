import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Mail, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const VerifyEmail = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Invalid verification link');
        setIsVerifying(false);
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const response = await axios.post(`${apiUrl}/api/auth/verify-email`, { token });
        
        setIsSuccess(true);
        setEmail(response.data.email || '');
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Verification failed. The link may be invalid or expired.';
        setError(errorMessage);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email address not found. Please try logging in to resend verification.');
      return;
    }

    setIsResending(true);
    setError('');
    setResendSuccess(false);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      await axios.post(`${apiUrl}/api/auth/resend-verification`, { email });
      
      setResendSuccess(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to resend verification email.';
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying your email...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Email Verified!</CardTitle>
            <CardDescription className="text-center">
              Your email has been successfully verified
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert>
              <AlertDescription>
                {email && <p className="mb-2">Email: <strong>{email}</strong></p>}
                <p>You can now log in to your account. Redirecting to login page in 5 seconds...</p>
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter>
            <Link to="/login" className="w-full">
              <Button className="w-full">
                Go to Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900 p-3">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Verification Failed</CardTitle>
          <CardDescription className="text-center">
            We couldn't verify your email address
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          {resendSuccess && (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                A new verification email has been sent. Please check your inbox.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">Common reasons for verification failure:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The verification link has expired (24 hours)</li>
              <li>The link has already been used</li>
              <li>The link is invalid or corrupted</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          {email && (
            <Button 
              onClick={handleResendEmail} 
              className="w-full"
              disabled={isResending || resendSuccess}
            >
              {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {resendSuccess ? 'Email Sent!' : 'Resend Verification Email'}
            </Button>
          )}
          
          <Link to="/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>

          {!email && (
            <Link to="/register" className="w-full">
              <Button variant="link" className="w-full">
                Register a New Account
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyEmail;
