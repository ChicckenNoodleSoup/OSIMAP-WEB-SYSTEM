import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";  
import { supabase } from "./supabaseClient";
import { validateEmail } from './utils/validation';
import "./ForgotPassword.css";

// Replace with your deployed edge function URL
const RESET_PASS_URL = "https://bdysgnfgqcywjrqaqdsj.supabase.co/functions/v1/send-otp";
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

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
      // Check if the email exists and account is approved
      const { data: userData, error: userError } = await supabase
        .from('police')
        .select('email, status, role')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        setError('No account found with this email address.');
        setIsLoading(false);
        return;
      }

      // Check if account is approved (or if user is Administrator)
      if (userData.role !== 'Administrator' && userData.status !== 'approved') {
        if (userData.status === 'pending') {
          setError('Your account is still pending approval. Please wait for administrator approval.');
        } else if (userData.status === 'rejected') {
          setError('Your account has been rejected. Please contact the administrator.');
        } else if (userData.status === 'revoked') {
          setError('Your account has been revoked. Please contact the administrator.');
        } else {
          setError('Your account is not approved for password reset.');
        }
        setIsLoading(false);
        return;
      }

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
                  {(emailError || error) && (
                    <p className="validation-error">{emailError || error}</p>
                  )}
                </div>

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
