import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SignIn.css';

function SignIn({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'password') {
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      navigate('/');
    } else {
      alert('Invalid credentials. Try admin/password');
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-wrapper">
        {/* Left side */}
        <div className="signin-image-side">
          <img src="/signin-image.png" alt="Background" className="signin-bg-image" />
          <img src="/signin-logo.png" alt="Overlay" className="overlay-image" />
        </div>

        {/* Right side */}
        <div className="signin-form-side">
          <div className="form-gradient"></div>
          <div className="frosted-right"></div>

          {/* Form card */}
          <div className="signin-card">
            <img src="/signin-icon.png" alt="Card Logo" className="signin-card-logo" />

            <form onSubmit={handleSubmit}>
              <h6>Username</h6>
              <input
                type="text"
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <h6>Password</h6>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span
                  className="eye-icon"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {/* your SVG icons stay here */}
                </span>
              </div>

              <div className="signin-options">

                <div className="remember-me">
                </div>

                <a href="/forgot-password" className="forgot-link">
                  Forgot Password
                </a>
              </div>

              {/* Login button */}
              <button type="submit">Login</button>

            </form>

            {/* Or as a text link */}
            <p className="signin-footer">
              Don’t have an account? <Link to="/create-account">Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
