import React, { useState } from 'react';
import { Layers, Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface NavbarProps {
  onNavigate: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Platform', href: '#preview' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Solutions', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'About', href: '#footer' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const targetElement = document.querySelector(href);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--slate-200)',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 24px',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--slate-900)',
              color: 'var(--white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <Layers size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '-0.4px',
                color: 'var(--slate-950)',
                lineHeight: 1.1,
              }}
            >
              OmniFlow
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--slate-500)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Enterprise Workspace
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '28px',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleLinkClick(e, link.href)}
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--slate-600)',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--slate-950)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-600)')}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Action Buttons */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '12px',
          }}
          className="desktop-actions"
        >
          <Button
            variant="ghost"
            size="md"
            onClick={() => onNavigate('/login')}
          >
            Login
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigate('/login')}
            icon={<ArrowRight size={16} />}
            iconPosition="right"
          >
            Get Started
          </Button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="mobile-toggle">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--slate-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--slate-200)',
            }}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'var(--white)',
            borderTop: '1px solid var(--slate-200)',
            borderBottom: '1px solid var(--slate-200)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                style={{
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--slate-800)',
                  padding: '8px 0',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingTop: '16px',
              borderTop: '1px solid var(--slate-150)',
            }}
          >
            <Button
              variant="secondary"
              style={{ width: '100%' }}
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('/login');
              }}
            >
              Login
            </Button>
            <Button
              variant="primary"
              style={{ width: '100%' }}
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('/login');
              }}
            >
              Get Started
            </Button>
          </div>
        </div>
      )}

      {/* Style for responsive visibility */}
      <style>{`
        @media (min-width: 860px) {
          .desktop-nav { display: flex !important; }
          .desktop-actions { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
        @media (max-width: 859px) {
          .desktop-nav { display: none !important; }
          .desktop-actions { display: none !important; }
          .mobile-toggle { display: flex !important; }
        }
      `}</style>
    </header>
  );
};
