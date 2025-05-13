import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';  // Make sure to include leaflet-heat

export default function MapView() {
  const [accidentData, setAccidentData] = useState(null);

  useEffect(() => {
    // Fetch the geojson file from the public folder
    const fetchAccidentData = async () => {
      const response = await fetch('/accidents.geojson');
      const data = await response.json();
      setAccidentData(data);
    };

    fetchAccidentData();
  }, []);

  // Add heatmap to map
  const HeatmapLayer = () => {
    const map = useMap(); // Get map instance from react-leaflet

    useEffect(() => {
      // Transform GeoJSON data into heatmap format
      const heatmapData = accidentData?.features.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const intensity = feature.properties.severity / 4; // Normalize severity for intensity (1 to 1)
        
        // Returning lat, lng and intensity (heatmap point)
        return [lat, lng, intensity];
      }) || [];

      // Create heatmap layer
      const heatLayer = L.heatLayer(heatmapData, {
        radius: 20,  // Reduced radius for better street definition
        blur: 15,    // Slightly more blur for smoother transitions
        maxZoom: 17, // Limit the zoom level for better performance
        gradient: { 0.2: 'yellow', 0.5: 'orange', 1: 'red' },  // Adjusted gradient for smoother transition
        minOpacity: 0.4, // Make the heatmap less harsh
      }).addTo(map);

      // Create a tooltip on hover
      map.on('mousemove', (e) => {
        const latLng = e.latlng;
        const point = heatmapData.find(
          (pt) => Math.abs(pt[0] - latLng.lat) < 0.001 && Math.abs(pt[1] - latLng.lng) < 0.001
        );

        if (point) {
          const { type, severity, date, location } = accidentData.features.find(
            (feature) => feature.geometry.coordinates[0] === point[1] && feature.geometry.coordinates[1] === point[0]
          ).properties;

          // Display the info in a tooltip or popup
          const tooltipContent = `
            <div style="font-size: 14px; color: black;">
              <strong>Type: ${type}</strong><br />
              <strong>Location: ${location}</strong><br />
              Severity: ${severity}<br />
              Date: ${date}
            </div>
          `;
          
          // Create a popup and set it at the current mouse position
          L.popup()
            .setLatLng(latLng)
            .setContent(tooltipContent)
            .openOn(map);
        }
      });

      // Clean up the heatmap layer when component unmounts
      return () => {
        map.removeLayer(heatLayer);
      };
    }, [accidentData, map]);

    return null;
  };

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[15.0306, 120.6845]} // San Fernando coordinates
        zoom={14} // Zoom level
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Esri World Imagery">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="© Esri"
              zIndex={1}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
              zIndex={2}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Add HeatmapLayer */}
        <HeatmapLayer />
      </MapContainer>
    </div>
  );
}
