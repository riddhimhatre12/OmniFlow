import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { PermissionGate } from '../components/ui/PermissionGate';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { useWorkspaceAuth } from '../hooks/useWorkspaceAuth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface ProjectsPageProps {
  onNavigate: (route: string) => void;
}

type StatusFilter = 'all' | 'planning' | 'in_progress' | 'on_hold' | 'completed';

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
    return { text: `${Math.abs(days)}d overdue`, isOverdue: true, dateStr };
  }
  if (days === 0) {
    return { text: 'Due today', isOverdue: true, dateStr };
  }
  if (days === 1) {
    return { text: 'Due tomorrow', isOverdue: false, dateStr };
  }
  return { text: `Due in ${days}d`, isOverdue: false, dateStr };
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'in_progress':
      return {
        label: 'In Progress',
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#bfdbfe',
      };
    case 'completed':
      return {
        label: 'Completed',
        color: '#059669',
        bg: '#ecfdf5',
        border: '#a7f3d0',
      };
    case 'on_hold':
      return {
        label: 'On Hold',
        color: '#64748b',
        bg: '#f1f5f9',
        border: '#cbd5e1',
      };
    default:
      return {
        label: 'Planning',
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
      };
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'urgent':
      return { label: 'Urgent', color: '#dc2626', bg: '#fef2f2' };
    case 'high':
      return { label: 'High', color: '#ea580c', bg: '#fff7ed' };
    case 'medium':
      return { label: 'Medium', color: '#ca8a04', bg: '#fefce8' };
    default:
      return { label: 'Low', color: '#64748b', bg: '#f8fafc' };
  }
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onNavigate }) => {
  const { workspace } = useWorkspaceAuth();
  const { user } = useCurrentUser();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const deleteProjectMutation = useMutation(api.projects.deleteProject);

  const rawProjects = useQuery(
    api.projects.getWorkspaceProjects,
    workspace
      ? {
          workspaceId: workspace.id as Id<'workspaces'>,
          userId: user.userId ? (user.userId as Id<'users'>) : undefined,
        }
      : 'skip'
  );

  const projects = useMemo(() => {
    if (!rawProjects) return [];
    return rawProjects.filter((p) => {
      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      // Priority filter
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false;
      // Search
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesDesc = p.description?.toLowerCase().includes(query);
        return matchesName || matchesDesc;
      }
      return true;
    });
  }, [rawProjects, statusFilter, priorityFilter, search]);

  const handleDelete = async () => {
    if (!projectToDelete || !user.userId) return;
    setIsDeleting(true);
    try {
      await deleteProjectMutation({
        projectId: projectToDelete.id as Id<'projects'>,
        userId: user.userId as Id<'users'>,
      });
      setProjectToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalCount = rawProjects ? rawProjects.length : 0;
  const inProgressCount = rawProjects
    ? rawProjects.filter((p) => p.status === 'in_progress').length
    : 0;
  const completedCount = rawProjects
    ? rawProjects.filter((p) => p.status === 'completed').length
    : 0;
  const planningCount = rawProjects
    ? rawProjects.filter((p) => p.status === 'planning').length
    : 0;

  return (
    <DashboardLayout activeItem="projects" onNavigate={onNavigate}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--slate-900)',
                  margin: 0,
                  letterSpacing: '-0.4px',
                }}
              >
                Projects
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-subtle)',
                  color: 'var(--primary)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {totalCount}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--slate-500)', margin: '4px 0 0 0' }}>
              Plan, organize, and track initiatives across your workspace.
            </p>
          </div>

          <PermissionGate
            permission="project:create"
            fallback={
              <Button variant="secondary" size="md" disabled icon={<Plus size={16} />}>
                Create Project
              </Button>
            }
          >
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => {
                setProjectToEdit(null);
                setIsCreateModalOpen(true);
              }}
            >
              New Project
            </Button>
          </PermissionGate>
        </div>

        {/* Filters & Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Status Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--slate-100)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              gap: '2px',
              overflowX: 'auto',
            }}
          >
            {(
              [
                { id: 'all', label: 'All', count: totalCount },
                { id: 'in_progress', label: 'In Progress', count: inProgressCount },
                { id: 'planning', label: 'Planning', count: planningCount },
                { id: 'completed', label: 'Completed', count: completedCount },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: active ? 'var(--white)' : 'transparent',
                    color: active ? 'var(--slate-900)' : 'var(--slate-600)',
                    fontWeight: active ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.12s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: active ? 'var(--primary)' : 'var(--slate-400)',
                      fontWeight: 600,
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Search, Priority, View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ width: '220px' }}>
              <Input
                placeholder="Search projects..."
                leftIcon={<Search size={15} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                height: '38px',
                padding: '0 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--slate-300)',
                backgroundColor: 'var(--white)',
                fontSize: '13px',
                color: 'var(--slate-700)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>

            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--slate-100)',
                padding: '3px',
                borderRadius: 'var(--radius-sm)',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  backgroundColor: viewMode === 'grid' ? 'var(--white)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--primary)' : 'var(--slate-500)',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List View"
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  backgroundColor: viewMode === 'list' ? 'var(--white)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--primary)' : 'var(--slate-500)',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {rawProjects === undefined ? (
          // Loading Skeletons
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '18px',
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: '210px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--slate-100)',
                  animation: 'pulse 1.5s infinite ease-in-out',
                }}
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          // Empty State
          <Card padding="lg">
            <EmptyState
              icon={<FolderKanban size={32} />}
              title={
                search || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'No matching projects'
                  : 'No projects yet'
              }
              description={
                search || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try clearing your search query or filters to find what you need.'
                  : 'Create your first project to start planning deliverables and collaborating with your team.'
              }
              actionLabel={
                search || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Clear Filters'
                  : 'Create Project'
              }
              onAction={() => {
                if (search || statusFilter !== 'all' || priorityFilter !== 'all') {
                  setSearch('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                } else {
                  setProjectToEdit(null);
                  setIsCreateModalOpen(true);
                }
              }}
            />
          </Card>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
              gap: '18px',
            }}
          >
            {projects.map((project) => {
              const statusBadge = getStatusBadge(project.status);
              const priorityBadge = getPriorityBadge(project.priority);
              const dueDateInfo = formatDueDate(project.dueDate);
              const isMenuOpen = activeMenuId === project.id;

              return (
                <div
                  key={project.id}
                  style={{
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-200)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = 'var(--slate-300)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = 'var(--slate-200)';
                  }}
                >
                  {/* Top Color Accent Strip */}
                  <div style={{ height: '4px', backgroundColor: project.color || 'var(--primary)' }} />

                  <div style={{ padding: '20px 20px 14px 20px' }}>
                    {/* Header: Status + Priority + Menu */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`,
                          }}
                        >
                          {statusBadge.label}
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: priorityBadge.bg,
                            color: priorityBadge.color,
                          }}
                        >
                          {priorityBadge.label}
                        </span>
                      </div>

                      {/* Dropdown Menu */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId(isMenuOpen ? null : project.id)
                          }
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--slate-400)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {isMenuOpen && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              width: '140px',
                              backgroundColor: 'var(--white)',
                              border: '1px solid var(--slate-200)',
                              borderRadius: 'var(--radius-sm)',
                              boxShadow: 'var(--shadow-md)',
                              padding: '4px',
                              zIndex: 10,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onNavigate(`/projects/${project.id}/sprints/planning`);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: '13px',
                                color: 'var(--primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-xs)',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = 'var(--primary-light)')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = 'transparent')
                              }
                            >
                              <Layers size={14} />
                              <span>Sprint Planning</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setProjectToEdit(project);
                                setIsCreateModalOpen(true);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: '13px',
                                color: 'var(--slate-700)',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-xs)',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = 'var(--slate-100)')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = 'transparent')
                              }
                            >
                              <Edit2 size={14} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setProjectToDelete(project);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: '13px',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-xs)',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = 'var(--danger-light)')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = 'transparent')
                              }
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Project Title */}
                    <h3
                      onClick={() => onNavigate(`/projects/${project.id}/sprints/planning`)}
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--slate-900)',
                        margin: '0 0 6px 0',
                        lineHeight: 1.3,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-900)')}
                    >
                      {project.name}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--slate-600)',
                        lineHeight: 1.5,
                        margin: '0 0 16px 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '38px',
                      }}
                    >
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Card Footer: Lead & Due Date */}
                  <div
                    style={{
                      padding: '12px 20px',
                      borderTop: '1px solid var(--slate-100)',
                      backgroundColor: 'var(--slate-50)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    {/* Lead */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-subtle)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          overflow: 'hidden',
                        }}
                      >
                        {project.lead?.avatar ? (
                          <img
                            src={project.lead.avatar}
                            alt={project.lead.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          project.lead?.name?.[0]?.toUpperCase() || 'P'
                        )}
                      </div>
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--slate-700)',
                          maxWidth: '110px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {project.lead?.name || 'Unassigned'}
                      </span>
                    </div>

                    {/* Due Date Indicator */}
                    {dueDateInfo ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: 600,
                          color: dueDateInfo.isOverdue ? 'var(--danger)' : 'var(--slate-500)',
                        }}
                      >
                        <Calendar size={13} />
                        <span>{dueDateInfo.text}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--slate-400)', fontSize: '11px' }}>
                        No due date
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // List View
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--slate-50)',
                    borderBottom: '1px solid var(--slate-200)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--slate-500)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <th style={{ padding: '12px 18px' }}>Project Name</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Priority</th>
                  <th style={{ padding: '12px 14px' }}>Lead</th>
                  <th style={{ padding: '12px 14px' }}>Due Date</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const statusBadge = getStatusBadge(project.status);
                  const priorityBadge = getPriorityBadge(project.priority);
                  const dueDateInfo = formatDueDate(project.dueDate);

                  return (
                    <tr
                      key={project.id}
                      style={{
                        borderBottom: '1px solid var(--slate-150)',
                        fontSize: '13px',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = 'var(--slate-50)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: project.color || 'var(--primary)',
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                              {project.name}
                            </div>
                            {project.description && (
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--slate-500)',
                                  maxWidth: '320px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {project.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`,
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: priorityBadge.bg,
                            color: priorityBadge.color,
                          }}
                        >
                          {priorityBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>
                            {project.lead?.name || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 14px' }}>
                        {dueDateInfo ? (
                          <span
                            style={{
                              fontWeight: 600,
                              color: dueDateInfo.isOverdue
                                ? 'var(--danger)'
                                : 'var(--slate-600)',
                            }}
                          >
                            {dueDateInfo.dateStr} ({dueDateInfo.text})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--slate-400)' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '6px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onNavigate(`/projects/${project.id}/sprints/planning`)}
                            title="Sprint Planning"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: '6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: 'var(--primary)',
                            }}
                          >
                            <Layers size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProjectToEdit(project);
                              setIsCreateModalOpen(true);
                            }}
                            title="Edit project"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: '6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: 'var(--slate-500)',
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProjectToDelete(project)}
                            title="Delete project"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: '6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: 'var(--danger)',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setProjectToEdit(null);
        }}
        projectToEdit={projectToEdit}
      />

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              padding: '24px',
              border: '1px solid var(--slate-200)',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <AlertTriangle size={22} />
            </div>

            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--slate-900)',
                margin: '0 0 8px 0',
              }}
            >
              Delete Project?
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--slate-600)',
                lineHeight: 1.5,
                margin: '0 0 20px 0',
              }}
            >
              Are you sure you want to delete <strong>"{projectToDelete.name}"</strong>? All
              associated deliverables will be permanently removed. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDelete}
                disabled={isDeleting}
                icon={isDeleting ? <Clock size={16} /> : <Trash2 size={16} />}
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
