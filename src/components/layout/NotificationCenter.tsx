import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useWorkspaceAuth } from '../../context/WorkspaceAuthContext';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  Bell,
  CheckCheck,
  X,
  Trash2,
  Settings,
  CheckSquare,
  PlayCircle,
  Flag,
  UserPlus,
  Shield,
  ArrowRightCircle,
  FolderPlus,
  MessageSquare,
  AtSign,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface NotificationCenterProps {
  onNavigate: (route: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getNotificationVisual(type: string) {
  switch (type) {
    case 'task_assigned':
      return {
        icon: <CheckSquare size={16} />,
        bg: '#eff6ff',
        color: '#2563eb',
        label: 'Task Assigned',
      };
    case 'task_status_changed':
      return {
        icon: <ArrowRightCircle size={16} />,
        bg: '#fffbeb',
        color: '#d97706',
        label: 'Status Changed',
      };
    case 'sprint_started':
      return {
        icon: <PlayCircle size={16} />,
        bg: '#ecfdf5',
        color: '#059669',
        label: 'Sprint Started',
      };
    case 'sprint_closed':
      return {
        icon: <Flag size={16} />,
        bg: '#faf5ff',
        color: '#7c3aed',
        label: 'Sprint Closed',
      };
    case 'invite_received':
    case 'member_joined':
      return {
        icon: <UserPlus size={16} />,
        bg: '#f0fdfa',
        color: '#0d9488',
        label: 'Team Member',
      };
    case 'role_changed':
      return {
        icon: <Shield size={16} />,
        bg: '#f5f3ff',
        color: '#6366f1',
        label: 'Role Updated',
      };
    case 'project_created':
      return {
        icon: <FolderPlus size={16} />,
        bg: '#f0f9ff',
        color: '#0284c7',
        label: 'Project Created',
      };
    case 'task_commented':
      return {
        icon: <MessageSquare size={16} />,
        bg: '#f0fdf4',
        color: '#16a34a',
        label: 'Comment',
      };
    case 'mention':
      return {
        icon: <AtSign size={16} />,
        bg: '#fdf2f8',
        color: '#db2777',
        label: 'Mention',
      };
    default:
      return {
        icon: <Bell size={16} />,
        bg: '#f1f5f9',
        color: '#475569',
        label: 'Notification',
      };
  }
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  const { workspace } = useWorkspaceAuth();
  const { user } = useCurrentUser();

  const userId = user?.userId ? (user.userId as any) : undefined;
  const workspaceId = workspace?.id ? (workspace.id as any) : undefined;

  // Real-time notification queries
  const notifications = useQuery(
    api.notifications.getUserNotifications,
    userId && workspaceId ? { userId, workspaceId, limit: 40 } : 'skip'
  );

  const unreadCount = useQuery(
    api.notifications.getUnreadNotificationCount,
    userId && workspaceId ? { userId, workspaceId } : 'skip'
  ) ?? 0;

  // Mutations
  const markAsRead = useMutation(api.notifications.markNotificationAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllNotificationsAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);
  const clearAllNotifications = useMutation(api.notifications.clearAllNotifications);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read) {
      try {
        await markAsRead({ notificationId: notif.notificationId });
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    setIsOpen(false);
    if (notif.link) {
      onNavigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId || !workspaceId) return;
    try {
      await markAllAsRead({ userId, workspaceId });
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, notificationId: any) => {
    e.stopPropagation();
    try {
      await deleteNotification({ notificationId });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearAll = async () => {
    if (!userId || !workspaceId) return;
    if (window.confirm('Clear all notifications in this workspace?')) {
      try {
        await clearAllNotifications({ userId, workspaceId });
      } catch (err) {
        console.error('Failed to clear notifications:', err);
      }
    }
  };

  const filteredNotifications = (notifications || []).filter((n: any) => {
    if (activeFilter === 'unread') return !n.read;
    return true;
  });

  const unreadList = filteredNotifications.filter((n: any) => !n.read);
  const readList = filteredNotifications.filter((n: any) => n.read);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--slate-200)',
          backgroundColor: isOpen ? 'var(--slate-100)' : 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: unreadCount > 0 ? 'var(--primary)' : 'var(--slate-600)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        aria-label="Notifications"
        title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '10px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--white)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxWidth: 'calc(100vw - 24px)',
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
            border: '1px solid var(--slate-200)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--slate-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--slate-50)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--slate-900)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    color: 'var(--primary)',
                    padding: '2px 7px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--slate-400)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              padding: '8px 16px',
              gap: '6px',
              borderBottom: '1px solid var(--slate-100)',
              backgroundColor: 'var(--white)',
            }}
          >
            <button
              onClick={() => setActiveFilter('all')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeFilter === 'all' ? 'var(--slate-100)' : 'transparent',
                color: activeFilter === 'all' ? 'var(--slate-900)' : 'var(--slate-500)',
                fontSize: '12px',
                fontWeight: activeFilter === 'all' ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              All {notifications ? `(${notifications.length})` : ''}
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeFilter === 'unread' ? 'var(--slate-100)' : 'transparent',
                color: activeFilter === 'unread' ? 'var(--slate-900)' : 'var(--slate-500)',
                fontSize: '12px',
                fontWeight: activeFilter === 'unread' ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          </div>

          {/* Notifications Scrollable List */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {notifications === undefined ? (
              // Loading state skeleton
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--slate-100)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div
                        style={{
                          height: '14px',
                          width: '70%',
                          backgroundColor: 'var(--slate-100)',
                          borderRadius: '4px',
                        }}
                      />
                      <div
                        style={{
                          height: '12px',
                          width: '90%',
                          backgroundColor: 'var(--slate-50)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              // Empty State
              <div
                style={{
                  padding: '40px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '4px',
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--slate-800)' }}>
                  All caught up! 🎉
                </div>
                <div style={{ fontSize: '12px', color: 'var(--slate-500)', maxWidth: '220px' }}>
                  {activeFilter === 'unread'
                    ? 'No unread notifications right now.'
                    : 'You have no notifications in this workspace.'}
                </div>
              </div>
            ) : (
              // Render List
              <>
                {/* Unread Section */}
                {unreadList.length > 0 && (
                  <div>
                    {unreadList.map((item: any) => (
                      <NotificationRow
                        key={item.notificationId}
                        item={item}
                        onClick={() => handleNotificationClick(item)}
                        onDelete={(e) => handleDeleteItem(e, item.notificationId)}
                      />
                    ))}
                  </div>
                )}

                {/* Earlier Divider if both exist */}
                {unreadList.length > 0 && readList.length > 0 && (
                  <div
                    style={{
                      padding: '6px 16px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--slate-400)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      backgroundColor: 'var(--slate-50)',
                      borderTop: '1px solid var(--slate-100)',
                      borderBottom: '1px solid var(--slate-100)',
                    }}
                  >
                    Earlier
                  </div>
                )}

                {/* Read Section */}
                {readList.length > 0 && (
                  <div>
                    {readList.map((item: any) => (
                      <NotificationRow
                        key={item.notificationId}
                        item={item}
                        onClick={() => handleNotificationClick(item)}
                        onDelete={(e) => handleDeleteItem(e, item.notificationId)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--slate-100)',
              backgroundColor: 'var(--slate-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {filteredNotifications.length > 0 ? (
              <button
                onClick={handleClearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--slate-500)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 4px',
                }}
              >
                <Trash2 size={13} />
                Clear all
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                onNavigate('/preferences');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 4px',
              }}
            >
              <Settings size={13} />
              Notification Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface NotificationRowProps {
  item: any;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const NotificationRow: React.FC<NotificationRowProps> = ({ item, onClick, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const visual = getNotificationVisual(item.type);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        cursor: 'pointer',
        backgroundColor: !item.read
          ? 'rgba(238, 242, 255, 0.45)'
          : isHovered
          ? 'var(--slate-50)'
          : 'var(--white)',
        borderBottom: '1px solid var(--slate-100)',
        position: 'relative',
        transition: 'background-color 0.12s ease',
      }}
    >
      {/* Unread indicator bar on left */}
      {!item.read && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '3px',
            backgroundColor: 'var(--primary)',
          }}
        />
      )}

      {/* Type Icon Badge */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: visual.bg,
          color: visual.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        {visual.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: item.read ? 600 : 700,
              color: 'var(--slate-900)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.title}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--slate-400)',
              flexShrink: 0,
            }}
          >
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>

        <p
          style={{
            margin: '2px 0 0 0',
            fontSize: '12px',
            color: 'var(--slate-600)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.message}
        </p>
      </div>

      {/* Action Hover icons */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            right: '12px',
            bottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--white)',
            padding: '2px',
            borderRadius: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          {item.link && (
            <span
              style={{
                color: 'var(--primary)',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Open"
            >
              <ExternalLink size={13} />
            </span>
          )}
          <button
            onClick={onDelete}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--slate-400)',
              cursor: 'pointer',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '2px',
            }}
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
