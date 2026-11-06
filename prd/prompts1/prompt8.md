## **PROMPT 8: Update Dashboard KPIs for Multi-Workspace**

Update src/pages/DashboardPage.tsx to show workspace-specific metrics.

Currently: Shows generic empty state boxes

Change to:

Add workspace context header:
"You're in: [Workspace Name]" with avatar and switcher link
Update 6 KPI cards to fetch real data:
Total Projects in workspace (query: count projects by workspaceId)
Active Tasks assigned to user in workspace
Completed Tasks (this month) in workspace
Team Members in workspace
Overdue Tasks (assigned to user)
Unstarted Projects
Each KPI card:
Shows loading skeleton while fetching
Number in large font + label
Small trend indicator (e.g., "+3 this week" in green)
Click to navigate to detail page (e.g., click "Active Tasks" → Tasks page filtered to "In Progress")
Recent Activity Section:
Fetch activities from Convex (workspace-scoped)
Display: [User] [action] [target] • [timestamp]
Example: "Sarah created task 'Design homepage'" • 2 hours ago
Max 5 most recent
Team Members Widget:
Show 4 avatars of recent members
Click "+2 more" to go to Team Members page

Include:

Real Convex queries (will be created in Milestone 3 prompt)
useWorkspaceAuth() for workspace context
Error states if queries fail
Refresh button to re-fetch data
Design tokens from index.css