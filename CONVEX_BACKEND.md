# Convex Cloud Backend Setup (Login & Auth)

## Deployment Details
- **Deployment ID**: `dev:shocking-opossum-923`
- **Team**: `shubham-kamble`
- **Project**: `pmtool`
- **Convex Client URL**: `https://shocking-opossum-923.eu-west-1.convex.cloud`
- **Convex Dashboard**: [https://dashboard.convex.dev/t/shubham-kamble/pmtool/shocking-opossum-923](https://dashboard.convex.dev/t/shubham-kamble/pmtool/shocking-opossum-923)

---

## Schema (`convex/schema.ts`)
Configured for multi-workspace role-based access control (RBAC):
- **`users`**: Email, name, passwordHash, avatar, title, department, bio, timezone, timestamps (index: `by_email`).
- **`workspaces`**: Name, unique slug, description, ownerId (ref: `users`), avatar, timestamps (indexes: `by_ownerId`, `by_slug`).
- **`roles`**: Workspace-scoped roles with name, description, isDefault, permissions array, timestamps (indexes: `by_workspaceId`, `by_workspace_and_name`).
- **`workspace_members`**: Junction mapping workspaces, users, and roles (indexes: `by_workspaceId`, `by_userId`, `by_workspace_and_user`, `by_roleId`).
- **`invitations`**: Workspace member invitations with invitedEmail, token, roleId, status (`pending`, `accepted`, `declined`), expiresAt (indexes: `by_token`, `by_workspaceId`, `by_invitedEmail`, `by_workspace_and_email`).


---

## Auth & Profile Endpoints (`convex/auth.ts`)
- **`login` (mutation)**: Validates email and password, updates `lastLoginAt`, and returns authenticated user metadata.
- **`signUp` (mutation)**: Registers a new user, ensures email uniqueness, and stores account details.
- **`loginWithGoogle` (mutation)**: Handles Google SSO login or account creation.
- **`getUser` (query)**: Fetches user information by Convex ID.
- **`getUserByEmail` (query)**: Fetches user information by email address.
- **`updateProfile` (mutation)**: Updates user name, title, department, bio, timezone, and avatar.
- **`changePassword` (mutation)**: Validates current password and updates passwordHash.

---

## Workspace Endpoints (`convex/workspaces.ts`)
- **`listUserWorkspaces(userId)`** (query): Retrieves all workspaces where user is a member, with roles, member counts, sorted by `updatedAt` desc.
- **`getWorkspaceDetails(workspaceId, userId?)`** (query): Fetches workspace object with owner info, roles list, member count, and verifies membership.
- **`getWorkspaceMembersByRole(workspaceId, roleId)`** (query): Retrieves all members associated with a specific role.
- **`getWorkspacePermissions(workspaceId, userId)`** (query): Checks membership and returns role details and permissions array.
- **`createWorkspace({ name, description, userId, avatar? })`** (mutation): Creates workspace with unique slug, generates 5 default roles (Owner, Admin, Manager, Member, Viewer), and registers creator as Owner member.
- **`updateWorkspace({ workspaceId, userId, name?, description?, avatar? })`** (mutation): Verifies owner permission, updates details, and regenerates slug if renamed.
- **`deleteWorkspace({ workspaceId, userId })`** (mutation): Verifies owner permission and cascade deletes members, roles, invitations, and workspace document.
- **`switchActiveWorkspace({ workspaceId, userId })`** (mutation): Validates membership and returns active workspace metadata.

---

## Role Management (`convex/roles.ts`)
- **`getWorkspaceRoles({ workspaceId })`** (query): Returns all roles sorted with default roles (Owner, Admin, Manager, Member, Viewer) first.
- **`getRolePermissions({ roleId })`** (query): Returns permission array for a specific role.
- **`createCustomRole({ workspaceId, callerUserId, name, description?, permissions })`** (mutation): Only Admin/Owner can create; validates permissions against allowed catalog.
- **`updateRolePermissions({ roleId, callerUserId, permissions })`** (mutation): Updates custom role permissions; blocks modification of default system roles.
- **`deleteCustomRole({ roleId, callerUserId, reassignToRoleId })`** (mutation): Reassigns all members to target role and deletes custom role; protects default roles.

---

## Member & Invitation Management (`convex/members.ts`)
- **`getWorkspaceMembers({ workspaceId })`** (query): Returns all members with roles, profile info, and joined dates.
- **`getUserRole({ workspaceId, userId })`** (query): Returns user's role and permissions in a workspace.
- **`getWorkspaceInvitations({ workspaceId })`** (query): Returns active pending invitations.
- **`getInvitationByToken({ token })`** (query): Validates invitation link and checks 24hr expiration.
- **`changeUserRole({ workspaceId, callerUserId, userId, newRoleId })`** (mutation): Only Owner/Admin can change roles; prevents demoting the last Owner.
- **`removeMemberFromWorkspace({ workspaceId, callerUserId, userId })`** (mutation): Removes a member; prevents removing the last Owner.
- **`inviteMemberByEmail({ workspaceId, callerUserId, invitedEmail, roleId })`** (mutation): Adds existing platform users directly or creates a 24hr expiring invitation token.
- **`acceptInvitation({ token, userId })`** (mutation): Validates token, adds user to workspace_members, and marks invitation accepted.
- **`declineInvitation({ token })`** (mutation): Marks invitation as declined.



## Useful Commands
- **Start Convex in dev/watch mode**:
  ```bash
  npm run convex:dev
  ```
- **Deploy schema and functions to Convex**:
  ```bash
  npm run convex:deploy
  ```
- **Test login or query directly from CLI**:
  ```bash
  npx convex run auth:getUser '{"userId":"<ID>"}'
  ```

---

## Pre-seeded Test Account
- **Email**: `admin@enterprise.internal`
- **Password**: `Password123!`
- **Role**: `Admin`

---

## Google OAuth 2.0 Login Setup
Google Sign-In is configured with `@react-oauth/google` and Convex backend `api.auth.loginWithGoogle`:
1. Obtain an **OAuth 2.0 Client ID** from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Set the **Authorized JavaScript origins** to `http://localhost:5173` (or your production domain).
3. In [`.env.local`](file:///c:/Users/Shubham/OneDrive/Desktop/pmtool/.env.local), add your Client ID:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```
4. If `VITE_GOOGLE_CLIENT_ID` is not yet configured, clicking the Google button provides an interactive setup dialog with step-by-step instructions and a one-click demo login option.

