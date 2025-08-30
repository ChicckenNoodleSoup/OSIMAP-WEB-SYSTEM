import json
from supabase import create_client, Client

# ==============================
# CONFIGURATION
# ==============================
SUPABASE_URL = 'https://bdysgnfgqcywjrqaqdsj.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeXNnbmZncWN5d2pycWFxZHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAwMzk0OSwiZXhwIjoyMDcxNTc5OTQ5fQ.wERBHIapZAJX1FxZVlTidbgysY0L4Pxc6pVLKer0c4Q'  # Use service role key for full access
TABLE_NAME = 'road_traffic_accident'               # Your table name
OUTPUT_PATH = "./backend/data/accidents.geojson"  # Existing data folder

# ==============================
# SUPABASE CONNECTION
# ==============================
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_data():
    """Fetch all accident records from Supabase"""
    response = supabase.table(TABLE_NAME).select("*").execute()
    if not response.data:  # Empty result check
        raise Exception("No data returned from Supabase.")
    return response.data

def to_geojson(data):
    """Convert Supabase rows to GeoJSON format"""
    features = []
    for row in data:
        try:
            lat = float(row.get("latitude", 0))
            lon = float(row.get("longitude", 0))

            if lat == 0 or lon == 0:  # Skip invalid coordinates
                continue

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "id": row.get("id"),
                    "date": row.get("date"),
                    "location": row.get("location"),
                    "description": row.get("description"),
                    "severity": row.get("severity")
                }
            })
        except Exception as e:
            print(f"Skipping row due to error: {e}")

    return {
        "type": "FeatureCollection",
        "features": features
    }

def save_geojson(geojson):
    """Save GeoJSON directly into the existing ./data folder"""
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    print(f"GeoJSON exported to {OUTPUT_PATH}")

if __name__ == "__main__":
    print("Fetching data from Supabase...")
    rows = fetch_data()
    print(f"Fetched {len(rows)} records.")

    geojson = to_geojson(rows)
    save_geojson(geojson)
    print("Export complete!")
