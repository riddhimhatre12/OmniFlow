import React, { useState } from 'react';
import {
  Search,
  HelpCircle,
  ChevronDown,
  Menu,
  User,
  Settings,
  LogOut
} from 'lucide-react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { NotificationCenter } from './NotificationCenter';
import { ThemeToggle } from '../ui/ThemeToggle';

interface TopbarProps {
  onToggleSidebar: () => void;
  onNavigate: (route: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar, onNavigate }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useCurrentUser();

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'UN';


  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'var(--white)',
        borderBottom: '1px solid var(--slate-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left Area: Hamburger (Mobile/Tablet) + Search Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '480px' }}>
        <button
          onClick={onToggleSidebar}
          className="topbar-mobile-toggle"
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--slate-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--slate-700)',
            backgroundColor: 'var(--white)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Toggle Sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Global Search Input */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              color: 'var(--slate-400)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search..."
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '38px',
              paddingRight: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--slate-200)',
              backgroundColor: 'var(--slate-50)',
              fontSize: '13px',
              color: 'var(--slate-900)',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.backgroundColor = 'var(--white)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--slate-200)';
              e.currentTarget.style.backgroundColor = 'var(--slate-50)';
            }}
          />
        </div>
      </div>

      {/* Right Area: Actions, Notification, Help, User Avatar & Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Theme Toggle (Light, System, Dark) */}
        <ThemeToggle />

        {/* Real-time Notification Center */}
        <NotificationCenter onNavigate={onNavigate} />

        {/* Help Icon Button */}
        <button
          onClick={() => alert('OmniFlow Help & Documentation: UI Shell Demonstration.')}
          className="hide-mobile"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--slate-200)',
            backgroundColor: 'var(--white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--slate-600)',
            cursor: 'pointer',
          }}
          aria-label="Help"
        >
          <HelpCircle size={17} />
        </button>

        <div className="hide-mobile" style={{ height: '24px', width: '1px', backgroundColor: 'var(--slate-200)', margin: '0 4px' }} />

        {/* User Avatar & Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px 4px 4px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--slate-200)',
              backgroundColor: 'var(--white)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: 'var(--slate-800)',
                color: 'var(--white)',
                fontSize: '12px',
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

            <div className="hide-mobile" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-800)' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                {user.role || 'Administrator'}
              </span>
            </div>

            <ChevronDown size={14} color="var(--slate-400)" />
          </button>

          {/* User Dropdown Menu */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '220px',
                backgroundColor: 'var(--white)',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '6px',
                zIndex: 40,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--slate-150)',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
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
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--slate-500)', wordBreak: 'break-all' }}>
                    {user.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onNavigate('/profile');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '13px',
                  color: 'var(--slate-700)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--slate-100)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <User size={15} />
                <span>Profile Settings</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onNavigate('/preferences');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '13px',
                  color: 'var(--slate-700)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--slate-100)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Settings size={15} />
                <span>Preferences</span>
              </button>

              <div style={{ height: '1px', backgroundColor: 'var(--slate-150)', margin: '4px 0' }} />

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                  onNavigate('/login');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '13px',
                  color: 'var(--danger)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--danger-light)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
