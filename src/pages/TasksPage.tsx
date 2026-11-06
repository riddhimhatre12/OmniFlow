import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { useWorkspaceAuth } from '../hooks/useWorkspaceAuth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import {
  Kanban,
  List as ListIcon,
  Calendar as CalendarIcon,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Calendar,
  FolderKanban,
  ArrowUpRight,
  Layers,
  Clock,
} from 'lucide-react';

interface TasksPageProps {
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

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

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

function formatDueDate(timestamp?: number) {
  if (!timestamp) return null;
  const now = Date.now();
  const diff = timestamp - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const dateStr = new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  if (days < 0) {
    return { text: `${Math.abs(days)}d overdue`, isOverdue: true, isToday: false, dateStr };
  }
  if (days === 0) {
    return { text: 'Due today', isOverdue: false, isToday: true, dateStr };
  }
  if (days === 1) {
    return { text: 'Due tomorrow', isOverdue: false, isToday: false, dateStr };
  }
  return { text: `Due in ${days}d`, isOverdue: false, isToday: false, dateStr };
}

export const TasksPage: React.FC<TasksPageProps> = ({
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

  // Active Project ID
  const activeProjectId = useMemo(() => {
    if (propProjectId) return propProjectId as Id<'projects'>;
    if (projects && projects.length > 0) return projects[0].id as Id<'projects'>;
    return null;
  }, [propProjectId, projects]);

  const activeProject = useQuery(
    api.projects.getProjectDetails,
    activeProjectId ? { projectId: activeProjectId } : 'skip'
  );

  // Workspace Members for Assignee filtering/picking
  const members = useQuery(
    api.members.getWorkspaceMembers,
    workspace ? { workspaceId: workspace.id as Id<'workspaces'> } : 'skip'
  );

  // Sprints for this project
  const sprints = useQuery(
    api.sprints.getProjectSprints,
    activeProjectId ? { projectId: activeProjectId, includeArchived: false } : 'skip'
  );

  // Active sprint query
  const activeSprint = useQuery(
    api.sprints.getActiveSprint,
    activeProjectId ? { projectId: activeProjectId } : 'skip'
  );

  // Selected Sprint Scope ('active' | 'backlog' | sprintId)
  const [selectedSprintScope, setSelectedSprintScope] = useState<string>('active');

  const resolvedSprintId = useMemo<Id<'sprints'> | null>(() => {
    if (selectedSprintScope === 'backlog') return null;
    if (selectedSprintScope === 'active') {
      return activeSprint ? activeSprint._id : null;
    }
    return selectedSprintScope as Id<'sprints'>;
  }, [selectedSprintScope, activeSprint]);

  // View Mode: 'kanban' | 'list' | 'calendar'
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);

  // Tasks Query for Current Sprint Scope
  const sprintTasks = useQuery(
    api.sprints.getSprintTasks,
    resolvedSprintId ? { sprintId: resolvedSprintId } : 'skip'
  );

  const backlogTasks = useQuery(
    api.sprints.getProjectBacklog,
    selectedSprintScope === 'backlog' && activeProjectId ? { projectId: activeProjectId } : 'skip'
  );

  // Flattened and Filtered tasks
  const rawTasksList = useMemo(() => {
    if (selectedSprintScope === 'backlog') {
      return backlogTasks || [];
    }
    if (sprintTasks) {
      return [
        ...(sprintTasks.todo || []),
        ...(sprintTasks.in_progress || []),
        ...(sprintTasks.in_review || []),
        ...(sprintTasks.done || []),
      ];
    }
    return [];
  }, [selectedSprintScope, backlogTasks, sprintTasks]);

  const filteredTasks = useMemo(() => {
    return rawTasksList.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description && task.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }
      // Priority
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      // Status
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      // Assignee (multi-select)
      if (selectedAssigneeIds.length > 0) {
        const taskAssigneeId = task.assigneeId || task.assignee?.id;
        if (!taskAssigneeId || !selectedAssigneeIds.includes(taskAssigneeId)) {
          return false;
        }
      }
      return true;
    });
  }, [rawTasksList, searchQuery, priorityFilter, statusFilter, selectedAssigneeIds]);

  // Tasks grouped by Kanban Column
  const kanbanColumns = useMemo(() => {
    const grouped: Record<KanbanStatus, any[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const t of filteredTasks) {
      const s = (t.status as KanbanStatus) || 'todo';
      if (grouped[s]) {
        grouped[s].push(t);
      } else {
        grouped.todo.push(t);
      }
    }
    // Sort each by order
    for (const key of Object.keys(grouped) as KanbanStatus[]) {
      grouped[key].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return grouped;
  }, [filteredTasks]);

  // Mutations
  const createTaskMutation = useMutation(api.tasks.createTask);
  const updateTaskMutation = useMutation(api.tasks.updateTask);
  const updateTaskStatusMutation = useMutation(api.tasks.updateTaskStatus);
  const moveTaskToBacklogMutation = useMutation(api.tasks.moveTaskToBacklog);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask);

  // Modals state
  const [createModalState, setCreateModalState] = useState<{
    isOpen: boolean;
    initialStatus?: KanbanStatus;
  }>({ isOpen: false });

  const [detailModalTask, setDetailModalTask] = useState<any | null>(null);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<Id<'tasks'> | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<KanbanStatus | null>(null);

  // Permissions check
  const canCreate = isOwner || isAdmin || canPerform('create_task') || canPerform('task:create');
  const canUpdate = isOwner || isAdmin || canPerform('edit_task') || canPerform('task:update');
  const canDelete = isOwner || isAdmin || canPerform('delete_task') || canPerform('task:delete');

  // Keyboard shortcut listener: 'N' to create new task, 'Esc' to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (createModalState.isOpen) setCreateModalState({ isOpen: false });
        if (detailModalTask) setDetailModalTask(null);
      } else if (
        (e.key === 'n' || e.key === 'N') &&
        !createModalState.isOpen &&
        !detailModalTask &&
        canCreate
      ) {
        const target = e.target as HTMLElement;
        const isInputField =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable;
        if (!isInputField) {
          e.preventDefault();
          setCreateModalState({ isOpen: true, initialStatus: 'todo' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createModalState.isOpen, detailModalTask, canCreate]);

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, taskId: Id<'tasks'>) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: KanbanStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== colId) {
      setActiveDropColumn(colId);
    }
  };

  const handleDrop = async (targetStatus: KanbanStatus) => {
    setActiveDropColumn(null);
    if (!draggedTaskId || !currentUserId) return;

    try {
      await updateTaskStatusMutation({
        taskId: draggedTaskId,
        newStatus: targetStatus,
        userId: currentUserId,
      });
      addToast('success', `Moved to ${targetStatus.replace('_', ' ')}`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to move task.');
    } finally {
      setDraggedTaskId(null);
    }
  };

  // Assignee toggle helper
  const toggleAssigneeFilter = (uId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(uId) ? prev.filter((id) => id !== uId) : [...prev, uId]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setStatusFilter('all');
    setSelectedAssigneeIds([]);
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    priorityFilter !== 'all' ||
    statusFilter !== 'all' ||
    selectedAssigneeIds.length > 0;

  return (
    <DashboardLayout
      activeItem="tasks"
      onSelectItem={() => {}}
      onNavigate={onNavigate}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '85vh' }}>
        {/* ========================================================= */}
        {/* 1. HEADER SECTION & NAVIGATION CONTROLS                  */}
        {/* ========================================================= */}
        <div
          style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--slate-200)',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-xs)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Top Bar: Title, Project Switcher, Sprint Selector & Create Task */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderKanban size={20} style={{ color: 'var(--primary)' }} />
                <span>Tasks</span>
              </h1>

              {/* Project Picker (if multiple) */}
              {projects && projects.length > 1 ? (
                <div style={{ position: 'relative' }}>
                  <select
                    value={activeProjectId || ''}
                    onChange={(e) => onNavigate(`/projects/${e.target.value}/tasks`)}
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
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-500)' }}>
                  {activeProject?.name || 'Project'}
                </span>
              )}

              {/* Sprint Selector Dropdown */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-400)' }}>
                  Sprint:
                </span>
                <select
                  value={selectedSprintScope}
                  onChange={(e) => setSelectedSprintScope(e.target.value)}
                  style={{
                    backgroundColor: 'var(--slate-50)',
                    border: '1.5px solid var(--primary-border)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '5px 28px 5px 10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="active">
                    {activeSprint ? `Active: ${activeSprint.name}` : 'Active Sprint (None)'}
                  </option>
                  {sprints && sprints.length > 0 && (
                    <optgroup label="Planning Sprints">
                      {sprints
                        .filter((s) => s.status === 'planning')
                        .map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name} (Planning)
                          </option>
                        ))}
                    </optgroup>
                  )}
                  <option value="backlog">Product Backlog (Unscheduled)</option>
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--primary)',
                  }}
                />
              </div>

              {/* Link to Sprint Planning */}
              {activeProjectId && (
                <button
                  type="button"
                  onClick={() => onNavigate(`/projects/${activeProjectId}/sprints/planning`)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--slate-500)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 6px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-500)')}
                >
                  <Layers size={13} />
                  <span>Sprint Planning</span>
                  <ArrowUpRight size={12} />
                </button>
              )}
            </div>

            {/* View Mode Toggle & Create Task Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Toggle Buttons: Kanban | List | Calendar */}
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
                  onClick={() => setViewMode('kanban')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'kanban' ? 'var(--white)' : 'transparent',
                    color: viewMode === 'kanban' ? 'var(--primary)' : 'var(--slate-600)',
                    boxShadow: viewMode === 'kanban' ? 'var(--shadow-xs)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Kanban size={14} />
                  <span>Kanban</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'list' ? 'var(--white)' : 'transparent',
                    color: viewMode === 'list' ? 'var(--primary)' : 'var(--slate-600)',
                    boxShadow: viewMode === 'list' ? 'var(--shadow-xs)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ListIcon size={14} />
                  <span>List</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'calendar' ? 'var(--white)' : 'transparent',
                    color: viewMode === 'calendar' ? 'var(--primary)' : 'var(--slate-600)',
                    boxShadow: viewMode === 'calendar' ? 'var(--shadow-xs)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CalendarIcon size={14} />
                  <span>Calendar</span>
                </button>
              </div>

              {/* Create Task Button */}
              {canCreate && (
                <Button
                  variant="primary"
                  onClick={() => setCreateModalState({ isOpen: true, initialStatus: 'todo' })}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
                  title="Create new task (Shortcut: N)"
                >
                  <Plus size={16} />
                  <span>Create Task</span>
                  <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '2px' }}>[N]</span>
                </Button>
              )}
            </div>
          </div>

          {/* Filters Bar: Search, Assignee Pills, Priority, Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--slate-150)',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Filter controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Assignee Avatar Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)', marginRight: '4px' }}>
                  Assignee:
                </span>
                {members?.slice(0, 5).map((m: any) => {
                  const isSelected = selectedAssigneeIds.includes(m.userId);
                  const initial = m.user?.name?.[0]?.toUpperCase() || 'U';
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleAssigneeFilter(m.userId)}
                      title={`${m.user?.name || 'Member'}${isSelected ? ' (Selected)' : ''}`}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--slate-250, #cbd5e1)',
                        backgroundColor: isSelected ? 'var(--primary)' : 'var(--slate-100)',
                        color: isSelected ? 'var(--white)' : 'var(--slate-700)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {m.user?.avatar ? (
                        <img
                          src={m.user.avatar}
                          alt={m.user.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        initial
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  height: '32px',
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

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  height: '32px',
                  backgroundColor: 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '12px',
                  color: 'var(--slate-700)',
                  padding: '0 8px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <X size={12} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. MAIN CONTENT AREA (KANBAN | LIST | CALENDAR)           */}
        {/* ========================================================= */}

        {/* Empty State: If no active sprint is selected and not in backlog */}
        {selectedSprintScope === 'active' && !activeSprint ? (
          <div
            style={{
              backgroundColor: 'var(--white)',
              padding: '60px 24px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
              textAlign: 'center',
            }}
          >
            <EmptyState
              icon={<Calendar size={44} style={{ color: 'var(--primary)' }} />}
              title="No active sprint"
              description="There is currently no active sprint in this project. You can start planning a new sprint or review the backlog."
              actionLabel="Start Planning"
              onAction={() =>
                activeProjectId && onNavigate(`/projects/${activeProjectId}/sprints/planning`)
              }
              secondaryActionLabel="View Backlog"
              onSecondaryAction={() => setSelectedSprintScope('backlog')}
            />
          </div>
        ) : viewMode === 'kanban' ? (
          /* ========================================================= */
          /* VIEW 1: KANBAN BOARD (DEFAULT)                            */
          /* ========================================================= */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(240px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
            className="tasks-kanban-grid"
          >
            {STATUS_COLUMNS.map((col) => {
              const tasksInCol = kanbanColumns[col.id] || [];
              const totalColPoints = tasksInCol.reduce(
                (sum, t) => sum + (t.storyPoints || 0),
                0
              );
              const isDropActive = activeDropColumn === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDrop={() => handleDrop(col.id)}
                  style={{
                    backgroundColor: isDropActive ? 'var(--primary-light)' : 'var(--slate-50)',
                    border: `2px dashed ${isDropActive ? 'var(--primary)' : col.border}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '520px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Column Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '10px',
                      marginBottom: '10px',
                      borderBottom: `2px solid ${col.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: col.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        {col.label}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: 'var(--white)',
                          padding: '2px 7px',
                          borderRadius: '10px',
                          color: 'var(--slate-600)',
                          border: '1px solid var(--slate-200)',
                        }}
                      >
                        {tasksInCol.length}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--slate-500)' }}>
                      {totalColPoints} pts
                    </span>
                  </div>

                  {/* Task Cards List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    {tasksInCol.map((task) => {
                      const pBadge = getPriorityBadge(task.priority);
                      const dueInfo = formatDueDate(task.dueDate);

                      return (
                        <div
                          key={task._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task._id)}
                          onClick={() => setDetailModalTask(task)}
                          style={{
                            backgroundColor: 'var(--white)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--slate-200)',
                            padding: '12px',
                            boxShadow: 'var(--shadow-xs)',
                            cursor: 'grab',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                            e.currentTarget.style.borderColor = 'var(--slate-300)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                            e.currentTarget.style.borderColor = 'var(--slate-200)';
                          }}
                        >
                          {/* Project Color Accent Bar on Left */}
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '4px',
                              backgroundColor: activeProject?.color || 'var(--primary)',
                            }}
                          />

                          {/* Top Row: Priority Badge + Story Points */}
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
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  backgroundColor: 'var(--slate-100)',
                                  color: 'var(--slate-800)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                }}
                              >
                                {task.storyPoints} SP
                              </span>
                            )}
                          </div>

                          {/* Task Title (Line clamp 2) */}
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: 'var(--slate-900)',
                              lineHeight: 1.35,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {task.title}
                          </div>

                          {/* Footer: Due Date & Assignee Avatar */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--slate-100)',
                              fontSize: '11px',
                            }}
                          >
                            {/* Due Date Indicator */}
                            {dueInfo ? (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 600,
                                  color: dueInfo.isOverdue
                                    ? 'var(--danger)'
                                    : dueInfo.isToday
                                    ? 'var(--warning)'
                                    : 'var(--slate-500)',
                                }}
                              >
                                <Clock size={12} />
                                <span>{dueInfo.text}</span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--slate-400)', fontSize: '10px' }}>
                                No due date
                              </span>
                            )}

                            {/* Assignee Avatar */}
                            <div
                              title={task.assignee?.name || 'Unassigned'}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--primary-light)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 700,
                                overflow: 'hidden',
                              }}
                            >
                              {task.assignee?.avatar ? (
                                <img
                                  src={task.assignee.avatar}
                                  alt={task.assignee.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                task.assignee?.name?.[0]?.toUpperCase() || 'U'
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {tasksInCol.length === 0 && (
                      <div
                        style={{
                          padding: '36px 12px',
                          textAlign: 'center',
                          fontSize: '12px',
                          color: 'var(--slate-400)',
                          fontStyle: 'italic',
                        }}
                      >
                        No tasks in this column
                      </div>
                    )}
                  </div>

                  {/* "+" Button to create task directly in column status */}
                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => setCreateModalState({ isOpen: true, initialStatus: col.id })}
                      style={{
                        marginTop: '10px',
                        padding: '8px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px dashed var(--slate-300)',
                        backgroundColor: 'var(--white)',
                        color: 'var(--slate-600)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--slate-100)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.color = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--white)';
                        e.currentTarget.style.borderColor = 'var(--slate-300)';
                        e.currentTarget.style.color = 'var(--slate-600)';
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Task</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : viewMode === 'list' ? (
          /* ========================================================= */
          /* VIEW 2: SORTABLE LIST / TABLE VIEW                        */
          /* ========================================================= */
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
              padding: '20px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ backgroundColor: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--slate-600)' }}>Task</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--slate-600)' }}>Status</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--slate-600)' }}>Priority</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--slate-600)' }}>Points</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--slate-600)' }}>Assignee</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--slate-600)' }}>Due Date</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--slate-600)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const dueInfo = formatDueDate(task.dueDate);
                    return (
                      <tr
                        key={task._id}
                        onClick={() => setDetailModalTask(task)}
                        style={{
                          borderBottom: '1px solid var(--slate-150)',
                          cursor: 'pointer',
                          transition: 'background-color 0.12s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--slate-50)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Title */}
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--slate-900)' }}>
                          {task.title}
                        </td>

                        {/* Inline Status Dropdown */}
                        <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <select
                            value={task.status}
                            disabled={!canUpdate}
                            onChange={async (e) => {
                              if (!currentUserId) return;
                              const newStatus = e.target.value as KanbanStatus;
                              try {
                                await updateTaskStatusMutation({
                                  taskId: task._id,
                                  newStatus,
                                  userId: currentUserId,
                                });
                                addToast('success', `Status updated to ${newStatus.replace('_', ' ')}`);
                              } catch (err: any) {
                                addToast('error', err.message || 'Failed to update status.');
                              }
                            }}
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--slate-250, #cbd5e1)',
                              backgroundColor: 'var(--white)',
                              cursor: canUpdate ? 'pointer' : 'default',
                            }}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="in_review">In Review</option>
                            <option value="done">Done</option>
                          </select>
                        </td>

                        {/* Inline Priority Dropdown */}
                        <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <select
                            value={task.priority}
                            disabled={!canUpdate}
                            onChange={async (e) => {
                              if (!currentUserId) return;
                              const newPriority = e.target.value as any;
                              try {
                                await updateTaskMutation({
                                  taskId: task._id,
                                  priority: newPriority,
                                  userId: currentUserId,
                                });
                                addToast('success', `Priority set to ${newPriority}`);
                              } catch (err: any) {
                                addToast('error', err.message || 'Failed to update priority.');
                              }
                            }}
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--slate-250, #cbd5e1)',
                              backgroundColor: 'var(--white)',
                              cursor: canUpdate ? 'pointer' : 'default',
                            }}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </td>

                        {/* Story Points */}
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--slate-700)' }}>
                          {task.storyPoints !== undefined ? `${task.storyPoints} pts` : '—'}
                        </td>

                        {/* Assignee */}
                        <td style={{ padding: '12px 14px', color: 'var(--slate-700)' }}>
                          {task.assignee?.name || 'Unassigned'}
                        </td>

                        {/* Due Date */}
                        <td style={{ padding: '12px 14px' }}>
                          {dueInfo ? (
                            <span
                              style={{
                                fontWeight: 600,
                                color: dueInfo.isOverdue
                                  ? 'var(--danger)'
                                  : dueInfo.isToday
                                  ? 'var(--warning)'
                                  : 'var(--slate-600)',
                              }}
                            >
                              {dueInfo.dateStr}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--slate-400)' }}>—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setDetailModalTask(task)}
                              style={{ background: 'none', border: 'none', color: 'var(--slate-500)', cursor: 'pointer', padding: '4px' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            {canDelete && task.status === 'todo' && (
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

              {filteredTasks.length === 0 && (
                <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '13px' }}>
                  No tasks found matching filter criteria.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* VIEW 3: CALENDAR VIEW                                     */
          /* ========================================================= */
          <TasksCalendarView
            tasks={filteredTasks}
            onSelectTask={(task) => setDetailModalTask(task)}
          />
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. MODAL: TASK CREATION MODAL                             */}
      {/* ========================================================= */}
      {createModalState.isOpen && (
        <CreateTaskModal
          projectId={activeProjectId!}
          projects={projects || []}
          sprints={sprints || []}
          members={members || []}
          initialStatus={createModalState.initialStatus || 'todo'}
          initialSprintId={resolvedSprintId || undefined}
          onClose={() => setCreateModalState({ isOpen: false })}
          onSave={async (values) => {
            if (!currentUserId) return;
            try {
              await createTaskMutation({
                projectId: values.projectId,
                sprintId: values.sprintId,
                title: values.title,
                description: values.description,
                status: values.status,
                priority: values.priority,
                storyPoints: values.storyPoints,
                assigneeId: values.assigneeId,
                dueDate: values.dueDate,
                userId: currentUserId,
              });
              addToast('success', 'Task created successfully.');
              setCreateModalState({ isOpen: false });
            } catch (err: any) {
              addToast('error', err.message || 'Failed to create task.');
            }
          }}
        />
      )}

      {/* ========================================================= */}
      {/* 4. MODAL: TASK DETAIL & EDIT MODAL                        */}
      {/* ========================================================= */}
      {detailModalTask && (
        <TaskDetailModal
          task={detailModalTask}
          members={members || []}
          sprints={sprints || []}
          canEdit={canUpdate}
          canDelete={canDelete && detailModalTask.status === 'todo'}
          onClose={() => setDetailModalTask(null)}
          onSave={async (updates) => {
            if (!currentUserId) return;
            try {
              await updateTaskMutation({
                taskId: detailModalTask._id,
                userId: currentUserId,
                ...updates,
              });
              if (updates.status && updates.status !== detailModalTask.status) {
                await updateTaskStatusMutation({
                  taskId: detailModalTask._id,
                  newStatus: updates.status,
                  userId: currentUserId,
                });
              }
              addToast('success', 'Task updated successfully.');
              setDetailModalTask(null);
            } catch (err: any) {
              addToast('error', err.message || 'Failed to update task.');
            }
          }}
          onMoveToBacklog={async () => {
            if (!currentUserId) return;
            try {
              await moveTaskToBacklogMutation({
                taskId: detailModalTask._id,
                userId: currentUserId,
              });
              addToast('success', 'Moved task to product backlog.');
              setDetailModalTask(null);
            } catch (err: any) {
              addToast('error', err.message || 'Failed to move to backlog.');
            }
          }}
          onDelete={async () => {
            if (!currentUserId) return;
            try {
              await deleteTaskMutation({
                taskId: detailModalTask._id,
                userId: currentUserId,
              });
              addToast('success', 'Task deleted.');
              setDetailModalTask(null);
            } catch (err: any) {
              addToast('error', err.message || 'Failed to delete task.');
            }
          }}
        />
      )}

      {/* ========================================================= */}
      {/* 5. FLOATING TOAST CONTAINER                               */}
      {/* ========================================================= */}
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
              }}
            >
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .tasks-kanban-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .tasks-kanban-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

/* =========================================================================
 * SUB-COMPONENT: CALENDAR VIEW
 * ========================================================================= */
interface TasksCalendarViewProps {
  tasks: any[];
  onSelectTask: (task: any) => void;
}

const TasksCalendarView: React.FC<TasksCalendarViewProps> = ({
  tasks,
  onSelectTask,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const gotoToday = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Map tasks to day of month
  const tasksByDay = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const map: Record<number, any[]> = {};
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const d = new Date(task.dueDate);
      if (d.getFullYear() === y && d.getMonth() === m) {
        const dayNum = d.getDate();
        if (!map[dayNum]) map[dayNum] = [];
        map[dayNum].push(task);
      }
    }
    return map;
  }, [tasks, currentDate]);

  const unscheduledTasks = useMemo(() => {
    return tasks.filter((t) => !t.dueDate);
  }, [tasks]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 280px',
        gap: '16px',
        alignItems: 'start',
      }}
    >
      {/* Calendar Grid */}
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
        {/* Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
            {monthName}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Button variant="ghost" onClick={prevMonth} style={{ padding: '4px 8px' }}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="ghost" onClick={gotoToday} style={{ padding: '4px 10px', fontSize: '12px' }}>
              Today
            </Button>
            <Button variant="ghost" onClick={nextMonth} style={{ padding: '4px 8px' }}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* Calendar Day Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-500)', padding: '6px 0' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Day Grid Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {/* Empty prefix cells */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                minHeight: '85px',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-xs)',
                opacity: 0.4,
              }}
            />
          ))}

          {/* Month day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayTasks = tasksByDay[dayNum] || [];
            const isToday =
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === dayNum;

            return (
              <div
                key={`day-${dayNum}`}
                style={{
                  minHeight: '90px',
                  backgroundColor: isToday ? 'var(--primary-light)' : 'var(--white)',
                  border: `1px solid ${isToday ? 'var(--primary-border)' : 'var(--slate-200)'}`,
                  borderRadius: 'var(--radius-xs)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isToday ? 800 : 600,
                      color: isToday ? 'var(--primary)' : 'var(--slate-700)',
                    }}
                  >
                    {dayNum}
                  </span>
                  {dayTasks.length > 0 && (
                    <span style={{ fontSize: '10px', color: 'var(--slate-400)', fontWeight: 700 }}>
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Day Tasks Chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', maxHeight: '70px' }}>
                  {dayTasks.map((t) => {
                    const p = getPriorityBadge(t.priority);
                    return (
                      <div
                        key={t._id}
                        onClick={() => onSelectTask(t)}
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor: p.bg,
                          color: p.color,
                          border: `1px solid ${p.border}`,
                          borderRadius: '3px',
                          padding: '2px 4px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled Tasks Sidebar Drawer */}
      <div
        style={{
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--slate-200)',
          padding: '16px',
          boxShadow: 'var(--shadow-xs)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '620px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
            Unscheduled Tasks
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
            {unscheduledTasks.length} tasks without due dates
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {unscheduledTasks.map((task) => (
            <div
              key={task._id}
              onClick={() => onSelectTask(task)}
              style={{
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-xs)',
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--white)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--slate-50)')}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-900)' }}>
                {task.title}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--slate-500)' }}>
                <span>{task.priority}</span>
                <span>{task.storyPoints ? `${task.storyPoints} pts` : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
 * SUB-COMPONENT: CREATE TASK MODAL
 * ========================================================================= */
interface CreateTaskModalProps {
  projectId: Id<'projects'>;
  projects: any[];
  sprints: any[];
  members: any[];
  initialStatus: KanbanStatus;
  initialSprintId?: Id<'sprints'>;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  projectId,
  projects,
  sprints,
  members,
  initialStatus,
  initialSprintId,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'>>(projectId);
  const [selectedSprintId, setSelectedSprintId] = useState<string>(initialSprintId || '');
  const [status, setStatus] = useState<KanbanStatus>(initialStatus);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [storyPoints, setStoryPoints] = useState<number | ''>(3);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
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
        projectId: selectedProjectId,
        sprintId: selectedSprintId ? (selectedSprintId as Id<'sprints'>) : undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        storyPoints: storyPoints !== '' ? Number(storyPoints) : undefined,
        assigneeId: assigneeId ? (assigneeId as Id<'users'>) : undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create task.');
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
          maxWidth: '540px',
          padding: '24px',
          boxShadow: 'var(--shadow-xl)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
            Create New Task
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
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
              Description
            </label>
            <textarea
              placeholder="Add details, criteria, or technical specs..."
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
                Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value as Id<'projects'>)}
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--slate-250, #cbd5e1)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0 10px',
                  fontSize: '13px',
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Sprint Assignment
              </label>
              <select
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--slate-250, #cbd5e1)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0 10px',
                  fontSize: '13px',
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '4px' }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as KanbanStatus)}
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--slate-250, #cbd5e1)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0 10px',
                  fontSize: '13px',
                }}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>

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
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Fibonacci Story Points Buttons */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '6px' }}>
              Story Points (Fibonacci)
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {FIBONACCI_POINTS.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setStoryPoints(storyPoints === pt ? '' : pt)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-xs)',
                    border: `1px solid ${storyPoints === pt ? 'var(--primary)' : 'var(--slate-250, #cbd5e1)'}`,
                    backgroundColor: storyPoints === pt ? 'var(--primary)' : 'var(--slate-50)',
                    color: storyPoints === pt ? 'var(--white)' : 'var(--slate-800)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {pt}
                </button>
              ))}
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
                Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
