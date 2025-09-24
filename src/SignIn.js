import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SignIn.css';

function SignIn({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Generate street lights on component mount
  const [streetLights, setStreetLights] = useState([]);
  const [floatingParticles, setFloatingParticles] = useState([]);

  useEffect(() => {
    // Generate street lights with different colors and movement
    const lights = [];
    const colors = ['blue', 'red', 'yellow'];
    
    for (let i = 0; i < 25; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const isMoving = Math.random() > 0.4; // 60% chance to move
      
      lights.push({
        id: i,
        left: Math.random() * 100,
        top: 10 + Math.random() * 80,
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 4,
        color: color,
        moving: isMoving
      });
    }
    setStreetLights(lights);

    // Generate floating particles
    const particles = [];
    for (let i = 0; i < 15; i++) {
      particles.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 4 + Math.random() * 4
      });
    }
    setFloatingParticles(particles);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (username === 'admin' && password === 'password') {
      setIsLoading(true);

      // Simulate loading time then navigate
      setTimeout(() => {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        navigate('/');
      }, 1500);
    } else {
      // Add shake animation to the card for wrong credentials
      const card = document.querySelector('.signin-card');
      card.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => {
        card.style.animation = '';
      }, 500);
      
      alert('Invalid credentials. Try admin/password');
    }
  };

  // Add shake keyframes to document
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      <div className="signin-container">
        <div className="signin-wrapper">
          {/* Left side with street lights */}
          <div className="signin-image-side">
            <img src="/signin-image.png" alt="Background" className="signin-bg-image" />
            <img src="/signin-logo.png" alt="Overlay" className="overlay-image" />
            
            {/* Street lights overlay with colors */}
            <div className="street-lights-overlay">
              {streetLights.map((light) => (
                <div
                  key={light.id}
                  className={`street-light ${light.color} ${light.moving ? 'moving' : ''}`}
                  style={{
                    left: `${light.left}%`,
                    top: `${light.top}%`,
                    '--delay': `${light.delay}s`,
                    '--duration': `${light.duration}s`
                  }}
                />
              ))}
            </div>

            {/* Floating particles */}
            <div className="floating-particles">
              {floatingParticles.map((particle) => (
                <div
                  key={particle.id}
                  className="floating-particle"
                  style={{
                    left: `${particle.left}%`,
                    top: `${particle.top}%`,
                    '--float-delay': `${particle.delay}s`,
                    '--float-duration': `${particle.duration}s`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="signin-form-side">
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
                  disabled={isLoading}
                />

                <h6>Password</h6>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <span
                    className="eye-icon"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M12 4.5C7.5 4.5 3.6 7.3 2 12c1.6 4.7 5.5 7.5 10 7.5s8.4-2.8 10-7.5c-1.6-4.7-5.5-7.5-10-7.5zM12 17c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M12 7c2.8 0 5 2.2 5 5 0 .6-.1 1.2-.3 1.7l1.4 1.4c1.2-1.2 2.1-2.7 2.7-4.4-1.6-4.7-5.5-7.5-10-7.5-1.4 0-2.8.3-4.1.8L8 5.3C9.3 6.1 10.6 7 12 7zm-5-2L5.6 3.6 4.2 5l1.9 1.9C4.6 8.2 3.1 10 2 12c1.6 4.7 5.5 7.5 10 7.5 1.9 0 3.7-.5 5.3-1.3L19 19.7l1.4-1.4L7 5zm5.3 8.3c-.2.4-.3.8-.3 1.2 0 1.7 1.3 3 3 3 .4 0 .8-.1 1.2-.3l-3.9-3.9z"/>
                      </svg>
                    )}
                  </span>
                </div>

                <div className="signin-options">
                  <div className="remember-me"></div>
                  <a href="/forgot-password" className="forgot-link">
                    Forgot Password
                  </a>
                </div>

                {/* Login button */}
                <button type="submit" disabled={isLoading}>
                  {isLoading && <div className="loading-spinner"></div>}
                  {isLoading ? 'Signing In...' : 'Login'}
                </button>
              </form>

              {/* Footer link */}
              <p className="signin-footer">
                Don't have an account? <Link to="/create-account">Create Account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SignIn;