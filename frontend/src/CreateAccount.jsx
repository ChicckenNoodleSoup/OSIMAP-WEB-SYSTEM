import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateAccount.css';

function CreateAccount() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false); // New state to track submission
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username || !email || !password || !confirmPassword) {
      setMessage('Please fill out all fields.');
      setIsSubmitted(false); // Ensure we don't show success if there's an error
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setIsSubmitted(false); // Ensure we don't show success if there's an error
      return;
    }

    // TODO: Replace with backend call (Supabase, API, etc.)
    // On success:
    setMessage('A confirmation email has been sent to the system administrator. You will be notified via email once your account is accepted.');
    setIsSubmitted(true); // Set state to show the success message
  };

  return (
    <div className="create-container">
      <div className="create-wrapper">
        {/* Left side image */}
        <div className="create-image-side">
          <img src="/signin-image.png" alt="Background" className="create-bg-image" />
          <img src="/signin-logo.png" alt="Overlay" className="overlay-image" />
        </div>

        {/* Right side form */}
        <div className="create-form-side">
          <div className="frosted-right"></div>
          <div className="create-card">
            <img src="/signin-icon.png" alt="Card Logo" className="create-card-logo" />
            
            {/* Conditional Rendering: Show message or form */}
            {isSubmitted ? (
              <p className="success-message">{message}</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <h6>Username</h6>
                <input
                  type="text"
                  placeholder="Enter Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <h6>Email</h6>
                <input
                  type="email"
                  placeholder="Enter Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <h6>Password</h6>
                <input
                  type="password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <h6>Confirm Password</h6>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                
                {/* Show error message here if it exists */}
                {message && <p className="error-message">{message}</p>}

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