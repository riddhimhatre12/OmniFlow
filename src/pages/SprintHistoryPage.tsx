import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ArrowLeft,
  FileText,
  Save,
  Award,
  AlertTriangle,
  RotateCw,
  Search,
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

interface SprintHistoryPageProps {
  onNavigate: (route: string) => void;
  projectId?: string;
}

type DateFilter = 'all' | 'last_3_months' | 'last_6_months';
type TabType = 'overview' | 'tasks' | 'team' | 'retrospective';

const AVATAR_COLORS = [
  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' },
];

export const SprintHistoryPage: React.FC<SprintHistoryPageProps> = ({
  onNavigate,
  projectId: propProjectId,
}) => {
  const { workspace, isAdmin, isOwner, userRole } = useWorkspaceAuth();
  const { user } = useCurrentUser();
  const [activeItem, setActiveItem] = useState('sprints');

  // Selected project state
  const [userSelectedProjectId, setUserSelectedProjectId] = useState<Id<"projects"> | null>(null);

  // Filters & Tabs
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSprintId, setSelectedSprintId] = useState<Id<"sprints"> | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const [currentTime] = useState(() => Date.now());

  // Retrospective state
  const [editedSummary, setEditedSummary] = useState<string | null>(null);
  const [editedAchievements, setEditedAchievements] = useState<string | null>(null);
  const [editedChallenges, setEditedChallenges] = useState<string | null>(null);
  const [editedImprovements, setEditedImprovements] = useState<string | null>(null);
  const [isSavingRetro, setIsSavingRetro] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Query workspace projects
  const workspaceProjects = useQuery(
    api.projects.getWorkspaceProjects,
    workspace
      ? {
          workspaceId: workspace.id as Id<"workspaces">,
          userId: user.userId ? (user.userId as Id<"users">) : undefined,
        }
      : "skip"
  );

  // Derive active projectId
  const activeProjectId = useMemo(() => {
    if (propProjectId) return propProjectId as Id<"projects">;
    if (userSelectedProjectId) {
      const exists = workspaceProjects?.some((p) => p.id === userSelectedProjectId);
      if (exists) return userSelectedProjectId;
    }
    return (workspaceProjects?.[0]?.id as Id<"projects">) || null;
  }, [propProjectId, userSelectedProjectId, workspaceProjects]);

  // Project details
  const projectDetails = useQuery(
    api.projects.getProjectDetails,
    activeProjectId
      ? {
          projectId: activeProjectId,
          userId: user.userId ? (user.userId as Id<"users">) : undefined,
        }
      : "skip"
  );

  // Query all project sprints (including closed)
  const projectSprints = useQuery(
    api.sprints.getProjectSprints,
    activeProjectId ? { projectId: activeProjectId, includeArchived: true } : "skip"
  );

  // Filter closed sprints only
  const allClosedSprints = useMemo(() => {
    if (!projectSprints) return [];
    return projectSprints
      .filter((s) => s.status === 'closed')
      .sort((a, b) => (b.endDate || b.createdAt) - (a.endDate || a.createdAt));
  }, [projectSprints]);

  // Filter by date range and search
  const filteredClosedSprints = useMemo(() => {
    const now = currentTime;
    const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
    const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;

    return allClosedSprints.filter((sprint) => {
      // Date filter
      const sprintDate = sprint.endDate || sprint.createdAt;
      if (dateFilter === 'last_3_months' && now - sprintDate > threeMonthsMs) {
        return false;
      }
      if (dateFilter === 'last_6_months' && now - sprintDate > sixMonthsMs) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          sprint.name.toLowerCase().includes(q) ||
          (sprint.goal && sprint.goal.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allClosedSprints, dateFilter, searchQuery, currentTime]);

  // Active selected sprint
  const activeSelectedSprintId = useMemo(() => {
    if (selectedSprintId) {
      const exists = filteredClosedSprints.some((s) => s.sprintId === selectedSprintId);
      if (exists) return selectedSprintId;
    }
    return (filteredClosedSprints[0]?.sprintId as Id<"sprints">) || null;
  }, [selectedSprintId, filteredClosedSprints]);

  // Sprint details for selected sprint
  const sprintDetails = useQuery(
    api.sprints.getSprintDetails,
    activeSelectedSprintId
      ? {
          sprintId: activeSelectedSprintId,
          userId: user.userId ? (user.userId as Id<"users">) : undefined,
        }
      : "skip"
  );

  // Sprint tasks
  const sprintTasks = useQuery(
    api.sprints.getSprintTasks,
    activeSelectedSprintId ? { sprintId: activeSelectedSprintId } : "skip"
  );

  // Burndown chart data
  const sprintBurndown = useQuery(
    api.sprints.getSprintBurndown,
    activeSelectedSprintId ? { sprintId: activeSelectedSprintId } : "skip"
  );

  // Retrospective record
  const sprintRetro = useQuery(
    api.sprints.getSprintRetrospective,
    activeSelectedSprintId ? { sprintId: activeSelectedSprintId } : "skip"
  );

  // Retrospective mutation
  const saveRetroMutation = useMutation(api.sprints.saveSprintRetrospective);

  // Derive retrospective fields cleanly
  const retroSummary = editedSummary !== null ? editedSummary : (sprintRetro?.summary || '');
  const retroAchievements = editedAchievements !== null ? editedAchievements : (sprintRetro?.achievements || '');
  const retroChallenges = editedChallenges !== null ? editedChallenges : (sprintRetro?.challenges || '');
  const retroImprovements = editedImprovements !== null ? editedImprovements : (sprintRetro?.improvements || '');

  // Flattened tasks
  const allTasksList = useMemo(() => {
    if (!sprintTasks) return [];
    return [
      ...(sprintTasks.todo || []),
      ...(sprintTasks.in_progress || []),
      ...(sprintTasks.in_review || []),
      ...(sprintTasks.done || []),
    ];
  }, [sprintTasks]);

  // Team performance metrics
  const teamPerformance = useMemo(() => {
    if (!allTasksList.length) return [];
    const memberMap = new Map<string, {
      id: string;
      name: string;
      avatar?: string;
      email?: string;
      tasksCount: number;
      completedTasksCount: number;
      totalPoints: number;
      completedPoints: number;
    }>();

    for (const t of allTasksList) {
      const key = t.assignee?.id || 'unassigned';
      const name = t.assignee?.name || 'Unassigned';
      const avatar = t.assignee?.avatar;
      const email = t.assignee?.email;

      const curr = memberMap.get(key) || {
        id: key,
        name,
        avatar,
        email,
        tasksCount: 0,
        completedTasksCount: 0,
        totalPoints: 0,
        completedPoints: 0,
      };

      curr.tasksCount += 1;
      curr.totalPoints += t.storyPoints || 0;

      if (t.status === 'done') {
        curr.completedTasksCount += 1;
        curr.completedPoints += t.storyPoints || 0;
      }

      memberMap.set(key, curr);
    }

    return Array.from(memberMap.values()).sort((a, b) => b.completedPoints - a.completedPoints);
  }, [allTasksList]);

  // Average velocity across all closed sprints
  const averageVelocity = useMemo(() => {
    if (!allClosedSprints.length) return 0;
    const total = allClosedSprints.reduce((sum, s) => sum + (s.completedPoints || 0), 0);
    return Math.round(total / allClosedSprints.length);
  }, [allClosedSprints]);

  // Handle saving retrospective
  const handleSaveRetrospective = async () => {
    if (!activeSelectedSprintId || !user.userId) return;
    setIsSavingRetro(true);
    try {
      await saveRetroMutation({
        sprintId: activeSelectedSprintId,
        userId: user.userId as Id<"users">,
        summary: retroSummary.trim(),
        achievements: retroAchievements.trim(),
        challenges: retroChallenges.trim(),
        improvements: retroImprovements.trim(),
      });
      setToastMessage({ type: 'success', text: 'Sprint retrospective saved successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save retrospective.';
      setToastMessage({ type: 'error', text: msg });
    } finally {
      setIsSavingRetro(false);
    }
  };

  // Export summary report
  const handleExportSummary = () => {
    if (!sprintDetails) return;
    const content = `# Sprint Retrospective Summary: ${sprintDetails.name}
**Project:** ${projectDetails?.name || 'Project'}
**Dates:** ${sprintDetails.startDate ? new Date(sprintDetails.startDate).toLocaleDateString() : 'N/A'} - ${sprintDetails.endDate ? new Date(sprintDetails.endDate).toLocaleDateString() : 'N/A'}
**Status:** Closed
**Goal:** ${sprintDetails.goal || 'None specified'}
**Velocity:** ${sprintDetails.completedPoints} / ${sprintDetails.totalPoints} story points (${sprintDetails.totalPoints > 0 ? Math.round((sprintDetails.completedPoints / sprintDetails.totalPoints) * 100) : 0}%)
**Tasks Completed:** ${sprintTasks?.done?.length || 0} / ${allTasksList.length}

## Team Performance
${teamPerformance.map((m) => `- ${m.name}: ${m.completedTasksCount}/${m.tasksCount} tasks, ${m.completedPoints}/${m.totalPoints} pts`).join('\n')}

## Retrospective Notes
- **Summary:** ${retroSummary || 'N/A'}
- **Key Achievements:** ${retroAchievements || 'N/A'}
- **Challenges:** ${retroChallenges || 'N/A'}
- **Next Sprint Improvements:** ${retroImprovements || 'N/A'}
`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sprintDetails.name.toLowerCase().replace(/\s+/g, '_')}_summary.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isViewerOnly = !isAdmin && !isOwner && userRole?.name === 'Viewer';

  return (
    <DashboardLayout
      activeItem={activeItem}
      onSelectItem={setActiveItem}
      onNavigate={onNavigate}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* TOAST ALERT */}
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
          </div>
        )}

        {/* HEADER BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--slate-200)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft size={14} />}
              onClick={() => {
                if (activeProjectId) {
                  onNavigate(`/projects/${activeProjectId}/sprints/planning`);
                } else {
                  onNavigate('/projects');
                }
              }}
            >
              Back to Planning
            </Button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: 'var(--slate-950)',
                    letterSpacing: '-0.3px',
                  }}
                >
                  Sprint History & Retrospective
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--slate-100)',
                    color: 'var(--slate-600)',
                  }}
                >
                  Read-Only Archive
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                Historical sprint metrics, velocity tracking, and team retrospectives
              </p>
            </div>
          </div>

          {/* Right Header: Project Switcher & Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {workspaceProjects && workspaceProjects.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-500)' }}>
                  Project:
                </span>
                <select
                  value={activeProjectId || ''}
                  onChange={(e) => setUserSelectedProjectId(e.target.value as Id<"projects">)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-300)',
                    backgroundColor: 'var(--white)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--slate-800)',
                    cursor: 'pointer',
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

            {sprintDetails && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={handleExportSummary}
              >
                Export Summary
              </Button>
            )}
          </div>
        </div>

        {/* MAIN 2-COLUMN LAYOUT: SPRINT LIST (LEFT) + DETAILS (RIGHT) */}
        {allClosedSprints.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={<Award size={32} color="var(--primary)" />}
              title="No closed sprints yet"
              description="Completed sprints will appear here once they are officially closed. Complete tasks, achieve sprint milestones, and close active sprints to start analyzing velocity trends."
              actionLabel={activeProjectId ? "Go to Active Sprints" : "View Projects"}
              onAction={() => {
                if (activeProjectId) {
                  onNavigate(`/projects/${activeProjectId}/sprints/planning`);
                } else {
                  onNavigate('/projects');
                }
              }}
            />
          </Card>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 340px) 1fr',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* ========================================================================= */}
            {/* 1. SPRINT LIST (LEFT SIDEBAR)                                             */}
            {/* ========================================================================= */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Card padding="md">
                {/* Search & Date Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search
                      size={14}
                      color="var(--slate-400)"
                      style={{ position: 'absolute', left: '10px', top: '10px' }}
                    />
                    <input
                      type="text"
                      placeholder="Search closed sprints..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px 7px 32px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--slate-300)',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Filter Pills: All | Last 3 Months | Last 6 Months */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'last_3_months', label: '3 Months' },
                        { id: 'last_6_months', label: '6 Months' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setDateFilter(f.id)}
                        style={{
                          flex: 1,
                          padding: '5px 8px',
                          borderRadius: 'var(--radius-xs)',
                          border: `1px solid ${dateFilter === f.id ? 'var(--primary)' : 'var(--slate-200)'}`,
                          backgroundColor: dateFilter === f.id ? 'var(--primary-subtle)' : 'var(--white)',
                          color: dateFilter === f.id ? 'var(--primary)' : 'var(--slate-600)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Sprints List Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredClosedSprints.map((sprint) => {
                  const isSelected = sprint.sprintId === activeSelectedSprintId;
                  const dateStr = sprint.startDate && sprint.endDate
                    ? `${new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : 'Completed';

                  return (
                    <div
                      key={sprint.sprintId}
                      onClick={() => {
                        setSelectedSprintId(sprint.sprintId as Id<"sprints">);
                        setEditedSummary(null);
                        setEditedAchievements(null);
                        setEditedChallenges(null);
                        setEditedImprovements(null);
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--slate-200)'}`,
                        backgroundColor: isSelected ? 'var(--primary-subtle)' : 'var(--white)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--slate-50)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--white)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: isSelected ? 'var(--primary)' : 'var(--slate-900)',
                              }}
                            >
                              {sprint.name}
                            </span>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--slate-200)',
                                color: 'var(--slate-700)',
                              }}
                            >
                              Closed
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--slate-400)',
                              marginTop: '3px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Calendar size={11} />
                            <span>{dateStr}</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 800,
                              color: isSelected ? 'var(--primary)' : 'var(--slate-800)',
                            }}
                          >
                            {sprint.completedPoints} pts
                          </span>
                          <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>
                            {sprint.taskCount} tasks
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. SPRINT DETAILS (MAIN CONTENT)                                         */}
            {/* ========================================================================= */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sprintDetails ? (
                <>
                  {/* Sprint Header */}
                  <Card padding="lg">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                        marginBottom: '16px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h2
                            style={{
                              fontSize: '22px',
                              fontWeight: 800,
                              color: 'var(--slate-950)',
                              letterSpacing: '-0.3px',
                            }}
                          >
                            {sprintDetails.name}
                          </h2>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--slate-100)',
                              color: 'var(--slate-700)',
                              border: '1px solid var(--slate-200)',
                            }}
                          >
                            Closed
                          </span>
                        </div>

                        {sprintDetails.goal && (
                          <p style={{ fontSize: '13px', color: 'var(--slate-600)', marginTop: '4px', fontStyle: 'italic' }}>
                            "{sprintDetails.goal}"
                          </p>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '8px',
                            fontSize: '12px',
                            color: 'var(--slate-500)',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} color="var(--slate-400)" />
                            {sprintDetails.startDate
                              ? new Date(sprintDetails.startDate).toLocaleDateString()
                              : 'N/A'}{' '}
                            –{' '}
                            {sprintDetails.endDate
                              ? new Date(sprintDetails.endDate).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Velocity Badge */}
                      <div
                        style={{
                          padding: '12px 18px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          textAlign: 'right',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                          Final Velocity
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#047857' }}>
                          {sprintDetails.completedPoints} / {sprintDetails.totalPoints} pts
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>
                          {sprintDetails.totalPoints > 0
                            ? Math.round((sprintDetails.completedPoints / sprintDetails.totalPoints) * 100)
                            : 0}% completion
                        </div>
                      </div>
                    </div>

                    {/* TABS NAVIGATION */}
                    <div
                      style={{
                        display: 'flex',
                        borderBottom: '1px solid var(--slate-200)',
                        gap: '24px',
                        paddingTop: '6px',
                      }}
                    >
                      {(
                        [
                          { id: 'overview', label: 'Overview' },
                          { id: 'tasks', label: `Tasks (${allTasksList.length})` },
                          { id: 'team', label: `Team Performance (${teamPerformance.length})` },
                          { id: 'retrospective', label: 'Retrospective' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          style={{
                            padding: '8px 4px 12px 4px',
                            border: 'none',
                            background: 'none',
                            fontSize: '13px',
                            fontWeight: activeTab === tab.id ? 700 : 500,
                            color: activeTab === tab.id ? 'var(--primary)' : 'var(--slate-600)',
                            borderBottom: `2px solid ${activeTab === tab.id ? 'var(--primary)' : 'transparent'}`,
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* TAB CONTENTS */}
                    <div style={{ paddingTop: '20px' }}>
                      {/* TAB 1: OVERVIEW */}
                      {activeTab === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {/* Metrics 4-Grid */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                              gap: '14px',
                            }}
                          >
                            <div
                              style={{
                                padding: '12px 14px',
                                backgroundColor: 'var(--slate-50)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--slate-150)',
                              }}
                            >
                              <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600 }}>
                                Velocity vs Capacity
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px' }}>
                                {sprintDetails.completedPoints} / {sprintDetails.capacity || sprintDetails.totalPoints} pts
                              </div>
                              <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                                Target: {sprintDetails.capacity ? `${sprintDetails.capacity} pts` : 'Not set'}
                              </div>
                            </div>

                            <div
                              style={{
                                padding: '12px 14px',
                                backgroundColor: 'var(--slate-50)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--slate-150)',
                              }}
                            >
                              <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600 }}>
                                Task Resolution
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px' }}>
                                {sprintTasks?.done?.length || 0} / {allTasksList.length} tasks
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '2px' }}>
                                {allTasksList.length - (sprintTasks?.done?.length || 0)} incomplete returned
                              </div>
                            </div>

                            <div
                              style={{
                                padding: '12px 14px',
                                backgroundColor: 'var(--slate-50)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--slate-150)',
                              }}
                            >
                              <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600 }}>
                                Duration & Schedule
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px' }}>
                                {sprintDetails.startDate && sprintDetails.endDate
                                  ? `${Math.ceil((sprintDetails.endDate - sprintDetails.startDate) / (1000 * 60 * 60 * 24))} days`
                                  : '14 days'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '2px' }}>
                                Closed cycle
                              </div>
                            </div>

                            <div
                              style={{
                                padding: '12px 14px',
                                backgroundColor: 'var(--slate-50)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--slate-150)',
                              }}
                            >
                              <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600 }}>
                                Project Average Velocity
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                                {averageVelocity} pts/sprint
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '2px' }}>
                                Across {allClosedSprints.length} sprints
                              </div>
                            </div>
                          </div>

                          {/* Historical Burndown Chart */}
                          {sprintBurndown && (
                            <div>
                              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                                Historical Burndown Trajectory
                              </h4>

                              <div style={{ width: '100%', height: '140px', padding: '8px 0' }}>
                                {(() => {
                                  const totalDays = Math.max(1, sprintBurndown.totalDays);
                                  const maxPoints = Math.max(1, sprintBurndown.totalStoryPoints || 10);
                                  const width = 480;
                                  const height = 100;
                                  const padL = 36;
                                  const padT = 16;

                                  const timeline = sprintBurndown.timeline || [];
                                  const actualPoints = timeline.filter((t) => t.pointsRemaining !== null);

                                  const poly = actualPoints.map((pt) => {
                                    const x = padL + (pt.day / totalDays) * width;
                                    const y = padT + (1 - pt.pointsRemaining! / maxPoints) * height;
                                    return `${x},${y}`;
                                  }).join(' ');

                                  return (
                                    <svg viewBox="0 0 540 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                      {/* Guides */}
                                      <line x1={padL} y1={padT} x2={padL + width} y2={padT} stroke="var(--slate-200)" strokeDasharray="3 3" />
                                      <line x1={padL} y1={padT + height} x2={padL + width} y2={padT + height} stroke="var(--slate-300)" />

                                      {/* Ideal line */}
                                      <line
                                        x1={padL}
                                        y1={padT}
                                        x2={padL + width}
                                        y2={padT + height}
                                        stroke="#94a3b8"
                                        strokeWidth="2"
                                        strokeDasharray="4 4"
                                      />

                                      {/* Actual curve */}
                                      {poly && (
                                        <polyline
                                          fill="none"
                                          stroke="#2563eb"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          points={poly}
                                        />
                                      )}

                                      <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="10" fill="var(--slate-400)">
                                        {maxPoints}
                                      </text>
                                      <text x={padL - 6} y={padT + height + 3} textAnchor="end" fontSize="10" fill="var(--slate-400)">
                                        0
                                      </text>
                                    </svg>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 2: TASKS */}
                      {activeTab === 'tasks' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                          {/* Completed tasks */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                              <CheckCircle2 size={16} color="#059669" />
                              <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)' }}>
                                Completed Items ({sprintTasks?.done?.length || 0})
                              </h4>
                            </div>

                            {sprintTasks?.done && sprintTasks.done.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {sprintTasks.done.map((task) => (
                                  <div
                                    key={task.taskId}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '10px 12px',
                                      backgroundColor: 'var(--white)',
                                      borderRadius: 'var(--radius-xs)',
                                      border: '1px solid var(--slate-200)',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <CheckCircle2 size={15} color="#059669" />
                                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-800)' }}>
                                        {task.title}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                                        {task.assignee ? task.assignee.name : 'Unassigned'}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          backgroundColor: '#ecfdf5',
                                          color: '#059669',
                                          padding: '2px 7px',
                                          borderRadius: 'var(--radius-full)',
                                        }}
                                      >
                                        {task.storyPoints || 0} pts
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', color: 'var(--slate-500)', fontStyle: 'italic' }}>
                                No completed tasks recorded.
                              </div>
                            )}
                          </div>

                          {/* Incomplete tasks (Moved to Backlog) */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                              <Clock size={16} color="#d97706" />
                              <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)' }}>
                                Incomplete Tasks ({allTasksList.length - (sprintTasks?.done?.length || 0)})
                              </h4>
                              <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                                • automatically returned to product backlog upon sprint close
                              </span>
                            </div>

                            {allTasksList.filter((t) => t.status !== 'done').length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {allTasksList
                                  .filter((t) => t.status !== 'done')
                                  .map((task) => (
                                    <div
                                      key={task.taskId}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 12px',
                                        backgroundColor: '#fffbeb',
                                        borderRadius: 'var(--radius-xs)',
                                        border: '1px solid #fde68a',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <AlertTriangle size={14} color="#d97706" />
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-800)' }}>
                                          {task.title}
                                        </span>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '11px', color: '#b45309' }}>
                                          Moved to Backlog
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            backgroundColor: '#fef3c7',
                                            color: '#b45309',
                                            padding: '2px 7px',
                                            borderRadius: 'var(--radius-full)',
                                          }}
                                        >
                                          {task.storyPoints || 0} pts
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', color: '#059669', fontStyle: 'italic' }}>
                                All planned sprint items were 100% resolved before closure!
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* TAB 3: TEAM PERFORMANCE */}
                      {activeTab === 'team' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {teamPerformance.map((member, idx) => {
                            const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                            const initials = member.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase() || 'U';

                            const pointShare = sprintDetails.totalPoints > 0
                              ? Math.round((member.completedPoints / sprintDetails.totalPoints) * 100)
                              : 0;

                            return (
                              <div
                                key={member.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '12px 14px',
                                  backgroundColor: 'var(--slate-50)',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--slate-150)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      backgroundColor: color.bg,
                                      color: color.text,
                                      border: `1px solid ${color.border}`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '13px',
                                      fontWeight: 700,
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

                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)' }}>
                                      {member.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                                      {member.completedTasksCount}/{member.tasksCount} tasks completed
                                    </div>
                                  </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)' }}>
                                    {member.completedPoints} pts resolved
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                                    {pointShare}% of sprint points
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* TAB 4: RETROSPECTIVE */}
                      {activeTab === 'retrospective' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <p style={{ fontSize: '13px', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                            Capture lessons learned, celebrate wins, and record team commitments for continuous improvement.
                          </p>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                              Sprint Summary Notes
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Overall recap of the sprint iteration..."
                              value={retroSummary}
                              onChange={(e) => setEditedSummary(e.target.value)}
                              disabled={isViewerOnly}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--slate-300)',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                                resize: 'vertical',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#059669', marginBottom: '4px' }}>
                              Key Achievements (What went well)
                            </label>
                            <textarea
                              rows={2}
                              placeholder="List milestones hit, technical breakthroughs, or process wins..."
                              value={retroAchievements}
                              onChange={(e) => setEditedAchievements(e.target.value)}
                              disabled={isViewerOnly}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid #a7f3d0',
                                backgroundColor: '#f0fdf4',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                                resize: 'vertical',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#d97706', marginBottom: '4px' }}>
                              Challenges (What could be improved)
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Blockers encountered, estimation misses, or scope creep..."
                              value={retroChallenges}
                              onChange={(e) => setEditedChallenges(e.target.value)}
                              disabled={isViewerOnly}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid #fde68a',
                                backgroundColor: '#fffbeb',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                                resize: 'vertical',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                              Next Sprint Improvements (Action Items)
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Concrete adjustments for the upcoming sprint..."
                              value={retroImprovements}
                              onChange={(e) => setEditedImprovements(e.target.value)}
                              disabled={isViewerOnly}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--primary-border)',
                                backgroundColor: 'var(--primary-subtle)',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                                resize: 'vertical',
                              }}
                            />
                          </div>

                          {!isViewerOnly && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                              <Button
                                variant="primary"
                                size="md"
                                onClick={handleSaveRetrospective}
                                disabled={isSavingRetro}
                                icon={isSavingRetro ? <RotateCw size={14} className="spin" /> : <Save size={14} />}
                              >
                                {isSavingRetro ? 'Saving Retrospective...' : 'Save Retrospective Notes'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* ========================================================================= */}
                  {/* 3. VELOCITY TRENDS CHART (BOTTOM)                                         */}
                  {/* ========================================================================= */}
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
                          Velocity Trends & Forecasting
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                          Completed story points across all closed sprints
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                          }}
                        >
                          Forecast: ~{averageVelocity} pts next sprint
                        </span>
                      </div>
                    </div>

                    {/* SVG Velocity Chart */}
                    <div style={{ width: '100%', height: '160px' }}>
                      {(() => {
                        const chartSprints = [...allClosedSprints].reverse();
                        const maxVal = Math.max(1, ...chartSprints.map((s) => s.completedPoints || 1));
                        const chartW = 500;
                        const chartH = 110;
                        const padL = 36;
                        const padT = 16;
                        const numBars = chartSprints.length;
                        const barGap = chartW / numBars;
                        const barWidth = Math.min(42, barGap * 0.55);

                        const trendPoints = chartSprints.map((s, idx) => {
                          const pts = s.completedPoints || 0;
                          const cx = padL + idx * barGap + barGap / 2;
                          const cy = padT + (1 - pts / maxVal) * chartH;
                          return { cx, cy, pts, name: s.name };
                        });

                        const trendPolyline = trendPoints.map((p) => `${p.cx},${p.cy}`).join(' ');

                        return (
                          <svg viewBox="0 0 580 160" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                            <defs>
                              <linearGradient id="historyVelocityGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4f46e5" />
                                <stop offset="100%" stopColor="#818cf8" />
                              </linearGradient>
                            </defs>

                            {/* Average guideline */}
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
                                  x={padL + chartW + 6}
                                  y={padT + (1 - averageVelocity / maxVal) * chartH + 3}
                                  fontSize="10"
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
                            {chartSprints.map((s, idx) => {
                              const pts = s.completedPoints || 0;
                              const barH = (pts / maxVal) * chartH;
                              const bx = padL + idx * barGap + (barGap - barWidth) / 2;
                              const by = padT + (chartH - barH);

                              return (
                                <g key={s.sprintId}>
                                  <rect
                                    x={bx}
                                    y={by}
                                    width={barWidth}
                                    height={Math.max(4, barH)}
                                    rx="4"
                                    fill="url(#historyVelocityGrad)"
                                  />
                                  <text
                                    x={bx + barWidth / 2}
                                    y={padT + chartH + 16}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="600"
                                    fill="var(--slate-600)"
                                  >
                                    {s.name.length > 9 ? `${s.name.slice(0, 9)}…` : s.name}
                                  </text>
                                  <text
                                    x={bx + barWidth / 2}
                                    y={by - 4}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="700"
                                    fill="var(--slate-800)"
                                  >
                                    {pts}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Trendline */}
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
                  </Card>
                </>
              ) : (
                <EmptyState
                  compact
                  icon={<FileText size={24} />}
                  title="Select a sprint"
                  description="Choose a closed sprint from the left column to inspect its retrospective metrics."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
