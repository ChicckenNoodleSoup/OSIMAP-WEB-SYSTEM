import React from 'react';
import { Navigate } from 'react-router-dom';

function RoleProtectedRoute({ children, allowedRoles = [], fallbackPath = '/' }) {
  // Get user role from localStorage
  const userRole = localStorage.getItem('userRole');
  
  // Check if user has the required role
  const hasAccess = allowedRoles.includes(userRole);
  
  if (!hasAccess) {
    // Redirect to fallback path if user doesn't have access
    return <Navigate to={fallbackPath} replace />;
  }
  
  return children;
}

export default RoleProtectedRoute;