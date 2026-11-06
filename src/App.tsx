import { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { TeamMembersPage } from './pages/TeamMembersPage';
import { WorkspaceRolesPage } from './pages/WorkspaceRolesPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SprintPlanningPage } from './pages/SprintPlanningPage';
import { SprintHistoryPage } from './pages/SprintHistoryPage';
import { TasksPage } from './pages/TasksPage';
import { ProjectRoadmapPage } from './pages/ProjectRoadmapPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { WorkspaceSettingsPage } from './pages/WorkspaceSettingsPage';
import { WorkspaceAuthWrapper } from './components/auth/WorkspaceAuthWrapper';

export function App() {
  const getInitialRoute = (): string => {
    const path = window.location.pathname;
    if (
      path === '/login' ||
      path === '/dashboard' ||
      path === '/profile' ||
      path === '/preferences' ||
      path.startsWith('/settings') ||
      path.startsWith('/workspace/') ||
      path === '/teams' ||
      path === '/roles' ||
      path === '/projects' ||
      path === '/tasks' ||
      path === '/roadmap' ||
      path.includes('/roadmap') ||
      path.startsWith('/projects/') ||
      path.startsWith('/sprints/') ||
      path.startsWith('/tasks/')
    ) {
      return path;
    }
    return '/';
  };

  const [currentRoute, setCurrentRoute] = useState<string>(getInitialRoute());
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getInitialRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: string, mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setCurrentRoute(route);
    window.history.pushState({}, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper for Sprint History route
  const isSprintHistoryRoute = currentRoute.includes('/sprints/history') || currentRoute.includes('/history');

  let sprintHistoryProjectId: string | undefined;
  if (isSprintHistoryRoute) {
    const match = currentRoute.match(/\/projects\/([^/]+)\/sprints\/history/);
    if (match) {
      sprintHistoryProjectId = match[1];
    }
  }

  // Helper for Sprint Planning route
  const isSprintPlanningRoute =
    !isSprintHistoryRoute &&
    (currentRoute.includes('/sprints/planning') ||
      currentRoute.includes('/sprints') ||
      currentRoute.includes('/planning'));

  let sprintProjectId: string | undefined;
  if (isSprintPlanningRoute) {
    const match = currentRoute.match(/\/projects\/([^/]+)\/sprints/);
    if (match) {
      sprintProjectId = match[1];
    }
  }

  // Helper for Tasks Kanban route
  const isTasksRoute =
    currentRoute === '/tasks' ||
    currentRoute.endsWith('/tasks') ||
    currentRoute.includes('/tasks/');

  let tasksProjectId: string | undefined;
  if (isTasksRoute) {
    const match = currentRoute.match(/\/projects\/([^/]+)\/tasks/);
    if (match) {
      tasksProjectId = match[1];
    }
  }

  // Helper for Roadmap route
  const isRoadmapRoute =
    currentRoute === '/roadmap' ||
    currentRoute.includes('/roadmap');

  let roadmapProjectId: string | undefined;
  if (isRoadmapRoute) {
    const match = currentRoute.match(/\/projects\/([^/]+)\/roadmap/);
    if (match) {
      roadmapProjectId = match[1];
    }
  }

  // Helper for Workspace Settings route
  const isWorkspaceSettingsRoute =
    currentRoute === '/settings/workspace' ||
    currentRoute === '/workspace/settings' ||
    (currentRoute.startsWith('/workspace/') && currentRoute.endsWith('/settings'));

  let workspaceSettingsId: string | undefined;
  if (isWorkspaceSettingsRoute) {
    const match = currentRoute.match(/\/workspace\/([^/]+)\/settings/);
    if (match) {
      workspaceSettingsId = match[1];
    }
  }

  return (
    <WorkspaceAuthWrapper>
      <div style={{ minHeight: '100vh', width: '100%' }}>
        {currentRoute === '/login' ? (
          <LoginPage onNavigate={navigate} initialMode={authMode} />
        ) : currentRoute === '/dashboard' ? (
          <DashboardPage onNavigate={navigate} />
        ) : currentRoute === '/profile' ? (
          <ProfilePage onNavigate={navigate} />
        ) : isWorkspaceSettingsRoute ? (
          <WorkspaceSettingsPage onNavigate={navigate} workspaceId={workspaceSettingsId} />
        ) : currentRoute === '/preferences' || currentRoute.startsWith('/settings') ? (
          <PreferencesPage onNavigate={navigate} />
        ) : currentRoute === '/teams' ? (
          <TeamMembersPage onNavigate={navigate} />
        ) : currentRoute === '/roles' ? (
          <WorkspaceRolesPage onNavigate={navigate} />
        ) : isSprintHistoryRoute ? (
          <SprintHistoryPage onNavigate={navigate} projectId={sprintHistoryProjectId} />
        ) : isSprintPlanningRoute ? (
          <SprintPlanningPage onNavigate={navigate} projectId={sprintProjectId} />
        ) : isTasksRoute ? (
          <TasksPage onNavigate={navigate} projectId={tasksProjectId} />
        ) : isRoadmapRoute ? (
          <ProjectRoadmapPage onNavigate={navigate} projectId={roadmapProjectId} />
        ) : currentRoute === '/projects' ? (
          <ProjectsPage onNavigate={navigate} />
        ) : (
          <LandingPage onNavigate={navigate} />
        )}
      </div>
    </WorkspaceAuthWrapper>
  );
}

export default App;
