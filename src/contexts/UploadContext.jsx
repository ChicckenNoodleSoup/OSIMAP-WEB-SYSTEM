import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { logDataEvent, uploadHistoryService } from '../utils/loggingUtils';

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
      console.log('🛑 Clearing existing polling interval');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (processingUploads.length === 0) {
      console.log('ℹ️ No processing uploads, polling stopped');
      return;
    }

    console.log('🚀 Starting polling for', processingUploads.length, 'upload(s)');
    pollingIntervalRef.current = setInterval(async () => {
      console.log('📡 Polling backend status...');
      
      try {
        const res = await fetch('http://localhost:5000/status');
        if (!res.ok) return;

        const statusData = await res.json();
        console.log('📊 Backend status:', statusData);
        
        // Process each upload based on status
        for (const upload of processingUploads) {
          console.log('🔍 Checking upload:', upload.id, 'Status:', upload.status, 'Backend status:', statusData.status);
          
          // Skip if already completed
          if (completedUploadIdsRef.current.has(upload.id)) {
            console.log('⏭️ Skipping - already in completed IDs');
            continue;
          }

          // IMPORTANT: Also skip if upload status is no longer "processing"
          if (upload.status !== 'processing') {
            console.log('⏭️ Skipping - upload status is:', upload.status);
            continue;
          }

          if (statusData.status === 'error') {
            // Processing failed
            console.log('❌ Backend error detected, completing upload as failed');
            await completeUpload(upload.id, {
              status: 'failed',
              errorMessage: statusData.processingError || 'Unknown error',
              processingTime: statusData.processingTime || 0
            });
          } else if (!statusData.isProcessing && statusData.status === 'idle') {
            // Processing complete
            console.log('✅ Backend idle detected, completing upload as success');
            await completeUpload(upload.id, {
              status: 'success',
              processingTime: statusData.processingTime || 0,
              recordsProcessed: statusData.recordsProcessed || 'N/A',
              sheetsProcessed: statusData.sheetsProcessed || []
            });
          } else if (statusData.isProcessing) {
            // Update processing time
            console.log('⏳ Still processing, updating time:', statusData.processingTime);
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
      console.log('🧹 Cleanup: Clearing polling interval');
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
    console.log('🔔 completeUpload called for ID:', uploadId, 'Status:', completionData.status);
    console.log('📋 Currently completed IDs:', Array.from(completedUploadIdsRef.current));
    console.log('🔒 Current locks:', Array.from(completionLocksRef.current.keys()));
    
    // FIRST CHECK: Already completed?
    if (completedUploadIdsRef.current.has(uploadId)) {
      console.log('⚠️ DUPLICATE PREVENTED (already completed):', uploadId);
      return;
    }
    
    // SECOND CHECK: Is completion already in progress?
    if (completionLocksRef.current.has(uploadId)) {
      console.log('⚠️ DUPLICATE PREVENTED (completion in progress):', uploadId);
      return;
    }
    
    // Lock this upload completion
    completionLocksRef.current.set(uploadId, true);
    console.log('🔒 Locked upload for completion:', uploadId);
    
    // Add IMMEDIATELY to completed IDs
    completedUploadIdsRef.current.add(uploadId);
    console.log('✅ Marked as completed:', uploadId);

    // Get upload data BEFORE setState (avoid StrictMode re-execution)
    let upload = null;
    setActiveUploads(prev => {
      upload = prev.find(u => u.id === uploadId);
      return prev; // Don't change state yet
    });

    if (!upload) {
      console.log('⚠️ Upload not found:', uploadId);
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
      console.log('💾 Starting save for upload:', upload.fileName, 'ID:', uploadId);
      
      const logDetails = completionData.status === 'success'
        ? `Records: ${completionData.recordsProcessed}, Sheets: ${completionData.sheetsProcessed?.join(', ') || 'N/A'}, Time: ${completionData.processingTime}s`
        : `Error: ${completionData.errorMessage || 'Upload failed'}`;
      
      // Log to activity logs and get log_id
      const logId = await logDataEvent.uploadCompleted(
        upload.fileName,
        completionData.status,
        logDetails
      );

      console.log('📝 Log created with ID:', logId);

      // Save to upload_history table
      const savedHistory = await uploadHistoryService.save({
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        uploadedAt: upload.uploadedAt,
        completedAt: completedUpload.completedAt,
        processingTime: completionData.processingTime,
        recordsProcessed: completionData.recordsProcessed,
        sheetsProcessed: completionData.sheetsProcessed,
        status: completionData.status,
        errorMessage: completionData.errorMessage
      }, logId);

      if (savedHistory) {
        console.log('✅ Upload saved to history successfully with ID:', savedHistory.id);
      }

      // Show notification
      showNotification(
        completionData.status === 'success' 
          ? `✅ ${upload.fileName} uploaded successfully!`
          : `❌ ${upload.fileName} upload failed`
      );
      
      // Unlock after successful save
      completionLocksRef.current.delete(uploadId);
      console.log('🔓 Unlocked upload:', uploadId);
    } catch (error) {
      console.error('❌ Error saving upload to history:', error);
      // Remove from completed IDs and locks if save failed to allow retry
      completedUploadIdsRef.current.delete(uploadId);
      completionLocksRef.current.delete(uploadId);
      console.log('🔓 Unlocked upload after error:', uploadId);
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

  const value = {
    activeUploads,
    lastCompletedUpload,
    startUpload,
    updateUpload,
    completeUpload,
    removeUpload,
    clearCompleted,
    clearLastCompleted
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

