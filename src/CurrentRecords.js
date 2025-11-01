import React, { useState, useEffect } from "react";
import "./CurrentRecords.css";
import "./Spinner.css";
import "./PageHeader.css";
import { DateTime } from "./DateTime";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import SingleSelectDropdown from "./SingleSelectDropdown";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function CurrentRecords() {
  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;
  const navigate = useNavigate();
  
  // Filter states
  const [selectedBarangay, setSelectedBarangay] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [barangayList, setBarangayList] = useState([]);
  const [sortBy, setSortBy] = useState("date-desc"); // date-desc, date-asc, severity

  useEffect(() => {
    const fetchAllRecords = async () => {
      setLoading(true);
      let allRecords = [];
      const pageSize = 1000;
      let from = 0;
      let to = pageSize - 1;
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
        } else {
          allRecords = [...allRecords, ...(data || [])];
          if (!data || data.length < pageSize) done = true;
          else {
            from += pageSize;
            to += pageSize;
          }
        }
      }

      setRecords(allRecords);
      
      // Extract unique barangays for filter
      const uniqueBarangays = [...new Set(allRecords.map(r => r.barangay).filter(Boolean))].sort();
      setBarangayList(uniqueBarangays);
      
      setLoading(false);
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

        <div className="search-actions">
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
              Clear All Filters
            </button>
          </div>

        </div>

        <div className="records-card">
          {loading ? (
            <div className="loading-center compact" role="status" aria-live="polite">
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
                <svg 
                  className="loading-spinner" 
                  viewBox="-13 -13 45 45" 
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle className="box5631" cx="13" cy="1" r="5"/>
                  <circle className="box5631" cx="25" cy="1" r="5"/>
                  <circle className="box5631" cx="1" cy="13" r="5"/>
                  <circle className="box5631" cx="13" cy="13" r="5"/>
                  <circle className="box5631" cx="25" cy="13" r="5"/>
                  <circle className="box5631" cx="1" cy="25" r="5"/>
                  <circle className="box5631" cx="13" cy="25" r="5"/>
                  <circle className="box5631" cx="25" cy="25" r="5"/>
                  <circle className="box5631" cx="1" cy="1" r="5"/>
                </svg>
                <div className="loading-text">Loading records...</div>
              </div>
            </div>
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
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.length > 0 ? (
                    currentRecords.map((record) => (
                      <tr key={record.id} onClick={() => handleRowClick(record)}>
                        <td>{record.id}</td>
                        <td>{record.datecommitted}</td>
                        <td>{record.timecommitted}</td>
                        <td>{record.barangay}</td>
                        <td>{record.lat}</td>
                        <td>{record.lng}</td>
                        <td>{record.offensetype}</td>
                        <td>{record.severity}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="no-records">
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
      </div>
    </div>
  );
}

export default CurrentRecords;
