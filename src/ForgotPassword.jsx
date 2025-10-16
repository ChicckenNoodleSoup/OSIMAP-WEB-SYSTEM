import React, { useState } from "react";
import { useNavigate } from "react-router-dom";  
import "./ForgotPassword.css";
import { validateEmail } from './utils/validation';

function ForgotPassword() {
  const navigate = useNavigate();  
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError('');
  };

  const validateForm = () => {
    const emailErr = validateEmail(email);
    setEmailError(emailErr);
    return !emailErr;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    console.log("Reset link sent!");
    setSent(true);
  };

  return (
    <div className="forgot-container">
      <div className="forgot-wrapper">
        <div className="forgot-image-side">
          <img src="/signin-image.png" alt="Background" className="signin-bg-image" />
          <img src="/signin-logo.png" alt="Overlay" className="overlay-image" />
        </div>

        <div className="forgot-form-side">
          <div className="frosted-right"></div>
          <div className="forgot-card">
            <img src="/signin-icon.png" alt="Card Logo" className="signin-card-logo" />

            <h2>Forgot Password</h2>
            <p className="forgot-subtext">
              Enter your email address and we'll send you instructions to reset your password.
            </p>

            {!sent ? (
              <form onSubmit={handleSubmit}>
                <div>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={handleEmailChange}
                  />
                  {emailError && <p className="validation-error">{emailError}</p>}
                </div>
                <button type="submit">Send Reset Link</button>
              </form>
            ) : (
              <p className="success-message">
                Reset link has been sent to your email.
              </p>
            )}

            <button
              type="button"
              className="back-btn"
              onClick={() => navigate("/signin")}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
