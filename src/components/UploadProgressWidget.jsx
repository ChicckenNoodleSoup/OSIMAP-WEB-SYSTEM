import React, { useState } from 'react';
import { useUpload } from '../contexts/UploadContext';
import './UploadProgressWidget.css';

export const UploadProgressWidget = () => {
  const { activeUploads, removeUpload, clearCompleted } = useUpload();
  const [isMinimized, setIsMinimized] = useState(false);

  if (activeUploads.length === 0) return null;

  const processingCount = activeUploads.filter(u => u.status === 'processing').length;
  const completedCount = activeUploads.filter(u => u.status === 'success').length;
  const failedCount = activeUploads.filter(u => u.status === 'failed').length;

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={`upload-widget ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="upload-widget-header">
        <div className="upload-widget-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>
            {processingCount > 0 
              ? `Uploading ${processingCount} file${processingCount > 1 ? 's' : ''}...`
              : `${completedCount + failedCount} Upload${completedCount + failedCount > 1 ? 's' : ''} Complete`
            }
          </span>
        </div>
        <div className="upload-widget-actions">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="widget-btn"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMinimized ? (
                <polyline points="18 15 12 9 6 15"></polyline>
              ) : (
                <polyline points="6 9 12 15 18 9"></polyline>
              )}
            </svg>
          </button>
          {processingCount === 0 && (
            <button 
              onClick={clearCompleted}
              className="widget-btn"
              title="Clear completed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Upload List */}
      {!isMinimized && (
        <div className="upload-widget-content">
          {activeUploads.map((upload) => (
            <div key={upload.id} className={`upload-item ${upload.status}`}>
              <div className="upload-item-icon">
                {upload.status === 'processing' ? (
                  <div className="upload-spinner" />
                ) : upload.status === 'success' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                )}
              </div>
              
              <div className="upload-item-details">
                <div className="upload-item-name" title={upload.fileName}>
                  {upload.fileName}
                </div>
                <div className="upload-item-meta">
                  {upload.status === 'processing' && (
                    <span className="processing-text">
                      Processing... {upload.processingTime > 0 && `(${upload.processingTime}s)`}
                    </span>
                  )}
                  {upload.status === 'success' && (
                    <span className="success-text">
                      ✓ Completed • {formatFileSize(upload.fileSize)}
                      {upload.recordsProcessed && ` • ${upload.recordsProcessed} records`}
                    </span>
                  )}
                  {upload.status === 'failed' && (
                    <span className="error-text">
                      Failed: {upload.errorMessage || 'Unknown error'}
                    </span>
                  )}
                </div>
              </div>

              {upload.status !== 'processing' && (
                <button
                  onClick={() => removeUpload(upload.id)}
                  className="remove-upload-btn"
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

