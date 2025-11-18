import React from 'react';

const UploadSummary = ({ summary }) => {
  if (!summary) return null;

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="upload-summary-card">
      <h3 className="summary-title">📋 Current Upload Summary</h3>
      <div className="summary-content">
        <div className="summary-row">
          <span className="summary-label">File Name:</span>
          <span className="summary-value">{summary.fileName}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">File Size:</span>
          <span className="summary-value">{formatFileSize(summary.fileSize)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Upload Started:</span>
          <span className="summary-value">{formatDateTime(summary.uploadedAt)}</span>
        </div>
        {summary.completedAt && (
          <div className="summary-row">
            <span className="summary-label">Completed At:</span>
            <span className="summary-value">{formatDateTime(summary.completedAt)}</span>
          </div>
        )}
        {summary.processingTime !== undefined && (
          <div className="summary-row">
            <span className="summary-label">Processing Time:</span>
            <span className="summary-value">{summary.processingTime}s</span>
          </div>
        )}
        {summary.newRecords !== undefined && summary.newRecords !== null && (
          <div className="summary-row">
            <span className="summary-label">New Records:</span>
            <span className="summary-value summary-highlight">{summary.newRecords}</span>
          </div>
        )}
        {summary.duplicateRecords !== undefined && summary.duplicateRecords !== null && summary.duplicateRecords > 0 && (
          <div className="summary-row">
            <span className="summary-label">Duplicates Skipped:</span>
            <span className="summary-value summary-duplicate">{summary.duplicateRecords}</span>
          </div>
        )}
        {summary.recordsProcessed !== undefined && summary.recordsProcessed !== null && (
          <div className="summary-row">
            <span className="summary-label">Total Records:</span>
            <span className="summary-value">{summary.recordsProcessed}</span>
          </div>
        )}
        {summary.sheetsProcessed && summary.sheetsProcessed.length > 0 && (
          <div className="summary-row">
            <span className="summary-label">Sheets Processed:</span>
            <span className="summary-value">{summary.sheetsProcessed.join(', ')}</span>
          </div>
        )}
        <div className="summary-row">
          <span className="summary-label">Status:</span>
          <span className={`summary-value status-badge ${summary.status}`}>
            {summary.status === 'success' ? '✅ Success' : 
             summary.status === 'processing' ? '⏳ Processing' : 
             '❌ Failed'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UploadSummary;

