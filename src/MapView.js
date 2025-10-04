import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  useMap,
  CircleMarker,
  Tooltip,
  Circle
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet-fullscreen";
import "leaflet-fullscreen/dist/leaflet.fullscreen.css";
import "./MapView.css";
import { DateTime } from "./DateTime";
import L from "leaflet";

// Your Mapbox access token (if needed, this is not used in the provided TileLayer URLs)
// mapboxgl.accessToken = 'pk.eyJ1IjoibWFud2VsYmUiLCJhIjoiY2x3bW9wMDBtMWo5eTJrczFqaW1qdzQ1cCJ9.uF-N1-17B46iI5c56zM9_A';

// Cluster colors
const getClusterColor = (clusterId) => {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
    "#F8C471", "#82E0AA", "#F1948A", "#85C1E9", "#D7DBDD",
  ];
  return clusterId === -1 ? "#95A5A6" : colors[clusterId % colors.length];
};

// San Fernando bounding box
const sanFernandoBounds = [
  [14.90, 120.50],
  [15.16, 120.80],
];

// Heatmap layer
function ClusteredHeatmapLayer({ filteredData, showHeatmap }) {
  const map = useMap();
  const heatmapPoints = useMemo(() => {
    if (!filteredData || !showHeatmap || !filteredData.accidentPoints) return [];
    
    return filteredData.accidentPoints
      .map(({ geometry, properties }) => {
        if (!geometry || !geometry.coordinates) return null;
        const [lng, lat] = geometry.coordinates;
        if (typeof lat !== "number" || typeof lng !== "number" || lat === 0 || lng === 0) return null;

        const severityMap = { Critical: 1, High: 0.8, Medium: 0.6, Low: 0.4, Minor: 0.2 };
        const intensity = properties.severity ? severityMap[properties.severity] || 0.5 : 0.5;
        return [lat, lng, intensity];
      })
      .filter(Boolean);
  }, [filteredData, showHeatmap]);

  useEffect(() => {
    if (!showHeatmap || heatmapPoints.length === 0) return;

    const heatLayer = L.heatLayer(heatmapPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 18,
      gradient: { 0.2: "blue", 0.4: "cyan", 0.6: "lime", 0.8: "yellow", 1: "red" },
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
  return clusterCenters.map(f => {
    const [lng, lat] = f.geometry.coordinates;
    const { properties } = f;
    const color = getClusterColor(properties.cluster_id);
    const radius = Math.min(Math.sqrt(properties.accident_count) * 30, 200);

    return (
      <Circle
        key={`cluster-${properties.cluster_id}`}
        center={[lat, lng]}
        radius={radius}
        pathOptions={{ fillColor: color, fillOpacity: 0.15, color, weight: 2, opacity: 0.6 }}
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
  });
}

// Accident markers
function AccidentMarkers({ accidentPoints, showMarkers }) {
  if (!showMarkers || !accidentPoints) return null;
  return accidentPoints.map((f, idx) => {
    const [lng, lat] = f.geometry.coordinates;
    const { properties } = f;
    const clusterColor = getClusterColor(properties.cluster);
    const isNoise = properties.cluster === -1;

    return (
      <CircleMarker
        key={`accident-${idx}`}
        center={[lat, lng]}
        radius={isNoise ? 3 : 4}
        pathOptions={{ fillColor: clusterColor, fillOpacity: isNoise ? 0.4 : 0.7, color: clusterColor, weight: 1, opacity: isNoise ? 0.6 : 0.9 }}
      >
        <Tooltip direction="top" offset={[0, -5]} opacity={1}>
          <div className="mapview-tooltip">
            <div><b>Cluster:</b> {isNoise ? "Noise" : `#${properties.cluster}`}</div>
            <div><b>Type:</b> {properties.offensetype || "N/A"}</div>
            <div><b>Severity:</b> {properties.severity || "N/A"}</div>
            {properties.barangay && <div><b>Area:</b> {properties.barangay}</div>}
            {properties.year && <div><b>Year:</b> {properties.year}</div>}
          </div>
        </Tooltip>
      </CircleMarker>
    );
  });
}


// Corrected Legend Control
function LegendControl({ clusterCenters }) {
  const map = useMap();
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isClustersCollapsed, setIsClustersCollapsed] = useState(true);

  // Sort clusters by accident count in descending order
  const sortedClusters = useMemo(() => {
    if (!clusterCenters) return [];
    return [...clusterCenters].sort((a, b) => b.properties.accident_count - a.properties.accident_count);
  }, [clusterCenters]);

  useEffect(() => {
    if (!map) return;
    
    // A simple, reliable way to ensure only one control is added.
    const legendId = 'custom-legend-control';
    const existingLegend = document.getElementById(legendId);
    if (existingLegend) {
      existingLegend.remove();
    }
    
    const legend = L.control({ position: "bottomright" });

    legend.onAdd = function () {
      const container = L.DomUtil.create("div", "legend-container leaflet-control-layers leaflet-control");
      container.id = legendId;

      const button = L.DomUtil.create("div", "legend-button leaflet-bar", container);
      button.innerHTML = "LEGEND";
      
      const panel = L.DomUtil.create("div", "legend-panel", container);
      
      const updateLegendContent = () => {
panel.innerHTML = `
          <div class="legend-title">Heatmap Intensity</div>
          <div class="legend-gradient-container">
            <div class="legend-gradient-bar"></div>
            <div class="legend-gradient-labels">
              <span>Low ------------------> </span>
              <span>High</span>
            </div>
          </div>
          <div class="legend-separator"></div>
          <div class="legend-title">Accident Points</div>
          <div class="legend-item">
            <span class="legend-color legend-noise"></span> Noise / Unclustered
          </div>
          <div class="legend-item">
            <span class="legend-color legend-clustered-point"></span> Clustered Point
          </div>
          <div class="legend-note">Points are colored </br>by their cluster assignment</div>
          <div class="legend-separator"></div>
          <div class="legend-title">
            Clusters
            <span class="collapse-toggle">${isClustersCollapsed ? "Show All" : "Hide"}</span>
          </div>
        `;

        const clusterListContainer = L.DomUtil.create("div", "cluster-list-container", panel);
        const clustersToShow = isClustersCollapsed ? sortedClusters.slice(0, 5) : sortedClusters;
        
        clustersToShow.forEach(cluster => {
          const item = L.DomUtil.create("div", "legend-item legend-cluster-item", clusterListContainer);
          const color = getClusterColor(cluster.properties.cluster_id);
          const [lng, lat] = cluster.geometry.coordinates;

          item.innerHTML = `
            <span class="legend-color" style="background:${color};"></span>
            Cluster #${cluster.properties.cluster_id} (${cluster.properties.accident_count} acc.)
          `;
          item.dataset.lat = lat;
          item.dataset.lng = lng;

          item.onclick = (e) => {
            const itemLat = parseFloat(e.currentTarget.dataset.lat);
            const itemLng = parseFloat(e.currentTarget.dataset.lng);
            map.flyTo([itemLat, itemLng], 16);
            if (isClustersCollapsed) {
              setIsClustersCollapsed(false);
            }
          };
        });
        
        if (sortedClusters.length > 5) {
          const toggleElement = panel.querySelector(".collapse-toggle");
          if (toggleElement) {
            toggleElement.onclick = () => setIsClustersCollapsed(v => !v);
          }
        }
        
        panel.style.display = isPanelVisible ? "block" : "none";
      };

      updateLegendContent();

      button.onclick = () => {
        setIsPanelVisible(v => !v);
      };

      L.DomEvent.disableScrollPropagation(container);
      L.DomEvent.disableClickPropagation(container);
      
      return container;
    };

    legend.addTo(map);

    return () => {
      if (map.hasLayer && map.hasLayer(legend)) {
        map.removeControl(legend);
      }
    };
  }, [map, isPanelVisible, isClustersCollapsed, sortedClusters]);

  return null;
}

// Fixed Fullscreen Control
function SafeFullscreenControl() {
  const map = useMap();

  useEffect(() => {
    // Wait for map to be fully initialized
    const timer = setTimeout(() => {
      if (!map || !L.control.fullscreen) return;

      try {
        const control = L.control.fullscreen({
          position: "topright",
          title: {
            'false': 'View Fullscreen',
            'true': 'Exit Fullscreen'
          },
          titleCancel: 'Exit Fullscreen',
          forceSeparateButton: true,
          pseudoFullscreen: false,
        });

        control.addTo(map);
        
        // Manually set the title attribute after adding to map
        setTimeout(() => {
          const button = document.querySelector('.leaflet-control-fullscreen-button');
          if (button) {
            button.setAttribute('title', 'View Fullscreen');
            button.setAttribute('aria-label', 'View Fullscreen');
          }
        }, 50);

        const handleFsChange = () => {
          try {
            // Safe check for fullscreen state
            const isFs = map && typeof map.isFullscreen === 'function' ? map.isFullscreen() : false;
            document.body.classList.toggle("fullscreen-active", isFs);
            
            // Update button title based on fullscreen state
            const button = document.querySelector('.leaflet-control-fullscreen-button');
            if (button) {
              button.setAttribute('title', isFs ? 'Exit Fullscreen' : 'View Fullscreen');
              button.setAttribute('aria-label', isFs ? 'Exit Fullscreen' : 'View Fullscreen');
            }
          } catch (error) {
            console.warn('Fullscreen state check failed:', error);
            // Fallback: check document fullscreen state
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
            document.body.classList.toggle("fullscreen-active", isFs);
            
            // Update button title based on fullscreen state
            const button = document.querySelector('.leaflet-control-fullscreen-button');
            if (button) {
              button.setAttribute('title', isFs ? 'Exit Fullscreen' : 'View Fullscreen');
              button.setAttribute('aria-label', isFs ? 'Exit Fullscreen' : 'View Fullscreen');
            }
          }
        };

        // Add event listeners with error handling
        map.on("fullscreenchange", handleFsChange);
        
        // Also listen to document fullscreen events as fallback
        const documentEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        documentEvents.forEach(event => {
          document.addEventListener(event, handleFsChange);
        });

        return () => {
          try {
            map.off("fullscreenchange", handleFsChange);
            documentEvents.forEach(event => {
              document.removeEventListener(event, handleFsChange);
            });
            if (map.hasLayer && map.hasLayer(control)) {
              map.removeControl(control);
            }
          } catch (error) {
            console.warn('Error cleaning up fullscreen control:', error);
          }
        };
      } catch (error) {
        console.warn('Error initializing fullscreen control:', error);
      }
    }, 100); // Small delay to ensure map is ready

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

// Main component
export default function MapView() {
  const [accidentData, setAccidentData] = useState(null);
  const [showClusters, setShowClusters] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedOffenseType, setSelectedOffenseType] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  // Extract unique years, locations, offense types, and severities
  const { availableYears, availableLocations, availableOffenseTypes, availableSeverities } = useMemo(() => {
    if (!accidentData) return { availableYears: [], availableLocations: [], availableOffenseTypes: [], availableSeverities: [] };

    const accidents = accidentData.features.filter(f =>
      f.properties && f.geometry && f.geometry.coordinates
    );

    const getUniqueAndCleanValues = (data, property) => {
      const values = data
        .map(f => f.properties[property])
        .filter(value => value !== null && value !== undefined && String(value).trim() !== '');
      
      return [...new Set(values)].sort();
    };

    const years = getUniqueAndCleanValues(accidents, 'year');
    const locations = getUniqueAndCleanValues(accidents, 'barangay');
    const offenseTypes = getUniqueAndCleanValues(accidents, 'offensetype');
    const severities = getUniqueAndCleanValues(accidents, 'severity');

    return { availableYears: years, availableLocations: locations, availableOffenseTypes: offenseTypes, availableSeverities: severities };
  }, [accidentData]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    if (!accidentData) return { accidentPoints: [], clusterCenters: [], stats: null };

    let accidents = accidentData.features.filter(f =>
      f.properties && f.geometry && f.geometry.coordinates &&
      f.properties.type !== "cluster_center"
    );
    let clusters = accidentData.features.filter(f =>
      f.properties && f.properties.type === "cluster_center"
    );

    // Apply filters
    accidents = accidents.filter(f => {
      const { year, barangay, offensetype, severity } = f.properties;
      const yearMatch = selectedYear === "all" || String(year).trim() === selectedYear;
      const locationMatch = selectedLocation === "all" || String(barangay).trim() === selectedLocation;
      const offenseMatch = selectedOffenseType === "all" || String(offensetype).trim() === selectedOffenseType;
      const severityMatch = selectedSeverity === "all" || String(severity).trim() === selectedSeverity;

      return yearMatch && locationMatch && offenseMatch && severityMatch;
    });

    // Filter clusters to only show those that contain at least one of the currently filtered accidents
    const visibleClusterIds = new Set(accidents.map(a => a.properties.cluster));
    const filteredClusters = clusters.filter(c => visibleClusterIds.has(c.properties.cluster_id));
    
    // Update cluster count based on filtered clusters
    const updatedClusters = filteredClusters.map(c => {
      const accidentCount = accidents.filter(a => a.properties.cluster === c.properties.cluster_id).length;
      return {
        ...c,
        properties: {
          ...c.properties,
          accident_count: accidentCount,
        }
      };
    });

    return {
      accidentPoints: accidents,
      clusterCenters: updatedClusters,
      stats: {
        totalAccidents: accidents.length,
        totalClusters: updatedClusters.length,
        noisePoints: accidents.filter(f => f.properties.cluster === -1).length
      },
    };
  }, [accidentData, selectedYear, selectedLocation, selectedOffenseType, selectedSeverity]);

 useEffect(() => {
  async function fetchData() {
    setLoading(true);
    try {
      let res = await fetch("http://localhost:5000/data/accidents_clustered.geojson");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      console.log("Fetched GeoJSON:", data.features?.length, "points");
      setAccidentData(data);
    } catch (err) {
      console.error("Failed to load GeoJSON data:", err);
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, []);

  const handleToggle = useCallback((setter) => (e) => setter(e.target.checked), []);

  if (loading) return (
    <div className="scroll-wrapper">
      <div className="mapview-container">
        <div className="page-header">
          <h6 className="page-title">Loading Clustered Data...</h6>
          <DateTime />
        </div>
      </div>
    </div>
  );

  return (
    <div className="scroll-wrapper">
      <div className="mapview-container">
        <div className="page-header">
          <div className="page-title-container">
            <img src="stopLight.svg" alt="Logo" className="page-logo" />
            <h1 className="page-title">Accident Heatmap</h1>
          

          {/* Info button */}
          <button type="button" className="viewmap-info-btn" aria-label="Dashboard Info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" />
              <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontFamily="Poppins, sans-serif">i</text>
            </svg>
          </button>

          <div className="viewmap-edit-instructions" role="status">
            <strong>💡 How Accident Heatmap Work</strong>
            <div>• <b>Heatmap</b>: Shows accident density with a color gradient from blue (low) to red (high intensity).</div>
            <div>• <b>Clusters</b>: Colored circles group nearby accidents. Larger circles indicate more incidents.</div>
            <div>• <b>Points</b>: Individual accident markers colored by their cluster assignment. Gray points are unclustered.</div>
            <div>• Toggle <b>Heatmap</b>, <b>Clusters</b>, or <b>Points</b> using the checkboxes above the map.</div>
            <div>• Use the filters to narrow results by <b>year</b>, <b>location</b>, <b>offense type</b>, or <b>severity</b>.</div>
            <div>• Hover over clusters or points for detailed information (tooltips not available in heatmap mode).</div>
            <div>• Click the <b>Legend</b> button (bottom-right) to view color meanings and click clusters to zoom.</div>
            <div>• Use the fullscreen button (top-right) for an expanded map view.</div>
          </div>
        </div>
          <DateTime />
        </div>

        {/* All filters and controls on one line */}
        <div className="control-filter-bar">
          <div className="filter-group">
            <label htmlFor="year-select" className="filter-label">Year:</label>
            <select
              id="year-select"
              className="filter-dropdown"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="location-select" className="filter-label">Location:</label>
            <select
              id="location-select"
              className="filter-dropdown"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="all">All Locations</option>
              {availableLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="offense-select" className="filter-label">Offense:</label>
            <select
              id="offense-select"
              className="filter-dropdown"
              value={selectedOffenseType}
              onChange={(e) => setSelectedOffenseType(e.target.value)}
            >
              <option value="all">All Offenses</option>
              {availableOffenseTypes.map(offense => (
                <option key={offense} value={offense}>{offense}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="severity-select" className="filter-label">Severity:</label>
            <select
              id="severity-select"
              className="filter-dropdown"
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
            >
              <option value="all">All Severities</option>
              {availableSeverities.map(severity => (
                <option key={severity} value={severity}>{severity}</option>
              ))}
            </select>
          </div>
        </div>

          <div className="controls-panel">
          <label>
            <input type="checkbox" checked={showHeatmap} onChange={handleToggle(setShowHeatmap)} /> Heatmap
          </label>
          <label>
            <input type="checkbox" checked={showClusters} onChange={handleToggle(setShowClusters)} /> Clusters
          </label>
          <label>
            <input type="checkbox" checked={showMarkers} onChange={handleToggle(setShowMarkers)} /> Points
          </label>
          {filteredData.stats && (
            <div className="stats">
              {filteredData.stats.totalAccidents} accidents • {filteredData.stats.totalClusters} clusters • {filteredData.stats.noisePoints} noise
            </div>
          )}
        </div>

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
              maxBounds={sanFernandoBounds}
              maxBoundsViscosity={1.0}
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Light">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="© CartoDB" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Streets">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Dark">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="© CartoDB" />
                </LayersControl.BaseLayer>
              </LayersControl>

              <SafeFullscreenControl />
              
              <LegendControl clusterCenters={filteredData.clusterCenters} />
              
              <ClusteredHeatmapLayer filteredData={filteredData} showHeatmap={showHeatmap} />
              <ClusterCenters clusterCenters={filteredData.clusterCenters} showClusters={showClusters} />
              <AccidentMarkers accidentPoints={filteredData.accidentPoints} showMarkers={showMarkers} />
              
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}