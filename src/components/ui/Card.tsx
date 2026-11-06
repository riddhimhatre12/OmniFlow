import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  className = '',
  style,
  ...props
}) => {
  const paddingMap = {
    none: '0',
    sm: '16px',
    md: '24px',
    lg: '32px',
  };

  return (
    <div
      className={`card ${className}`}
      style={{ padding: paddingMap[padding], ...style }}
      {...props}
    >
      {children}
    </div>
  );
};
