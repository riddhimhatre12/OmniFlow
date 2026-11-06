import React from 'react';
import { useWorkspaceAuth } from '../../hooks/useWorkspaceAuth';
import { useHasPermission } from '../../hooks/useHasPermission';

// Oxlint disable to allow exporting the hook alongside components as specified by PRD prompt 7
// oxlint-disable-next-line react/only-export-components
export { useHasPermission };

/* =========================================================================
 * 1. Component: <PermissionGate>
 * ========================================================================= */
export interface PermissionGateProps {
  permission: string;
  fallback?: React.ReactNode;
  showTooltip?: boolean;
  tooltipText?: string;
  children: React.ReactNode;
}

/**
 * Conditionally renders children if user has the specified permission.
 * If user lacks permission:
 * - If fallback is provided: renders fallback (with tooltip if showTooltip=true)
 * - If fallback is omitted:
 *    - if showTooltip=true: renders children disabled with tooltip on hover
 *    - if showTooltip=false: renders null
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  fallback = null,
  showTooltip = false,
  tooltipText = "You don't have permission to perform this action",
  children,
}) => {
  const hasPermission = useHasPermission(permission);

  if (!hasPermission) {
    if (fallback) {
      if (showTooltip) {
        return (
          <span title={tooltipText} style={{ display: 'inline-block' }}>
            {fallback}
          </span>
        );
      }
      return <>{fallback}</>;
    }

    if (showTooltip) {
      return (
        <span
          title={tooltipText}
          style={{
            display: 'inline-block',
            cursor: 'not-allowed',
            opacity: 0.6,
          }}
        >
          <div style={{ pointerEvents: 'none', display: 'contents' }}>
            {children}
          </div>
        </span>
      );
    }

    return null;
  }

  return <>{children}</>;
};

/* =========================================================================
 * 2. Component: <RoleGate>
 * ========================================================================= */
export interface RoleGateProps {
  roles: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children if user has one of the specified roles.
 * Owners always satisfy role gates.
 * If user does not match any role: renders fallback (default: null).
 */
export const RoleGate: React.FC<RoleGateProps> = ({
  roles,
  fallback = null,
  children,
}) => {
  const { userRole, isOwner } = useWorkspaceAuth();

  const hasRole =
    isOwner || (userRole?.name ? roles.includes(userRole.name) : false);

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
