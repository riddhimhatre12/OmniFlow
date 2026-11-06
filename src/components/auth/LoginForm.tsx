import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { GoogleAuthButton } from './GoogleAuthButton';
import { emitUserChange } from '../../hooks/useCurrentUser';

interface LoginFormProps {
  onNavigate: (route: string) => void;
  initialMode?: 'login' | 'signup';
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onNavigate,
  initialMode = 'login',
}) => {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginMutation = useMutation(api.auth.login);
  const signUpMutation = useMutation(api.auth.signUp);
  const googleLoginMutation = useMutation(api.auth.loginWithGoogle);

  const cleanErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      // Remove Convex stack / prefix wrapper if present
      const msg = err.message.replace(/Uncaught Error: |Server Error: /gi, '');
      return msg.split('\n')[0] || 'Authentication failed. Please check your credentials.';
    }
    return 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setErrorMessage('Please enter your full name.');
          setIsLoading(false);
          return;
        }

        const res = await signUpMutation({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        localStorage.setItem(
          'omni_user',
          JSON.stringify({
            userId: res.userId,
            name: res.name,
            email: res.email,
            role: res.role,
          })
        );
        emitUserChange();
      } else {
        const res = await loginMutation({
          email: email.trim(),
          password,
        });

        localStorage.setItem(
          'omni_user',
          JSON.stringify({
            userId: res.userId,
            name: res.name,
            email: res.email,
            role: res.role,
          })
        );
        emitUserChange();
      }

      onNavigate('/dashboard');
    } catch (err) {
      setErrorMessage(cleanErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (userData: { email: string; name: string; avatar?: string }) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await googleLoginMutation({
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar,
      });

      localStorage.setItem(
        'omni_user',
        JSON.stringify({
          userId: res.userId,
          name: res.name,
          email: res.email,
          role: res.role,
          avatar: res.avatar,
        })
      );
      emitUserChange();

      onNavigate('/dashboard');
    } catch (err) {
      setErrorMessage(cleanErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
      {/* Back to Home Button */}
      <button
        onClick={() => onNavigate('/')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--slate-500)',
          marginBottom: '28px',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to OmniFlow home</span>
      </button>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            color: 'var(--slate-950)',
            marginBottom: '8px',
          }}
        >
          {isSignUp ? 'Create your workspace' : 'Welcome back'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--slate-600)' }}>
          {isSignUp
            ? 'Sign up to register your account on Convex cloud backend.'
            : 'Enter your credentials to authenticate with Convex cloud.'}
        </p>
      </div>

      {/* Cloud Backend Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          marginBottom: '20px',
          fontSize: '12px',
          color: '#166534',
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            display: 'inline-block',
          }}
        />
        <span>Convex Cloud Connected &bull; Realtime Auth</span>
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '13px',
            lineHeight: 1.4,
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Google SSO Button */}
      <div style={{ marginBottom: '20px' }}>
        <GoogleAuthButton
          isLoading={isLoading}
          onSuccess={handleGoogleSuccess}
          onError={(err) => setErrorMessage(err)}
        />
      </div>

      {/* Divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--slate-200)' }} />
        <span
          style={{
            fontSize: '12px',
            color: 'var(--slate-400)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 600,
          }}
        >
          Or continue with email
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--slate-200)' }} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {isSignUp && (
          <Input
            label="Full Name"
            placeholder="Jane Doe"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User size={16} />}
            required={isSignUp}
            disabled={isLoading}
          />
        )}

        <Input
          label="Work Email"
          placeholder="name@company.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail size={16} />}
          required
          disabled={isLoading}
        />

        <div>
          <Input
            label="Password"
            placeholder="••••••••••••"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            disabled={isLoading}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--slate-400)',
                  cursor: 'pointer',
                  padding: '4px',
                  background: 'none',
                  border: 'none',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            required
          />
        </div>

        {/* Remember me & Forgot Password */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: 'var(--slate-700)',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              style={{
                width: '16px',
                height: '16px',
                accentColor: 'var(--primary)',
                borderRadius: 'var(--radius-xs)',
              }}
            />
            <span>Remember me</span>
          </label>

          {!isSignUp && (
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                alert('Password reset instructions will be sent to your email.');
              }}
              style={{
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              Forgot password?
            </a>
          )}
        </div>

        {/* Action Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isLoading}
          style={{ width: '100%', marginTop: '8px' }}
          icon={isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          iconPosition="right"
        >
          {isLoading
            ? isSignUp
              ? 'Creating Account...'
              : 'Authenticating...'
            : isSignUp
              ? 'Create Workspace Account'
              : 'Sign In to Workspace'}
        </Button>
      </form>

      {/* Switch between Sign in and Sign up */}
      <div
        style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--slate-600)',
        }}
      >
        {isSignUp ? (
          <span>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMessage(null);
              }}
              style={{
                color: 'var(--primary)',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Sign in
            </button>
          </span>
        ) : (
          <span>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMessage(null);
              }}
              style={{
                color: 'var(--primary)',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Sign up
            </button>
          </span>
        )}
      </div>
    </div>
  );
};
