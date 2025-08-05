import React from 'react';

function MapView({ accidents }) {
  return (
    <div className="main-content">
      <div className="header">
        <div className="date">May 22, 2025</div>
        <div className="time">10:28 AM</div>
      </div>
      <div className="content">
        <h2>Live Map View</h2>
        <div className="map-container">
          <p>This is where the map component will be rendered.</p>
          <pre>{JSON.stringify(accidents, null, 2)}</pre> {/* Optional for debugging */}
        </div>
      </div>
    </div>
  );
}

export default MapView;
