import React, { useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { X } from 'lucide-react';

interface GoogleAuthButtonProps {
  onSuccess: (userData: { email: string; name: string; avatar?: string }) => Promise<void>;
  onError: (errorMsg: string) => void;
  isLoading: boolean;
}

const DEMO_GOOGLE_PROFILES = [
  {
    name: 'Alex Morgan',
    email: 'alex.morgan@enterprise.co',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
  },
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@enterprise.co',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
  },
  {
    name: 'David Kim',
    email: 'david.kim@enterprise.co',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
  },
];

function InnerGoogleButton({
  onSuccess,
  onError,
  isLoading,
}: GoogleAuthButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setInternalLoading(true);
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });

        if (!userInfoRes.ok) {
          throw new Error('Failed to retrieve Google profile information.');
        }

        const profile = await userInfoRes.json();
        await onSuccess({
          email: profile.email,
          name: profile.name || profile.email.split('@')[0],
          avatar: profile.picture,
        });
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Google authentication failed.');
      } finally {
        setInternalLoading(false);
      }
    },
    onError: (err) => {
      onError(err.error_description || 'Google sign-in encountered an issue.');
    },
  });

  const activeLoading = isLoading || internalLoading;
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyOrigin = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => triggerGoogleLogin()}
        disabled={activeLoading}
        style={{
          width: '100%',
          height: '44px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--slate-300)',
          backgroundColor: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--slate-700)',
          boxShadow: 'var(--shadow-xs)',
          transition: 'all 0.15s ease',
          cursor: activeLoading ? 'not-allowed' : 'pointer',
          opacity: activeLoading ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!activeLoading) {
            e.currentTarget.style.backgroundColor = 'var(--slate-50)';
            e.currentTarget.style.borderColor = 'var(--slate-400)';
          }
        }}
        onMouseLeave={(e) => {
          if (!activeLoading) {
            e.currentTarget.style.backgroundColor = 'var(--white)';
            e.currentTarget.style.borderColor = 'var(--slate-300)';
          }
        }}
      >
        <GoogleIcon />
        <span>{activeLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px' }}>
        <button
          type="button"
          onClick={() => setShowTroubleshoot(!showTroubleshoot)}
          style={{
            fontSize: '11px',
            color: 'var(--slate-400)',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Troubleshoot origin error
        </button>
      </div>

      {showTroubleshoot && (
        <div
          style={{
            marginTop: '8px',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            fontSize: '12px',
            color: '#92400e',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>To fix origin issues in Google Cloud Console:</div>
          <div>
            1. Copy your browser origin:
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'white',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-xs)',
                padding: '4px 8px',
                margin: '4px 0',
                fontFamily: 'monospace',
                color: '#78350f',
              }}
            >
              <span style={{ flex: 1 }}>{window.location.origin}</span>
              <button
                type="button"
                onClick={copyOrigin}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: copied ? '#16a34a' : '#2563eb',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            2. Go to Google Cloud Credentials &rarr; Edit Web Client &rarr; Add Authorized JavaScript Origin.
          </div>
        </div>
      )}
    </div>
  );
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = (props) => {
  const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const isRealClientId = Boolean(
    rawClientId &&
    rawClientId.includes('.apps.googleusercontent.com') &&
    !rawClientId.includes('your-google-client-id')
  );

  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [customEmail, setCustomEmail] = useState('');

  if (isRealClientId) {
    return (
      <GoogleOAuthProvider clientId={rawClientId}>
        <InnerGoogleButton {...props} />
      </GoogleOAuthProvider>
    );
  }

  const handleSelectAccount = async (profile: { email: string; name: string; avatar?: string }) => {
    setShowAccountChooser(false);
    await props.onSuccess(profile);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const name = customEmail.split('@')[0];
    setShowAccountChooser(false);
    await props.onSuccess({
      email: customEmail.trim(),
      name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          handleSelectAccount(DEMO_GOOGLE_PROFILES[0]);
        }}
        disabled={props.isLoading}
        style={{
          width: '100%',
          height: '44px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--slate-300)',
          backgroundColor: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--slate-700)',
          boxShadow: 'var(--shadow-xs)',
          transition: 'all 0.15s ease',
          cursor: props.isLoading ? 'not-allowed' : 'pointer',
          opacity: props.isLoading ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!props.isLoading) {
            e.currentTarget.style.backgroundColor = 'var(--slate-50)';
            e.currentTarget.style.borderColor = 'var(--slate-400)';
          }
        }}
        onMouseLeave={(e) => {
          if (!props.isLoading) {
            e.currentTarget.style.backgroundColor = 'var(--white)';
            e.currentTarget.style.borderColor = 'var(--slate-300)';
          }
        }}
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
        <button
          type="button"
          onClick={() => setShowAccountChooser(true)}
          style={{
            fontSize: '11px',
            color: 'var(--primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            padding: 0,
          }}
        >
          Choose Google Account / Custom Email
        </button>
      </div>

      {/* Google Account Selector & Custom Setup Modal */}
      {showAccountChooser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999,
          }}
          onClick={() => setShowAccountChooser(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: 'var(--shadow-2xl)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAccountChooser(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--slate-400)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <GoogleIcon size={24} />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  Sign in with Google
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--slate-500)', margin: '2px 0 0' }}>
                  Select a Google account to sign into OmniFlow
                </p>
              </div>
            </div>

            {/* Quick Profile Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {DEMO_GOOGLE_PROFILES.map((prof) => (
                <button
                  key={prof.email}
                  type="button"
                  onClick={() => handleSelectAccount(prof)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-200)',
                    backgroundColor: 'var(--white)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--slate-50)';
                    e.currentTarget.style.borderColor = 'var(--primary-border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--white)';
                    e.currentTarget.style.borderColor = 'var(--slate-200)';
                  }}
                >
                  <img
                    src={prof.avatar}
                    alt={prof.name}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)' }}>
                      {prof.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--slate-500)' }}>{prof.email}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>
                    Sign in &rarr;
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Email Input */}
            <form onSubmit={handleCustomSubmit} style={{ paddingTop: '14px', borderTop: '1px solid var(--slate-200)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '8px' }}>
                Or sign in with another Google Email:
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  placeholder="google.email@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  style={{
                    flex: 1,
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--slate-300)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!customEmail.trim()}
                  style={{
                    padding: '0 16px',
                    height: '38px',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-xs)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: customEmail.trim() ? 'pointer' : 'not-allowed',
                    opacity: customEmail.trim() ? 1 : 0.6,
                  }}
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.27v3.14C3.25 21.27 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.6H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.4l4.01-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.73 1.27 6.6l4.01 3.14c.95-2.84 3.6-4.99 6.72-4.99z"
      />
    </svg>
  );
}
