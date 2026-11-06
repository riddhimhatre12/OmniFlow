Update src/pages/DashboardPage.tsx to add sprint-focused widgets.

Add these new sections to the dashboard:

1. **Active Sprint Card** (prominent, top of page):
   - Show current active sprint if exists:
     * Sprint name, dates, days remaining
     * Capacity bar: [Completed Points] / [Total Points]
     * Velocity indicator: "On track" (green) | "Behind" (orange) | "Critical" (red)
     * Quick stats: X tasks done, Y in progress, Z todo
     * "View Sprint" link → SprintPlanningPage
     * "Close Sprint" button (admin only)
   - If no active sprint:
     * Empty state: "No active sprint"
     * "Start Sprint Planning" button → /projects/[projectId]/sprints/planning

2. **Sprint Velocity Chart** (if >= 2 closed sprints):
   - Small bar/line chart showing last 5 sprints
   - X-axis: Sprint names
   - Y-axis: Story points completed
   - Trend line showing velocity over time
   - Tooltip on hover: "Sprint X: 34 points"

3. **Team Workload Widget** (for active sprint):
   - Show team members assigned to tasks in current sprint:
     * Avatar + name
     * Task count assigned
     * Story points total
     * Small progress bar (completed tasks %)
   - Sort by: Most loaded first
   - "Balance Workload" button (optional AI suggestion)

4. **Upcoming Deadlines** (tasks with due dates in sprint):
   - List upcoming task due dates (next 7 days)
   - Show: task name | due date | assigned to | priority
   - Color-code: Red if overdue, Orange if due soon
   - Link to task detail

5. **Sprint Progress Mini-Chart**:
   - If active sprint exists:
     * Burndown chart (simplified):
       - X-axis: Days in sprint (0 to sprint duration)
       - Y-axis: Story points remaining
       - Blue line: actual progress
       - Gray dotted line: ideal progress
     * Or if too complex, just show:
       - "On Day X of Y"
       - "45/60 points completed (75%)"
       - Progress bar

Include:
- Real-time Convex queries (getActiveSprint, getSprintTasks, getSprintBurndown)
- useWorkspaceAuth() for permission checks
- Links to detailed pages
- Loading states with skeletons
- Error handling
- Design tokens from index.css
- Responsive layout