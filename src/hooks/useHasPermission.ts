import { useWorkspaceAuth } from './useWorkspaceAuth';

/**
 * Hook to check if current user in active workspace has the specified permission.
 * Returns boolean. Useful in event handlers and mutation triggers.
 *
 * Example:
 * const canDelete = useHasPermission(PERMISSIONS.PROJECT.DELETE);
 * if (!canDelete) { return showError("Access Denied"); }
 */
export function useHasPermission(permission: string): boolean {
  const { canPerform } = useWorkspaceAuth();
  return canPerform(permission);
}
