import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { useWorkspaceAuth } from '../hooks/useWorkspaceAuth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import {
  ChevronRight,
  Plus,
  Play,
  CheckCircle2,
  Calendar,
  Zap,
  Edit2,
  Trash2,
  Search,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Target,
  GripVertical,
  TrendingUp,
  FolderKanban,
  ListTodo,
} from 'lucide-react';

interface SprintPlanningPageProps {
  onNavigate: (route: string) => void;
  projectId?: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

type KanbanStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

const STATUS_COLUMNS: { id: KanbanStatus; label: string; color: string; bg: string; border: string }[] = [
  { id: 'todo', label: 'To Do', color: 'var(--slate-700)', bg: 'var(--slate-100)', border: 'var(--slate-250, #cbd5e1)' },
  { id: 'in_progress', label: 'In Progress', color: 'var(--primary)', bg: 'var(--primary-light)', border: 'var(--primary-border)' },
  { id: 'in_review', label: 'In Review', color: 'var(--warning)', bg: 'var(--warning-light)', border: '#fde68a' },
  { id: 'done', label: 'Done', color: 'var(--success)', bg: 'var(--success-light)', border: '#a7f3d0' },
];

function getPriorityBadge(priority?: string) {
  switch (priority) {
    case 'urgent':
      return { label: 'Urgent', bg: 'var(--danger-light)', color: 'var(--danger)', border: '#fca5a5' };
    case 'high':
      return { label: 'High', bg: '#fff7ed', color: '#c2410c', border: '#fdba74' };
    case 'medium':
      return { label: 'Medium', bg: 'var(--warning-light)', color: 'var(--warning)', border: '#fde68a' };
    case 'low':
      return { label: 'Low', bg: 'var(--slate-100)', color: 'var(--slate-600)', border: 'var(--slate-200)' };
    default:
      return { label: 'Medium', bg: 'var(--slate-100)', color: 'var(--slate-600)', border: 'var(--slate-200)' };
  }
}

function formatDate(timestamp?: number) {
  if (!timestamp) return 'No date';
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysRemaining(endDate?: number) {
  if (!endDate) return null;
  const now = Date.now();
  const diff = endDate - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, isOverdue: true };
  if (days === 0) return { text: 'Ends today', isOverdue: false };
  if (days === 1) return { text: '1 day left', isOverdue: false };
  return { text: `${days} days left`, isOverdue: false };
}

export const SprintPlanningPage: React.FC<SprintPlanningPageProps> = ({
  onNavigate,
  projectId: propProjectId,
}) => {
  const { user } = useCurrentUser();
  const currentUserId = user.userId ? (user.userId as Id<'users'>) : undefined;
  const { workspace, canPerform, isOwner, isAdmin } = useWorkspaceAuth();

  // Toast feedback state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastCounterRef = useRef(0);
  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    toastCounterRef.current += 1;
    const id = `toast-${toastCounterRef.current}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Workspace Projects
  const projects = useQuery(
    api.projects.getWorkspaceProjects,
    workspace ? { workspaceId: workspace.id as Id<'workspaces'> } : 'skip'
  );

  // Active Project ID resolution
  const activeProjectId = useMemo(() => {
    if (propProjectId) return propProjectId as Id<'projects'>;
    if (projects && projects.length > 0) return projects[0].id as Id<'projects'>;
    return null;
  }, [propProjectId, projects]);

  const activeProject = useQuery(
    api.projects.getProjectDetails,
    activeProjectId ? { projectId: activeProjectId } : 'skip'
  );

  // Workspace Members for Assignee picking
  const members = useQuery(
    api.members.getWorkspaceMembers,
    workspace ? { workspaceId: workspace.id as Id<'workspaces'> } : 'skip'
  );

  // Sprints for this project
  const sprints = useQuery(
    api.sprints.getProjectSprints,
    activeProjectId ? { projectId: activeProjectId, includeArchived: true } : 'skip'
  );

  // Selected Sprint ID with user selection and fallback derivation
  const [userSelectedSprintId, setUserSelectedSprintId] = useState<Id<'sprints'> | null>(null);

  const selectedSprintId = useMemo(() => {
    if (userSelectedSprintId) {
      const exists = sprints?.some((s) => s._id === userSelectedSprintId);
      if (exists) return userSelectedSprintId;
    }
    if (!sprints || sprints.length === 0) return null;
    const active = sprints.find((s) => s.status === 'active');
    if (active) return active._id;
    const planning = sprints.find((s) => s.status === 'planning');
    if (planning) return planning._id;
    return sprints[0]._id;
  }, [sprints, userSelectedSprintId]);

  // Selected Sprint Details Query
  const selectedSprintDetails = useQuery(
    api.sprints.getSprintDetails,
    selectedSprintId ? { sprintId: selectedSprintId } : 'skip'
  );

  // Sprint Tasks (grouped by status)
  const sprintTasks = useQuery(
    api.sprints.getSprintTasks,
    selectedSprintId ? { sprintId: selectedSprintId } : 'skip'
  );

  // Project Backlog Tasks
  const backlogTasks = useQuery(
    api.sprints.getProjectBacklog,
    activeProjectId ? { projectId: activeProjectId } : 'skip'
  );

  // Mutations
  const updateSprintMutation = useMutation(api.sprints.updateSprint);
  const startSprintMutation = useMutation(api.sprints.startSprint);
  const closeSprintMutation = useMutation(api.sprints.closeSprint);
  const deleteSprintMutation = useMutation(api.sprints.deleteSprint);

  const createTaskMutation = useMutation(api.tasks.createTask);
  const updateTaskMutation = useMutation(api.tasks.updateTask);
  const updateTaskStatusMutation = useMutation(api.tasks.updateTaskStatus);
  const moveTaskToSprintMutation = useMutation(api.tasks.moveTaskToSprint);
  const moveTaskToBacklogMutation = useMutation(api.tasks.moveTaskToBacklog);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask);

  // View Toggle: "Planning View" | "Backlog View"
  const [viewMode, setViewMode] = useState<'planning' | 'backlog'>('planning');

  // Left Panel Accordions
  const [activeAccordionOpen, setActiveAccordionOpen] = useState(true);
  const [planningAccordionOpen, setPlanningAccordionOpen] = useState(true);
  const [closedAccordionOpen, setClosedAccordionOpen] = useState(false);

  // Modals state
  const [isCreateSprintModalOpen, setIsCreateSprintModalOpen] = useState(false);
  const [isSprintDetailsModalOpen, setIsSprintDetailsModalOpen] = useState(false);
  const [sprintDetailsTab, setSprintDetailsTab] = useState<'overview' | 'tasks' | 'velocity'>('overview');
  const [isStartSprintModalOpen, setIsStartSprintModalOpen] = useState(false);
  const [isCloseSprintModalOpen, setIsCloseSprintModalOpen] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState<{ id: Id<'sprints'>; name: string } | null>(null);

  // Task Modal (Create or Edit)
  const [taskModalData, setTaskModalData] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    task?: any;
    targetSprintId?: Id<'sprints'>;
  }>({
    isOpen: false,
    mode: 'create',
  });

  // Backlog search & filter state
  const [backlogSearch, setBacklogSearch] = useState('');
  const [backlogPriorityFilter, setBacklogPriorityFilter] = useState<string>('all');
  const [backlogPage, setBacklogPage] = useState(1);
  const BACKLOG_PAGE_SIZE = 20;

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<Id<'tasks'> | null>(null);
  const [draggedFromSource, setDraggedFromSource] = useState<'kanban' | 'backlog' | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<KanbanStatus | 'backlog' | null>(null);

  // Categorize sprints
  const activeSprint = useMemo(() => sprints?.find((s) => s.status === 'active'), [sprints]);
  const planningSprints = useMemo(() => sprints?.filter((s) => s.status === 'planning') || [], [sprints]);
  const closedSprints = useMemo(() => sprints?.filter((s) => s.status === 'closed') || [], [sprints]);

  // Filtered & Paginated Backlog
  const filteredBacklog = useMemo(() => {
    if (!backlogTasks) return [];
    return backlogTasks.filter((task) => {
      const matchesSearch =
        !backlogSearch.trim() ||
        task.title.toLowerCase().includes(backlogSearch.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(backlogSearch.toLowerCase()));

      const matchesPriority =
        backlogPriorityFilter === 'all' || task.priority === backlogPriorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [backlogTasks, backlogSearch, backlogPriorityFilter]);

  const totalBacklogPages = Math.ceil(filteredBacklog.length / BACKLOG_PAGE_SIZE) || 1;
  const paginatedBacklog = useMemo(() => {
    const start = (backlogPage - 1) * BACKLOG_PAGE_SIZE;
    return filteredBacklog.slice(start, start + BACKLOG_PAGE_SIZE);
  }, [filteredBacklog, backlogPage]);

  // Permissions helper
  const canCreateTask = isOwner || isAdmin || canPerform('create_task') || canPerform('task:create');
  const canUpdateTask = isOwner || isAdmin || canPerform('edit_task') || canPerform('task:update');
  const canDeleteTask = isOwner || isAdmin || canPerform('delete_task') || canPerform('task:delete');
  const canCreateSprint = isOwner || isAdmin || canPerform('create_project') || canPerform('sprint:create');
  const canUpdateSprint = isOwner || isAdmin || canPerform('edit_project') || canPerform('sprint:update');
  const canDeleteSprint = isOwner || isAdmin || canPerform('delete_project') || canPerform('sprint:delete');

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, taskId: Id<'tasks'>, source: 'kanban' | 'backlog') => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
    setDraggedFromSource(source);
  };

  const handleDragOver = (e: React.DragEvent, column: KanbanStatus | 'backlog') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== column) {
      setActiveDropColumn(column);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle Drop on Kanban Column
  const handleDropOnColumn = async (columnId: KanbanStatus) => {
    setActiveDropColumn(null);
    if (!draggedTaskId || !currentUserId) return;

    try {
      if (draggedFromSource === 'backlog') {
        if (!selectedSprintId) {
          addToast('error', 'Select a sprint first to add tasks to it.');
          return;
        }
        await moveTaskToSprintMutation({
          taskId: draggedTaskId,
          sprintId: selectedSprintId,
          userId: currentUserId,
        });
        if (columnId !== 'todo') {
          await updateTaskStatusMutation({
            taskId: draggedTaskId,
            newStatus: columnId,
            userId: currentUserId,
          });
        }
        addToast('success', `Moved task to sprint (${columnId.replace('_', ' ')})`);
      } else {
        await updateTaskStatusMutation({
          taskId: draggedTaskId,
          newStatus: columnId,
          userId: currentUserId,
        });
        addToast('success', `Task updated to ${columnId.replace('_', ' ')}`);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to move task.');
    } finally {
      setDraggedTaskId(null);
      setDraggedFromSource(null);
    }
  };

  // Handle Drop on Backlog Drop Zone
  const handleDropOnBacklog = async () => {
    setActiveDropColumn(null);
    if (!draggedTaskId || !currentUserId) return;

    if (draggedFromSource === 'kanban') {
      try {
        await moveTaskToBacklogMutation({
          taskId: draggedTaskId,
          userId: currentUserId,
        });
        addToast('success', 'Moved task back to product backlog');
      } catch (err: any) {
        addToast('error', err.message || 'Failed to move task to backlog.');
      }
    }
    setDraggedTaskId(null);
    setDraggedFromSource(null);
  };

  return (
    <DashboardLayout
      activeItem="projects"
      onSelectItem={() => {}}
      onNavigate={onNavigate}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '85vh' }}>
        {/* TOP BAR / BREADCRUMBS & VIEW TOGGLE */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            backgroundColor: 'var(--white)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--slate-200)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          {/* Breadcrumbs & Project Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onNavigate('/projects')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: 'var(--slate-500)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--radius-xs)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-500)')}
            >
              <FolderKanban size={15} />
              <span>Projects</span>
            </button>

            <ChevronRight size={14} style={{ color: 'var(--slate-400)' }} />

            {/* Project Picker */}
            {projects && projects.length > 1 ? (
              <div style={{ position: 'relative' }}>
                <select
                  value={activeProjectId || ''}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    onNavigate(`/projects/${nextId}/sprints/planning`);
                  }}
                  style={{
                    appearance: 'none',
                    backgroundColor: 'var(--slate-100)',
                    border: '1px solid var(--slate-250, #cbd5e1)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '4px 28px 4px 10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--slate-800)',
                    cursor: 'pointer',
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--slate-500)',
                  }}
                />
              </div>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-800)' }}>
                {activeProject?.name || 'Project'}
              </span>
            )}

            <ChevronRight size={14} style={{ color: 'var(--slate-400)' }} />

            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--primary)',
                backgroundColor: 'var(--primary-light)',
                padding: '3px 10px',
                borderRadius: '12px',
              }}
            >
              Sprint Planning
            </span>
          </div>

          {/* View Toggle & Create Sprint Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* View Toggle */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--slate-100)',
                padding: '3px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--slate-200)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('planning')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'planning' ? 'var(--white)' : 'transparent',
                  color: viewMode === 'planning' ? 'var(--primary)' : 'var(--slate-600)',
                  boxShadow: viewMode === 'planning' ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Layers size={14} />
                <span>Planning View</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('backlog')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'backlog' ? 'var(--white)' : 'transparent',
                  color: viewMode === 'backlog' ? 'var(--primary)' : 'var(--slate-600)',
                  boxShadow: viewMode === 'backlog' ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ListTodo size={14} />
                <span>Backlog View</span>
              </button>
            </div>

            {/* Create Sprint Button */}
            {canCreateSprint && (
              <Button
                variant="primary"
                onClick={() => setIsCreateSprintModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
              >
                <Plus size={16} />
                <span>Create Sprint</span>
              </Button>
            )}
          </div>
        </div>

        {/* MAIN BODY: 2-PANEL LAYOUT (LEFT: SPRINTS LIST, RIGHT: DETAILS & BOARD) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: '20px',
            alignItems: 'start',
          }}
          className="sprint-planning-grid"
        >
          {/* ========================================================= */}
          {/* LEFT PANEL: SPRINTS LIST ACCORDIONS                      */}
          {/* ========================================================= */}
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-xs)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--slate-150)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Sprints
              </h2>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-500)', backgroundColor: 'var(--slate-100)', padding: '2px 8px', borderRadius: '10px' }}>
                {sprints?.length || 0}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}>
              {/* ACCORDION 1: ACTIVE SPRINT */}
              <div style={{ marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveAccordionOpen(!activeAccordionOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    background: 'var(--slate-50)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--slate-700)',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                    <span>Active Sprint</span>
                  </div>
                  {activeAccordionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {activeAccordionOpen && (
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {activeSprint ? (
                      <div
                        onClick={() => setUserSelectedSprintId(activeSprint._id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1.5px solid ${selectedSprintId === activeSprint._id ? 'var(--primary)' : 'var(--slate-200)'}`,
                          backgroundColor: selectedSprintId === activeSprint._id ? 'var(--primary-light)' : 'var(--white)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)' }}>
                            {activeSprint.name}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success)', backgroundColor: 'var(--success-light)', padding: '2px 6px', borderRadius: '4px' }}>
                            ACTIVE
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--slate-500)', marginTop: '6px' }}>
                          <span>
                            {getDaysRemaining(activeSprint.endDate)?.text || 'In progress'}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>
                            {activeSprint.completedPoints}/{activeSprint.capacity || 0} pts
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                        No sprint currently active
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ACCORDION 2: PLANNING SPRINTS */}
              <div style={{ marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPlanningAccordionOpen(!planningAccordionOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    background: 'var(--slate-50)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--slate-700)',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)' }} />
                    <span>Planning ({planningSprints.length})</span>
                  </div>
                  {planningAccordionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {planningAccordionOpen && (
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {planningSprints.length > 0 ? (
                      planningSprints.map((sprint) => {
                        const isSelected = selectedSprintId === sprint._id;
                        return (
                          <div
                            key={sprint._id}
                            onClick={() => setUserSelectedSprintId(sprint._id)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--slate-200)'}`,
                              backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--white)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              position: 'relative',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)' }}>
                                {sprint.name}
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                {canDeleteSprint && (
                                  <button
                                    type="button"
                                    onClick={() => setSprintToDelete({ id: sprint._id, name: sprint.name })}
                                    style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: '2px' }}
                                    title="Delete sprint"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--slate-500)' }}>
                              <span>{formatDate(sprint.startDate)}</span>
                              <span style={{ fontWeight: 600 }}>{sprint.capacity || 0} pts</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                        No planning sprints
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ACCORDION 3: CLOSED SPRINTS */}
              <div style={{ marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setClosedAccordionOpen(!closedAccordionOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    background: 'var(--slate-50)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--slate-700)',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--slate-400)' }} />
                    <span>Closed ({closedSprints.length})</span>
                  </div>
                  {closedAccordionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {closedAccordionOpen && (
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {closedSprints.length > 0 ? (
                      closedSprints.map((sprint) => {
                        const isSelected = selectedSprintId === sprint._id;
                        return (
                          <div
                            key={sprint._id}
                            onClick={() => setUserSelectedSprintId(sprint._id)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--slate-200)'}`,
                              backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--slate-50)',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-700)' }}>
                                {sprint.name}
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)' }}>
                                {sprint.completedPoints} pts
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                        No closed sprints
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Create Sprint Button in Left Panel */}
            {canCreateSprint && (
              <div style={{ padding: '12px', borderTop: '1px solid var(--slate-150)', marginTop: 'auto' }}>
                <Button
                  variant="ghost"
                  onClick={() => setIsCreateSprintModalOpen(true)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <Plus size={14} />
                  <span>New Sprint</span>
                </Button>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT PANEL: MAIN SPRINT DETAILS & PLANNING VIEW         */}
          {/* ========================================================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            {!selectedSprintDetails ? (
              <div
                style={{
                  backgroundColor: 'var(--white)',
                  padding: '48px 24px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-200)',
                  textAlign: 'center',
                }}
              >
                <EmptyState
                  icon={<Layers size={40} style={{ color: 'var(--primary)' }} />}
                  title="Select a sprint to plan"
                  description="Choose an existing sprint from the left panel or create a new sprint to begin organizing tasks."
                  actionLabel={canCreateSprint ? 'Create Sprint' : undefined}
                  onAction={canCreateSprint ? () => setIsCreateSprintModalOpen(true) : undefined}
                />
              </div>
            ) : (
              <>
                {/* SPRINT DETAILS HEADER CARD */}
                <div
                  style={{
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-200)',
                    padding: '20px 24px',
                    boxShadow: 'var(--shadow-xs)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {/* Top Row: Name, Status Chip & Quick Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                        {selectedSprintDetails.name}
                      </h1>

                      {/* Status Chip */}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          backgroundColor:
                            selectedSprintDetails.status === 'active'
                              ? 'var(--success-light)'
                              : selectedSprintDetails.status === 'planning'
                              ? 'var(--warning-light)'
                              : 'var(--slate-150)',
                          color:
                            selectedSprintDetails.status === 'active'
                              ? 'var(--success)'
                              : selectedSprintDetails.status === 'planning'
                              ? 'var(--warning)'
                              : 'var(--slate-600)',
                          border: `1px solid ${
                            selectedSprintDetails.status === 'active'
                              ? '#a7f3d0'
                              : selectedSprintDetails.status === 'planning'
                              ? '#fde68a'
                              : 'var(--slate-200)'
                          }`,
                        }}
                      >
                        {selectedSprintDetails.status}
                      </span>
                    </div>

                    {/* Quick Sprint Actions: Start Sprint / Close Sprint / Settings */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {selectedSprintDetails.status === 'planning' && canUpdateSprint && (
                        <Button
                          variant="primary"
                          onClick={() => setIsStartSprintModalOpen(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'var(--success)',
                            borderColor: 'var(--success)',
                          }}
                        >
                          <Play size={14} />
                          <span>Start Sprint</span>
                        </Button>
                      )}

                      {selectedSprintDetails.status === 'active' && canUpdateSprint && (
                        <Button
                          variant="primary"
                          onClick={() => setIsCloseSprintModalOpen(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'var(--slate-800)',
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Close Sprint</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSprintDetailsTab('overview');
                          setIsSprintDetailsModalOpen(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Edit2 size={14} />
                        <span>Sprint Details</span>
                      </Button>
                    </div>
                  </div>

                  {/* Goal Text Banner */}
                  {selectedSprintDetails.goal && (
                    <div
                      style={{
                        backgroundColor: 'var(--slate-50)',
                        borderLeft: '4px solid var(--primary)',
                        padding: '10px 14px',
                        borderRadius: '0 var(--radius-xs) var(--radius-xs) 0',
                        fontSize: '13px',
                        color: 'var(--slate-700)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Target size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>Goal:</span>
                      <span>{selectedSprintDetails.goal}</span>
                    </div>
                  )}

                  {/* Stats Row: Dates, Capacity & Progress */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--slate-150)',
                    }}
                  >
                    {/* Date Range */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--slate-100)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--slate-600)',
                        }}
                      >
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--slate-400)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Timeline
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-800)' }}>
                          {formatDate(selectedSprintDetails.startDate)} → {formatDate(selectedSprintDetails.endDate)}
                        </div>
                        {selectedSprintDetails.status === 'active' && (
                          <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                            {getDaysRemaining(selectedSprintDetails.endDate)?.text}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Capacity & Completed Story Points */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--primary-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)',
                        }}
                      >
                        <Zap size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--slate-500)', marginBottom: '4px' }}>
                          <span>CAPACITY PROGRESS</span>
                          <span style={{ color: 'var(--slate-900)', fontWeight: 700 }}>
                            {selectedSprintDetails.completedPoints} / {selectedSprintDetails.capacity || selectedSprintDetails.totalPoints || 0} pts
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--slate-150)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              backgroundColor: 'var(--success)',
                              borderRadius: '4px',
                              width: `${
                                selectedSprintDetails.capacity
                                  ? Math.min(100, Math.round((selectedSprintDetails.completedPoints / selectedSprintDetails.capacity) * 100))
                                  : selectedSprintDetails.totalPoints
                                  ? Math.min(100, Math.round((selectedSprintDetails.completedPoints / selectedSprintDetails.totalPoints) * 100))
                                  : 0
                              }%`,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* VIEW MODE 1: PLANNING VIEW (KANBAN + SPRINT BACKLOG)     */}
                {/* ========================================================= */}
                {viewMode === 'planning' ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1.2fr)',
                      gap: '20px',
                      alignItems: 'start',
                    }}
                    className="planning-two-columns"
                  >
                    {/* COLUMN 1: SPRINT TASKS (4 KANBAN COLUMNS) */}
                    <div
                      style={{
                        backgroundColor: 'var(--white)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--slate-200)',
                        padding: '16px',
                        boxShadow: 'var(--shadow-xs)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                            Sprint Board
                          </h3>
                          <span style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600 }}>
                            (Drag cards to change status)
                          </span>
                        </div>

                        {canCreateTask && (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setTaskModalData({
                                isOpen: true,
                                mode: 'create',
                                targetSprintId: selectedSprintId || undefined,
                              })
                            }
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                          >
                            <Plus size={14} style={{ marginRight: '4px' }} />
                            Add Sprint Task
                          </Button>
                        )}
                      </div>

                      {/* 4 Status Columns Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '12px',
                        }}
                      >
                        {STATUS_COLUMNS.map((col) => {
                          const tasksInCol = sprintTasks ? (sprintTasks as any)[col.id] || [] : [];
                          const colPoints = tasksInCol.reduce((acc: number, t: any) => acc + (t.storyPoints || 0), 0);
                          const isDropActive = activeDropColumn === col.id;

                          return (
                            <div
                              key={col.id}
                              onDragOver={(e) => handleDragOver(e, col.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={() => handleDropOnColumn(col.id)}
                              style={{
                                backgroundColor: isDropActive ? 'var(--primary-light)' : 'var(--slate-50)',
                                border: `2px dashed ${isDropActive ? 'var(--primary)' : col.border}`,
                                borderRadius: 'var(--radius-sm)',
                                padding: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: '380px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {/* Column Header */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '10px',
                                  paddingBottom: '8px',
                                  borderBottom: `2px solid ${col.border}`,
                                }}
                              >
                                <span style={{ fontSize: '12px', fontWeight: 800, color: col.color, textTransform: 'uppercase' }}>
                                  {col.label}
                                </span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: 'var(--white)',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    color: 'var(--slate-600)',
                                    border: '1px solid var(--slate-200)',
                                  }}
                                >
                                  {tasksInCol.length}
                                </span>
                              </div>

                              {/* Task Cards List */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                {tasksInCol.map((task: any) => {
                                  const pBadge = getPriorityBadge(task.priority);
                                  return (
                                    <div
                                      key={task._id}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, task._id, 'kanban')}
                                      onDoubleClick={() =>
                                        setTaskModalData({
                                          isOpen: true,
                                          mode: 'edit',
                                          task,
                                        })
                                      }
                                      style={{
                                        backgroundColor: 'var(--white)',
                                        borderRadius: 'var(--radius-xs)',
                                        border: '1px solid var(--slate-200)',
                                        padding: '10px',
                                        boxShadow: 'var(--shadow-xs)',
                                        cursor: 'grab',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                      }}
                                    >
                                      {/* Priority Pill & Points */}
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: pBadge.bg,
                                            color: pBadge.color,
                                            border: `1px solid ${pBadge.border}`,
                                          }}
                                        >
                                          {pBadge.label}
                                        </span>

                                        {task.storyPoints !== undefined && (
                                          <span
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 700,
                                              backgroundColor: 'var(--slate-100)',
                                              color: 'var(--slate-700)',
                                              padding: '2px 5px',
                                              borderRadius: '4px',
                                            }}
                                          >
                                            {task.storyPoints} pts
                                          </span>
                                        )}
                                      </div>

                                      {/* Title */}
                                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-900)', lineHeight: 1.3 }}>
                                        {task.title}
                                      </div>

                                      {/* Footer: Assignee & Action */}
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          fontSize: '11px',
                                          color: 'var(--slate-500)',
                                          paddingTop: '6px',
                                          borderTop: '1px solid var(--slate-100)',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <div
                                            style={{
                                              width: '20px',
                                              height: '20px',
                                              borderRadius: '50%',
                                              backgroundColor: 'var(--primary-light)',
                                              color: 'var(--primary)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '10px',
                                              fontWeight: 700,
                                            }}
                                          >
                                            {task.assignee?.avatar ? (
                                              <img
                                                src={task.assignee.avatar}
                                                alt={task.assignee.name}
                                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                              />
                                            ) : (
                                              task.assignee?.name?.[0]?.toUpperCase() || 'U'
                                            )}
                                          </div>
                                          <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {task.assignee?.name || 'Unassigned'}
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setTaskModalData({
                                              isOpen: true,
                                              mode: 'edit',
                                              task,
                                            })
                                          }
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--slate-400)',
                                            cursor: 'pointer',
                                            padding: '2px',
                                          }}
                                          title="Edit Task"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}

                                {tasksInCol.length === 0 && (
                                  <div
                                    style={{
                                      padding: '24px 8px',
                                      textAlign: 'center',
                                      fontSize: '11px',
                                      color: 'var(--slate-400)',
                                      fontStyle: 'italic',
                                    }}
                                  >
                                    Drop task here
                                  </div>
                                )}
                              </div>

                              {/* Column Footer: Points */}
                              <div
                                style={{
                                  marginTop: 'auto',
                                  paddingTop: '8px',
                                  borderTop: '1px solid var(--slate-200)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: 'var(--slate-500)',
                                  textAlign: 'right',
                                }}
                              >
                                {colPoints} pts
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COLUMN 2: SPRINT BACKLOG (FOR PLANNING PHASE) */}
                    <div
                      onDragOver={(e) => handleDragOver(e, 'backlog')}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDropOnBacklog}
                      style={{
                        backgroundColor: activeDropColumn === 'backlog' ? 'var(--warning-light)' : 'var(--white)',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px ${activeDropColumn === 'backlog' ? 'dashed var(--warning)' : 'solid var(--slate-200)'}`,
                        padding: '16px',
                        boxShadow: 'var(--shadow-xs)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        minHeight: '440px',
                      }}
                    >
                      {/* Backlog Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                            Project Backlog
                          </h3>
                          <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                            {filteredBacklog.length} unscheduled tasks
                          </span>
                        </div>

                        {canCreateTask && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setTaskModalData({
                                isOpen: true,
                                mode: 'create',
                              })
                            }
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                          >
                            <Plus size={14} style={{ marginRight: '4px' }} />
                            New Task
                          </Button>
                        )}
                      </div>

                      {/* Search & Filter Bar */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <Input
                            placeholder="Search backlog..."
                            value={backlogSearch}
                            onChange={(e) => {
                              setBacklogSearch(e.target.value);
                              setBacklogPage(1);
                            }}
                            style={{ paddingLeft: '32px', height: '34px', fontSize: '12px' }}
                          />
                          <Search
                            size={14}
                            style={{
                              position: 'absolute',
                              left: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'var(--slate-400)',
                            }}
                          />
                        </div>

                        <select
                          value={backlogPriorityFilter}
                          onChange={(e) => {
                            setBacklogPriorityFilter(e.target.value);
                            setBacklogPage(1);
                          }}
                          style={{
                            height: '34px',
                            backgroundColor: 'var(--slate-50)',
                            border: '1px solid var(--slate-200)',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '12px',
                            color: 'var(--slate-700)',
                            padding: '0 8px',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="all">All Priorities</option>
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>

                      {/* Backlog Items List (Draggable into Sprint) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, maxHeight: '550px', overflowY: 'auto' }}>
                        {paginatedBacklog.length > 0 ? (
                          paginatedBacklog.map((task: any) => {
                            const pBadge = getPriorityBadge(task.priority);
                            return (
                              <div
                                key={task._id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task._id, 'backlog')}
                                style={{
                                  backgroundColor: 'var(--slate-50)',
                                  border: '1px solid var(--slate-200)',
                                  borderRadius: 'var(--radius-xs)',
                                  padding: '10px 12px',
                                  cursor: 'grab',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--white)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--slate-50)')}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <GripVertical size={13} style={{ color: 'var(--slate-400)' }} />
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        backgroundColor: pBadge.bg,
                                        color: pBadge.color,
                                        border: `1px solid ${pBadge.border}`,
                                      }}
                                    >
                                      {pBadge.label}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {task.storyPoints !== undefined && (
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--slate-600)' }}>
                                        {task.storyPoints} pts
                                      </span>
                                    )}

                                    {/* Quick "+ Sprint" Button */}
                                    {selectedSprintId && canUpdateTask && (
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!currentUserId) return;
                                          try {
                                            await moveTaskToSprintMutation({
                                              taskId: task._id,
                                              sprintId: selectedSprintId,
                                              userId: currentUserId,
                                            });
                                            addToast('success', `Added "${task.title}" to sprint.`);
                                          } catch (err: any) {
                                            addToast('error', err.message || 'Failed to move task.');
                                          }
                                        }}
                                        title="Add to selected sprint"
                                        style={{
                                          padding: '2px 6px',
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          backgroundColor: 'var(--primary-light)',
                                          color: 'var(--primary)',
                                          border: '1px solid var(--primary-border)',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                        }}
                                      >
                                        <span>+ Sprint</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-900)' }}>
                                  {task.title}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--slate-500)' }}>
                                  <span>{task.assignee?.name || 'Unassigned'}</span>
                                  <span>{formatDate(task.createdAt)}</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '12px' }}>
                            No backlog tasks found matching criteria.
                          </div>
                        )}
                      </div>

                      {/* Pagination if > 20 tasks */}
                      {totalBacklogPages > 1 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '10px',
                            borderTop: '1px solid var(--slate-150)',
                            fontSize: '12px',
                          }}
                        >
                          <Button
                            variant="ghost"
                            disabled={backlogPage === 1}
                            onClick={() => setBacklogPage((p) => Math.max(1, p - 1))}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Previous
                          </Button>
                          <span style={{ color: 'var(--slate-500)' }}>
                            Page {backlogPage} of {totalBacklogPages}
                          </span>
                          <Button
                            variant="ghost"
                            disabled={backlogPage === totalBacklogPages}
                            onClick={() => setBacklogPage((p) => Math.min(totalBacklogPages, p + 1))}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ========================================================= */
                  /* VIEW MODE 2: DEDICATED FULL BACKLOG VIEW                  */
                  /* ========================================================= */
                  <div
                    style={{
                      backgroundColor: 'var(--white)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--slate-200)',
                      padding: '20px',
                      boxShadow: 'var(--shadow-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                          Project Backlog Management
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '2px 0 0 0' }}>
                          Prioritize unscheduled tasks and assign them to upcoming sprints.
                        </p>
                      </div>

                      {canCreateTask && (
                        <Button
                          variant="primary"
                          onClick={() => setTaskModalData({ isOpen: true, mode: 'create' })}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Plus size={16} />
                          <span>Create Backlog Task</span>
                        </Button>
                      )}
                    </div>

                    {/* Filter row */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
                        <Input
                          placeholder="Search tasks by title or description..."
                          value={backlogSearch}
                          onChange={(e) => setBacklogSearch(e.target.value)}
                          style={{ paddingLeft: '32px' }}
                        />
                        <Search
                          size={14}
                          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }}
                        />
                      </div>

                      <select
                        value={backlogPriorityFilter}
                        onChange={(e) => setBacklogPriorityFilter(e.target.value)}
                        style={{
                          height: '38px',
                          backgroundColor: 'var(--slate-50)',
                          border: '1px solid var(--slate-200)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '13px',
                          color: 'var(--slate-700)',
                          padding: '0 12px',
                        }}
                      >
                        <option value="all">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    {/* Table / List */}
                    <div style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead style={{ backgroundColor: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                          <tr>
                            <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--slate-600)' }}>Task</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--slate-600)' }}>Priority</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--slate-600)' }}>Story Points</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--slate-600)' }}>Assignee</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--slate-600)' }}>Created</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--slate-600)', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBacklog.map((task: any) => {
                            const pBadge = getPriorityBadge(task.priority);
                            return (
                              <tr key={task._id} style={{ borderBottom: '1px solid var(--slate-150)' }}>
                                <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--slate-900)' }}>
                                  {task.title}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: pBadge.bg,
                                      color: pBadge.color,
                                      border: `1px solid ${pBadge.border}`,
                                    }}
                                  >
                                    {pBadge.label}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--slate-700)' }}>
                                  {task.storyPoints !== undefined ? `${task.storyPoints} pts` : '-'}
                                </td>
                                <td style={{ padding: '12px 14px', color: 'var(--slate-600)' }}>
                                  {task.assignee?.name || 'Unassigned'}
                                </td>
                                <td style={{ padding: '12px 14px', color: 'var(--slate-500)', fontSize: '12px' }}>
                                  {formatDate(task.createdAt)}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                    {/* Add to Sprint Dropdown */}
                                    {sprints && sprints.filter((s) => s.status !== 'closed').length > 0 && canUpdateTask && (
                                      <select
                                        defaultValue=""
                                        onChange={async (e) => {
                                          const sId = e.target.value as Id<'sprints'>;
                                          if (!sId || !currentUserId) return;
                                          try {
                                            await moveTaskToSprintMutation({
                                              taskId: task._id,
                                              sprintId: sId,
                                              userId: currentUserId,
                                            });
                                            addToast('success', `Moved "${task.title}" to sprint.`);
                                          } catch (err: any) {
                                            addToast('error', err.message || 'Failed to move task.');
                                          }
                                        }}
                                        style={{
                                          fontSize: '11px',
                                          padding: '3px 6px',
                                          borderRadius: '4px',
                                          border: '1px solid var(--slate-250, #cbd5e1)',
                                          backgroundColor: 'var(--white)',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <option value="" disabled>
                                          + Move to Sprint...
                                        </option>
                                        {sprints
                                          .filter((s) => s.status !== 'closed')
                                          .map((s) => (
                                            <option key={s._id} value={s._id}>
                                              {s.name} ({s.status})
                                            </option>
                                          ))}
                                      </select>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => setTaskModalData({ isOpen: true, mode: 'edit', task })}
                                      style={{ background: 'none', border: 'none', color: 'var(--slate-500)', cursor: 'pointer', padding: '4px' }}
                                    >
                                      <Edit2 size={14} />
                                    </button>

                                    {canDeleteTask && task.status === 'todo' && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!currentUserId) return;
                                          if (window.confirm(`Delete task "${task.title}"?`)) {
                                            try {
                                              await deleteTaskMutation({
                                                taskId: task._id,
                                                userId: currentUserId,
                                              });
                                              addToast('success', 'Task deleted.');
                                            } catch (err: any) {
                                              addToast('error', err.message || 'Failed to delete task.');
                                            }
                                          }
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE SPRINT MODAL                                              */}
      {/* ========================================================================= */}
      {isCreateSprintModalOpen && (
        <CreateSprintModal
          projectId={activeProjectId!}
          onClose={() => setIsCreateSprintModalOpen(false)}
          onSuccess={(sprintId) => {
            setIsCreateSprintModalOpen(false);
            setUserSelectedSprintId(sprintId);
            addToast('success', 'Sprint created. Add tasks to get started.');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SPRINT DETAILS MODAL (Overview, Tasks, Velocity)                 */}
      {/* ========================================================================= */}
      {isSprintDetailsModalOpen && selectedSprintDetails && (
        <SprintDetailsModal
          sprint={selectedSprintDetails}
          activeTab={sprintDetailsTab}
          setActiveTab={setSprintDetailsTab}
          onClose={() => setIsSprintDetailsModalOpen(false)}
          canEdit={canUpdateSprint && selectedSprintDetails.status === 'planning'}
          onUpdate={async (updates) => {
            if (!currentUserId) return;
            try {
              await updateSprintMutation({
                sprintId: selectedSprintDetails._id,
                userId: currentUserId,
                ...updates,
              });
              addToast('success', 'Sprint updated successfully.');
              setIsSprintDetailsModalOpen(false);
            } catch (err: any) {
              addToast('error', err.message || 'Failed to update sprint.');
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: START SPRINT CONFIRMATION                                        */}
      {/* ========================================================================= */}
      {isStartSprintModalOpen && selectedSprintDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success-light)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  Start Sprint: {selectedSprintDetails.name}?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--slate-600)', margin: '2px 0 0 0' }}>
                  Starting the sprint sets its status to Active and begins velocity tracking.
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--slate-50)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', fontSize: '13px', color: 'var(--slate-700)' }}>
              <div><strong>Dates:</strong> {formatDate(selectedSprintDetails.startDate)} → {formatDate(selectedSprintDetails.endDate)}</div>
              <div style={{ marginTop: '4px' }}><strong>Target Capacity:</strong> {selectedSprintDetails.capacity || 0} story points</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button variant="ghost" onClick={() => setIsStartSprintModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                onClick={async () => {
                  if (!currentUserId) return;
                  try {
                    await startSprintMutation({
                      sprintId: selectedSprintDetails._id,
                      userId: currentUserId,
                    });
                    setIsStartSprintModalOpen(false);
                    addToast('success', 'Sprint started!');
                  } catch (err: any) {
                    addToast('error', err.message || 'Failed to start sprint.');
                  }
                }}
              >
                Start Sprint
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CLOSE SPRINT CONFIRMATION                                        */}
      {/* ========================================================================= */}
      {isCloseSprintModalOpen && selectedSprintDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--warning-light)',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  Close Sprint: {selectedSprintDetails.name}?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--slate-600)', margin: '2px 0 0 0' }}>
                  Incomplete tasks will automatically move back to the product backlog.
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--slate-50)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', fontSize: '13px', color: 'var(--slate-700)' }}>
              <div><strong>Achieved Velocity:</strong> {selectedSprintDetails.completedPoints} story points</div>
              <div style={{ marginTop: '4px', color: 'var(--warning)' }}>
                <strong>Note:</strong> Completed tasks will remain archived in this sprint for historical analytics.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button variant="ghost" onClick={() => setIsCloseSprintModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!currentUserId) return;
                  try {
                    const res = await closeSprintMutation({
                      sprintId: selectedSprintDetails._id,
                      userId: currentUserId,
                    });
                    setIsCloseSprintModalOpen(false);
                    addToast('success', `Sprint closed. Velocity: ${res.completedPoints} points`);
                  } catch (err: any) {
                    addToast('error', err.message || 'Failed to close sprint.');
                  }
                }}
              >
                Confirm & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE SPRINT CONFIRMATION                                       */}
      {/* ========================================================================= */}
      {sprintToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--danger-light)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  Delete Sprint?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--slate-600)', margin: '2px 0 0 0' }}>
                  Are you sure you want to delete "{sprintToDelete.name}"? Tasks inside will return to the backlog.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="ghost" onClick={() => setSprintToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (!currentUserId) return;
                  try {
                    await deleteSprintMutation({
                      sprintId: sprintToDelete.id,
                      userId: currentUserId,
                    });
                    if (selectedSprintId === sprintToDelete.id) {
                      setUserSelectedSprintId(null);
                    }
                    setSprintToDelete(null);
                    addToast('success', 'Sprint deleted.');
                  } catch (err: any) {
                    addToast('error', err.message || 'Failed to delete sprint.');
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CREATE OR EDIT TASK MODAL                                        */}
      {/* ========================================================================= */}
      {taskModalData.isOpen && (
        <TaskFormModal
          mode={taskModalData.mode}
          task={taskModalData.task}
          targetSprintId={taskModalData.targetSprintId}
          sprints={sprints || []}
          members={members || []}
          onClose={() => setTaskModalData({ isOpen: false, mode: 'create' })}
          onSave={async (taskValues) => {
            if (!currentUserId) return;
            try {
              if (taskModalData.mode === 'create') {
                await createTaskMutation({
                  projectId: activeProjectId!,
                  sprintId: taskValues.sprintId,
                  title: taskValues.title,
                  description: taskValues.description,
                  priority: taskValues.priority,
                  storyPoints: taskValues.storyPoints,
                  assigneeId: taskValues.assigneeId,
                  dueDate: taskValues.dueDate,
                  userId: currentUserId,
                });
                addToast('success', 'Task created successfully.');
              } else {
                await updateTaskMutation({
                  taskId: taskModalData.task._id,
                  userId: currentUserId,
                  title: taskValues.title,
                  description: taskValues.description,
                  priority: taskValues.priority,
                  storyPoints: taskValues.storyPoints,
                  assigneeId: taskValues.assigneeId,
                  dueDate: taskValues.dueDate,
                });
                addToast('success', 'Task updated successfully.');
              }
              setTaskModalData({ isOpen: false, mode: 'create' });
            } catch (err: any) {
              addToast('error', err.message || 'Failed to save task.');
            }
          }}
          onDelete={
            taskModalData.mode === 'edit' && taskModalData.task?.status === 'todo' && canDeleteTask
              ? async () => {
                  if (!currentUserId) return;
                  try {
                    await deleteTaskMutation({
                      taskId: taskModalData.task._id,
                      userId: currentUserId,
                    });
                    addToast('success', 'Task deleted.');
                    setTaskModalData({ isOpen: false, mode: 'create' });
                  } catch (err: any) {
                    addToast('error', err.message || 'Failed to delete task.');
                  }
                }
              : undefined
          }
        />
      )}

      {/* ========================================================================= */}
      {/* FLOATING TOAST NOTIFICATIONS                                              */}
      {/* ========================================================================= */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 1000,
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                backgroundColor:
                  toast.type === 'success'
                    ? 'var(--success)'
                    : toast.type === 'error'
                    ? 'var(--danger)'
                    : 'var(--slate-900)',
                color: 'var(--white)',
                padding: '10px 16px',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '240px',
                animation: 'slideUp 0.15s ease',
              }}
            >
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 960px) {
          .sprint-planning-grid {
            grid-template-columns: 1fr !important;
          }
          .planning-two-columns {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

/* =========================================================================
 * SUB-COMPONENT: CREATE SPRINT MODAL
 * ========================================================================= */
interface CreateSprintModalProps {
  projectId: Id<'projects'>;
  onClose: () => void;
  onSuccess: (sprintId: Id<'sprints'>) => void;
}

const CreateSprintModal: React.FC<CreateSprintModalProps> = ({
  projectId,
  onClose,
  onSuccess,
}) => {
  const { user } = useCurrentUser();
  const currentUserId = user.userId ? (user.userId as Id<'users'>) : undefined;
  const createSprintMutation = useMutation(api.sprints.createSprint);

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [capacity, setCapacity] = useState<number | ''>(40);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a sprint name.');
      return;
    }
    if (!currentUserId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await createSprintMutation({
        projectId,
        name: name.trim(),
        goal: goal.trim() || undefined,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        capacity: capacity ? Number(capacity) : undefined,
        userId: currentUserId,
      });
      onSuccess(res.sprintId);
    } catch (err: any) {
      setError(err.message || 'Failed to create sprint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: '500px',
          padding: '24px',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
            Create New Sprint
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-xs)', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
              Sprint Name *
            </label>
            <Input
              placeholder="e.g., Sprint 1: Foundation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
              Sprint Goal (Optional)
            </label>
            <textarea
              placeholder="What is the objective of this sprint?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--slate-250, #cbd5e1)',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
              Target Capacity (Story Points)
            </label>
            <Input
              type="number"
              placeholder="e.g. 40"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Sprint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
 * SUB-COMPONENT: SPRINT DETAILS MODAL (Overview, Tasks, Velocity)
 * ========================================================================= */
interface SprintDetailsModalProps {
  sprint: any;
  activeTab: 'overview' | 'tasks' | 'velocity';
  setActiveTab: (tab: 'overview' | 'tasks' | 'velocity') => void;
  onClose: () => void;
  canEdit: boolean;
  onUpdate: (updates: any) => Promise<void>;
}

const SprintDetailsModal: React.FC<SprintDetailsModalProps> = ({
  sprint,
  activeTab,
  setActiveTab,
  onClose,
  canEdit,
  onUpdate,
}) => {
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal || '');
  const [capacity, setCapacity] = useState<number | ''>(sprint.capacity || '');
  const [saving, setSaving] = useState(false);

  const handleSaveOverview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate({
        name: name.trim(),
        goal: goal.trim() || undefined,
        capacity: capacity ? Number(capacity) : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: '580px',
          padding: '24px',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
            {sprint.name} — Details
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--slate-200)',
            marginBottom: '16px',
            gap: '16px',
          }}
        >
          {(['overview', 'tasks', 'velocity'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                padding: '8px 4px',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? 'var(--primary)' : 'var(--slate-600)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <form onSubmit={handleSaveOverview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Sprint Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Sprint Goal
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={!canEdit}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--slate-250, #cbd5e1)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                  Status
                </label>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-800)', padding: '8px 0', textTransform: 'uppercase' }}>
                  {sprint.status}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                  Target Capacity (Points)
                </label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : '')}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--slate-500)', paddingTop: '8px', borderTop: '1px solid var(--slate-150)' }}>
              <div>Created: {formatDate(sprint.createdAt)}</div>
              <div>Timeline: {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}</div>
            </div>

            {canEdit && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <Button variant="ghost" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </form>
        )}

        {/* Tab 2: Tasks */}
        {activeTab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ backgroundColor: 'var(--slate-50)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--slate-200)' }}>
                <div style={{ fontSize: '11px', color: 'var(--slate-500)' }}>To Do</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-800)' }}>
                  {sprint.statusCounts?.todo || 0}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--primary-light)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--primary-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--primary)' }}>In Progress</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                  {sprint.statusCounts?.in_progress || 0}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--warning-light)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '11px', color: 'var(--warning)' }}>In Review</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--warning)' }}>
                  {sprint.statusCounts?.in_review || 0}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--success-light)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '11px', color: 'var(--success)' }}>Done</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--success)' }}>
                  {sprint.statusCounts?.done || 0}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--slate-600)' }}>
              Total tasks in sprint: <strong>{sprint.taskCount || 0}</strong> ({sprint.totalPoints || 0} story points)
            </div>
          </div>
        )}

        {/* Tab 3: Velocity */}
        {activeTab === 'velocity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: 'var(--slate-50)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-700)' }}>
                  Points Completed
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--success)' }}>
                  {sprint.completedPoints} / {sprint.capacity || sprint.totalPoints || 0} pts
                </span>
              </div>

              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--slate-200)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--success)',
                    width: `${
                      sprint.capacity
                        ? Math.min(100, Math.round((sprint.completedPoints / sprint.capacity) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--slate-600)' }}>
              <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
              <span>
                {sprint.status === 'closed'
                  ? `Sprint closed with an achievement rate of ${
                      sprint.capacity
                        ? Math.round((sprint.completedPoints / sprint.capacity) * 100)
                        : 100
                    }%.`
                  : 'Velocity will finalize once the sprint is completed and closed.'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================================
 * SUB-COMPONENT: TASK FORM MODAL (Create or Edit Task)
 * ========================================================================= */
interface TaskFormModalProps {
  mode: 'create' | 'edit';
  task?: any;
  targetSprintId?: Id<'sprints'>;
  sprints: any[];
  members: any[];
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
  mode,
  task,
  targetSprintId,
  sprints,
  members,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(task?.priority || 'medium');
  const [storyPoints, setStoryPoints] = useState<number | ''>(task?.storyPoints !== undefined ? task.storyPoints : 3);
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId || task?.assignee?.id || '');
  const [sprintId, setSprintId] = useState<string>(task?.sprintId || targetSprintId || '');
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        storyPoints: storyPoints !== '' ? Number(storyPoints) : undefined,
        assigneeId: assigneeId ? (assigneeId as Id<'users'>) : undefined,
        sprintId: sprintId ? (sprintId as Id<'sprints'>) : undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save task.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: '520px',
          padding: '24px',
          boxShadow: 'var(--shadow-xl)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
            {mode === 'create' ? 'Create Task' : 'Edit Task'}
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-xs)', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
              Title *
            </label>
            <Input
              placeholder="e.g. Implement user authentication flow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
              Description
            </label>
            <textarea
              placeholder="Add details, acceptance criteria, or technical notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--slate-250, #cbd5e1)',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--slate-250, #cbd5e1)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: 'var(--slate-800)',
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Story Points
              </label>
              <Input
                type="number"
                placeholder="1, 2, 3, 5, 8..."
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--slate-250, #cbd5e1)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: 'var(--slate-800)',
                }}
              >
                <option value="">Unassigned</option>
                {members.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name || m.user?.email || 'Member'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Sprint Assignment
              </label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--slate-250, #cbd5e1)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: 'var(--slate-800)',
                }}
              >
                <option value="">None (Backlog)</option>
                {sprints
                  .filter((s) => s.status !== 'closed')
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
              Due Date (Optional)
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
            {onDelete ? (
              <Button variant="danger" type="button" onClick={onDelete} disabled={loading}>
                Delete Task
              </Button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
