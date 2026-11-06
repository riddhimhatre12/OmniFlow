Update src/components/layout/Sidebar.tsx to add workspace switching functionality.

Current: Shows navigation links and profile card at bottom

Add to Sidebar:

1. NEW Workspace selector dropdown (below logo, above nav links)
   - Shows current workspace name and avatar
   - Click opens dropdown with:
     * List of all user's workspaces (from useWorkspaceAuth)
     * "Create New Workspace" button at bottom
   - On selection: calls switchWorkspace() from useWorkspaceAuth
   - Updates: active workspace context, active URL path, sidebar highlights

2. "Create Workspace" modal triggered from dropdown:
   - Input: Workspace name
   - Input: Description (optional)
   - On submit: call convex createWorkspace mutation
   - Auto-switch to new workspace on success
   - Show error if name is duplicate

3. Update profile card at bottom:
   - Show "CURRENT WORKSPACE: [Name]" badge above user info
   - Show user's role in current workspace (e.g., "Owner", "Member")

Include:
- Use design tokens from index.css
- Consistent with existing sidebar style
- Smooth transitions/animations
- Loading states
- Error handling
- TypeScript types