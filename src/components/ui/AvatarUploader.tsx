import React, { useState } from 'react';
import { Camera, Pencil, X, Check, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { CloudinaryUploader, type CloudinaryUploadResponse } from '../CloudinaryUploader';

export interface AvatarUploaderProps {
  currentAvatar?: string;
  userName?: string;
  userId?: Id<'users'>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  editable?: boolean;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  sm: 36,
  md: 64,
  lg: 96,
  xl: 128,
};

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentAvatar,
  userName,
  userId,
  size = 'md',
  editable = true,
  onAvatarUpdated,
  className,
  style,
}) => {
  const { user, updateSessionUser } = useCurrentUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stagedAvatar, setStagedAvatar] = useState<{
    url: string;
    publicId: string;
    format: string;
    bytes: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const saveAvatarMutation = useMutation(api.cloudinary.saveAvatarMetadata);

  const effectiveUserId = (userId || user.userId) as Id<'users'> | undefined;
  const effectiveName = userName || user.name || 'User';
  const effectiveAvatar = currentAvatar !== undefined ? currentAvatar : user.avatar;

  const dimension = typeof size === 'number' ? size : SIZE_MAP[size] || 64;

  const initials = effectiveName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const avatarPreset =
    (import.meta as any).env?.VITE_CLOUDINARY_PRESET_AVATARS ||
    'omniflow_avatars';

  const handleUploadSuccess = (response: CloudinaryUploadResponse) => {
    setStagedAvatar({
      url: response.secure_url || response.url,
      publicId: response.public_id,
      format: response.format || 'jpg',
      bytes: response.bytes || 0,
    });
  };

  const handleConfirmAvatar = async () => {
    if (!stagedAvatar || !effectiveUserId) {
      if (stagedAvatar) {
        // If guest/local user without backend ID, still update local session
        updateSessionUser({ avatar: stagedAvatar.url });
        onAvatarUpdated?.(stagedAvatar.url);
        setToastMessage({ type: 'success', text: 'Avatar updated' });
        setTimeout(() => {
          setIsModalOpen(false);
          setStagedAvatar(null);
          setToastMessage(null);
        }, 1200);
      }
      return;
    }

    setIsSaving(true);
    try {
      await saveAvatarMutation({
        userId: effectiveUserId,
        cloudinaryPublicId: stagedAvatar.publicId,
        cloudinaryUrl: stagedAvatar.url,
        cloudinarySecureUrl: stagedAvatar.url,
        cloudinaryFormat: stagedAvatar.format,
        cloudinaryBytes: stagedAvatar.bytes,
      });

      // Synchronize current user session
      updateSessionUser({ avatar: stagedAvatar.url });
      onAvatarUpdated?.(stagedAvatar.url);

      setToastMessage({ type: 'success', text: 'Avatar updated' });
      setTimeout(() => {
        setIsModalOpen(false);
        setStagedAvatar(null);
        setToastMessage(null);
      }, 1200);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to update avatar' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className={className}
        style={{
          position: 'relative',
          width: `${dimension}px`,
          height: `${dimension}px`,
          borderRadius: '50%',
          flexShrink: 0,
          cursor: editable ? 'pointer' : 'default',
          ...style,
        }}
        onMouseEnter={() => editable && setIsHovered(true)}
        onMouseLeave={() => editable && setIsHovered(false)}
        onClick={() => editable && setIsModalOpen(true)}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-label={editable ? `Change avatar for ${effectiveName}` : `Avatar for ${effectiveName}`}
      >
        {/* Avatar Image or Initials */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: 'var(--slate-800, #1e293b)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${Math.max(12, Math.floor(dimension * 0.38))}px`,
            fontWeight: 700,
            border: '2px solid var(--border-primary, #e2e8f0)',
            boxShadow: 'var(--shadow-sm)',
            userSelect: 'none',
          }}
        >
          {effectiveAvatar ? (
            <img
              src={effectiveAvatar}
              alt={effectiveName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                // Hide broken image so initials fallback displays
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Hover Overlay Trigger */}
        {editable && isHovered && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              transition: 'opacity 0.15s ease',
              backdropFilter: 'blur(1px)',
            }}
          >
            {dimension >= 64 ? (
              <>
                <Camera size={Math.min(22, Math.floor(dimension * 0.3))} />
                <span style={{ fontSize: '9px', fontWeight: 600, marginTop: '2px' }}>Edit</span>
              </>
            ) : (
              <Pencil size={14} />
            )}
          </div>
        )}

        {/* Small Pencil badge on larger displays */}
        {editable && dimension >= 64 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: `${Math.max(20, Math.floor(dimension * 0.32))}px`,
              height: `${Math.max(20, Math.floor(dimension * 0.32))}px`,
              borderRadius: '50%',
              backgroundColor: 'var(--primary, #2563eb)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Pencil size={Math.max(10, Math.floor(dimension * 0.16))} />
          </div>
        )}
      </div>

      {/* Avatar Upload Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => {
            if (!isSaving) {
              setIsModalOpen(false);
              setStagedAvatar(null);
              setToastMessage(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              width: '100%',
              maxWidth: '460px',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'modalSlideUp 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-primary, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--text-primary, #0f172a)',
                    margin: 0,
                  }}
                >
                  Update Profile Picture
                </h3>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary, #64748b)',
                    margin: '2px 0 0 0',
                  }}
                >
                  Upload your avatar picture via Cloudinary
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isSaving) {
                    setIsModalOpen(false);
                    setStagedAvatar(null);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary, #64748b)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm, 6px)',
                }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Toast Feedback in modal */}
              {toastMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    backgroundColor:
                      toastMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${toastMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: toastMessage.type === 'success' ? '#065f46' : '#991b1b',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{toastMessage.text}</span>
                </div>
              )}

              {/* Preview of Staged or Current Avatar */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px',
                  backgroundColor: 'var(--bg-secondary, #f8fafc)',
                  borderRadius: 'var(--radius-md, 8px)',
                }}
              >
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid var(--primary, #2563eb)',
                    boxShadow: 'var(--shadow-md)',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: 700,
                  }}
                >
                  {stagedAvatar ? (
                    <img
                      src={stagedAvatar.url}
                      alt="Uploaded avatar preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : effectiveAvatar ? (
                    <img
                      src={effectiveAvatar}
                      alt="Current avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)' }}>
                  {stagedAvatar ? 'New avatar preview' : 'Current avatar display'}
                </div>
              </div>

              {/* Cloudinary Uploader */}
              <CloudinaryUploader
                uploadPreset={avatarPreset}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={(err) => {
                  setToastMessage({ type: 'error', text: err.message || 'Avatar upload failed' });
                }}
                maxFileSize={5 * 1024 * 1024} // 5MB
                allowedFormats={['jpg', 'jpeg', 'png', 'gif', 'webp']}
                folder={`omniflow/avatars/${effectiveUserId || 'common'}`}
                title="Choose new avatar picture"
                subtitle="JPG, PNG, GIF or WebP up to 5MB"
                compact
              />
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-primary, #e2e8f0)',
                backgroundColor: 'var(--bg-secondary, #f8fafc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setStagedAvatar(null);
                }}
                disabled={isSaving}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  border: '1px solid var(--border-primary, #cbd5e1)',
                  backgroundColor: 'var(--bg-primary, #ffffff)',
                  color: 'var(--text-secondary, #475569)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAvatar}
                disabled={!stagedAvatar || isSaving}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  border: 'none',
                  backgroundColor: !stagedAvatar || isSaving ? 'var(--slate-300, #cbd5e1)' : 'var(--primary, #2563eb)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: !stagedAvatar || isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Check size={15} />
                <span>{isSaving ? 'Saving...' : 'Use This Avatar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AvatarUploader;
