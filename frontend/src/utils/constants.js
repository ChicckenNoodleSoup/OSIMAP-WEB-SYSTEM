/**
 * OSIMAP Constants
 * Centralized constants for colors, coordinates, and configuration values
 * All colors are selected to be visible on both light and dark backgrounds
 */

// Cluster colors - Selected for visibility on both light and dark backgrounds
// These colors are vibrant with good contrast and are distinguishable from each other
export const CLUSTER_COLORS = [
  "#FF4757", // Bright red (replaces #FF6B6B)
  "#00D2D3", // Bright cyan (replaces #4ECDC4)
  "#3742FA", // Bright blue (replaces #45B7D1)
  "#2ED573", // Bright green (replaces #96CEB4)
  "#FFA502", // Bright orange (replaces #FFEAA7 - better contrast)
  "#5F27CD", // Purple (replaces #DDA0DD)
  "#00D2D3", // Cyan variant (replaces #98D8C8)
  "#FDCB6E", // Yellow (replaces #F7DC6F)
  "#A29BFE", // Light purple (replaces #BB8FCE)
  "#0984E3", // Blue (replaces #85C1E9)
  "#E17055", // Coral (replaces #F8C471)
  "#00B894", // Teal (replaces #82E0AA)
  "#E84393", // Pink (replaces #F1948A)
  "#6C5CE7", // Indigo (replaces second #85C1E9)
];

// Noise cluster color (for unclustered points)
// Light gray that's visible on both dark and light backgrounds
export const NOISE_CLUSTER_COLOR = "#C0C0C0";

/**
 * Get cluster color by ID
 * @param {number} clusterId - Cluster ID (-1 for noise/unclustered)
 * @returns {string} Hex color code
 */
export const getClusterColor = (clusterId) => {
  return clusterId === -1 ? NOISE_CLUSTER_COLOR : CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
};

// Severity colors - Matches design system (from tokens.css)
export const SEVERITY_COLORS = {
  Critical: "#dc2626", // Red
  High: "#ea580c",     // Orange
  Medium: "#eab308",   // Yellow
  Low: "#22c55e",      // Green
  Minor: "#60a5fa"     // Blue
};

// Severity intensity map for heatmap visualization
export const SEVERITY_INTENSITY_MAP = {
  Critical: 1.0,
  High: 0.8,
  Medium: 0.6,
  Low: 0.4,
  Minor: 0.2
};

// San Fernando City bounding box (for map viewport constraints)
export const SAN_FERNANDO_BOUNDS = [
  [14.90, 120.50], // Southwest corner [lat, lng]
  [15.16, 120.80], // Northeast corner [lat, lng]
];

// Barangay coordinates for San Fernando City
// Format: [latitude, longitude]
export const BARANGAY_COORDINATES = {
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

// Default map center (San Fernando City center)
export const MAP_CENTER = [15.0306, 120.6845];

// Default map zoom level
export const MAP_DEFAULT_ZOOM = 14;
export const MAP_MIN_ZOOM = 12;
export const MAP_MAX_ZOOM = 18;

