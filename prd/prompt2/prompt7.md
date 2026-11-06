Create src/pages/SprintHistoryPage.tsx for viewing past sprint details.

Route: /projects/:projectId/sprints/history

Purpose: Retrospective analysis of closed sprints and velocity tracking.

Layout:

1. **Sprint List** (left sidebar):
   - Filter: "All Sprints" | "Last 3 Months" | "Last 6 Months"
   - Sort by: Most recent first
   - List of closed sprints with:
     * Sprint name
     * Date range
     * Velocity (X points completed)
     * Click to view details

2. **Sprint Details** (main content):
   - Sprint header:
     * Name, dates, status (Closed)
     * Velocity: 34/45 points (75.5%)
   
   - **Tabs**:
   
     **Overview**:
     - Sprint goal (if set)
     - Burndown chart (if you have historical data)
     - Velocity vs capacity
     - Completion date vs target date
     - Team velocity average
   
     **Tasks**:
     - All tasks in sprint
     - Grouped by status (Done, Not Done)
     - For completed: show completion date
     - For incomplete: note if moved to backlog
   
     **Team Performance**:
     - Team members who worked on sprint
     - Tasks per person
     - Points per person
     - Velocity by team member
   
     **Retrospective** (optional):
     - Text field for sprint summary notes
     - "Key Achievements" section
     - "Challenges" section
     - "Next Sprint Improvements" section
     - Save retrospective notes

3. **Velocity Trends Chart** (bottom):
   - Show all closed sprints' velocities
   - Trend line: improving/declining
   - Average velocity calculation
   - Forecast: "Next sprint projected: 38 points (avg)"

Include:
- Read-only view (no editing closed sprints)
- useWorkspaceAuth() permission checks
- Convex queries for historical sprint data
- Charts/graphs library (recharts recommended)
- Export sprint summary (optional)
- Design tokens from index.css