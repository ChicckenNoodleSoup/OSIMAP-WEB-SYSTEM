import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateAccount.css';
import { validateFullName, validateEmail, validatePassword, validateConfirmPassword, getPasswordRequirements } from './utils/validation';
import { createClient } from "@supabase/supabase-js";
import { secureHash } from './utils/passwordUtils';
import { logAccountEvent } from './utils/loggingUtils';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function CreateAccount() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard immediately
  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      navigate('/');
    }
  }, [navigate]);

  const handleInputChange = (setter, errorSetter) => (e) => {
    setter(e.target.value);
    errorSetter('');
    setMessage('');
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordError('');
    setMessage('');
    setPasswordRequirements(getPasswordRequirements(newPassword));
  };

  const validateForm = () => {
    const fullNameErr = validateFullName(username);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmPassErr = validateConfirmPassword(password, confirmPassword);

    setUsernameError(fullNameErr);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPassErr);

    return !fullNameErr && !emailErr && !passwordErr && !confirmPassErr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Check if email already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('police')
        .select('email')
        .eq('email', email);

      if (checkError) {
        setMessage('Error checking account availability. Please try again.');
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        setEmailError('Email already exists');
        return;
      }

      // Hash the password before storing
      const hashedPassword = await secureHash(password);

      // Insert new police account with pending status
      const { data, error } = await supabase
        .from('police')
        .insert([
          {
            full_name: username, // Using full_name instead of username
            email,
            password: hashedPassword, // Store hashed password
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        setMessage(`Error creating account: ${error.message}. Please try again.`);
        return;
      }

      // Log account creation
      await logAccountEvent.created(data[0].id, `New account created: ${username} (${email})`);

      setMessage('Your account has been submitted for approval. You will be notified via email once your account is reviewed by an administrator.');
      setIsSubmitted(true);
    } catch (error) {
      setMessage('Error creating account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-container">
      <div className="create-wrapper">
        <div className="create-image-side">
          <img src="/signin-image.png" alt="Background" className="create-bg-image" />
          <img src="/signin-logo.png" alt="Overlay" className="overlay-image" />
        </div>

        <div className="create-form-side">
          <div className="frosted-right"></div>
          <div className="create-card">
            <img src="/signin-icon.png" alt="Card Logo" className="create-card-logo" />
            
            {isSubmitted ? (
              <p className="success-message">{message}</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div>
                  <h6>
                    Full Name
                    {usernameError && <span className="validation-error">{usernameError}</span>}
                  </h6>
                  <input
                    type="text"
                    placeholder="Enter Full Name"
                    value={username}
                    onChange={handleInputChange(setUsername, setUsernameError)}
                    maxLength={100}
                  />
                </div>

                <div>
                  <h6>
                    Email
                    {emailError && <span className="validation-error">{emailError}</span>}
                  </h6>
                  <input
                    type="email"
                    placeholder="Enter Email"
                    value={email}
                    onChange={handleInputChange(setEmail, setEmailError)}
                    maxLength={254}
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
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      maxLength={128}
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

                    {isPasswordFocused && (
                      <div className="password-requirements">
                        <div className="requirements-title">Password must have:</div>
                        <div className={`requirement ${passwordRequirements.minLength ? 'met' : ''}`}>
                          <span className="requirement-icon">{passwordRequirements.minLength ? '✓' : '○'}</span>
                          At least 8 characters
                        </div>
                        <div className={`requirement ${passwordRequirements.hasUppercase ? 'met' : ''}`}>
                          <span className="requirement-icon">{passwordRequirements.hasUppercase ? '✓' : '○'}</span>
                          One uppercase letter
                        </div>
                        <div className={`requirement ${passwordRequirements.hasLowercase ? 'met' : ''}`}>
                          <span className="requirement-icon">{passwordRequirements.hasLowercase ? '✓' : '○'}</span>
                          One lowercase letter
                        </div>
                        <div className={`requirement ${passwordRequirements.hasNumber ? 'met' : ''}`}>
                          <span className="requirement-icon">{passwordRequirements.hasNumber ? '✓' : '○'}</span>
                          One number
                        </div>
                        <div className={`requirement ${passwordRequirements.hasSpecialChar ? 'met' : ''}`}>
                          <span className="requirement-icon">{passwordRequirements.hasSpecialChar ? '✓' : '○'}</span>
                          One special character (!@#$%^&*...)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h6>
                    Confirm Password
                    {confirmPasswordError && <span className="validation-error">{confirmPasswordError}</span>}
                  </h6>
                  <div className="password-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={handleInputChange(setConfirmPassword, setConfirmPasswordError)}
                      maxLength={128}
                    />
                    <span
                      className="eye-icon"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
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

                <button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => navigate('/signin')}
                >
                  Back to Login
                </button>
              </form>
            )}

            {isSubmitted && (
              <button
                type="button"
                className="back-btn"
                onClick={() => navigate('/signin')}
              >
                Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateAccount;