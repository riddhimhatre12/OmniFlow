import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { WorkspaceAuthContext } from '../../context/WorkspaceAuthContext';
import {
  type WorkspaceSummary,
  type UserRoleInfo,
  type WorkspaceAuthContextType,
} from '../../types/rbac';
import { Loader2, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute cache TTL

export interface WorkspaceAuthWrapperProps {
  children: React.ReactNode;
  initialWorkspaceId?: string;
  requiredPermission?: string;
  onUnauthorized?: () => void;
  loadingFallback?: React.ReactNode;
}

export const WorkspaceAuthWrapper: React.FC<WorkspaceAuthWrapperProps> = ({
  children,
  initialWorkspaceId,
  requiredPermission,
  onUnauthorized,
  loadingFallback,
}) => {
  const { user, updateSessionUser } = useCurrentUser();
  const userId = user.userId as Id<"users"> | undefined;

  // Auto-resolve userId from Convex if email is known but userId was missing or invalid
  const userByEmail = useQuery(
    api.auth.getUserByEmail,
    !userId && user.email ? { email: user.email } : "skip"
  );

  useEffect(() => {
    if (userByEmail && (!user.userId || user.userId !== userByEmail.id)) {
      updateSessionUser({
        userId: userByEmail.id,
        name: userByEmail.name || user.name,
        role: userByEmail.role || user.role,
        avatar: userByEmail.avatar || user.avatar,
      });
    }
  }, [userByEmail, user.userId, user.name, user.role, user.avatar, updateSessionUser]);

  // Active workspace state: URL query > initial argument > localStorage
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlWs = urlParams.get('workspace');
      if (urlWs) return urlWs;

      const stored = localStorage.getItem('omni_active_workspace');
      if (stored) return stored;
    }
    return initialWorkspaceId || null;
  });

  const [manualError, setManualError] = useState<string | null>(null);

  // Cached auth state loaded on mount to prevent initial loading flicker
  const [cachedAuth] = useState<{
    workspace: WorkspaceSummary;
    userRole: UserRoleInfo;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const active =
        new URLSearchParams(window.location.search).get('workspace') ||
        localStorage.getItem('omni_active_workspace');
      if (!active) return null;

      // Look up any active cache key for this workspace
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`omni_ws_cache_${active}`)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
              return {
                workspace: parsed.workspace,
                userRole: parsed.userRole,
              };
            }
          }
        }
      }
    } catch {
      return null;
    }
    return null;
  });

  // 1. Fetch user's workspaces
  const userWorkspaces = useQuery(
    api.workspaces.listUserWorkspaces,
    userId ? { userId } : "skip"
  );

  // Resolve active workspace ID
  const activeWorkspaceId = useMemo(() => {
    if (userWorkspaces && userWorkspaces.length > 0) {
      if (selectedWorkspaceId && userWorkspaces.some((w) => w.workspaceId === selectedWorkspaceId)) {
        return selectedWorkspaceId;
      }
      return userWorkspaces[0].workspaceId;
    }
    if (userWorkspaces && userWorkspaces.length === 0) {
      return null;
    }
    return selectedWorkspaceId || null;
  }, [selectedWorkspaceId, userWorkspaces]);

  // Keep localStorage in sync when active workspace resolves
  useEffect(() => {
    if (activeWorkspaceId) {
      try {
        localStorage.setItem('omni_active_workspace', activeWorkspaceId);
      } catch {
        // ignore
      }
    }
  }, [activeWorkspaceId]);

  // 2. Fetch live permissions and details from Convex
  const permissionsQuery = useQuery(
    api.workspaces.getWorkspacePermissions,
    userWorkspaces !== undefined && activeWorkspaceId && userId
      ? {
        workspaceId: activeWorkspaceId as Id<"workspaces">,
        userId,
      }
      : "skip"
  );

  const workspaceDetails = useQuery(
    api.workspaces.getWorkspaceDetails,
    userWorkspaces !== undefined && activeWorkspaceId && userId
      ? {
        workspaceId: activeWorkspaceId as Id<"workspaces">,
        userId,
      }
      : "skip"
  );

  const switchActiveWorkspaceMutation = useMutation(api.workspaces.switchActiveWorkspace);

  // Synchronize cache in background without cascading renders
  useEffect(() => {
    if (workspaceDetails && permissionsQuery && activeWorkspaceId && userId && typeof window !== 'undefined') {
      try {
        const payload = {
          timestamp: Date.now(),
          workspace: {
            id: workspaceDetails.workspaceId,
            name: workspaceDetails.name,
            slug: workspaceDetails.slug,
            avatar: workspaceDetails.avatar,
            ownerId: workspaceDetails.ownerId,
          },
          userRole: {
            id: permissionsQuery.roleId,
            name: permissionsQuery.roleName,
            permissions: permissionsQuery.permissions,
          },
        };
        localStorage.setItem(
          `omni_ws_cache_${activeWorkspaceId}_${userId}`,
          JSON.stringify(payload)
        );
        localStorage.setItem('omni_active_workspace', activeWorkspaceId);
      } catch {
        // storage disabled or quota exceeded
      }
    }
  }, [workspaceDetails, permissionsQuery, activeWorkspaceId, userId]);

  // Handle workspace switching
  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      setManualError(null);
      try {
        if (userId) {
          await switchActiveWorkspaceMutation({
            workspaceId: workspaceId as Id<"workspaces">,
            userId,
          });
        }

        setSelectedWorkspaceId(workspaceId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('omni_active_workspace', workspaceId);
          const url = new URL(window.location.href);
          url.searchParams.set('workspace', workspaceId);
          window.history.pushState({}, '', url.toString());
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to switch workspace.';
        setManualError(msg);
        throw err;
      }
    },
    [userId, switchActiveWorkspaceMutation]
  );

  // Derived workspace summary
  const workspace: WorkspaceSummary | null = useMemo(() => {
    if (workspaceDetails) {
      return {
        id: workspaceDetails.workspaceId,
        name: workspaceDetails.name,
        slug: workspaceDetails.slug,
        avatar: workspaceDetails.avatar,
        ownerId: workspaceDetails.ownerId,
      };
    }
    return cachedAuth?.workspace || null;
  }, [workspaceDetails, cachedAuth]);

  // Derived user role & permissions
  const userRole: UserRoleInfo | null = useMemo(() => {
    if (permissionsQuery) {
      return {
        id: permissionsQuery.roleId,
        name: permissionsQuery.roleName,
        permissions: permissionsQuery.permissions,
      };
    }
    return cachedAuth?.userRole || null;
  }, [permissionsQuery, cachedAuth]);

  const isOwner = useMemo(() => {
    if (!userRole) return false;
    return (
      userRole.name === 'Owner' ||
      (!!workspace?.ownerId && !!userId && workspace.ownerId === userId)
    );
  }, [userRole, workspace, userId]);

  const isAdmin = useMemo(() => {
    if (!userRole) return false;
    return isOwner || userRole.name === 'Admin';
  }, [userRole, isOwner]);

  // Permission checking functions with support for both prompt aliases and standard keys
  const canPerform = useCallback(
    (permission: string): boolean => {
      if (!userRole) return false;
      if (isOwner) return true;

      const perms = userRole.permissions || [];
      if (perms.includes('*') || perms.includes('all')) return true;
      if (perms.includes(permission)) return true;

      // Support colon vs underscore format (e.g. "project:create" vs "create_project")
      const underscoreToColon: Record<string, string> = {
        view_workspace: 'workspace:view',
        edit_workspace: 'workspace:edit',
        delete_workspace: 'workspace:delete',
        invite_members: 'workspace:invite',
        manage_roles: 'workspace:roles',
        manage_members: 'workspace:members',
        view_projects: 'project:view',
        create_project: 'project:create',
        edit_project: 'project:edit',
        delete_project: 'project:delete',
        view_tasks: 'task:view',
        create_task: 'task:create',
        edit_task: 'task:edit',
        delete_task: 'task:delete',
        assign_task: 'task:assign',
      };

      const colonToUnderscore: Record<string, string> = {
        'workspace:view': 'view_workspace',
        'workspace:edit': 'edit_workspace',
        'workspace:delete': 'delete_workspace',
        'workspace:invite': 'invite_members',
        'workspace:roles': 'manage_roles',
        'workspace:members': 'manage_members',
        'project:view': 'view_projects',
        'project:create': 'create_project',
        'project:edit': 'edit_project',
        'project:delete': 'delete_project',
        'task:view': 'view_tasks',
        'task:create': 'create_task',
        'task:edit': 'edit_task',
        'task:delete': 'delete_task',
        'task:assign': 'assign_task',
      };

      const altFormat1 = underscoreToColon[permission];
      if (altFormat1 && perms.includes(altFormat1)) return true;

      const altFormat2 = colonToUnderscore[permission];
      if (altFormat2 && perms.includes(altFormat2)) return true;

      return false;
    },
    [userRole, isOwner]
  );

  const canManageMembers = useCallback((): boolean => {
    return isAdmin || canPerform('manage_members') || canPerform('workspace:members');
  }, [isAdmin, canPerform]);

  const canDeleteWorkspace = useCallback((): boolean => {
    return isOwner || canPerform('delete_workspace') || canPerform('workspace:delete');
  }, [isOwner, canPerform]);

  const canCreateProject = useCallback((): boolean => {
    return (
      isAdmin ||
      canPerform('create_project') ||
      canPerform('project:create') ||
      userRole?.name === 'Member'
    );
  }, [isAdmin, canPerform, userRole]);

  // Loading state calculation
  const isLoading =
    userWorkspaces === undefined ||
    (Boolean(activeWorkspaceId) && permissionsQuery === undefined && !cachedAuth);

  // Compute final error
  // Compute final error (only if specific workspace access was denied)
  const finalError = useMemo(() => {
    if (manualError) return manualError;
    if (activeWorkspaceId && permissionsQuery === null && !cachedAuth && userWorkspaces && userWorkspaces.length > 0) {
      return 'Access Denied: You do not have permission to access this workspace.';
    }
    return null;
  }, [manualError, userWorkspaces, activeWorkspaceId, permissionsQuery, cachedAuth]);

  // Handle unauthorized callback trigger
  useEffect(() => {
    if (finalError && onUnauthorized) {
      onUnauthorized();
    }
  }, [finalError, onUnauthorized]);

  // Optional permission requirement check
  const hasRequiredPermission = useMemo(() => {
    if (!requiredPermission) return true;
    return canPerform(requiredPermission);
  }, [requiredPermission, canPerform]);

  // Context value exposed to children
  const contextValue: WorkspaceAuthContextType = useMemo(
    () => ({
      workspace,
      workspaces: userWorkspaces || [],
      userRole,
      canPerform,
      canManageMembers,
      canDeleteWorkspace,
      canCreateProject,
      isOwner,
      isAdmin,
      switchWorkspace,
      loading: isLoading,
      error: finalError,
    }),
    [
      workspace,
      userWorkspaces,
      userRole,
      canPerform,
      canManageMembers,
      canDeleteWorkspace,
      canCreateProject,
      isOwner,
      isAdmin,
      switchWorkspace,
      isLoading,
      finalError,
    ]
  );

  // 1. Loading UI (only lock out if a specific permission was strictly required by the caller)
  if (isLoading && requiredPermission) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '360px',
          width: '100%',
          gap: '16px',
        }}
      >
        <Loader2
          size={36}
          color="var(--primary)"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--slate-800)' }}>
            Synchronizing Workspace Permissions
          </p>
          <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '4px' }}>
            Validating security tokens and roles...
          </p>
        </div>
      </div>
    );
  }

  // 2. Access / Authorization Error Fallback UI (only if caller required a specific permission)
  if ((finalError || !hasRequiredPermission) && requiredPermission) {
    const errorTitle = !hasRequiredPermission
      ? 'Permission Required'
      : 'Workspace Access Restricted';
    const errorDescription =
      !hasRequiredPermission
        ? `You need the "${requiredPermission}" permission to access this area.`
        : finalError || 'You do not have active membership in this workspace.';

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '24px',
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: 'var(--white)',
            border: '1px solid var(--slate-200)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldAlert size={28} color="#EF4444" />
          </div>

          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--slate-900)',
              marginBottom: '8px',
            }}
          >
            {errorTitle}
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--slate-600)',
              lineHeight: 1.5,
              marginBottom: '24px',
            }}
          >
            {errorDescription}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {userWorkspaces && userWorkspaces.length > 0 ? (
              <Button
                variant="primary"
                onClick={() => {
                  setManualError(null);
                  switchWorkspace(userWorkspaces[0].workspaceId);
                }}
              >
                Switch to {userWorkspaces[0].name}
              </Button>
            ) : null}

            <Button
              variant="secondary"
              onClick={() => {
                setManualError(null);
                window.location.reload();
              }}
            >
              <RefreshCw size={14} style={{ marginRight: '6px' }} />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render children inside WorkspaceAuthContext
  return (
    <WorkspaceAuthContext.Provider value={contextValue}>
      {children}
    </WorkspaceAuthContext.Provider>
  );
};
