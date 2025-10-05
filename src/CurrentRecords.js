import React, { useState, useEffect } from "react";
import "./CurrentRecords.css";
import { DateTime } from "./DateTime";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function CurrentRecords() {
  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;

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
      setLoading(false);
    };

    fetchAllRecords();
  }, []);

  const filteredRecords = records.filter((record) =>
    [
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
      )
  );

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  const navigate = useNavigate();

  const handleRowClick = (record) => {
    if (record.lat && record.lng) {
      navigate(`/map?lat=${record.lat}&lng=${record.lng}`);
    }
  };


  return (
    <div className="scroll-wrapper">
      <div className="records-container">
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="page-title-container">
              <img src="stopLight.svg" alt="Logo" className="page-logo" />
              <h1 className="page-title">Current Records</h1>
            </div>

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

        <div className="records-card">
          {loading ? (
            <p>Loading {records.length} records...</p>
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
      </div>
    </div>
  );
}

export default CurrentRecords;
