import { useState, useEffect } from 'react';

export interface UserSession {
  userId?: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  title?: string;
  department?: string;
  bio?: string;
  timezone?: string;
}

const OMNI_USER_EVENT = 'omni_user_change';

export function emitUserChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OMNI_USER_EVENT));
  }
}

export function useCurrentUser() {
  const [user, setUser] = useState<UserSession>(() => {
    try {
      const stored = localStorage.getItem('omni_user');
      return stored
        ? JSON.parse(stored)
        : {
            userId: undefined,
            name: 'Guest User',
            email: '',
            role: 'Guest',
          };
    } catch {
      return {
        userId: undefined,
        name: 'Guest User',
        email: '',
        role: 'Guest',
      };
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('omni_user');
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          setUser({
            userId: undefined,
            name: 'Guest User',
            email: '',
            role: 'Guest',
          });
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(OMNI_USER_EVENT, handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(OMNI_USER_EVENT, handleStorage);
    };
  }, []);

  const updateSessionUser = (updated: Partial<UserSession>) => {
    setUser((prev) => {
      const next = { ...prev, ...updated };
      localStorage.setItem('omni_user', JSON.stringify(next));
      emitUserChange();
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('omni_user');
    localStorage.removeItem('omni_active_workspace');
    emitUserChange();
    setUser({
      userId: undefined,
      name: 'Guest User',
      email: '',
      role: 'Guest',
    });
  };

  return {
    user,
    isLoggedIn: Boolean(user.userId && user.email),
    updateSessionUser,
    logout,
  };
}
