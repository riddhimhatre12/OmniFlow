Create convex/tasks.ts with task CRUD and sprint assignment functions 
for OmniFlow.

Tech: Convex, TypeScript

Build these functions:

**QUERIES (read-only):**

1. getTask(taskId)
   - Return full task object with:
     * All task fields
     * Assignee user profile
     * Project and sprint info
     * Created by user info

2. getTasksByAssignee(userId, workspaceId, sprintId?)
   - Return all tasks assigned to user
   - Filter by workspace
   - Optional filter by sprint
   - Group by status or return flat list
   - Used for user's personal task list

3. getTasksInStatus(sprintId, status)
   - Return tasks in specific status (todo, in_progress, in_review, done)
   - Sort by order field (for kanban column ordering)
   - Used for kanban board columns

**MUTATIONS (write):**

1. createTask(projectId, sprintId?, title, description, priority, storyPoints?, assigneeId?)
   - Validate: user has "task:create" permission
   - Validate: if sprintId provided, sprint exists and is in "planning" or "active" status
   - Auto-generate order (highest existing + 1)
   - Create task with status = "todo"
   - Log activity: "created task [title]"
   - Return: task object with new taskId

2. updateTask(taskId, updates)
   - Updates: title, description, priority, storyPoints, assigneeId, dueDate
   - Validate: user has "task:update" permission
   - Log activity if assigneeId changes: "assigned [task] to [user]"
   - Log activity if storyPoints changes
   - Return: updated task

3. assignTaskToUser(taskId, userId)
   - Set task assigneeId = userId
   - Log activity: "assigned task to [user]"
   - Return: updated task

4. updateTaskStatus(taskId, newStatus)
   - newStatus: "todo" | "in_progress" | "in_review" | "done"
   - Validate: new status is valid
   - Validate: user has "task:update" permission
   - Log activity: "moved task from [old] to [new]"
   - If newStatus = "done": auto-update sprint completedPoints
   - Return: updated task

5. moveTaskToSprint(taskId, sprintId)
   - Move task from backlog to sprint (or between sprints)
   - Validate: task is not already in sprint or in a closed sprint
   - Validate: target sprint exists and status in ["planning", "active"]
   - Update task.sprintId = sprintId
   - Reset task.order to append to sprint's tasks
   - Log activity: "moved task to sprint [sprintName]"
   - Return: updated task

6. moveTaskToBacklog(taskId)
   - Remove task from sprint (set sprintId = null)
   - Used when closing sprint with incomplete tasks
   - Reset task.order = max backlog order + 1
   - Log activity: "moved task to backlog"
   - Return: updated task

7. reorderTasksInSprint(sprintId, taskIds)
   - taskIds: [taskId1, taskId2, taskId3, ...] in desired order
   - Update order field for each task sequentially (0, 1, 2, ...)
   - Used after drag-drop reordering
   - Validate: all taskIds belong to sprintId
   - Return: success

8. reorderBacklogTasks(projectId, taskIds)
   - Reorder tasks in backlog (sprintId = null)
   - Similar to reorderTasksInSprint but for backlog
   - Return: success

9. deleteTask(taskId)
   - Validate: user has "task:delete" permission
   - Validate: task status = "todo" (can't delete started tasks)
   - Delete task
   - Log activity: "deleted task [title]"
   - Return: success

Include:
- Permission checks
- Story points calculation updates to sprint
- Timestamp management
- Activity logging
- Error handling for invalid transitions
- Drag-drop order management
- Clear error messages