import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SignIn.css';
import { createClient } from "@supabase/supabase-js";
import { setUserData, isAuthenticated } from './utils/authUtils';
import { verifySecureHash } from './utils/passwordUtils';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function SignIn({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard immediately
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  // Street lights + floating particles
  const [streetLights, setStreetLights] = useState([]);
  const [floatingParticles, setFloatingParticles] = useState([]);

  useEffect(() => {
    const lights = [];
    const colors = ['blue', 'red', 'yellow'];

    for (let i = 0; i < 25; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const isMoving = Math.random() > 0.4;
      lights.push({
        id: i,
        left: Math.random() * 100,
        top: 10 + Math.random() * 80,
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 4,
        color,
        moving: isMoving
      });
    }
    setStreetLights(lights);

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

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    setUsernameError('');
    setErrorMessage('');
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError('');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      // Query the police table to get user data
      const { data, error } = await supabase
        .from('police')
        .select('*')
        .eq('email', username) // Using email for login instead of username
        .single();

      if (error) {
        console.error('Authentication error:', error);
        throw new Error('Authentication failed');
      }

      if (data) {
        // Verify the password
        const isPasswordValid = await verifySecureHash(password, data.password);
        
        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        // Check if user is Administrator - they can log in regardless of status
        if (data.role === 'Administrator') {
          // Administrators can always log in
          setIsAuthenticated(true);
          setUserData(data);
          navigate('/');
        } else {
          // For non-administrators, check account status
          if (data.status === 'pending') {
            setErrorMessage('Your account is still pending approval. Please wait for administrator approval.');
            return;
          }
          
          if (data.status === 'rejected') {
            setErrorMessage('Your account has been rejected. Please contact the administrator.');
            return;
          }
          
          if (data.status === 'approved') {
            // Successful authentication for regular users
            setIsAuthenticated(true);
            setUserData(data);
            navigate('/');
          } else {
            throw new Error('Invalid account status');
          }
        }
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Shake card
      const card = document.querySelector('.signin-card');
      if (card) {
        card.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
          card.style.animation = '';
        }, 500);
      }
      
      // Show error inside card
      setErrorMessage('Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Shake animation keyframes
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
    <div className="signin-container">
      <div className="signin-wrapper">
        {/* Left side */}
        <div className="signin-image-side">
          <img src="/signin-image.png" alt="Background" className="signin-bg-image" />
          <img src="/signin-logo.png" alt="Overlay" className="overlay-image" />

          {/* Street lights */}
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

          <div className="signin-card">
            <img src="/signin-icon.png" alt="Card Logo" className="signin-card-logo" />

            <form onSubmit={handleSubmit}>
              <div>
                <h6>
                  Email
                  {usernameError && <span className="validation-error">{usernameError}</span>}
                </h6>
                <input
                  type="email"
                  placeholder="Enter Email"
                  value={username}
                  onChange={handleUsernameChange}
                  disabled={isLoading}
                />
              </div>

              <div>
                <h6>
                  Password
                  {passwordError && <span className="validation-error">{passwordError}</span>}
                </h6>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter Password"
                    value={password}
                    onChange={handlePasswordChange}
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
              </div>

              {errorMessage && <p className="error-message">{errorMessage}</p>}

              <div className="signin-options">
                <div className="remember-me"></div>
                <a href="/forgot-password" className="forgot-link">
                  Forgot Password
                </a>
              </div>

              <button type="submit" disabled={isLoading}>
                {isLoading && <div className="loading-spinner"></div>}
                {isLoading ? 'Signing In...' : 'Login'}
              </button>
            </form>

            <p className="signin-footer">
              Don't have an account? <Link to="/create-account">Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignIn;