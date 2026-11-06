import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Users2,
  Lock,
  X,
  Loader2,
  Building,
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

interface WorkspaceRolesPageProps {
  onNavigate: (route: string) => void;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface PermissionItem {
  id: string;
  name: string;
  category: 'workspace' | 'project' | 'task';
  description: string;
}

// 15 Permissions categorized per Prompt 9 & schema
const ALL_PERMISSIONS: PermissionItem[] = [
  // Workspace Permissions
  {
    id: 'workspace:manage',
    name: 'Manage Workspace',
    category: 'workspace',
    description: 'Allows editing workspace profile, name, avatar, and general configurations.',
  },
  {
    id: 'workspace:delete',
    name: 'Delete Workspace',
    category: 'workspace',
    description: 'Allows permanently deleting the entire workspace and all its data.',
  },
  {
    id: 'member:invite',
    name: 'Invite Members',
    category: 'workspace',
    description: 'Allows inviting new members via email and managing invitations.',
  },
  {
    id: 'member:remove',
    name: 'Remove Members',
    category: 'workspace',
    description: 'Allows revoking workspace membership and removing teammates.',
  },
  {
    id: 'member:update_role',
    name: 'Change Member Roles',
    category: 'workspace',
    description: 'Allows promoting, demoting, or modifying roles of members.',
  },
  {
    id: 'role:manage',
    name: 'Manage Custom Roles',
    category: 'workspace',
    description: 'Allows creating, modifying permissions, and deleting custom roles.',
  },
  {
    id: 'report:view',
    name: 'View Analytics & Reports',
    category: 'workspace',
    description: 'Allows accessing workspace metrics, reporting logs, and audit trails.',
  },

  // Project Permissions
  {
    id: 'project:create',
    name: 'Create Projects',
    category: 'project',
    description: 'Allows initiating new projects, roadmaps, and milestones.',
  },
  {
    id: 'project:read',
    name: 'View Projects',
    category: 'project',
    description: 'Allows browsing, searching, and viewing project details.',
  },
  {
    id: 'project:update',
    name: 'Update Projects',
    category: 'project',
    description: 'Allows modifying project details, statuses, budgets, and milestones.',
  },
  {
    id: 'project:delete',
    name: 'Delete Projects',
    category: 'project',
    description: 'Allows permanently archiving or deleting projects.',
  },

  // Task Permissions
  {
    id: 'task:create',
    name: 'Create Tasks',
    category: 'task',
    description: 'Allows adding tasks, assigning assignees, and setting due dates.',
  },
  {
    id: 'task:read',
    name: 'View Tasks',
    category: 'task',
    description: 'Allows viewing task boards, backlogs, and work items.',
  },
  {
    id: 'task:update',
    name: 'Update Tasks',
    category: 'task',
    description: 'Allows modifying task progress, assignees, deadlines, and descriptions.',
  },
  {
    id: 'task:delete',
    name: 'Delete Tasks',
    category: 'task',
    description: 'Allows removing tasks and associated subtasks.',
  },
];

export const WorkspaceRolesPage: React.FC<WorkspaceRolesPageProps> = ({ onNavigate }) => {
  const { workspace, isOwner, isAdmin, canPerform } = useWorkspaceAuth();
  const { user } = useCurrentUser();

  // Access check: Only Owner or Admin can view and manage roles
  const canManageRoles = isOwner || isAdmin || canPerform('role:manage');

  // Convex Queries and Mutations
  const roles = useQuery(
    api.roles.getWorkspaceRoles,
    workspace ? { workspaceId: workspace.id as Id<"workspaces"> } : 'skip'
  );

  const createRoleMutation = useMutation(api.roles.createCustomRole);
  const updateRolePermissionsMutation = useMutation(api.roles.updateRolePermissions);
  const deleteRoleMutation = useMutation(api.roles.deleteCustomRole);

  // UI State
  const [expandedRoleIds, setExpandedRoleIds] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{
    roleId: Id<"roles">;
    name: string;
    description?: string;
    permissions: string[];
    memberCount: number;
  } | null>(null);

  const [deletingRole, setDeletingRole] = useState<{
    roleId: Id<"roles">;
    name: string;
    memberCount: number;
  } | null>(null);

  // Form State for Create Modal
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'project:read',
    'task:read',
    'task:create',
    'task:update',
  ]);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Form State for Edit Modal
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [showConfirmEditDialog, setShowConfirmEditDialog] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Form State for Delete Modal
  const [reassignTargetRoleId, setReassignTargetRoleId] = useState<string>('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Toast Helper
  const addToast = (
    type: 'success' | 'error' | 'info',
    message: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, actionLabel, onAction }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Toggle role accordion
  const toggleRoleExpand = (roleId: string) => {
    setExpandedRoleIds((prev) => ({
      ...prev,
      [roleId]: !prev[roleId],
    }));
  };

  // Filter default vs custom roles
  const defaultRoles = roles ? roles.filter((r) => r.isDefault) : [];
  const customRoles = roles ? roles.filter((r) => !r.isDefault) : [];

  // Handle Create Role Submission
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !user.userId) return;

    const trimmedName = newRoleName.trim();
    if (!trimmedName) {
      addToast('error', 'Please provide a role name.');
      return;
    }

    if (selectedPermissions.length === 0) {
      addToast('error', 'Please select at least one permission for this role.');
      return;
    }

    try {
      setIsSubmittingCreate(true);
      await createRoleMutation({
        workspaceId: workspace.id as Id<"workspaces">,
        callerUserId: user.userId as Id<"users">,
        name: trimmedName,
        description: newRoleDescription.trim() || undefined,
        permissions: selectedPermissions,
      });

      setIsCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setSelectedPermissions(['project:read', 'task:read', 'task:create', 'task:update']);

      addToast(
        'success',
        'Role created. Assign to members in Team Members page',
        'Go to Team Members',
        () => onNavigate('/teams')
      );
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create custom role.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Edit Role Submission
  const handleEditRoleSave = async () => {
    if (!editingRole || !user.userId) return;

    if (editPermissions.length === 0) {
      addToast('error', 'Role must have at least one permission.');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      await updateRolePermissionsMutation({
        roleId: editingRole.roleId,
        callerUserId: user.userId as Id<"users">,
        permissions: editPermissions,
      });

      setShowConfirmEditDialog(false);
      setEditingRole(null);
      addToast('success', `Permissions for role "${editingRole.name}" updated successfully.`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update role permissions.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Role Submission
  const handleDeleteRole = async () => {
    if (!deletingRole || !user.userId || !reassignTargetRoleId) {
      addToast('error', 'Please choose a target role to reassign existing members.');
      return;
    }

    try {
      setIsSubmittingDelete(true);
      const res = await deleteRoleMutation({
        roleId: deletingRole.roleId,
        callerUserId: user.userId as Id<"users">,
        reassignToRoleId: reassignTargetRoleId as Id<"roles">,
      });

      setDeletingRole(null);
      setReassignTargetRoleId('');
      addToast(
        'success',
        `Role "${res.deletedRoleName}" deleted. ${res.reassignedCount} member(s) reassigned to "${res.reassignedToRoleName}".`
      );
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete role.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Permission selection toggle helper
  const togglePermission = (
    permId: string,
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentList.includes(permId)) {
      setList(currentList.filter((p) => p !== permId));
    } else {
      setList([...currentList, permId]);
    }
  };

  // Toggle all permissions in a category
  const toggleCategoryPermissions = (
    category: 'workspace' | 'project' | 'task',
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const categoryPermIds = ALL_PERMISSIONS.filter((p) => p.category === category).map((p) => p.id);
    const allSelected = categoryPermIds.every((id) => currentList.includes(id));

    if (allSelected) {
      setList(currentList.filter((id) => !categoryPermIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...currentList, ...categoryPermIds]));
      setList(merged);
    }
  };

  return (
    <DashboardLayout
      activeItem="roles"
      onSelectItem={(item) => {
        if (item === 'dashboard') onNavigate('/dashboard');
        else if (item === 'teams') onNavigate('/teams');
        else if (item === 'profile') onNavigate('/profile');
      }}
      onNavigate={onNavigate}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Floating Toasts */}
        {toasts.length > 0 && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor:
                    toast.type === 'success'
                      ? 'var(--slate-900)'
                      : toast.type === 'error'
                        ? '#991b1b'
                        : 'var(--primary)',
                  color: 'var(--white)',
                  fontSize: '13px',
                  fontWeight: 500,
                  boxShadow: 'var(--shadow-lg)',
                  animation: 'fadeIn 0.2s ease',
                  maxWidth: '440px',
                }}
              >
                <div style={{ flex: 1 }}>{toast.message}</div>
                {toast.actionLabel && (
                  <button
                    onClick={toast.onAction}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'var(--white)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {toast.actionLabel}
                  </button>
                )}
                <button
                  onClick={() => removeToast(toast.id)}
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ACCESS CONTROL GUARD: Prompt 9: "Access: Only Owner/Admin can view" */}
        {!canManageRoles ? (
          <Card padding="lg" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Lock size={32} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px' }}>
              Access Restricted
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--slate-500)', maxWidth: '440px', margin: '0 auto 24px' }}>
              Only Workspace Owners and Administrators have permission to view, customize, and configure workspace roles.
            </p>
            <Button variant="primary" onClick={() => onNavigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </Card>
        ) : !workspace ? (
          <Card padding="lg" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Building size={32} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px' }}>
              No Workspace Selected
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--slate-500)', maxWidth: '440px', margin: '0 auto 24px' }}>
              Select or create a workspace to view and configure its role-based access control.
            </p>
            <Button variant="primary" onClick={() => onNavigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </Card>
        ) : (
          <>
            {/* 1. HEADER (Prompt 9: "Workspace Roles" + "Create Custom Role" button) */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={26} color="var(--primary)" />
                  <h1
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      letterSpacing: '-0.5px',
                      color: 'var(--slate-950)',
                    }}
                  >
                    Workspace Roles
                  </h1>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--slate-500)', marginTop: '4px' }}>
                  Manage role-based access control, default system levels, and tailored permissions for{' '}
                  <strong style={{ color: 'var(--slate-800)' }}>{workspace.name}</strong>.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate('/teams')}
                  icon={<Users2 size={15} />}
                >
                  Team Members
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsCreateModalOpen(true)}
                  icon={<Plus size={16} />}
                >
                  Create Custom Role
                </Button>
              </div>
            </div>

            {/* 2. DEFAULT ROLES LIST (Prompt 9: Read-only section, Owner, Admin, Manager, Member, Viewer) */}
            <div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Default System Roles
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'var(--slate-100)',
                      color: 'var(--slate-600)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {defaultRoles.length} predefined
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                  Standard workspace access hierarchies. Default roles cannot be modified or deleted.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {defaultRoles.map((role) => {
                  const isExpanded = Boolean(expandedRoleIds[role._id]);
                  const isOwnerRole = role.name === 'Owner';

                  return (
                    <Card
                      key={role._id}
                      padding="none"
                      style={{
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--slate-200)',
                        overflow: 'hidden',
                        transition: 'box-shadow 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          backgroundColor: 'var(--white)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isOwnerRole ? 'var(--primary-light)' : 'var(--slate-100)',
                              color: isOwnerRole ? 'var(--primary)' : 'var(--slate-600)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Shield size={20} />
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>
                                {role.name}
                              </span>

                              {/* Badge: "Default - Cannot Edit" */}
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: 'var(--slate-100)',
                                  color: 'var(--slate-600)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-full)',
                                  border: '1px solid var(--slate-200)',
                                }}
                              >
                                <Lock size={10} /> Default - Cannot Edit
                              </span>

                              {/* Member count */}
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  color: 'var(--slate-500)',
                                }}
                              >
                                <Users2 size={12} /> {role.memberCount} member
                                {role.memberCount === 1 ? '' : 's'}
                              </span>
                            </div>

                            <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                              {role.description || 'Predefined system role'}
                            </p>
                          </div>
                        </div>

                        {/* Collapsible toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => toggleRoleExpand(role._id)}
                            icon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          >
                            {isExpanded
                              ? 'Hide Permissions'
                              : `View Permissions (${role.permissions.length})`}
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Permissions Grid */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: '18px 20px',
                            backgroundColor: 'var(--slate-50)',
                            borderTop: '1px solid var(--slate-200)',
                          }}
                        >
                          <div style={{ marginBottom: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Granted Capabilities ({role.permissions.length} of {ALL_PERMISSIONS.length})
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                              gap: '10px',
                            }}
                          >
                            {ALL_PERMISSIONS.map((perm) => {
                              const hasPerm = role.permissions.includes(perm.id);

                              return (
                                <div
                                  key={perm.id}
                                  title={perm.description}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: 'var(--radius-xs)',
                                    backgroundColor: hasPerm ? 'var(--white)' : 'transparent',
                                    border: hasPerm ? '1px solid var(--slate-200)' : '1px dashed var(--slate-200)',
                                    opacity: hasPerm ? 1 : 0.45,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      borderRadius: '4px',
                                      backgroundColor: hasPerm ? 'var(--success-light)' : 'var(--slate-100)',
                                      color: hasPerm ? 'var(--success)' : 'var(--slate-400)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginTop: '1px',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {hasPerm ? <Check size={12} strokeWidth={3} /> : <X size={10} />}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: hasPerm ? 'var(--slate-800)' : 'var(--slate-500)' }}>
                                      {perm.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '1px' }}>
                                      {perm.description}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 3. CUSTOM ROLES SECTION (Prompt 9: List, Edit/Delete, Expandable permissions) */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--slate-900)' }}>
                      Custom Roles
                    </h2>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--primary-border)',
                      }}
                    >
                      {customRoles.length} created
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                    Tailored roles created specifically for this workspace with customized capability sets.
                  </p>
                </div>
              </div>

              {customRoles.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck size={28} />}
                  title="No custom roles yet"
                  description="Create custom roles like 'Project Lead', 'QA Reviewer', or 'External Client' to assign fine-grained permissions."
                  actionLabel="Create Custom Role"
                  onAction={() => setIsCreateModalOpen(true)}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {customRoles.map((role) => {
                    const isExpanded = Boolean(expandedRoleIds[role._id]);

                    return (
                      <Card
                        key={role._id}
                        padding="none"
                        style={{
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--slate-200)',
                          overflow: 'hidden',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      >
                        <div
                          style={{
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            backgroundColor: 'var(--white)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--primary-subtle)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <ShieldCheck size={20} />
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>
                                  {role.name}
                                </span>

                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: 'var(--primary-light)',
                                    color: 'var(--primary)',
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid var(--primary-border)',
                                  }}
                                >
                                  Custom Role
                                </span>

                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: 'var(--slate-500)',
                                  }}
                                >
                                  <Users2 size={12} /> {role.memberCount} member
                                  {role.memberCount === 1 ? '' : 's'}
                                </span>
                              </div>

                              <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                                {role.description || 'Custom role definition'}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons: Edit, Delete, Toggle View */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingRole({
                                  roleId: role._id,
                                  name: role.name,
                                  description: role.description,
                                  permissions: [...role.permissions],
                                  memberCount: role.memberCount,
                                });
                                setEditPermissions([...role.permissions]);
                              }}
                              icon={<Edit2 size={13} />}
                            >
                              Edit Permissions
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingRole({
                                  roleId: role._id,
                                  name: role.name,
                                  memberCount: role.memberCount,
                                });
                                // Default reassignment to 'Member' or first other role
                                const defaultTarget = roles ? roles.find((r) => r._id !== role._id && r.name === 'Member') : undefined;
                                setReassignTargetRoleId(defaultTarget ? defaultTarget._id : '');
                              }}
                              style={{ color: 'var(--danger)' }}
                              icon={<Trash2 size={13} />}
                            >
                              Delete
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => toggleRoleExpand(role._id)}
                              icon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            >
                              {isExpanded ? 'Hide' : `Permissions (${role.permissions.length})`}
                            </Button>
                          </div>
                        </div>

                        {/* Expandable permissions grid */}
                        {isExpanded && (
                          <div
                            style={{
                              padding: '18px 20px',
                              backgroundColor: 'var(--slate-50)',
                              borderTop: '1px solid var(--slate-200)',
                            }}
                          >
                            <div style={{ marginBottom: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Assigned Permissions ({role.permissions.length} of {ALL_PERMISSIONS.length})
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                gap: '10px',
                              }}
                            >
                              {ALL_PERMISSIONS.map((perm) => {
                                const hasPerm = role.permissions.includes(perm.id);

                                return (
                                  <div
                                    key={perm.id}
                                    title={perm.description}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '8px',
                                      padding: '8px 10px',
                                      borderRadius: 'var(--radius-xs)',
                                      backgroundColor: hasPerm ? 'var(--white)' : 'transparent',
                                      border: hasPerm ? '1px solid var(--slate-200)' : '1px dashed var(--slate-200)',
                                      opacity: hasPerm ? 1 : 0.45,
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '4px',
                                        backgroundColor: hasPerm ? 'var(--success-light)' : 'var(--slate-100)',
                                        color: hasPerm ? 'var(--success)' : 'var(--slate-400)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginTop: '1px',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {hasPerm ? <Check size={12} strokeWidth={3} /> : <X size={10} />}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '12px', fontWeight: 600, color: hasPerm ? 'var(--slate-800)' : 'var(--slate-500)' }}>
                                        {perm.name}
                                      </div>
                                      <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '1px' }}>
                                        {perm.description}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 4. "CREATE CUSTOM ROLE" MODAL (Prompt 9: Name, Description, Checkbox Grid by category) */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '16px',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => !isSubmittingCreate && setIsCreateModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Create Custom Role
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                  Define a tailored permission profile for team members in {workspace?.name}.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ color: 'var(--slate-400)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Role Name */}
              <Input
                label="Role Name"
                placeholder="e.g., Project Lead, Reviewer, Contractor"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                required
                autoFocus
              />

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-700)' }}>
                  Description (optional)
                </label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe the scope of responsibilities for members with this role..."
                  rows={2}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-300)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Checkbox Grid: Grouped by category per Prompt 9 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-800)' }}>
                    Permissions Matrix ({selectedPermissions.length} selected)
                  </label>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPermissions(ALL_PERMISSIONS.map((p) => p.id))}
                      style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Select All
                    </button>
                    <span style={{ color: 'var(--slate-300)' }}>|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPermissions([])}
                      style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* 3 Categories: Workspace, Project, Task */}
                {(['workspace', 'project', 'task'] as const).map((cat) => {
                  const catPermissions = ALL_PERMISSIONS.filter((p) => p.category === cat);
                  const catTitle =
                    cat === 'workspace'
                      ? 'Workspace Permissions'
                      : cat === 'project'
                        ? 'Project Permissions'
                        : 'Task Permissions';

                  return (
                    <div
                      key={cat}
                      style={{
                        marginBottom: '16px',
                        padding: '12px 14px',
                        backgroundColor: 'var(--slate-50)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--slate-200)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '10px',
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {catTitle}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleCategoryPermissions(cat, selectedPermissions, setSelectedPermissions)}
                          style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Toggle Category
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                          gap: '8px',
                        }}
                      >
                        {catPermissions.map((perm) => {
                          const isChecked = selectedPermissions.includes(perm.id);

                          return (
                            <label
                              key={perm.id}
                              title={perm.description}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: '8px',
                                borderRadius: 'var(--radius-xs)',
                                backgroundColor: isChecked ? 'var(--white)' : 'transparent',
                                border: isChecked ? '1px solid var(--primary-border)' : '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.12s ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(perm.id, selectedPermissions, setSelectedPermissions)}
                                style={{ marginTop: '2px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-800)' }}>
                                  {perm.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '1px' }}>
                                  {perm.description}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--slate-200)',
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingCreate}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingCreate}
                  icon={isSubmittingCreate ? <Loader2 size={16} className="spin-animate" /> : <Plus size={16} />}
                >
                  {isSubmittingCreate ? 'Creating Role...' : 'Create Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. "EDIT ROLE" MODAL (Prompt 9: Can't edit name, update permissions, shows member count warning, on save confirmation) */}
      {editingRole && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '16px',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => !isSubmittingEdit && setEditingRole(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Edit Permissions: {editingRole.name}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                  Update the capabilities granted to members assigned this custom role.
                </p>
              </div>
              <button onClick={() => setEditingRole(null)} style={{ color: 'var(--slate-400)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Warning if members have this role */}
            {editingRole.memberCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 16px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-sm)',
                  color: '#92400e',
                  fontSize: '13px',
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Active Role Notice:</strong> This role is currently assigned to{' '}
                  <strong>
                    {editingRole.memberCount} member{editingRole.memberCount === 1 ? '' : 's'}
                  </strong>
                  . Changing its permissions will immediately affect their capabilities across the workspace.
                </div>
              </div>
            )}

            {/* Read-only name & description info */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--slate-200)',
                fontSize: '13px',
                color: 'var(--slate-600)',
              }}
            >
              <div>
                <strong>Role:</strong> {editingRole.name}
              </div>
              {editingRole.description && (
                <div style={{ marginTop: '2px', color: 'var(--slate-500)' }}>
                  {editingRole.description}
                </div>
              )}
            </div>

            {/* Checkbox Grid */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-800)' }}>
                  Assigned Permissions ({editPermissions.length} selected)
                </label>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditPermissions(ALL_PERMISSIONS.map((p) => p.id))}
                    style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <span style={{ color: 'var(--slate-300)' }}>|</span>
                  <button
                    type="button"
                    onClick={() => setEditPermissions([])}
                    style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {(['workspace', 'project', 'task'] as const).map((cat) => {
                const catPermissions = ALL_PERMISSIONS.filter((p) => p.category === cat);
                const catTitle =
                  cat === 'workspace'
                    ? 'Workspace Permissions'
                    : cat === 'project'
                      ? 'Project Permissions'
                      : 'Task Permissions';

                return (
                  <div
                    key={cat}
                    style={{
                      marginBottom: '16px',
                      padding: '12px 14px',
                      backgroundColor: 'var(--slate-50)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--slate-200)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {catTitle}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleCategoryPermissions(cat, editPermissions, setEditPermissions)}
                        style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Toggle Category
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: '8px',
                      }}
                    >
                      {catPermissions.map((perm) => {
                        const isChecked = editPermissions.includes(perm.id);

                        return (
                          <label
                            key={perm.id}
                            title={perm.description}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '8px',
                              borderRadius: 'var(--radius-xs)',
                              backgroundColor: isChecked ? 'var(--white)' : 'transparent',
                              border: isChecked ? '1px solid var(--primary-border)' : '1px solid transparent',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id, editPermissions, setEditPermissions)}
                              style={{ marginTop: '2px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-800)' }}>
                                {perm.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '1px' }}>
                                {perm.description}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Confirmation dialog step on save */}
            {showConfirmEditDialog && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--primary-light)',
                  border: '1px solid var(--primary-border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-active)' }}>
                  Update permissions for {editingRole.memberCount} member
                  {editingRole.memberCount === 1 ? '' : 's'}?
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleEditRoleSave}
                    disabled={isSubmittingEdit}
                    icon={isSubmittingEdit ? <Loader2 size={14} className="spin-animate" /> : undefined}
                  >
                    {isSubmittingEdit ? 'Saving...' : 'Yes, Confirm & Update'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowConfirmEditDialog(false)}
                    disabled={isSubmittingEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            {!showConfirmEditDialog && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--slate-200)',
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingRole(null)}
                  disabled={isSubmittingEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    if (editingRole.memberCount > 0) {
                      setShowConfirmEditDialog(true);
                    } else {
                      handleEditRoleSave();
                    }
                  }}
                  disabled={isSubmittingEdit}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. "DELETE ROLE" MODAL (Prompt 9: Warning, Dropdown reassign members to another role, Delete button) */}
      {deletingRole && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '16px',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => !isSubmittingDelete && setDeletingRole(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '480px',
              boxShadow: 'var(--shadow-xl)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--danger-light)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Delete Role: {deletingRole.name}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 600 }}>
                  This will remove the role permanently
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--slate-600)', lineHeight: 1.5 }}>
              Are you sure you want to delete the custom role{' '}
              <strong style={{ color: 'var(--slate-900)' }}>"{deletingRole.name}"</strong>? This action cannot be
              undone.
            </p>

            {/* Reassign members dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-800)' }}>
                Reassign members to another role:
              </label>
              <select
                value={reassignTargetRoleId}
                onChange={(e) => setReassignTargetRoleId(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: 'var(--white)',
                  fontSize: '13px',
                  color: 'var(--slate-800)',
                  outline: 'none',
                }}
              >
                <option value="" disabled>
                  Select a replacement role...
                </option>
                {roles
                  ?.filter((r) => r._id !== deletingRole.roleId)
                  .map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} {r.isDefault ? '(Default)' : '(Custom)'}
                    </option>
                  ))}
              </select>
              <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                {deletingRole.memberCount} member{deletingRole.memberCount === 1 ? '' : 's'} currently with this role
                will be automatically transitioned.
              </span>
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                paddingTop: '12px',
                borderTop: '1px solid var(--slate-200)',
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeletingRole(null)}
                disabled={isSubmittingDelete}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleDeleteRole}
                disabled={isSubmittingDelete || !reassignTargetRoleId}
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                icon={isSubmittingDelete ? <Loader2 size={16} className="spin-animate" /> : <Trash2 size={16} />}
              >
                {isSubmittingDelete ? 'Deleting Role...' : 'Delete Role'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
