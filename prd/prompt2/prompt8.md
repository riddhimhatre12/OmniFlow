Update src/App.tsx and src/components/layout/Sidebar.tsx to add 
sprint and task management routes.

Routes to add/update:

1. In App.tsx route switcher:
   - '/projects/:projectId/tasks' → <TasksPage />
   - '/projects/:projectId/sprints/planning' → <SprintPlanningPage />
   - '/projects/:projectId/sprints/history' → <SprintHistoryPage /> (optional)

2. In Sidebar.tsx navigation:
   - Current: "Projects" → /projects
   - Add under Projects section:
     * "Tasks" (if active project selected) → /projects/[activeProjectId]/tasks
     * "Sprint Planning" (if active project) → /projects/[activeProjectId]/sprints/planning
   - Keep "Dashboard" pointing to / (shows sprint summary)

3. Update DashboardPage links:
   - "Create Task" button → opens TasksPage or create modal
   - "View All Tasks" link → /projects/[activeProjectId]/tasks
   - "Start Sprint" button → /projects/[activeProjectId]/sprints/planning
   - Project card click → /projects/[projectId]/tasks (show project's tasks)

4. Breadcrumb navigation:
   - All pages should show: Home > Projects > [Project Name] > [Current Page]
   - Make breadcrumbs clickable to navigate

Include:
- Dynamic route parameters (:projectId, :sprintId)
- Deep linking (URL remembers current project/sprint)
- useCurrentUser() & useWorkspaceAuth() integration
- 404 handling if project/sprint doesn't exist
- Loading states while fetching project data