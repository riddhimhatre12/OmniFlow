Extend convex/schema.ts to add Sprint management for OmniFlow projects.

Current: Users, Workspaces, Roles, Members, Projects tables exist.

Add these tables:

1. **sprints table**:
   - sprintId: auto
   - workspaceId: ref to workspaces
   - projectId: ref to projects
   - name: string (e.g., "Sprint 1", "Q4 2024 - Sprint 2")
   - description: optional string
   - status: "planning" | "active" | "closed" (enum)
   - goal: optional string (sprint objective)
   - startDate: optional number (timestamp)
   - endDate: optional number (timestamp)
   - capacity: optional number (total story points planned)
   - completedPoints: number (default 0, auto-calculated)
   - order: number (for sprint sequence)
   - createdAt: number
   - updatedAt: number
   - createdBy: ref to users
   - Indexes: by_projectId, by_workspaceId, by_status, by_project_and_status

2. **tasks table** (MODIFY existing if already created):
   Add if not present:
   - taskId: auto
   - workspaceId: ref to workspaces
   - projectId: ref to projects
   - sprintId: optional ref to sprints (null = in backlog)
   - title: string
   - description: optional string
   - status: "todo" | "in_progress" | "in_review" | "done" (enum)
   - priority: "low" | "medium" | "high" | "urgent" (enum)
   - storyPoints: optional number (e.g., 1, 2, 3, 5, 8, 13 - fibonacci scale)
   - assigneeId: optional ref to users
   - dueDate: optional number
   - order: number (for drag-drop reordering within sprint)
   - createdAt: number
   - createdBy: ref to users
   - updatedAt: number
   - Indexes: by_projectId, by_sprintId, by_workspaceId, by_assigneeId, 
             by_sprint_and_status, by_project_and_backlog (for backlog queries)

3. **sprint_activities table** (optional but recommended):
   - id: auto
   - sprintId: ref to sprints
   - workspaceId: ref to workspaces
   - action: string (e.g., "sprint_created", "sprint_started", "task_added_to_sprint", "sprint_completed")
   - userId: ref to users
   - details: optional string (JSON payload if needed)
   - createdAt: number
   - Indexes: by_sprintId

Include:
- Full TypeScript type definitions for all tables
- Proper relationships and constraints
- Timestamp fields for audit trails
- Order fields for drag-and-drop support
- Design notes on why each field exists