import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? '28px 16px' : '48px 24px',
        border: '1px dashed var(--slate-200)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--slate-50)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {icon && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: compact ? '40px' : '52px',
            height: compact ? '40px' : '52px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--white)',
            border: '1px solid var(--slate-200)',
            color: 'var(--slate-400)',
            marginBottom: compact ? '12px' : '16px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          {icon}
        </div>
      )}

      <h4
        style={{
          fontSize: compact ? '14px' : '16px',
          fontWeight: 600,
          color: 'var(--slate-800)',
          marginBottom: '6px',
        }}
      >
        {title}
      </h4>

      <p
        style={{
          fontSize: compact ? '12px' : '13px',
          color: 'var(--slate-500)',
          maxWidth: '360px',
          marginBottom: actionLabel || secondaryActionLabel ? (compact ? '16px' : '20px') : '0',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {actionLabel && (
            <Button size="sm" variant="secondary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button size="sm" variant="ghost" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
