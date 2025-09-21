import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateAccount.css';

function CreateAccount() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username || !email || !password || !confirmPassword) {
      alert('Please fill out all fields.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    // TODO: Replace with backend call (Supabase, API, etc.)
    alert(`Account created for ${username}`);
    navigate('/signin');
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

              <button type="submit">Create Account</button>
              <button
                type="button"
                className="back-btn"
                onClick={() => navigate('/signin')}
              >
                Back to Login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateAccount;
