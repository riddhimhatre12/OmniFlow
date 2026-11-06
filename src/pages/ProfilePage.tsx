import React, { useState } from 'react';
import {
  User,
  Shield,
  Bell,
  Mail,
  Building,
  Briefcase,
  Globe,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Laptop
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { AvatarUploader } from '../components/ui/AvatarUploader';

interface ProfilePageProps {
  onNavigate: (route: string) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
];

interface GeneralTabFormProps {
  initialName: string;
  initialTitle?: string;
  initialDepartment?: string;
  initialBio?: string;
  initialTimezone?: string;
  initialAvatar?: string;
  userEmail: string;
  userRole?: string;
  isSaving: boolean;
  onSave: (data: {
    name: string;
    title: string;
    department: string;
    bio: string;
    timezone: string;
    avatar: string;
  }) => Promise<void>;
}

function GeneralTabForm({
  initialName,
  initialTitle,
  initialDepartment,
  initialBio,
  initialTimezone,
  initialAvatar,
  userEmail,
  userRole,
  isSaving,
  onSave,
}: GeneralTabFormProps) {
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState(initialTitle || '');
  const [department, setDepartment] = useState(initialDepartment || '');
  const [bio, setBio] = useState(initialBio || '');
  const [timezone, setTimezone] = useState(initialTimezone || 'UTC+05:30 (Asia/Kolkata)');
  const [avatar, setAvatar] = useState(initialAvatar || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, title, department, bio, timezone, avatar });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '16px' }}>
          Profile Avatar
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <AvatarUploader
              currentAvatar={avatar}
              userName={name}
              size={80}
              onAvatarUpdated={(newUrl) => setAvatar(newUrl)}
            />
            <span style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 500 }}>
              Hover & click to upload
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-700)' }}>
              Or choose from presets:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {AVATAR_PRESETS.map((preset, idx) => (
                <img
                  key={idx}
                  src={preset}
                  alt={`Preset ${idx + 1}`}
                  onClick={() => setAvatar(preset)}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: avatar === preset ? '3px solid var(--primary)' : '2px solid var(--slate-200)',
                    boxShadow: avatar === preset ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLImageElement>) => (e.currentTarget.style.transform = 'scale(1.08)')}
                  onMouseLeave={(e: React.MouseEvent<HTMLImageElement>) => (e.currentTarget.style.transform = 'scale(1)')}
                />
              ))}
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  style={{
                    fontSize: '12px',
                    color: 'var(--slate-500)',
                    background: 'none',
                    border: '1px solid var(--slate-300)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '6px 10px',
                    cursor: 'pointer',
                  }}
                >
                  Reset to Initials
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '18px' }}>
          Personal & Workspace Details
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          <Input
            label="Full Name"
            placeholder="e.g. Jane Doe"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            leftIcon={<User size={16} />}
            required
          />

          <Input
            label="Work Email (Registered)"
            value={userEmail}
            readOnly
            disabled
            leftIcon={<Mail size={16} />}
            helperText="Managed by workspace SSO and Convex credentials."
          />

          <Input
            label="Job Title"
            placeholder="e.g. Lead Platform Architect"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            leftIcon={<Briefcase size={16} />}
          />

          <Input
            label="Department"
            placeholder="e.g. Engineering & Infrastructure"
            value={department}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepartment(e.target.value)}
            leftIcon={<Building size={16} />}
          />

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '6px' }}>
              Timezone
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '12px', color: 'var(--slate-400)' }}>
                <Globe size={16} />
              </div>
              <select
                value={timezone}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTimezone(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '38px',
                  paddingRight: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: 'var(--white)',
                  fontSize: '14px',
                  color: 'var(--slate-800)',
                }}
              >
                <option value="UTC+05:30 (Asia/Kolkata)">UTC+05:30 (Asia/Kolkata - India Standard Time)</option>
                <option value="UTC+00:00 (Europe/London)">UTC+00:00 (Europe/London - GMT)</option>
                <option value="UTC-05:00 (America/New_York)">UTC-05:00 (America/New_York - EST)</option>
                <option value="UTC-08:00 (America/Los_Angeles)">UTC-08:00 (America/Los_Angeles - PST)</option>
                <option value="UTC+01:00 (Europe/Paris)">UTC+01:00 (Europe/Paris - CET)</option>
                <option value="UTC+08:00 (Asia/Singapore)">UTC+08:00 (Asia/Singapore - SGT)</option>
                <option value="UTC+09:00 (Asia/Tokyo)">UTC+09:00 (Asia/Tokyo - JST)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '6px' }}>
              Workspace Role
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '12px', color: 'var(--slate-400)' }}>
                <Shield size={16} />
              </div>
              <input
                type="text"
                value={userRole || 'Administrator'}
                readOnly
                disabled
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '38px',
                  paddingRight: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-200)',
                  backgroundColor: 'var(--slate-50)',
                  fontSize: '14px',
                  color: 'var(--slate-600)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div style={{ marginTop: '18px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '6px' }}>
            Professional Bio
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
            placeholder="Share a short summary about your focus areas, projects, and work."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--slate-300)',
              backgroundColor: 'var(--white)',
              fontSize: '14px',
              color: 'var(--slate-800)',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSaving}
            icon={isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          >
            {isSaving ? 'Saving to Convex...' : 'Save Profile Changes'}
          </Button>
        </div>
      </Card>
    </form>
  );
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, updateSessionUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'preferences'>('general');

  // Convex live queries & mutations
  const liveUser = useQuery(api.auth.getUserByEmail, { email: user.email || '' });
  const updateProfileMutation = useMutation(api.auth.updateProfile);
  const changePasswordMutation = useMutation(api.auth.changePassword);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification states
  const [notifyProjects, setNotifyProjects] = useState(true);
  const [notifyTasks, setNotifyTasks] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);

  // Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayName = liveUser?.name || user.name || 'User';
  const displayAvatar = liveUser?.avatar || user.avatar;
  const displayTitle = liveUser?.title || user.title;
  const displayDepartment = liveUser?.department || user.department;
  const displayRole = liveUser?.role || user.role || 'Administrator';

  const handleProfileSave = async (data: {
    name: string;
    title: string;
    department: string;
    bio: string;
    timezone: string;
    avatar: string;
  }) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await updateProfileMutation({
        email: user.email,
        name: data.name.trim(),
        title: data.title.trim(),
        department: data.department.trim(),
        bio: data.bio.trim(),
        timezone: data.timezone,
        avatar: data.avatar,
        role: user.role,
      });

      updateSessionUser({
        name: data.name.trim(),
        title: data.title.trim(),
        department: data.department.trim(),
        bio: data.bio.trim(),
        timezone: data.timezone,
        avatar: data.avatar,
      });

      setSuccessMessage('Profile information saved successfully to Convex backend.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    setIsChangingPass(true);
    try {
      await changePasswordMutation({
        email: user.email,
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password changed successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/Uncaught Error: |Server Error: /gi, '') : 'Password change failed.';
      setErrorMessage(msg.split('\n')[0]);
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <DashboardLayout activeItem="settings" onSelectItem={() => {}} onNavigate={onNavigate}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Breadcrumb Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--slate-500)', marginBottom: '4px' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('/dashboard')}>Dashboard</span>
              <span>/</span>
              <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Profile & Settings</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--slate-950)', margin: 0, letterSpacing: '-0.5px' }}>
              Account Settings
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span>Convex Cloud Synced</span>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {successMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '14px', fontWeight: 500 }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '14px', fontWeight: 500 }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hero Profile Overview Card */}
        <Card style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Avatar / Initials with Cloudinary upload */}
            <div style={{ position: 'relative' }}>
              <AvatarUploader
                size={74}
                currentAvatar={displayAvatar}
                userName={displayName}
                onAvatarUpdated={(url) => updateSessionUser({ avatar: url })}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  border: '2px solid var(--white)',
                  pointerEvents: 'none',
                }}
                title="Active Now"
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  {displayName}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--primary-subtle, #eff6ff)',
                    color: 'var(--primary)',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  {displayRole}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span>{user.email}</span>
                {displayTitle && (
                  <>
                    <span>&bull;</span>
                    <span>{displayTitle}</span>
                  </>
                )}
                {displayDepartment && (
                  <>
                    <span>&bull;</span>
                    <span>{displayDepartment}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Laptop size={14} />}
              onClick={() => onNavigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </Card>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--slate-200)', paddingBottom: '2px' }}>
          {[
            { id: 'general', label: 'General Information', icon: <User size={16} /> },
            { id: 'security', label: 'Security & Auth', icon: <Shield size={16} /> },
            { id: 'preferences', label: 'Preferences', icon: <Bell size={16} /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as 'general' | 'security' | 'preferences');
                  setSuccessMessage(null);
                  setErrorMessage(null);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary)' : 'var(--slate-600)',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  marginBottom: '-1px',
                  transition: 'all 0.12s ease',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: General Information */}
        {activeTab === 'general' && (
          <GeneralTabForm
            key={liveUser?.id ?? user.email}
            initialName={liveUser?.name ?? user.name ?? ''}
            initialTitle={liveUser?.title ?? user.title ?? ''}
            initialDepartment={liveUser?.department ?? user.department ?? ''}
            initialBio={liveUser?.bio ?? user.bio ?? ''}
            initialTimezone={liveUser?.timezone ?? user.timezone ?? 'UTC+05:30 (Asia/Kolkata)'}
            initialAvatar={liveUser?.avatar ?? user.avatar ?? ''}
            userEmail={user.email}
            userRole={user.role}
            isSaving={isSaving}
            onSave={handleProfileSave}
          />
        )}

        {/* TAB 2: Security & Authentication */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Connected Providers */}
            <Card style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                Authentication Methods
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginBottom: '20px' }}>
                Manage sign-in integrations configured for your enterprise workspace.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)', backgroundColor: 'var(--slate-50)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.27v3.14C3.25 21.27 7.31 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.6H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.4l4.01-3.14z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.73 1.27 6.6l4.01 3.14c.95-2.84 3.6-4.99 6.72-4.99z" />
                    </svg>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--slate-800)' }}>Google Single Sign-On</div>
                      <div style={{ fontSize: '12px', color: 'var(--slate-500)' }}>OAuth 2.0 Identity Protocol</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: 'var(--radius-xs)' }}>
                    Active
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)', backgroundColor: 'var(--slate-50)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Key size={20} color="var(--primary)" />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--slate-800)' }}>Work Email & Password</div>
                      <div style={{ fontSize: '12px', color: 'var(--slate-500)' }}>Encrypted credentials stored on Convex Cloud</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: 'var(--radius-xs)' }}>
                    Enabled
                  </span>
                </div>
              </div>
            </Card>

            {/* Change Password Form */}
            <form onSubmit={handlePasswordSubmit}>
              <Card style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                  Change Account Password
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginBottom: '18px' }}>
                  Ensure your account uses a secure password of at least 6 characters.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '440px' }}>
                  <Input
                    label="Current Password"
                    type="password"
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                    leftIcon={<Lock size={16} />}
                    required
                  />

                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                    leftIcon={<Lock size={16} />}
                    required
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    leftIcon={<Lock size={16} />}
                    required
                  />

                  <div style={{ marginTop: '6px' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={isChangingPass}
                      icon={isChangingPass ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                    >
                      {isChangingPass ? 'Updating Password...' : 'Update Password'}
                    </Button>
                  </div>
                </div>
              </Card>
            </form>
          </div>
        )}

        {/* TAB 3: Preferences */}
        {activeTab === 'preferences' && (
          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
              Workspace Notifications
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginBottom: '20px' }}>
              Choose which events trigger real-time system alerts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                {
                  label: 'Project Milestone Updates',
                  desc: 'Get notified when roadmaps, deadlines, or project statuses are updated.',
                  checked: notifyProjects,
                  onChange: () => setNotifyProjects(!notifyProjects),
                },
                {
                  label: 'Task Assignments & Reviews',
                  desc: 'Notify me when tasks are assigned to me or moved to code review.',
                  checked: notifyTasks,
                  onChange: () => setNotifyTasks(!notifyTasks),
                },
                {
                  label: 'Team Mentions & Comments',
                  desc: 'Notify me whenever someone mentions @me in discussions or workflows.',
                  checked: notifyMentions,
                  onChange: () => setNotifyMentions(!notifyMentions),
                },
              ].map((item, idx) => (
                <label
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-200)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.onChange}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--primary)',
                      marginTop: '2px',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--slate-800)' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
                      {item.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
