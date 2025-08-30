import json
import os
import logging
from supabase import create_client, Client

# ==============================
# CONFIGURATION
# ==============================
SUPABASE_URL = 'https://bdysgnfgqcywjrqaqdsj.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeXNnbmZncWN5d2pycWFxZHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAwMzk0OSwiZXhwIjoyMDcxNTc5OTQ5fQ.wERBHIapZAJX1FxZVlTidbgysY0L4Pxc6pVLKer0c4Q'  # replace with your key
TABLE_NAME = 'road_traffic_accident'

# Dynamically set the output path inside the backend/data folder
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "data", "accidents.geojson")

# ==============================
# SETUP LOGGING
# ==============================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==============================
# SUPABASE CLIENT
# ==============================
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==============================
# FUNCTIONS
# ==============================
def fetch_data():
    """Fetch all accident records from Supabase"""
    response = supabase.table(TABLE_NAME).select("*").execute()
    if hasattr(response, "error") and response.error:
        raise Exception(f"Supabase fetch error: {response.error}")
    data = getattr(response, "data", [])
    if not data:
        logger.warning("No data returned from Supabase.")
    return data

def to_geojson(data):
    """Convert Supabase rows to GeoJSON format"""
    features = []
    for row in data:
        try:
            lat = float(row.get("lat", 0))
            lon = float(row.get("lng", 0))
            if lat == 0 or lon == 0:
                continue  # skip invalid coordinates

            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "id": row.get("id"),
                    "datecommitted": row.get("datecommitted"),
                    "barangay": row.get("barangay"),
                    "offensetype": row.get("offensetype"),
                    "severity": row.get("severity")
                }
            })
        except Exception as e:
            logger.warning(f"Skipping row due to error: {e}")

    if not features:
        logger.warning("No valid coordinates found. GeoJSON will be empty.")
    return {"type": "FeatureCollection", "features": features}

def save_geojson(geojson):
    """Save GeoJSON into the existing data folder"""
    folder = os.path.dirname(OUTPUT_PATH)
    os.makedirs(folder, exist_ok=True)  # ensure folder exists
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    logger.info(f"GeoJSON exported to {OUTPUT_PATH}")

# ==============================
# MAIN
# ==============================
if __name__ == "__main__":
    logger.info("Fetching data from Supabase...")
    rows = fetch_data()
    logger.info(f"Fetched {len(rows)} records.")

    geojson = to_geojson(rows)
    logger.info(f"Converted {len(geojson['features'])} records to GeoJSON features.")

    save_geojson(geojson)
    logger.info("Export complete!")
