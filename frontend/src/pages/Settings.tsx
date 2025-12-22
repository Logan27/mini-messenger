import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/user.service";
import { authService } from "@/services/auth.service";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { AvatarUpload } from "@/components/AvatarUpload";
import { BlockedContacts } from "@/components/BlockedContacts";
import ActiveSessions from "@/components/ActiveSessions";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import PushNotificationSetup from "@/components/PushNotificationSetup";
import { NotificationSettings } from "@/components/NotificationSettings";
import { EncryptionSettings } from "@/components/EncryptionSettings";
import { Loader2, ArrowLeft, Download, Trash2, AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Profile settings
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.profilePicture || user?.avatar || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Sync local state when user context changes (e.g., after avatar upload)
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setBio(user.bio || "");
      setPhone(user.phone || "");
      setAvatarUrl(user.profilePicture || user.avatar || "");
    }
  }, [user]);

  // Handle avatar change and update user context immediately
  const handleAvatarChange = async (url: string) => {
    setAvatarUrl(url);
    // Fetch the updated user from the server to ensure consistency
    try {
      const updatedUser = await authService.getCurrentUser();
      setUser(updatedUser); // AuthContext now handles localStorage automatically
    } catch (error) {
      console.error('Failed to fetch updated user:', error);
      // Fallback: update locally if server fetch fails
      if (user) {
        const updatedUser = {
          ...user,
          avatar: url,
          profilePicture: url,
        };
        setUser(updatedUser); // AuthContext now handles localStorage automatically
      }
    }
  };

  // Password settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Privacy settings - sync with user context
  const [onlineStatus, setOnlineStatus] = useState(user?.settings?.showOnlineStatus ?? true);
  const [readReceipts, setReadReceipts] = useState(user?.settings?.sendReadReceipts ?? true);

  // Update privacy settings when user context changes
  useEffect(() => {
    if (user?.settings) {
      setOnlineStatus(user.settings.showOnlineStatus ?? true);
      setReadReceipts(user.settings.sendReadReceipts ?? true);
    }
  }, [user?.settings]);

  // GDPR features
  const [isRequestingExport, setIsRequestingExport] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsUpdatingProfile(true);
    try {
      // Send all profile fields to ensure nothing gets cleared
      const updateData = {
        firstName: firstName || "",
        lastName: lastName || "",
        bio: bio || "",
        phone: phone?.trim() || null, // Send null for empty phone
      };

      const updatedUser = await userService.updateProfile(updateData);

      setUser(updatedUser);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: err.response?.data?.error || err.response?.data?.message || "Please try again",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords match",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 8 characters",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await userService.updatePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        variant: "destructive",
        title: "Failed to update password",
        description: err.response?.data?.message || "Please try again",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdatePrivacy = async () => {
    try {
      const updatedUser = await userService.updateProfile({
        settings: {
          showOnlineStatus: onlineStatus,
          sendReadReceipts: readReceipts,
        },
      });

      setUser(updatedUser);
      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        variant: "destructive",
        title: "Failed to update settings",
        description: err.response?.data?.message || "Please try again",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 md:gap-0 h-auto md:h-10">
              <TabsTrigger value="profile" className="text-xs md:text-sm">Profile</TabsTrigger>
              <TabsTrigger value="security" className="text-xs md:text-sm">Security</TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs md:text-sm">Privacy</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs md:text-sm">Notifs</TabsTrigger>
              <TabsTrigger value="contacts" className="text-xs md:text-sm">Contacts</TabsTrigger>
              <TabsTrigger value="account" className="text-xs md:text-sm">Account</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your profile details and avatar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <AvatarUpload
                    currentAvatar={getAvatarUrl(avatarUrl)}
                    username={username}
                    onAvatarChange={handleAvatarChange}
                  />

                  <Separator />

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Enter first name"
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateProfile(e)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Enter last name"
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateProfile(e)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        Username cannot be changed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself"
                        maxLength={500}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateProfile(e)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {bio.length}/500 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1234567890"
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateProfile(e)}
                      />
                      <p className="text-xs text-muted-foreground">
                        International format (E.164)
                      </p>
                    </div>

                    <Button
                      onClick={() => handleUpdateProfile()}
                      disabled={isUpdatingProfile}
                      className="w-full"
                    >
                      {isUpdatingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Save Profile"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword || !currentPassword || !newPassword}
                    className="w-full"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <TwoFactorSetup />

              <EncryptionSettings />

              <PushNotificationSetup />

              <ActiveSessions />
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Control how others see your activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Online Status</Label>
                      <p className="text-sm text-muted-foreground">
                        Let others see when you're online
                      </p>
                    </div>
                    <Switch
                      checked={onlineStatus}
                      onCheckedChange={(checked) => {
                        setOnlineStatus(checked);
                        handleUpdatePrivacy();
                      }}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Send Read Receipts</Label>
                      <p className="text-sm text-muted-foreground">
                        Let others know when you've read their messages
                      </p>
                    </div>
                    <Switch
                      checked={readReceipts}
                      onCheckedChange={(checked) => {
                        setReadReceipts(checked);
                        handleUpdatePrivacy();
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    View your account details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Status</Label>
                      <p className="text-sm font-medium capitalize">{user?.status || 'active'}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <p className="text-sm font-medium capitalize">{user?.role || 'user'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
              <NotificationSettings />
            </TabsContent>

            {/* Contacts Tab - Blocked Users */}
            <TabsContent value="contacts" className="space-y-4">
              <BlockedContacts />
            </TabsContent>

            {/* Account Tab - GDPR Features */}
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    View your current account details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <p className="text-sm font-medium capitalize">{user?.status || 'active'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <p className="text-sm font-medium capitalize">{user?.role || 'user'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <p className="text-sm font-medium">{user?.username}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <p className="text-sm font-medium">{user?.email}</p>
                    </div>
                    {user?.lastLogin && (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Last Login</Label>
                        <p className="text-sm font-medium">
                          {new Date(user.lastLogin).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Download Your Data</CardTitle>
                  <CardDescription>
                    Request a copy of all your data (GDPR compliance)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Download className="h-4 w-4" />
                    <AlertDescription>
                      Your data export will include: profile information, messages, files, contacts, and call history.
                      The download will start immediately when you click the button below.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={async () => {
                      setIsRequestingExport(true);
                      try {
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
                        const token = localStorage.getItem('accessToken');
                        const response = await axios.get(
                          `${apiUrl}/api/users/me/export`,
                          {
                            headers: { Authorization: `Bearer ${token}` },
                            responseType: 'blob'
                          }
                        );

                        // Create download link
                        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                        const link = document.createElement('a');
                        link.href = window.URL.createObjectURL(blob);
                        link.setAttribute('download', `messenger-data-export-${user?.username}-${new Date().toISOString().split('T')[0]}.json`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();

                        toast({
                          title: "Export complete",
                          description: "Your data has been downloaded successfully"
                        });
                      } catch (error: unknown) {
                        const err = error as { response?: { data?: { message?: string } } };
                        toast({
                          variant: "destructive",
                          title: "Export failed",
                          description: err.response?.data?.message || "Please try again"
                        });
                      } finally {
                        setIsRequestingExport(false);
                      }
                    }}
                    disabled={isRequestingExport}
                    className="w-full"
                  >
                    {isRequestingExport ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Requesting Export...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Request Data Export
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions that will affect your account permanently
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warning:</strong> Deleting your account is permanent and cannot be undone.
                      All your messages, files, and data will be permanently deleted after a 30-day grace period.
                    </AlertDescription>
                  </Alert>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete My Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                          <p>
                            This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                          </p>

                          <div className="space-y-2">
                            <p className="font-semibold">What will be deleted:</p>
                            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                              <li>Your profile and account information</li>
                              <li>All your messages (within 30-day retention)</li>
                              <li>All uploaded files and attachments</li>
                              <li>Your contacts and groups</li>
                              <li>Call history</li>
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="delete-password">Enter your password to confirm</Label>
                            <Input
                              id="delete-password"
                              type="password"
                              placeholder="Enter password"
                              value={deleteConfirmPassword}
                              onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                            />
                          </div>

                          <Alert>
                            <AlertDescription>
                              You have a 30-day grace period to cancel this deletion. After 30 days, all data will be permanently deleted.
                            </AlertDescription>
                          </Alert>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmPassword("")}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={!deleteConfirmPassword || isDeletingAccount}
                          onClick={async (e) => {
                            e.preventDefault();
                            setIsDeletingAccount(true);

                            try {
                              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
                              const token = localStorage.getItem('accessToken');

                              await axios.delete(`${apiUrl}/api/users/me`, {
                                headers: { Authorization: `Bearer ${token}` },
                                data: { password: deleteConfirmPassword }
                              });

                              toast({
                                title: "Account deletion requested",
                                description: "Your account will be deleted in 30 days. You can cancel this within the grace period."
                              });

                              // Logout after deletion request
                              setTimeout(async () => {
                                await logout();
                              }, 2000);
                            } catch (error: unknown) {
                              const err = error as { response?: { data?: { message?: string } } };
                              toast({
                                variant: "destructive",
                                title: "Deletion failed",
                                description: err.response?.data?.message || "Please try again"
                              });
                            } finally {
                              setIsDeletingAccount(false);
                              setDeleteConfirmPassword("");
                            }
                          }}
                        >
                          {isDeletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Yes, delete my account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
