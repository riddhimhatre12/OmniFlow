import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  CheckSquare,
  CheckCircle2,
  Users2,
  Clock,
  AlertCircle,
  Building,
  RotateCw,
  ChevronDown,
  Plus,
  Activity,
  ArrowRight,
  TrendingUp,
  Target,
  Flame,
  Sparkles,
  Calendar,
  AlertTriangle,
  X,
  Milestone,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useWorkspaceAuth } from '../hooks/useWorkspaceAuth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { CreateWorkspaceModal } from '../components/layout/CreateWorkspaceModal';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';

interface DashboardPageProps {
  onNavigate: (route: string) => void;
}

interface KPICardConfig {
  id: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  iconBg: string;
  trendText: string;
  trendPositive: boolean;
  route: string;
  description: string;
}

/**
 * Format timestamp into relative human-readable string:
 */
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diff < 60000) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Calculate velocity status indicator: "On track" (green) | "Behind" (orange) | "Critical" (red)
 */
function calculateVelocityStatus(
  totalPoints: number,
  completedPoints: number,
  startDate?: number,
  endDate?: number
): { status: 'on_track' | 'behind' | 'critical'; label: string; color: string; bg: string; border: string } {
  const now = Date.now();
  const defaultDuration = 14 * 24 * 60 * 60 * 1000;
  const start = startDate || now - defaultDuration / 2;
  const end = endDate || start + defaultDuration;

  const totalDuration = Math.max(1, end - start);
  const elapsed = Math.max(0, Math.min(totalDuration, now - start));
  const timeProgress = Math.round((elapsed / totalDuration) * 100);

  const pointsProgress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
  const diff = pointsProgress - timeProgress;

  if (diff < -20 || (now > end && pointsProgress < 100)) {
    return {
      status: 'critical',
      label: 'Critical',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
    };
  }
  if (diff < -5) {
    return {
      status: 'behind',
      label: 'Behind',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
    };
  }
  return {
    status: 'on_track',
    label: 'On track',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  };
}

/**
 * Format sprint date range
 */
function formatSprintDateRange(startDate?: number, endDate?: number): string {
  if (!startDate && !endDate) return 'Dates not set';
  const startStr = startDate
    ? new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Start';
  const endStr = endDate
    ? new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'End';
  return `${startStr} – ${endStr}`;
}

/**
 * Format days remaining
 */
function formatDaysRemaining(endDate?: number): { text: string; isOverdue: boolean } {
  if (!endDate) return { text: 'No end date', isOverdue: false };
  const now = Date.now();
  const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true };
  }
  if (diffDays === 0) {
    return { text: 'Ends today', isOverdue: false };
  }
  if (diffDays === 1) {
    return { text: '1 day remaining', isOverdue: false };
  }
  return { text: `${diffDays} days remaining`, isOverdue: false };
}

/**
 * Avatar background colors
 */
const AVATAR_COLORS = [
  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' },
];

const DashboardContent: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Agile sprint states
  const [userSelectedProjectId, setUserSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [isCloseSprintModalOpen, setIsCloseSprintModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isClosingSprint, setIsClosingSprint] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hoveredVelocityBar, setHoveredVelocityBar] = useState<number | null>(null);
  const [currentTime] = useState(() => Date.now());

  const { workspace, userRole, canCreateProject, switchWorkspace, isAdmin, isOwner } = useWorkspaceAuth();
  const { user } = useCurrentUser();

  // Close sprint mutation
  const closeSprintMutation = useMutation(api.sprints.closeSprint);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 1. Fetch available workspaces
  const userWorkspaces = useQuery(
    api.workspaces.listUserWorkspaces,
    user.userId ? { userId: user.userId as Id<"users"> } : "skip"
  );

  // 2. Fetch workspace stats
  const workspaceStats = useQuery(
    api.workspaces.getWorkspaceStats,
    workspace
      ? {
          workspaceId: workspace.id as Id<"workspaces">,
          userId: user.userId ? (user.userId as Id<"users">) : undefined,
        }
      : "skip"
  );

  // 3. Fetch workspace members
  const workspaceMembers = useQuery(
    api.members.getWorkspaceMembers,
    workspace ? { workspaceId: workspace.id as Id<"workspaces"> } : "skip"
  );

  // 4. Fetch workspace activities
  const workspaceActivities = useQuery(
    api.workspaces.getWorkspaceActivities,
    workspace ? { workspaceId: workspace.id as Id<"workspaces"> } : "skip"
  );

  // 5. Fetch workspace projects
  const workspaceProjects = useQuery(
    api.projects.getWorkspaceProjects,
    workspace
      ? {
          workspaceId: workspace.id as Id<"workspaces">,
          userId: user.userId ? (user.userId as Id<"users">) : undefined,
        }
      : "skip"
  );

  // Derive selected project cleanly without cascading effect setState
  const selectedProjectId = useMemo(() => {
    if (userSelectedProjectId) {
      const exists = workspaceProjects?.some((p) => p.id === userSelectedProjectId);
      if (exists) return userSelectedProjectId;
    }
    return (workspaceProjects?.[0]?.id as Id<"projects">) || null;
  }, [userSelectedProjectId, workspaceProjects]);

  // 6. SPRINT QUERIES (Prompt 6)
  // Active sprint for selected project
  const activeSprint = useQuery(
    api.sprints.getActiveSprint,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  // Tasks in active sprint (grouped by status)
  const sprintTasks = useQuery(
    api.sprints.getSprintTasks,
    activeSprint?._id ? { sprintId: activeSprint._id } : "skip"
  );

  // Burndown chart data for active sprint
  const sprintBurndown = useQuery(
    api.sprints.getSprintBurndown,
    activeSprint?._id ? { sprintId: activeSprint._id } : "skip"
  );

  // All project sprints (including closed) for velocity history
  const projectSprints = useQuery(
    api.sprints.getProjectSprints,
    selectedProjectId ? { projectId: selectedProjectId, includeArchived: true } : "skip"
  );

  // Upcoming Milestones across workspace (next 3 months)
  const upcomingMilestones = useQuery(
    api.milestones.getUpcomingMilestones,
    workspace ? { workspaceId: workspace.id as Id<"workspaces">, limit: 10 } : "skip"
  );
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);

  const isLoadingKPIs = workspace && (workspaceStats === undefined || isRefreshing);
  const isLoadingActivities = workspace && (workspaceActivities === undefined || isRefreshing);
  const isLoadingMembers = workspace && (workspaceMembers === undefined || isRefreshing);
  const isLoadingSprint = workspace && (activeSprint === undefined || isRefreshing);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setQueryError(null);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Safe navigation helper
  const handleNavigate = (route: string) => {
    const target = route.startsWith('/') ? route : `/${route}`;
    onNavigate(target);
  };

  // Real member count
  const realMemberCount = workspaceMembers ? workspaceMembers.length : (workspaceStats?.teamMembers ?? 0);

  // Current selected project object
  const currentProject = useMemo(() => {
    if (!workspaceProjects || !selectedProjectId) return null;
    return workspaceProjects.find((p) => p.id === selectedProjectId) || null;
  }, [workspaceProjects, selectedProjectId]);

  // Closed sprints for Velocity Chart (last 5)
  const closedSprints = useMemo(() => {
    if (!projectSprints) return [];
    return projectSprints
      .filter((s) => s.status === 'closed')
      .sort((a, b) => (a.endDate || a.createdAt) - (b.endDate || b.createdAt))
      .slice(-5);
  }, [projectSprints]);

  // Average velocity
  const averageVelocity = useMemo(() => {
    if (!closedSprints || closedSprints.length === 0) return 0;
    const total = closedSprints.reduce((sum, s) => sum + (s.completedPoints || 0), 0);
    return Math.round(total / closedSprints.length);
  }, [closedSprints]);

  // Flatten active sprint tasks
  const allSprintTasksList = useMemo(() => {
    if (!sprintTasks) return [];
    return [
      ...(sprintTasks.todo || []),
      ...(sprintTasks.in_progress || []),
      ...(sprintTasks.in_review || []),
      ...(sprintTasks.done || []),
    ];
  }, [sprintTasks]);

  // Team Workload calculation
  const teamWorkload = useMemo(() => {
    if (!allSprintTasksList.length) return [];
    const map = new Map<string, {
      id: string;
      name: string;
      avatar?: string;
      email?: string;
      taskCount: number;
      storyPoints: number;
      completedTasks: number;
      completedPoints: number;
    }>();

    for (const task of allSprintTasksList) {
      const key = task.assignee?.id || 'unassigned';
      const name = task.assignee?.name || 'Unassigned';
      const avatar = task.assignee?.avatar;
      const email = task.assignee?.email;

      const current = map.get(key) || {
        id: key,
        name,
        avatar,
        email,
        taskCount: 0,
        storyPoints: 0,
        completedTasks: 0,
        completedPoints: 0,
      };

      current.taskCount += 1;
      current.storyPoints += task.storyPoints || 0;
      if (task.status === 'done') {
        current.completedTasks += 1;
        current.completedPoints += task.storyPoints || 0;
      }

      map.set(key, current);
    }

    // Sort by story points descending, then taskCount
    return Array.from(map.values()).sort((a, b) => {
      if (b.storyPoints !== a.storyPoints) return b.storyPoints - a.storyPoints;
      return b.taskCount - a.taskCount;
    });
  }, [allSprintTasksList]);

  // Upcoming deadlines in active sprint (next 7 days or overdue)
  const upcomingDeadlines = useMemo(() => {
    if (!allSprintTasksList.length) return [];
    const now = currentTime;
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

    return allSprintTasksList
      .filter((task) => task.dueDate && task.status !== 'done' && task.dueDate <= sevenDaysFromNow)
      .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
      .slice(0, 6);
  }, [allSprintTasksList, currentTime]);

  // Sprints ending in the next 2 weeks (for Upcoming Deadlines Widget)
  const upcomingSprintDeadlines = useMemo(() => {
    if (!projectSprints) return [];
    const now = currentTime;
    const twoWeeksFromNow = now + 14 * 24 * 60 * 60 * 1000;
    return projectSprints
      .filter((s) => s.status !== 'closed' && s.endDate && s.endDate >= now - 24 * 60 * 60 * 1000 && s.endDate <= twoWeeksFromNow)
      .sort((a, b) => (a.endDate || 0) - (b.endDate || 0));
  }, [projectSprints, currentTime]);

  const sprintsEndingThisWeek = useMemo(() => {
    const now = currentTime;
    const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;
    return upcomingSprintDeadlines.filter((s) => s.endDate && s.endDate <= oneWeekFromNow);
  }, [upcomingSprintDeadlines, currentTime]);

  const atRiskSprints = useMemo(() => {
    return upcomingSprintDeadlines.filter((s) => {
      const vel = calculateVelocityStatus(s.totalPoints || 0, s.completedPoints || 0, s.startDate, s.endDate);
      return vel.status === 'behind' || vel.status === 'critical';
    });
  }, [upcomingSprintDeadlines]);

  // Velocity status for Active Sprint Card
  const velocityIndicator = useMemo(() => {
    if (!activeSprint) return null;
    return calculateVelocityStatus(
      activeSprint.totalPoints || 0,
      activeSprint.completedPoints || 0,
      activeSprint.startDate,
      activeSprint.endDate
    );
  }, [activeSprint]);

  // Days remaining calculation
  const sprintDaysRemaining = useMemo(() => {
    if (!activeSprint) return { text: '', isOverdue: false };
    return formatDaysRemaining(activeSprint.endDate);
  }, [activeSprint]);

  // Admin permission check to close sprint
  const canCloseSprint = isAdmin || isOwner || userRole?.name === 'Owner' || userRole?.name === 'Admin';

  // Handle closing active sprint
  const handleConfirmCloseSprint = async () => {
    if (!activeSprint || !user.userId) return;
    setIsClosingSprint(true);
    try {
      await closeSprintMutation({
        sprintId: activeSprint._id,
        userId: user.userId as Id<"users">,
      });
      setToastMessage({ type: 'success', text: `Sprint "${activeSprint.name}" closed successfully.` });
      setIsCloseSprintModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to close sprint.';
      setToastMessage({ type: 'error', text: msg });
    } finally {
      setIsClosingSprint(false);
    }
  };

  // 6 KPI Cards
  const kpiCards: KPICardConfig[] = [
    {
      id: 'projects',
      label: 'Total Projects',
      count: workspaceStats?.totalProjects ?? 0,
      icon: <FolderKanban size={18} color="var(--primary)" />,
      iconBg: 'var(--primary-light)',
      trendText: '+0 this month',
      trendPositive: true,
      route: '/projects',
      description: 'Workspace projects portfolio',
    },
    {
      id: 'active_tasks',
      label: 'Active Tasks',
      count: workspaceStats?.activeTasks ?? 0,
      icon: <CheckSquare size={18} color="#059669" />,
      iconBg: '#ecfdf5',
      trendText: '+3 this week',
      trendPositive: true,
      route: '/tasks',
      description: 'Assigned items in progress',
    },
    {
      id: 'completed_tasks',
      label: 'Completed Tasks',
      count: workspaceStats?.completedTasksThisMonth ?? 0,
      icon: <CheckCircle2 size={18} color="#0284c7" />,
      iconBg: '#f0f9ff',
      trendText: '+12% vs last mo',
      trendPositive: true,
      route: '/tasks',
      description: 'Resolved this calendar month',
    },
    {
      id: 'team_members',
      label: 'Team Members',
      count: realMemberCount,
      icon: <Users2 size={18} color="#7c3aed" />,
      iconBg: '#f5f3ff',
      trendText: `+${realMemberCount} active`,
      trendPositive: true,
      route: '/teams',
      description: 'Active workspace collaborators',
    },
    {
      id: 'overdue_tasks',
      label: 'Overdue Tasks',
      count: workspaceStats?.overdueTasks ?? 0,
      icon: <AlertCircle size={18} color="#dc2626" />,
      iconBg: '#fef2f2',
      trendText: '0 overdue',
      trendPositive: true,
      route: '/tasks',
      description: 'Items past target deadline',
    },
    {
      id: 'unstarted_projects',
      label: 'Unstarted Projects',
      count: workspaceStats?.unstartedProjects ?? 0,
      icon: <Clock size={18} color="#d97706" />,
      iconBg: '#fffbeb',
      trendText: 'In backlog',
      trendPositive: false,
      route: '/projects',
      description: 'Planned initiatives queued',
    },
  ];

  const recentMembers = workspaceMembers ? workspaceMembers.slice(0, 4) : [];
  const extraMembersCount = workspaceMembers && workspaceMembers.length > 4 ? workspaceMembers.length - 4 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* TOAST ALERT NOTIFICATION */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: toastMessage.type === 'success' ? '#065f46' : '#991b1b',
            color: 'white',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '13px',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              marginLeft: '8px',
              opacity: 0.8,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. WORKSPACE CONTEXT HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--slate-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: workspace?.avatar && !workspace.avatar.startsWith('http')
                ? workspace.avatar
                : 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '16px',
              boxShadow: 'var(--shadow-xs)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {workspace?.avatar && workspace.avatar.startsWith('http') ? (
              <img
                src={workspace.avatar}
                alt={workspace.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span>
                {workspace?.name
                  ? workspace.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'WS'}
              </span>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-500)' }}>
                You're in:
              </span>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '-0.4px',
                  color: 'var(--slate-950)',
                  lineHeight: 1.2,
                }}
              >
                {workspace?.name || 'No Workspace Selected'}
              </h1>

              {userRole && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--primary-border)',
                  }}
                >
                  {userRole.name}
                </span>
              )}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
              {workspace
                ? `Workspace slug: omni.app/${workspace.slug} · Real-time Agile synchronization active`
                : 'Select or create a workspace to view live analytics and projects'}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={!workspace || isRefreshing}
            icon={
              <RotateCw
                size={14}
                style={{
                  animation: isRefreshing ? 'spin 0.7s linear infinite' : 'none',
                }}
              />
            }
            title="Re-fetch workspace metrics"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          {/* Workspace Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--white)',
                border: '1px solid var(--slate-300)',
                color: 'var(--slate-800)',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--slate-400)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--slate-300)')}
            >
              <Building size={15} color="var(--primary)" />
              <span>Switch Workspace</span>
              <ChevronDown size={14} color="var(--slate-400)" />
            </button>

            {workspaceMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '270px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '8px',
                  zIndex: 30,
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--slate-400)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '6px 8px',
                  }}
                >
                  Your Workspaces
                </div>

                {userWorkspaces && userWorkspaces.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                    }}
                  >
                    {userWorkspaces.map((ws) => (
                      <button
                        key={ws.workspaceId}
                        onClick={() => {
                          switchWorkspace(ws.workspaceId);
                          setWorkspaceMenuOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-xs)',
                          border: 'none',
                          backgroundColor:
                            ws.workspaceId === workspace?.id ? 'var(--slate-100)' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: ws.workspaceId === workspace?.id ? 700 : 500,
                              color: 'var(--slate-900)',
                            }}
                          >
                            {ws.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                            {ws.memberRole} · {ws.memberCount} member
                            {ws.memberCount === 1 ? '' : 's'}
                          </div>
                        </div>
                        {ws.workspaceId === workspace?.id && (
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--primary)',
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '12px 8px',
                      fontSize: '12px',
                      color: 'var(--slate-500)',
                      fontStyle: 'italic',
                      textAlign: 'center',
                    }}
                  >
                    No workspaces found
                  </div>
                )}

                <div
                  style={{
                    borderTop: '1px solid var(--slate-150)',
                    margin: '6px 0 4px 0',
                    paddingTop: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Plus size={14} />
                    <span>Create new workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ERROR ALERT */}
      {queryError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--danger-light)',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--danger)',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{queryError}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            filter: !workspace ? 'blur(6px)' : 'none',
            opacity: !workspace ? 0.45 : 1,
            pointerEvents: !workspace ? 'none' : 'auto',
            userSelect: !workspace ? 'none' : 'auto',
            transition: 'all 0.25s ease',
          }}
        >
          {/* ========================================================================= */}
          {/* SECTION A: AGILE SPRINT COCKPIT (Prompt 6 Requirements)                  */}
          {/* ========================================================================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* SPRINT BAR HEADER & PROJECT SELECTOR */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                  }}
                >
                  <Target size={16} />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: 'var(--slate-900)',
                      letterSpacing: '-0.3px',
                      lineHeight: 1.2,
                    }}
                  >
                    Agile Sprint Cockpit
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                    Real-time sprint progress, team workload & burn-down tracking
                  </span>
                </div>
              </div>

              {/* Project selector dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {workspaceProjects && workspaceProjects.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-500)' }}>
                      Project:
                    </span>
                    <select
                      value={selectedProjectId || ''}
                      onChange={(e) => setUserSelectedProjectId(e.target.value as Id<"projects">)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--slate-300)',
                        backgroundColor: 'var(--white)',
                        color: 'var(--slate-800)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      {workspaceProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedProjectId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigate(`/projects/${selectedProjectId}/sprints/planning`)}
                    icon={<ArrowRight size={13} />}
                  >
                    Sprint Planning
                  </Button>
                )}
              </div>
            </div>

            {/* 1. ACTIVE SPRINT CARD (PROMINENT, TOP OF PAGE) */}
            {isLoadingSprint ? (
              /* Loading Skeleton */
              <Card padding="lg">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="skeleton-shimmer" style={{ width: '220px', height: '28px', borderRadius: '4px' }} />
                    <div className="skeleton-shimmer" style={{ width: '120px', height: '28px', borderRadius: '4px' }} />
                  </div>
                  <div className="skeleton-shimmer" style={{ width: '100%', height: '14px', borderRadius: '6px' }} />
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div className="skeleton-shimmer" style={{ flex: 1, height: '48px', borderRadius: '8px' }} />
                    <div className="skeleton-shimmer" style={{ flex: 1, height: '48px', borderRadius: '8px' }} />
                    <div className="skeleton-shimmer" style={{ flex: 1, height: '48px', borderRadius: '8px' }} />
                  </div>
                </div>
              </Card>
            ) : activeSprint ? (
              /* Active Sprint Card */
              <Card
                padding="lg"
                style={{
                  border: '1px solid var(--primary-border)',
                  backgroundColor: 'var(--white)',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Accent top gradient bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, var(--primary) 0%, #06b6d4 100%)',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Top row: Sprint Title, Dates, Days Remaining, Velocity Indicator, Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#059669',
                              animation: 'pulse 1.8s infinite',
                            }}
                          />
                          Active Sprint
                        </span>

                        <h3
                          style={{
                            fontSize: '20px',
                            fontWeight: 800,
                            color: 'var(--slate-950)',
                            letterSpacing: '-0.3px',
                            lineHeight: 1.2,
                          }}
                        >
                          {activeSprint.name}
                        </h3>

                        {currentProject && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--slate-600)',
                              backgroundColor: 'var(--slate-100)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-xs)',
                            }}
                          >
                            {currentProject.name}
                          </span>
                        )}
                      </div>

                      {activeSprint.goal && (
                        <p
                          style={{
                            fontSize: '13px',
                            color: 'var(--slate-600)',
                            marginTop: '6px',
                            fontStyle: 'italic',
                          }}
                        >
                          "{activeSprint.goal}"
                        </p>
                      )}

                      {/* Dates and Days remaining */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '8px',
                          fontSize: '12px',
                          color: 'var(--slate-500)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} color="var(--slate-400)" />
                          {formatSprintDateRange(activeSprint.startDate, activeSprint.endDate)}
                        </span>

                        <span>•</span>

                        <span
                          style={{
                            fontWeight: 700,
                            color: sprintDaysRemaining.isOverdue ? '#dc2626' : 'var(--slate-700)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={13} color={sprintDaysRemaining.isOverdue ? '#dc2626' : 'var(--slate-400)'} />
                          {sprintDaysRemaining.text}
                        </span>

                        {velocityIndicator && (
                          <>
                            <span>•</span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: velocityIndicator.bg,
                                color: velocityIndicator.color,
                                border: `1px solid ${velocityIndicator.border}`,
                              }}
                            >
                              <Flame size={12} />
                              {velocityIndicator.label}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleNavigate(`/projects/${selectedProjectId}/tasks`)}
                        icon={<CheckSquare size={14} />}
                      >
                        Kanban Board
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleNavigate(`/projects/${selectedProjectId}/sprints/planning`)}
                        icon={<ArrowRight size={14} />}
                      >
                        View Sprint
                      </Button>

                      {canCloseSprint && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setIsCloseSprintModalOpen(true)}
                          icon={<CheckCircle2 size={14} />}
                          title="Close this sprint and archive metrics"
                        >
                          Close Sprint
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Capacity Bar & Metrics */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--slate-50)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--slate-150)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>Capacity Progress:</span>
                        <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                          {activeSprint.completedPoints || 0} / {activeSprint.totalPoints || activeSprint.capacity || 0} pts
                        </span>
                        {activeSprint.capacity && activeSprint.capacity > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                            (Target: {activeSprint.capacity} pts)
                          </span>
                        )}
                      </div>

                      <span style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '14px' }}>
                        {activeSprint.progress || 0}%
                      </span>
                    </div>

                    {/* Styled Capacity Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: '10px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--slate-200)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, activeSprint.progress || 0)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--primary) 0%, #06b6d4 100%)',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </div>

                    {/* Quick Stats: X tasks done, Y in progress, Z todo */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        paddingTop: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#059669',
                            }}
                          />
                          <span style={{ color: 'var(--slate-600)' }}>Done:</span>
                          <strong style={{ color: '#059669' }}>
                            {sprintTasks?.done?.length ?? activeSprint.completedCount ?? 0}
                          </strong>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#2563eb',
                            }}
                          />
                          <span style={{ color: 'var(--slate-600)' }}>In Progress:</span>
                          <strong style={{ color: '#2563eb' }}>
                            {sprintTasks?.in_progress?.length ?? 0}
                          </strong>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#7c3aed',
                            }}
                          />
                          <span style={{ color: 'var(--slate-600)' }}>In Review:</span>
                          <strong style={{ color: '#7c3aed' }}>
                            {sprintTasks?.in_review?.length ?? 0}
                          </strong>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--slate-400)',
                            }}
                          />
                          <span style={{ color: 'var(--slate-600)' }}>To Do:</span>
                          <strong style={{ color: 'var(--slate-700)' }}>
                            {sprintTasks?.todo?.length ?? 0}
                          </strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                        Total sprint items: <strong>{activeSprint.taskCount || 0} tasks</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              /* No Active Sprint Empty State */
              <Card padding="lg">
                <EmptyState
                  compact
                  icon={<Target size={28} color="var(--primary)" />}
                  title="No active sprint"
                  description="There is currently no active sprint running for this project. Launch a sprint during planning to unlock live burndown curves, workload analysis, and team velocity metrics."
                  actionLabel={selectedProjectId ? "Start Sprint Planning" : undefined}
                  onAction={
                    selectedProjectId
                      ? () => handleNavigate(`/projects/${selectedProjectId}/sprints/planning`)
                      : undefined
                  }
                />
              </Card>
            )}

            {/* SPRINT SUB-GRID: Burndown / Velocity / Workload / Deadlines */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                gap: '20px',
              }}
            >
              {/* 5. SPRINT PROGRESS MINI-CHART / BURNDOWN */}
              <Card padding="lg">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>
                      Sprint Burndown
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                      {sprintBurndown
                        ? `Day ${sprintBurndown.daysElapsed} of ${sprintBurndown.totalDays} · ${sprintBurndown.pointsRemaining} pts remaining`
                        : 'Story point trajectory vs ideal curve'}
                    </span>
                  </div>

                  {activeSprint && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--primary-subtle)',
                        color: 'var(--primary)',
                      }}
                    >
                      {sprintBurndown ? `${sprintBurndown.completionPercentage}% Done` : 'Active'}
                    </span>
                  )}
                </div>

                {activeSprint && sprintBurndown ? (
                  <div>
                    {/* Metrics callout */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: 'var(--slate-50)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '14px',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--slate-500)' }}>Progress: </span>
                        <strong style={{ color: 'var(--slate-900)' }}>
                          {sprintBurndown.completedStoryPoints} / {sprintBurndown.totalStoryPoints} pts
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--slate-500)' }}>Timeline: </span>
                        <strong style={{ color: 'var(--slate-900)' }}>
                          Day {sprintBurndown.daysElapsed} of {sprintBurndown.totalDays}
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--slate-500)' }}>Remaining: </span>
                        <strong style={{ color: '#dc2626' }}>
                          {sprintBurndown.pointsRemaining} pts
                        </strong>
                      </div>
                    </div>

                    {/* Burndown SVG Chart */}
                    <div style={{ width: '100%', height: '140px' }}>
                      {(() => {
                        const totalDays = Math.max(1, sprintBurndown.totalDays);
                        const maxPoints = Math.max(1, sprintBurndown.totalStoryPoints || 10);
                        const width = 340;
                        const height = 110;
                        const padL = 30;
                        const padT = 15;

                        const idealStartX = padL;
                        const idealStartY = padT;
                        const idealEndX = padL + width;
                        const idealEndY = padT + height;

                        // Actual points coordinates
                        const timeline = sprintBurndown.timeline || [];
                        const actualPoints = timeline.filter((t) => t.pointsRemaining !== null);

                        let actualPolyline = '';
                        let areaPath = '';

                        if (actualPoints.length > 0) {
                          const coords = actualPoints.map((pt) => {
                            const x = padL + (pt.day / totalDays) * width;
                            const y = padT + (1 - pt.pointsRemaining! / maxPoints) * height;
                            return { x, y };
                          });

                          actualPolyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
                          areaPath = `M ${coords[0].x},${padT + height} ` +
                            coords.map((c) => `L ${c.x},${c.y}`).join(' ') +
                            ` L ${coords[coords.length - 1].x},${padT + height} Z`;
                        }

                        return (
                          <svg viewBox="0 0 400 145" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                            <defs>
                              <linearGradient id="burndownGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                              </linearGradient>
                            </defs>

                            {/* Gridlines */}
                            <line x1={padL} y1={padT} x2={padL + width} y2={padT} stroke="var(--slate-200)" strokeDasharray="3 3" />
                            <line x1={padL} y1={padT + height / 2} x2={padL + width} y2={padT + height / 2} stroke="var(--slate-200)" strokeDasharray="3 3" />
                            <line x1={padL} y1={padT + height} x2={padL + width} y2={padT + height} stroke="var(--slate-300)" />

                            {/* Y-axis labels */}
                            <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="10" fill="var(--slate-400)">
                              {maxPoints}
                            </text>
                            <text x={padL - 6} y={padT + height + 3} textAnchor="end" fontSize="10" fill="var(--slate-400)">
                              0
                            </text>

                            {/* Ideal Burndown line (gray dotted) */}
                            <line
                              x1={idealStartX}
                              y1={idealStartY}
                              x2={idealEndX}
                              y2={idealEndY}
                              stroke="#94a3b8"
                              strokeWidth="2"
                              strokeDasharray="4 4"
                            />

                            {/* Actual Burndown area */}
                            {areaPath && <path d={areaPath} fill="url(#burndownGrad)" />}

                            {/* Actual Burndown polyline */}
                            {actualPolyline && (
                              <polyline
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={actualPolyline}
                              />
                            )}

                            {/* Markers on actual points */}
                            {actualPoints.map((pt) => {
                              const x = padL + (pt.day / totalDays) * width;
                              const y = padT + (1 - pt.pointsRemaining! / maxPoints) * height;
                              return (
                                <g key={pt.day}>
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r="4"
                                    fill="#2563eb"
                                    stroke="white"
                                    strokeWidth="1.5"
                                  />
                                </g>
                              );
                            })}

                            {/* X-axis labels */}
                            <text x={padL} y={padT + height + 16} textAnchor="start" fontSize="10" fill="var(--slate-400)">
                              Day 0
                            </text>
                            <text x={padL + width / 2} y={padT + height + 16} textAnchor="middle" fontSize="10" fill="var(--slate-400)">
                              Day {Math.round(totalDays / 2)}
                            </text>
                            <text x={padL + width} y={padT + height + 16} textAnchor="end" fontSize="10" fill="var(--slate-400)">
                              Day {totalDays}
                            </text>
                          </svg>
                        );
                      })()}
                    </div>

                    {/* Chart Legend */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '18px',
                        marginTop: '10px',
                        fontSize: '11px',
                        color: 'var(--slate-500)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '12px', height: '2px', backgroundColor: '#94a3b8', borderTop: '2px dashed #94a3b8' }} />
                        <span>Ideal Burndown</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '12px', height: '3px', backgroundColor: '#2563eb', borderRadius: '1px' }} />
                        <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>Actual Progress</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon={<TrendingUp size={22} />}
                    title="Burndown data unavailable"
                    description="Activate a sprint with tasks to generate a live burndown trajectory."
                  />
                )}
              </Card>

              {/* 2. SPRINT VELOCITY CHART (if >= 2 closed sprints) */}
              <Card padding="lg">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>
                      Sprint Velocity
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                      Completed story points over last {closedSprints.length || 0} sprints
                    </span>
                  </div>

                  {closedSprints.length >= 2 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#ecfdf5',
                        color: '#059669',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      <Sparkles size={12} />
                      <span>Avg: {averageVelocity} pts</span>
                    </div>
                  )}
                </div>

                {closedSprints.length >= 2 ? (
                  <div>
                    {/* SVG Velocity Bar & Trend Chart */}
                    <div style={{ width: '100%', height: '145px', position: 'relative' }}>
                      {(() => {
                        const maxVal = Math.max(1, ...closedSprints.map((s) => s.completedPoints || 1));
                        const chartW = 330;
                        const chartH = 100;
                        const padL = 32;
                        const padT = 16;
                        const numBars = closedSprints.length;
                        const barGap = chartW / numBars;
                        const barWidth = Math.min(36, barGap * 0.55);

                        const trendPoints = closedSprints.map((s, idx) => {
                          const pts = s.completedPoints || 0;
                          const cx = padL + idx * barGap + barGap / 2;
                          const cy = padT + (1 - pts / maxVal) * chartH;
                          return { cx, cy, pts, name: s.name };
                        });

                        const trendPolyline = trendPoints.map((p) => `${p.cx},${p.cy}`).join(' ');

                        return (
                          <svg viewBox="0 0 390 150" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                            <defs>
                              <linearGradient id="velocityBarGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4f46e5" />
                                <stop offset="100%" stopColor="#818cf8" />
                              </linearGradient>
                            </defs>

                            {/* Average line */}
                            {averageVelocity > 0 && (
                              <g>
                                <line
                                  x1={padL}
                                  y1={padT + (1 - averageVelocity / maxVal) * chartH}
                                  x2={padL + chartW}
                                  y2={padT + (1 - averageVelocity / maxVal) * chartH}
                                  stroke="#10b981"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 3"
                                />
                                <text
                                  x={padL + chartW}
                                  y={padT + (1 - averageVelocity / maxVal) * chartH - 4}
                                  textAnchor="end"
                                  fontSize="9"
                                  fontWeight="700"
                                  fill="#10b981"
                                >
                                  Avg {averageVelocity}
                                </text>
                              </g>
                            )}

                            {/* Y axis guides */}
                            <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="var(--slate-200)" />
                            <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="10" fill="var(--slate-400)">
                              {maxVal}
                            </text>
                            <text x={padL - 6} y={padT + chartH + 3} textAnchor="end" fontSize="10" fill="var(--slate-400)">
                              0
                            </text>

                            {/* Bars */}
                            {closedSprints.map((s, idx) => {
                              const pts = s.completedPoints || 0;
                              const barH = (pts / maxVal) * chartH;
                              const bx = padL + idx * barGap + (barGap - barWidth) / 2;
                              const by = padT + (chartH - barH);
                              const isHovered = hoveredVelocityBar === idx;

                              return (
                                <g
                                  key={s.sprintId}
                                  onMouseEnter={() => setHoveredVelocityBar(idx)}
                                  onMouseLeave={() => setHoveredVelocityBar(null)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <rect
                                    x={bx}
                                    y={by}
                                    width={barWidth}
                                    height={Math.max(4, barH)}
                                    rx="4"
                                    fill={isHovered ? '#4338ca' : 'url(#velocityBarGrad)'}
                                    style={{ transition: 'all 0.15s ease' }}
                                  />
                                  {/* Bar label */}
                                  <text
                                    x={bx + barWidth / 2}
                                    y={padT + chartH + 16}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="600"
                                    fill="var(--slate-600)"
                                  >
                                    {s.name.length > 8 ? `${s.name.slice(0, 8)}…` : s.name}
                                  </text>
                                  {/* Tooltip on hover */}
                                  {isHovered && (
                                    <g>
                                      <rect
                                        x={bx - 20}
                                        y={by - 26}
                                        width={barWidth + 40}
                                        height="20"
                                        rx="4"
                                        fill="var(--slate-900)"
                                      />
                                      <text
                                        x={bx + barWidth / 2}
                                        y={by - 13}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fontWeight="700"
                                        fill="white"
                                      >
                                        {s.name}: {pts} pts
                                      </text>
                                    </g>
                                  )}
                                </g>
                              );
                            })}

                            {/* Trendline connecting tops */}
                            {trendPolyline && (
                              <polyline
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={trendPolyline}
                              />
                            )}

                            {/* Trend dots */}
                            {trendPoints.map((tp, idx) => (
                              <circle
                                key={idx}
                                cx={tp.cx}
                                cy={tp.cy}
                                r="3.5"
                                fill="#f59e0b"
                                stroke="white"
                                strokeWidth="1.5"
                              />
                            ))}
                          </svg>
                        );
                      })()}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        marginTop: '12px',
                        fontSize: '11px',
                        color: 'var(--slate-500)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#4f46e5' }} />
                        <span>Completed Points</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '12px', height: '2px', backgroundColor: '#f59e0b' }} />
                        <span>Velocity Trend</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon={<TrendingUp size={22} />}
                    title="Velocity chart locked"
                    description="Sprint velocity analytics activate automatically once at least 2 sprints are completed and closed."
                  />
                )}
              </Card>

              {/* 3. TEAM WORKLOAD WIDGET (for active sprint) */}
              <Card padding="lg">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>
                      Team Workload
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                      Task & story point distribution in active sprint
                    </span>
                  </div>

                  {activeSprint && teamWorkload.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsBalanceModalOpen(true)}
                      icon={<Sparkles size={13} color="var(--primary)" />}
                    >
                      Balance Workload
                    </Button>
                  )}
                </div>

                {activeSprint && teamWorkload.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {teamWorkload.map((member, idx) => {
                      const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                      const initials = member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || 'U';

                      const completionRate =
                        member.taskCount > 0
                          ? Math.round((member.completedTasks / member.taskCount) * 100)
                          : 0;

                      return (
                        <div
                          key={member.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            backgroundColor: 'var(--slate-50)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--slate-150)',
                            gap: '12px',
                          }}
                        >
                          {/* Member info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '130px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: color.bg,
                                color: color.text,
                                border: `1px solid ${color.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 700,
                                flexShrink: 0,
                                overflow: 'hidden',
                              }}
                            >
                              {member.avatar && member.avatar.startsWith('http') ? (
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: 'var(--slate-900)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {member.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                                {member.taskCount} task{member.taskCount === 1 ? '' : 's'} · {member.storyPoints} pts
                              </div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div style={{ flex: 1, maxWidth: '180px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                              <span style={{ color: 'var(--slate-500)' }}>Done</span>
                              <span style={{ fontWeight: 700, color: 'var(--slate-700)' }}>
                                {member.completedTasks}/{member.taskCount} ({completionRate}%)
                              </span>
                            </div>
                            <div
                              style={{
                                width: '100%',
                                height: '6px',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: 'var(--slate-200)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${completionRate}%`,
                                  height: '100%',
                                  backgroundColor: '#059669',
                                  borderRadius: 'var(--radius-full)',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon={<Users2 size={22} />}
                    title="No workload assignments"
                    description="Assign sprint tasks to team members to visualize work distribution."
                  />
                )}
              </Card>

              {/* 4. UPCOMING DEADLINES WIDGET (PRD 3.3) */}
              <Card padding="lg">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: '#fffbeb',
                        color: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Clock size={17} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>
                        Upcoming Deadlines
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                        Sprints & deliverables ending within 2 weeks
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedProjectId) {
                        handleNavigate(`/projects/${selectedProjectId}/sprints/planning`);
                      } else {
                        handleNavigate('/projects');
                      }
                    }}
                    icon={<ArrowRight size={13} />}
                  >
                    Sprint Planning
                  </Button>
                </div>

                {/* Alert if any sprint is "At Risk" */}
                {atRiskSprints.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--danger-light)',
                      border: '1px solid var(--danger-border)',
                      color: 'var(--danger-dark)',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '12px',
                    }}
                  >
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    <span>
                      {atRiskSprints.length} sprint{atRiskSprints.length > 1 ? 's are' : ' is'} at risk of missing delivery target!
                    </span>
                  </div>
                )}

                {/* Sprints ending this week counter pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--slate-50)',
                    border: '1px solid var(--slate-150)',
                    fontSize: '12px',
                    color: 'var(--slate-700)',
                    marginBottom: '12px',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>Target window:</span>
                  <strong style={{ color: sprintsEndingThisWeek.length > 0 ? 'var(--primary)' : 'var(--slate-600)' }}>
                    {sprintsEndingThisWeek.length} {sprintsEndingThisWeek.length === 1 ? 'sprint' : 'sprints'} ending this week
                  </strong>
                </div>

                {/* Upcoming Sprints List */}
                {upcomingSprintDeadlines && upcomingSprintDeadlines.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: upcomingDeadlines.length > 0 ? '14px' : '0' }}>
                    {upcomingSprintDeadlines.map((sprint) => {
                      const daysInfo = formatDaysRemaining(sprint.endDate);
                      const vel = calculateVelocityStatus(sprint.totalPoints || 0, sprint.completedPoints || 0, sprint.startDate, sprint.endDate);

                      return (
                        <div
                          key={sprint._id}
                          onClick={() => {
                            if (selectedProjectId) {
                              handleNavigate(`/projects/${selectedProjectId}/sprints/planning`);
                            }
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--slate-200)',
                            backgroundColor: 'var(--white)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--slate-50)';
                            e.currentTarget.style.borderColor = 'var(--primary-border)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--white)';
                            e.currentTarget.style.borderColor = 'var(--slate-200)';
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)' }}>
                                {sprint.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-full)',
                                  backgroundColor: sprint.status === 'active' ? 'var(--primary-light)' : 'var(--slate-100)',
                                  color: sprint.status === 'active' ? 'var(--primary)' : 'var(--slate-600)',
                                }}
                              >
                                {sprint.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '2px' }}>
                              {formatSprintDateRange(sprint.startDate, sprint.endDate)}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: vel.color,
                                backgroundColor: vel.bg,
                                border: `1px solid ${vel.border}`,
                                padding: '2px 7px',
                                borderRadius: 'var(--radius-full)',
                              }}
                            >
                              {vel.label}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: daysInfo.isOverdue ? '#dc2626' : 'var(--slate-600)',
                              }}
                            >
                              {daysInfo.text}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : upcomingDeadlines.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Calendar size={22} />}
                    title="No urgent deadlines"
                    description="No sprints or tasks have approaching deadlines in the next 2 weeks."
                  />
                ) : null}

                {/* Approaching Task Deadlines (if present) */}
                {upcomingDeadlines.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                      Approaching Task Due Dates ({upcomingDeadlines.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {upcomingDeadlines.slice(0, 4).map((task) => {
                        const now = currentTime;
                        const isOverdue = task.dueDate! < now;
                        const diffDays = Math.ceil((task.dueDate! - now) / (1000 * 60 * 60 * 24));
                        const isDueSoon = diffDays >= 0 && diffDays <= 3;

                        return (
                          <div
                            key={task.taskId}
                            onClick={() => handleNavigate(`/projects/${selectedProjectId}/tasks`)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              backgroundColor: 'var(--white)',
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${isOverdue ? '#fca5a5' : isDueSoon ? '#fde68a' : 'var(--slate-200)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <div
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: isOverdue ? '#dc2626' : isDueSoon ? '#d97706' : '#2563eb',
                                  flexShrink: 0,
                                }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: 'var(--slate-900)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {task.title}
                                </div>
                              </div>
                            </div>

                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: isOverdue ? '#fef2f2' : isDueSoon ? '#fffbeb' : 'var(--slate-100)',
                                color: isOverdue ? '#dc2626' : isDueSoon ? '#d97706' : 'var(--slate-600)',
                              }}
                            >
                              {isOverdue ? `${Math.abs(diffDays)}d overdue` : diffDays === 0 ? 'Today' : `${diffDays}d left`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION B: 6 WORKSPACE KPI CARDS                                          */}
          {/* ========================================================================= */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: 'var(--slate-400)',
                }}
              >
                Workspace KPIs
              </div>
              <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>
                Click card to open detailed view
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              {kpiCards.map((kpi) => {
                const isHovered = hoveredCard === kpi.id;

                return (
                  <Card
                    key={kpi.id}
                    padding="md"
                    onClick={() => handleNavigate(kpi.route)}
                    onMouseEnter={() => setHoveredCard(kpi.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: isHovered
                        ? '1px solid var(--primary-border)'
                        : '1px solid var(--slate-200)',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--white)',
                      boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      minHeight: '140px',
                    }}
                    title={`Click to open ${kpi.label}`}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '10px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--slate-600)',
                          }}
                        >
                          {kpi.label}
                        </span>

                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: kpi.iconBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {kpi.icon}
                        </div>
                      </div>

                      {isLoadingKPIs ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                          <div
                            className="skeleton-shimmer"
                            style={{
                              width: '54px',
                              height: '32px',
                              borderRadius: 'var(--radius-xs)',
                            }}
                          />
                          <div
                            className="skeleton-shimmer"
                            style={{
                              width: '90px',
                              height: '14px',
                              borderRadius: 'var(--radius-xs)',
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ marginTop: '4px' }}>
                          <div
                            style={{
                              fontSize: '28px',
                              fontWeight: 800,
                              color: 'var(--slate-950)',
                              lineHeight: 1.1,
                              letterSpacing: '-0.5px',
                            }}
                          >
                            {kpi.count}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '8px',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: kpi.trendPositive ? '#059669' : 'var(--slate-500)',
                                backgroundColor: kpi.trendPositive ? '#ecfdf5' : 'var(--slate-100)',
                                padding: '2px 7px',
                                borderRadius: 'var(--radius-full)',
                              }}
                            >
                              {kpi.trendPositive && <TrendingUp size={10} />}
                              {kpi.trendText}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                              • view
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION: PROJECT ROADMAP SUMMARY (PRD 3.3)                                */}
          {/* ========================================================================= */}
          <div>
            <Card padding="lg">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--primary-subtle)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Milestone size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--slate-900)' }}>
                      Project Roadmap Summary
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                      Upcoming milestones across workspace projects for the next 3 months
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (selectedProjectId) {
                      handleNavigate(`/projects/${selectedProjectId}/roadmap`);
                    } else {
                      handleNavigate('/roadmap');
                    }
                  }}
                  icon={<ArrowRight size={14} />}
                >
                  View Full Roadmap
                </Button>
              </div>

              {upcomingMilestones && upcomingMilestones.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {upcomingMilestones.map((m) => {
                    const milestoneKey = m.milestoneId || m._id;
                    const isExpanded = expandedMilestoneId === milestoneKey;
                    const isOverdue = m.targetDate < currentTime && m.status !== 'completed';
                    const statusConfig = (() => {
                      if (m.status === 'completed') {
                        return { label: 'Completed', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
                      }
                      if (isOverdue) {
                        return { label: 'Delayed', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
                      }
                      if (m.status === 'at_risk') {
                        return { label: 'At Risk', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
                      }
                      return { label: 'On Track', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
                    })();

                    const markerColor =
                      m.status === 'at_risk' ? '#d97706' : m.status === 'planned' ? '#6366f1' : '#10b981';

                    return (
                      <div
                        key={milestoneKey}
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--slate-200)',
                          backgroundColor: 'var(--white)',
                          overflow: 'hidden',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          onClick={() => setExpandedMilestoneId(isExpanded ? null : milestoneKey)}
                          style={{
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? 'var(--slate-50)' : 'transparent',
                            flexWrap: 'wrap',
                          }}
                        >
                          {/* Milestone Name & Project */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: 1 }}>
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                transform: 'rotate(45deg)',
                                backgroundColor: markerColor,
                                flexShrink: 0,
                              }}
                            />
                            <div>
                              <div
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  color: 'var(--slate-900)',
                                }}
                              >
                                {m.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '2px' }}>
                                Project: <strong>{m.projectName}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Target Date */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--slate-600)', fontSize: '12px', minWidth: '120px' }}>
                            <Calendar size={13} color="var(--slate-400)" />
                            <span>
                              {new Date(m.targetDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div style={{ minWidth: '90px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: statusConfig.color,
                                backgroundColor: statusConfig.bg,
                                border: `1px solid ${statusConfig.border}`,
                                padding: '3px 9px',
                                borderRadius: 'var(--radius-full)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span
                                style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  backgroundColor: statusConfig.color,
                                }}
                              />
                              {statusConfig.label}
                            </span>
                          </div>

                          {/* Progress Bar (% complete) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px' }}>
                            <div
                              style={{
                                flex: 1,
                                height: '7px',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: 'var(--slate-150)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${m.progressPercent}%`,
                                  backgroundColor: m.progressPercent === 100 ? '#10b981' : markerColor,
                                  borderRadius: 'var(--radius-full)',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: 'var(--slate-700)',
                                minWidth: '34px',
                                textAlign: 'right',
                              }}
                            >
                              {m.progressPercent}%
                            </span>
                          </div>

                          {/* Expand chevron */}
                          <ChevronDown
                            size={16}
                            color="var(--slate-400)"
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.15s ease',
                            }}
                          />
                        </div>

                        {/* Collapsible Milestone Details */}
                        {isExpanded && (
                          <div
                            style={{
                              padding: '14px 18px',
                              borderTop: '1px solid var(--slate-150)',
                              backgroundColor: 'var(--slate-50)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                          >
                            <div style={{ fontSize: '13px', color: 'var(--slate-700)', lineHeight: 1.5 }}>
                              {m.description ? m.description : <em>No detailed description provided for this milestone.</em>}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '10px',
                                paddingTop: '8px',
                                borderTop: '1px dashed var(--slate-200)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'var(--slate-500)' }}>
                                <span>Linked Sprints: <strong>{(m.linkedSprints || []).length}</strong></span>
                                <span>
                                  Target: <strong>{new Date(m.targetDate).toLocaleDateString()}</strong>
                                  {isOverdue && <span style={{ color: '#dc2626', marginLeft: '6px', fontWeight: 700 }}>(Overdue)</span>}
                                </span>
                              </div>

                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  if (m.projectId) {
                                    handleNavigate(`/projects/${m.projectId}/roadmap`);
                                  } else {
                                    handleNavigate('/roadmap');
                                  }
                                }}
                                icon={<ArrowRight size={12} />}
                              >
                                View in Interactive Roadmap
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={<Milestone size={24} />}
                  title="No upcoming milestones"
                  description="Keep stakeholders aligned by plotting upcoming release milestones for the next 3 months on your interactive roadmap."
                  actionLabel="Open Roadmap"
                  onAction={() => {
                    if (selectedProjectId) {
                      handleNavigate(`/projects/${selectedProjectId}/roadmap`);
                    } else {
                      handleNavigate('/roadmap');
                    }
                  }}
                />
              )}
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* SECTION C: RECENT ACTIVITY & TEAM MEMBERS                                */}
          {/* ========================================================================= */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '24px',
            }}
          >
            {/* RECENT ACTIVITY */}
            <Card padding="lg">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Recent Activity
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                    Workspace events & audit trail
                  </span>
                </div>
                <Activity size={18} color="var(--slate-400)" />
              </div>

              {isLoadingActivities ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        className="skeleton-shimmer"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div
                          className="skeleton-shimmer"
                          style={{ width: '80%', height: '14px', borderRadius: '4px' }}
                        />
                        <div
                          className="skeleton-shimmer"
                          style={{ width: '40%', height: '11px', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : workspaceActivities && workspaceActivities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {workspaceActivities.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--slate-50)',
                        border: '1px solid var(--slate-150)',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {act.userAvatar && act.userAvatar.startsWith('http') ? (
                          <img
                            src={act.userAvatar}
                            alt={act.userName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span>{act.userName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'var(--slate-800)',
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                          }}
                        >
                          <strong style={{ fontWeight: 700, color: 'var(--slate-950)' }}>
                            {act.userName}
                          </strong>{' '}
                          <span style={{ color: 'var(--slate-600)' }}>{act.action}</span>{' '}
                          <strong style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            {act.target}
                          </strong>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '2px' }}>
                          {formatRelativeTime(act.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={<Activity size={20} />}
                  title="No recent activity"
                  description="Workspace events and task milestones will be logged here in real-time."
                />
              )}
            </Card>

            {/* TEAM MEMBERS */}
            <Card padding="lg">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Team Members
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                    Collaborators ({realMemberCount} total)
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleNavigate('/teams')}
                  icon={<ArrowRight size={14} />}
                >
                  Manage
                </Button>
              </div>

              {isLoadingMembers ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0' }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="skeleton-shimmer"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                      }}
                    />
                  ))}
                </div>
              ) : recentMembers.length > 0 ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '12px 14px',
                      backgroundColor: 'var(--slate-50)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--slate-150)',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {recentMembers.map((member, index) => {
                        const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
                        const initials = member.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || 'U';

                        return (
                          <div
                            key={member.memberId}
                            title={`${member.name} (${member.roleName})`}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: color.bg,
                              color: color.text,
                              border: `2px solid var(--white)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 700,
                              marginLeft: index === 0 ? '0' : '-8px',
                              boxShadow: 'var(--shadow-xs)',
                              cursor: 'pointer',
                              position: 'relative',
                              zIndex: 10 - index,
                              overflow: 'hidden',
                              transition: 'transform 0.12s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            onClick={() => handleNavigate('/teams')}
                          >
                            {member.avatar && member.avatar.startsWith('http') ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                        );
                      })}

                      {extraMembersCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleNavigate('/teams')}
                          title="View all team members"
                          style={{
                            height: '38px',
                            padding: '0 10px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--primary-subtle)',
                            color: 'var(--primary)',
                            border: '2px solid var(--white)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            marginLeft: '-6px',
                            boxShadow: 'var(--shadow-xs)',
                            cursor: 'pointer',
                            zIndex: 5,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          +{extraMembersCount} more
                        </button>
                      )}
                    </div>

                    <div style={{ marginLeft: 'auto' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--slate-500)',
                          fontWeight: 500,
                        }}
                      >
                        {realMemberCount} {realMemberCount === 1 ? 'member' : 'members'} enrolled
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentMembers.map((m) => (
                      <div
                        key={m.memberId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 4px',
                          borderBottom: '1px solid var(--slate-100)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-800)' }}>
                            {m.name}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>
                            {m.email}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: m.roleName === 'Owner' ? 'var(--primary)' : 'var(--slate-600)',
                            backgroundColor:
                              m.roleName === 'Owner' ? 'var(--primary-subtle)' : 'var(--slate-100)',
                            padding: '1px 8px',
                            borderRadius: 'var(--radius-full)',
                          }}
                        >
                          {m.roleName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={<Users2 size={20} />}
                  title="No team members added"
                  description="Invite your team to collaborate on projects and tasks."
                  actionLabel="Invite Member"
                  onAction={() => handleNavigate('/teams')}
                />
              )}
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* SECTION D: PROJECTS PORTFOLIO                                             */}
          {/* ========================================================================= */}
          <div>
            <Card padding="lg">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Projects Portfolio
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                    Active initiatives & deliverables
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {workspaceProjects && workspaceProjects.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedProjectId) {
                            onNavigate(`/projects/${selectedProjectId}/tasks`);
                          } else {
                            onNavigate('/tasks');
                          }
                        }}
                      >
                        View All Tasks
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate('/projects')}
                      >
                        All Projects
                      </Button>
                    </>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={14} />}
                    onClick={() => {
                      if (selectedProjectId) {
                        onNavigate(`/projects/${selectedProjectId}/tasks`);
                      } else {
                        onNavigate('/tasks');
                      }
                    }}
                  >
                    Create Task
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={14} />}
                    disabled={!canCreateProject()}
                    onClick={() => {
                      if (!canCreateProject()) {
                        alert('You do not have permission to create projects in this workspace.');
                        return;
                      }
                      setIsProjectModalOpen(true);
                    }}
                  >
                    Create Project
                  </Button>
                </div>
              </div>

              {workspaceProjects && workspaceProjects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {workspaceProjects.slice(0, 4).map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setUserSelectedProjectId(proj.id as Id<"projects">);
                        onNavigate(`/projects/${proj.id}/tasks`);
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--slate-200)',
                        backgroundColor: 'var(--white)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--slate-50)';
                        e.currentTarget.style.borderColor = 'var(--primary-border)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--white)';
                        e.currentTarget.style.borderColor = 'var(--slate-200)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: proj.color || 'var(--primary)',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: 'var(--slate-900)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {proj.name}
                          </div>
                          {proj.description && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--slate-500)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {proj.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor:
                            proj.status === 'in_progress'
                              ? '#eff6ff'
                              : proj.status === 'completed'
                              ? '#ecfdf5'
                              : '#fffbeb',
                          color:
                            proj.status === 'in_progress'
                              ? '#2563eb'
                              : proj.status === 'completed'
                              ? '#059669'
                              : '#d97706',
                          textTransform: 'capitalize',
                          flexShrink: 0,
                          marginLeft: '12px',
                        }}
                      >
                        {proj.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<FolderKanban size={24} />}
                  title="No projects yet"
                  description="Create your first workspace project to start planning deliverables."
                  actionLabel={canCreateProject() ? 'Create Project' : undefined}
                  onAction={
                    canCreateProject()
                      ? () => setIsProjectModalOpen(true)
                      : undefined
                  }
                />
              )}
            </Card>
          </div>
        </div>

        {/* OVERLAY WHEN NO WORKSPACE ACCESS */}
        {!workspace && (
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: '480px',
              backgroundColor: 'var(--white)',
              border: '1px solid var(--slate-200)',
              borderRadius: 'var(--radius-lg)',
              padding: '36px 28px',
              textAlign: 'center',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              zIndex: 20,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                backgroundColor: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.12)',
              }}
            >
              <Building size={30} />
            </div>

            <h2
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--slate-900)',
                marginBottom: '8px',
                letterSpacing: '-0.3px',
              }}
            >
              No Workspace Selected
            </h2>

            <p
              style={{
                fontSize: '14px',
                color: 'var(--slate-600)',
                lineHeight: 1.5,
                marginBottom: '24px',
              }}
            >
              You don't have access to any workspaces yet. Create your workspace to start managing
              projects, organizing tasks, and inviting team members.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="primary"
                size="md"
                icon={<Plus size={16} />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Workspace
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CLOSE SPRINT CONFIRMATION (ADMIN ONLY)                           */}
      {/* ========================================================================= */}
      {isCloseSprintModalOpen && activeSprint && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => !isClosingSprint && setIsCloseSprintModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--slate-200)',
              animation: 'scaleIn 0.15s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Close Active Sprint?
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                  Sprint: {activeSprint.name}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--slate-600)', lineHeight: 1.5, marginBottom: '16px' }}>
              Closing this sprint will complete the active cycle and lock in sprint velocity metrics.
            </p>

            <div
              style={{
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--slate-600)' }}>Completed Tasks:</span>
                <strong style={{ color: '#059669' }}>
                  {activeSprint.completedCount ?? 0} tasks resolved
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--slate-600)' }}>Incomplete Tasks:</span>
                <strong style={{ color: '#d97706' }}>
                  {(activeSprint.taskCount ?? 0) - (activeSprint.completedCount ?? 0)} tasks
                </strong>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--slate-500)',
                  marginTop: '4px',
                  paddingTop: '6px',
                  borderTop: '1px dashed var(--slate-200)',
                }}
              >
                Incomplete tasks will automatically be moved back to the project backlog.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsCloseSprintModalOpen(false)}
                disabled={isClosingSprint}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={handleConfirmCloseSprint}
                disabled={isClosingSprint}
                icon={isClosingSprint ? <RotateCw size={14} className="spin" /> : <CheckCircle2 size={14} />}
              >
                {isClosingSprint ? 'Closing Sprint...' : 'Confirm & Close Sprint'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BALANCE WORKLOAD AI ASSISTANT                                   */}
      {/* ========================================================================= */}
      {isBalanceModalOpen && activeSprint && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setIsBalanceModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '540px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--slate-200)',
              animation: 'scaleIn 0.15s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)' }}>
                    AI Workload Balancing
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                    Capacity distribution analysis for {activeSprint.name}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsBalanceModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--slate-400)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Analysis card */}
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                marginBottom: '18px',
                fontSize: '13px',
                color: '#1e40af',
                lineHeight: 1.5,
              }}
            >
              <strong>Capacity Insights:</strong>{' '}
              {teamWorkload.length > 1 ? (
                <>
                  Team member <strong>{teamWorkload[0]?.name}</strong> carries{' '}
                  <strong>{teamWorkload[0]?.storyPoints} story points</strong> (
                  {Math.round(((teamWorkload[0]?.storyPoints || 0) / (activeSprint.totalPoints || 1)) * 100)}% of
                  sprint total). Reallocating 1–2 items to team members with lower load can mitigate burnout and reduce bottleneck risk.
                </>
              ) : (
                <>
                  All tasks are currently assigned to a single collaborator. Consider onboarding additional team members to balance deliverables.
                </>
              )}
            </div>

            {/* Distribution table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '200px', overflowY: 'auto' }}>
              {teamWorkload.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--slate-50)',
                    border: '1px solid var(--slate-200)',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{m.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'var(--slate-500)' }}>{m.taskCount} tasks</span>
                    <strong style={{ color: 'var(--primary)' }}>{m.storyPoints} pts</strong>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" size="md" onClick={() => setIsBalanceModalOpen(false)}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setIsBalanceModalOpen(false);
                  handleNavigate(`/projects/${selectedProjectId}/tasks`);
                }}
                icon={<ArrowRight size={14} />}
              >
                Open Kanban Board to Rebalance
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WORKSPACE & PROJECT MODALS */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
    </div>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [activeItem, setActiveItem] = useState('dashboard');

  return (
    <DashboardLayout
      activeItem={activeItem}
      onSelectItem={setActiveItem}
      onNavigate={onNavigate}
    >
      <DashboardContent onNavigate={onNavigate} />
    </DashboardLayout>
  );
};
