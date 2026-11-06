import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Theme selection">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
        title="Light Mode"
        aria-label="Switch to light mode"
      >
        <Sun size={16} />
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        className={`theme-toggle-btn ${theme === 'system' ? 'active' : ''}`}
        title="System Theme"
        aria-label="Use system theme preference"
      >
        <Monitor size={16} />
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
        title="Dark Mode"
        aria-label="Switch to dark mode"
      >
        <Moon size={16} />
      </button>
    </div>
  );
};
