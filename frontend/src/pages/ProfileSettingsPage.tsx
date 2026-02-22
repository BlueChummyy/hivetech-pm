import { useState, useRef } from 'react';
import { Loader2, Sun, Moon, Camera, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateProfile, useChangePassword, useUploadAvatar, useRemoveAvatar } from '@/hooks/useUsers';
import { useUIStore } from '@/store/ui.store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function ProfileSettingsPage() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const { toast } = useToast();
  const { theme, setTheme } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const hasNameChanged =
    firstName.trim() !== (user?.firstName || '') ||
    lastName.trim() !== (user?.lastName || '');

  function handleProfileSave() {
    if (!firstName.trim() || !lastName.trim()) return;
    updateProfile.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim() },
      {
        onSuccess: () => {
          toast({ type: 'success', title: 'Profile updated successfully' });
        },
        onError: (err) => {
          toast({ type: 'error', title: 'Failed to update profile', description: (err as Error).message });
        },
      },
    );
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({ type: 'error', title: 'File too large', description: 'Avatar must be under 5MB' });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    uploadAvatar.mutate(file, {
      onSuccess: () => {
        setAvatarPreview(null);
        toast({ type: 'success', title: 'Avatar updated' });
      },
      onError: (err) => {
        setAvatarPreview(null);
        toast({ type: 'error', title: 'Failed to upload avatar', description: (err as Error).message });
      },
    });

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleAvatarRemove() {
    removeAvatar.mutate(undefined, {
      onSuccess: () => {
        toast({ type: 'success', title: 'Avatar removed' });
      },
      onError: (err) => {
        toast({ type: 'error', title: 'Failed to remove avatar', description: (err as Error).message });
      },
    });
  }

  function handlePasswordChange() {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess(true);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          toast({ type: 'success', title: 'Password changed successfully' });
        },
        onError: () => {
          setPasswordError('Failed to change password. Check your current password.');
        },
      },
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-surface-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-surface-100">Profile Settings</h1>

      {/* Profile section */}
      <div className="rounded-xl border border-surface-700 bg-surface-800 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-surface-100">Profile</h2>

        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Preview"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <Avatar
                src={user.avatarUrl}
                name={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                className="h-20 w-20 text-2xl"
              />
            )}
            {uploadAvatar.isPending && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
            >
              <Camera className="mr-1.5 h-4 w-4" />
              {user.avatarUrl ? 'Change avatar' : 'Upload avatar'}
            </Button>
            {user.avatarUrl && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAvatarRemove}
                disabled={removeAvatar.isPending}
              >
                <X className="mr-1.5 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-300">
              Email
            </label>
            <div className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-500">
              {user.email}
            </div>
          </div>
          <Button
            onClick={handleProfileSave}
            loading={updateProfile.isPending}
            disabled={!firstName.trim() || !lastName.trim() || !hasNameChanged}
          >
            Save profile
          </Button>
        </div>
      </div>

      {/* Password section */}
      <div className="rounded-xl border border-surface-700 bg-surface-800 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-surface-100">Change Password</h2>

        <div className="max-w-md space-y-4">
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordError || undefined}
          />
          {passwordSuccess && (
            <p className="text-sm text-emerald-400">Password changed successfully</p>
          )}
          <Button
            onClick={handlePasswordChange}
            loading={changePassword.isPending}
            disabled={!currentPassword || !newPassword || !confirmPassword}
          >
            Change password
          </Button>
        </div>
      </div>

      {/* Appearance section */}
      <div className="rounded-xl border border-surface-700 bg-surface-800 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-surface-100">Appearance</h2>

        <div className="max-w-md space-y-4">
          <label className="block text-sm font-medium text-surface-300">
            Theme
          </label>
          <div className="inline-flex rounded-lg border border-surface-700 bg-surface-900 p-1">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-surface-700 text-surface-100'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-surface-700 text-surface-100'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
