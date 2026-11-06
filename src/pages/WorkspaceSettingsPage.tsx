import React, { useState } from 'react';
import {
  Building2,
  Upload,
  Check,
  CheckCircle2,
  AlertCircle,
  Shield,
  Users2,
  ExternalLink,
  X,
  Lock,
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useWorkspaceAuth } from '../context/WorkspaceAuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { CloudinaryUploader, type CloudinaryUploadResponse } from '../components/CloudinaryUploader';

interface WorkspaceSettingsPageProps {
  onNavigate: (route: string) => void;
  workspaceId?: string;
}

export const WorkspaceSettingsPage: React.FC<WorkspaceSettingsPageProps> = ({
  onNavigate,
  workspaceId: routeWorkspaceId,
}) => {
  const { workspace, isOwner, isAdmin, userRole } = useWorkspaceAuth();
  const { user } = useCurrentUser();

  const effectiveWorkspaceId =
    (routeWorkspaceId || workspace?.id) as Id<'workspaces'> | undefined;
  const currentUserId = user.userId as Id<'users'> | undefined;

  const canEditWorkspace = isOwner || isAdmin;

  // Live workspace details query
  const workspaceDetails = useQuery(
    api.workspaces.getWorkspaceDetails,
    effectiveWorkspaceId && currentUserId
      ? {
          workspaceId: effectiveWorkspaceId,
          userId: currentUserId,
        }
      : 'skip'
  );

  const saveWorkspaceLogoMutation = useMutation(api.cloudinary.saveWorkspaceLogoMetadata);

  // Logo upload modal state
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [stagedLogo, setStagedLogo] = useState<{
    url: string;
    publicId: string;
    format: string;
    bytes: number;
  } | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const logoPreset =
    (import.meta as any).env?.VITE_CLOUDINARY_PRESET_LOGOS ||
    'omniflow_workspace_logos';

  const wsName = workspaceDetails?.name || workspace?.name || 'Workspace';
  const wsAvatar = workspaceDetails?.avatar || workspace?.avatar;

  const wsInitials = wsName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'WS';

  const handleCloudinarySuccess = (response: CloudinaryUploadResponse) => {
    setStagedLogo({
      url: response.secure_url || response.url,
      publicId: response.public_id,
      format: response.format || 'png',
      bytes: response.bytes || 0,
    });
  };

  const handleSaveLogo = async () => {
    if (!stagedLogo || !effectiveWorkspaceId || !currentUserId) return;

    setIsSavingLogo(true);
    try {
      await saveWorkspaceLogoMutation({
        workspaceId: effectiveWorkspaceId,
        userId: currentUserId,
        cloudinaryPublicId: stagedLogo.publicId,
        cloudinaryUrl: stagedLogo.url,
        cloudinarySecureUrl: stagedLogo.url,
        cloudinaryFormat: stagedLogo.format,
        cloudinaryBytes: stagedLogo.bytes,
      });

      showToast('success', 'Workspace logo updated successfully');
      setIsLogoModalOpen(false);
      setStagedLogo(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update workspace logo');
    } finally {
      setIsSavingLogo(false);
    }
  };

  return (
    <DashboardLayout activeItem="settings" onSelectItem={() => {}} onNavigate={onNavigate}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxWidth: '1000px',
          margin: '0 auto',
          paddingBottom: '40px',
        }}
      >
        {/* Breadcrumb Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--slate-500)',
                marginBottom: '4px',
              }}
            >
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/dashboard')}>
                Dashboard
              </span>
              <span>/</span>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/preferences')}>
                Settings
              </span>
              <span>/</span>
              <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Workspace Settings</span>
            </div>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: 'var(--slate-950)',
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              Workspace Settings
            </h1>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: canEditWorkspace ? '#166534' : '#854d0e',
              backgroundColor: canEditWorkspace ? '#f0fdf4' : '#fefce8',
              border: `1px solid ${canEditWorkspace ? '#bbf7d0' : '#fef08a'}`,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
            }}
          >
            {canEditWorkspace ? (
              <>
                <Shield size={14} color="#16a34a" />
                <span>{isOwner ? 'Workspace Owner' : 'Workspace Admin'}</span>
              </>
            ) : (
              <>
                <Lock size={14} color="#ca8a04" />
                <span>Viewing as {userRole?.name || 'Member'} (Read-Only)</span>
              </>
            )}
          </div>
        </div>

        {/* Global Toast Alert */}
        {toastMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor:
                toastMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${toastMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: toastMessage.type === 'success' ? '#166534' : '#b91c1c',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Section 1: Workspace Logo Card */}
        <Card style={{ padding: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--slate-900)',
                  margin: 0,
                }}
              >
                Workspace Brand & Logo
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--slate-500)',
                  margin: '4px 0 0 0',
                }}
              >
                Upload your company or team logo. Displayed on the sidebar, header, and switcher.
              </p>
            </div>

            {canEditWorkspace && (
              <Button
                variant="primary"
                onClick={() => setIsLogoModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Upload size={15} />
                <span>Upload Logo</span>
              </Button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              flexWrap: 'wrap',
              padding: '20px',
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
            }}
          >
            {/* Logo Display */}
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: wsAvatar ? 'transparent' : 'var(--primary)',
                color: 'var(--white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 800,
                overflow: 'hidden',
                border: '2px solid var(--slate-200)',
                boxShadow: 'var(--shadow-sm)',
                flexShrink: 0,
              }}
            >
              {wsAvatar ? (
                <img
                  src={wsAvatar}
                  alt={wsName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                wsInitials
              )}
            </div>

            {/* Info and guidelines */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>
                {wsName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '4px' }}>
                Recommended dimensions: 200x200px or square. Formats: PNG, JPG, SVG, WebP.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
                Stored and optimized globally via Cloudinary CDN.
              </div>

              {canEditWorkspace ? (
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(true)}
                  style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {wsAvatar ? 'Change existing logo' : 'Choose and upload a logo'}
                </button>
              ) : (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--slate-400)' }}>
                  Only workspace owners and administrators can change the logo.
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Section 2: Workspace Details Overview */}
        <Card style={{ padding: '28px' }}>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--slate-900)',
              margin: '0 0 16px 0',
            }}
          >
            Workspace Information
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                Workspace Name
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)', marginTop: '4px' }}>
                {wsName}
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                URL Slug
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginTop: '4px', fontFamily: 'monospace' }}>
                /workspace/{workspace?.slug || effectiveWorkspaceId}
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                Members
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '4px',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>
                  {workspaceDetails?.memberCount || 1} team members
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('/teams')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Manage</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 3: Quick Navigation to Related Settings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <Card
            style={{
              padding: '20px',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onClick={() => onNavigate('/roles')}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(79, 70, 229, 0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-900)' }}>
                  Workspace Roles & Permissions
                </div>
                <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
                  Manage RBAC policies and custom permissions
                </div>
              </div>
            </div>
          </Card>

          <Card
            style={{
              padding: '20px',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onClick={() => onNavigate('/teams')}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-900)' }}>
                  Team Members & Invitations
                </div>
                <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
                  Invite teammates and manage workspace roster
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Workspace Logo Upload Modal */}
      {isLogoModalOpen && (
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
            if (!isSavingLogo) {
              setIsLogoModalOpen(false);
              setStagedLogo(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              width: '100%',
              maxWidth: '480px',
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
                  Upload Workspace Logo
                </h3>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary, #64748b)',
                    margin: '2px 0 0 0',
                  }}
                >
                  Brand your workspace across OmniFlow
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isSavingLogo) {
                    setIsLogoModalOpen(false);
                    setStagedLogo(null);
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
              {/* Logo Preview (200x200px) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '20px',
                  backgroundColor: 'var(--bg-secondary, #f8fafc)',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border-primary, #e2e8f0)',
                }}
              >
                <div
                  style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: 'var(--radius-md, 12px)',
                    overflow: 'hidden',
                    border: '2px dashed var(--primary, #2563eb)',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {stagedLogo ? (
                    <img
                      src={stagedLogo.url}
                      alt="Uploaded logo preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : wsAvatar ? (
                    <img
                      src={wsAvatar}
                      alt="Current workspace logo"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--slate-400)',
                      }}
                    >
                      <Building2 size={40} />
                      <span style={{ fontSize: '12px' }}>200 x 200 Preview</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)' }}>
                  {stagedLogo ? 'New logo preview' : 'Current workspace logo'}
                </div>
              </div>

              {/* Cloudinary Uploader */}
              <CloudinaryUploader
                uploadPreset={logoPreset}
                onUploadSuccess={handleCloudinarySuccess}
                onUploadError={(err) => {
                  showToast('error', err.message || 'Logo upload failed');
                }}
                maxFileSize={2 * 1024 * 1024} // 2MB limit
                allowedFormats={['jpg', 'jpeg', 'png', 'svg', 'webp']}
                folder={`omniflow/logos/${effectiveWorkspaceId || 'common'}`}
                title="Select workspace logo"
                subtitle="PNG, JPG, SVG, WebP up to 2MB"
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
                  setIsLogoModalOpen(false);
                  setStagedLogo(null);
                }}
                disabled={isSavingLogo}
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
                onClick={handleSaveLogo}
                disabled={!stagedLogo || isSavingLogo}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  border: 'none',
                  backgroundColor: !stagedLogo || isSavingLogo ? 'var(--slate-300, #cbd5e1)' : 'var(--primary, #2563eb)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: !stagedLogo || isSavingLogo ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Check size={15} />
                <span>{isSavingLogo ? 'Saving...' : 'Save Logo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default WorkspaceSettingsPage;
