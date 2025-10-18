import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateAccount.css';
import { validateFullName, validateEmail, validatePassword, validateConfirmPassword } from './utils/validation';
import { createClient } from "@supabase/supabase-js";
import { secureHash } from './utils/passwordUtils';

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
                  <input
                    type="password"
                    placeholder="Enter Password"
                    value={password}
                    onChange={handleInputChange(setPassword, setPasswordError)}
                    maxLength={128}
                  />
                </div>

                <div>
                  <h6>
                    Confirm Password
                    {confirmPasswordError && <span className="validation-error">{confirmPasswordError}</span>}
                  </h6>
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={handleInputChange(setConfirmPassword, setConfirmPasswordError)}
                    maxLength={128}
                  />
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