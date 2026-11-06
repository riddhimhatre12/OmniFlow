Create convex/sprints.ts with complete Sprint CRUD and management functions 
for OmniFlow multi-workspace project management.

Tech: Convex, TypeScript, reactive queries

Build these functions:

**QUERIES (read-only):**

1. getProjectSprints(projectId, includeArchived = false)
   - Return all sprints in a project
   - Filtered by status if includeArchived = false
   - Sort by: active first, then by startDate descending
   - Include per-sprint: taskCount, completedCount, totalPoints, completedPoints
   - Return: [{ sprintId, name, status, startDate, endDate, goal, progress }]

2. getActiveSprint(projectId)
   - Get currently active sprint (status = "active")
   - Include full sprint details + task count
   - Return null if no active sprint
   - Used for dashboard and task filtering

3. getSprintDetails(sprintId)
   - Full sprint object with:
     * All sprint metadata
     * Task list count by status (todo, in_progress, in_review, done)
     * Total story points vs completed
     * Created by user info
   - Verify caller has workspace access

4. getProjectBacklog(projectId)
   - Return all tasks NOT in any sprint (sprintId = null)
   - Sort by: priority (high→low) then createdAt descending
   - Return: [{ taskId, title, priority, storyPoints, assignee, dueDate }]
   - Used for sprint planning backlog view

5. getSprintTasks(sprintId)
   - Return all tasks in sprint, grouped by status:
     * { todo: [...], in_progress: [...], in_review: [...], done: [...] }
   - Include: taskId, title, assignee, priority, storyPoints, dueDate
   - Sort within each status by order field (for drag-drop positions)

6. getSprintBurndown(sprintId)
   - Return data for burndown chart (if tracking)
   - Days elapsed, tasks remaining, ideal line
   - Return: [{ day, tasksRemaining, pointsRemaining, idealPoints }]
   - (Simpler version: just current snapshot of completion %)

**MUTATIONS (write):**

1. createSprint(projectId, name, description, goal, startDate?, endDate?)
   - Validate: user has "sprint:create" permission in workspace
   - Auto-generate sprint order based on existing sprints
   - Create sprint with status = "planning"
   - Log activity: "created sprint [name]"
   - Return: sprint object with new sprintId

2. updateSprint(sprintId, updates)
   - Updates: name, description, goal, startDate, endDate, capacity
   - Validate: user has "sprint:update" permission
   - Can only update if sprint status = "planning" (except status field)
   - Log activity: "updated sprint"
   - Return: updated sprint

3. startSprint(sprintId, startDate = now)
   - Validate: status = "planning"
   - Change status to "active"
   - Auto-record startDate
   - Auto-set endDate if not already set (default: +2 weeks)
   - Log activity: "started sprint"
   - Return: updated sprint

4. closeSprint(sprintId)
   - Validate: status = "active"
   - Change status to "closed"
   - Record endDate = now
   - Calculate completion stats (points completed, velocity)
   - Move any incomplete tasks back to backlog (sprintId = null)
   - Log activity: "closed sprint" with completion %
   - Return: sprint with final stats

5. deleteSprint(sprintId)
   - Validate: status = "planning" (can't delete active/closed sprints)
   - Validate: user is Owner or Admin
   - Move all tasks to backlog (set sprintId = null)
   - Delete sprint
   - Log activity: "deleted sprint"
   - Return: success

6. updateSprintCapacity(sprintId, capacityPoints)
   - Set target story points for sprint
   - Used for capacity planning
   - Return: updated sprint

Include:
- Permission validation with throw Error("Access denied")
- Timestamp management (createdAt, updatedAt)
- Activity logging (create sprint_activities records)
- Error handling: invalid sprint status transitions
- Data validation: dates make sense (startDate < endDate)
- Clear error messages