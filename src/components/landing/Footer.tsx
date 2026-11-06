import React from 'react';
import { Layers, Globe } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer
      id="footer"
      style={{
        backgroundColor: 'var(--white)',
        borderTop: '1px solid var(--slate-200)',
        padding: '72px 24px 40px',
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '48px',
            marginBottom: '60px',
          }}
        >
          {/* Brand Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                }}
              >
                <Layers size={18} />
              </div>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '-0.3px',
                  color: 'var(--slate-900)',
                }}
              >
                OmniFlow
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--slate-500)', lineHeight: 1.6 }}>
              Unified work management platform engineered for enterprise teams,
              complex initiatives, and distributed engineering workflows.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a
                href="#footer"
                aria-label="X (formerly Twitter)"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slate-600)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="#footer"
                aria-label="LinkedIn"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slate-600)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
              </a>
              <a
                href="#footer"
                aria-label="GitHub"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slate-600)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
                </svg>
              </a>
              <a
                href="#footer"
                aria-label="Website"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slate-600)',
                }}
              >
                <Globe size={15} />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Product
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--slate-600)' }}>
              <a href="#features">Project Management</a>
              <a href="#features">Task Tracking</a>
              <a href="#features">Team Collaboration</a>
              <a href="#features">Role-Based Access</a>
              <a href="#preview">Platform Preview</a>
              <a href="#pricing">Pricing Plans</a>
            </div>
          </div>

          {/* Company Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Company
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--slate-600)' }}>
              <a href="#footer">About Us</a>
              <a href="#footer">Customers</a>
              <a href="#footer">Careers</a>
              <a href="#footer">Press & News</a>
              <a href="#footer">Contact</a>
            </div>
          </div>

          {/* Resources Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Resources
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--slate-600)' }}>
              <a href="#footer">Documentation</a>
              <a href="#footer">API Reference</a>
              <a href="#footer">Community Hub</a>
              <a href="#footer">Release Notes</a>
              <a href="#footer">Status Page</a>
            </div>
          </div>

          {/* Legal Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Legal
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--slate-600)' }}>
              <a href="#footer">Privacy Policy</a>
              <a href="#footer">Terms of Service</a>
              <a href="#footer">Security Overview</a>
              <a href="#footer">Compliance & SOC2</a>
              <a href="#footer">Cookie Preferences</a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div
          style={{
            paddingTop: '32px',
            borderTop: '1px solid var(--slate-150)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '13px',
            color: 'var(--slate-500)',
          }}
        >
          <p>© {new Date().getFullYear()} OmniFlow Technologies, Inc. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>Enterprise Edition</span>
            <span>Version 1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
