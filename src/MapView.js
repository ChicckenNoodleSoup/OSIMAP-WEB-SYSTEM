import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  useMap,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import "./MapView.css";
import { DateTime } from './DateTime';

// Heatmap Layer Component
function HeatmapLayer({ accidentData }) {
  const map = useMap();

  useEffect(() => {
    if (!accidentData) return;

    map.invalidateSize();

    const timeoutId = setTimeout(() => {
      const points = accidentData.features
        .map(({ geometry, properties }) => {
          if (!geometry || !geometry.coordinates) return null;
          const [lng, lat] = geometry.coordinates;
          if (typeof lat !== "number" || typeof lng !== "number") return null;
          const intensity = (properties.severity || 1) / 5;
          return [lat, lng, intensity];
        })
        .filter(Boolean);

      const heatLayer = L.heatLayer(points, {
        radius: 25,
        blur: 20,
        maxZoom: 17,
        gradient: {
          0.2: "blue",
          0.4: "lime",
          0.6: "orange",
          1.0: "red",
        },
        minOpacity: 0.4,
      }).addTo(map);

      return () => {
        map.removeLayer(heatLayer);
      };
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [accidentData, map]);

  return null;
}

export default function MapView() {
  const [accidentData, setAccidentData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          "http://localhost:5000/data/accidents_for_heatmap.geojson"
        );
        const data = await res.json();
        setAccidentData(data);
      } catch (error) {
        console.error("Failed to load GeoJSON:", error);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="scroll-wrapper">
      <div className="mapview-container">
        <div className="page-header">
          <h6 className="page-title">Map View</h6>
          <DateTime />
        </div>
        <div className="map-card">
          <div className="mapview-wrapper">
            <MapContainer
              center={[15.0306, 120.6845]}
              zoom={14}
              scrollWheelZoom={true}
              className="mapview-map"
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

              {/* Heatmap Layer */}
              <HeatmapLayer accidentData={accidentData} />

              {/* Circle markers for hover tooltips */}
              {accidentData &&
                accidentData.features.map(({ geometry, properties }, idx) => {
                  if (!geometry || !geometry.coordinates) return null;
                  const [lng, lat] = geometry.coordinates;
                  if (typeof lat !== "number" || typeof lng !== "number") return null;

                  return (
                    <CircleMarker
                      key={idx}
                      center={[lat, lng]}
                      radius={7}
                      fillColor="transparent"
                      stroke={false}
                      pointerEvents="auto"
                    >
                      <Tooltip
                        direction="top"
                        offset={[0, -10]}
                        opacity={1}
                        permanent={false}
                      >
                        <div className="mapview-tooltip">
                          <div>
                            <b>Latitude:</b> {lat.toFixed(5)}
                          </div>
                          <div>
                            <b>Longitude:</b> {lng.toFixed(5)}
                          </div>
                          <div>
                            <b>Accident Type:</b> {properties.type || "N/A"}
                          </div>
                          <div>
                            <b>Severity:</b> {properties.severity || "N/A"}
                          </div>
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
