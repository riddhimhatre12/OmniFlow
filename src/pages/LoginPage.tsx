import React from 'react';
import { Layers, ShieldCheck, CheckCircle2, Zap, Lock } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';

interface LoginPageProps {
  onNavigate: (route: string) => void;
  initialMode?: 'login' | 'signup';
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, initialMode = 'login' }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: 'var(--white)',
      }}
    >
      {/* Left Column: Branding / Value Proposition Banner (Desktop / Tablet) */}
      <div
        style={{
          flex: '1 1 50%',
          backgroundColor: 'var(--slate-900)',
          color: 'var(--white)',
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="auth-branding-col"
      >
        {/* Subtle decorative grid/glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(29, 78, 216, 0.15) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(30, 64, 175, 0.2) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        {/* Brand Header */}
        <div
          onClick={() => onNavigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <Layers size={22} color="var(--white)" />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.1 }}>
              OmniFlow
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Enterprise Platform
            </div>
          </div>
        </div>

        {/* Central Value Statement & Illustration Cards */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '480px', margin: '48px 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--slate-300)',
              marginBottom: '20px',
            }}
          >
            <ShieldCheck size={14} color="#60a5fa" />
            <span>Enterprise Identity & SSO Ready</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: 800,
              letterSpacing: '-1px',
              color: 'var(--white)',
              lineHeight: 1.18,
              marginBottom: '18px',
            }}
          >
            One single workspace for your entire enterprise.
          </h1>

          <p style={{ fontSize: '15px', color: 'var(--slate-300)', lineHeight: 1.6, marginBottom: '36px' }}>
            Consolidate roadmaps, sprint execution, organizational governance, and cross-team communication in a unified interface.
          </p>

          {/* Value Props List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                icon: <CheckCircle2 size={18} color="#34d399" />,
                title: 'High-Density Workflows',
                desc: 'Zero clutter, fast keyboard shortcuts, and instant context switching.',
              },
              {
                icon: <Lock size={18} color="#60a5fa" />,
                title: 'Role-Based Governance',
                desc: 'Strict permission boundaries and workspace division for compliance.',
              },
              {
                icon: <Zap size={18} color="#fbbf24" />,
                title: 'Streamlined Coordination',
                desc: 'Built to synchronize cross-functional initiatives without communication lag.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ marginTop: '2px' }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--white)' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '2px', lineHeight: 1.4 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Meta */}
        <div style={{ position: 'relative', zIndex: 2, fontSize: '12px', color: 'var(--slate-400)' }}>
          © {new Date().getFullYear()} OmniFlow Technologies, Inc. Protected by Enterprise SOC2 Type II.
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          backgroundColor: 'var(--white)',
        }}
      >
        <LoginForm onNavigate={onNavigate} initialMode={initialMode} />
      </div>

      <style>{`
        @media (max-width: 900px) {
          .auth-branding-col {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
