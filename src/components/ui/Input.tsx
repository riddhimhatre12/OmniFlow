import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--slate-700)',
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leftIcon && (
          <div
            style={{
              position: 'absolute',
              left: '12px',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: 'var(--slate-400)',
            }}
          >
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          className={`input-field ${className}`}
          style={{
            width: '100%',
            height: '42px',
            padding: `0 ${rightIcon ? '40px' : '14px'} 0 ${leftIcon ? '38px' : '14px'}`,
            borderRadius: 'var(--radius-sm)',
            border: error ? '1px solid var(--danger)' : '1px solid var(--slate-300)',
            backgroundColor: 'var(--white)',
            color: 'var(--slate-900)',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--primary)';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px rgba(220, 38, 38, 0.15)'
              : '0 0 0 3px var(--primary-focus)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--slate-300)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />

        {rightIcon && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span>
      ) : helperText ? (
        <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>{helperText}</span>
      ) : null}
    </div>
  );
};
