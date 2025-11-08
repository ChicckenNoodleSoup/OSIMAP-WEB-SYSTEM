import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
import "./Spinner.css";
import "./PageHeader.css";
import { DateTime } from "./DateTime";
import L from "leaflet";
import { useLocation } from "react-router-dom";
import FullscreenFilters from './FullscreenFilters';
import MultiSelectDropdown from './MultiSelectDropdown';
import SingleSelectDropdown from './SingleSelectDropdown';

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

// Legend Control
function LegendControl({ clusterCenters }) {
  const map = useMap();
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isClustersCollapsed, setIsClustersCollapsed] = useState(true);

  const sortedClusters = useMemo(() => {
    if (!clusterCenters) return [];
    return [...clusterCenters].sort((a, b) => b.properties.accident_count - a.properties.accident_count);
  }, [clusterCenters]);

  useEffect(() => {
    if (!map) return;
    
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
              <span style="margin-right: 140px;">Low</span>
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
          <div class="legend-note">Points are colored by their </br>cluster assignment</div>
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

// Fullscreen Control
function SafeFullscreenControl() {
  const map = useMap();

  useEffect(() => {
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
        
        setTimeout(() => {
          const button = document.querySelector('.leaflet-control-fullscreen-button');
          if (button) {
            button.setAttribute('title', 'View Fullscreen');
            button.setAttribute('aria-label', 'View Fullscreen');
          }
        }, 50);

        const handleFsChange = () => {
          try {
            const isFs = map && typeof map.isFullscreen === 'function' ? map.isFullscreen() : false;
            document.body.classList.toggle("fullscreen-active", isFs);
            
            const button = document.querySelector('.leaflet-control-fullscreen-button');
            if (button) {
              button.setAttribute('title', isFs ? 'Exit Fullscreen' : 'View Fullscreen');
              button.setAttribute('aria-label', isFs ? 'Exit Fullscreen' : 'View Fullscreen');
            }
          } catch (error) {
            console.warn('Fullscreen state check failed:', error);
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
            document.body.classList.toggle("fullscreen-active", isFs);
            
            const button = document.querySelector('.leaflet-control-fullscreen-button');
            if (button) {
              button.setAttribute('title', isFs ? 'Exit Fullscreen' : 'View Fullscreen');
              button.setAttribute('aria-label', isFs ? 'Exit Fullscreen' : 'View Fullscreen');
            }
          }
        };

        map.on("fullscreenchange", handleFsChange);
        
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
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

// Search Zoom Control
const SearchZoomControl = ({ searchTerm, searchResults, onRecordSelect }) => {
  const map = useMap();
  
  useEffect(() => {
    if (searchResults.length === 1 && searchTerm.length > 2) {
      const result = searchResults[0];
      if (result.lat && result.lng) {
        map.flyTo([result.lat, result.lng], 16, {
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    }
  }, [map, searchResults, searchTerm]);

  return null;
};

// Barangay coordinates
const barangayCoordinates = {
  'alasas': [15.0122, 120.6966],
  'baliti': [15.1050, 120.6239],
  'bulaon': [15.0706, 120.6917],
  'calulut': [15.0667, 120.7000],
  'del carmen': [15.0250, 120.6708],
  'del pilar': [15.0337, 120.6911],
  'del rosario': [15.0075, 120.6822],
  'dela paz norte': [15.0500, 120.6833],
  'dela paz sur': [15.0444, 120.6875],
  'dolores': [15.0192, 120.6625],
  'juliana': [15.0328, 120.6822],
  'lara': [15.0094, 120.6700],
  'lourdes': [15.0244, 120.6556],
  'magliman': [15.0461, 120.6733],
  'maimpis': [15.0494, 120.6683],
  'malino': [15.1221, 120.6310],
  'malpitic': [15.0383, 120.6953],
  'pandaras': [15.0583, 120.6967],
  'panipuan': [15.1161, 120.6675],
  'pulung bulu': [15.0322, 120.6865],
  'quebiawan': [15.0394, 120.6935],
  'saguin': [15.0372, 120.6793],
  'san agustin': [15.0314, 120.6793],
  'san felipe': [15.0094, 120.6916],
  'san isidro': [15.0258, 120.6751],
  'san jose': [15.0350, 120.6872],
  'san juan': [15.0172, 120.6811],
  'san nicolas': [15.0497, 120.6915],
  'san pedro': [15.0190, 120.6990],
  'sta. lucia': [15.0431, 120.6886],
  'sta. teresita': [15.0625, 120.7056],
  'sto. niño': [15.0363, 120.6797],
  'sto. rosario': [15.0334, 120.6871],
  'sindalan': [15.1014, 120.6581],
  'telabastagan': [15.0608, 120.6860]
};

export default function MapView() {
  const location = useLocation();
  const fromRecords = location.state?.fromRecords;
  const recordLat = location.state?.lat;
  const recordLng = location.state?.lng;
  const [hasFlown, setHasFlown] = useState(false);
  const recordDetails = location.state?.recordDetails;

  const [accidentData, setAccidentData] = useState(null);
  const [baseData, setBaseData] = useState(null); // For filter options
  const [showClusters, setShowClusters] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [displayMode, setDisplayMode] = useState('points');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (fromRecords && recordLat && recordLng && recordDetails) {
      setSelectedRecord(recordDetails);
    }
  }, [fromRecords, recordLat, recordLng, recordDetails]);

  useEffect(() => {
    if (fromRecords) {
      setShowHeatmap(false);
      setShowMarkers(true);
    }
  }, [fromRecords]);

  // CHANGED: Filter states - selectedYears is now an array
  const [selectedYears, setSelectedYears] = useState([]); // Empty array means "all"
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedOffenseType, setSelectedOffenseType] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  
  // Applied filters (what's actually been clustered)
  const [appliedFilters, setAppliedFilters] = useState({
    years: [],
    location: "all",
    offenseType: "all",
    severity: "all"
  });
  
  // Check if filters have changed but not applied
  const filtersChanged = 
    JSON.stringify(selectedYears) !== JSON.stringify(appliedFilters.years) ||
    selectedLocation !== appliedFilters.location ||
    selectedOffenseType !== appliedFilters.offenseType ||
    selectedSeverity !== appliedFilters.severity;

  // Load base data once for filter options (not clustered, just raw data)
  useEffect(() => {
    async function fetchBaseData() {
      try {
        const res = await fetch("http://localhost:5000/data/accidents.geojson");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log("Fetched base data for filters:", data.features?.length, "points");
        setBaseData(data);
      } catch (err) {
        console.error("Failed to load base data:", err);
      }
    }
    fetchBaseData();
  }, []);

  // Extract unique years, locations, offense types, and severities from BASE data
  const { availableYears, availableLocations, availableOffenseTypes, availableSeverities } = useMemo(() => {
    if (!baseData) return { availableYears: [], availableLocations: [], availableOffenseTypes: [], availableSeverities: [] };

    const accidents = baseData.features.filter(f =>
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
  }, [baseData]);

  // Process the already-filtered and clustered data from backend
  const filteredData = useMemo(() => {
    if (!accidentData || !accidentData.features) return { accidentPoints: [], clusterCenters: [], stats: null };

    // Separate accident points and cluster centers
    const accidents = accidentData.features.filter(f =>
      f.properties && f.geometry && f.geometry.coordinates &&
      f.properties.type !== "cluster_center"
    );
    
    const clusters = accidentData.features.filter(f =>
      f.properties && f.properties.type === "cluster_center"
    );

    return {
      accidentPoints: accidents,
      clusterCenters: clusters,
      stats: {
        totalAccidents: accidents.length,
        totalClusters: clusters.length,
        noisePoints: accidents.filter(f => f.properties.cluster === -1).length
      },
    };
  }, [accidentData]);

  // Fetch clustered data based on APPLIED filters (not on every filter change)
  useEffect(() => {
    async function fetchClusteredData() {
      setLoading(true);
      try {
        // Check if ANY filters are applied
        const hasFilters = 
          appliedFilters.years.length > 0 ||
          appliedFilters.location !== "all" ||
          appliedFilters.offenseType !== "all" ||
          appliedFilters.severity !== "all";
        
        if (!hasFilters) {
          // No filters - use pre-computed clustered data
          console.log("✅ No filters applied - loading pre-computed clusters");
          const res = await fetch("http://localhost:5000/data/accidents_clustered.geojson");
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          console.log("✅ Loaded pre-computed clusters:", data.features?.length, "features");
          
          // Count accident points vs cluster centers
          const accidents = data.features.filter(f => f.properties?.type !== "cluster_center");
          const clusters = data.features.filter(f => f.properties?.type === "cluster_center");
          console.log(`   → ${accidents.length} accident points, ${clusters.length} cluster centers`);
          
          setAccidentData(data);
        } else {
          // Filters applied - use dynamic clustering API
          const filters = {
            years: appliedFilters.years.length > 0 ? appliedFilters.years : [],
            location: appliedFilters.location !== "all" ? appliedFilters.location : undefined,
            offenseType: appliedFilters.offenseType !== "all" ? appliedFilters.offenseType : undefined,
            severity: appliedFilters.severity !== "all" ? appliedFilters.severity : undefined
          };
          
          console.log("🔄 Fetching dynamically clustered data with filters:", filters);
          
          const res = await fetch("http://localhost:5000/api/cluster", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(filters)
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            console.error("❌ API error:", errorData);
            throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
          }
          
          const data = await res.json();
          console.log("✅ Fetched dynamically clustered data:", data.features?.length, "features");
          
          // Count accident points vs cluster centers
          const accidents = data.features.filter(f => f.properties?.type !== "cluster_center");
          const clusters = data.features.filter(f => f.properties?.type === "cluster_center");
          console.log(`   → ${accidents.length} accident points, ${clusters.length} cluster centers`);
          
          setAccidentData(data);
        }
      } catch (err) {
        console.error("Failed to load clustered data:", err);
        // Fallback to empty data on error
        setAccidentData({ type: "FeatureCollection", features: [] });
      } finally {
        setLoading(false);
      }
    }
    
    fetchClusteredData();
  }, [appliedFilters]); // Only trigger when appliedFilters changes

  const handleToggle = useCallback((setter) => (e) => setter(e.target.checked), []);

  // NEW: Handler for year multi-select
  const handleYearChange = useCallback((values) => {
    setSelectedYears(values);
  }, []);

  // Handler for applying filters
  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({
      years: selectedYears,
      location: selectedLocation,
      offenseType: selectedOffenseType,
      severity: selectedSeverity
    });
  }, [selectedYears, selectedLocation, selectedOffenseType, selectedSeverity]);

  // Search functionality
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    
    if (term.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const barangayName = term.toLowerCase().trim();
    if (barangayCoordinates[barangayName]) {
      setSearchResults([{
        id: `barangay-${barangayName}`,
        type: 'barangay',
        name: barangayName.charAt(0).toUpperCase() + barangayName.slice(1),
        lat: barangayCoordinates[barangayName][0],
        lng: barangayCoordinates[barangayName][1]
      }]);
      setShowSearchDropdown(true);
      return;
    }

    const results = filteredData.accidentPoints
      .filter(point => {
        const searchLower = term.toLowerCase();
        return (
          point.location?.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, 8)
      .map(point => ({
        ...point,
        type: 'record'
      }));

    setSearchResults(results);
    setShowSearchDropdown(results.length > 0);
  }, [filteredData.accidentPoints]);

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    handleSearch(value);
  };

  const handleSearchResultSelect = (result) => {
    if (result.type === 'barangay' || result.type === 'record') {
      setSelectedRecord(result.type === 'record' ? result : null);
    }
    setShowSearchDropdown(false);
    setSearchTerm(result.name || result.location || '');
  };

  const handleSearchKeyDown = (e) => {
    if (!showSearchDropdown || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSearchIndex >= 0) {
        handleSearchResultSelect(searchResults[selectedSearchIndex]);
      } else if (searchResults.length === 1) {
        handleSearchResultSelect(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
      setSelectedSearchIndex(-1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
        setSelectedSearchIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return (
    <div className="scroll-wrapper">
      <div className="mapview-container">
        <div className="loading-spinner-container">
          <svg 
            className="loading-spinner" 
            viewBox="-13 -13 45 45" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle className="box5631" cx="13" cy="1" r="5"/>
            <circle className="box5631" cx="25" cy="1" r="5"/>
            <circle className="box5631" cx="1" cy="13" r="5"/>
            <circle className="box5631" cx="13" cy="13" r="5"/>
            <circle className="box5631" cx="25" cy="13" r="5"/>
            <circle className="box5631" cx="1" cy="25" r="5"/>
            <circle className="box5631" cx="13" cy="25" r="5"/>
            <circle className="box5631" cx="25" cy="25" r="5"/>
            <circle className="box5631" cx="1" cy="1" r="5"/>
          </svg>
          <p className="loading-text">Loading Clustered Data...</p>
        </div>
      </div>
    </div>
  );

  function FlyToQueryLocation() {
    const map = useMap();
  
    useEffect(() => {
      if (!hasFlown && recordLat && recordLng && map) {
        map.flyTo([recordLat, recordLng], 17, { duration: 1.5 });
        setHasFlown(true);
      }
    }, [map]);
  
    return null;
  }
  
  function RecordPopup({ record }) {
    const map = useMap();
  
    useEffect(() => {
      if (!record || !map) return;
  
      const popup = L.popup({ autoClose: false, closeOnClick: true })
        .setLatLng([record.lat, record.lng])
        .setContent(`
          <div>
            <b>Barangay:</b> ${record.barangay}<br/>
            <b>Date:</b> ${record.datecommitted}<br/>
            <b>Time:</b> ${record.timecommitted}<br/>
            <b>Offense:</b> ${record.offensetype}<br/>
            <b>Severity:</b> ${record.severity}
          </div>
        `)
        .openOn(map);
  
      return () => map.closePopup(popup);
    }, [map, record]);
  
    return null;
  }

  return (
    <div className="scroll-wrapper">
      <div className="mapview-container">
        <div className="page-header">
          <div className="page-title-container">
            <img src="stopLight.svg" alt="Logo" className="page-logo" />
            <h1 className="page-title">Accident Heatmap</h1>

            <button type="button" className="viewmap-info-btn" aria-label="Dashboard Info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" />
                <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontFamily="Poppins, sans-serif">i</text>
              </svg>
            </button>

            <div className="viewmap-edit-instructions" role="status">
              <strong>💡 How Accident Heatmap Work</strong>
              <div>• <b>Heatmap</b>: Shows accident density with a color gradient from blue (low) to red (high intensity).</div>
              <div>• <b>Clusters</b>: Colored circles group nearby accidents.</div>
              <div>• <b>Points</b>: Individual accident markers colored by their cluster assignment. Gray points are unclustered.</div>
              <div>• Toggle <b>Heatmap</b>, <b>Clusters</b>, or <b>Points</b> using the checkboxes above the map.</div>
              <div>• Use the filters to narrow results by <b>year</b>, <b>location</b>, <b>offense type</b>, or <b>severity</b>.</div>
              <div>• Hover over clusters or points for detailed information (not available in heatmap mode).</div>
              <div>• Click the <b>Legend</b> button (bottom-right) to view color meanings and click clusters to zoom.</div>
              <div>• Use the fullscreen button (top-right) for an expanded map view.</div>
            </div>
          </div>

          <DateTime />
        </div>

        {/* FILTER DROPDOWNS */}
        <div className="control-filter-bar">
          <div className="filter-group">
            <label htmlFor="year-select" className="filter-label">Year:</label>
            <MultiSelectDropdown
              options={availableYears}
              selectedValues={selectedYears}
              onChange={handleYearChange}
              placeholder="Select Years"
              allLabel="All Years"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="location-select" className="filter-label">Location:</label>
            <SingleSelectDropdown
              options={availableLocations}
              selectedValue={selectedLocation}
              onChange={setSelectedLocation}
              allLabel="All Locations"
              allValue="all"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="offense-select" className="filter-label">Offense:</label>
            <SingleSelectDropdown
              options={availableOffenseTypes}
              selectedValue={selectedOffenseType}
              onChange={setSelectedOffenseType}
              allLabel="All Offenses"
              allValue="all"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="severity-select" className="filter-label">Severity:</label>
            <SingleSelectDropdown
              options={availableSeverities}
              selectedValue={selectedSeverity}
              onChange={setSelectedSeverity}
              allLabel="All Severities"
              allValue="all"
            />
          </div>

          <div className="filter-group">
            <button 
              className={`apply-filters-btn ${filtersChanged ? 'filters-changed' : ''}`}
              onClick={handleApplyFilters}
              disabled={loading}
            >
              {loading ? 'Clustering...' : filtersChanged ? 'Apply Filters ⚡' : 'Filters Applied ✓'}
            </button>
          </div>
        </div>

        <div className="controls-panel">
          <div className="controls-checkboxes">
            <label>
              <input type="checkbox" checked={showHeatmap} onChange={handleToggle(setShowHeatmap)} /> Heatmap
            </label>
            <label>
              <input type="checkbox" checked={showClusters} onChange={handleToggle(setShowClusters)} /> Clusters
            </label>
            <label>
              <input type="checkbox" checked={showMarkers} onChange={handleToggle(setShowMarkers)} /> Points
            </label>
          </div>
          
          {filteredData.stats && (
            <div className="stats-display">
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

              <SearchZoomControl 
                searchTerm={searchTerm}
                searchResults={searchResults}
                onRecordSelect={setSelectedRecord}
              />

              <img src="/osimap-logo.svg" alt="OSIMAP Logo" className="osimap-logo" />
              
              <FullscreenFilters
                yearFilter={selectedYears}
                locationFilter={selectedLocation}
                offenseFilter={selectedOffenseType}
                severityFilter={selectedSeverity}
                displayMode={displayMode}
                onYearChange={handleYearChange}
                onLocationChange={setSelectedLocation}
                onOffenseChange={setSelectedOffenseType}
                onSeverityChange={setSelectedSeverity}
                onDisplayModeChange={setDisplayMode}
                availableYears={availableYears}
                availableLocations={availableLocations}
                availableOffenseTypes={availableOffenseTypes}
                availableSeverities={availableSeverities}
                showHeatmap={showHeatmap}
                showClusters={showClusters}
                showMarkers={showMarkers}
                onToggleHeatmap={(checked) => setShowHeatmap(checked)}
                onToggleClusters={(checked) => setShowClusters(checked)}
                onToggleMarkers={(checked) => setShowMarkers(checked)}
                stats={filteredData.stats}
                // search props
                searchTerm={searchTerm}
                searchResults={searchResults}
                showSearchDropdown={showSearchDropdown}
                selectedSearchIndex={selectedSearchIndex}
                searchInputRef={searchInputRef}
                onSearchChange={handleSearchInputChange}
                onSearchKeyDown={handleSearchKeyDown}
                onSearchFocus={() => {
                  if (searchResults.length > 0) setShowSearchDropdown(true);
                }}
                onSearchResultSelect={handleSearchResultSelect}
              />
              
              {selectedRecord && <RecordPopup record={selectedRecord} />}
              <SafeFullscreenControl />
              <LegendControl clusterCenters={filteredData.clusterCenters} />
              <FlyToQueryLocation fromRecords={fromRecords} />
              
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
                <LayersControl.BaseLayer name="Satellite">
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="© Esri"
                  />
                </LayersControl.BaseLayer>
              </LayersControl>
              
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