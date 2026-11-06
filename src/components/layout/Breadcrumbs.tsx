import React, { useMemo } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface BreadcrumbsProps {
  onNavigate: (route: string) => void;
}

interface BreadcrumbItem {
  label: string;
  route?: string;
  isCurrent?: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ onNavigate }) => {
  const pathname = window.location.pathname;

  // Extract projectId if present in URL
  const projectId = useMemo(() => {
    const match = pathname.match(/\/projects\/([^/]+)/);
    return match ? (match[1] as Id<"projects">) : null;
  }, [pathname]);

  // Fetch project details for label
  const project = useQuery(
    api.projects.getProjectDetails,
    projectId ? { projectId } : "skip"
  );

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', route: '/dashboard' },
    ];

    if (pathname === '/dashboard' || pathname === '/') {
      return [{ label: 'Home', isCurrent: true }];
    }

    if (pathname === '/projects') {
      items.push({ label: 'Projects', isCurrent: true });
      return items;
    }

    if (pathname === '/tasks') {
      items.push({ label: 'Tasks', isCurrent: true });
      return items;
    }

    if (pathname === '/teams') {
      items.push({ label: 'Team Members', isCurrent: true });
      return items;
    }

    if (pathname === '/roles') {
      items.push({ label: 'Workspace Roles', isCurrent: true });
      return items;
    }

    if (pathname === '/profile') {
      items.push({ label: 'Profile Settings', isCurrent: true });
      return items;
    }

    if (pathname === '/preferences' || pathname.startsWith('/settings')) {
      items.push({ label: 'Settings', route: '/preferences' });
      items.push({ label: 'Preferences', isCurrent: true });
      return items;
    }

    // Projects deep routes: /projects/:projectId/...
    if (projectId) {
      items.push({ label: 'Projects', route: '/projects' });
      const projectName = project?.name || 'Project';

      if (pathname.includes('/sprints/planning')) {
        items.push({ label: projectName, route: `/projects/${projectId}/tasks` });
        items.push({ label: 'Sprint Planning', isCurrent: true });
      } else if (pathname.includes('/sprints/history') || pathname.includes('/history')) {
        items.push({ label: projectName, route: `/projects/${projectId}/tasks` });
        items.push({ label: 'Sprint History', isCurrent: true });
      } else if (pathname.includes('/tasks')) {
        items.push({ label: projectName, isCurrent: true });
      } else {
        items.push({ label: projectName, isCurrent: true });
      }

      return items;
    }

    return items;
  }, [pathname, projectId, project]);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: 'var(--slate-500)',
        padding: '0 0 16px 0',
      }}
    >
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1 || item.isCurrent;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight
                size={13}
                color="var(--slate-400)"
                style={{ flexShrink: 0 }}
              />
            )}

            {isLast ? (
              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--slate-900)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '220px',
                }}
              >
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => item.route && onNavigate(item.route)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--slate-500)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'color 0.12s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-500)')}
              >
                {index === 0 && <Home size={12} />}
                <span>{item.label}</span>
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
