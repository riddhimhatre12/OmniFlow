Create convex/roles.ts and convex/members.ts for managing workspace roles 
and team member invitations.

Tech: Convex, TypeScript

**roles.ts:**

QUERIES:
1. getWorkspaceRoles(workspaceId)
   - Return all roles with their permissions
   - Mark default roles with isDefault flag

2. getRolePermissions(roleId)
   - Get detailed permission list for a role

MUTATIONS:
1. createCustomRole(workspaceId, name, description, permissions)
   - Only Admin/Owner can create
   - Validate permission names against allowed list
   - Return role object

2. updateRolePermissions(roleId, permissions)
   - Update permissions for a role
   - Can't modify default roles
   - Notify affected members

3. deleteCustomRole(roleId, reassignToRoleId)
   - Only Admin can delete
   - Reassign all members from old role to new role
   - Can't delete default roles

---

**members.ts:**

QUERIES:
1. getWorkspaceMembers(workspaceId)
   - Return all members with roles
   - Include: userId, name, email, avatar, roleId, roleName, joinedAt

2. getUserRole(workspaceId, userId)
   - Get specific user's role in workspace

MUTATIONS:
1. changeUserRole(workspaceId, userId, newRoleId)
   - Only Owner/Admin can change roles
   - Can't demote Owner (only Owner can change own role)
   - Log activity: "changed [user] role to [role]"
   - Return updated member

2. removeMemberFromWorkspace(workspaceId, userId)
   - Only Owner/Admin can remove
   - Can't remove last Owner
   - Delete all member's task assignments (reassign or mark as unassigned)
   - Log activity
   - Return success

3. inviteMemberByEmail(workspaceId, invitedEmail, roleId)
   - Check if email already in workspace
   - If user exists on platform: add directly to workspace_members
   - If new user: create invitation with unique token & 24hr expiry
   - Send email with invite link: yourapp.com/join?token=xyz
   - Log activity
   - Return: { success, message, requiresEmailVerification? }

4. acceptInvitation(token)
   - Verify token exists and not expired
   - If user not registered: redirect to signup with pre-filled email
   - If user registered: add to workspace_members with role from invitation
   - Mark invitation as "accepted"
   - Update user's active workspace
   - Return workspace object

5. declineInvitation(token)
   - Mark invitation as "declined"
   - Return success

Include:
- Email uniqueness checks
- Token generation (crypto randomUUID or similar)
- Timestamp-based expiry logic
- Clear error messages
- Activity logging