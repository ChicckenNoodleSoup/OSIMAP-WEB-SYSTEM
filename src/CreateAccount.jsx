import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateAccount.css';
import { validateUsername, validateEmail, validatePassword, validateConfirmPassword } from './utils/validation';

function CreateAccount() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  
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
    const usernameErr = validateUsername(username);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmPassErr = validateConfirmPassword(password, confirmPassword);

    setUsernameError(usernameErr);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPassErr);

    return !usernameErr && !emailErr && !passwordErr && !confirmPassErr;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setMessage('A confirmation email has been sent to the system administrator. You will be notified via email once your account is accepted.');
    setIsSubmitted(true);
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
                    Username
                    {usernameError && <span className="validation-error">{usernameError}</span>}
                  </h6>
                  <input
                    type="text"
                    placeholder="Enter Username"
                    value={username}
                    onChange={handleInputChange(setUsername, setUsernameError)}
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
                  />
                </div>

                <button type="submit">Create Account</button>
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