import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

export default function MapView() {
  const [accidentData, setAccidentData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/accidents_for_heatmap.geojson');
      const data = await res.json();
      setAccidentData(data);
    }
    fetchData();
  }, []);

  const HeatmapLayer = () => {
    const map = useMap();

    useEffect(() => {
      if (!accidentData) return;

      // Build heatmap data: [lat, lng, intensity]
      const points = accidentData.features.map(({ geometry, properties }) => {
        const [lng, lat] = geometry.coordinates;
        const intensity = (properties.severity || 1) / 5;  // normalize intensity (adjust divisor to tweak)
        return [lat, lng, intensity];
      });

      const heatLayer = L.heatLayer(points, {
        radius: 25,
        blur: 20,
        maxZoom: 17,
        gradient: {
          0.2: 'blue',
          0.4: 'lime',
          0.6: 'orange',
          1.0: 'red',
        },
        minOpacity: 0.4,
      }).addTo(map);

      return () => {
        map.removeLayer(heatLayer);
      };
    }, [accidentData, map]);

    return null;
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapContainer
        center={[15.0306, 120.6845]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap Standard">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="CartoDB Positron">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution="© CartoDB"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Stamen Toner Lite">
            <TileLayer
              url="https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png"
              attribution="Map tiles by Stamen Design"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <HeatmapLayer />
      </MapContainer>
    </div>
  );
}
