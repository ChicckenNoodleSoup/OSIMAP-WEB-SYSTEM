import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTimeUntilExpiration, extendSession, clearUserData, isAuthenticated } from '../utils/authUtils';
import { logAuthEvent } from '../utils/loggingUtils';
import { useUpload } from '../contexts/UploadContext';

function SessionTimeout() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const hasLoggedExpiration = useRef(false);
  const intervalRef = useRef(null); // Track interval to prevent StrictMode duplicates
  const navigate = useNavigate();
  const { clearAll } = useUpload();

  useEffect(() => {
    // Clear any existing interval first (prevents StrictMode duplicates)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const checkSession = () => {
      const timeUntilExpiration = getTimeUntilExpiration();
      setTimeLeft(timeUntilExpiration);

      // Show warning when 2 minutes left (for 15-minute sessions)
      if (timeUntilExpiration <= 2 * 60 * 1000 && timeUntilExpiration > 0) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
      
      // Auto-logout when session expires
      if (timeUntilExpiration <= 0 && !hasLoggedExpiration.current) {
        hasLoggedExpiration.current = true;
        // Clear the interval immediately to prevent multiple calls
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        handleLogout();
      }
    };

    // Check immediately
    checkSession();

    // Check every second for real-time updates
    intervalRef.current = setInterval(checkSession, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Auto-extend session on user activity
  useEffect(() => {
    const handleUserActivity = () => {
      if (showModal && isAuthenticated()) {
        extendSession();
        setShowModal(false);
      }
    };

    // Add event listeners for user activity
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);

    return () => {
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keypress', handleUserActivity);
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
    };
  }, [showModal]);

  const handleExtendSession = () => {
    extendSession();
    setShowModal(false);
  };

  const handleLogout = async () => {
    await logAuthEvent.sessionExpired();
    clearAll(); // SECURITY: Clear all upload data
    clearUserData();
    navigate('/signin', { replace: true });
  };

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showModal) return null;

  return (
    <div className="session-timeout-overlay" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="session-timeout-modal" style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        color: '#333'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            color: '#333', 
            fontSize: '18px', 
            fontWeight: '600' 
          }}>
            Session Expiring Soon
          </h3>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <p style={{ 
            margin: '0 0 12px 0', 
            color: '#666', 
            lineHeight: '1.5' 
          }}>
            Your session will expire in {formatTime(timeLeft)} due to inactivity.
          </p>
          <p style={{ 
            margin: '0 0 0 0', 
            color: '#666', 
            lineHeight: '1.5' 
          }}>
            Any activity will automatically extend your session.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SessionTimeout;