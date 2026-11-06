Create convex/workspaces.ts with complete CRUD mutations and queries for my 
multi-workspace OmniFlow platform.

Tech: Convex, TypeScript

Build these functions:

**QUERIES (read-only):**

1. listUserWorkspaces(userId)
   - Returns array of workspaces where user is a member
   - Include: workspaceId, name, slug, avatar, ownerId, member role, memberCount
   - Sort by updatedAt descending

2. getWorkspaceDetails(workspaceId)
   - Full workspace object with owner info
   - Include member count, role list, project count
   - Verify caller is workspace member (403 if not)

3. getWorkspaceMembersByRole(workspaceId, roleId)
   - Get all members with specific role
   - Return: userId, email, name, avatar, roleId, joinedAt

4. getWorkspacePermissions(workspaceId, userId)
   - Get user's role and all permissions for that workspace
   - Return: { roleId, roleName, permissions: [] }

**MUTATIONS (write):**

1. createWorkspace(name, description)
   - Auto-create workspace
   - Create default roles: Owner (full), Admin (manage all), Manager (projects & tasks), Member (own tasks), Viewer (read-only)
   - Add creator as Owner member
   - Return: workspace object with id

2. updateWorkspace(workspaceId, { name?, description?, avatar? })
   - Only Owner can update
   - Return: updated workspace

3. deleteWorkspace(workspaceId)
   - Only Owner can delete
   - Cascade delete all projects, tasks, members, roles, invitations
   - Return: success boolean

4. switchActiveWorkspace(workspaceId)
   - User switches to this workspace
   - Verify user is member
   - Return: workspace object (frontend will update context)

Include:
- Permission checking (throw Error("Access denied"))
- Error handling for duplicate names
- Activity logging (note: will add full audit in later prompt)
- Consistent error messages