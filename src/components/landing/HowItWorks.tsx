import React from 'react';
import { Building, UserPlus, FolderPlus, Kanban } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '1',
      icon: <Building size={22} color="var(--primary)" />,
      title: 'Create Workspace',
      description: 'Set up your organization workspace with custom governance and department divisions.',
    },
    {
      step: '2',
      icon: <UserPlus size={22} color="var(--primary)" />,
      title: 'Add Your Team',
      description: 'Invite collaborators, configure role-based permissions, and map cross-functional pods.',
    },
    {
      step: '3',
      icon: <FolderPlus size={22} color="var(--primary)" />,
      title: 'Create Projects',
      description: 'Define milestones, track epics, assign owners, and establish clear release deliverables.',
    },
    {
      step: '4',
      icon: <Kanban size={22} color="var(--primary)" />,
      title: 'Manage Work',
      description: 'Coordinate execution across tasks, monitor bottlenecks, and maintain continuous delivery.',
    },
  ];

  return (
    <section
      id="how-it-works"
      style={{
        padding: '96px 24px',
        backgroundColor: 'var(--white)',
        borderBottom: '1px solid var(--slate-200)',
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 64px' }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 3.5vw, 40px)',
              fontWeight: 800,
              letterSpacing: '-1px',
              color: 'var(--slate-950)',
              marginBottom: '16px',
            }}
          >
            How It Works
          </h2>
          <p style={{ fontSize: '17px', color: 'var(--slate-600)', lineHeight: 1.6 }}>
            Four structured phases from initial setup to enterprise-wide coordination.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
          }}
        >
          {steps.map((item) => (
            <div
              key={item.step}
              style={{
                padding: '28px 24px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--white)',
                    border: '1px solid var(--slate-200)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  {item.icon}
                </div>

                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--slate-400)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  STEP 0{item.step}
                </span>
              </div>

              <div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--slate-900)',
                    marginBottom: '8px',
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--slate-600)',
                    lineHeight: 1.6,
                  }}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
