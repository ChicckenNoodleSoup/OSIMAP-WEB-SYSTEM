import React, { useState, useEffect } from "react";
import "./CurrentRecords.css";
import { DateTime } from "./DateTime";
import { createClient } from "@supabase/supabase-js";

// ==============================
// SUPABASE CONFIGURATION
// ==============================
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function CurrentRecords() {
  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch records from Supabase
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("road_traffic_accident") // your table
        .select(
          "id, barangay, lat, lng, datecommitted, timecommitted, offensetype, year, severity"
        )
        .order("datecommitted", { ascending: false });

      if (error) {
        console.error(" Error fetching records:", error.message);
      } else {
        setRecords(data || []);
      }
      setLoading(false);
    };

    fetchRecords();
  }, []);

  // Search filter (now includes ID)
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
      .filter(Boolean) // ignore null/undefined
      .some((field) =>
        String(field).toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  return (
    <div className="scroll-wrapper">
      <div className="records-container">
        <div className="page-header">
          <h1 className="page-title">Current Records</h1>
          <DateTime />
        </div>

        {/* Search Bar */}
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
              placeholder="Search records by ID, barangay, etc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Records Table */}
        <div className="records-card">
          {loading ? (
            <p>Loading records...</p>
          ) : (
            <>
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
              </table>

              <div className="table-body-wrapper">
                <table className="records-table">
                  <tbody>
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((record) => (
                        <tr key={record.id}>
                          <td>{record.id}</td>
                          <td>{record.datecommitted}</td>
                          <td>{record.timecommitted}</td>
                          <td>{record.barangay}</td>
                          <td>{record.lat}</td>
                          <td>{record.lng}</td>
                          <td>{record.offensetype}</td>
                          <td>{record.year}</td>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CurrentRecords;
