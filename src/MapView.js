import { useEffect, useState, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  useMap,
  CircleMarker,
  Tooltip,
  Circle,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import "./MapView.css";
import { DateTime } from "./DateTime";

// Cluster colors
const getClusterColor = (clusterId) => {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
    "#F8C471", "#82E0AA", "#F1948A", "#85C1E9", "#D7DBDD",
  ];
  return clusterId === -1 ? "#95A5A6" : colors[clusterId % colors.length];
};

// 🔒 San Fernando bounding box
const sanFernandoBounds = [
  [14.9666, 120.5874], // Southwest
  [15.0858, 120.7722], // Northeast
];

// Heatmap layer
function ClusteredHeatmapLayer({ accidentData, showHeatmap }) {
  const map = useMap();

  const heatmapPoints = useMemo(() => {
    if (!accidentData || !showHeatmap) return [];

    return accidentData.features
      .filter((f) => f.properties.type === "accident_point")
      .map(({ geometry, properties }) => {
        if (!geometry || !geometry.coordinates) return null;
        const [lng, lat] = geometry.coordinates;
        if (typeof lat !== "number" || typeof lng !== "number") return null;

        let intensity = 0.5;
        if (properties.severity) {
          const severityMap = {
            Critical: 1.0,
            High: 0.8,
            Medium: 0.6,
            Low: 0.4,
            Minor: 0.2,
          };
          intensity = severityMap[properties.severity] || 0.5;
        }

        return [lat, lng, intensity];
      })
      .filter(Boolean);
  }, [accidentData, showHeatmap]);

  useEffect(() => {
    if (!showHeatmap || heatmapPoints.length === 0) return;

    const heatLayer = L.heatLayer(heatmapPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 18,
      gradient: {
        0.2: "blue",
        0.4: "cyan",
        0.6: "lime",
        0.8: "yellow",
        1.0: "red",
      },
      minOpacity: 0.4,
    });

    map.addLayer(heatLayer);
    return () => map.removeLayer(heatLayer);
  }, [map, heatmapPoints, showHeatmap]);

  return null;
}

// Cluster circles
function ClusterCenters({ clusterCenters, showClusters }) {
  if (!showClusters || !clusterCenters) return null;

  return (
    <>
      {clusterCenters.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        const { properties } = f;
        const color = getClusterColor(properties.cluster_id);
        const radius = Math.min(Math.sqrt(properties.accident_count) * 30, 200);

        return (
          <Circle
            key={`cluster-${properties.cluster_id}`}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.15,
              color: color,
              weight: 2,
              opacity: 0.6,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div className="mapview-tooltip">
                <div><b>Cluster #{properties.cluster_id}</b></div>
                <div><b>Accidents:</b> {properties.accident_count}</div>
                <div><b>Location:</b> {lat.toFixed(4)}, {lng.toFixed(4)}</div>
                {properties.barangays?.length > 0 && (
                  <div>
                    <b>Areas:</b> {properties.barangays.slice(0, 2).join(", ")}
                    {properties.barangays.length > 2 ? "..." : ""}
                  </div>
                )}
              </div>
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
}

// Accident markers
function AccidentMarkers({ accidentPoints, showMarkers }) {
  if (!showMarkers || !accidentPoints) return null;

  return (
    <>
      {accidentPoints.map((f, idx) => {
        const { geometry, properties } = f;
        const [lng, lat] = geometry.coordinates;
        const clusterColor = getClusterColor(properties.cluster);
        const isNoise = properties.cluster === -1;

        return (
          <CircleMarker
            key={`accident-${idx}`}
            center={[lat, lng]}
            radius={isNoise ? 3 : 4}
            pathOptions={{
              fillColor: clusterColor,
              fillOpacity: isNoise ? 0.4 : 0.7,
              color: clusterColor,
              weight: 1,
              opacity: isNoise ? 0.6 : 0.9,
            }}
          >
            <Tooltip direction="top" offset={[0, -5]} opacity={1}>
              <div className="mapview-tooltip">
                <div><b>Cluster:</b> {isNoise ? "Noise" : `#${properties.cluster}`}</div>
                <div><b>Type:</b> {properties.offensetype || "N/A"}</div>
                <div><b>Severity:</b> {properties.severity || "N/A"}</div>
                {properties.barangay && <div><b>Area:</b> {properties.barangay}</div>}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

// Main component
export default function MapView() {
  const [accidentData, setAccidentData] = useState(null);
  const [showClusters, setShowClusters] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);
  const [loading, setLoading] = useState(true);

  const { accidentPoints, clusterCenters, stats } = useMemo(() => {
    if (!accidentData) return { accidentPoints: [], clusterCenters: [], stats: null };

    const accidents = accidentData.features.filter((f) => f.properties.type === "accident_point");
    const clusters = accidentData.features.filter((f) => f.properties.type === "cluster_center");

    return {
      accidentPoints: accidents,
      clusterCenters: clusters,
      stats: {
        totalAccidents: accidents.length,
        totalClusters: clusters.length,
        noisePoints: accidents.filter((f) => f.properties.cluster === -1).length,
      },
    };
  }, [accidentData]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          "http://localhost:5000/data/accidents_clustered.geojson"
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setAccidentData(data);
        console.log("Loaded clustered data:", data.features?.length, "features");
      } catch (err) {
        console.error("Failed to load clustered GeoJSON:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleToggle = useCallback((setter) => (e) => setter(e.target.checked), []);

  if (loading) {
    return (
      <div className="scroll-wrapper">
        <div className="mapview-container">
          <div className="page-header">
            <h6 className="page-title">Loading Clustered Data...</h6>
            <DateTime />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-wrapper">
      <div className="mapview-container">
        <div className="page-header">
          <h6 className="page-title">Clustered Accident Heatmap</h6>
          <DateTime />
        </div>

        {/* Controls */}
        <div 
        className="controls-panel"
        style={{
        padding: "8px 12px",
        marginBottom: "8px",
        backgroundColor: "#f8f9fa",
        border: "1px solid #ddd",
        borderRadius: "6px",
        display: "flex",
        gap: "16px",
        alignItems: "center",
        fontSize: "14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        color: "#000"
      }}
    >
      <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <input type="checkbox" checked={showHeatmap} onChange={handleToggle(setShowHeatmap)} /> Heatmap
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <input type="checkbox" checked={showClusters} onChange={handleToggle(setShowClusters)} /> Clusters
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <input type="checkbox" checked={showMarkers} onChange={handleToggle(setShowMarkers)} /> Points
      </label>
      {stats && (
        <div 
          className="stats"
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            color: "#000000ff",
            fontStyle: "italic"
          }}
        >
          {stats.totalAccidents} accidents • {stats.totalClusters} clusters • {stats.noisePoints} noise
        </div>
      )}
    </div>

        {/* Map */}
        <div className="map-card">
          <div className="mapview-wrapper">
            <MapContainer
              center={[15.0306, 120.6845]}
              zoom={14}
              minZoom={12}
              maxZoom={18}
              scrollWheelZoom={true}
              className="mapview-map"
              preferCanvas={true}
              updateWhenZooming={false}
              updateWhenIdle={true}
              maxBounds={sanFernandoBounds}  // 🔒 Lock map to San Fernando
              maxBoundsViscosity={1.0}       // 1 = hard lock
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Light">
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution="© CartoDB"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Streets">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap contributors"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Dark">
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution="© CartoDB"
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              <ClusteredHeatmapLayer accidentData={accidentData} showHeatmap={showHeatmap} />
              <ClusterCenters clusterCenters={clusterCenters} showClusters={showClusters} />
              <AccidentMarkers accidentPoints={accidentPoints} showMarkers={showMarkers} />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
