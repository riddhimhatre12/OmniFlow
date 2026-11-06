I'm extending my OmniFlow project (Convex + React 19) to support multi-workspace 
role-based access control. Currently I have a users table with basic auth.

I need to extend convex/schema.ts to add:

1. **workspaces table**:
   - workspace_id (auto)
   - name: string
   - slug: string (unique, URL-friendly)
   - description: optional string
   - ownerId: ref to users
   - avatar: optional string (color or image)
   - createdAt: timestamp
   - updatedAt: timestamp
   - indexes: by_ownerId, by_slug

2. **roles table** (per-workspace):
   - role_id (auto)
   - workspaceId: ref to workspaces
   - name: string (e.g., "Owner", "Admin", "Manager", "Member", "Viewer")
   - description: optional string
   - isDefault: boolean (true for pre-defined roles)
   - permissions: array of strings (e.g., ["create_project", "delete_task", "invite_member"])
   - createdAt: timestamp
   - indexes: by_workspaceId

3. **workspace_members table** (junction):
   - id (auto)
   - workspaceId: ref to workspaces
   - userId: ref to users
   - roleId: ref to roles
   - joinedAt: timestamp
   - invitedAt: optional timestamp
   - invitedBy: optional ref to users
   - UNIQUE constraint: (workspaceId, userId)
   - indexes: by_workspaceId, by_userId

4. **invitations table**:
   - id (auto)
   - workspaceId: ref to workspaces
   - invitedEmail: string
   - invitedBy: ref to users
   - roleId: ref to roles
   - token: string (unique, for email link)
   - status: "pending" | "accepted" | "declined"
   - expiresAt: timestamp (24 hours from creation)
   - createdAt: timestamp
   - indexes: by_token, by_workspaceId, by_invitedEmail

Include:
- Full TypeScript type definitions
- All necessary indexes for query performance
- UNIQUE and FOREIGN KEY constraints
- Default data seed (will add in separate prompt)