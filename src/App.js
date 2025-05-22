import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import MapView from './MapView';

function Sidebar() {
    const navigate = useNavigate();

    return (
        <div className="sidebar">
            <div>
                <div className="logo">
                    <img src="/logo192.png" alt="Logo" />
                    <span>OSIMAP</span>
                </div>
                <div className="menu-item" onClick={() => navigate('/')}>
                    <img src="https://via.placeholder.com/24.png?text=Dashboard" alt="Dashboard" />
                    <span>Dashboard</span>
                </div>
                <div className="menu-item" onClick={() => navigate('/map')}>
                    <img src="https://via.placeholder.com/24.png?text=Map" alt="Map" />
                    <span>View Map</span>
                </div>
                <div className="menu-item" onClick={() => navigate('/add-record')}>
                    <img src="https://via.placeholder.com/24.png?text=Add" alt="Add" />
                    <span>Add Record</span>
                </div>
                <div className="menu-item" onClick={() => alert('Feature coming soon!')}>
                    <img src="https://via.placeholder.com/24.png?text=Records" alt="Records" />
                    <span>Current Records</span>
                </div>
                <div className="menu-item">
                    <img src="https://via.placeholder.com/24.png?text=Support" alt="Support" />
                    <span>Help & Support</span>
                </div>
            </div>
            <div>
                <div className="menu-item">
                    <img src="https://via.placeholder.com/24.png?text=Profile" alt="Profile" />
                    <span>User Profile</span>
                </div>
                <div className="menu-item">
                    <span>Logout</span>
                </div>
            </div>
        </div>
    );
}

function Dashboard() {
    return (
        <div className="main-content">
            <div className="header">
                <div className="date">May 22, 2025</div>
                <div className="time">10:28 AM</div>
            </div>
            <div className="content">
                <div className="data-section">
                    <h1 style={{ marginBottom: '20px' }}>San Fernando HeatMap (Prototype)</h1>
                    <h2>Data Analysis</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Value</th>
                                <th>Change</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Metric 1</td>
                                <td>123</td>
                                <td>+5%</td>
                                <td><button>View Report</button></td>
                            </tr>
                            <tr>
                                <td>Metric 2</td>
                                <td>456</td>
                                <td>-2%</td>
                                <td><button>View Report</button></td>
                            </tr>
                            <tr>
                                <td>Metric 3</td>
                                <td>789</td>
                                <td>+10%</td>
                                <td><button>View Report</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="map-section">
                    <div className="map-placeholder"></div>
                </div>
            </div>
        </div>
    );
}

function AddRecord({ accidents, setAccidents }) {
    const [formData, setFormData] = useState({
        longitude: '',
        latitude: '',
        type: 'Vehicle Collision',
        severity: 1,
        date: '',
        location: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:5000/add-record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                const newFeature = {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
                    },
                    properties: {
                        type: formData.type,
                        severity: parseInt(formData.severity),
                        date: formData.date,
                        location: formData.location,
                    },
                };

                setAccidents(prev => ({
                    ...prev,
                    features: [...prev.features, newFeature],
                }));

                setFormData({ longitude: '', latitude: '', type: 'Vehicle Collision', severity: 1, date: '', location: '' });
            }
        } catch (error) {
            alert('Failed to add record');
            console.error(error);
        }
    };

    const downloadGeoJSON = () => {
        const dataStr = JSON.stringify(accidents, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'accidents.geojson');
        linkElement.click();
    };

    const downloadHeatmapGeoJSON = () => {
        const heatmapFeatures = accidents.features.map(feature => ({
            type: "Feature",
            geometry: feature.geometry,
            properties: {
                severity: feature.properties.severity || 1
            }
        }));
        const heatmapGeoJSON = {
            type: "FeatureCollection",
            features: heatmapFeatures
        };
        const dataStr = JSON.stringify(heatmapGeoJSON, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'accidents_for_heatmap.geojson');
        linkElement.click();
    };

    return (
        <div className="main-content">
            <div className="header">
                <div className="date">May 22, 2025</div>
                <div className="time">10:28 AM</div>
            </div>
            <div className="add-record-section">
                <h1 style={{ marginBottom: '20px' }}>Add New Record</h1>
                <form onSubmit={handleSubmit}>
                    <label>Longitude:</label>
                    <input type="number" name="longitude" value={formData.longitude} onChange={handleChange} required step="any" />
                    <label>Latitude:</label>
                    <input type="number" name="latitude" value={formData.latitude} onChange={handleChange} required step="any" />
                    <label>Type:</label>
                    <select name="type" value={formData.type} onChange={handleChange}>
                        <option value="Vehicle Collision">Vehicle Collision</option>
                        <option value="Pedestrian Incident">Pedestrian Incident</option>
                    </select>
                    <label>Severity (1-4):</label>
                    <input type="number" name="severity" min="1" max="4" value={formData.severity} onChange={handleChange} required />
                    <label>Date:</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required />
                    <label>Location:</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required />
                    <button type="submit">Add Record</button>
                </form>
                <button className="download-button" onClick={downloadGeoJSON}>Download accidents.geojson</button>
                <button className="download-button" onClick={downloadHeatmapGeoJSON}>Download accidents_for_heatmap.geojson</button>
            </div>
        </div>
    );
}

function App() {
    const initialAccidents = {
        type: "FeatureCollection",
        features: [
            // your initial features here...
        ]
    };

    const [accidents, setAccidents] = useState(initialAccidents);

    return (
        <BrowserRouter>
            <div style={{ display: 'flex', height: '100vh' }}>
                <Sidebar />
                <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/map" element={<MapView accidents={accidents} />} />
                        <Route path="/add-record" element={<AddRecord accidents={accidents} setAccidents={setAccidents} />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;
