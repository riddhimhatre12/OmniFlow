import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users2,
  Calendar,
  MessageSquare,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Layers,
  ChevronsUpDown,
  Check,
  Plus,
  ShieldCheck,
  Target,
  History,
  Milestone,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useWorkspaceAuth } from '../../hooks/useWorkspaceAuth';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  activeItem: string;
  onSelectItem: (item: string) => void;
  onNavigate: (route: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
  activeItem,
  onSelectItem,
  onNavigate,
}) => {
  const { user, logout } = useCurrentUser();
  const { workspace, workspaces, userRole, switchWorkspace } = useWorkspaceAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'UN';

  const wsInitials = workspace?.name
    ? workspace.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'WS';

  const allWorkspaces = workspaces && workspaces.length > 0
    ? workspaces
    : workspace
      ? [{
          workspaceId: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          avatar: workspace.avatar,
          memberRole: userRole?.name || 'Member',
        }]
      : [];

  const workspaceProjects = useQuery(
    api.projects.getWorkspaceProjects,
    workspace ? { workspaceId: workspace.id as Id<"workspaces"> } : "skip"
  );
  const activeProjectId = workspaceProjects?.[0]?.id;

  const hasActiveWorkspace = Boolean(workspace);

  // When no workspace is joined, only show Dashboard in sidebar per user requirement
  const navItems = hasActiveWorkspace
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'projects', label: 'Projects', icon: <FolderKanban size={18} /> },
        { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={18} /> },
        { id: 'sprints', label: 'Sprint Planning', icon: <Target size={18} /> },
        { id: 'history', label: 'Sprint History', icon: <History size={18} /> },
        { id: 'roadmap', label: 'Roadmap', icon: <Milestone size={18} /> },
        { id: 'teams', label: 'Teams', icon: <Users2 size={18} /> },
        { id: 'roles', label: 'Roles', icon: <ShieldCheck size={18} /> },
        { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
        { id: 'messages', label: 'Messages', icon: <MessageSquare size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
        { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 45,
          }}
          className="sidebar-backdrop"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          backgroundColor: 'var(--white)',
          borderRight: '1px solid var(--slate-200)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width 0.2s ease, transform 0.2s ease',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 46,
          flexShrink: 0,
          overflowX: 'visible',
        }}
      >
        {/* Top: Logo, Workspace Selector & Nav Items */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Brand Header */}
          <div
            style={{
              height: 'var(--topbar-height)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              padding: collapsed ? '0' : '0 20px',
              borderBottom: '1px solid var(--slate-200)',
            }}
          >
            <div
              onClick={() => onNavigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--slate-900)',
                  color: 'var(--white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Layers size={18} />
              </div>
              {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: 'var(--slate-950)',
                      letterSpacing: '-0.3px',
                      lineHeight: 1.1,
                    }}
                  >
                    OmniFlow
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--slate-400)', fontWeight: 600 }}>
                    PROJECT OS
                  </span>
                </div>
              )}
            </div>

            {/* Collapse toggle (desktop / tablet) */}
            {!collapsed && (
              <button
                onClick={onToggleCollapse}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--slate-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slate-500)',
                  cursor: 'pointer',
                  backgroundColor: 'var(--white)',
                }}
                className="collapse-toggle-btn"
                title="Collapse sidebar"
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </div>

          {/* 1. NEW WORKSPACE SELECTOR DROPDOWN (below logo, above nav links) */}
          <div
            ref={dropdownRef}
            style={{
              padding: collapsed ? '12px 0 8px 0' : '14px 12px 8px 12px',
              display: 'flex',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {collapsed ? (
              // Collapsed workspace trigger
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title={workspace?.name ? `Active Workspace: ${workspace.name}` : 'Select Workspace'}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--white)',
                  border: '1px solid var(--primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'all 0.15s ease',
                }}
              >
                {workspace?.avatar ? (
                  <img
                    src={workspace.avatar}
                    alt={workspace.name}
                    style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }}
                  />
                ) : (
                  wsInitials
                )}
              </button>
            ) : (
              // Expanded workspace selector button
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: dropdownOpen ? 'var(--slate-100)' : 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: 'var(--shadow-xs)',
                }}
                onMouseEnter={(e) => {
                  if (!dropdownOpen) e.currentTarget.style.backgroundColor = 'var(--slate-100)';
                }}
                onMouseLeave={(e) => {
                  if (!dropdownOpen) e.currentTarget.style.backgroundColor = 'var(--slate-50)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  {workspace?.avatar ? (
                    <img
                      src={workspace.avatar}
                      alt={workspace.name}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--primary)',
                        color: 'var(--white)',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {wsInitials}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--slate-900)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                      }}
                    >
                      {workspace?.name || 'No Workspace'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: workspace ? 'var(--slate-500)' : 'var(--primary)',
                        fontWeight: workspace ? 400 : 600,
                        lineHeight: 1.2,
                        marginTop: '2px',
                      }}
                    >
                      {workspace ? (userRole?.name || 'Workspace') : '+ Create Workspace'}
                    </span>
                  </div>
                </div>
                <ChevronsUpDown size={15} style={{ color: 'var(--slate-400)', flexShrink: 0, marginLeft: '4px' }} />
              </button>
            )}

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: collapsed ? 'calc(100% + 6px)' : '12px',
                  width: collapsed ? '240px' : 'calc(100% - 24px)',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  zIndex: 80,
                  animation: 'fadeIn 0.12s ease',
                }}
              >
                <div
                  style={{
                    padding: '6px 8px 4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--slate-400)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Workspaces
                </div>

                <div
                  style={{
                    maxHeight: '210px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  {allWorkspaces.length > 0 ? (
                    allWorkspaces.map((ws) => {
                      const isCurrent = ws.workspaceId === workspace?.id;
                      const itemInitials = ws.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <button
                          key={ws.workspaceId}
                          type="button"
                          onClick={async () => {
                            setDropdownOpen(false);
                            if (!isCurrent) {
                              await switchWorkspace(ws.workspaceId);
                            }
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-xs)',
                            border: 'none',
                            backgroundColor: isCurrent ? 'var(--primary-subtle)' : 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background-color 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--slate-100)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                backgroundColor: isCurrent ? 'var(--primary)' : 'var(--slate-200)',
                                color: isCurrent ? 'var(--white)' : 'var(--slate-700)',
                                fontSize: '10px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                              }}
                            >
                              {ws.avatar ? (
                                <img
                                  src={ws.avatar}
                                  alt={ws.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                itemInitials
                              )}
                            </div>
                            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: isCurrent ? 700 : 500,
                                  color: isCurrent ? 'var(--primary)' : 'var(--slate-900)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {ws.name}
                              </span>
                              {ws.memberRole && (
                                <span style={{ fontSize: '10px', color: 'var(--slate-400)' }}>
                                  {ws.memberRole}
                                </span>
                              )}
                            </div>
                          </div>
                          {isCurrent && <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                        </button>
                      );
                    })
                  ) : (
                    <div
                      style={{
                        padding: '10px 8px',
                        fontSize: '12px',
                        color: 'var(--slate-500)',
                        fontStyle: 'italic',
                        textAlign: 'center',
                      }}
                    >
                      No workspaces found
                    </div>
                  )}
                </div>

                {/* Workspace Settings Action */}
                {workspace && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigate(`/workspace/${workspace.id}/settings`);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--slate-700)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--slate-100)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Settings size={15} />
                    <span>Workspace Settings</span>
                  </button>
                )}

                {/* Create Workspace Action */}
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setIsCreateModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Plus size={15} />
                  <span>Create New Workspace</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Items List */}
          <nav style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectItem(item.id);
                    onCloseMobile();
                    if (item.id === 'settings' || item.id === 'notifications') {
                      onNavigate('/preferences');
                    } else if (item.id === 'dashboard') {
                      onNavigate('/dashboard');
                    } else if (item.id === 'projects') {
                      onNavigate('/projects');
                    } else if (item.id === 'tasks') {
                      if (activeProjectId) {
                        onNavigate(`/projects/${activeProjectId}/tasks`);
                      } else {
                        onNavigate('/tasks');
                      }
                    } else if (item.id === 'sprints') {
                      if (activeProjectId) {
                        onNavigate(`/projects/${activeProjectId}/sprints/planning`);
                      } else {
                        onNavigate('/projects');
                      }
                    } else if (item.id === 'history') {
                      if (activeProjectId) {
                        onNavigate(`/projects/${activeProjectId}/sprints/history`);
                      } else {
                        onNavigate('/projects');
                      }
                    } else if (item.id === 'roadmap') {
                      if (activeProjectId) {
                        onNavigate(`/projects/${activeProjectId}/roadmap`);
                      } else {
                        onNavigate('/roadmap');
                      }
                    } else if (item.id === 'teams') {
                      onNavigate('/teams');
                    } else if (item.id === 'roles') {
                      onNavigate('/roles');
                    }
                  }}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: collapsed ? '10px 0' : '9px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--slate-600)',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all 0.12s ease',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--slate-100)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? 'var(--primary)' : 'var(--slate-500)',
                      width: collapsed ? '100%' : 'auto',
                    }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Profile Card & Logout per Prompt 5 */}
        <div
          style={{
            padding: '16px 12px',
            borderTop: '1px solid var(--slate-200)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {/* 3. CURRENT WORKSPACE BADGE (Above user info) */}
          {!collapsed && (
            <div
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: workspace ? 'var(--primary-subtle)' : 'var(--slate-100)',
                border: workspace ? '1px solid rgba(79, 70, 229, 0.12)' : '1px solid var(--slate-200)',
                fontSize: '10px',
                fontWeight: 700,
                color: workspace ? 'var(--primary)' : 'var(--slate-500)',
                letterSpacing: '0.4px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={workspace ? `Active Workspace: ${workspace.name}` : 'No active workspace'}
            >
              <span style={{ opacity: 0.7, textTransform: 'uppercase', flexShrink: 0 }}>
                CURRENT WORKSPACE:
              </span>
              <span
                style={{
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {workspace?.name || 'None'}
              </span>
            </div>
          )}

          {/* User Profile Card */}
          <div
            onClick={() => {
              onCloseMobile();
              onNavigate('/profile');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: collapsed ? '8px 0' : '8px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--slate-50)',
              border: '1px solid var(--slate-150)',
              cursor: 'pointer',
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--slate-100)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--slate-50)')}
            title={
              collapsed
                ? `${user.name} (${userRole?.name || user.role || 'Member'}) • Workspace: ${workspace?.name || 'OmniFlow'}`
                : undefined
            }
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: 'var(--slate-800)',
                color: 'var(--white)',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>
            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--slate-900)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {user.name}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--slate-500)',
                    fontWeight: 500,
                  }}
                >
                  {userRole?.name || user.role || 'Member'}
                </span>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              logout();
              onCloseMobile();
              onNavigate('/login');
            }}
            title={collapsed ? 'Logout' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: collapsed ? '10px 0' : '8px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              fontSize: '13px',
              fontWeight: 500,
              width: '100%',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--danger-light)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogOut size={16} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* 2. CREATE WORKSPACE MODAL */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <style>{`
        @media (max-width: 820px) {
          .app-sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            transform: translateX(-100%);
            box-shadow: var(--shadow-xl);
          }
          .app-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .collapse-toggle-btn {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};
