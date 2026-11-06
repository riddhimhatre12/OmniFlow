import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useWorkspaceAuth } from '../../hooks/useWorkspaceAuth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Building2, AlertCircle, Loader2 } from 'lucide-react';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (workspaceId: string) => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { user } = useCurrentUser();
  const { switchWorkspace } = useWorkspaceAuth();
  const createWorkspaceMutation = useMutation(api.workspaces.createWorkspace);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Workspace name is required.');
      return;
    }

    if (!user.userId) {
      setError('User session not found. Please log in again.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await createWorkspaceMutation({
        name: trimmedName,
        description: description.trim() || undefined,
        userId: user.userId as Id<"users">,
      });

      // Reset form
      setName('');
      setDescription('');
      onClose();

      // Auto-switch to new workspace
      await switchWorkspace(res.workspaceId);
      if (onCreated) {
        onCreated(res.workspaceId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
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
        aria-labelledby="modal-title"
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--slate-200)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--slate-150)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              <Building2 size={20} />
            </div>
            <div>
              <h2
                id="modal-title"
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--slate-900)',
                  lineHeight: 1.2,
                }}
              >
                Create New Workspace
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                Collaborate with your team in a dedicated space
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--slate-400)',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  fontSize: '13px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Input
                label="Workspace Name"
                placeholder="e.g. Acme Innovations, Product Team"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                autoFocus
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '4px', display: 'block' }}>
                Names must be unique across your created workspaces.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="workspace-desc"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--slate-700)',
                }}
              >
                Description <span style={{ fontSize: '11px', color: 'var(--slate-400)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <textarea
                id="workspace-desc"
                rows={3}
                placeholder="Describe the projects or department sharing this workspace..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-250)',
                  backgroundColor: 'var(--white)',
                  fontSize: '13px',
                  color: 'var(--slate-900)',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--slate-250)')}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: 'var(--slate-50)',
              borderTop: '1px solid var(--slate-150)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !name.trim()}
              icon={loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : undefined}
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
