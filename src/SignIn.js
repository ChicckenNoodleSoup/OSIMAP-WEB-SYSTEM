import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignIn.css';

function SignIn({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'password') {
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      if (rememberMe) localStorage.setItem('rememberMe', 'true');
      navigate('/');
    } else {
      alert('Invalid credentials. Try admin/password');
    }
  };

  return (
    <div className="signin-wrapper">
      <div className="signin-image-side">
        <img src="/signin-image.png" alt="Background" className="signin-bg-image" />
        <img src="/signin-logo.png" alt="Overlay" className="overlay-image" />
      </div>

      <div className="signin-form-side">
        <div className="signin-card">
          <img src="/signin-icon.png" alt="Card Logo" className="signin-card-logo" />

          <form onSubmit={handleSubmit}>
            <h6>Username</h6>
            <input
              type="text"
              placeholder="jan nikko lozano"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <h6>Password</h6>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="sahurtungtung"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="eye-icon" onClick={() => setShowPassword(!showPassword)} title={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? (
                  <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Zm0 12c-2.5 0-4.5-2-4.5-4.5S9.5 7.5 12 7.5s4.5 2 4.5 4.5S14.5 16.5 12 16.5Z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M2.39 1.73 1.11 3l3.24 3.24C2.97 7.92 1.73 9.84 1 12c1.73 4.39 6 7.5 11 7.5 2.07 0 4-.53 5.7-1.47l3.2 3.2 1.27-1.27L2.39 1.73zM12 17.5c-2.5 0-4.5-2-4.5-4.5 0-.62.13-1.2.36-1.73l1.59 1.59a2.5 2.5 0 0 0 3.27 3.27l1.59 1.59c-.53.23-1.11.36-1.73.36zm6.34-1.66-2.3-2.3c.1-.34.16-.7.16-1.07 0-2.5-2-4.5-4.5-4.5-.37 0-.73.06-1.07.16l-2.3-2.3c1.1-.4 2.28-.63 3.37-.63 4.97 0 9.27 3.11 11 7.5a10.9 10.9 0 0 1-4.36 4.14z"/></svg>
                )}
              </span>
            </div>

            <div className="signin-options">
              <label className="remember-me" onClick={() => setRememberMe(!rememberMe)}>
                <span className="checkbox-icon">
                  {rememberMe ? (
                    <svg viewBox="0 0 24 24">
                      <rect width="24" height="24" rx="4" />
                      <path d="M7 13l3 3 7-7" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <rect width="24" height="24" rx="4" />
                    </svg>
                  )}
                </span>
                <span className="remember-text">Remember me</span>
              </label>

              <a href="/forgot-password" className="forgot-link">Forgot Password</a>
            </div>

            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
