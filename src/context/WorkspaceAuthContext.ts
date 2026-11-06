import { createContext, useContext } from 'react';
import type { WorkspaceAuthContextType } from '../types/rbac';

export const WorkspaceAuthContext = createContext<WorkspaceAuthContextType | null>(null);

/**
 * useWorkspaceAuth hook
 * Provides access to current workspace, user role, permissions, and switcher.
 */
export function useWorkspaceAuth(): WorkspaceAuthContextType {
  const context = useContext(WorkspaceAuthContext);
  if (!context) {
    return {
      workspace: null,
      workspaces: [],
      userRole: null,
      canPerform: () => false,
      canManageMembers: () => false,
      canDeleteWorkspace: () => false,
      canCreateProject: () => false,
      isOwner: false,
      isAdmin: false,
      switchWorkspace: async () => {},
      loading: false,
      error: 'useWorkspaceAuth must be used within a WorkspaceAuthWrapper or valid workspace context.',
    };
  }
  return context;
}
