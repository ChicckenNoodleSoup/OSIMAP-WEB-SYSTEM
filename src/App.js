import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './SignIn';
import CreateAccount from './CreateAccount';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import MapView from './MapView';
import CurrentRecords from './CurrentRecords';
import AddRecord from './AddRecord';
import HelpSupport from './HelpSupport';
import Print from './Print';
import Profile from './Profile';
import ForgotPassword from './ForgotPassword';
import AdminDashboard from './AdminDashboard';
import SessionTimeout from './components/SessionTimeout';
import AccountStatusChecker from './components/AccountStatusChecker';
import { UserProvider } from './UserContext';
import { UploadProvider, useUpload } from './contexts/UploadContext';
import { UploadProgressWidget } from './components/UploadProgressWidget';
import { isAuthenticated, clearUserData, extendSession } from './utils/authUtils';
import { logAuthEvent } from './utils/loggingUtils';
import './App.css';
import ResetPassword from './ResetPassword';
import DownloadPage from './DownloadPage';

function ProtectedRoute({ isAuthenticated, children }) {
  return isAuthenticated ? children : <Navigate to="/signin" />;
}

// Main app component that has access to UploadContext
function AppContent() {
  const [authState, setAuthState] = useState(isAuthenticated());
  const [authReady, setAuthReady] = useState(false);
  const { clearAll, hasActiveUploads } = useUpload();

  useEffect(() => {
    // Check authentication status on app load
    const checkAuth = () => {
      const authStatus = isAuthenticated();
      setAuthState(authStatus);
      setAuthReady(true);
    };
    
    checkAuth();
    
    // Extend session on user activity
    const handleUserActivity = () => {
      if (isAuthenticated()) {
        extendSession();
      }
    };
    
    // Add event listeners for user activity
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);
    
    return () => {
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keypress', handleUserActivity);
    };
  }, []);

  const handleLogout = async () => {
    // Check if there are active uploads
    if (hasActiveUploads()) {
      const confirmLogout = window.confirm(
        '⚠️ Upload in Progress\n\n' +
        'A file is currently being uploaded and processed.\n\n' +
        'If you log out now:\n' +
        '• The upload will be cancelled\n' +
        '• Processing will stop immediately\n' +
        '• Uploaded data may be incomplete\n\n' +
        'Do you want to cancel the upload and log out?'
      );
      
      if (!confirmLogout) {
        return; // User chose to stay and let upload finish
      }
    }
    
    await logAuthEvent.logout();
    await clearAll(); // SECURITY: Clear all upload data and cancel backend processing
    clearUserData();
    setAuthState(false);
  };

  if (!authReady) {
    return null;
  }

  return (
    <BrowserRouter>
      <UserProvider>
        <UploadProgressWidget />
        <Routes>
          {/* Public routes */}
          <Route
            path="/signin"
            element={<SignIn setIsAuthenticated={setAuthState} />}
          />
          <Route
            path="/create-account"
            element={<CreateAccount />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />
          <Route
            path="/download"
            element={<DownloadPage />}
          />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <>
                <ProtectedRoute isAuthenticated={authState}>
                  <>
                    <img src="/background-image.png" alt="Background" className="bg-image" />
                    <SessionTimeout />
                    <AccountStatusChecker />
                    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
                      <Sidebar onLogout={handleLogout} />
                      <div className="main-content">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/map" element={<MapView />} />
                        <Route path="/currentrecords" element={<CurrentRecords />} />
                        <Route path="/add-record" element={<AddRecord />} />
                        <Route path="/helpsupport" element={<HelpSupport />} />
                        <Route path="/print" element={<Print />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/admin-dashboard" element={<AdminDashboard />} />
                        <Route path="*" element={<div>Page Not Found</div>} />
                      </Routes>
                    </div>
                  </div>
                </>
              </ProtectedRoute>
              <SessionTimeout />
            </>
          }
        />
      </Routes>
    </UserProvider>
  </BrowserRouter>
  );
}

// Wrapper component that provides UploadContext
function App() {
  return (
    <UploadProvider>
      <AppContent />
    </UploadProvider>
  );
}

export default App;