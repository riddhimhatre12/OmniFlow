Create src/hooks/useWorkspaceAuth.ts for client-side authorization in my 
React 19 OmniFlow app.

Requirements:
- Get current workspace from context or URL
- Fetch user's role and permissions for that workspace
- Provide permission-checking functions
- Handle workspace switching

Export:

1. Hook: useWorkspaceAuth()
   Returns: {
     workspace: { id, name, slug },
     userRole: { id, name, permissions: string[] },
     canPerform: (permission: string) => boolean,
     canManageMembers: () => boolean,
     canDeleteWorkspace: () => boolean,
     canCreateProject: () => boolean,
     isOwner: boolean,
     isAdmin: boolean,
     switchWorkspace: (workspaceId) => void,
     loading: boolean,
     error: string | null
   }

2. Permission helper constants:
   PERMISSIONS = {
     WORKSPACE: {
       VIEW: 'view_workspace',
       EDIT: 'edit_workspace',
       DELETE: 'delete_workspace',
       INVITE_MEMBERS: 'invite_members',
       MANAGE_ROLES: 'manage_roles',
       MANAGE_MEMBERS: 'manage_members'
     },
     PROJECT: {
       VIEW: 'view_projects',
       CREATE: 'create_project',
       EDIT: 'edit_project',
       DELETE: 'delete_project'
     },
     TASK: {
       VIEW: 'view_tasks',
       CREATE: 'create_task',
       EDIT: 'edit_task',
       DELETE: 'delete_task',
       ASSIGN: 'assign_task'
     }
   }

3. Component wrapper: <WorkspaceAuthWrapper>
   - Validates user access to workspace
   - Shows loading state
   - Redirects to workspace selection if no access
   - Provides useWorkspaceAuth() to all children

Include:
- localStorage caching of role/permissions (with 5-minute TTL)
- Real-time sync with Convex changes
- Clear error states
- TypeScript types for all returns