import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useWorkspaceAuth } from '../hooks/useWorkspaceAuth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Layers,
  Milestone as MilestoneIcon,
  X,
  Edit2,
  Trash2,
  Target,
  Printer,
} from 'lucide-react';

interface ProjectRoadmapPageProps {
  onNavigate: (route: string) => void;
  projectId?: string;
}

type ViewMode = 'gantt' | 'milestones' | 'table';
type ZoomLevel = 'day' | 'week' | 'month';

function formatDate(timestamp?: number): string {
  if (!timestamp) return 'Unscheduled';
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'on_track':
    case 'active':
    case 'completed':
    case 'closed':
    case 'done':
      return { label: status === 'on_track' ? 'On Track' : status.replace('_', ' '), bg: 'var(--success-bg, #d1fae5)', color: 'var(--success-dark, #059669)', border: 'var(--success-border, #6ee7b7)' };
    case 'at_risk':
    case 'in_progress':
      return { label: status === 'at_risk' ? 'At Risk' : status.replace('_', ' '), bg: 'var(--warning-bg, #fef3c7)', color: 'var(--warning-dark, #d97706)', border: 'var(--warning-border, #fcd34d)' };
    case 'planned':
    case 'planning':
    case 'todo':
    default:
      return { label: status.replace('_', ' '), bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--border-primary)' };
  }
}

export const ProjectRoadmapPage: React.FC<ProjectRoadmapPageProps> = ({
  onNavigate,
  projectId: propProjectId,
}) => {
  const { workspace, canPerform, isOwner, isAdmin } = useWorkspaceAuth();
  const { user } = useCurrentUser();
  const currentUserId = user.userId ? (user.userId as Id<'users'>) : undefined;
  const workspaceId = workspace?.id ? (workspace.id as Id<'workspaces'>) : undefined;

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('gantt');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [expandedSprints, setExpandedSprints] = useState<Record<string, boolean>>({});
  const [currentTime] = useState(() => Date.now());

  // Workspace projects
  const projects = useQuery(
    api.projects.getWorkspaceProjects,
    workspaceId ? { workspaceId } : 'skip'
  );

  const activeProjectId = useMemo(() => {
    if (propProjectId) return propProjectId as Id<'projects'>;
    if (projects && projects.length > 0) return projects[0].id as Id<'projects'>;
    return null;
  }, [propProjectId, projects]);

  const activeProject = useQuery(
    api.projects.getProjectDetails,
    activeProjectId ? { projectId: activeProjectId } : 'skip'
  );

  // Sprints for this project
  const sprints = useQuery(
    api.sprints.getProjectSprints,
    activeProjectId ? { projectId: activeProjectId, includeArchived: false } : 'skip'
  );

  // Milestones for this project
  const milestones = useQuery(
    api.milestones.getProjectMilestones,
    activeProjectId ? { projectId: activeProjectId } : 'skip'
  );

  // Project tasks for expandable hierarchy
  const projectTasks = useQuery(
    api.tasks.getWorkspaceTasks,
    workspaceId && activeProjectId ? { workspaceId, projectId: activeProjectId } : 'skip'
  );

  // Mutations
  const createMilestoneMutation = useMutation(api.milestones.createMilestone);
  const updateMilestoneMutation = useMutation(api.milestones.updateMilestone);
  const deleteMilestoneMutation = useMutation(api.milestones.deleteMilestone);
  const completeMilestoneMutation = useMutation(api.milestones.completeMilestone);

  // Modal states
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null);
  const [selectedGanttItem, setSelectedGanttItem] = useState<{ type: 'sprint' | 'milestone'; data: any } | null>(null);

  // New Milestone Form State
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneDate, setMilestoneDate] = useState(() =>
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [milestoneSprints, setMilestoneSprints] = useState<Id<'sprints'>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Printable Gantt container ref
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  // Permissions
  const canManage = isOwner || isAdmin || canPerform('project:update') || canPerform('manage_roles');

  // Toggle sprint row expansion
  const toggleSprintExpand = (sprintId: string) => {
    setExpandedSprints((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId],
    }));
  };

  // Calculate timeline start and end dates based on project sprints and milestones
  const timelineSpan = useMemo(() => {
    const now = currentTime;
    let minTime = now - 14 * 24 * 60 * 60 * 1000;
    let maxTime = now + 90 * 24 * 60 * 60 * 1000;

    (sprints || []).forEach((s) => {
      if (s.startDate && s.startDate < minTime) minTime = s.startDate;
      if (s.endDate && s.endDate > maxTime) maxTime = s.endDate;
    });

    (milestones || []).forEach((m) => {
      if (m.targetDate && m.targetDate > maxTime) maxTime = m.targetDate;
      if (m.targetDate && m.targetDate < minTime) minTime = m.targetDate;
    });

    // Pad by 7 days on both ends
    minTime -= 7 * 24 * 60 * 60 * 1000;
    maxTime += 14 * 24 * 60 * 60 * 1000;

    return { minTime, maxTime, totalDuration: maxTime - minTime };
  }, [sprints, milestones, currentTime]);

  // Generate grid columns (timeline columns)
  const timelineColumns = useMemo(() => {
    const cols: { label: string; subLabel: string; start: number; end: number }[] = [];
    const stepDays = zoomLevel === 'day' ? 1 : zoomLevel === 'week' ? 7 : 30;
    const stepMs = stepDays * 24 * 60 * 60 * 1000;

    let current = timelineSpan.minTime;
    while (current < timelineSpan.maxTime) {
      const d = new Date(current);
      let label = '';
      let subLabel = '';

      if (zoomLevel === 'day') {
        label = d.toLocaleDateString(undefined, { weekday: 'short' });
        subLabel = `${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })}`;
      } else if (zoomLevel === 'week') {
        label = `W${Math.ceil(d.getDate() / 7)}`;
        subLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else {
        label = d.toLocaleDateString(undefined, { month: 'short' });
        subLabel = d.getFullYear().toString();
      }

      cols.push({
        label,
        subLabel,
        start: current,
        end: current + stepMs,
      });

      current += stepMs;
    }
    return cols;
  }, [timelineSpan, zoomLevel]);

  // Handle Create/Edit Milestone
  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !workspaceId || !currentUserId) return;
    const trimmed = milestoneName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      const targetTime = new Date(milestoneDate).getTime();
      if (editingMilestone) {
        await updateMilestoneMutation({
          milestoneId: editingMilestone._id,
          name: trimmed,
          description: milestoneDesc.trim() || undefined,
          targetDate: targetTime,
          linkedSprints: milestoneSprints,
        });
      } else {
        await createMilestoneMutation({
          projectId: activeProjectId,
          workspaceId,
          userId: currentUserId,
          name: trimmed,
          description: milestoneDesc.trim() || undefined,
          targetDate: targetTime,
          linkedSprints: milestoneSprints,
        });
      }

      setIsMilestoneModalOpen(false);
      setEditingMilestone(null);
      setMilestoneName('');
      setMilestoneDesc('');
      setMilestoneSprints([]);
    } catch (err: any) {
      alert(err.message || 'Failed to save milestone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export / Print roadmap
  const handleExportRoadmap = () => {
    window.print();
  };

  // Calculate percentage offset and width on Gantt canvas
  const getGanttBarPosition = (start?: number, end?: number) => {
    const s = start || timelineSpan.minTime;
    const e = end || s + 14 * 24 * 60 * 60 * 1000;
    const left = Math.max(0, Math.min(100, ((s - timelineSpan.minTime) / timelineSpan.totalDuration) * 100));
    const right = Math.max(0, Math.min(100, ((e - timelineSpan.minTime) / timelineSpan.totalDuration) * 100));
    const width = Math.max(2, right - left);
    return { left: `${left}%`, width: `${width}%` };
  };

  // Calculate today line position
  const todayPositionPercent = useMemo(() => {
    const now = currentTime;
    const pos = ((now - timelineSpan.minTime) / timelineSpan.totalDuration) * 100;
    return Math.max(0, Math.min(100, pos));
  }, [timelineSpan, currentTime]);

  return (
    <DashboardLayout onNavigate={onNavigate}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
        {/* ========================================================= */}
        {/* 1. ROADMAP HEADER & ACTION CONTROLS                       */}
        {/* ========================================================= */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-primary)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  onClick={() => onNavigate('/projects')}
                  style={{ fontSize: '13px', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                >
                  Projects
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-disabled)' }}>/</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {activeProject?.name || 'Project'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-disabled)' }}>/</span>
                <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700 }}>Roadmap</span>
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Interactive Gantt & Milestone Roadmap
              </h1>
            </div>

            {/* Actions: Export & Add Milestone */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Button
                variant="secondary"
                onClick={handleExportRoadmap}
                style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Export or Print Roadmap"
              >
                <Printer size={15} />
                <span>Export / Print</span>
              </Button>

              {canManage && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingMilestone(null);
                    setMilestoneName('');
                    setMilestoneDesc('');
                    setMilestoneSprints([]);
                    setIsMilestoneModalOpen(true);
                  }}
                  style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>Add Milestone</span>
                </Button>
              )}
            </div>
          </div>

          {/* Subheader Toolbar: View Tabs, Project Switcher, Zoom */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-primary)',
            }}
          >
            {/* View Switcher Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => setViewMode('gantt')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: viewMode === 'gantt' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'gantt' ? 'white' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Layers size={14} />
                <span>Gantt Chart</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('milestones')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: viewMode === 'milestones' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'milestones' ? 'white' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <MilestoneIcon size={14} />
                <span>Milestones ({milestones?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: viewMode === 'table' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'table' ? 'white' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Target size={14} />
                <span>Table Roster</span>
              </button>
            </div>

            {/* Project Picker & Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Project select */}
              {projects && projects.length > 1 && (
                <select
                  value={activeProjectId || ''}
                  onChange={(e) => onNavigate(`/projects/${e.target.value}/roadmap`)}
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Zoom Buttons (only in Gantt view) */}
              {viewMode === 'gantt' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--bg-secondary)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}>
                  <button
                    type="button"
                    onClick={() => setZoomLevel('day')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      backgroundColor: zoomLevel === 'day' ? 'var(--primary)' : 'transparent',
                      color: zoomLevel === 'day' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel('week')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      backgroundColor: zoomLevel === 'week' ? 'var(--primary)' : 'transparent',
                      color: zoomLevel === 'week' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel('month')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      backgroundColor: zoomLevel === 'month' ? 'var(--primary)' : 'transparent',
                      color: zoomLevel === 'month' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Month
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. VIEW 1: GANTT CHART (TIMELINE CANVAS)                  */}
        {/* ========================================================= */}
        {viewMode === 'gantt' && (
          <div
            ref={ganttContainerRef}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-primary)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Gantt Header & Legend */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-secondary)',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--primary)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Active Sprint</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--success)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Closed Sprint</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--slate-400)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Planning</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', transform: 'rotate(45deg)', backgroundColor: 'var(--warning)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Key Milestone</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 600 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
                <span>Today Line</span>
              </div>
            </div>

            {/* Gantt Interactive Canvas Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', overflowX: 'auto', minHeight: '480px' }}>
              {/* Left Item Roster Header */}
              <div style={{ borderRight: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-primary)', height: '48px', display: 'flex', alignItems: 'center' }}>
                  Sprints & Milestones
                </div>

                {/* Sprints List */}
                {(sprints || []).map((sprint) => {
                  const isExpanded = expandedSprints[sprint._id] || false;
                  const sprintTasksForSprint = (projectTasks || []).filter((t: any) => t.sprintId === sprint._id);

                  return (
                    <React.Fragment key={sprint._id}>
                      <div
                        onClick={() => toggleSprintExpand(sprint._id)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          height: '52px',
                          cursor: 'pointer',
                          backgroundColor: 'var(--bg-primary)',
                          transition: 'background-color var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-primary)')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sprint.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, ...getStatusBadge(sprint.status) }}>
                          {sprint.status}
                        </span>
                      </div>

                      {/* Nested Tasks within Sprint */}
                      {isExpanded &&
                        sprintTasksForSprint.map((t: any) => (
                          <div
                            key={t._id}
                            style={{
                              padding: '8px 16px 8px 36px',
                              borderBottom: '1px solid var(--border-primary)',
                              height: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: 'var(--bg-secondary)',
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                              {t.title}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 600 }}>{t.storyPoints ? `${t.storyPoints} pts` : ''}</span>
                          </div>
                        ))}
                    </React.Fragment>
                  );
                })}

                {/* Milestones in Roster */}
                <div style={{ padding: '8px 16px', fontWeight: 700, fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                  Milestones
                </div>
                {(milestones || []).map((m) => (
                  <div
                    key={m._id}
                    onClick={() => setSelectedGanttItem({ type: 'milestone', data: m })}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '52px',
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-primary)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-primary)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{ width: '8px', height: '8px', transform: 'rotate(45deg)', backgroundColor: 'var(--warning)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {new Date(m.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right Gantt Canvas Area */}
              <div style={{ position: 'relative', overflowX: 'auto', minWidth: '700px' }}>
                {/* Timeline Header Row */}
                <div style={{ display: 'flex', height: '48px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                  {timelineColumns.map((col, idx) => (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        minWidth: '60px',
                        borderRight: '1px solid var(--border-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{col.label}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{col.subLabel}</span>
                    </div>
                  ))}
                </div>

                {/* Vertical Today Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${todayPositionPercent}%`,
                    width: '2px',
                    backgroundColor: 'var(--danger)',
                    zIndex: 20,
                    pointerEvents: 'none',
                    boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: '-20px',
                      backgroundColor: 'var(--danger)',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 4px',
                      borderRadius: '3px',
                    }}
                  >
                    TODAY
                  </div>
                </div>

                {/* Sprint Bars Rows */}
                {(sprints || []).map((sprint) => {
                  const isExpanded = expandedSprints[sprint._id] || false;
                  const sprintTasksForSprint = (projectTasks || []).filter((t: any) => t.sprintId === sprint._id);
                  const barPos = getGanttBarPosition(sprint.startDate, sprint.endDate);

                  const progress =
                    sprint.capacity && sprint.capacity > 0
                      ? Math.min(100, Math.round(((sprint.completedPoints || 0) / sprint.capacity) * 100))
                      : sprint.status === 'closed'
                      ? 100
                      : 0;

                  return (
                    <React.Fragment key={sprint._id}>
                      {/* Sprint Bar Row */}
                      <div
                        style={{
                          height: '52px',
                          position: 'relative',
                          borderBottom: '1px solid var(--border-primary)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {/* Background column grid lines */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                          {timelineColumns.map((_, i) => (
                            <div key={i} style={{ flex: 1, minWidth: '60px', borderRight: '1px dashed var(--border-primary)', opacity: 0.5 }} />
                          ))}
                        </div>

                        {/* Interactive Sprint Bar */}
                        <div
                          onClick={() => setSelectedGanttItem({ type: 'sprint', data: sprint })}
                          style={{
                            position: 'absolute',
                            left: barPos.left,
                            width: barPos.width,
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor:
                              sprint.status === 'active'
                                ? 'var(--primary)'
                                : sprint.status === 'closed'
                                ? 'var(--success)'
                                : 'var(--slate-400)',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            cursor: 'pointer',
                            zIndex: 10,
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'transform var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scaleY(1.1)')}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scaleY(1.0)')}
                          title={`${sprint.name} (${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}) • ${progress}% complete`}
                        >
                          {/* Inner Progress Fill */}
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${progress}%`,
                              backgroundColor: 'rgba(255, 255, 255, 0.25)',
                              pointerEvents: 'none',
                            }}
                          />
                          <span style={{ position: 'relative', zIndex: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {sprint.name} ({progress}%)
                          </span>
                        </div>
                      </div>

                      {/* Nested Task Bars */}
                      {isExpanded &&
                        sprintTasksForSprint.map((t: any) => {
                          const taskPos = getGanttBarPosition(t.dueDate ? t.dueDate - 5 * 24 * 60 * 60 * 1000 : sprint.startDate, t.dueDate || sprint.endDate);
                          return (
                            <div
                              key={t._id}
                              style={{
                                height: '40px',
                                position: 'relative',
                                borderBottom: '1px solid var(--border-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: 'var(--bg-secondary)',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  left: taskPos.left,
                                  width: taskPos.width,
                                  height: '18px',
                                  borderRadius: '4px',
                                  backgroundColor: t.status === 'done' ? 'var(--success-border)' : 'var(--primary-light)',
                                  color: 'var(--text-primary)',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0 6px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={t.title}
                              >
                                {t.title}
                              </div>
                            </div>
                          );
                        })}
                    </React.Fragment>
                  );
                })}

                {/* Milestone Marker Rows */}
                <div style={{ height: '30px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }} />
                {(milestones || []).map((m) => {
                  const mPos = getGanttBarPosition(m.targetDate, m.targetDate);
                  return (
                    <div
                      key={m._id}
                      style={{
                        height: '52px',
                        position: 'relative',
                        borderBottom: '1px solid var(--border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {/* Grid line background */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                        {timelineColumns.map((_, i) => (
                          <div key={i} style={{ flex: 1, minWidth: '60px', borderRight: '1px dashed var(--border-primary)', opacity: 0.5 }} />
                        ))}
                      </div>

                      {/* Milestone Diamond Marker */}
                      <div
                        onClick={() => setSelectedGanttItem({ type: 'milestone', data: m })}
                        style={{
                          position: 'absolute',
                          left: mPos.left,
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          zIndex: 15,
                        }}
                        title={`${m.name} • Target: ${formatDate(m.targetDate)}`}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            transform: 'rotate(45deg)',
                            backgroundColor: m.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                            border: '2px solid white',
                            boxShadow: 'var(--shadow-md)',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            backgroundColor: 'var(--bg-primary)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-primary)',
                            boxShadow: 'var(--shadow-xs)',
                          }}
                        >
                          {m.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. VIEW 2: MILESTONES SHOWCASE CARDS                      */}
        {/* ========================================================= */}
        {viewMode === 'milestones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {milestones === undefined ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                Loading milestones...
              </div>
            ) : milestones.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-primary)',
                  padding: '48px 24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <MilestoneIcon size={40} color="var(--primary)" style={{ opacity: 0.5 }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  No Milestones Created
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: 0 }}>
                  Define target release dates, major deliverables, and connect agile sprints to track project velocity.
                </p>
                {canManage && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setEditingMilestone(null);
                      setMilestoneName('');
                      setMilestoneDesc('');
                      setMilestoneSprints([]);
                      setIsMilestoneModalOpen(true);
                    }}
                    style={{ marginTop: '8px' }}
                  >
                    Create First Milestone
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {milestones.map((m) => {
                  const badge = getStatusBadge(m.status);
                  const isPast = m.targetDate < currentTime;
                  const isCompleted = m.status === 'completed';

                  return (
                    <div
                      key={m._id}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-primary)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: 'var(--shadow-sm)',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {badge.label}
                          </span>
                          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 0 0' }}>
                            {m.name}
                          </h3>
                        </div>

                        {canManage && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMilestone(m);
                                setMilestoneName(m.name);
                                setMilestoneDesc(m.description || '');
                                setMilestoneDate(new Date(m.targetDate).toISOString().split('T')[0]);
                                setMilestoneSprints(m.linkedSprints || []);
                                setIsMilestoneModalOpen(true);
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                              title="Edit milestone"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Delete milestone "${m.name}"?`)) {
                                  await deleteMilestoneMutation({ milestoneId: m._id });
                                }
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                              title="Delete milestone"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {m.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                          {m.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                          <span>Sprint Progress</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.progressPercent}%</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${m.progressPercent}%`,
                              height: '100%',
                              backgroundColor: isCompleted ? 'var(--success)' : 'var(--primary)',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </div>

                      {/* Metadata Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', paddingTop: '8px', borderTop: '1px solid var(--border-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarIcon size={12} />
                          <span style={{ color: isPast && !isCompleted ? 'var(--danger)' : 'inherit' }}>
                            {formatDate(m.targetDate)}
                          </span>
                        </div>

                        <div>
                          {m.linkedSprintsCount} {m.linkedSprintsCount === 1 ? 'sprint' : 'sprints'} linked
                        </div>
                      </div>

                      {/* Quick complete button */}
                      {!isCompleted && canManage && (
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            await completeMilestoneMutation({ milestoneId: m._id });
                          }}
                          style={{ fontSize: '12px', justifyContent: 'center' }}
                        >
                          <CheckCircle2 size={14} style={{ marginRight: '6px' }} />
                          <span>Mark Complete</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. VIEW 3: TABLE ROSTER                                   */}
        {/* ========================================================= */}
        {viewMode === 'table' && (
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-primary)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Item</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Type</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Start Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>End / Target Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Sprints in Table */}
                  {(sprints || []).map((sprint) => {
                    const badge = getStatusBadge(sprint.status);
                    const progress =
                      sprint.capacity && sprint.capacity > 0
                        ? Math.min(100, Math.round(((sprint.completedPoints || 0) / sprint.capacity) * 100))
                        : sprint.status === 'closed'
                        ? 100
                        : 0;

                    return (
                      <tr
                        key={sprint._id}
                        style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'pointer' }}
                        onClick={() => setSelectedGanttItem({ type: 'sprint', data: sprint })}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {sprint.name}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>Sprint</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{formatDate(sprint.startDate)}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{formatDate(sprint.endDate)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, ...badge }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Milestones in Table */}
                  {(milestones || []).map((m) => {
                    const badge = getStatusBadge(m.status);
                    return (
                      <tr
                        key={m._id}
                        style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'pointer' }}
                        onClick={() => setSelectedGanttItem({ type: 'milestone', data: m })}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', transform: 'rotate(45deg)', backgroundColor: 'var(--warning)' }} />
                          <span>{m.name}</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--warning-dark, #d97706)', fontWeight: 600 }}>Milestone</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>-</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{formatDate(m.targetDate)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, ...badge }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${m.progressPercent}%`, height: '100%', backgroundColor: 'var(--success)' }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>{m.progressPercent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5. MODAL: CREATE / EDIT MILESTONE                         */}
      {/* ========================================================= */}
      {isMilestoneModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMilestoneModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MilestoneIcon size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editingMilestone ? 'Edit Milestone' : 'Create Project Milestone'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMilestoneModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMilestone} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Milestone Name *
                </label>
                <Input
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  placeholder="e.g. v2.0 Release, Beta Launch"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  placeholder="Key deliverables, launch criteria, or objectives..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-primary)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Target Delivery Date *
                </label>
                <Input
                  type="date"
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                  required
                />
              </div>

              {/* Linked Sprints Multi-picker */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Connected Agile Sprints
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--border-primary)', padding: '8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)' }}>
                  {(sprints || []).map((s) => {
                    const isLinked = milestoneSprints.includes(s._id);
                    return (
                      <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isLinked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMilestoneSprints((prev) => [...prev, s._id]);
                            } else {
                              setMilestoneSprints((prev) => prev.filter((id) => id !== s._id));
                            }
                          }}
                        />
                        <span>{s.name} ({s.status})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <Button variant="ghost" type="button" onClick={() => setIsMilestoneModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmitting || !milestoneName.trim()}>
                  {isSubmitting ? 'Saving...' : editingMilestone ? 'Save Changes' : 'Create Milestone'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: GANTT BAR ITEM DETAILS (SPRINT / MILESTONE)      */}
      {/* ========================================================= */}
      {selectedGanttItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedGanttItem(null);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    ...getStatusBadge(selectedGanttItem.data.status),
                  }}
                >
                  {selectedGanttItem.type === 'sprint' ? 'Sprint' : 'Milestone'}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedGanttItem.data.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGanttItem(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {selectedGanttItem.data.description && (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {selectedGanttItem.data.description}
              </p>
            )}

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              {selectedGanttItem.type === 'sprint' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Dates:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatDate(selectedGanttItem.data.startDate)} &rarr; {formatDate(selectedGanttItem.data.endDate)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Committed Points:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedGanttItem.data.capacity || 0} pts
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Completed:</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                      {selectedGanttItem.data.completedPoints || 0} pts
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Target Date:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatDate(selectedGanttItem.data.targetDate)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Connected Sprints:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedGanttItem.data.linkedSprints?.length || 0} sprints
                    </span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              {selectedGanttItem.type === 'sprint' ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedGanttItem(null);
                    onNavigate(`/projects/${activeProjectId}/sprints`);
                  }}
                >
                  Go to Sprint Planning
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    const m = selectedGanttItem.data;
                    setSelectedGanttItem(null);
                    setEditingMilestone(m);
                    setMilestoneName(m.name);
                    setMilestoneDesc(m.description || '');
                    setMilestoneDate(new Date(m.targetDate).toISOString().split('T')[0]);
                    setMilestoneSprints(m.linkedSprints || []);
                    setIsMilestoneModalOpen(true);
                  }}
                >
                  Edit Milestone
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
