import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useWorkspaceAuth } from '../context/WorkspaceAuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  Bell,
  Mail,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  CheckSquare,
  PlayCircle,
  Flag,
  Users2,
  Shield,
  AtSign,
  Radio,
  Sun,
  Moon,
  Monitor,
  Building2,
} from 'lucide-react';
import { useTheme, type Theme } from '../contexts/ThemeContext';

interface PreferencesPageProps {
  onNavigate: (route: string) => void;
}

const DEFAULT_PREFERENCES = {
  taskAssignedEnabled: true,
  taskCommentedEnabled: true,
  sprintStartedEnabled: true,
  sprintClosedEnabled: true,
  memberInvitedEnabled: true,
  memberJoinedEnabled: true,
  roleChangedEnabled: true,
  mentionEnabled: true,
  emailNotifications: false,
  deliveryMethod: 'in_app',
  notificationFrequency: 'instant',
};

export const PreferencesPage: React.FC<PreferencesPageProps> = ({ onNavigate }) => {
  const { workspace } = useWorkspaceAuth();
  const { user } = useCurrentUser();

  const userId = user?.userId ? (user.userId as any) : undefined;
  const workspaceId = workspace?.id ? (workspace.id as any) : undefined;

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'notifications' | 'email' | 'display'>('notifications');

  // Theme Context hook
  const { theme, setTheme, isDark } = useTheme();

  // Load preferences from Convex
  const savedPreferences = useQuery(
    api.notifications.getUserNotificationPreferences,
    userId && workspaceId ? { userId, workspaceId } : 'skip'
  );

  const updatePreferences = useMutation(api.notifications.updateNotificationPreferences);

  // User form overrides state
  const [formOverrides, setFormOverrides] = useState<Partial<typeof DEFAULT_PREFERENCES>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derive active preferences from saved DB values + user edits
  const preferences = {
    ...DEFAULT_PREFERENCES,
    ...(savedPreferences || {}),
    ...formOverrides,
  };

  const handleToggle = (key: keyof typeof DEFAULT_PREFERENCES) => {
    setFormOverrides((prev) => ({
      ...prev,
      [key]: !preferences[key],
    }));
  };

  const handleRadioChange = (key: 'deliveryMethod' | 'notificationFrequency', value: string) => {
    setFormOverrides((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'deliveryMethod' ? { emailNotifications: value === 'email_and_in_app' } : {}),
    }));
  };

  const handleSave = async () => {
    if (!userId || !workspaceId) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await updatePreferences({
        userId,
        workspaceId,
        preferences: {
          taskAssignedEnabled: Boolean(preferences.taskAssignedEnabled),
          taskCommentedEnabled: Boolean(preferences.taskCommentedEnabled),
          sprintStartedEnabled: Boolean(preferences.sprintStartedEnabled),
          sprintClosedEnabled: Boolean(preferences.sprintClosedEnabled),
          memberInvitedEnabled: Boolean(preferences.memberInvitedEnabled),
          memberJoinedEnabled: Boolean(preferences.memberJoinedEnabled),
          roleChangedEnabled: Boolean(preferences.roleChangedEnabled),
          mentionEnabled: Boolean(preferences.mentionEnabled),
          emailNotifications: Boolean(preferences.emailNotifications),
          deliveryMethod: preferences.deliveryMethod,
          notificationFrequency: preferences.notificationFrequency,
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save preferences:', err);
      setErrorMessage(err.message || 'Failed to save preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all notification preferences to defaults?')) {
      setFormOverrides(DEFAULT_PREFERENCES);
    }
  };

  return (
    <DashboardLayout activeItem="settings" onNavigate={onNavigate}>
      <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 6px 0' }}>
              Preferences & Settings
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--slate-500)' }}>
              Manage your personal notifications, delivery methods, and workspace preferences.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--slate-200)',
                backgroundColor: 'var(--white)',
                color: 'var(--slate-600)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} />
              Reset to Defaults
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: saveSuccess ? '#16a34a' : 'var(--primary)',
                color: 'var(--white)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)',
                transition: 'all 0.2s ease',
              }}
            >
              {saveSuccess ? (
                <>
                  <Check size={15} />
                  Preferences Saved!
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {saveSuccess && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-sm)',
              color: '#15803d',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={16} />
            <span>Your preferences were updated and synchronized across all active devices.</span>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-sm)',
              color: '#b91c1c',
              fontSize: '13px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Tabs Bar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--slate-200)',
            paddingBottom: '2px',
          }}
        >
          <button
            onClick={() => setActiveTab('notifications')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'notifications' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'notifications' ? 'var(--primary)' : 'var(--slate-600)',
              fontSize: '14px',
              fontWeight: activeTab === 'notifications' ? 600 : 500,
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            <Bell size={16} />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'email' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'email' ? 'var(--primary)' : 'var(--slate-600)',
              fontSize: '14px',
              fontWeight: activeTab === 'email' ? 600 : 500,
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            <Mail size={16} />
            <span>Email Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('display')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'display' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'display' ? 'var(--primary)' : 'var(--slate-600)',
              fontSize: '14px',
              fontWeight: activeTab === 'display' ? 600 : 500,
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            <Sliders size={16} />
            <span>Display & Theme</span>
          </button>

          <button
            onClick={() => onNavigate(workspace?.id ? `/workspace/${workspace.id}/settings` : '/settings/workspace')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: '2px solid transparent',
              color: 'var(--slate-600)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            <Building2 size={16} />
            <span>Workspace Settings</span>
          </button>
        </div>

        {/* Tab 1: Notifications */}
        {activeTab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* 1. Notification Types Section */}
            <div
              style={{
                backgroundColor: 'var(--white)',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-900)', margin: '0 0 4px 0' }}>
                  Notification Types
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-500)' }}>
                  Choose which events in <strong>{workspace?.name || 'this workspace'}</strong> trigger notifications.
                </p>
              </div>

              {/* Task Notifications */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Task Notifications
                </div>
                <ToggleRow
                  icon={<CheckSquare size={17} color="#2563eb" />}
                  title="Task assigned to me"
                  description="Receive an alert when another team member assigns you to a task."
                  checked={Boolean(preferences.taskAssignedEnabled)}
                  onChange={() => handleToggle('taskAssignedEnabled')}
                />
                <ToggleRow
                  icon={<CheckSquare size={17} color="#d97706" />}
                  title="Task status changed"
                  description="Get notified when a task assigned to you moves through the workflow."
                  checked={Boolean(preferences.taskAssignedEnabled)}
                  onChange={() => handleToggle('taskAssignedEnabled')}
                />
                <ToggleRow
                  icon={<CheckSquare size={17} color="#16a34a" />}
                  title="Task commented on"
                  description="Alerts for replies and updates left on tasks you are participating in."
                  checked={Boolean(preferences.taskCommentedEnabled)}
                  onChange={() => handleToggle('taskCommentedEnabled')}
                />
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--slate-150)' }} />

              {/* Sprint Notifications */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sprint Notifications
                </div>
                <ToggleRow
                  icon={<PlayCircle size={17} color="#059669" />}
                  title="Sprint started"
                  description="Receive a notification when a new sprint begins with your committed tasks."
                  checked={Boolean(preferences.sprintStartedEnabled)}
                  onChange={() => handleToggle('sprintStartedEnabled')}
                />
                <ToggleRow
                  icon={<Flag size={17} color="#7c3aed" />}
                  title="Sprint closed"
                  description="Get sprint completion reports and retrospective alerts when a sprint concludes."
                  checked={Boolean(preferences.sprintClosedEnabled)}
                  onChange={() => handleToggle('sprintClosedEnabled')}
                />
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--slate-150)' }} />

              {/* Team Notifications */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Team & Role Notifications
                </div>
                <ToggleRow
                  icon={<Users2 size={17} color="#0d9488" />}
                  title="Member invited me"
                  description="Alerts when you are invited to join a new project or workspace."
                  checked={Boolean(preferences.memberInvitedEnabled)}
                  onChange={() => handleToggle('memberInvitedEnabled')}
                />
                <ToggleRow
                  icon={<Users2 size={17} color="#0284c7" />}
                  title="Member joined workspace"
                  description="Notify when new team members accept invitations and join the workspace."
                  checked={Boolean(preferences.memberJoinedEnabled)}
                  onChange={() => handleToggle('memberJoinedEnabled')}
                />
                <ToggleRow
                  icon={<Shield size={17} color="#6366f1" />}
                  title="My role changed"
                  description="Immediate notification when your permissions or workspace role are updated."
                  checked={Boolean(preferences.roleChangedEnabled)}
                  onChange={() => handleToggle('roleChangedEnabled')}
                />
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--slate-150)' }} />

              {/* Mention Notifications */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mention Notifications
                </div>
                <ToggleRow
                  icon={<AtSign size={17} color="#db2777" />}
                  title="I was mentioned (@mention)"
                  description="High-priority alerts when someone directly mentions your handle."
                  checked={Boolean(preferences.mentionEnabled)}
                  onChange={() => handleToggle('mentionEnabled')}
                />
              </div>
            </div>

            {/* 2. Delivery Method Section */}
            <div
              style={{
                backgroundColor: 'var(--white)',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-900)', margin: '0 0 4px 0' }}>
                  Delivery Method
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-500)' }}>
                  Where would you like to receive your updates?
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <RadioCard
                  name="deliveryMethod"
                  value="in_app"
                  selected={preferences.deliveryMethod === 'in_app'}
                  onChange={() => handleRadioChange('deliveryMethod', 'in_app')}
                  title="In-app only (Notification Bell)"
                  description="Real-time notifications inside OmniFlow topbar drawer only. Clean and distraction-free."
                />
                <RadioCard
                  name="deliveryMethod"
                  value="email_and_in_app"
                  selected={preferences.deliveryMethod === 'email_and_in_app'}
                  onChange={() => handleRadioChange('deliveryMethod', 'email_and_in_app')}
                  title="Email + In-app"
                  description="Receive in-app alerts and external email messages delivered directly to your inbox."
                />
              </div>
            </div>

            {/* 3. Notification Frequency Section */}
            <div
              style={{
                backgroundColor: 'var(--white)',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-900)', margin: '0 0 4px 0' }}>
                  Notification Frequency
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-500)' }}>
                  Control how frequently batches of alerts are bundled.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <RadioCard
                  name="notificationFrequency"
                  value="instant"
                  selected={preferences.notificationFrequency === 'instant'}
                  onChange={() => handleRadioChange('notificationFrequency', 'instant')}
                  title="Instant"
                  description="Get notified immediately as events happen in your projects and sprints."
                />
                <RadioCard
                  name="notificationFrequency"
                  value="daily"
                  selected={preferences.notificationFrequency === 'daily'}
                  onChange={() => handleRadioChange('notificationFrequency', 'daily')}
                  title="Daily Digest"
                  description="Receive a consolidated summary once a day at 9:00 AM."
                />
                <RadioCard
                  name="notificationFrequency"
                  value="weekly"
                  selected={preferences.notificationFrequency === 'weekly'}
                  onChange={() => handleRadioChange('notificationFrequency', 'weekly')}
                  title="Weekly Digest"
                  description="Consolidated overview delivered every Monday morning."
                />
              </div>
            </div>

            {/* Bottom Save bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingBottom: '32px' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-200)',
                  backgroundColor: 'var(--white)',
                  color: 'var(--slate-700)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--white)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Email Settings */}
        {activeTab === 'email' && (
          <div
            style={{
              backgroundColor: 'var(--white)',
              border: '1px solid var(--slate-200)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-900)', margin: '0 0 4px 0' }}>
                Email Delivery Configuration
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-500)' }}>
                Notifications sent to your registered address: <strong>{user?.email || 'N/A'}</strong>
              </p>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-800)' }}>
                    Primary Email
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                    {user?.email}
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#16a34a',
                  backgroundColor: '#dcfce7',
                  padding: '3px 8px',
                  borderRadius: '12px',
                }}
              >
                Verified
              </span>
            </div>

            <ToggleRow
              icon={<Mail size={17} color="#2563eb" />}
              title="Include task activity comments in email"
              description="Sends full comment threads directly in email notifications."
              checked={Boolean(preferences.emailNotifications)}
              onChange={() => handleToggle('emailNotifications')}
            />

            <ToggleRow
              icon={<Radio size={17} color="#7c3aed" />}
              title="Product updates & release announcements"
              description="Get monthly emails about new features, improvements, and OmniFlow updates."
              checked={true}
              onChange={() => {}}
            />
          </div>
        )}

        {/* Tab 3: Display & Theme */}
        {activeTab === 'display' && (
          <div
            style={{
              backgroundColor: 'var(--white)',
              border: '1px solid var(--slate-200)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-900)', margin: '0 0 4px 0' }}>
                Display & Theme
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-500)' }}>
                Customize your visual interface experience. Changes take effect immediately across OmniFlow.
              </p>
            </div>

            {/* Visual Interactive Theme Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {/* System Preference */}
              <div
                onClick={() => setTheme('system')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTheme('system'); }}
                style={{
                  border: theme === 'system' ? '2px solid var(--primary)' : '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  backgroundColor: theme === 'system' ? 'var(--bg-secondary)' : 'var(--white)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all var(--transition-fast)',
                  boxShadow: theme === 'system' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Monitor size={18} color={theme === 'system' ? 'var(--primary)' : 'var(--slate-600)'} />
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--slate-900)' }}>System Preference</span>
                  </div>
                  {theme === 'system' && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} color="white" />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--slate-500)', lineHeight: 1.4 }}>
                  Automatically syncs with your operating system settings. Recommended for seamless transitions.
                </div>
                <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--primary)', fontWeight: 500 }}>
                  Recommended
                </div>
              </div>

              {/* Light Mode */}
              <div
                onClick={() => setTheme('light')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTheme('light'); }}
                style={{
                  border: theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  backgroundColor: theme === 'light' ? 'var(--bg-secondary)' : 'var(--white)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all var(--transition-fast)',
                  boxShadow: theme === 'light' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sun size={18} color={theme === 'light' ? 'var(--primary)' : 'var(--slate-600)'} />
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--slate-900)' }}>Light Mode</span>
                  </div>
                  {theme === 'light' && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} color="white" />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--slate-500)', lineHeight: 1.4 }}>
                  Clean, crisp interface optimized for daylight environments and high contrast readability.
                </div>
              </div>

              {/* Dark Mode */}
              <div
                onClick={() => setTheme('dark')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTheme('dark'); }}
                style={{
                  border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  backgroundColor: theme === 'dark' ? 'var(--bg-secondary)' : 'var(--white)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all var(--transition-fast)',
                  boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Moon size={18} color={theme === 'dark' ? 'var(--primary)' : 'var(--slate-600)'} />
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--slate-900)' }}>Dark Mode</span>
                  </div>
                  {theme === 'dark' && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} color="white" />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--slate-500)', lineHeight: 1.4 }}>
                  Deep slate tones designed to reduce eye strain in low-light environments.
                </div>
              </div>
            </div>

            {/* Radio Group Selection */}
            <div style={{ marginTop: '8px', borderTop: '1px solid var(--slate-200)', paddingTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--slate-800)', marginBottom: '10px' }}>
                Theme Selection
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--slate-700)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={theme === 'light'}
                    onChange={(e) => setTheme(e.target.value as Theme)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Light Mode</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--slate-700)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    checked={theme === 'system'}
                    onChange={(e) => setTheme(e.target.value as Theme)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>System Preference (Recommended)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--slate-700)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={theme === 'dark'}
                    onChange={(e) => setTheme(e.target.value as Theme)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Dark Mode</span>
                </label>
              </div>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Currently active visual theme: <strong>{isDark ? 'Dark Theme' : 'Light Theme'}</strong> {theme === 'system' ? '(managed by OS preference)' : '(manually selected)'}.
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ icon, title, description, checked, onChange }) => {
  return (
    <div
      onClick={onChange}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: checked ? 'rgba(238, 242, 255, 0.35)' : 'transparent',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, paddingRight: '16px' }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-800)' }}>
            {title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '1px' }}>
            {description}
          </div>
        </div>
      </div>

      {/* Accessible Switch Toggle */}
      <div
        role="switch"
        aria-checked={checked}
        style={{
          width: '38px',
          height: '22px',
          borderRadius: '12px',
          backgroundColor: checked ? 'var(--primary)' : 'var(--slate-300)',
          position: 'relative',
          flexShrink: 0,
          transition: 'background-color 0.2s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '18px' : '2px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: 'var(--white)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s ease',
          }}
        />
      </div>
    </div>
  );
};

interface RadioCardProps {
  name: string;
  value: string;
  selected: boolean;
  onChange: () => void;
  title: string;
  description: string;
}

const RadioCard: React.FC<RadioCardProps> = ({ selected, onChange, title, description }) => {
  return (
    <div
      onClick={onChange}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${selected ? 'var(--primary)' : 'var(--slate-200)'}`,
        backgroundColor: selected ? 'rgba(99, 102, 241, 0.04)' : 'var(--white)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: `2px solid ${selected ? 'var(--primary)' : 'var(--slate-300)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '2px',
          flexShrink: 0,
        }}
      >
        {selected && (
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
            }}
          />
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-900)' }}>
          {title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
          {description}
        </div>
      </div>
    </div>
  );
};
