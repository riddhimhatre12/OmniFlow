import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumbs } from './Breadcrumbs';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeItem?: string;
  onSelectItem?: (item: string) => void;
  onNavigate: (route: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeItem = 'dashboard',
  onSelectItem = () => {},
  onNavigate,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--slate-50)', overflowX: 'hidden' }}>
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        activeItem={activeItem}
        onSelectItem={onSelectItem}
        onNavigate={onNavigate}
      />

      {/* Main Content Viewport */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          onToggleSidebar={() => setMobileOpen(!mobileOpen)}
          onNavigate={onNavigate}
        />
        <main className="main-content-viewport">
          <Breadcrumbs onNavigate={onNavigate} />
          {children}
        </main>
      </div>
    </div>
  );
};
