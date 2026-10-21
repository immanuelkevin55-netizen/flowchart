import React, { useState } from 'react';
import { Lock, User, Sparkles, ArrowRight, ShieldCheck, Presentation } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const userData = {
        username: username.trim(),
        role: username.toLowerCase() === 'admin' ? 'Administrator' : 'Editor',
        loginTime: Date.now()
      };
      try {
        localStorage.setItem('ppt_user_session', JSON.stringify(userData));
      } catch (err) {
        console.warn('Could not save session:', err);
      }
      setIsLoading(false);
      onLogin(userData);
    }, 350);
  };

  const handleQuickDemoLogin = () => {
    const demoData = {
      username: 'admin',
      role: 'Administrator',
      loginTime: Date.now()
    };
    try {
      localStorage.setItem('ppt_user_session', JSON.stringify(demoData));
    } catch (err) {
      console.warn('Could not save session:', err);
    }
    onLogin(demoData);
  };

  return (
    <div className="login-screen-overlay">
      <div className="login-backdrop-glow" />
      
      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-icon">
            <Presentation size={28} color="#38BDF8" />
          </div>
          <h1 className="login-brand-title">PPT Generator Studio</h1>
          <p className="login-brand-subtitle">
            Sign in to design, auto-route, and export board-ready presentations
          </p>
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

        {/* Divider */}
        <div className="login-divider">
          <span>OR</span>
        </div>

        {/* Quick Demo One-Click Access */}
        <button
          type="button"
          onClick={handleQuickDemoLogin}
          className="login-demo-btn"
        >
          <Sparkles size={16} className="demo-sparkle-icon" />
          <span>Quick 1-Click Demo Access</span>
        </button>

        {/* Demo Credentials Badge */}
        <div className="login-demo-hint">
          <ShieldCheck size={14} color="#10B981" />
          <span>Demo credentials prefilled: <code>admin</code> / <code>admin123</code></span>
        </div>
      </div>
    </div>
  );
}
