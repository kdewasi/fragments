import { useState } from 'react';
import type { BasicAuthCredentials } from '../../types';
import './LoginForm.css';

interface LoginFormProps {
  onSubmit: (credentials?: BasicAuthCredentials) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isCognito?: boolean;
}

export function LoginForm({ onSubmit, isLoading, error, isCognito = false }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCognito) { await onSubmit(); return; }
    if (!username.trim() || !password.trim()) return;
    await onSubmit({ username: username.trim(), password });
  };

  return (
    <div className="nx-login">
      {/* Ambient background effects */}
      <div className="nx-login-orb nx-login-orb--1" />
      <div className="nx-login-orb nx-login-orb--2" />
      <div className="nx-login-grid" />

      <div className="nx-login-container">
        {/* Status bar */}
        <div className="nx-login-status">
          <span className="nx-status-dot" />
          <span className="nx-status-text">SYSTEM ONLINE</span>
          <span className="nx-status-sep" />
          <span className="nx-status-text">NEXUS v2.0</span>
          <span className="nx-status-sep" />
          <span className="nx-status-text">CCP555</span>
        </div>

        {/* Brand */}
        <div className="nx-login-brand">
          <div className="nx-login-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L40 14V34L24 44L8 34V14L24 4Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M24 12L32 17V27L24 32L16 27V17L24 12Z" fill="currentColor" opacity="0.3" />
              <circle cx="24" cy="22" r="4" fill="currentColor" />
            </svg>
          </div>
          <h1 className="nx-login-title">FRAGMENTS</h1>
          <p className="nx-login-desc">Data Fragment Archive & Conversion Engine</p>
        </div>

        {/* Card */}
        <div className="nx-login-card">
          <div className="nx-login-card-bar">
            <span className="nx-card-label">AUTHENTICATION</span>
            <span className="nx-card-indicator" />
          </div>

          <form onSubmit={handleSubmit} className="nx-login-form">
            {isCognito ? (
              <>
                {error && <div className="nx-error"><span className="nx-error-tag">ERR</span>{error}</div>}
                <button type="submit" className="nx-btn nx-btn--cognito" disabled={isLoading}>
                  {isLoading ? <><span className="nx-spinner" />Redirecting...</> : <>Sign in with AWS Cognito<span className="nx-btn-icon">&rarr;</span></>}
                </button>
                <p className="nx-login-hint">OAuth redirect to Cognito Hosted UI</p>
              </>
            ) : (
              <>
                <div className="nx-field">
                  <label htmlFor="username" className="nx-label">EMAIL ADDRESS</label>
                  <input id="username" type="email" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="operator@nexus.io" autoComplete="username" disabled={isLoading} required className="nx-input" />
                </div>
                <div className="nx-field">
                  <label htmlFor="password" className="nx-label">ACCESS KEY</label>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter access key" autoComplete="current-password" disabled={isLoading} required className="nx-input" />
                </div>
                {error && <div className="nx-error"><span className="nx-error-tag">ERR</span>{error}</div>}
                <button type="submit" className="nx-btn" disabled={isLoading}>
                  {isLoading ? <><span className="nx-spinner" />Authenticating...</> : <>Initialize Session<span className="nx-btn-icon">&rarr;</span></>}
                </button>
              </>
            )}
          </form>

          <div className="nx-login-card-footer">
            <span>ENCRYPTED</span>
            <span>TLS 1.3</span>
            <span>FRAGMENTS ARCHIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
