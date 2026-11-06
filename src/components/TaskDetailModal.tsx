import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useWorkspaceAuth } from '../hooks/useWorkspaceAuth';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  X,
  Edit2,
  Trash2,
  Paperclip,
  MessageSquare,
  Send,
  Eye,
  Download,
  FileText,
  File,
  Image as ImageIcon,
  Film,
  Bell,
  BellOff,
  AtSign,
  AlertCircle,
  Link2,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { CloudinaryUploader, type CloudinaryUploadResponse } from './CloudinaryUploader';

function getCloudinaryTransformedUrl(url?: string, transform?: string): string {
  if (!url) return '';
  if (transform && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transform}/`);
  }
  return url;
}

export type KanbanStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

const COMMON_EMOJIS = ['👍', '❤️', '🎉', '😂', '👏', '🚀'];

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return <ImageIcon size={18} color="var(--primary)" />;
  if (fileType.startsWith('video/')) return <Film size={18} color="var(--secondary)" />;
  if (fileType.includes('pdf')) return <FileText size={18} color="var(--danger)" />;
  return <File size={18} color="var(--slate-500)" />;
}

export interface TaskDetailModalProps {
  task: any;
  members: any[];
  sprints: any[];
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSave: (updates: any) => Promise<void>;
  onMoveToBacklog: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  members,
  canEdit,
  canDelete,
  onClose,
  onSave,
  onMoveToBacklog,
  onDelete,
}) => {
  const { user } = useCurrentUser();
  const currentUserId = user.userId ? (user.userId as Id<'users'>) : undefined;
  const { workspace, isOwner, isAdmin } = useWorkspaceAuth();
  const workspaceId = workspace?.id ? (workspace.id as Id<'workspaces'>) : undefined;

  // Task form fields state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<KanbanStatus>(task.status);
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [storyPoints, setStoryPoints] = useState<number | ''>(
    task.storyPoints !== undefined ? task.storyPoints : ''
  );
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || task.assignee?.id || '');
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tab state in right panel: 'comments' | 'attachments'
  const [activeTab, setActiveTab] = useState<'comments' | 'attachments'>('comments');

  // Real-time Comments Query & Mutations
  const comments = useQuery(api.comments.getTaskComments, { taskId: task._id });
  const createCommentMutation = useMutation(api.comments.createComment);
  const editCommentMutation = useMutation(api.comments.editComment);
  const deleteCommentMutation = useMutation(api.comments.deleteComment);
  const addReactionMutation = useMutation(api.comments.addReaction);

  // Real-time Attachments Query & Mutations
  const attachments = useQuery(api.attachments.getTaskAttachments, { taskId: task._id });
  const deleteAttachmentMutation = useMutation(api.attachments.deleteAttachment);
  const saveAttachmentMetadataMutation = useMutation(api.cloudinary.saveAttachmentMetadata);
  const [attachmentToast, setAttachmentToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const attachmentsPreset =
    (import.meta as any).env?.VITE_CLOUDINARY_PRESET_ATTACHMENTS ||
    'omniflow_attachments';

  // Real-time Subscribers Query & Mutations
  const isSubscribed = useQuery(api.attachments.isTaskSubscribed, {
    taskId: task._id,
    userId: currentUserId,
  });
  const subscribers = useQuery(api.attachments.getTaskSubscribers, { taskId: task._id });
  const subscribeToTaskMutation = useMutation(api.attachments.subscribeToTask);
  const unsubscribeFromTaskMutation = useMutation(api.attachments.unsubscribeFromTask);

  // Comment Box State
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Editing comment inline state
  const [editingCommentId, setEditingCommentId] = useState<Id<'task_comments'> | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorIndex, setMentionCursorIndex] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedMentions, setSelectedMentions] = useState<{ userId: Id<'users'>; userName: string }[]>([]);

  // File preview & copy link state
  const [previewModal, setPreviewModal] = useState<{ url: string; fileName: string; fileType: string } | null>(null);
  const [copiedAttachmentId, setCopiedAttachmentId] = useState<string | null>(null);

  // Copy share link handler
  const handleCopyShareLink = (att: any) => {
    if (!att.url) return;
    navigator.clipboard.writeText(att.url);
    setCopiedAttachmentId(att._id);
    setTimeout(() => {
      setCopiedAttachmentId(null);
    }, 2000);
  };

  // Comment thread bottom scroll ref
  const commentThreadEndRef = useRef<HTMLDivElement>(null);

  // Watch/unwatch handler
  const handleToggleWatch = async () => {
    if (!currentUserId) return;
    try {
      if (isSubscribed) {
        await unsubscribeFromTaskMutation({ taskId: task._id, userId: currentUserId });
      } else {
        await subscribeToTaskMutation({ taskId: task._id, userId: currentUserId });
      }
    } catch (err: any) {
      console.error('Failed to toggle watch status:', err);
    }
  };

  // Mention autocomplete candidate filter
  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter((m: any) => {
        const name = (m.user?.name || '').toLowerCase();
        return name.includes(q);
      })
      .slice(0, 5);
  }, [mentionQuery, members]);

  // Handle textarea change with @ mention detection
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentInput(val);
    const selPos = e.target.selectionStart;

    const textBefore = val.slice(0, selPos);
    const atMatch = textBefore.match(/@([a-zA-Z0-9_]*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionCursorIndex(atMatch.index || 0);
    } else {
      setMentionQuery(null);
      setMentionCursorIndex(-1);
    }
  };

  // Select mention candidate
  const handleSelectMention = (candidate: any) => {
    if (!candidate.user || mentionCursorIndex === -1) return;
    const name = candidate.user.name || 'Member';
    const before = commentInput.slice(0, mentionCursorIndex);
    const after = commentInput.slice(textareaRef.current?.selectionStart || commentInput.length);
    const nextVal = `${before}@${name} ${after}`;

    setCommentInput(nextVal);
    setMentionQuery(null);
    setSelectedMentions((prev) => [
      ...prev.filter((m) => m.userId !== candidate.userId),
      { userId: candidate.userId, userName: name },
    ]);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Submit comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !workspaceId) return;
    const trimmed = commentInput.trim();
    if (!trimmed) return;

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      await createCommentMutation({
        taskId: task._id,
        workspaceId,
        userId: currentUserId,
        content: trimmed,
        mentions: selectedMentions.length > 0 ? selectedMentions : undefined,
      });

      setCommentInput('');
      setSelectedMentions([]);
      setMentionQuery(null);
      setTimeout(() => {
        commentThreadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Save comment edit
  const handleSaveCommentEdit = async (commentId: Id<'task_comments'>) => {
    if (!currentUserId) return;
    const trimmed = editingContent.trim();
    if (!trimmed) return;

    try {
      await editCommentMutation({
        commentId,
        newContent: trimmed,
        editedBy: currentUserId,
      });
      setEditingCommentId(null);
      setEditingContent('');
    } catch (err: any) {
      alert(err.message || 'Failed to update comment.');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: Id<'task_comments'>) => {
    if (!currentUserId) return;
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteCommentMutation({
        commentId,
        deletedBy: currentUserId,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment.');
    }
  };

  // Reaction toggle
  const handleToggleReaction = async (commentId: Id<'task_comments'>, emoji: string) => {
    if (!currentUserId) return;
    try {
      await addReactionMutation({
        commentId,
        userId: currentUserId,
        emoji,
      });
    } catch (err: any) {
      console.error('Reaction toggle error:', err);
    }
  };

  // Delete attachment with toast feedback
  const handleDeleteAttachment = async (attachmentId: Id<'task_attachments'>) => {
    if (!currentUserId) return;
    if (!window.confirm('Remove this attachment?')) return;
    try {
      await deleteAttachmentMutation({
        attachmentId,
        deletedBy: currentUserId,
      });
      setAttachmentToast({ type: 'success', message: 'Attachment deleted successfully' });
      setTimeout(() => setAttachmentToast(null), 3500);
    } catch (err: any) {
      setAttachmentToast({ type: 'error', message: err.message || 'Failed to remove attachment.' });
      setTimeout(() => setAttachmentToast(null), 4000);
    }
  };

  // Cloudinary direct upload success handler
  const handleCloudinarySuccess = async (response: CloudinaryUploadResponse, file: File) => {
    if (!currentUserId || !workspaceId) return;
    try {
      await saveAttachmentMetadataMutation({
        taskId: task._id,
        workspaceId,
        userId: currentUserId,
        fileName: file.name,
        cloudinaryPublicId: response.public_id,
        cloudinaryUrl: response.url,
        cloudinarySecureUrl: response.secure_url,
        cloudinaryFormat: response.format || file.name.split('.').pop() || 'file',
        cloudinaryResourceType: response.resource_type || (file.type.startsWith('image/') ? 'image' : 'raw'),
        cloudinaryBytes: response.bytes || file.size,
        cloudinaryVersion: response.version || Date.now(),
        description: '',
      });
      setAttachmentToast({ type: 'success', message: 'File uploaded successfully' });
      setTimeout(() => setAttachmentToast(null), 3500);
    } catch (err: any) {
      setAttachmentToast({ type: 'error', message: err.message || 'Failed to save attachment metadata.' });
      setTimeout(() => setAttachmentToast(null), 4000);
    }
  };

  // Save Task Form Changes
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        storyPoints: storyPoints !== '' ? Number(storyPoints) : undefined,
        assigneeId: assigneeId ? (assigneeId as Id<'users'>) : undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
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
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '1040px',
          height: '88vh',
          maxHeight: '850px',
          boxShadow: 'var(--shadow-2xl)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)',
          overflow: 'hidden',
          border: '1px solid var(--border-primary)',
        }}
        className="task-detail-modal-grid"
      >
        {/* ========================================================= */}
        {/* LEFT COLUMN: CORE TASK FIELDS & METADATA                  */}
        {/* ========================================================= */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            borderRight: '1px solid var(--border-primary)',
          }}
        >
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                {task.projectName || 'Project Task'}
              </span>

              {/* Watcher button */}
              <button
                type="button"
                onClick={handleToggleWatch}
                title={isSubscribed ? 'Watching: You receive updates' : 'Watch this task'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-primary)',
                  backgroundColor: isSubscribed ? 'var(--primary-light)' : 'transparent',
                  color: isSubscribed ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {isSubscribed ? <Bell size={12} /> : <BellOff size={12} />}
                <span>{isSubscribed ? 'Watching' : 'Watch'}</span>
                {subscribers && subscribers.length > 0 && (
                  <span style={{ opacity: 0.8 }}>({subscribers.length})</span>
                )}
              </button>
            </div>

            {canEdit && (
              <Button
                variant="ghost"
                onClick={() => setIsEditing(!isEditing)}
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                <Edit2 size={13} style={{ marginRight: '4px' }} />
                <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
              </Button>
            )}
          </div>

          {/* Task Form */}
          <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Title
              </label>
              {isEditing ? (
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              ) : (
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {task.title}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-primary)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    minHeight: '40px',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-primary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {task.description || (
                    <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                      No description provided.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Status
                </label>
                <select
                  value={status}
                  disabled={!isEditing && !canEdit}
                  onChange={(e) => setStatus(e.target.value as KanbanStatus)}
                  style={{
                    width: '100%',
                    height: '36px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0 8px',
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
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Priority
                </label>
                <select
                  value={priority}
                  disabled={!isEditing && !canEdit}
                  onChange={(e) => setPriority(e.target.value as any)}
                  style={{
                    width: '100%',
                    height: '36px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0 8px',
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Assignee
                </label>
                <select
                  value={assigneeId}
                  disabled={!isEditing && !canEdit}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0 8px',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Unassigned</option>
                  {members.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.name || m.user?.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Story Points
                </label>
                <Input
                  type="number"
                  value={storyPoints}
                  disabled={!isEditing && !canEdit}
                  onChange={(e) => setStoryPoints(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                disabled={!isEditing && !canEdit}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {isEditing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <Button variant="ghost" type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </form>

          {/* Quick Actions Footer */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-primary)', display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Created {new Date(task.createdAt).toLocaleDateString()}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {task.sprintId && canEdit && (
                <Button variant="secondary" onClick={onMoveToBacklog} style={{ fontSize: '12px' }}>
                  Backlog
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="danger-ghost"
                  onClick={async () => {
                    if (window.confirm('Delete this task permanently?')) {
                      await onDelete();
                    }
                  }}
                  style={{ fontSize: '12px' }}
                >
                  <Trash2 size={13} style={{ marginRight: '4px' }} />
                  <span>Delete</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: COLLABORATION TABS (COMMENTS & ATTACHMENTS) */}
        {/* ========================================================= */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top Tabs Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-primary)',
              backgroundColor: 'var(--bg-primary)',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: activeTab === 'comments' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'comments' ? 'var(--white)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <MessageSquare size={14} />
                <span>Comments</span>
                {comments && comments.length > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      backgroundColor: activeTab === 'comments' ? 'rgba(255,255,255,0.25)' : 'var(--bg-hover)',
                    }}
                  >
                    {comments.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attachments')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: activeTab === 'attachments' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'attachments' ? 'var(--white)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Paperclip size={14} />
                <span>Attachments</span>
                {attachments && attachments.length > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      backgroundColor: activeTab === 'attachments' ? 'rgba(255,255,255,0.25)' : 'var(--bg-hover)',
                    }}
                  >
                    {attachments.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* TAB 1: COMMENTS THREAD */}
          {activeTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Scrollable thread */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {comments === undefined ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    Loading comments...
                  </div>
                ) : comments.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: 'var(--text-tertiary)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <MessageSquare size={32} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>No comments yet</span>
                    <span style={{ fontSize: '11px', maxWidth: '240px' }}>
                      Start a discussion, mention teammates with @, or leave notes for this task.
                    </span>
                  </div>
                ) : (
                  comments.map((c) => {
                    const isAuthor = currentUserId === c.userId;
                    const canManage = isAuthor || isOwner || isAdmin;
                    const isCurrentlyEditing = editingCommentId === c._id;

                    return (
                      <div
                        key={c._id}
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-primary)',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        {/* Author line */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                              }}
                            >
                              {c.author?.avatar ? (
                                <img src={c.author.avatar} alt={c.author.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                (c.author?.name?.[0] || 'U').toUpperCase()
                              )}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {c.author?.name || 'User'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              {timeAgo(c.createdAt)}
                            </span>
                            {c.updatedAt > c.createdAt + 1000 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                                (edited)
                              </span>
                            )}
                          </div>

                          {canManage && !isCurrentlyEditing && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(c._id);
                                  setEditingContent(c.content);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}
                                title="Edit comment"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c._id)}
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }}
                                title="Delete comment"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Comment Body / Edit View */}
                        {isCurrentlyEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              rows={3}
                              style={{
                                width: '100%',
                                padding: '8px',
                                fontSize: '12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontFamily: 'inherit',
                              }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingContent('');
                                }}
                                style={{ fontSize: '11px', padding: '2px 8px' }}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                onClick={() => handleSaveCommentEdit(c._id)}
                                style={{ fontSize: '11px', padding: '2px 8px' }}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: '13px',
                              color: 'var(--text-primary)',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {c.content}
                          </div>
                        )}

                        {/* Reactions bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {/* Existing reactions pills */}
                          {Object.entries(c.reactions || {}).map(([emoji, userIds]: [string, any]) => {
                            if (!userIds || userIds.length === 0) return null;
                            const hasReacted = currentUserId && userIds.includes(currentUserId);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(c._id, emoji)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '12px',
                                  border: hasReacted ? '1px solid var(--primary)' : '1px solid var(--border-primary)',
                                  backgroundColor: hasReacted ? 'var(--primary-light)' : 'var(--bg-secondary)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                <span>{emoji}</span>
                                <span style={{ fontWeight: 700, color: hasReacted ? 'var(--primary)' : 'var(--text-secondary)' }}>
                                  {userIds.length}
                                </span>
                              </button>
                            );
                          })}

                          {/* Quick emoji reaction pickers */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            {COMMON_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(c._id, emoji)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: '2px 4px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  opacity: 0.6,
                                  transition: 'opacity var(--transition-fast)',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                                title={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentThreadEndRef} />
              </div>

              {/* Comment Input Box */}
              <div
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid var(--border-primary)',
                  backgroundColor: 'var(--bg-primary)',
                  position: 'relative',
                }}
              >
                {/* Mention autocomplete dropdown */}
                {mentionCandidates.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 4px)',
                      left: '16px',
                      right: '16px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'var(--shadow-lg)',
                      overflow: 'hidden',
                      zIndex: 30,
                    }}
                  >
                    <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', backgroundColor: 'var(--bg-secondary)' }}>
                      Mention a member
                    </div>
                    {mentionCandidates.map((m: any) => (
                      <div
                        key={m.userId}
                        onClick={() => handleSelectMention(m)}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <AtSign size={13} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>{m.user?.name || 'Member'}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>({m.user?.email})</span>
                      </div>
                    ))}
                  </div>
                )}

                {commentError && (
                  <div style={{ color: 'var(--danger)', fontSize: '11px', marginBottom: '6px' }}>
                    {commentError}
                  </div>
                )}

                <form onSubmit={handlePostComment} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    ref={textareaRef}
                    placeholder="Write a comment... (Type @ to mention teammates)"
                    value={commentInput}
                    onChange={handleCommentChange}
                    rows={2}
                    maxLength={5000}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'none',
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {commentInput.length}/5000
                    </div>

                    <Button
                      variant="primary"
                      type="submit"
                      disabled={isSubmittingComment || !commentInput.trim()}
                      style={{ fontSize: '12px', padding: '4px 12px' }}
                    >
                      <Send size={12} style={{ marginRight: '4px' }} />
                      <span>{isSubmittingComment ? 'Posting...' : 'Comment'}</span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Toast Feedback */}
              {attachmentToast && (
                <div
                  style={{
                    padding: '8px 14px',
                    margin: '12px 16px 0',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: attachmentToast.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${attachmentToast.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: attachmentToast.type === 'success' ? '#065f46' : '#991b1b',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'fadeIn 0.2s ease',
                  }}
                >
                  {attachmentToast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span style={{ flex: 1 }}>{attachmentToast.message}</span>
                </div>
              )}

              {/* Upload Dropzone using CloudinaryUploader */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)' }}>
                <CloudinaryUploader
                  uploadPreset={attachmentsPreset}
                  onUploadSuccess={handleCloudinarySuccess}
                  onUploadError={(err) => {
                    setAttachmentToast({ type: 'error', message: err.message || 'Upload failed' });
                    setTimeout(() => setAttachmentToast(null), 4000);
                  }}
                  title="Drop files or click to upload"
                  subtitle="Images, PDFs, documents up to 50MB (Stored on Cloudinary)"
                  folder={`omniflow/workspaces/${workspaceId || 'common'}/tasks/${task._id}`}
                  maxFileSize={50 * 1024 * 1024}
                />
              </div>

              {/* Attachments List */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {attachments === undefined ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    Loading attachments...
                  </div>
                ) : attachments.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: 'var(--text-tertiary)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Paperclip size={32} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>No attachments yet</span>
                    <span style={{ fontSize: '11px' }}>
                      Upload mockups, specifications, or screenshots related to this task.
                    </span>
                  </div>
                ) : (
                  attachments.map((att: any) => {
                    const isUploader = currentUserId === att.uploadedBy;
                    const canDeleteAtt = isUploader || isOwner || isAdmin;
                    const isImage = att.fileType?.startsWith('image/') || att.cloudinaryFormat === 'jpg' || att.cloudinaryFormat === 'png' || att.cloudinaryFormat === 'webp' || att.cloudinaryFormat === 'jpeg';
                    const isPdf = att.fileType?.includes('pdf') || att.fileName?.toLowerCase().endsWith('.pdf') || att.cloudinaryFormat === 'pdf';
                    const isVideo = att.fileType?.startsWith('video/') || att.cloudinaryResourceType === 'video';
                    const isPreviewable = isImage || isPdf || isVideo;
                    const isCopied = copiedAttachmentId === att._id;
                    const fileUrl = att.cloudinarySecureUrl || att.url;

                    // High-res preview with Cloudinary transformation
                    const previewUrl = isImage
                      ? getCloudinaryTransformedUrl(fileUrl, 'w_800,h_600,c_fill')
                      : fileUrl;

                    // Thumbnail URL with transformation for images
                    const thumbUrl = isImage
                      ? getCloudinaryTransformedUrl(fileUrl, 'w_80,h_80,c_fill,q_auto,f_auto')
                      : null;

                    const handlePreviewOrDownload = () => {
                      if (isPreviewable && previewUrl) {
                        setPreviewModal({ url: previewUrl, fileName: att.fileName, fileType: att.fileType || '' });
                      } else if (fileUrl) {
                        window.open(fileUrl, '_blank', 'noopener,noreferrer');
                      }
                    };

                    return (
                      <div
                        key={att._id}
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-primary)',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div
                            onClick={handlePreviewOrDownload}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: 'var(--radius-sm)',
                              overflow: 'hidden',
                              backgroundColor: 'var(--bg-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              cursor: fileUrl ? 'pointer' : 'default',
                              border: '1px solid var(--border-primary)',
                            }}
                            title={isPreviewable ? 'Click to preview' : 'Click to download'}
                          >
                            {thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt={att.fileName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              getFileIcon(att.fileType || '')
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              onClick={handlePreviewOrDownload}
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '220px',
                                cursor: fileUrl ? 'pointer' : 'default',
                              }}
                              title={`${att.fileName} (Click to ${isPreviewable ? 'preview' : 'download'})`}
                            >
                              {att.fileName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                              {formatBytes(att.fileSize)} • uploaded by {att.uploader?.name || 'User'} • {timeAgo(att.uploadedAt)}
                            </div>
                            {att.description && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                                {att.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {/* Preview button */}
                          {isPreviewable && fileUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewModal({ url: previewUrl, fileName: att.fileName, fileType: att.fileType || '' })}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title={`Preview ${att.fileName}`}
                              aria-label="Preview attachment"
                            >
                              <Eye size={15} />
                            </button>
                          )}

                          {/* Copy Share Link */}
                          {fileUrl && (
                            <button
                              type="button"
                              onClick={() => handleCopyShareLink({ ...att, url: fileUrl })}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: isCopied ? 'var(--success)' : 'var(--text-tertiary)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color var(--transition-fast)',
                              }}
                              title={isCopied ? 'Link Copied!' : 'Copy Share Link'}
                              aria-label="Copy share link"
                            >
                              {isCopied ? <Check size={15} /> : <Link2 size={15} />}
                            </button>
                          )}

                          {/* Download Link */}
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.fileName}
                              style={{
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px',
                              }}
                              title="Download File"
                              aria-label="Download file"
                            >
                              <Download size={15} />
                            </a>
                          )}

                          {/* Delete Action */}
                          {canDeleteAtt && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(att._id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Delete Attachment"
                              aria-label="Delete attachment"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Multimedia Preview Modal (Image, PDF, Video) */}
      {previewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setPreviewModal(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Preview */}
            {previewModal.fileType.startsWith('image/') && (
              <img
                src={previewModal.url}
                alt={previewModal.fileName}
                style={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
              />
            )}

            {/* Video Player Preview */}
            {previewModal.fileType.startsWith('video/') && (
              <video
                src={previewModal.url}
                controls
                autoPlay
                style={{ maxWidth: '85vw', maxHeight: '80vh', borderRadius: 'var(--radius-md)' }}
              >
                Your browser does not support HTML5 video playback.
              </video>
            )}

            {/* PDF Viewer Preview */}
            {(previewModal.fileType.includes('pdf') || previewModal.fileName.toLowerCase().endsWith('.pdf')) && (
              <iframe
                src={previewModal.url}
                style={{ width: '85vw', height: '80vh', border: 'none', borderRadius: 'var(--radius-md)', backgroundColor: '#ffffff' }}
                title={previewModal.fileName}
              />
            )}

            <div style={{ textAlign: 'center', color: 'white', marginTop: '10px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>{previewModal.fileName}</span>
              <a
                href={previewModal.url}
                target="_blank"
                rel="noopener noreferrer"
                download={previewModal.fileName}
                style={{ color: 'var(--primary-light)', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Download size={13} />
                <span>Download</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setPreviewModal(null)}
              style={{
                position: 'absolute',
                top: '-32px',
                right: '0',
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
              }}
              aria-label="Close preview"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .task-detail-modal-grid {
            grid-template-columns: 1fr !important;
            height: 95vh !important;
            overflow-y: auto !important;
          }
        }
      `}</style>
    </div>
  );
};
