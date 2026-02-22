import { useState } from 'react';
import { UserCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateProfile, useChangePassword } from '@/hooks/useUsers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function ProfileSettingsPage() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
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
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <UserCircle className="h-20 w-20 text-surface-500" />
          )}
          <Button size="sm" variant="secondary" disabled>
            Upload avatar
          </Button>
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
    </div>
  );
}
