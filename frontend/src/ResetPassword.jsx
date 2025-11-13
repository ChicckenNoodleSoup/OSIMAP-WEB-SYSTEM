import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { validatePassword, validateConfirmPassword } from './utils/validation';
import "./ForgotPassword.css";

const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;  // Add this line
const RESET_PASS_URL = "https://bdysgnfgqcywjrqaqdsj.supabase.co/functions/v1/resetpass";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get("email");
  
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if email is present
  useEffect(() => {
    if (!email) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [email]);

  const handleInputChange = (setter, errorSetter) => (e) => {
    setter(e.target.value);
    errorSetter('');
    setError('');
  };

  const validateForm = () => {
    const passwordErr = validatePassword(password);
    const confirmPassErr = validateConfirmPassword(password, confirmPassword);

    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPassErr);

    return !passwordErr && !confirmPassErr && otp.trim() !== '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is missing. Please start the reset process again.');
      return;
    }
    
    if (!validateForm()) {
      setError('Please fix the errors and enter the OTP.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(RESET_PASS_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ email, otp, newPassword: password })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/signin'), 3000);
      } else {
        setError(data.error || 'Failed to reset password. OTP may be invalid.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
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
            <h2>Reset Password</h2>
            <p className="forgot-subtext">
              Enter the OTP you received and your new password.
            </p>

            {!success ? (
              <form onSubmit={handleSubmit}>
                <div>
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={handleInputChange(setOtp, () => {})}
                  />
                </div>

                <div>
                  <h6>
                    New Password
                    {passwordError && <span className="validation-error">{passwordError}</span>}
                  </h6>
                  <input
                    type="password"
                    placeholder="Enter new password"
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
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={handleInputChange(setConfirmPassword, setConfirmPasswordError)}
                    maxLength={128}
                  />
                </div>

                {error && <p className="validation-error">{error}</p>}

                <button type="submit" disabled={isLoading || !email}>
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => navigate('/signin')}
                >
                  Back to Login
                </button>
              </form>
            ) : (
              <p className="success-message">
                Password successfully updated! Redirecting to login...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
