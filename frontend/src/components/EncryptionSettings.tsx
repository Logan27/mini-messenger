import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { encryptionService } from "@/services/encryptionService";
import { encryptionAPI, apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Download, Upload, ShieldCheck, ShieldAlert, Key } from "lucide-react";

export function EncryptionSettings() {
    const { toast } = useToast();
    const [enabled, setEnabled] = useState(true);
    const [keysExist, setKeysExist] = useState(false);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Backup State
    const [showBackupDialog, setShowBackupDialog] = useState(false);
    const [backupPassword, setBackupPassword] = useState("");
    const [isBackingUp, setIsBackingUp] = useState(false);

    // Restore State
    const [showRestoreDialog, setShowRestoreDialog] = useState(false);
    const [restorePassword, setRestorePassword] = useState("");
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load settings
        const isEnabled = localStorage.getItem('encryption_enabled') !== 'false'; // Default to true
        setEnabled(isEnabled);

        loadKeyStatus();
    }, []);

    const loadKeyStatus = () => {
        const keys = encryptionService.loadKeys();
        setKeysExist(!!keys);
        setPublicKey(keys?.publicKey || null);
    };

    const handleToggle = (checked: boolean) => {
        setEnabled(checked);
        localStorage.setItem('encryption_enabled', String(checked));
        toast({
            title: checked ? "Encryption Enabled" : "Encryption Disabled",
            description: checked ? "New messages will be encrypted." : "New messages will be sent in plain text.",
            duration: 3000,
        });
    };

    const handleGenerateKeys = async () => {
        setIsGenerating(true);
        try {
            const keys = await encryptionService.generateKeyPair();
            encryptionService.storeKeys(keys.publicKey, keys.secretKey);

            // Upload the new public key to the server
            // We use PUT /public-key because we are setting/updating the key generated on the client.
            // POST /keypair is for server-side generation which we don't want (as we want valid client-side E2E).
            try {
                await apiClient.put('/encryption/public-key', { publicKey: keys.publicKey });
            } catch (error) {
                console.error("Failed to upload public key", error);
                throw error;
            }

            loadKeyStatus();
            toast({
                title: "New Keys Generated",
                description: "Your new encryption keys are active.",
            });
        } catch (error: unknown) {
            console.error('Failed to generate/upload keys:', error);
            const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
            const errorMessage = err.response?.data?.error?.message || err.message || "Unknown error";
            toast({
                title: "Error Generating Keys",
                description: `Failed to save keys: ${errorMessage}`,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleBackup = async () => {
        if (!backupPassword) {
            toast({ title: "Password required", description: "Please enter a password to encrypt your backup.", variant: "destructive" });
            return;
        }

        setIsBackingUp(true);
        try {
            const jsonString = await encryptionService.exportKeys(backupPassword);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `messenger_keys_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setShowBackupDialog(false);
            setBackupPassword("");
            toast({ title: "Backup Complete", description: "Your keys have been downloaded." });
        } catch (error) {
            console.error(error);
            toast({ title: "Backup Failed", description: "Could not export keys.", variant: "destructive" });
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestore = async () => {
        if (!restoreFile || !restorePassword) {
            toast({ title: "Missing Information", description: "Please select a file and enter the password.", variant: "destructive" });
            return;
        }

        setIsRestoring(true);
        try {
            const text = await restoreFile.text();
            const keys = await encryptionService.importKeys(text, restorePassword);

            // Store and Upload
            encryptionService.storeKeys(keys.publicKey, keys.secretKey);
            await encryptionAPI.uploadPublicKey(keys.publicKey);

            loadKeyStatus();
            setShowRestoreDialog(false);
            setRestoreFile(null);
            setRestorePassword("");

            toast({ title: "Keys Restored", description: "Your encryption keys have been restored successfully." });
        } catch (error) {
            console.error(error);
            toast({ title: "Restore Failed", description: "Invalid password or corrupted file.", variant: "destructive" });
        } finally {
            setIsRestoring(false);
        }
    };

    const copyPublicKey = () => {
        if (publicKey) {
            navigator.clipboard.writeText(publicKey);
            toast({ title: "Copied", description: "Public key copied to clipboard" });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {enabled ? <ShieldCheck className="text-green-500 h-5 w-5" /> : <ShieldAlert className="text-yellow-500 h-5 w-5" />}
                        End-to-End Encryption
                    </CardTitle>
                    <CardDescription>
                        Manage your encryption settings and storage keys.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Enable Encryption</Label>
                            <p className="text-sm text-muted-foreground">
                                Encrypt new outgoing messages for privacy.
                            </p>
                        </div>
                        <Switch
                            checked={enabled}
                            onCheckedChange={handleToggle}
                        />
                    </div>

                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Current Key Status</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${keysExist ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {keysExist ? 'Active Pair Found' : 'No Keys Found'}
                            </span>
                        </div>

                        {keysExist && (
                            <div className="space-y-2">
                                <Label className="text-xs">Public Key (Identity)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={publicKey || ''}
                                        readOnly
                                        className="font-mono text-xs bg-muted"
                                    />
                                    <Button variant="ghost" size="icon" onClick={copyPublicKey}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <Label className="text-sm font-semibold mb-2">Key Management</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Generate New Keys */}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="flex gap-2">
                                        <RefreshCw className="h-4 w-4" /> Generate New
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Generate New Key Pair?</AlertDialogTitle>
                                        <AlertDialogDescription className="space-y-2">
                                            <p>This will create a new Identity Key for you. </p>
                                            <p className="font-bold text-red-600">Warning: You will lose access to all previously encrypted messages history unless you have backed up your old keys.</p>
                                            <p>Are you sure you want to proceed?</p>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleGenerateKeys}>Yes, Generate New Keys</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            {/* Backup Keys */}
                            <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="flex gap-2">
                                        <Download className="h-4 w-4" /> Backup Keys
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Backup Encryption Keys</DialogTitle>
                                        <DialogDescription>
                                            Protect your backup file with a password. You will need this password to restore your keys later.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Password</Label>
                                            <Input
                                                type="password"
                                                placeholder="Enter a strong password"
                                                value={backupPassword}
                                                onChange={(e) => setBackupPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="secondary" onClick={() => setShowBackupDialog(false)}>Cancel</Button>
                                        <Button onClick={handleBackup} disabled={isBackingUp || !backupPassword}>
                                            {isBackingUp ? 'Encrypting...' : 'Download Backup'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {/* Restore Keys */}
                            <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="flex gap-2">
                                        <Upload className="h-4 w-4" /> Restore Keys
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Restore Encryption Keys</DialogTitle>
                                        <DialogDescription>
                                            Upload your backup file and enter the password to restore your keys.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Backup File</Label>
                                            <Input
                                                type="file"
                                                accept=".json"
                                                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Password</Label>
                                            <Input
                                                type="password"
                                                placeholder="Enter your backup password"
                                                value={restorePassword}
                                                onChange={(e) => setRestorePassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="secondary" onClick={() => setShowRestoreDialog(false)}>Cancel</Button>
                                        <Button onClick={handleRestore} disabled={isRestoring || !restoreFile || !restorePassword}>
                                            {isRestoring ? 'Restoring...' : 'Restore Keys'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
