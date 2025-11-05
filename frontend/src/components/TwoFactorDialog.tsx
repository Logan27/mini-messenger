import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TwoFactorDialogProps {
  open: boolean;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

export default function TwoFactorDialog({
  open,
  onVerify,
  onCancel,
  isLoading = false,
  error,
}: TwoFactorDialogProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6 || (useBackupCode && code.length > 0)) {
      await onVerify(code);
    }
  };

  const handleClose = () => {
    setCode('');
    setUseBackupCode(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </div>
          <DialogDescription>
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="2fa-code">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </Label>
            <Input
              id="2fa-code"
              type="text"
              inputMode={useBackupCode ? 'text' : 'numeric'}
              maxLength={useBackupCode ? 16 : 6}
              placeholder={useBackupCode ? 'Enter backup code' : 'Enter 6-digit code'}
              value={code}
              onChange={(e) =>
                setCode(
                  useBackupCode ? e.target.value : e.target.value.replace(/\D/g, '')
                )
              }
              className="text-center text-2xl tracking-widest"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode('');
            }}
            className="text-xs"
            disabled={isLoading}
          >
            {useBackupCode ? 'Use authenticator code instead' : 'Use a backup code'}
          </Button>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                (useBackupCode ? code.length === 0 : code.length !== 6)
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
