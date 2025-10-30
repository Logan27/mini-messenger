import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Loader2, Save, X, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/app/stores/authStore'
import { useUIStore } from '@/app/stores/uiStore'
import { profileUpdateSchema, type ProfileUpdateFormData } from '@/shared/lib/validations/auth'
import { toast } from 'sonner'

export const Profile = () => {
  const { user, updateProfile, isLoading, error, clearError } = useAuthStore()
  const { addNotification } = useUIStore()
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username: user?.username || '',
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
    },
  })

  const onSubmit = async (data: ProfileUpdateFormData) => {
    try {
      clearError()

      // Update profile data
      await updateProfile(data)

      // Handle avatar upload if there's a file
      if (avatarFile) {
        await uploadAvatar(avatarFile)
      }

      toast.success('Profile updated!', {
        description: 'Your profile has been successfully updated.',
      })

      addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile information has been saved.',
      })

      // Reset form to reflect saved state
      reset(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed'

      toast.error('Update Failed', {
        description: errorMessage,
      })
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Invalid file type', {
          description: 'Please select an image file.',
        })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', {
          description: 'Please select an image smaller than 5MB.',
        })
        return
      }

      setAvatarFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      // This would typically use a separate API endpoint for avatar upload
      // For now, we'll just simulate it
      console.log('Uploading avatar:', file.name)

      // In a real implementation, you would:
      // const response = await api.post('/api/users/avatar', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' }
      // })
    } catch (error) {
      console.error('Avatar upload failed:', error)
      throw error
    }
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isDisabled = isLoading || isSubmitting
  const hasChanges = isDirty || avatarFile !== null

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Please log in to view your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Skip to main content for screen readers */}
      <a
        href="#profile-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
      >
        Skip to profile form
      </a>

      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Manage your account information and preferences.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            id="profile-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage
                    src={avatarPreview || user.avatar}
                    alt={user.name}
                  />
                  <AvatarFallback className="text-lg">
                    {user.name?.charAt(0)?.toUpperCase() || <User className="w-8 h-8" />}
                  </AvatarFallback>
                </Avatar>

                {/* Camera overlay button */}
                <Button
                  type="button"
                  size="sm"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isDisabled}
                >
                  <Camera className="w-4 h-4" />
                </Button>

                {/* Remove avatar button */}
                {(avatarPreview || user.avatar) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                    onClick={removeAvatar}
                    disabled={isDisabled}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-medium">{user.name}</h3>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the camera icon to change your avatar
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  disabled={isDisabled}
                  {...register('username')}
                  aria-invalid={errors.username ? 'true' : 'false'}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                />
                {errors.username && (
                  <p id="username-error" className="text-sm text-destructive" role="alert">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  disabled={isDisabled}
                  {...register('name')}
                  aria-invalid={errors.name ? 'true' : 'false'}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-destructive" role="alert">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
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

              {/* Bio */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px]"
                  disabled={isDisabled}
                  {...register('bio')}
                  aria-invalid={errors.bio ? 'true' : 'false'}
                  aria-describedby={errors.bio ? 'bio-error' : undefined}
                />
                {errors.bio && (
                  <p id="bio-error" className="text-sm text-destructive" role="alert">
                    {errors.bio.message}
                  </p>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md" role="alert">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={isDisabled || !hasChanges}
              >
                {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={isDisabled}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}