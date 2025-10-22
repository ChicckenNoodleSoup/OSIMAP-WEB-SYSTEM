import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";  
import { createClient } from "@supabase/supabase-js";
import { validateEmail } from './utils/validation';
import "./ForgotPassword.css";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Replace with your deployed edge function URL
const RESET_PASS_URL = "https://bdysgnfgqcywjrqaqdsj.supabase.co/functions/v1/send-otp";

function ForgotPassword() {
  const navigate = useNavigate();  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') navigate('/');
  }, [navigate]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError('');
    setError('');
  };

  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    setEmailError(emailErr);
    if (emailErr) return;
  
    setIsLoading(true);
    try {
      const otp = generateOTP();
  
      // Save OTP in Supabase table
      const { error: insertError } = await supabase
        .from('password_reset_codes_desktop')
        .upsert({ email, code: otp }, { onConflict: ['email'] });
  
      if (insertError) {
        setError('Failed to save OTP. Try again.');
        setIsLoading(false);
        return;
      }
  
      // Call edge function to send email
      const response = await fetch(RESET_PASS_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ email, otp })
      });
  
      const data = await response.json();
  
      if (!data.success) {
        setError(data.error || 'Failed to send OTP email.');
      } else {
        setSent(true);
        // Redirect to reset password page after 2 seconds
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        }, 2000);
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
            <h2>Forgot Password</h2>
            <p className="forgot-subtext">
              Enter your email and we'll send you an OTP to reset your password.
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

                {error && <p className="validation-error">{error}</p>}

                <button type="submit" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <p className="success-message">
                OTP has been sent to your email. Check your inbox.
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
