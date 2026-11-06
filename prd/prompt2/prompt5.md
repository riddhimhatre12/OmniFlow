Create/Update src/pages/TasksPage.tsx as an interactive Kanban Board 
for the active sprint.

Route: /projects/:projectId/tasks

Features:

1. **Header**:
   - "Tasks" title
   - Sprint selector dropdown:
     * Show active sprint (pre-selected)
     * Show all planning sprints
     * Option: "View Backlog"
   - View toggle: Kanban (default) | List | Calendar
   - Filter buttons: 
     * By assignee (avatar pills, multi-select)
     * By priority (dropdowns)

2. **Kanban Board** (default view):
   - 4 columns: TO DO | IN PROGRESS | IN REVIEW | DONE
   - Each column header shows:
     * Column title
     * Number of tasks
     * Total story points in column
   - Draggable task cards:
     * Task title (line clamp to 2 lines)
     * Assignee avatar (hover = full name)
     * Priority badge with color (red=urgent, orange=high, etc.)
     * Story points in corner (if exists)
     * Due date indicator (if overdue: red, if today: yellow)
     * Project color bar on left edge
   - Drag-drop between columns:
     * Updates task status on drop
     * Shows loading state
     * Rolls back on error
   - Drag-drop within column:
     * Reorders tasks (calls reorderTasksInSprint)
   - Click card to open task detail modal
   - "+" button bottom of each column to create task in that status

3. **List View** (alternative):
   - Table with columns: Task | Assignee | Priority | Points | Status | Due Date
   - Sortable by any column
   - Row click opens detail modal
   - Inline status selector (dropdown)
   - Inline priority selector

4. **Task Creation**:
   - "Create Task" button in header (or "+" in kanban columns)
   - Modal with:
     * Title input (required)
     * Description textarea
     * Project selector (pre-filled)
     * Sprint selector (shows current sprint, can change)
     * Status dropdown (default: Todo)
     * Priority selector (Low, Medium, High, Urgent)
     * Story Points (fibonacci: 1,2,3,5,8,13,21)
     * Assignee selector (multi-select or single)
     * Due date picker
   - "Create Task" button
   - Success toast: "Task created"

5. **Task Detail Modal** (on card click):
   - Left section (editable fields):
     * Title
     * Description
     * Status (dropdown selector)
     * Priority (selector)
     * Assignee (avatar + name, clickable to change)
     * Story Points
     * Due Date
   - Right section (metadata):
     * Created by [User] • [Date]
     * Updated [Time ago]
     * Sprint badge
     * Project badge
   - Buttons:
     * "Edit" (toggle edit mode)
     * "Delete" (with confirmation)
     * "Move to Backlog" (if in sprint)
     * Close modal

6. **Empty State** (if no active sprint):
   - Illustration
   - Message: "No active sprint"
   - "Start Planning" link → SprintPlanningPage
   - "View Backlog" link → show backlog tasks

7. **Filters & Search**:
   - Search by task title
   - Filter by assignee (multi-select avatars)
   - Filter by priority
   - Filter by status
   - Clear filters button
   - Save filter preset (optional)

Include:
- useWorkspaceAuth() for permissions
- Real-time Convex queries (getSprintTasks, getActiveSprint)
- Drag-drop library (dnd-kit recommended)
- Optimistic UI updates (move card immediately, rollback on error)
- Loading states for drag operations
- Keyboard shortcuts:
  * Press 'N' to create new task
  * Press 'Esc' to close modal
- Design tokens from index.css
- Responsive: on mobile, switch to list or single-column view
- Accessibility: ARIA labels, keyboard navigation