import React, { useState, useEffect } from "react";
import "./CurrentRecords.css";
import "./Spinner.css";
import "./PageHeader.css";
import { DateTime } from "./DateTime";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import { usePageState } from "./contexts/PageStateContext";
import SingleSelectDropdown from "./SingleSelectDropdown";
import { isAdministrator } from "./utils/authUtils";
import { useUpload } from "./contexts/UploadContext";
import { LoadingSpinner } from "./components/LoadingSpinner";

function CurrentRecords() {
  // Use persistent state for filters, search, sort, and pagination
  const [searchTerm, setSearchTerm] = usePageState("searchTerm", "");
  const [currentPage, setCurrentPage] = usePageState("currentPage", 1);
  const [selectedBarangay, setSelectedBarangay] = usePageState("selectedBarangay", "all");
  const [selectedSeverity, setSelectedSeverity] = usePageState("selectedSeverity", "all");
  const [sortBy, setSortBy] = usePageState("sortBy", "date-desc"); // date-desc, date-asc, severity, severity-asc
  
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const recordsPerPage = 50;
  const navigate = useNavigate();
  const [barangayList, setBarangayList] = useState([]);
  
  // CRUD states
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    barangay: '',
    lat: '',
    lng: '',
    datecommitted: '',
    timecommitted: '',
    offensetype: '',
    severity: '',
    year: ''
  });
  const [message, setMessage] = useState('');
  const [activeTooltip, setActiveTooltip] = useState(null);
  const tooltipTimers = React.useRef({});

  // Clustering with background task support
  const { startUpload, activeUploads } = useUpload();
  const isClusteringRunning = activeUploads.some(u => 
    u.type === 'clustering' && u.status === 'processing'
  );

  useEffect(() => {
    setIsAdmin(isAdministrator());
  }, []);

  useEffect(() => {
    const fetchAllRecords = async () => {
      setLoading(true);
      let allRecords = [];
      const pageSize = 1000;
      let from = 0;
      let to = pageSize - 1;
      
      // Fetch first batch immediately to show data quickly
      const { data: firstBatch, error: firstError } = await supabase
        .from("road_traffic_accident")
        .select(
          "id, barangay, lat, lng, datecommitted, timecommitted, offensetype, year, severity"
        )
        .order("datecommitted", { ascending: false })
        .range(0, pageSize - 1);

      if (firstError) {
        console.error("Error fetching records:", firstError.message);
        setLoading(false);
        return;
      }

      // Show first batch immediately
      allRecords = firstBatch || [];
      setRecords(allRecords);
      const uniqueBarangays = [...new Set(allRecords.map(r => r.barangay).filter(Boolean))].sort();
      setBarangayList(uniqueBarangays);
      setLoading(false);

      // Continue fetching remaining records in background
      if (firstBatch && firstBatch.length === pageSize) {
        setLoadingMore(true);
        from = pageSize;
        to = pageSize * 2 - 1;
        let done = false;

        while (!done) {
          const { data, error } = await supabase
            .from("road_traffic_accident")
            .select(
              "id, barangay, lat, lng, datecommitted, timecommitted, offensetype, year, severity"
            )
            .order("datecommitted", { ascending: false })
            .range(from, to);

          if (error) {
            console.error("Error fetching records:", error.message);
            done = true;
          } else if (!data || data.length === 0) {
            done = true;
          } else {
            allRecords = [...allRecords, ...data];
            setRecords([...allRecords]);
            
            // Update barangay list progressively
            const updatedBarangays = [...new Set(allRecords.map(r => r.barangay).filter(Boolean))].sort();
            setBarangayList(updatedBarangays);
            
            if (data.length < pageSize) {
              done = true;
            } else {
              from += pageSize;
              to += pageSize;
            }
          }
        }
        setLoadingMore(false);
      }
    };

    fetchAllRecords();
  }, []);

  // Apply filters and search
  const filteredRecords = records.filter((record) => {
    // Barangay filter
    const matchesBarangay = selectedBarangay === "all" || record.barangay === selectedBarangay;
    
    // Severity filter
    const matchesSeverity = selectedSeverity === "all" || record.severity === selectedSeverity;
    
    // Search filter - only search if searchTerm exists
    const matchesSearch = !searchTerm || [
      record.id?.toString(),
      record.datecommitted,
      record.timecommitted,
      record.barangay,
      record.offensetype,
      record.severity,
      record.year?.toString(),
      record.lat?.toString(),
      record.lng?.toString(),
    ]
      .filter(Boolean)
      .some((field) =>
        String(field).toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesBarangay && matchesSeverity && matchesSearch;
  });

  // Apply sorting
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(b.datecommitted) - new Date(a.datecommitted);
    } else if (sortBy === 'date-asc') {
      return new Date(a.datecommitted) - new Date(b.datecommitted);
    } else if (sortBy === 'severity') {
      const severityOrder = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Minor': 5 };
      return (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);
    } else if (sortBy === 'severity-asc') {
      const severityOrder = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Minor': 5 };
      return (severityOrder[b.severity] || 99) - (severityOrder[a.severity] || 99);
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedRecords.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = sortedRecords.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  // Calculate display range
  const displayStart = sortedRecords.length > 0 ? indexOfFirstRecord + 1 : 0;
  const displayEnd = Math.min(indexOfLastRecord, sortedRecords.length);

  const handleRowClick = (record) => {
    if (record.lat && record.lng) {
      navigate("/map", {
        state: {
          fromRecords: true,
          lat: record.lat,
          lng: record.lng,
          recordDetails: record,
        }
      });
    }
  };  

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      barangay: '',
      lat: '',
      lng: '',
      datecommitted: '',
      timecommitted: '',
      offensetype: '',
      severity: '',
      year: new Date().getFullYear().toString()
    });
    setShowModal(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setEditingRecord(record);
    setFormData({
      barangay: record.barangay || '',
      lat: record.lat || '',
      lng: record.lng || '',
      datecommitted: record.datecommitted || '',
      timecommitted: record.timecommitted || '',
      offensetype: record.offensetype || '',
      severity: record.severity || '',
      year: record.year?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('road_traffic_accident')
        .delete()
        .eq('id', recordId);

      if (error) {
        setMessage('Error deleting record');
        console.error('Error:', error);
        return;
      }

      setMessage('Record deleted successfully');
      setTimeout(() => setMessage(''), 3000);
      
      // Refresh records
      setRecords(records.filter(r => r.id !== recordId));
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error deleting record');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === 'create') {
        const { error } = await supabase
          .from('road_traffic_accident')
          .insert([{
            ...formData,
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            year: parseInt(formData.year)
          }]);

        if (error) {
          setMessage('Error creating record');
          console.error('Error:', error);
          return;
        }

        setMessage('Record created successfully');
      } else {
        const { error } = await supabase
          .from('road_traffic_accident')
          .update({
            ...formData,
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            year: parseInt(formData.year)
          })
          .eq('id', editingRecord.id);

        if (error) {
          setMessage('Error updating record');
          console.error('Error:', error);
          return;
        }

        setMessage('Record updated successfully');
      }

      setTimeout(() => setMessage(''), 3000);
      setShowModal(false);
      
    
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error saving record');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRecord(null);
  };

  const handleRunClustering = async () => {
    if (isClusteringRunning) {
      setMessage('⏳ Clustering is already running');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch("https://osimap-web-system.onrender.com/run-clustering", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setMessage(`❌ ${data.message || "Failed to start clustering"}`);
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      
      // Start tracking as background task with clustering type and taskId
      startUpload({
        fileName: 'Clustering Analysis',
        fileSize: 0,
        type: 'clustering',
        taskId: data.taskId // Pass backend task ID for tracking
      });
      
      setMessage('🔄 Clustering started in background - you can continue using the app');
      setTimeout(() => setMessage(''), 5000);
      
    } catch (error) {
      console.error("Error running clustering:", error);
      setMessage("❌ Failed to connect to server");
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Tooltip handlers
  const handleTooltipMouseEnter = (tooltipId) => {
    if (tooltipTimers.current[tooltipId]) {
      clearTimeout(tooltipTimers.current[tooltipId]);
    }
    tooltipTimers.current[tooltipId] = setTimeout(() => {
      setActiveTooltip(tooltipId);
    }, 600); // Show tooltip after 600ms
  };

  const handleTooltipMouseLeave = (tooltipId) => {
    if (tooltipTimers.current[tooltipId]) {
      clearTimeout(tooltipTimers.current[tooltipId]);
    }
    setActiveTooltip(null);
  };

  // Tooltip renderer component
  const Tooltip = ({ id, text, children }) => (
    <div className="tooltip-wrapper" onMouseEnter={() => handleTooltipMouseEnter(id)} onMouseLeave={() => handleTooltipMouseLeave(id)}>
      {children}
      {activeTooltip === id && <div className="tooltip-text">{text}</div>}
    </div>
  );
  


  return (
    <div className="scroll-wrapper">
      <div className="records-container">
        <div className="page-header">
          <div className="page-title-container">
            <img src="stopLight.svg" alt="Logo" className="page-logo" />
            <h1 className="page-title">Current Records</h1>

            <button
              type="button"
              className="cr-info-btn"
              aria-label="Edit instructions"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <text
                  x="12"
                  y="16"
                  textAnchor="middle"
                  fontSize="12"
                  fill="currentColor"
                  fontFamily="Poppins, sans-serif"
                >
                  i
                </text>
              </svg>
            </button>

            <div
              className="cr-edit-instructions"
              role="status"
              aria-hidden="true"
            >
              <strong>💡 Record Info</strong>
              <div>• Use the search bar to look for a specific record.</div>
              <div>• Navigate through records using the pagination controls.</div>
              <div>• Click on any record row to view its location on the map.</div>
            </div>
          </div>

          <DateTime />
        </div>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {/* Filters and Sort Section */}
        <div className="filters-section">
          <div className="filters-container">
            <div className="filter-group">
              <label className="filter-label">Barangay</label>
              <SingleSelectDropdown
                options={barangayList}
                selectedValue={selectedBarangay}
                onChange={(value) => {
                  setSelectedBarangay(value);
                  setCurrentPage(1);
                }}
                placeholder="All Barangays"
                allLabel="All Barangays"
                allValue="all"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Severity</label>
              <SingleSelectDropdown
                options={['Critical', 'High', 'Medium', 'Low', 'Minor']}
                selectedValue={selectedSeverity}
                onChange={(value) => {
                  setSelectedSeverity(value);
                  setCurrentPage(1);
                }}
                placeholder="All Severities"
                allLabel="All Severities"
                allValue="all"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="severity">Severity (High to Low)</option>
                <option value="severity-asc">Severity (Low to High)</option>
              </select>
            </div>

          <button
              onClick={() => {
                setSelectedBarangay("all");
                setSelectedSeverity("all");
                setSortBy("date-desc");
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="clear-filters-btn"
              disabled={selectedBarangay === "all" && selectedSeverity === "all" && sortBy === "date-desc" && !searchTerm}
            >
              <Tooltip id="clear-filters" text="Reset all filters and search to show all records">
                Clear All Filters
              </Tooltip>
          </button>
          </div>
        </div>

        {/* Search Bar and Action Buttons */}
        <div className="search-actions">
          {isAdmin && (
            <>
              <button onClick={handleCreate} className="add-record-btn">
                + Add New Record
              </button>
              <button 
                onClick={handleRunClustering} 
                className="run-clustering-btn"
                disabled={isClusteringRunning}
                title="Run clustering analysis on all records"
              >
                {isClusteringRunning ? (
                  <>
                    <div className="spinner-small" />
                    Clustering...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"></circle>
                      <circle cx="12" cy="5" r="2"></circle>
                      <circle cx="12" cy="19" r="2"></circle>
                      <circle cx="5" cy="12" r="2"></circle>
                      <circle cx="19" cy="12" r="2"></circle>
                      <line x1="12" y1="8" x2="12" y2="9"></line>
                      <line x1="12" y1="15" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="9" y2="12"></line>
                      <line x1="15" y1="12" x2="16" y2="12"></line>
                    </svg>
                    Run Clustering
                  </>
                )}
              </button>
            </>
          )}
          
          <div className="search-container">
            <svg
              className="search-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path
                d="M11.742 10.344a6.5 6.5 0 1 0-1.397 
                1.398h-.001l3.85 3.85a1 1 0 0 0 
                1.415-1.414l-3.85-3.85zm-5.242.656a5 
                5 0 1 1 0-10 5 5 0 0 1 0 10z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
          </div>
        </div>

        <div className="records-card">
          {loading ? (
            <LoadingSpinner text="Loading records..." variant="compact" />
          ) : (
            <div className="table-body-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Barangay</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Offense Type</th>
                    <th>Severity</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.length > 0 ? (
                    currentRecords.map((record) => (
                      <tr key={record.id}>
                        <td onClick={() => handleRowClick(record)} style={{cursor: 'pointer'}}>{record.id}</td>
                        <td onClick={() => handleRowClick(record)} style={{cursor: 'pointer'}}>{record.datecommitted}</td>
                        <td onClick={() => handleRowClick(record)} style={{cursor: 'pointer'}}>{record.timecommitted}</td>
                        <td onClick={() => handleRowClick(record)} style={{cursor: 'pointer'}}>{record.barangay}</td>
                        <td onClick={() => handleRowClick(record)} style={{cursor: 'pointer'}}>{record.lat}</td>
                        <td onClick={() => handleRowClick(record)} style={{cursor: 'pointer'}}>{record.lng}</td>
                        <td onClick={() => handleRowClick(record)} style={{cursor: 'pointer'}}>{record.offensetype}</td>
                        <td onClick={() => handleRowClick(record)} style={{cursor: 'pointer'}}>{record.severity}</td>
                        {isAdmin && (
                          <td className="action-cell">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(record);
                              }}
                              className="edit-btn-small"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(record.id);
                              }}
                              className="delete-btn-small"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? "9" : "8"} className="no-records">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination and Record Count */}
        <div className="pagination-wrapper">
          <div className="record-count">
            Showing {displayStart}-{displayEnd} of {sortedRecords.length} records
            {sortedRecords.length !== records.length && (
              <span className="filtered-indicator"> (filtered from {records.length} total)</span>
            )}
            {loadingMore && (
              <span className="loading-more-indicator" style={{ marginLeft: '10px', color: '#ffd166', fontSize: '0.9em' }}>
                ⏳ Loading more records...
              </span>
            )}
          </div>
          
          <div className="pagination">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ⬅ Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              )
              .map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`pagination-number ${
                    currentPage === pageNum ? "active" : ""
                  }`}
                >
                  {pageNum}
                </button>
              ))}

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next ➡
            </button>
          </div>
        </div>

        {/* Modal for Create/Edit */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">{modalMode === 'create' ? 'Add New Record' : 'Edit Record'}</h2>
              
              <form onSubmit={handleSubmit} className="record-form">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Barangay *</label>
                    <input
                      type="text"
                      value={formData.barangay}
                      onChange={(e) => setFormData({...formData, barangay: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Date Committed *</label>
                    <input
                      type="date"
                      value={formData.datecommitted}
                      onChange={(e) => setFormData({...formData, datecommitted: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Time Committed</label>
                    <input
                      type="time"
                      value={formData.timecommitted}
                      onChange={(e) => setFormData({...formData, timecommitted: e.target.value})}
                    />
                  </div>

                  <div className="form-field">
                    <label>Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.lat}
                      onChange={(e) => setFormData({...formData, lat: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.lng}
                      onChange={(e) => setFormData({...formData, lng: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Offense Type *</label>
                    <input
                      type="text"
                      value={formData.offensetype}
                      onChange={(e) => setFormData({...formData, offensetype: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Severity *</label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({...formData, severity: e.target.value})}
                      required
                      className="form-select"
                    >
                      <option value="">Select Severity</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="Minor">Minor</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Year *</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: e.target.value})}
                      required
                      min="2000"
                      max="2099"
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={closeModal} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    {modalMode === 'create' ? 'Create Record' : 'Update Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CurrentRecords;
