import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { logDataEvent, uploadHistoryService } from '../utils/loggingUtils';
import { isAuthenticated } from '../utils/authUtils';

const UploadContext = createContext();

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within UploadProvider');
  }
  return context;
};

export const UploadProvider = ({ children }) => {
  const [activeUploads, setActiveUploads] = useState(() => {
    // Load active uploads from localStorage on mount
    const saved = localStorage.getItem('activeUploads');
    return saved ? JSON.parse(saved) : [];
  });

  const [lastCompletedUpload, setLastCompletedUpload] = useState(() => {
    // Load last completed upload from localStorage
    const saved = localStorage.getItem('lastCompletedUpload');
    return saved ? JSON.parse(saved) : null;
  });

  // Use ref for immediate duplicate detection (no state delay)
  const completedUploadIdsRef = useRef(new Set());
  const completionLocksRef = useRef(new Map()); // Lock to prevent concurrent completion
  const pollingIntervalRef = useRef(null); // Track polling interval to prevent duplicates

  // Save to localStorage whenever activeUploads changes
  useEffect(() => {
    localStorage.setItem('activeUploads', JSON.stringify(activeUploads));
  }, [activeUploads]);

  // Save lastCompletedUpload to localStorage
  useEffect(() => {
    if (lastCompletedUpload) {
      localStorage.setItem('lastCompletedUpload', JSON.stringify(lastCompletedUpload));
    }
  }, [lastCompletedUpload]);

  // Poll backend status for all active uploads
  // Protected against React StrictMode double-mounting
  useEffect(() => {
    const processingUploads = activeUploads.filter(u => u.status === 'processing');
    
    // Clear any existing interval first (prevents StrictMode duplicates)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (processingUploads.length === 0) {
      return;
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:5000/status');
        if (!res.ok) return;

        const statusData = await res.json();
        
        // Process each upload based on status
        for (const upload of processingUploads) {
          // Skip if already completed
          if (completedUploadIdsRef.current.has(upload.id)) {
            continue;
          }

          // Also skip if upload status is no longer "processing"
          if (upload.status !== 'processing') {
            continue;
          }

          if (statusData.status === 'error') {
            // Processing failed
            await completeUpload(upload.id, {
              status: 'failed',
              errorMessage: statusData.processingError || 'Unknown error',
              processingTime: statusData.processingTime || 0
            });
          } else if (!statusData.isProcessing && statusData.status === 'idle') {
            // Processing complete
            await completeUpload(upload.id, {
              status: 'success',
              processingTime: statusData.processingTime || 0,
              recordsProcessed: statusData.recordsProcessed || 'N/A',
              sheetsProcessed: statusData.sheetsProcessed || [],
              newRecords: statusData.newRecords !== undefined ? statusData.newRecords : 0,
              duplicateRecords: statusData.duplicateRecords !== undefined ? statusData.duplicateRecords : 0
            });
          } else if (statusData.isProcessing) {
            // Update processing time
            updateUpload(upload.id, {
              processingTime: statusData.processingTime || 0
            });
          }
        }
      } catch (err) {
        console.error('Error polling upload status:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [activeUploads]);

  const startUpload = (uploadData) => {
    const newUpload = {
      id: Date.now(),
      fileName: uploadData.fileName,
      fileSize: uploadData.fileSize,
      uploadedAt: new Date().toISOString(),
      status: 'processing',
      processingTime: 0,
      currentStep: 'uploading'
    };

    setActiveUploads(prev => [...prev, newUpload]);
    return newUpload.id;
  };

  const updateUpload = (uploadId, updates) => {
    setActiveUploads(prev =>
      prev.map(upload =>
        upload.id === uploadId
          ? { ...upload, ...updates }
          : upload
      )
    );
  };

  const completeUpload = async (uploadId, completionData) => {
    // FIRST CHECK: Already completed?
    if (completedUploadIdsRef.current.has(uploadId)) {
      return;
    }
    
    // SECOND CHECK: Is completion already in progress?
    if (completionLocksRef.current.has(uploadId)) {
      return;
    }
    
    // Lock this upload completion
    completionLocksRef.current.set(uploadId, true);
    
    // Add IMMEDIATELY to completed IDs
    completedUploadIdsRef.current.add(uploadId);

    // Get upload data BEFORE setState (avoid StrictMode re-execution)
    let upload = null;
    setActiveUploads(prev => {
      upload = prev.find(u => u.id === uploadId);
      return prev; // Don't change state yet
    });

    if (!upload) {
      completionLocksRef.current.delete(uploadId);
      completedUploadIdsRef.current.delete(uploadId);
      return;
    }

    const completedUpload = {
      ...upload,
      ...completionData,
      completedAt: new Date().toISOString()
    };

    // Save to history OUTSIDE of setState (prevents StrictMode double-execution)
    try {
      const logDetails = completionData.status === 'success'
        ? `Records: ${completionData.recordsProcessed}, Sheets: ${completionData.sheetsProcessed?.join(', ') || 'N/A'}, Time: ${completionData.processingTime}s`
        : `Error: ${completionData.errorMessage || 'Upload failed'}`;
      
      // Log to activity logs and get log_id
      const logId = await logDataEvent.uploadCompleted(
        upload.fileName,
        completionData.status,
        logDetails
      );

      // Save to upload_history table
      const savedHistory = await uploadHistoryService.save({
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        uploadedAt: upload.uploadedAt,
        completedAt: completedUpload.completedAt,
        processingTime: completionData.processingTime,
        recordsProcessed: completionData.recordsProcessed,
        sheetsProcessed: completionData.sheetsProcessed,
        newRecords: completionData.newRecords,
        duplicateRecords: completionData.duplicateRecords,
        status: completionData.status,
        errorMessage: completionData.errorMessage
      }, logId);

      // Show notification
      showNotification(
        completionData.status === 'success' 
          ? `✅ ${upload.fileName} uploaded successfully!`
          : `❌ ${upload.fileName} upload failed`
      );
      
      // Unlock after successful save
      completionLocksRef.current.delete(uploadId);
    } catch (error) {
      console.error('Error saving upload to history:', error);
      // Remove from completed IDs and locks if save failed to allow retry
      completedUploadIdsRef.current.delete(uploadId);
      completionLocksRef.current.delete(uploadId);
    }

    // NOW update state (after save is complete)
    setActiveUploads(prev => {
      return prev.map(u =>
        u.id === uploadId
          ? { ...u, ...completionData, completedAt: completedUpload.completedAt }
          : u
      );
    });

    // Store as last completed for AddRecord page to show summary
    setLastCompletedUpload(completedUpload);

    // Keep completed/failed uploads for 10 seconds, then remove
    setTimeout(() => {
      setActiveUploads(current => current.filter(u => u.id !== uploadId));
    }, 10000);
  };

  const clearLastCompleted = () => {
    setLastCompletedUpload(null);
    localStorage.removeItem('lastCompletedUpload');
  };

  const removeUpload = (uploadId) => {
    setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const clearCompleted = () => {
    setActiveUploads(prev => prev.filter(u => u.status === 'processing'));
  };

  const cancelUpload = async () => {
    try {
      const res = await fetch('http://localhost:5000/cancel', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        console.log('Upload cancelled successfully');
        return true;
      } else {
        console.error('Failed to cancel upload:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Error cancelling upload:', error);
      return false;
    }
  };

  const clearAll = async (shouldCancelBackend = true) => {
    // SECURITY: Clear all upload data (called on logout)
    
    // Cancel backend processing if requested
    if (shouldCancelBackend && activeUploads.some(u => u.status === 'processing')) {
      await cancelUpload();
    }
    
    // Stop polling interval immediately
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setActiveUploads([]);
    setLastCompletedUpload(null);
    completedUploadIdsRef.current.clear();
    completionLocksRef.current.clear();
    localStorage.removeItem('activeUploads');
    localStorage.removeItem('lastCompletedUpload');
  };

  const showNotification = (message) => {
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('OSIMAP Upload', {
        body: message,
        icon: '/stopLight.svg'
      });
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // SECURITY: Monitor authentication and clear uploads on logout
  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated() && (activeUploads.length > 0 || lastCompletedUpload)) {
        // User logged out but uploads still exist - clear them
        // Don't cancel backend (already done by logout handler)
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setActiveUploads([]);
        setLastCompletedUpload(null);
        completedUploadIdsRef.current.clear();
        completionLocksRef.current.clear();
        localStorage.removeItem('activeUploads');
        localStorage.removeItem('lastCompletedUpload');
      }
    };

    // Check immediately
    checkAuth();

    // Check periodically (every second)
    const authCheckInterval = setInterval(checkAuth, 1000);

    return () => clearInterval(authCheckInterval);
  }, [activeUploads.length, lastCompletedUpload]);

  const hasActiveUploads = () => {
    return activeUploads.some(u => u.status === 'processing');
  };

  const value = {
    activeUploads,
    lastCompletedUpload,
    startUpload,
    updateUpload,
    completeUpload,
    removeUpload,
    clearCompleted,
    clearLastCompleted,
    clearAll,
    cancelUpload,
    hasActiveUploads
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

