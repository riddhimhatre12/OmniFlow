Create src/components/ui/SprintStatusIndicator.tsx component for displaying
sprint health and progress indicators.

Export these components:

1. <SprintProgressBar sprintId={sprintId} />
   - Shows: [Completed Points] / [Total Points]
   - Visual bar: 
     * Green fill for completed
     * Light gray for remaining
   - Percentage text: "75%"
   - Color-coded:
     * Green if >= 80%
     * Yellow if 50-79%
     * Red if < 50%

2. <SprintHealthBadge sprintId={sprintId} />
   - Compact badge showing sprint status:
     * "On Track" (green) if points/tasks on pace
     * "At Risk" (orange) if behind pace
     * "Critical" (red) if significantly behind
   - Tooltip: brief explanation

3. <BurndownChart sprintId={sprintId} />
   - Mini burndown chart (if sprint is active)
   - Shows:
     * Blue line: actual burndown
     * Gray dotted line: ideal burndown
     * X-axis: Days (0 to sprint length)
     * Y-axis: Points remaining
   - Tooltip on hover: day X, remaining points
   - Click to expand to full chart

4. <TaskStatusSummary sprintId={sprintId} />
   - Text summary: "12 tasks: 5 done, 3 in progress, 4 todo"
   - Or as small chips:
     * ✓ Done: 5
     * ⏳ In Progress: 3
     * ○ Todo: 4

5. <SprintCountdown sprintId={sprintId} />
   - Shows days remaining in sprint
   - If < 3 days: red text "2 days left"
   - If closed: "Sprint ended 3 days ago"
   - Click to see exact end date in tooltip

Include:
- Real-time Convex subscriptions (updates as tasks change)
- useWorkspaceAuth() for permission context
- Design tokens from index.css
- Accessibility: ARIA labels, color + icon indicators (not just color)
- TypeScript types for all props
- Skeleton loading state while fetching