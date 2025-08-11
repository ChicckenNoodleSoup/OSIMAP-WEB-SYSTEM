import React, { useState } from 'react';
import './CurrentRecords.css';

function CurrentRecords() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [records, setRecords] = useState([
    { id: 1, date: '2025-08-01', time: '12:30', longitude: '120.98', latitude: '14.60', weather: 'Sunny', accidentType: 'Collision' },
    { id: 2, date: '2025-08-02', time: '15:45', longitude: '121.05', latitude: '14.55', weather: 'Rainy', accidentType: 'Overturn' },
    { id: 3, date: '2025-08-03', time: '09:15', longitude: '120.99', latitude: '14.65', weather: 'Cloudy', accidentType: 'Breakdown' },
    { id: 4, date: '2025-08-04', time: '14:00', longitude: '121.00', latitude: '14.60', weather: 'Sunny', accidentType: 'Collision' },
    { id: 5, date: '2025-08-05', time: '11:30', longitude: '120.95', latitude: '14.58', weather: 'Rainy', accidentType: 'Breakdown' },
    { id: 6, date: '2025-08-06', time: '16:15', longitude: '121.10', latitude: '14.63', weather: 'Cloudy', accidentType: 'Overturn' },
    { id: 4, date: '2025-08-04', time: '14:00', longitude: '121.00', latitude: '14.60', weather: 'Sunny', accidentType: 'Collision' },
    { id: 5, date: '2025-08-05', time: '11:30', longitude: '120.95', latitude: '14.58', weather: 'Rainy', accidentType: 'Breakdown' },
    { id: 6, date: '2025-08-06', time: '16:15', longitude: '121.10', latitude: '14.63', weather: 'Cloudy', accidentType: 'Overturn' },
    { id: 4, date: '2025-08-04', time: '14:00', longitude: '121.00', latitude: '14.60', weather: 'Sunny', accidentType: 'Collision' },
    { id: 5, date: '2025-08-05', time: '11:30', longitude: '120.95', latitude: '14.58', weather: 'Rainy', accidentType: 'Breakdown' },
    { id: 6, date: '2025-08-06', time: '16:15', longitude: '121.10', latitude: '14.63', weather: 'Cloudy', accidentType: 'Overturn' },
  ]);

  const filteredRecords = records.filter(record =>
    record.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.time.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.longitude.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.latitude.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.weather.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.accidentType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = () => setIsEditing(true);
  const handleSave = () => setIsEditing(false);

  const handleChange = (id, field, value) => {
    setRecords(prev =>
      prev.map(record =>
        record.id === id ? { ...record, [field]: value } : record
      )
    );
  };

  return (
    <div className="scroll-wrapper">
    <div className="records-container">
      <h1>Current Records</h1>

      {/* Search & Actions */}
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
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 
              1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 
              0-10 5 5 0 0 1 0 10z" />
          </svg>
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <button onClick={handleEdit} className="edit-btn">Edit</button>
        <button onClick={handleSave} className="save-btn">Save</button>
      </div>

      <div className="records-card">
        <table className="records-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Longitude</th>
              <th>Latitude</th>
              <th>Weather</th>
              <th>Accident Type</th>
            </tr>
          </thead>
        </table>

        <div className="table-body-wrapper">
          <table className="records-table">
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    {Object.keys(record).filter(k => k !== 'id').map((field) => (
                      <td key={field}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={record[field]}
                            onChange={(e) => handleChange(record.id, field, e.target.value)}
                            className="edit-input"
                          />
                        ) : (
                          record[field]
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-records">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}

export default CurrentRecords;
