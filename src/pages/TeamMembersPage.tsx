import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Users2,
  UserPlus,
  Mail,
  Shield,
  MoreHorizontal,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Building,
  Calendar,
  Check
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { useWorkspaceAuth } from '../hooks/useWorkspaceAuth';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface TeamMembersPageProps {
  onNavigate: (route: string) => void;
}

interface MemberItem {
  memberId: string;
  userId: Id<"users">;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
  department?: string;
  roleId: Id<"roles">;
  roleName: string;
  isDefaultRole: boolean;
  joinedAt: number;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const TeamMembersPage: React.FC<TeamMembersPageProps> = ({ onNavigate }) => {
  const { workspace, canManageMembers, isOwner, isAdmin } = useWorkspaceAuth();
  const { user } = useCurrentUser();
  const callerUserId = user.userId as Id<"users"> | undefined;
  const workspaceId = workspace?.id as Id<"workspaces"> | undefined;

  // Real-time queries
  const members = useQuery(
    api.members.getWorkspaceMembers,
    workspaceId ? { workspaceId } : "skip"
  );

  const invitations = useQuery(
    api.members.getWorkspaceInvitations,
    workspaceId ? { workspaceId } : "skip"
  );

  const roles = useQuery(
    api.roles.getWorkspaceRoles,
    workspaceId ? { workspaceId } : "skip"
  );

  // Mutations
  const removeMemberMutation = useMutation(api.members.removeMemberFromWorkspace);
  const resendInvitationMutation = useMutation(api.members.resendInvitation);
  const revokeInvitationMutation = useMutation(api.members.revokeInvitation);

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'role' | 'joinedAt'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals & Action States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMemberForRoleChange, setSelectedMemberForRoleChange] = useState<MemberItem | null>(null);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<MemberItem | null>(null);

  // Active row dropdown state
  const [activeDropdownMemberId, setActiveDropdownMemberId] = useState<string | null>(null);

  // Toast feedback state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastCounterRef = useRef(0);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    toastCounterRef.current += 1;
    const id = `toast-${toastCounterRef.current}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.member-action-dropdown')) {
        setActiveDropdownMemberId(null);
      }
    };
    if (activeDropdownMemberId) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [activeDropdownMemberId]);

  // Filtering & Sorting
  const filteredAndSortedMembers = useMemo(() => {
    if (!members) return [];
    let result = [...members];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.roleName.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'role') {
        cmp = a.roleName.localeCompare(b.roleName);
      } else if (sortField === 'joinedAt') {
        cmp = a.joinedAt - b.joinedAt;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [members, searchTerm, sortField, sortDirection]);

  // Count active owners
  const ownerCount = useMemo(() => {
    if (!members) return 0;
    return members.filter((m) => m.roleName === 'Owner').length;
  }, [members]);

  const toggleSort = (field: 'name' | 'role' | 'joinedAt') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getRoleBadgeStyle = (roleName: string) => {
    switch (roleName) {
      case 'Owner':
        return { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' };
      case 'Admin':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'Manager':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
      case 'Member':
        return { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' };
      case 'Viewer':
        return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
      default:
        return { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' };
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(timestamp));
    } catch {
      return 'Recently';
    }
  };

  // Actions
  const handleResendInvitation = async (invitationId: Id<"invitations">, email: string) => {
    if (!callerUserId) return;
    try {
      await resendInvitationMutation({ invitationId, callerUserId });
      addToast('success', `Invitation resent to ${email} (extended for 24h)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resend invitation.';
      addToast('error', msg);
    }
  };

  const handleRevokeInvitation = async (invitationId: Id<"invitations">, email: string) => {
    if (!callerUserId) return;
    try {
      await revokeInvitationMutation({ invitationId, callerUserId });
      addToast('info', `Invitation for ${email} has been revoked.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke invitation.';
      addToast('error', msg);
    }
  };

  const handleConfirmRemoval = async () => {
    if (!selectedMemberForRemoval || !workspaceId || !callerUserId) return;
    try {
      await removeMemberMutation({
        workspaceId,
        callerUserId,
        userId: selectedMemberForRemoval.userId,
      });
      addToast('success', `${selectedMemberForRemoval.name} has been removed from the workspace.`);
      setSelectedMemberForRemoval(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member.';
      addToast('error', msg);
    }
  };

  return (
    <DashboardLayout activeItem="teams" onNavigate={onNavigate}>
      {/* Toast Notification Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 110,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: t.type === 'error' ? '#FEF2F2' : t.type === 'info' ? '#F0F9FF' : '#F0FDF4',
              border: `1px solid ${t.type === 'error' ? '#FCA5A5' : t.type === 'info' ? '#BAE6FD' : '#86EFAC'}`,
              color: t.type === 'error' ? '#991B1B' : t.type === 'info' ? '#0369A1' : '#166534',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              pointerEvents: 'auto',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {t.type === 'error' ? (
              <AlertCircle size={16} />
            ) : t.type === 'info' ? (
              <Clock size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* 1. Header: Title + "Invite Member" button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--slate-200)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                  color: 'var(--slate-950)',
                }}
              >
                Team Members
              </h1>
              {members && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                  }}
                >
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                </span>
              )}
            </div>
            <p style={{ fontSize: '14px', color: 'var(--slate-500)', marginTop: '4px' }}>
              Manage access, collaborators, and role assignments for{' '}
              <strong style={{ color: 'var(--slate-800)' }}>{workspace?.name || 'this workspace'}</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {(isOwner || isAdmin) && (
              <Button
                variant="secondary"
                size="md"
                icon={<Shield size={16} />}
                onClick={() => onNavigate('/roles')}
              >
                Workspace Roles
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              icon={<UserPlus size={16} />}
              disabled={!workspace || !canManageMembers()}
              title={
                !canManageMembers()
                  ? 'You need member management permissions to invite new members.'
                  : undefined
              }
              onClick={() => {
                if (!canManageMembers()) {
                  addToast('error', 'You lack permission to invite members to this workspace.');
                  return;
                }
                setIsInviteModalOpen(true);
              }}
            >
              Invite Member
            </Button>
          </div>
        </div>

        {/* If no active workspace is selected */}
        {!workspace ? (
          <Card padding="lg">
            <EmptyState
              icon={<Building size={32} />}
              title="No Workspace Selected"
              description="Please select or create an active workspace from the sidebar to view and manage team members."
              actionLabel="Go to Dashboard"
              onAction={() => onNavigate('/dashboard')}
            />
          </Card>
        ) : (
          <>
            {/* Search and Filters bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '340px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: 'var(--slate-400)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Filter by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-250)',
                    backgroundColor: 'var(--white)',
                    fontSize: '13px',
                    color: 'var(--slate-900)',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--slate-250)')}
                />
              </div>

              <div style={{ fontSize: '13px', color: 'var(--slate-500)' }}>
                Showing <strong>{filteredAndSortedMembers.length}</strong> of{' '}
                <strong>{members?.length ?? 0}</strong> members
              </div>
            </div>

            {/* 2. Members Table */}
            <Card padding="none" style={{ overflow: 'visible', border: '1px solid var(--slate-200)' }}>
              {members === undefined ? (
                // Loading Skeleton
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          className="skeleton-shimmer"
                          style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div
                            className="skeleton-shimmer"
                            style={{ width: '140px', height: '14px', borderRadius: '4px' }}
                          />
                          <div
                            className="skeleton-shimmer"
                            style={{ width: '180px', height: '11px', borderRadius: '4px' }}
                          />
                        </div>
                      </div>
                      <div
                        className="skeleton-shimmer"
                        style={{ width: '80px', height: '24px', borderRadius: '12px' }}
                      />
                      <div
                        className="skeleton-shimmer"
                        style={{ width: '90px', height: '12px', borderRadius: '4px' }}
                      />
                    </div>
                  ))}
                </div>
              ) : filteredAndSortedMembers.length === 0 ? (
                <EmptyState
                  icon={<Users2 size={32} />}
                  title={searchTerm ? 'No matching members found' : 'No members in workspace'}
                  description={
                    searchTerm
                      ? `No team members matching "${searchTerm}". Try a different search term.`
                      : 'Invite team members to begin collaborating on projects and tasks.'
                  }
                  actionLabel={canManageMembers() ? 'Invite Member' : undefined}
                  onAction={canManageMembers() ? () => setIsInviteModalOpen(true) : undefined}
                />
              ) : (
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                      fontSize: '13px',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'var(--slate-50)',
                          borderBottom: '1px solid var(--slate-200)',
                          color: 'var(--slate-600)',
                          fontWeight: 700,
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        <th
                          onClick={() => toggleSort('name')}
                          style={{
                            padding: '14px 20px',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>Avatar + Name</span>
                            {sortField === 'name' ? (
                              sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                            ) : (
                              <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                            )}
                          </div>
                        </th>
                        <th style={{ padding: '14px 20px' }}>Email</th>
                        <th
                          onClick={() => toggleSort('role')}
                          style={{
                            padding: '14px 20px',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>Role</span>
                            {sortField === 'role' ? (
                              sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                            ) : (
                              <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleSort('joinedAt')}
                          style={{
                            padding: '14px 20px',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>Joined Date</span>
                            {sortField === 'joinedAt' ? (
                              sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                            ) : (
                              <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                            )}
                          </div>
                        </th>
                        <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedMembers.map((m) => {
                        const isSelf = user.userId === m.userId;
                        const badgeStyle = getRoleBadgeStyle(m.roleName);
                        const initials = m.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        const canChangeThisMemberRole =
                          canManageMembers() &&
                          (m.roleName !== 'Owner' || isOwner);

                        const isLastOwner = m.roleName === 'Owner' && ownerCount <= 1;
                        const canRemoveThisMember =
                          (isAdmin || isOwner || isSelf) && !isLastOwner;

                        return (
                          <tr
                            key={m.memberId}
                            style={{
                              borderBottom: '1px solid var(--slate-150)',
                              transition: 'background-color 0.12s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--slate-50)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {/* Avatar + Name */}
                            <td style={{ padding: '14px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {m.avatar ? (
                                  <img
                                    src={m.avatar}
                                    alt={m.name}
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      backgroundColor: badgeStyle.bg,
                                      color: badgeStyle.text,
                                      border: `1px solid ${badgeStyle.border}`,
                                      fontWeight: 700,
                                      fontSize: '12px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {initials}
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>
                                      {m.name}
                                    </span>
                                    {isSelf && (
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          backgroundColor: 'var(--slate-200)',
                                          color: 'var(--slate-700)',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  {m.title && (
                                    <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                                      {m.title}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td style={{ padding: '14px 20px', color: 'var(--slate-600)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Mail size={14} style={{ color: 'var(--slate-400)' }} />
                                <span>{m.email}</span>
                              </div>
                            </td>

                            {/* Role */}
                            <td style={{ padding: '14px 20px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 10px',
                                  borderRadius: '999px',
                                  backgroundColor: badgeStyle.bg,
                                  color: badgeStyle.text,
                                  border: `1px solid ${badgeStyle.border}`,
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                <Shield size={12} />
                                {m.roleName}
                              </span>
                            </td>

                            {/* Joined Date */}
                            <td style={{ padding: '14px 20px', color: 'var(--slate-500)', fontSize: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={13} style={{ color: 'var(--slate-400)' }} />
                                <span>{formatDate(m.joinedAt)}</span>
                              </div>
                            </td>

                            {/* Actions Dropdown */}
                            <td style={{ padding: '14px 20px', textAlign: 'right', position: 'relative' }}>
                              <div
                                className="member-action-dropdown"
                                style={{ display: 'inline-block', position: 'relative' }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownMemberId(
                                      activeDropdownMemberId === m.memberId ? null : m.memberId
                                    );
                                  }}
                                  aria-label="Member actions"
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid var(--slate-200)',
                                    backgroundColor: 'var(--white)',
                                    color: 'var(--slate-600)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <MoreHorizontal size={15} />
                                </button>

                                {activeDropdownMemberId === m.memberId && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: 'calc(100% + 4px)',
                                      right: 0,
                                      width: '180px',
                                      backgroundColor: 'var(--white)',
                                      border: '1px solid var(--slate-200)',
                                      borderRadius: 'var(--radius-sm)',
                                      boxShadow: 'var(--shadow-lg)',
                                      padding: '4px',
                                      zIndex: 40,
                                      textAlign: 'left',
                                      animation: 'fadeIn 0.12s ease',
                                    }}
                                  >
                                    {/* Change Role Button */}
                                    <button
                                      type="button"
                                      disabled={!canChangeThisMemberRole}
                                      onClick={() => {
                                        setActiveDropdownMemberId(null);
                                        setSelectedMemberForRoleChange(m);
                                      }}
                                      title={
                                        !canChangeThisMemberRole
                                          ? 'You lack permission to change this role'
                                          : undefined
                                      }
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        borderRadius: 'var(--radius-xs)',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        color: canChangeThisMemberRole ? 'var(--slate-800)' : 'var(--slate-400)',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: canChangeThisMemberRole ? 'pointer' : 'not-allowed',
                                        transition: 'background-color 0.1s ease',
                                      }}
                                      onMouseEnter={(e) => {
                                        if (canChangeThisMemberRole)
                                          e.currentTarget.style.backgroundColor = 'var(--slate-100)';
                                      }}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <Shield size={14} />
                                      <span>Change Role</span>
                                    </button>

                                    {/* Remove Member Button */}
                                    <button
                                      type="button"
                                      disabled={!canRemoveThisMember}
                                      onClick={() => {
                                        setActiveDropdownMemberId(null);
                                        setSelectedMemberForRemoval(m);
                                      }}
                                      title={
                                        isLastOwner
                                          ? 'Cannot remove the last Owner of the workspace.'
                                          : !canRemoveThisMember
                                          ? 'Only Workspace Owners or Admins can remove members.'
                                          : undefined
                                      }
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        borderRadius: 'var(--radius-xs)',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        color: canRemoveThisMember ? 'var(--danger)' : 'var(--slate-400)',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: canRemoveThisMember ? 'pointer' : 'not-allowed',
                                        transition: 'background-color 0.1s ease',
                                      }}
                                      onMouseEnter={(e) => {
                                        if (canRemoveThisMember)
                                          e.currentTarget.style.backgroundColor = 'var(--danger-light)';
                                      }}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <Trash2 size={14} />
                                      <span>{isSelf ? 'Leave Workspace' : 'Remove Member'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* 4. Pending Invitations Section */}
            {invitations && invitations.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--slate-900)',
                      letterSpacing: '-0.3px',
                    }}
                  >
                    Pending Invitations
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      border: '1px solid #FDE68A',
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    {invitations.length} pending
                  </span>
                </div>

                <Card padding="none" style={{ border: '1px solid var(--slate-200)' }}>
                  <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        textAlign: 'left',
                        fontSize: '13px',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: 'var(--slate-50)',
                            borderBottom: '1px solid var(--slate-200)',
                            color: 'var(--slate-600)',
                            fontWeight: 700,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          <th style={{ padding: '14px 20px' }}>Invited Email</th>
                          <th style={{ padding: '14px 20px' }}>Assigned Role</th>
                          <th style={{ padding: '14px 20px' }}>Status</th>
                          <th style={{ padding: '14px 20px' }}>Expires In</th>
                          <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((inv) => {
                          const isExpired = inv.isExpired;
                          const roleBadge = getRoleBadgeStyle(inv.roleName);

                          return (
                            <tr
                              key={inv.invitationId}
                              style={{
                                borderBottom: '1px solid var(--slate-150)',
                              }}
                            >
                              <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--slate-900)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Mail size={15} style={{ color: 'var(--slate-400)' }} />
                                  <span>{inv.invitedEmail}</span>
                                </div>
                              </td>

                              <td style={{ padding: '14px 20px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    backgroundColor: roleBadge.bg,
                                    color: roleBadge.text,
                                    border: `1px solid ${roleBadge.border}`,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                  }}
                                >
                                  {inv.roleName}
                                </span>
                              </td>

                              <td style={{ padding: '14px 20px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 9px',
                                    borderRadius: '999px',
                                    backgroundColor: isExpired ? '#FEF2F2' : '#FEF3C7',
                                    color: isExpired ? '#B91C1C' : '#B45309',
                                    border: `1px solid ${isExpired ? '#FCA5A5' : '#FDE68A'}`,
                                    fontSize: '11px',
                                    fontWeight: 700,
                                  }}
                                >
                                  <Clock size={11} />
                                  {isExpired ? 'Expired' : 'Pending'}
                                </span>
                              </td>

                              <td style={{ padding: '14px 20px', color: 'var(--slate-500)', fontSize: '12px' }}>
                                {isExpired ? (
                                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Expired</span>
                                ) : (
                                  `${inv.hoursLeft || 24} hours left`
                                )}
                              </td>

                              <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '8px',
                                  }}
                                >
                                  {/* Resend button */}
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={!canManageMembers()}
                                    icon={<RefreshCw size={13} />}
                                    onClick={() =>
                                      handleResendInvitation(inv.invitationId, inv.invitedEmail)
                                    }
                                    title="Resend invitation and extend expiration by 24h"
                                  >
                                    Resend
                                  </Button>

                                  {/* Revoke button */}
                                  <Button
                                    variant="danger-ghost"
                                    size="sm"
                                    disabled={!canManageMembers()}
                                    icon={<Trash2 size={13} />}
                                    onClick={() =>
                                      handleRevokeInvitation(inv.invitationId, inv.invitedEmail)
                                    }
                                    title="Revoke and cancel this invitation"
                                  >
                                    Revoke
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. INVITE MEMBER MODAL */}
      {isInviteModalOpen && workspaceId && callerUserId && (
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          workspaceId={workspaceId}
          callerUserId={callerUserId}
          roles={roles || []}
          onClose={() => setIsInviteModalOpen(false)}
          onSuccess={(msg) => addToast('success', msg)}
        />
      )}

      {/* 5. ROLE CHANGE MODAL */}
      {selectedMemberForRoleChange && workspaceId && callerUserId && (
        <RoleChangeModal
          member={selectedMemberForRoleChange}
          workspaceId={workspaceId}
          callerUserId={callerUserId}
          roles={roles || []}
          onClose={() => setSelectedMemberForRoleChange(null)}
          onSuccess={(msg) => addToast('success', msg)}
        />
      )}

      {/* REMOVE MEMBER CONFIRMATION MODAL */}
      {selectedMemberForRemoval && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedMemberForRemoval(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              maxWidth: '440px',
              width: '100%',
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
              boxShadow: 'var(--shadow-xl)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertCircle size={26} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
              Remove Workspace Member
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--slate-600)', lineHeight: 1.5, marginBottom: '24px' }}>
              Are you sure you want to remove <strong>{selectedMemberForRemoval.name}</strong> ({selectedMemberForRemoval.email}) from <strong>{workspace?.name}</strong>? They will lose all access to workspace projects and tasks.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button
                variant="secondary"
                onClick={() => setSelectedMemberForRemoval(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger-ghost"
                onClick={handleConfirmRemoval}
                style={{ backgroundColor: '#EF4444', color: '#FFFFFF', borderColor: '#EF4444' }}
              >
                Remove Member
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

/* =========================================================================
 * 3. SUB-COMPONENT: InviteMemberModal
 * ========================================================================= */
interface InviteMemberModalProps {
  isOpen: boolean;
  workspaceId: Id<"workspaces">;
  callerUserId: Id<"users">;
  roles: Array<{ _id: Id<"roles">; name: string; description?: string }>;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  workspaceId,
  callerUserId,
  roles,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<Id<"roles"> | ''>(() => {
    const defaultMemberRole = roles.find((r) => r.name === 'Member') || roles[0];
    return defaultMemberRole ? defaultMemberRole._id : '';
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inviteMemberMutation = useMutation(api.members.inviteMemberByEmail);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    // Validation
    if (!trimmedEmail) {
      setError('Email address is required.');
      return;
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please provide a valid email format (e.g. name@company.com).');
      return;
    }
    if (!selectedRoleId) {
      setError('Please select a role to assign.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await inviteMemberMutation({
        workspaceId,
        callerUserId,
        invitedEmail: trimmedEmail,
        roleId: selectedRoleId as Id<"roles">,
      });

      if (res.addedDirectly) {
        onSuccess(`Added ${trimmedEmail} to workspace immediately.`);
      } else {
        onSuccess(`Email invitation sent to ${trimmedEmail} (expires in 24 hours).`);
      }

      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send invitation.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--slate-200)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--slate-150)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--slate-900)' }}>
                Invite Team Member
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
                Add existing users or send an invitation link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            style={{
              padding: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--slate-400)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  fontSize: '13px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Input
                label="Email Address"
                placeholder="colleague@company.com"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                autoFocus
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '4px', display: 'block' }}>
                Existing users are added instantly. New users receive an invite link valid for 24 hours.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="select-role"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--slate-700)',
                }}
              >
                Workspace Role
              </label>
              <select
                id="select-role"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value as Id<"roles">)}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-250)',
                  backgroundColor: 'var(--white)',
                  fontSize: '13px',
                  color: 'var(--slate-900)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} {r.description ? `— ${r.description}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              padding: '16px 24px',
              backgroundColor: 'var(--slate-50)',
              borderTop: '1px solid var(--slate-150)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !email.trim()}
              icon={loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : undefined}
            >
              {loading ? 'Sending Invite...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
 * 5. SUB-COMPONENT: RoleChangeModal
 * ========================================================================= */
interface RoleChangeModalProps {
  member: MemberItem;
  workspaceId: Id<"workspaces">;
  callerUserId: Id<"users">;
  roles: Array<{ _id: Id<"roles">; name: string; description?: string }>;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  member,
  workspaceId,
  callerUserId,
  roles,
  onClose,
  onSuccess,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<Id<"roles">>(member.roleId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const changeUserRoleMutation = useMutation(api.members.changeUserRole);

  const selectedRoleObj = roles.find((r) => r._id === selectedRoleId);

  const handleUpdate = async () => {
    if (selectedRoleId === member.roleId) {
      onClose();
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await changeUserRoleMutation({
        workspaceId,
        callerUserId,
        userId: member.userId,
        newRoleId: selectedRoleId,
      });

      onSuccess(`Changed ${member.name}'s role from ${member.roleName} to ${selectedRoleObj?.name || 'new role'}.`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update member role.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--slate-200)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--slate-150)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--slate-900)' }}>
                Change Member Role
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
                Adjust authorization and access privileges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            style={{
              padding: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--slate-400)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Member Summary Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--slate-200)',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'var(--slate-800)',
                color: 'var(--white)',
                fontWeight: 700,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {member.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)' }}>
                {member.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                {member.email} • Current role: <strong>{member.roleName}</strong>
              </span>
            </div>
          </div>

          {/* Role Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="new-role"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--slate-700)',
              }}
            >
              Select New Role
            </label>
            <select
              id="new-role"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value as Id<"roles">)}
              disabled={loading}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--slate-250)',
                backgroundColor: 'var(--white)',
                fontSize: '13px',
                color: 'var(--slate-900)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} {r.description ? `(${r.description})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Confirmation sentence per Prompt 6 */}
          {selectedRoleObj && selectedRoleObj.name !== member.roleName && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary-subtle)',
                border: '1px solid rgba(79, 70, 229, 0.15)',
                fontSize: '13px',
                color: 'var(--slate-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} color="var(--primary)" />
              <span>
                Change <strong>{member.name}</strong> from <strong>{member.roleName}</strong> to{' '}
                <strong style={{ color: 'var(--primary)' }}>{selectedRoleObj.name}</strong>?
              </span>
            </div>
          )}
        </div>

        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'var(--slate-50)',
            borderTop: '1px solid var(--slate-150)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleUpdate}
            disabled={loading || selectedRoleId === member.roleId}
            icon={loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : undefined}
          >
            {loading ? 'Updating...' : 'Update Role'}
          </Button>
        </div>
      </div>
    </div>
  );
};
