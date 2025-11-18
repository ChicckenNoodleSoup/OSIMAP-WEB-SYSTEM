import React from 'react';

const UploadHistoryModal = ({
  isOpen,
  onClose,
  onClearHistory,
  isLoadingHistory,
  uploadHistory
}) => {
  if (!isOpen) return null;

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
      minute: '2-digit'
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList && e.target.classList.contains('history-modal-backdrop')) {
      onClose();
    }
  };

  return (
    <div className="history-modal-backdrop" onClick={handleBackdropClick}>
      <div className="history-modal">
        <div className="history-modal-header">
          <div className="history-title-section">
            <h3 className="history-title">Recent Uploads</h3>
            <span className="history-subtitle">Last 10 uploads</span>
          </div>
          <div className="history-modal-actions">
            <button 
              onClick={onClearHistory} 
              className="clear-history-btn-modal" 
              disabled={isLoadingHistory || uploadHistory.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Clear All
            </button>
            <button 
              onClick={onClose} 
              className="close-modal-btn"
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="history-modal-content">
          {isLoadingHistory ? (
            <div className="history-loading">
              <div className="spinner small" />
              <p>Loading upload history...</p>
            </div>
          ) : uploadHistory.length === 0 ? (
            <div className="history-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"></path>
              </svg>
              <p className="empty-title">No upload history yet</p>
              <p className="empty-subtitle">Your upload history will appear here after you upload files</p>
            </div>
          ) : (
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Size</th>
                    <th>Upload Time</th>
                    <th>New</th>
                    <th>Duplicates</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="file-name-cell">
                        <div className="file-name-wrapper">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                          </svg>
                          {item.file_name}
                        </div>
                      </td>
                      <td>{formatFileSize(item.file_size)}</td>
                      <td>{formatDateTime(item.upload_started_at)}</td>
                      <td className="new-records-cell">
                        {item.new_records !== null && item.new_records !== undefined ? item.new_records : 'N/A'}
                      </td>
                      <td className="duplicate-records-cell">
                        {item.duplicate_records !== null && item.duplicate_records !== undefined ? item.duplicate_records : 'N/A'}
                      </td>
                      <td>{item.processing_time ? `${item.processing_time}s` : 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${item.status}`}>
                          {item.status === 'success' ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              Success
                            </>
                          ) : item.status === 'processing' ? (
                            <>⏳ Processing</>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                              Failed
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadHistoryModal;

