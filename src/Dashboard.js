import React from 'react';

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
          <div className="map-placeholder">
            <p>Heatmap preview or placeholder here</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
