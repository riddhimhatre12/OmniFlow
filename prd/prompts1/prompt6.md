Create src/pages/TeamMembersPage.tsx for the OmniFlow app.

This page shows all workspace members, allows inviting new members, 
and changing member roles.

Layout:
1. Header: "Team Members" title + "Invite Member" button

2. Members Table:
   - Columns: Avatar + Name | Email | Role | Joined Date | Actions
   - Actions dropdown (per row):
     * Change Role (only if user has manage_members permission)
     * Remove Member (only Owner/Admin)
     * Can't remove last Owner
   - Show tooltip if user lacks permission to perform action
   - Sortable by Name, Role, Joined Date

3. "Invite Member" Modal:
   - Input: Email address
   - Select: Role (from available roles in workspace)
   - On submit:
     * Call convex inviteMemberByEmail mutation
     * Show: "Invitation sent to [email]"
     * If user exists on platform: "Added to workspace immediately"
     * If new user: "Email invitation sent (expires in 24 hours)"
   - Handle errors: duplicate email, invalid format

4. Pending Invitations Section (if invitations exist):
   - Show invited emails not yet accepted
   - Status badge: "Pending"
   - Resend invite button (re-email, extend expiry by 24h)
   - Revoke invite button (cancel pending invitation)

5. Role Change Modal (when user clicks "Change Role"):
   - Show current role
   - Dropdown with available roles
   - "Update Role" button
   - Confirmation: "Change [user] from [old role] to [new role]?"

Include:
- Permission checks using useWorkspaceAuth()
- Real-time member list from Convex query
- Loading skeleton while fetching
- Empty state if no members
- Toast/feedback for actions
- Design tokens from index.css