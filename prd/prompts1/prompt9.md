## **PROMPT 9: Workspace Roles Configuration Page (Admin Only)**

Create src/pages/WorkspaceRolesPage.tsx for managing custom roles in a workspace.

Access: Only Owner/Admin can view

Layout:

Header: "Workspace Roles" + "Create Custom Role" button
Default Roles List (read-only section):
Cards for each default role (Owner, Admin, Manager, Member, Viewer)
Show permissions in collapsible list
Badge: "Default - Cannot Edit"
Example: Owner card shows all permissions ✓
Custom Roles Section:
List of custom roles created in this workspace (if any)
Edit/Delete buttons per role
Expandable to show permissions
"Create Custom Role" Modal:
Input: Role name (e.g., "Project Lead")
Input: Description
Checkbox grid: All available permissions (grouped by category)
Workspace Permissions
Project Permissions
Task Permissions
"Create Role" button
Show: "Role created. Assign to members in Team Members page"
"Edit Role" Modal:
Similar to create, but can update permissions
Can't edit name/description (only permissions)
Shows how many members have this role (as warning if changing permissions)
On save: "Update permissions for [count] members?"
"Delete Role" Modal:
Warning: "This will remove the role"
Dropdown: "Reassign members to..." (choose another role)
"Delete" button

Include:

useWorkspaceAuth() to verify Admin access
Convex queries for roles & permissions
Permission categories clearly organized
Tooltip explaining each permission
Audit log: "Admin changed role permissions" (backend logging)
Design tokens and consistent styling