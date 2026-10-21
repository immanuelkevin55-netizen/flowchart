import React, { useState } from 'react';
import { Lock, User, ArrowRight, Workflow } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    setTimeout(() => {
      // Validate credentials
      if (username.trim().toLowerCase() !== 'admin' || password !== 'tibl123') {
        setError('Invalid username or password');
        setIsLoading(false);
        return;
      }

      const userData = {
        username: 'admin',
        role: 'Administrator',
        loginTime: Date.now()
      };

      try {
        localStorage.setItem('ppt_user_session', JSON.stringify(userData));
      } catch (err) {
        console.warn('Could not save session:', err);
      }

      setIsLoading(false);
      onLogin(userData);
    }, 300);
  };

  return (
    <div className="login-screen-overlay">
      <div className="login-backdrop-glow" />
      
      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-brand-header" style={{ marginBottom: '24px' }}>
          <div className="login-brand-icon">
            <Workflow size={28} color="#38BDF8" />
          </div>
          <h1 className="login-brand-title">Flowchart Generator</h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error-alert">{error}</div>}

          <div className="login-field-group">
            <label className="login-field-label">Username</label>
            <div className="login-input-wrapper">
              <User size={16} className="login-input-icon" />
              <input
                type="text"
                className="login-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="login-field-group">
            <label className="login-field-label">Password</label>
            <div className="login-input-wrapper">
              <Lock size={16} className="login-input-icon" />
              <input
                type="password"
                className="login-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading}
            style={{ marginTop: '8px' }}
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
