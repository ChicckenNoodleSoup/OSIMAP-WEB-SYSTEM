import React from 'react';
import Pagination from '../Pagination';
import { Activity, User, Clock, Mail } from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';

const LogsTab = ({
  logsLoading,
  userLogs,
  getPaginatedLogs,
  logsDisplayStart,
  logsDisplayEnd,
  logsCurrentPage,
  logsTotalPages,
  onPageChange
}) => {
  if (logsLoading) {
    return <LoadingSpinner text="Loading user activity logs..." variant="compact" />;
  }

  if (userLogs.length === 0) {
    return (
      <div className="no-data">
        <Activity size={48} className="no-data-icon" />
        <p>No user activity logs found</p>
      </div>
    );
  }

  const paginatedLogs = getPaginatedLogs?.() || [];

  return (
    <>
      <div className="logs-scrollable-wrapper">
        <div className="logs-list">
          {paginatedLogs.map((log) => (
            <div key={log.id} className="log-card">
              <div className="log-info">
                <div className="log-header">
                  <div className="log-user">
                    <User size={18} />
                    <h4>{log.police?.full_name || 'Unknown User'}</h4>
                  </div>
                  <div className="log-time">
                    <Clock size={14} />
                    <span>{new Date(log.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
                <div className="log-email">
                  <Mail size={14} />
                  <span>{log.police?.email || 'No email'}</span>
                </div>
                <div className="log-activity">
                  <Activity size={14} />
                  <span>{log.activity || 'No activity description'}</span>
                </div>
                {log.details && (
                  <div className="log-details">
                    <span>{log.details}</span>
                  </div>
                )}
                {log.ip_address && (
                  <div className="log-ip">
                    <span>IP: {log.ip_address}</span>
                  </div>
                )}
              </div>
              <div className="log-type">
                <span className={`log-type-badge ${log.log_type?.toLowerCase() || 'info'}`}>
                  {log.log_type || 'INFO'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Pagination
        currentPage={logsCurrentPage}
        totalPages={logsTotalPages}
        onPageChange={onPageChange}
        totalItems={userLogs.length}
        itemsPerPage={20}
        itemName="logs"
      />
    </>
  );
};

export default LogsTab;

