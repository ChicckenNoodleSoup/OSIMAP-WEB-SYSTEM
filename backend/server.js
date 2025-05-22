const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/data', express.static(path.join(__dirname, 'data')));

const GEOJSON_PATH = path.join(__dirname, 'data', 'accidents.geojson');
const HEATMAP_PATH = path.join(__dirname, 'data', 'accidents_for_heatmap.geojson');

function generateHeatmapGeoJSON(fullGeoJSON) {
  const features = fullGeoJSON.features.map(feature => ({
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      severity: feature.properties.severity || 1,
    }
  }));

  return {
    type: 'FeatureCollection',
    features: features
  };
}

// Root route to avoid "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Server is running');
});

app.post('/add-record', (req, res) => {
  const { longitude, latitude, type, severity, date, location } = req.body;

  if (!longitude || !latitude) {
    return res.status(400).json({ message: 'Longitude and latitude are required' });
  }

  fs.readFile(GEOJSON_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Failed to read file' });

    let geojson = JSON.parse(data);

    const newFeature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      properties: { type, severity, date, location }
    };

    geojson.features.push(newFeature);

    // Write updated main GeoJSON file
    fs.writeFile(GEOJSON_PATH, JSON.stringify(geojson, null, 2), (err) => {
      if (err) {
        console.error('Write file error:', err);
        return res.status(500).json({ message: 'Failed to write file' });
      }

      // Generate heatmap GeoJSON directly in JS
      const heatmapGeoJSON = generateHeatmapGeoJSON(geojson);

      fs.writeFile(HEATMAP_PATH, JSON.stringify(heatmapGeoJSON, null, 2), (err) => {
        if (err) {
          console.error('Failed to write heatmap GeoJSON', err);
          // You can still send success or send error here as needed
        }
        res.json({ message: 'Record added successfully' });
      });
    });
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
