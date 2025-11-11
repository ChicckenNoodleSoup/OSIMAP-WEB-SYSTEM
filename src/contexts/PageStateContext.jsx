import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { isAuthenticated } from '../utils/authUtils';
import { useLocation } from 'react-router-dom';

const PageStateContext = createContext();

// Hook for persistent state on a specific page
export const usePageState = (stateName, initialValue) => {
  const location = useLocation();
  const pageName = location.pathname;
  const context = useContext(PageStateContext);
  
  if (!context) {
    throw new Error('usePageState must be used within a PageStateProvider');
  }

  const { getPageState, setPageState } = context;
  
  // Initialize state from localStorage or use initialValue
  const [state, setState] = useState(() => {
    const savedPageState = getPageState(pageName);
    return savedPageState && savedPageState[stateName] !== undefined 
      ? savedPageState[stateName] 
      : initialValue;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    const currentPageState = getPageState(pageName) || {};
    currentPageState[stateName] = state;
    setPageState(pageName, currentPageState);
  }, [state, stateName, pageName, getPageState, setPageState]);

  return [state, setState];
};

export const PageStateProvider = ({ children }) => {
  const STORAGE_KEY = 'pageStates';

  // Get page state from localStorage
  const getPageState = (pageName, defaultState = {}) => {
    if (!isAuthenticated()) {
      return defaultState;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allStates = JSON.parse(stored);
        const userId = getUserId();
        
        if (allStates[userId] && allStates[userId][pageName]) {
          return { ...defaultState, ...allStates[userId][pageName] };
        }
      }
    } catch (error) {
      console.error('Error loading page state:', error);
    }
    
    return defaultState;
  };

  // Set page state to localStorage
  const setPageState = (pageName, state) => {
    if (!isAuthenticated()) {
      return;
    }

    try {
      const userId = getUserId();
      if (!userId) return;

      const stored = localStorage.getItem(STORAGE_KEY);
      const allStates = stored ? JSON.parse(stored) : {};
      
      if (!allStates[userId]) {
        allStates[userId] = {};
      }
      
      allStates[userId][pageName] = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allStates));
    } catch (error) {
      console.error('Error saving page state:', error);
    }
  };

  // Clear all page states
  const clearPageStates = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing page states:', error);
    }
  };

  // Get current user ID from localStorage
  const getUserId = () => {
    try {
      const adminData = localStorage.getItem('adminData');
      if (adminData) {
        const userData = JSON.parse(adminData);
        return userData.id;
      }
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
    return null;
  };

  // Monitor authentication and clear states on logout
  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        clearPageStates();
      }
    };

    checkAuth();
    const authCheckInterval = setInterval(checkAuth, 2000);
    return () => clearInterval(authCheckInterval);
  }, []);

  const value = {
    getPageState,
    setPageState,
    clearPageStates
  };

  return (
    <PageStateContext.Provider value={value}>
      {children}
    </PageStateContext.Provider>
  );
};

export const useClearPageStates = () => {
  const context = useContext(PageStateContext);
  if (!context) {
    throw new Error('useClearPageStates must be used within a PageStateProvider');
  }
  return context.clearPageStates;
};

