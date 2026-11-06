import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useWorkspaceAuth } from '../../hooks/useWorkspaceAuth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  X,
  FolderPlus,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ProjectFormProps {
  onClose: () => void;
  onCreated?: (projectId: string) => void;
  projectToEdit?: {
    id: string;
    name: string;
    description?: string;
    status: 'planning' | 'in_progress' | 'on_hold' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    startDate?: number;
    dueDate?: number;
    leadId?: string;
    color?: string;
  } | null;
}

export interface CreateProjectModalProps extends ProjectFormProps {
  isOpen: boolean;
}

const COLOR_PRESETS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Cyan', value: '#0891b2' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Purple', value: '#9333ea' },
];

const InnerProjectModal: React.FC<ProjectFormProps> = ({
  onClose,
  onCreated,
  projectToEdit,
}) => {
  const { user } = useCurrentUser();
  const { workspace } = useWorkspaceAuth();
  const createProjectMutation = useMutation(api.projects.createProject);
  const updateProjectMutation = useMutation(api.projects.updateProject);

  const members = useQuery(
    api.members.getWorkspaceMembers,
    workspace ? { workspaceId: workspace.id as Id<'workspaces'> } : 'skip'
  );

  const [name, setName] = useState(projectToEdit ? projectToEdit.name : '');
  const [description, setDescription] = useState(projectToEdit ? projectToEdit.description || '' : '');
  const [status, setStatus] = useState<'planning' | 'in_progress' | 'on_hold' | 'completed'>(
    projectToEdit ? projectToEdit.status : 'planning'
  );
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(
    projectToEdit ? projectToEdit.priority : 'medium'
  );
  const [leadId, setLeadId] = useState<string>(
    projectToEdit?.leadId || user.userId || ''
  );
  const [startDate, setStartDate] = useState(
    projectToEdit?.startDate
      ? new Date(projectToEdit.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    projectToEdit?.dueDate
      ? new Date(projectToEdit.dueDate).toISOString().split('T')[0]
      : ''
  );
  const [color, setColor] = useState(projectToEdit?.color || '#6366f1');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }

    if (!workspace) {
      setError('No active workspace selected.');
      return;
    }

    if (!user.userId) {
      setError('You must be logged in to create a project.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const parsedStartDate = startDate ? new Date(startDate).getTime() : undefined;
      const parsedDueDate = dueDate ? new Date(dueDate).getTime() : undefined;

      if (parsedStartDate && parsedDueDate && parsedDueDate < parsedStartDate) {
        setError('Target due date cannot be earlier than start date.');
        setLoading(false);
        return;
      }

      if (projectToEdit) {
        await updateProjectMutation({
          projectId: projectToEdit.id as Id<'projects'>,
          userId: user.userId as Id<'users'>,
          name: trimmedName,
          description: description.trim() || undefined,
          status,
          priority,
          startDate: parsedStartDate,
          dueDate: parsedDueDate,
          leadId: (leadId as Id<'users'>) || undefined,
          color,
        });
      } else {
        const res = await createProjectMutation({
          workspaceId: workspace.id as Id<'workspaces'>,
          userId: user.userId as Id<'users'>,
          name: trimmedName,
          description: description.trim() || undefined,
          status,
          priority,
          startDate: parsedStartDate,
          dueDate: parsedDueDate,
          leadId: (leadId as Id<'users'>) || (user.userId as Id<'users'>),
          color,
        });

        if (onCreated) {
          onCreated(res.projectId);
        }
      }

      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save project.';
      setError(msg);
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
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--slate-200)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--slate-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--slate-50)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: color,
                color: 'var(--white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <FolderPlus size={18} />
            </div>
            <div>
              <h2
                id="project-modal-title"
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--slate-900)',
                  margin: 0,
                }}
              >
                {projectToEdit ? 'Edit Project' : 'Create New Project'}
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                {projectToEdit
                  ? 'Update project details, milestones, and assignments.'
                  : `In workspace: ${workspace?.name || 'Workspace'}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--slate-400)',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.12s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger)',
                  fontSize: '13px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Project Name */}
            <div>
              <label
                htmlFor="project-name"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--slate-800)',
                  marginBottom: '6px',
                }}
              >
                Project Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <Input
                id="project-name"
                placeholder="e.g. Q3 Mobile Redesign, Customer Portal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="project-desc"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--slate-800)',
                  marginBottom: '6px',
                }}
              >
                Description
              </label>
              <textarea
                id="project-desc"
                rows={3}
                placeholder="Provide context, goals, and key deliverables for this initiative..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-300)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  color: 'var(--slate-800)',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--slate-300)')}
              />
            </div>

            {/* Status & Priority Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label
                  htmlFor="project-status"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--slate-800)',
                    marginBottom: '6px',
                  }}
                >
                  Status
                </label>
                <select
                  id="project-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-300)',
                    backgroundColor: 'var(--white)',
                    fontSize: '13px',
                    color: 'var(--slate-800)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="planning">📋 Planning</option>
                  <option value="in_progress">⚡ In Progress</option>
                  <option value="on_hold">⏸️ On Hold</option>
                  <option value="completed">✅ Completed</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="project-priority"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--slate-800)',
                    marginBottom: '6px',
                  }}
                >
                  Priority
                </label>
                <select
                  id="project-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-300)',
                    backgroundColor: 'var(--white)',
                    fontSize: '13px',
                    color: 'var(--slate-800)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
            </div>

            {/* Project Lead */}
            <div>
              <label
                htmlFor="project-lead"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--slate-800)',
                  marginBottom: '6px',
                }}
              >
                Project Lead
              </label>
              <select
                id="project-lead"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: 'var(--white)',
                  fontSize: '13px',
                  color: 'var(--slate-800)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">Select Project Lead...</option>
                {members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name} ({m.roleName}) {m.userId === user.userId ? '— You' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date & Target Due Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label
                  htmlFor="project-start-date"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--slate-800)',
                    marginBottom: '6px',
                  }}
                >
                  Start Date
                </label>
                <input
                  id="project-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-300)',
                    fontSize: '13px',
                    color: 'var(--slate-800)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="project-due-date"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--slate-800)',
                    marginBottom: '6px',
                  }}
                >
                  Target Due Date
                </label>
                <input
                  id="project-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-300)',
                    fontSize: '13px',
                    color: 'var(--slate-800)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Accent Color Picker */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--slate-800)',
                  marginBottom: '8px',
                }}
              >
                Project Theme Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = color === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      title={preset.label}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: preset.value,
                        border: isSelected ? '3px solid var(--white)' : 'none',
                        outline: isSelected ? `2px solid ${preset.value}` : 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--slate-200)',
              backgroundColor: 'var(--slate-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading || !name.trim()}
              icon={loading ? <Loader2 size={16} className="spinner" /> : <FolderPlus size={16} />}
            >
              {loading
                ? projectToEdit
                  ? 'Saving Changes...'
                  : 'Creating Project...'
                : projectToEdit
                ? 'Save Changes'
                : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  projectToEdit,
}) => {
  if (!isOpen) return null;
  return (
    <InnerProjectModal
      key={projectToEdit ? projectToEdit.id : 'create-new-project'}
      onClose={onClose}
      onCreated={onCreated}
      projectToEdit={projectToEdit}
    />
  );
};

