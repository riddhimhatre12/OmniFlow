/**
 * Workspace Authorization & RBAC Hook & Wrapper
 * Complies with Prompt 4 requirements for OmniFlow.
 */

export { useWorkspaceAuth } from '../context/WorkspaceAuthContext';
export { useHasPermission } from './useHasPermission';
export {
  WorkspaceAuthWrapper,
  type WorkspaceAuthWrapperProps,
} from '../components/auth/WorkspaceAuthWrapper';
export {
  PERMISSIONS,
  type WorkspaceSummary,
  type UserRoleInfo,
  type WorkspaceAuthContextType,
} from '../types/rbac';
