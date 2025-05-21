import geopandas as gpd
import json

# Load the original accidents.geojson file
gdf = gpd.read_file("accidents.geojson")

# Ensure CRS is WGS84 (lat/lng)
gdf = gdf.to_crs(epsg=4326)

# Prepare features with severity or default intensity 1
features = []
for _, row in gdf.iterrows():
    lon, lat = row.geometry.x, row.geometry.y
    severity = row.get("severity", 1) or 1
    features.append({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        },
        "properties": {
            "severity": severity
        }
    })

heatmap_geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Save to public folder
with open("accidents_for_heatmap.geojson", "w") as f:
    json.dump(heatmap_geojson, f)

print("✅ GeoJSON with all accident points saved as accidents_for_heatmap.geojson")
