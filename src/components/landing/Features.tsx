import React from 'react';
import {
  FolderKanban,
  Users2,
  ShieldCheck,
  GitFork,
  CheckSquare,
  LayoutGrid
} from 'lucide-react';
import { Card } from '../ui/Card';

export const Features: React.FC = () => {
  const features = [
    {
      icon: <FolderKanban size={24} color="var(--primary)" />,
      title: 'Project Management',
      description:
        'Structured roadmaps, milestone timelines, and portfolio visibility configured to scale with expanding cross-functional teams.',
    },
    {
      icon: <Users2 size={24} color="var(--primary)" />,
      title: 'Team Collaboration',
      description:
        'Unified spaces connecting product managers, developers, and designers with threaded discussions and contextual handoffs.',
    },
    {
      icon: <ShieldCheck size={24} color="var(--primary)" />,
      title: 'Role-Based Access',
      description:
        'Fine-grained permissions and governance safeguards that ensure team members only access appropriate workspace data and actions.',
    },
    {
      icon: <GitFork size={24} color="var(--primary)" />,
      title: 'Custom Workflows',
      description:
        'Tailor-fit status transitions, automated review gates, and adaptable delivery tracks matching your unique development cadence.',
    },
    {
      icon: <CheckSquare size={24} color="var(--primary)" />,
      title: 'Task Management',
      description:
        'Atomic item tracking, priority weighting, and deadline visibility designed to eliminate bottlenecks before they impact delivery.',
    },
    {
      icon: <LayoutGrid size={24} color="var(--primary)" />,
      title: 'Centralized Dashboard',
      description:
        'A single consolidated command center providing real-time visibility into workload distribution and portfolio health.',
    },
  ];

  return (
    <section
      id="features"
      style={{
        padding: '96px 24px',
        backgroundColor: 'var(--white)',
        borderTop: '1px solid var(--slate-200)',
        borderBottom: '1px solid var(--slate-200)',
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 64px' }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 3.5vw, 40px)',
              fontWeight: 800,
              letterSpacing: '-1px',
              color: 'var(--slate-950)',
              marginBottom: '16px',
            }}
          >
            Built for modern engineering and product teams
          </h2>
          <p style={{ fontSize: '17px', color: 'var(--slate-600)', lineHeight: 1.6 }}>
            Every essential work-management pillar unified in an intentional, high-performance visual interface.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {features.map((item, idx) => (
            <Card
              key={idx}
              padding="lg"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--white)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </div>

              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--slate-900)',
                  letterSpacing: '-0.3px',
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
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
