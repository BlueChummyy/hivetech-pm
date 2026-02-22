import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Sun, Moon, Camera, X, Check } from 'lucide-react';
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

  // Crop modal state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, size: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, bx: 0, by: 0 });
  const [displayDims, setDisplayDims] = useState({ width: 0, height: 0 });

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

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setImageLoaded(false);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleCropImageLoad = useCallback(() => {
    const img = cropImageRef.current;
    const container = cropContainerRef.current;
    if (!img || !container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgAspect = img.naturalWidth / img.naturalHeight;

    let dw: number, dh: number;
    if (imgAspect > containerWidth / containerHeight) {
      dw = containerWidth;
      dh = containerWidth / imgAspect;
    } else {
      dh = containerHeight;
      dw = containerHeight * imgAspect;
    }

    setDisplayDims({ width: dw, height: dh });
    const initialSize = Math.min(dw, dh) * 0.75;
    setCropBox({
      x: (dw - initialSize) / 2,
      y: (dh - initialSize) / 2,
      size: initialSize,
    });
    setImageLoaded(true);
  }, []);

  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      bx: cropBox.x,
      by: cropBox.y,
    };
  }, [cropBox.x, cropBox.y]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const maxX = displayDims.width - cropBox.size;
      const maxY = displayDims.height - cropBox.size;
      setCropBox((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(maxX, dragStart.current.bx + dx)),
        y: Math.max(0, Math.min(maxY, dragStart.current.by + dy)),
      }));
    };

    const handleMouseUp = () => setDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, displayDims.width, displayDims.height, cropBox.size]);

  function handleCropConfirm() {
    const img = cropImageRef.current;
    if (!img || !cropImageSrc) return;

    const scaleX = img.naturalWidth / displayDims.width;
    const scaleY = img.naturalHeight / displayDims.height;

    const sx = cropBox.x * scaleX;
    const sy = cropBox.y * scaleY;
    const sSize = cropBox.size * Math.min(scaleX, scaleY);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, 256, 256);

    canvas.toBlob((blob) => {
      if (!blob) return;

      setAvatarPreview(canvas.toDataURL('image/png'));
      setShowCropModal(false);
      setCropImageSrc(null);

      uploadAvatar.mutate(blob, {
        onSuccess: () => {
          setAvatarPreview(null);
          toast({ type: 'success', title: 'Avatar updated' });
        },
        onError: (err) => {
          setAvatarPreview(null);
          toast({ type: 'error', title: 'Failed to upload avatar', description: (err as Error).message });
        },
      });
    }, 'image/png');
  }

  function handleCropCancel() {
    setShowCropModal(false);
    setCropImageSrc(null);
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

      {/* Crop Modal */}
      {showCropModal && cropImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-xl border border-surface-700 bg-surface-800 p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-surface-100">Crop Avatar</h3>
            <p className="mb-3 text-sm text-surface-400">
              Drag the square to position your crop area.
            </p>

            <div
              ref={cropContainerRef}
              className="relative mx-auto flex items-center justify-center overflow-hidden rounded-lg bg-surface-900"
              style={{ width: '100%', height: 360 }}
            >
              <img
                ref={cropImageRef}
                src={cropImageSrc}
                alt="Crop source"
                onLoad={handleCropImageLoad}
                className="pointer-events-none select-none"
                style={{
                  width: displayDims.width || 'auto',
                  height: displayDims.height || 'auto',
                  maxWidth: '100%',
                  maxHeight: 360,
                  objectFit: 'contain',
                }}
              />

              {imageLoaded && (
                <>
                  {/* Dimming overlay outside crop */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: (cropContainerRef.current ? (cropContainerRef.current.clientWidth - displayDims.width) / 2 : 0),
                      top: (cropContainerRef.current ? (cropContainerRef.current.clientHeight - displayDims.height) / 2 : 0),
                      width: displayDims.width,
                      height: displayDims.height,
                      background: 'rgba(0,0,0,0.5)',
                      clipPath: `polygon(
                        0% 0%, 0% 100%,
                        ${(cropBox.x / displayDims.width) * 100}% 100%,
                        ${(cropBox.x / displayDims.width) * 100}% ${(cropBox.y / displayDims.height) * 100}%,
                        ${((cropBox.x + cropBox.size) / displayDims.width) * 100}% ${(cropBox.y / displayDims.height) * 100}%,
                        ${((cropBox.x + cropBox.size) / displayDims.width) * 100}% ${((cropBox.y + cropBox.size) / displayDims.height) * 100}%,
                        ${(cropBox.x / displayDims.width) * 100}% ${((cropBox.y + cropBox.size) / displayDims.height) * 100}%,
                        ${(cropBox.x / displayDims.width) * 100}% 100%,
                        100% 100%, 100% 0%
                      )`,
                    }}
                  />
                  {/* Crop selection box */}
                  <div
                    onMouseDown={handleCropMouseDown}
                    className="absolute border-2 border-white rounded-sm"
                    style={{
                      left: (cropContainerRef.current ? (cropContainerRef.current.clientWidth - displayDims.width) / 2 : 0) + cropBox.x,
                      top: (cropContainerRef.current ? (cropContainerRef.current.clientHeight - displayDims.height) / 2 : 0) + cropBox.y,
                      width: cropBox.size,
                      height: cropBox.size,
                      cursor: dragging ? 'grabbing' : 'grab',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
                    }}
                  >
                    {/* Corner indicators */}
                    <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-white" />
                    <div className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-white" />
                    <div className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full bg-white" />
                    <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-white" />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={handleCropCancel}>
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleCropConfirm} disabled={!imageLoaded}>
                <Check className="mr-1.5 h-4 w-4" />
                Apply crop
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
