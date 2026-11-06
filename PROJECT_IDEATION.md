# OmniFlow — Unified Work & Project Management Platform
## Project Ideation, Architecture & Current Implementation Status

> **Target Audience for this Document:**  
> This document is engineered for developer handoff and AI agents. It describes the platform's vision, tech stack, deployed backend, implemented features, codebase structure, and prioritized next steps so any AI agent can immediately continue development with zero ramp-up friction.

---

## 1. Product Vision & Architecture

**OmniFlow** is an enterprise-grade unified work management and project coordination SaaS platform. It combines capabilities from modern project management (Linear/Jira), task tracking (Asana/Trello), agile sprint planning, multi-tenant workspace governance, and cross-team collaboration into a cohesive, high-density interface.

### Core Architecture Principles:
- **Client-First React 19 + Vite Application**: Built with React 19, TypeScript, and high-performance Vanilla CSS using custom design tokens (`index.css`).
- **Serverless Realtime Cloud Backend (Convex)**: Hosted on Convex Cloud for reactive data synchronization, optimistic UI updates, and zero-boilerplate WebSocket state.
- **Multi-Tenant Workspace Isolation**: Scoped access control where users belong to workspaces via memberships and predefined/custom roles.
- **Granular Role-Based Access Control (RBAC)**: Fine-grained permission model across Workspace, Project, Sprint, and Task domains with declarative UI gates (`<PermissionGate>`, `<RoleGate>`, `useHasPermission`).
- **Agile Scrum & Kanban Integration**: Integrated sprint lifecycles (Planning &rarr; Active &rarr; Closed), Fibonacci story points, burndown tracking, backlog grooming, and drag-and-drop task pipelines.

---

## 2. Technology Stack & Environment

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`react`, `react-dom`) | Modern hooks, strict mode compliant |
| **Bundler & Dev Server** | Vite 8.3 (`@vitejs/plugin-react`) | Port `5173`, fast HMR, production builds |
| **Hosting & CI/CD** | Vercel (`vercel.json` rewrites) | Live at `https://omni-flow-tawny.vercel.app` |
| **Git Repository** | GitHub | `https://github.com/kamble0805/OMNI-Flow` |
| **Language** | TypeScript (~6.0) | Strict type checking (`noImplicitAny`, etc.) |
| **Styling** | Vanilla CSS (`index.css`, tokens) | Design tokens, CSS variables, dark/light accents |
| **Iconography** | Lucide React (`lucide-react`) | Consistent iconography throughout |
| **Cloud Backend** | Convex Cloud (Dev & Prod) | `shocking-opossum-923` (dev) & `graceful-cobra-454` (prod) |
| **Authentication** | Convex Auth + Google OAuth 2.0 | `@react-oauth/google`, `jwt-decode`, guest fallback |
| **Linter / Quality** | Oxlint (`oxlint`) | 0 warnings, 0 errors |

---

## 3. Implemented Capabilities & Milestones (Completed)

### Milestone 1: Multi-Workspace & Tenant Architecture (Prompts 4 & 5) — Completed: September 27, 2026
- **Data Models (`convex/schema.ts`)**:
  - `workspaces`: `name`, `slug`, `description`, `ownerId` (ref `users`), `avatar`, timestamps. Indexes: `by_ownerId`, `by_slug`.
  - `roles`: `workspaceId`, `name`, `description`, `isDefault`, `permissions` array. Indexes: `by_workspaceId`, `by_workspace_and_name`.
  - `workspace_members`: `workspaceId`, `userId`, `roleId`, `joinedAt`, `invitedAt`, `invitedBy`. Compound index `by_workspace_and_user` ensuring uniqueness.
- **Workspace Lifecycle Mutations (`convex/workspaces.ts`)**:
  - `createWorkspace`: Auto-creates workspace, generates unique URL slug, provisions 5 default roles (Owner, Admin, Manager, Member, Viewer), and binds creator as Owner.
  - `updateWorkspace`: Owner-only workspace metadata and avatar editing.
  - `deleteWorkspace`: Cascades deletion across all workspace members, custom roles, and invitations.
  - `switchActiveWorkspace`: Verifies caller membership and returns active workspace session.
- **Frontend Components**:
  - `CreateWorkspaceModal.tsx`: Modal for creating new workspaces with instant validation and switching.
  - Workspace selector dropdown in `Sidebar.tsx` and `DashboardPage.tsx`.
  - **No-Workspace State**: When a user has no workspace or none is selected, the dashboard renders a blurred backdrop with a centered modal prompting them to create or select a workspace. The sidebar dynamically restricts navigation to Dashboard only until a workspace is joined.

---

### Milestone 2: Team Members & 24-Hour Invitations (Prompt 6) — Completed: September 27, 2026
- **Data Model (`convex/schema.ts`)**:
  - `invitations`: `workspaceId`, `invitedEmail`, `invitedBy`, `roleId`, `token`, `status` (`pending` | `accepted` | `declined`), `expiresAt` (24h limit).
- **Backend Functions (`convex/members.ts`)**:
  - `getWorkspaceMembers`: Reactive roster sorted by role hierarchy (Owner &rarr; Admin &rarr; Manager &rarr; Member &rarr; Viewer).
  - `changeUserRole`: Admin/Owner role updates with safety rule preventing demotion of the last Owner.
  - `removeMemberFromWorkspace`: Removes members with last-owner protection.
  - `inviteMemberByEmail`: Automatically adds existing platform users directly or creates unique 24-hour expiring invitation tokens for new users.
  - `acceptInvitation`, `declineInvitation`, `resendInvitation`, `revokeInvitation`.
- **Frontend (`src/pages/TeamMembersPage.tsx`)**:
  - Comprehensive team management page at route `/teams`.
  - Search filter, role filter dropdown, sorting by Name, Role, or Date Joined.
  - Member actions menu: Change Role modal, Remove Member confirmation with transfer logic.
  - Pending invitations tab showing hours remaining, resend invite, and revoke actions.

---

### Milestone 3: Role-Based UI Gating (Prompt 7) — Completed: September 27, 2026
- **`<PermissionGate>` (`src/components/ui/PermissionGate.tsx`)**:
  - Conditionally renders children if active member possesses the required permission.
  - Fallback support: Renders custom fallback or wraps children in a disabled state (`pointer-events: none`, reduced opacity) with a hover tooltip explanation.
- **`<RoleGate>` (`src/components/ui/PermissionGate.tsx`)**:
  - Renders children if user has one of specified roles (e.g. `roles={['Owner', 'Admin']}`).
  - Automatically satisfies for Workspace Owners.
- **`useHasPermission(permission)` Hook (`src/hooks/useHasPermission.ts`)**:
  - Hook returning boolean for use inside event handlers and mutation triggers.

---

### Milestone 4: Multi-Workspace Dashboard KPIs & Activity Feeds (Prompt 8) — Completed: September 27, 2026
- **Frontend (`src/pages/DashboardPage.tsx`)**:
  - **Context Header**: Displays `"You're in: [Workspace Name]"`, workspace avatar/initials, member role badge, and quick switcher menu.
  - **Live Refresh**: Button with spinning animation to re-fetch/sync live data.
  - **KPI Cards**: Total Projects, Active Tasks, Completed Tasks, Team Members, Overdue Tasks, Backlog Tasks.
  - **Shimmer Skeletons**: Displays smooth animated loading placeholders while querying Convex.
  - **Recent Activity Feed**: Queries `api.workspaces.getWorkspaceActivities` showing recent workspace events formatted as `[User] [action] [target] • [timestamp]`.
  - **Team Members Widget**: Overlapping avatar stack with hover tooltips and interactive navigation leading to `/teams`.

---

### Milestone 5: Workspace Roles Configuration (Prompt 9) — Completed: September 27, 2026
- **Backend (`convex/roles.ts`)**:
  - `getWorkspaceRoles`: Returns all default and custom roles enriched with live `memberCount`.
  - `createCustomRole`: Validates 15 permissions against catalog, prevents duplicates, and logs backend audit entries.
  - `updateRolePermissions`: Updates permissions with audit logs; protects system default roles from tampering.
  - `deleteCustomRole`: Requires reassigning all existing members of the role to an alternative role before deletion.
- **Frontend (`src/pages/WorkspaceRolesPage.tsx`)**:
  - Route `/roles` mounted in `App.tsx` and linked from `Sidebar.tsx` and `TeamMembersPage.tsx`.
  - **Access Guard**: Strictly restricts access to Workspace Owners and Admins; unauthorized members see an Access Restricted card.
  - **Default Roles (Read-Only)**: Cards for Owner, Admin, Manager, Member, Viewer with `Default - Cannot Edit` badge, member counts, and collapsible permission trays.
  - **Custom Role Builder Modal**: Input for role name, description, and permission matrix (Workspace, Project, and Task permissions).
  - **Edit & Delete Role Modals**: Reassign members dropdown to migrate active users to another role prior to deletion.

---

### Milestone 6: Deployment & Infrastructure Setup — Completed: September 27, 2026
- **GitHub Repository**: Initialized Git repository and pushed complete codebase to [https://github.com/kamble0805/OMNI-Flow](https://github.com/kamble0805/OMNI-Flow).
- **Vercel Production Deployment**: Configured at [https://omni-flow-tawny.vercel.app](https://omni-flow-tawny.vercel.app).
- **SPA Routing (`vercel.json`)**: Configured URL rewrites (`"source": "/(.*)", "destination": "/index.html"`) so direct refreshes on deep links (`/dashboard`, `/teams`, `/roles`, `/projects`, `/tasks`, `/login`) resolve correctly.
- **Convex Production Sync**: Deployed all schemas, compound indexes, and server functions to `graceful-cobra-454.eu-west-1.convex.cloud`.
- **Defensive API Hardening**: Made user ID parameters across queries safely handle guest or undefined sessions without throwing unhandled server errors.

---

### Milestone 7: Projects Management Module — Completed: September 28, 2026
- **Data Model (`convex/schema.ts`)**:
  - `projects`: `workspaceId`, `name`, `slug`, `description`, `status` (`planning` | `in_progress` | `on_hold` | `completed`), `priority` (`low` | `medium` | `high` | `urgent`), `startDate`, `dueDate`, `leadId` (ref `users`), `color` (theme hex), `createdAt`, `updatedAt`.
  - Indexes: `by_workspaceId`, `by_workspace_and_slug`, `by_workspace_and_status`, `by_leadId`.
- **Backend Functions (`convex/projects.ts`)**:
  - `createProject`: Validates `project:create` permission, auto-generates slug unique per workspace, inserts project, updates workspace timestamp.
  - `getWorkspaceProjects`: Reactive query filtered by workspace, status, search, and enriched with lead user profile details.
  - `getProjectDetails`: Detailed project query with lead info.
  - `updateProject`: Gated with `project:update`, updates project fields.
  - `deleteProject`: Gated with `project:delete`, permanently removes project.
- **Frontend Components & Pages**:
  - `CreateProjectModal.tsx`: Comprehensive modal for project creation and editing with Name, Description, Status, Priority, Project Lead dropdown, Start/Due Date pickers, and color theme picker.
  - `ProjectsPage.tsx` (`/projects`): Grid/List toggle, search filter, status filter tabs (All, Planning, In Progress, Completed), priority selector, project cards with status/priority chips, lead avatar, due date countdown, and sprint planning shortcuts.
  - **Navigation (`App.tsx` & `Sidebar.tsx`)**: Connected `/projects` deep link and Sidebar item.

---

### Milestone 8: Tasks Engine & Backlog Management (Prompt2 / Milestones 1-3) — Completed: September 28, 2026
- **Data Model (`convex/schema.ts`)**:
  - `tasks`: `workspaceId`, `projectId`, `sprintId` (optional, null/omitted = product backlog), `title`, `description`, `status` (`todo` | `in_progress` | `in_review` | `done`), `priority` (`low` | `medium` | `high` | `urgent`), `storyPoints` (1, 2, 3, 5, 8, 13 Fibonacci), `assigneeId` (ref `users`), `dueDate`, `order`, `createdBy` (ref `users`), timestamps.
  - Indexes: `by_projectId`, `by_sprintId`, `by_workspaceId`, `by_assigneeId`, `by_sprint_and_status`, `by_project_and_sprint`, `by_project_and_status`.
- **Backend Functions (`convex/tasks.ts`)**:
  - `getWorkspaceTasks`: Reactive query filtering by workspace, project, sprint, status, priority, and assignee.
  - `getTask`: Detailed task fetch with author and assignee profiles.
  - `createTask`: Permission-gated task creation with default order index, story points, and sprint assignment.
  - `updateTask`: Update title, description, priority, story points, due date, and assignee.
  - `assignTaskToUser`: Dedicated mutation to quickly reassign or unassign tasks.
  - `updateTaskStatus`: Update status (`todo`, `in_progress`, `in_review`, `done`) and automatically updates sprint completed points when a task transitions to or from `done`.
  - `moveTaskToSprint` & `moveTaskToBacklog`: Seamless transfer between active/planning sprints and the product backlog.
  - `reorderTasks`, `reorderTasksInSprint`, `reorderBacklogTasks`: Rank adjustment for drag-and-drop sequencing.
  - `deleteTask`: Permanent task deletion with sprint point balance adjustments.
- **Frontend (`src/pages/TasksPage.tsx`)**:
  - Route `/tasks` mounted in `App.tsx` and accessible via Sidebar.
  - **Dual Views**: Interactive Kanban Board (columns: To Do, In Progress, In Review, Done) and high-density Table/List view.
  - **Filtering & Search**: Multi-filter controls for Project, Sprint (All, Active Sprint, Backlog), Assignee, and Priority.
  - **Interactive Task Modal**: Modal for creating and editing tasks with markdown descriptions, Fibonacci story point selectors, and assignee pickers.

---

### Milestone 9: Agile Sprint Planning, History & Analytics (Prompt2 / Prompts 1-5, 7-9) — Completed: September 28, 2026
- **Data Models (`convex/schema.ts`)**:
  - `sprints`: `workspaceId`, `projectId`, `name`, `description`, `status` (`planning` | `active` | `closed`), `goal`, `startDate`, `endDate`, `capacity` (committed points), `completedPoints`, `order`, timestamps, `createdBy` (ref `users`).
    - Indexes: `by_projectId`, `by_workspaceId`, `by_status`, `by_project_and_status`.
  - `sprint_activities`: `sprintId`, `workspaceId`, `action` (`sprint_created`, `sprint_started`, `task_added_to_sprint`, `sprint_completed`), `userId`, `details`, `createdAt`.
    - Indexes: `by_sprintId`, `by_workspaceId`.
- **Backend Functions (`convex/sprints.ts`)**:
  - `getProjectSprints`: Reactive sprint list with computed metrics (total points, completed points, task counts, % progress).
  - `getActiveSprint`: Instant query for currently running sprint per project.
  - `getSprintDetails`: Comprehensive sprint info with audit history.
  - `getProjectBacklog`: Fetches unassigned backlog tasks sorted by sequence order.
  - `getSprintTasks`: Retrieves all work items committed to a sprint.
  - `getSprintBurndown`: Computes ideal vs. actual remaining story points across the sprint duration.
  - `createSprint`, `updateSprint`, `deleteSprint`: Sprint lifecycle mutations with permission verification.
  - `startSprint`: Validates dates, capacity, transitions status to `active`, and logs start activity.
  - `closeSprint`: Marks sprint `closed`, records completion stats, prompts retrospective, and automatically rolls unfinished tasks over to product backlog or a designated next sprint.
  - `saveSprintRetrospective` & `getSprintRetrospective`: Captures sprint retro insights ("what went well", "what could improve", action items).
- **Frontend Pages & Components**:
  - `SprintPlanningPage.tsx` (`/projects/:projectId/sprints/planning`): Split-pane planning interface. Drag or click-to-assign tasks between Backlog and Sprint, live capacity meter bar, total points calculator, sprint configuration drawer, and "Start Sprint" ceremony trigger.
  - `SprintHistoryPage.tsx` (`/projects/:projectId/sprints/history`): Historical sprint log, velocity progression chart across sprints, burndown curves, completion ratios, and retrospective review.
  - `SprintStatusIndicator.tsx`: Reusable status pill indicating sprint status, velocity health ("On track", "Behind", "Critical"), and capacity progress bars.

---

### Milestone 10: Sprint-Focused Dashboard & Navigation Integration (Prompt2 / Prompt 6) — Completed: September 28, 2026
- **Dashboard Agile Enhancements (`src/pages/DashboardPage.tsx`)**:
  - **Active Sprint Card**: Prominent card featuring sprint name, countdown days remaining, capacity bar, velocity badge, task count status chips, and direct links to planning and sprint closure.
  - **Sprint Velocity Mini-Chart**: Visual bar chart tracking story point delivery across recent sprints.
  - **Team Workload Distribution**: Displays team members assigned to current sprint tasks, allocated points, and load percentages.
  - **Upcoming Deadlines Radar**: Real-time list of tasks due in the next 7 days with color-coded urgency indicators.
- **Unified Breadcrumb Navigation (`src/components/layout/Breadcrumbs.tsx`)**:
  - Hierarchical clickable breadcrumbs across Workspaces &rarr; Projects &rarr; Sprints &rarr; Planning / History / Tasks / Settings &rarr; Preferences.
- **Deep Routing (`src/App.tsx` & `src/components/layout/Sidebar.tsx`)**:
  - Route additions for `/projects/:projectId/sprints/planning` and `/projects/:projectId/sprints/history` with project context preserved across navigation.

---

### Milestone 11: Real-time In-App Notifications & Activity Feed Engine — Completed: September 29, 2026
- **Data Models (`convex/schema.ts`)**:
  - `notifications`: `userId`, `workspaceId`, `type` (`task_assigned`, `sprint_started`, `sprint_closed`, `invite_received`, `role_changed`, `member_joined`, `project_created`, `task_commented`, `task_status_changed`, `mention`), `title`, `message`, `read`, `readAt`, `actionBy` (ref `users`), `relatedResourceId`, `relatedResourceType`, `link`, `metadata`, `createdAt`, `expiresAt`.
    - Indexes: `by_userId`, `by_workspaceId`, `by_userId_and_read`, `by_createdAt`, `by_workspace_and_user`, `by_user_workspace_created`.
  - `activity_feed`: `workspaceId`, `userId`, `action`, `resourceType`, `resourceId`, `resourceName`, `changes`, `description`, `createdAt`.
    - Indexes: `by_workspaceId`, `by_userId`, `by_createdAt`, `by_resourceType`, `by_workspace_and_created`.
  - `notification_preferences`: `userId`, `workspaceId`, `taskAssignedEnabled`, `taskCommentedEnabled`, `sprintStartedEnabled`, `sprintClosedEnabled`, `memberInvitedEnabled`, `memberJoinedEnabled`, `roleChangedEnabled`, `mentionEnabled`, `emailNotifications`, `deliveryMethod`, `notificationFrequency`, `updatedAt`.
    - Indexes: `by_userId_workspace`, `by_userId`.
- **Backend Module (`convex/notifications.ts`)**:
  - `getUserNotifications`: Reactive query returning unread notifications first, then sorted newest first, enriched with `actionBy` user profile.
  - `getUnreadNotificationCount`: Badge counter querying unread records in current workspace.
  - `getNotificationDetails`: Detailed notification payload with actor details and deep-linking context.
  - `getUserNotificationPreferences`: Returns custom user settings with fallback defaults.
  - `getActivityFeed`: Filterable, chronologically sorted workspace audit trail.
  - `createNotification` & `createNotificationHelper`: Preference-checked, deduplicated (15s sliding window), auto-expiring notification dispatcher with self-action suppression.
  - `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteNotification`, `clearAllNotifications`.
  - `updateNotificationPreferences`: Upsert mutation for personal workspace alert preferences.
  - `logActivity` & `logActivityHelper`: Real-time audit recording across major entity lifecycle events.
- **Cross-Service Event Emission**:
  - `convex/tasks.ts`: Emits `task_assigned` notification & logs `task_created`, `task_assigned`, and `task_status_changed` activity.
  - `convex/sprints.ts`: Emits `sprint_started` and `sprint_closed` notifications to all sprint assignees and logs sprint lifecycle events.
  - `convex/members.ts`: Emits `invite_received`, `member_joined`, and `role_changed` notifications & logs invitations and promotions.
  - `convex/projects.ts`: Emits `project_created` notifications to designated project leads & logs project creation.
  - `convex/auth.ts`: Logs user authentication events to workspace activity feed.
- **Frontend Components & Pages**:
  - `NotificationCenter.tsx` (`src/components/layout/NotificationCenter.tsx`): Replaces static bell in `Topbar.tsx` with dynamic badge indicator, slide-out drawer, All/Unread filter tabs, type icons with color accents, relative time formatting, "Mark all as read", individual deletion, and link navigation.
  - `PreferencesPage.tsx` (`src/pages/PreferencesPage.tsx`): Comprehensive settings console at `/preferences` with Category toggles (Tasks, Sprints, Team, Mentions), delivery method options, frequency radios, save confirmation toast, and "Reset to Defaults".

---

### Milestone 12: Light Mode & Dark Mode Theming System — Completed: September 29, 2026
- **CSS Variables & Design Tokens (`src/index.css`)**:
  - Full semantic token architecture for both light `:root` and dark `html[data-theme="dark"]`.
  - Comprehensive color mappings: primary blue (`#3b82f6` / `#60a5fa`), secondary purple, status palettes (success, warning, danger, info), neutral slate range (`--slate-50` to `--slate-900`), layered backgrounds (`--bg-primary`, `--bg-secondary`, `--bg-tertiary`), text tokens, borders, and shadows.
  - Media query fallbacks for `@media (prefers-color-scheme: dark)` and `@media (prefers-color-scheme: light)` respecting OS settings when unforced.
  - Smooth theme transitions on color, background, and border tokens with `prefers-reduced-motion` compliance.
- **Theme Context & State Engine (`src/contexts/ThemeContext.tsx`)**:
  - `ThemeProvider` and `useTheme` managing `'light' | 'dark' | 'system'` modes.
  - Instant synchronous initialization on load from `localStorage('omni-theme')` avoiding theme flash / layout shift.
  - Dynamic listener on `window.matchMedia('(prefers-color-scheme: dark)')` responding in real-time when OS preference changes.
  - Sets `data-theme` attribute directly on `document.documentElement`.
- **UI Components & Settings**:
  - `ThemeToggle.tsx` (`src/components/ui/ThemeToggle.tsx`): 3-state toggle (Sun, Monitor, Moon) mounted in `Topbar.tsx` for quick 1-click switching with active indicators and accessible labels.
  - Display & Theme tab in `PreferencesPage.tsx` (`src/pages/PreferencesPage.tsx`): Interactive preview cards for System Preference, Light Mode, and Dark Mode, accompanied by explicit accessible radio group options.

---

### Milestone 13: Task Comments, Discussions & Attachments (Prompts 2.1 - 2.4) — Completed: September 30, 2026
- **Data Models (`convex/schema.ts`)**:
  - `task_comments`: `taskId`, `workspaceId`, `userId`, `content`, `mentions` array, `reactions` map (`Record<string, string[]>`), `createdAt`, `updatedAt`, `editedBy`, `isDeleted`, `deletedAt`, `deletedBy`.
  - `task_attachments`: `taskId`, `workspaceId`, `uploadedBy`, `fileName`, `fileType`, `fileSize`, `storageKey`, `url`, `description`, `uploadedAt`, `isDeleted`, `deletedAt`.
  - `task_subscribers`: `taskId`, `userId`, `subscribedAt` with compound index `by_taskId_and_userId`.
- **Backend Mutations & Queries (`convex/comments.ts` & `convex/attachments.ts`)**:
  - Comments: `getTaskComments`, `getCommentDetails`, `createComment`, `editComment`, `deleteComment`, `addReaction`, `removeReaction`.
  - File Attachments: `getTaskAttachments`, `getAttachmentDownloadUrl`, `generateUploadUrl`, `uploadAttachment`, `deleteAttachment`.
  - Task Watchers: `subscribeToTask`, `unsubscribeFromTask`, `getTaskSubscribers`, `isTaskSubscribed`.
  - Automated Notifications: Dispatches `@mention` alerts and `task_commented` notifications to task assignees and watchers via `createNotificationHelper`.
  - Audit Trail: Emits `task_commented` and `file_uploaded` events to workspace `activity_feed`.
- **Frontend Components**:
  - `TaskDetailModal.tsx` (`src/components/TaskDetailModal.tsx`): Full-featured task modal containing:
    * Left Panel: Task fields (title, description, status, priority, assignee, story points, due date, Move to Backlog, Delete, Watch/Unwatch toggle with active watcher count).
    * Comments Tab: Real-time thread, avatar chips, relative timestamps, inline editing, soft delete, 6-emoji quick reaction bar with toggle pills, and dynamic `@mention` member autocomplete.
    * Attachments Tab: Drag-and-drop file upload dropzone with upload progress bar, 50MB limit enforcement, file type icons, download links, image lightbox preview, and uploader deletion controls.

---

### Milestone 14: Project Roadmap & Interactive Gantt Timeline (Prompts 3.1 - 3.3) — Completed: September 30, 2026
- **Data Models (`convex/schema.ts`)**:
  - `project_milestones`: `projectId`, `workspaceId`, `name`, `description`, `targetDate`, `status` ("planned" | "on_track" | "at_risk" | "completed"), `linkedSprints` array of sprint IDs, `createdById`, `createdAt`, `updatedAt`.
  - Indexes: `by_projectId`, `by_workspaceId`, `by_targetDate`, `by_status`, and compound index `by_project_and_targetDate`.
- **Backend Mutations & Queries (`convex/milestones.ts`)**:
  - Queries: `getProjectMilestones`, `getMilestoneDetails`, `getMilestoneProgress` (calculating story point completion % across linked sprints), `getUpcomingMilestones` (for dashboard overview widgets).
  - Mutations: `createMilestone`, `updateMilestone`, `linkSprintToMilestone`, `unlinkSprintFromMilestone`, `completeMilestone`, `deleteMilestone`.
  - Audit Trail: Emits milestone lifecycle events (`milestone_created`, `milestone_updated`, `milestone_completed`, `milestone_deleted`) into `activity_feed`.
- **Interactive Roadmap Frontend (`src/pages/ProjectRoadmapPage.tsx`)**:
  - Three distinct perspective views:
    * **Interactive Gantt View**: Hierarchical sprints and tasks, diamond milestone markers, today vertical line, zoom level controls (Day / Week / Month), drag/click item inspection card.
    * **Milestones Card View**: Milestone status indicators, target dates, linked sprint count, calculated progress bars, inline status updates, and milestone deletion.
    * **Table View**: Compact tabular roadmap view with target dates, status badges, progress metrics, and action menus.
  - Controls & Modals:
    * Create/Edit Milestone modal dialog with sprint multiselector and date picker.
    * Print & PDF export capability (`window.print()` with printable layout).
- **Navigation & Routing Integration (`src/App.tsx` & `src/components/layout/Sidebar.tsx`)**:
  - Route `/roadmap` and `/projects/:projectId/roadmap` mounted and routed to `<ProjectRoadmapPage />`.
  - "Roadmap" nav item with `Milestone` icon added to authenticated `Sidebar.tsx`.
- **Dashboard Overview Widgets (`src/pages/DashboardPage.tsx` - Prompt 3.3)**:
  - **Project Roadmap Summary Widget**: Next 3 months upcoming workspace milestones, `[Milestone Name] | [Target Date] | [Status Badge] | [Progress Bar]`, collapsible detail accordion, and 1-click "View Full Roadmap" deep-link.
  - **Upcoming Deadlines Widget**: Sprints ending within 2 weeks, At-Risk warning banner if deliverables are behind velocity, "X sprints ending this week" counter, and 1-click navigation to Sprint Planning.

---

## 4. Key Directory & File Map

```
pmtool/
├── convex/
│   ├── _generated/          # Automatically generated Convex API bindings & types
│   ├── attachments.ts       # Task file attachments & watchers via Convex storage
│   ├── auth.ts              # Authentication & Google SSO mutations
│   ├── comments.ts          # Real-time task discussions, @mentions, and reactions
│   ├── members.ts           # Workspace members & invitation management
│   ├── milestones.ts        # Project milestones, progress rollups & roadmap queries
│   ├── notifications.ts     # Real-time notifications, preferences & activity logging
│   ├── projects.ts          # Project CRUD, filtering, lead assignment
│   ├── roles.ts             # Custom roles & RBAC permissions management
│   ├── schema.ts            # Data models, compound indexes, permissions catalog
│   ├── sprints.ts           # Sprint lifecycle, burndown, capacity, retrospectives
│   ├── tasks.ts             # Task CRUD, status pipeline, backlog/sprint movements
│   └── workspaces.ts        # Workspace lifecycle, metrics, and activity queries
├── prd/
│   ├── page.md              # Original UI requirements
│   ├── prompts1/            # Phase 1 Milestones (Prompts 1 through 9)
│   ├── prompt2/             # Phase 2 Agile Sprints & Tasks (Prompts 1 through 9)
│   ├── Notifications/       # Phase 3 Notifications & Preferences (Prompts 1.1 through 1.5)
│   ├── Comments, Discussions & Task Attachments/ # Phase 4 (Prompts 2.1 through 2.4)
│   └── Project Roadmap & Interactive Gantt Timeline/ # Phase 5 (Prompts 3.1 through 3.3)
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── GoogleAuthButton.tsx     # Google SSO & client ID configuration helper
│   │   │   ├── LoginForm.tsx            # Sign in / sign up form
│   │   │   └── WorkspaceAuthWrapper.tsx # Root RBAC context provider & cache
│   │   ├── landing/                     # Marketing & public landing page sections
│   │   │   ├── CTASection.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── PlatformPreview.tsx
│   │   │   └── Pricing.tsx
│   │   ├── layout/
│   │   │   ├── Breadcrumbs.tsx          # Dynamic hierarchical breadcrumb bar
│   │   │   ├── CreateWorkspaceModal.tsx # Workspace creation dialog
│   │   │   ├── DashboardLayout.tsx      # Main authenticated application shell
│   │   │   ├── NotificationCenter.tsx   # Real-time bell notification drawer & badges
│   │   │   ├── Sidebar.tsx              # Multi-workspace switcher & navigation (Roadmap enabled)
│   │   │   └── Topbar.tsx               # Header search, notifications, profile menu
│   │   ├── projects/
│   │   │   └── CreateProjectModal.tsx   # Project creation & editing modal
│   │   └── ui/
│   │       ├── Button.tsx               # Button primitives (primary, secondary, ghost)
│   │       ├── Card.tsx                 # Elevated container card
│   │       ├── EmptyState.tsx           # Empty state placeholder
│   │       ├── Input.tsx                # Input component with icon slots
│   │       ├── PermissionGate.tsx       # <PermissionGate> & <RoleGate> components
│   │       ├── SprintStatusIndicator.tsx# Sprint status, velocity badge & capacity bar
│   │       └── ThemeToggle.tsx          # 3-state theme toggle (Sun, Monitor, Moon)
│   │   └── TaskDetailModal.tsx          # Dual-panel modal: details, comments, attachments & watchers
│   ├── context/
│   │   └── WorkspaceAuthContext.ts      # useWorkspaceAuth hook & context
│   ├── contexts/
│   │   └── ThemeContext.tsx             # ThemeProvider, useTheme & system detector
│   ├── hooks/
│   │   ├── useCurrentUser.ts           # Session user state & storage sync
│   │   ├── useHasPermission.ts          # Granular permission check hook
│   │   └── useWorkspaceAuth.ts          # Re-export barrel for auth & RBAC
│   ├── pages/
│   │   ├── DashboardPage.tsx           # Sprint KPIs, Roadmap summary widget, deadlines & feed
│   │   ├── LandingPage.tsx             # Public marketing landing page
│   │   ├── LoginPage.tsx               # Auth layout wrapper
│   │   ├── PreferencesPage.tsx         # Notification alerts, delivery & frequencies
│   │   ├── ProfilePage.tsx             # Account settings & password update
│   │   ├── ProjectRoadmapPage.tsx      # Interactive Gantt timeline, Milestones & Table views
│   │   ├── ProjectsPage.tsx            # Project roster, card grid & filters
│   │   ├── SprintHistoryPage.tsx       # Closed sprints, velocity charts & retro
│   │   ├── SprintPlanningPage.tsx      # Backlog-to-sprint capacity planner
│   │   ├── TasksPage.tsx               # Kanban Board & table views with filters
│   │   ├── TeamMembersPage.tsx         # Member roster & 24h invitations
│   │   └── WorkspaceRolesPage.tsx      # Custom roles & permissions console
│   ├── types/
│   │   ├── index.ts                    # Global navigation types
│   │   └── rbac.ts                     # Permissions enum & RBAC interfaces
│   ├── App.tsx                         # Client-side router & route switcher (Roadmap route wired)
│   ├── convexClient.ts                 # Convex client initializer
│   ├── index.css                       # Enterprise design system tokens
│   └── main.tsx                        # Application root entry point
├── .env.local                          # Local environment variables
├── vercel.json                         # Vercel SPA rewrites configuration
├── package.json                        # NPM package specifications
└── vite.config.ts                      # Vite configuration
```

---

## 5. Upcoming Implementation Roadmap (Ideation for Next AI Agent)

Now that Multi-Workspace Isolation, RBAC, Projects, Agile Sprints, Backlogs, Tasks, Dashboard KPI widgets, In-App Notifications & Preferences, Theme Systems, Task Comments & Attachments, and Project Roadmap & Interactive Gantt Timeline are fully built and compiling cleanly, the queued next milestones are:

### Milestone 15: Cloudinary Media & File Upload Storage Integration
- **Goal:** Direct all user uploads (task attachments, member avatars, workspace logos) to Cloudinary CDN for persistent cloud asset storage, automatic image optimization, and fast global delivery.
- **Backend & Cloud Services:**
  - Cloudinary configuration: Configure credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and upload presets) via environment variables.
  - Server-side signature generation in Convex (`convex/cloudinary.ts`) for secure, authenticated direct uploads from client.
  - Update `task_attachments` schema to store Cloudinary `publicId`, `secureUrl`, `format`, `resourceType`, and `bytes`.
  - Fallback / Migration: Seamlessly serve existing attachments while routing all new file additions to Cloudinary.
- **Frontend Enhancements:**
  - `TaskDetailModal.tsx`: Direct-to-Cloudinary drag-and-drop file uploader with chunked upload progress, thumbnail transformations (`w_120,h_120,c_fill`), and image lightbox previews.
  - User Profile & Workspace Settings: Cloudinary avatar upload with automatic smart face crop (`c_thumb,g_face`) and workspace logo optimization.

### Milestone 16: Outbound System Mailer & Email Notifications (Invites & Daily Digests)
- **Goal:** Configure system mailer ID to dispatch transactional workspace invitations, real-time alert emails, and automated daily digest summaries to team members.
- **Backend & Email Service:**
  - Email Provider Setup: Integrate email dispatch engine (e.g., Resend, SendGrid, Amazon SES, or SMTP) configured with system sender ID (e.g., `notifications@omniflow.app` / `support@omniflow.app`) via Convex actions.
  - Workspace Invitation Mailer:
    * Triggered upon inviting a user in `TeamMembersPage.tsx`.
    * Clean, responsive HTML email template featuring workspace name, inviter identity, assigned role, and a secure 24-hour 1-click invitation acceptance link.
  - Daily Digest & Agenda Emails:
    * Scheduled recurring cron job in Convex (`convex/crons.ts`) running daily at the user's preferred time (default 09:00 AM).
    * Summarizes tasks assigned to the user, tasks due today, upcoming sprint deadlines, and unread discussion mentions.
  - Transactional Notification Emails:
    * Dispatches instant email alerts for urgent events (`@mention` in task comments, high-priority task assignments), strictly adhering to user preferences defined in `PreferencesPage.tsx`.

### Milestone 17: CSV / Jira Data Import & Export Engine
- **Goal:** Export project data and import existing boards from Jira/Trello.
- **Frontend & Processing:**
  - CSV export of tasks, sprints, and milestones with date range filtering.
  - JSON workspace backup and restore capabilities.

---

## 6. How to Run, Test & Deploy

```bash
# 1. Install dependencies
npm install

# 2. Run local development server (Vite on http://localhost:5173)
npm run dev

# 3. Deploy functions & schema to Convex Cloud
npx convex dev --once      # Dev deployment (shocking-opossum-923)
npx convex deploy          # Production deployment (graceful-cobra-454)

# 4. Verify lint and TypeScript compilation
npm run lint               # 0 errors, 0 warnings (oxlint)
npm run build              # tsc -b && vite build
```
