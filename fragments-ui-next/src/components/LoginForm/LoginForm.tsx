import { useState } from 'react';
import type { BasicAuthCredentials } from '../../types';
import './LoginForm.css';

interface LoginFormProps {
  onSubmit: (credentials: BasicAuthCredentials) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    await onSubmit({ username: username.trim(), password });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">◈</div>
          <h1>Fragments</h1>
          <p className="login-subtitle">Multi-Agent Fragment Manager</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Email</label>
            <input
              id="username"
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your email"
              autoComplete="username"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <span className="button-loading">
                <span className="spinner" /> Authenticating...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="login-footer">
          Powered by <strong>Hierarc.ai</strong>
        </p>
      </div>
    </div>
  );
}
