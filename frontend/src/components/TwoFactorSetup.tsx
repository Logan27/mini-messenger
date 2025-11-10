import { useState, useEffect } from 'react';
import { Shield, Download, Check, X, Copy, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

// Remove /api from paths since VITE_API_URL already includes it
const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

interface TwoFactorData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export default function TwoFactorSetup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setupData, setSetupData] = useState<TwoFactorData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCode, setCopiedCode] = useState<number | null>(null);

  // Check current 2FA status
  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/auth/2fa/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsEnabled(response.data.data?.twoFactorEnabled || false);
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Start 2FA setup
  const handleStartSetup = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.post(
        `${API_URL}/api/auth/2fa/setup`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data.data;

      // Use QR code from backend response
      setQrCodeUrl(data.qrCode);

      setSetupData({
        secret: data.secret,
        qrCode: data.qrCode,
        backupCodes: data.backupCodes || [],
      });

      toast.success('2FA setup started');
    } catch (error) {
      console.error('Failed to start 2FA setup:', error);
      toast.error('Failed to start 2FA setup');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify and enable 2FA
  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await axios.post(
        `${API_URL}/api/auth/2fa/verify`,
        { token: verificationCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsEnabled(true);
      setSetupData(null);
      setVerificationCode('');
      toast.success('Two-factor authentication enabled successfully!');
    } catch (error) {
      console.error('Failed to verify code:', error);
      toast.error('Invalid verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Disable 2FA
  const handleDisable = async () => {
    if (!disablePassword) {
      toast.error('Please enter your password');
      return;
    }

    if (!disableCode || disableCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await axios.post(
        `${API_URL}/api/auth/2fa/disable`,
        { password: disablePassword, token: disableCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsEnabled(false);
      setShowDisableDialog(false);
      setDisableCode('');
      setDisablePassword('');
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      const message = error.response?.data?.error?.message || 'Failed to disable 2FA. Please try again.';
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Download backup codes
  const handleDownloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = [
      'Two-Factor Authentication Backup Codes',
      'Generated: ' + new Date().toLocaleString(),
      '',
      'IMPORTANT: Store these codes in a safe place.',
      'Each code can only be used once.',
      '',
      ...setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      'Keep these codes secure and do not share them with anyone.',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `2fa-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Backup codes downloaded');
  };

  // Copy secret to clipboard
  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      toast.success('Secret copied to clipboard');
    }
  };

  // Copy backup code
  const copyBackupCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success('Backup code copied');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Setup mode
  if (setupData && !isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set Up Two-Factor Authentication</CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator
              to scan the QR code below.
            </AlertDescription>
          </Alert>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-gray-950 rounded-lg border">
            {qrCodeUrl && (
              <img
                src={qrCodeUrl}
                alt="2FA QR Code"
                className="w-64 h-64"
              />
            )}
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Can't scan the QR code? Enter this secret manually:
              </p>
              <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-md">
                <code className="text-sm font-mono">{setupData.secret}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copySecret}
                  className="h-6 w-6"
                >
                  {copiedSecret ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Verification */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <Button
              onClick={handleVerifyAndEnable}
              disabled={isVerifying || verificationCode.length !== 6}
              className="w-full"
            >
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify and Enable
            </Button>
          </div>

          <Separator />

          {/* Backup Codes */}
          {setupData.backupCodes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Backup Codes</h4>
                  <p className="text-sm text-muted-foreground">
                    Save these codes in a safe place. Each can be used once.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadBackupCodes}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {setupData.backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md"
                  >
                    <code className="text-sm font-mono">{code}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyBackupCode(code, index)}
                      className="h-6 w-6"
                    >
                      {copiedCode === index ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Make sure to save these backup codes before enabling 2FA. You'll need them if you
                  lose access to your authenticator app.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => {
              setSetupData(null);
              setVerificationCode('');
            }}
            className="w-full"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main view
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Enable 2FA</Label>
                {isEnabled && (
                  <Badge variant="default" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isEnabled
                  ? 'Your account is protected with two-factor authentication'
                  : 'Require a verification code in addition to your password'}
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleStartSetup();
                } else {
                  setShowDisableDialog(true);
                }
              }}
            />
          </div>

          {isEnabled && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is active. You'll need your authenticator app to sign in.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Disable 2FA Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your password and current 2FA code to disable two-factor authentication. This will make your
              account less secure.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Password</Label>
              <Input
                id="disable-password"
                type="password"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disable-code">Verification Code</Label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isVerifying}
              onClick={() => {
                setDisableCode('');
                setDisablePassword('');
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={isVerifying || !disablePassword || disableCode.length !== 6}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isVerifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
