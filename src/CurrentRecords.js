import React, { useState, useEffect, useRef } from "react";
import "./CurrentRecords.css";
import { DateTime } from "./DateTime";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function CurrentRecords() {
  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;

  const [editingRowId, setEditingRowId] = useState(null);
  const [editedRow, setEditedRow] = useState({});

  // REMOVED: toggle instructions state (show on hover via CSS now)
  // const [showInstructions, setShowInstructions] = useState(false);
  
  // ref for detecting outside clicks
  const tableWrapperRef = useRef(null);

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

  // Save changes automatically on blur / outside click
  const handleBlur = async () => {
    // Optional: persist to Supabase here if desired:
    // await supabase.from("road_traffic_accident").update({...editedRow}).eq("id", editedRow.id);

    setRecords((prev) =>
      prev.map((rec) => (rec.id === editedRow.id ? editedRow : rec))
    );
    setEditingRowId(null);
  };

  // detect clicks outside table wrapper to save edits
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (
        editingRowId &&
        tableWrapperRef.current &&
        !tableWrapperRef.current.contains(e.target)
      ) {
        handleBlur();
      }
    };

    const onDocKeyDown = (e) => {
      if (!editingRowId) return;
      if (e.key === "Enter") {
        // prevent default form submit behavior and save
        e.preventDefault();
        handleBlur();
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [editingRowId, editedRow, handleBlur]); // include handleBlur so latest handler is used

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

  // Start editing a row
  const handleRowClick = (record) => {
    setEditingRowId(record.id);
    setEditedRow({ ...record });
  };

  return (
    <div className="scroll-wrapper">
      <div className="records-container">
        <div className="page-header">
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <h1 className="page-title">Current Records</h1>

            {/* Info button shows panel on hover/focus (no JS toggle) */}
            <button
              type="button"
              className="info-btn"
              aria-label="Edit instructions"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="0" />
                <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontFamily="Poppins, sans-serif">i</text>
              </svg>
            </button>
          </div>

          <DateTime />

          {/* instructions panel moved inside page-header so CSS :hover can control visibility */}
          <div className="edit-instructions" role="status" aria-hidden="true">
            <strong>💡 How to Edit Rows</strong>
            <div> • Click a row to start editing.</div>
            <div> • Change fields inline.</div>
            <div> • Click outside or press Enter to save.</div>
          </div>
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
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 
                1.398h-.001l3.85 3.85a1 1 0 0 0 
                1.415-1.414l-3.85-3.85zm-5.242.656a5 
                5 0 1 1 0-10 5 5 0 0 1 0 10z" />
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
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
            <div className="table-body-wrapper" ref={tableWrapperRef}>
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
                    <th>Year</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.length > 0 ? (
                    currentRecords.map((record) => (
                      <tr
                        key={record.id}
                        className={editingRowId === record.id ? "editing-row" : ""}
                        onClick={() =>
                          editingRowId !== record.id && handleRowClick(record)
                        }
                      >
                        <td>
                          {editingRowId === record.id ? (
                            <input
                              type="text"
                              value={editedRow.id || ""}
                              readOnly
                              className="edit-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            record.id
                          )}
                        </td>

                        <td>
                          {editingRowId === record.id ? (
                            <input
                              type="date"
                              value={editedRow.datecommitted || ""}
                              onChange={(e) =>
                                setEditedRow((prev) => ({ ...prev, datecommitted: e.target.value }))
                              }
                              className="edit-input"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            record.datecommitted
                          )}
                        </td>

                        <td>
                          {editingRowId === record.id ? (
                            <input
                              type="time"
                              value={editedRow.timecommitted || ""}
                              onChange={(e) =>
                                setEditedRow((prev) => ({ ...prev, timecommitted: e.target.value }))
                              }
                              className="edit-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            record.timecommitted
                          )}
                        </td>

                        <td>
                          {editingRowId === record.id ? (
                            <input
                              type="text"
                              value={editedRow.barangay || ""}
                              onChange={(e) =>
                                setEditedRow((prev) => ({ ...prev, barangay: e.target.value }))
                              }
                              className="edit-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            record.barangay
                          )}
                        </td>

                        <td>
                          {editingRowId === record.id ? (
                            <input
                              type="number"
                              step="any"
                              value={editedRow.lat ?? ""}
                              onChange={(e) =>
                                setEditedRow((prev) => ({ ...prev, lat: e.target.value }))
                              }
                              className="edit-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            record.lat
                          )}
                        </td>

                        <td>
                          {editingRowId === record.id ? (
                            <input
                              type="number"
                              step="any"
                              value={editedRow.lng ?? ""}
                              onChange={(e) =>
                                setEditedRow((prev) => ({ ...prev, lng: e.target.value }))
                              }
                              className="edit-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            record.lng
                          )}
                        </td>

                        <td>
                          {editingRowId === record.id ? (
                            <input
                              type="text"
                              value={editedRow.offensetype || ""}
                              onChange={(e) =>
                                setEditedRow((prev) => ({ ...prev, offensetype: e.target.value }))
                              }
                              className="edit-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            record.offensetype
                          )}
                        </td>

                        <td>
                          {editingRowId === record.id ? (
                            <input
                              type="number"
                              value={editedRow.year ?? ""}
                              onChange={(e) =>
                                setEditedRow((prev) => ({ ...prev, year: e.target.value }))
                              }
                              className="edit-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            record.year
                          )}
                        </td>

                        <td>
                          {editingRowId === record.id ? (
                            <input
                              type="text"
                              value={editedRow.severity || ""}
                              onChange={(e) =>
                                setEditedRow((prev) => ({ ...prev, severity: e.target.value }))
                              }
                              className="edit-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            record.severity
                          )}
                        </td>
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
