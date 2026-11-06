import React from 'react';
import {
  Search,
  Bell,
  HelpCircle,
  FolderKanban,
  CheckSquare,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  Plus
} from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

export const PlatformPreview: React.FC = () => {
  return (
    <section
      id="preview"
      style={{
        padding: '96px 24px',
        backgroundColor: 'var(--slate-50)',
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 56px' }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 3.5vw, 40px)',
              fontWeight: 800,
              letterSpacing: '-1px',
              color: 'var(--slate-950)',
              marginBottom: '16px',
            }}
          >
            The Common Workspace Architecture
          </h2>
          <p style={{ fontSize: '17px', color: 'var(--slate-600)', lineHeight: 1.6 }}>
            A disciplined, clutter-free application shell engineered for immediate comprehension and deep focus.
          </p>
        </div>

        {/* Full Mock Application Interface Preview */}
        <div
          style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--slate-300)',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden',
          }}
        >
          {/* Topbar */}
          <div
            style={{
              height: '64px',
              backgroundColor: 'var(--white)',
              borderBottom: '1px solid var(--slate-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--slate-900)',
                    color: 'var(--white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 800,
                  }}
                >
                  O
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>
                  Acme Enterprise
                </span>
              </div>

              <div
                style={{
                  height: '24px',
                  width: '1px',
                  backgroundColor: 'var(--slate-200)',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--slate-100)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: 'var(--slate-500)',
                  width: '240px',
                }}
              >
                <Search size={14} />
                <span>Search in workspace...</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slate-500)',
                }}
              >
                <Bell size={16} />
              </div>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slate-500)',
                }}
              >
                <HelpCircle size={16} />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-200)',
                  backgroundColor: 'var(--slate-50)',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    color: 'var(--white)',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  UN
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-700)' }}>
                  User Name
                </span>
              </div>
            </div>
          </div>

          {/* Main Area: Sidebar + Dashboard Content */}
          <div style={{ display: 'flex', minHeight: '520px' }}>
            {/* Sidebar */}
            <div
              style={{
                width: '230px',
                backgroundColor: 'var(--white)',
                borderRight: '1px solid var(--slate-200)',
                padding: '20px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
              className="preview-sidebar"
            >
              {[
                { label: 'Dashboard', icon: <BarChart3 size={16} />, active: true },
                { label: 'Projects', icon: <FolderKanban size={16} /> },
                { label: 'Tasks', icon: <CheckSquare size={16} /> },
                { label: 'Teams', icon: <Users size={16} /> },
                { label: 'Calendar', icon: <Calendar size={16} /> },
                { label: 'Messages', icon: <MessageSquare size={16} /> },
                { label: 'Settings', icon: <Settings size={16} /> },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: item.active ? 'var(--primary-light)' : 'transparent',
                    color: item.active ? 'var(--primary)' : 'var(--slate-600)',
                    fontSize: '13px',
                    fontWeight: item.active ? 600 : 500,
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Content Area */}
            <div
              style={{
                flex: 1,
                backgroundColor: 'var(--slate-50)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)' }}>
                    Dashboard
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                    Overview of your workspace
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-300)',
                    backgroundColor: 'var(--white)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--slate-700)',
                  }}
                >
                  <span>Select Workspace</span>
                </div>
              </div>

              {/* Dashboard KPI Skeleton Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '14px',
                }}
              >
                {[
                  'Total Projects',
                  'Active Tasks',
                  'Team Members',
                  'Pending Approvals',
                ].map((label, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--white)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--slate-200)',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--slate-500)',
                        marginBottom: '10px',
                      }}
                    >
                      {label}
                    </div>
                    <div
                      className="skeleton-shimmer"
                      style={{ width: '48px', height: '24px', marginBottom: '8px' }}
                    />
                    <div
                      className="skeleton-shimmer"
                      style={{ width: '90px', height: '10px' }}
                    />
                  </div>
                ))}
              </div>

              {/* Project Area & Task Area Placeholders */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '20px',
                }}
              >
                {/* Project Area */}
                <div
                  style={{
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-200)',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}
                  >
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-800)' }}>
                      Projects
                    </h4>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={14} /> New Project
                    </span>
                  </div>

                  <EmptyState
                    compact
                    icon={<FolderKanban size={20} />}
                    title="No projects yet"
                    description="Create your first project to get started."
                    actionLabel="Create Project"
                  />
                </div>

                {/* Task Area */}
                <div
                  style={{
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-200)',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}
                  >
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-800)' }}>
                      Tasks
                    </h4>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={14} /> New Task
                    </span>
                  </div>

                  <EmptyState
                    compact
                    icon={<CheckSquare size={20} />}
                    title="No tasks available"
                    description="Tasks assigned to you will appear here."
                    actionLabel="Create Task"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .preview-sidebar { display: none !important; }
        }
      `}</style>
    </section>
  );
};
