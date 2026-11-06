import React from 'react';
import { ArrowRight, LayoutDashboard, CheckCircle2, Shield, Sparkles, FolderGit2, Users, Calendar, Search } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeroProps {
  onNavigate: (route: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  return (
    <section
      style={{
        paddingTop: '64px',
        paddingBottom: '80px',
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(29, 78, 216, 0.08), transparent 70%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Subtle Product Status Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--white)',
            border: '1px solid var(--slate-200)',
            boxShadow: 'var(--shadow-xs)',
            marginBottom: '28px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-700)' }}>
            Enterprise Foundation Release
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
            }}
          >
            v1.0 Preview
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(36px, 5.5vw, 64px)',
            fontWeight: 800,
            letterSpacing: '-1.8px',
            color: 'var(--slate-950)',
            maxWidth: '920px',
            lineHeight: 1.08,
            marginBottom: '22px',
          }}
        >
          One Platform. Every Team. Everything Connected.
        </h1>

        {/* Supporting text */}
        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: 'var(--slate-600)',
            maxWidth: '680px',
            lineHeight: 1.6,
            marginBottom: '36px',
            fontWeight: 400,
          }}
        >
          A unified enterprise workspace built to align cross-functional initiatives,
          streamline project pipelines, orchestrate custom team workflows, and enable
          seamless real-time collaboration across your entire organization.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '56px',
          }}
        >
          <Button
            size="lg"
            variant="primary"
            onClick={() => onNavigate('/login')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
            style={{ padding: '14px 28px' }}
          >
            Get Started
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={() => onNavigate('/login')}
            style={{ padding: '14px 28px' }}
          >
            Login to Workspace
          </Button>
        </div>

        {/* Visual Proof Points */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
            flexWrap: 'wrap',
            marginBottom: '60px',
            fontSize: '13px',
            color: 'var(--slate-500)',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span>Unified Architecture</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="var(--primary)" />
            <span>Enterprise-Grade Security</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--slate-400)" />
            <span>Zero Data Clutter</span>
          </div>
        </div>

        {/* Product Visual Mockup */}
        <div
          style={{
            width: '100%',
            maxWidth: '1100px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--slate-300)',
            boxShadow: 'var(--shadow-xl)',
            backgroundColor: 'var(--white)',
            overflow: 'hidden',
            textAlign: 'left',
          }}
        >
          {/* Mock Window Header */}
          <div
            style={{
              height: '42px',
              backgroundColor: 'var(--slate-100)',
              borderBottom: '1px solid var(--slate-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--slate-500)',
                backgroundColor: 'var(--white)',
                padding: '4px 20px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--slate-200)',
              }}
            >
              <LayoutDashboard size={13} />
              <span>app.omniflow.internal/dashboard/overview</span>
            </div>

            <div style={{ width: '50px' }} />
          </div>

          {/* Mock UI Frame */}
          <div style={{ display: 'flex', minHeight: '440px', backgroundColor: 'var(--slate-50)' }}>
            {/* Mock Sidebar */}
            <div
              style={{
                width: '210px',
                backgroundColor: 'var(--white)',
                borderRight: '1px solid var(--slate-200)',
                padding: '18px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
              className="mock-sidebar"
            >
              {/* Workspace indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--slate-200)',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--white)',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  O
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="skeleton-shimmer" style={{ width: '80px', height: '10px', marginBottom: '4px' }} />
                  <div className="skeleton-shimmer" style={{ width: '50px', height: '8px' }} />
                </div>
              </div>

              {/* Sidebar items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--slate-600)',
                    fontSize: '13px',
                  }}
                >
                  <FolderGit2 size={16} />
                  <span>Projects</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--slate-600)',
                    fontSize: '13px',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Tasks</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--slate-600)',
                    fontSize: '13px',
                  }}
                >
                  <Users size={16} />
                  <span>Teams</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--slate-600)',
                    fontSize: '13px',
                  }}
                >
                  <Calendar size={16} />
                  <span>Calendar</span>
                </div>
              </div>

              {/* Bottom user placeholder */}
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--slate-150)',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--slate-200)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--slate-600)',
                  }}
                >
                  UN
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div className="skeleton-shimmer" style={{ width: '70px', height: '10px' }} />
                  <div className="skeleton-shimmer" style={{ width: '45px', height: '8px' }} />
                </div>
              </div>
            </div>

            {/* Mock Main Content Area */}
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--slate-200)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Workspace Overview
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                    Enterprise Foundation Layout
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--white)',
                      border: '1px solid var(--slate-200)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--slate-400)',
                    }}
                  >
                    <Search size={14} />
                    <span>Search items...</span>
                  </div>
                  <div
                    style={{
                      height: '32px',
                      padding: '0 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--primary)',
                      color: 'var(--white)',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    + New
                  </div>
                </div>
              </div>

              {/* 4 Mock KPI Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '14px',
                }}
              >
                {[
                  { label: 'Total Projects' },
                  { label: 'Active Tasks' },
                  { label: 'Team Members' },
                  { label: 'Pending Approvals' },
                ].map((kpi, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--white)',
                      border: '1px solid var(--slate-200)',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-500)', marginBottom: '8px' }}>
                      {kpi.label}
                    </div>
                    <div className="skeleton-shimmer" style={{ width: '56px', height: '22px', marginBottom: '8px' }} />
                    <div className="skeleton-shimmer" style={{ width: '80px', height: '10px' }} />
                  </div>
                ))}
              </div>

              {/* 2 Mock Content Columns */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* Project Area Placeholder */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--white)',
                    border: '1px solid var(--slate-200)',
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
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-800)' }}>
                      Projects
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>Empty State</span>
                  </div>
                  <div
                    style={{
                      padding: '28px 16px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px dashed var(--slate-200)',
                      backgroundColor: 'var(--slate-50)',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      className="skeleton-shimmer"
                      style={{ width: '120px', height: '14px', margin: '0 auto 8px' }}
                    />
                    <div
                      className="skeleton-shimmer"
                      style={{ width: '180px', height: '10px', margin: '0 auto' }}
                    />
                  </div>
                </div>

                {/* Task Area Placeholder */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--white)',
                    border: '1px solid var(--slate-200)',
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
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-800)' }}>
                      Tasks
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>Empty State</span>
                  </div>
                  <div
                    style={{
                      padding: '28px 16px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px dashed var(--slate-200)',
                      backgroundColor: 'var(--slate-50)',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      className="skeleton-shimmer"
                      style={{ width: '110px', height: '14px', margin: '0 auto 8px' }}
                    />
                    <div
                      className="skeleton-shimmer"
                      style={{ width: '160px', height: '10px', margin: '0 auto' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mock-sidebar { display: none !important; }
        }
      `}</style>
    </section>
  );
};
