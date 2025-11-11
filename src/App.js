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
import { PageStateProvider, useClearPageStates } from './contexts/PageStateContext';
import { UploadProgressWidget } from './components/UploadProgressWidget';
import { isAuthenticated, clearUserData, extendSession } from './utils/authUtils';
import { logAuthEvent } from './utils/loggingUtils';
import './App.css';
import ResetPassword from './ResetPassword';
import DownloadPage from './DownloadPage';

function ProtectedRoute({ isAuthenticated, children }) {
  return isAuthenticated ? children : <Navigate to="/signin" />;
}

// Main app component that has access to UploadContext and PageStateContext
function AppContent() {
  const [authState, setAuthState] = useState(isAuthenticated());
  const [authReady, setAuthReady] = useState(false);
  const { clearAll, hasActiveUploads, activeUploads } = useUpload();
  const clearPageStates = useClearPageStates();

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
    const processingTasks = activeUploads.filter(u => u.status === 'processing');
    
    if (processingTasks.length > 0) {
      // Determine task type(s)
      const hasUpload = processingTasks.some(t => t.type === 'upload');
      const hasClustering = processingTasks.some(t => t.type === 'clustering');
      
      let title, description, consequences;
      
      if (hasUpload && hasClustering) {
        // Both types
        title = '⚠️ Tasks in Progress';
        description = 'File upload and clustering analysis are currently running.';
        consequences = '• Both tasks will be cancelled\n' +
                      '• Processing will stop immediately\n' +
                      '• Uploaded data may be incomplete';
      } else if (hasClustering) {
        // Only clustering
        title = '⚠️ Clustering in Progress';
        description = 'Clustering analysis is currently running.';
        consequences = '• The clustering task will be cancelled\n' +
                      '• Analysis will stop immediately\n' +
                      '• Cluster data may be incomplete';
      } else {
        // Only upload
        title = '⚠️ Upload in Progress';
        description = 'A file is currently being uploaded and processed.';
        consequences = '• The upload will be cancelled\n' +
                      '• Processing will stop immediately\n' +
                      '• Uploaded data may be incomplete';
      }
      
      const confirmLogout = window.confirm(
        `${title}\n\n` +
        `${description}\n\n` +
        'If you log out now:\n' +
        consequences + '\n\n' +
        'Do you want to cancel and log out?'
      );
      
      if (!confirmLogout) {
        return; // User chose to stay and let task(s) finish
      }
    }
    
    await logAuthEvent.logout();
    await clearAll(); // SECURITY: Clear all upload data and cancel backend processing
    clearPageStates(); // Clear all saved page states
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

// Wrapper component that provides UploadContext and PageStateContext
function App() {
  return (
    <UploadProvider>
      <PageStateProvider>
        <AppContent />
      </PageStateProvider>
    </UploadProvider>
  );
}

export default App;