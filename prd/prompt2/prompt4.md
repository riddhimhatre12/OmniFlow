Create src/pages/SprintPlanningPage.tsx for OmniFlow sprint management.

This is the sprint planning and backlog management view.
Route: /projects/:projectId/sprints/planning

Layout:

1. **Header Section**:
   - Breadcrumb: Projects > [Project Name] > Sprint Planning
   - "Create Sprint" button (blue, primary)
   - View toggle: "Planning View" (default) | "Backlog View"

2. **Left Panel: Sprint List** (narrow sidebar)
   - "Sprints" header
   - Accordions for each sprint status:
     * ACTIVE SPRINT (expanded by default)
       - Single active sprint (if exists)
       - Show: [Sprint Name] | [X days left] | [45/60 points]
       - Start/Close sprint buttons
     * PLANNING SPRINTS
       - List of planning-status sprints
       - Click to expand details
       - Edit/Delete buttons per sprint
     * CLOSED SPRINTS (collapsed by default)
       - Past sprints
       - Click to view completed tasks & velocity
   - "Create Sprint" button at bottom

3. **Right Panel: Sprint Details** (main content)

   **If no sprint selected**:
   - Empty state: "Select a sprint to plan"
   - Show recent active sprint or newest planning sprint

   **If sprint selected**:
   - Sprint header:
     * Sprint name, status badge (Planning/Active/Closed)
     * Sprint goal text (if exists)
     * Date range: [Start] → [End] (days remaining if active)
     * Capacity: [Completed Points] / [Total Points]
     * Progress bar

   - **Two Columns Below**:

     **Column 1: Sprint Tasks (Kanban-style)**:
     - 4 columns: To Do | In Progress | In Review | Done
     - Draggable task cards showing:
       * Task title
       * Assignee avatar + name
       * Story points badge (if exists)
       * Priority color indicator
       * Due date (if set)
     - Drag-drop between columns = status change
     - Double-click task to open detail modal
     - Bottom of each column: count + total points

     **Column 2: Sprint Backlog (for Planning phase)**:
     - Shows all unscheduled tasks in project
     - Sort by: Priority (high→low), then by Created date
     - Draggable to left panel (to add to sprint)
     - Show: task title, priority, story points, assignee
     - Search/filter backlog
     - Pagination if > 20 tasks

4. **Sprint Details Modal** (when clicking sprint card):
   - Tabs: Overview | Tasks | Velocity
   - Overview:
     * Name, Description, Goal (edit if status = planning)
     * Status selector (planning → active → closed)
     * Dates (edit if planning)
     * Capacity selector
     * Created by, Created at
   - Tasks:
     * Grouped by status
     * Count per status
   - Velocity (if closed sprint):
     * Points completed / total
     * Velocity trend (compare to previous sprints)

5. **Create Sprint Modal**:
   - Input: Sprint Name (e.g., "Sprint 3")
   - Input: Sprint Goal (optional)
   - Input: Capacity (story points, optional)
   - Date Pickers: Start Date, End Date
   - "Create Sprint" button
   - Success message: "Sprint created. Add tasks to get started."

6. **Quick Sprint Actions**:
   - "Start Sprint" button (only if status = planning):
     * Confirmation: "Start sprint [name]?"
     * Calls backend startSprint mutation
     * Shows toast: "Sprint started!"
   - "Close Sprint" button (only if status = active):
     * Confirmation: "Close sprint [name]? Incomplete tasks will move to backlog."
     * Shows completed velocity
     * Toast: "Sprint closed. Velocity: 34 points"

Include:
- useWorkspaceAuth() for permission checks (task:create, task:update, sprint:update)
- Real-time reactive queries from Convex
- Drag-drop using dnd-kit or react-beautiful-dnd (with story points update)
- Loading skeletons while fetching
- Error handling & toast notifications
- Design tokens from index.css
- Responsive: hide backlog on mobile, show tabs instead