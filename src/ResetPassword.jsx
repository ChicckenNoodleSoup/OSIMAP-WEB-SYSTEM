import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { validatePassword, validateConfirmPassword } from "./utils/validation";
import "./ForgotPassword.css"; // Change to ResetPassword.css later

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const accessToken = searchParams.get("access_token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setError("Invalid or missing reset token.");
    }
  }, [accessToken]);

  const handleInputChange = (setter, errorSetter) => (e) => {
    setter(e.target.value);
    errorSetter("");
    setError("");
  };

  const validateForm = () => {
    const passwordErr = validatePassword(password);
    const confirmPassErr = validateConfirmPassword(password, confirmPassword);

    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPassErr);

    return !passwordErr && !confirmPassErr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm() || !accessToken) return;

    setIsLoading(true);

    try {
      // Create temporary session using token
      await supabase.auth.setSession({ access_token: accessToken });

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/signin"), 3000);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
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
              Enter your new password and confirm it below.
            </p>

            {!success ? (
              <form onSubmit={handleSubmit}>
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

                <button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Password"}
                </button>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => navigate("/signin")}
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
