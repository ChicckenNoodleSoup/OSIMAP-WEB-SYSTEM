import React from "react";
import { useNavigate } from "react-router-dom";  
import "./ForgotPassword.css"; 

function ForgotPassword() {
  const navigate = useNavigate();  

  return (
    <div className="forgot-container">
      <div className="forgot-wrapper">
        {/* Left Image Side */}
        <div className="forgot-image-side">
          <img src="/signin-image.png" alt="Background" className="signin-bg-image" />
          <img src="/signin-logo.png" alt="Overlay" className="overlay-image" />
        </div>

        {/* Form Side */}
        <div className="forgot-form-side">
          <div className="frosted-right"></div>
          <div className="forgot-card">
                <img src="/signin-icon.png" alt="Card Logo" className="signin-card-logo" />

                <h2>Forgot Password</h2>
                <p className="forgot-subtext">
                Enter your email address and we’ll send you instructions to reset your password.
                </p>

                <form>
                <input type="email" placeholder="Enter your email" required />
                <button type="submit">Send Reset Link</button>
                </form>

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
