import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# --------------------------
# Load environment variables
# --------------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --------------------------
# Helper Functions
# --------------------------

def upload_accident_points(file_path: str):
    """Upload GeoJSON accident points to 'Clustered_Data_For_Mobile'."""
    if not os.path.exists(file_path):
        print(f" Accident file not found: {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        geojson_data = json.load(f)

    features = geojson_data.get("features", [])
    if not features:
        print(" No accident features found in GeoJSON.")
        return

    rows = []
    for feature in features:
        props = feature.get("properties", {})
        # Skip cluster centers
        if props.get("type") != "accident_point":
            continue

        coords = feature.get("geometry", {}).get("coordinates", [0, 0])
        lon, lat = coords

        row = {
            "id": props.get("id"),
            "cluster": props.get("cluster"),
            "lat": lat,
            "lng": lon,
            "barangay": props.get("barangay"),
            "offensetype": props.get("offensetype"),
            "severity": props.get("severity"),
            "year": props.get("year"),
            "datetime_str": props.get("datetime_str"),
            "date": props.get("date"),
            "temporal_weight": props.get("temporal_weight"),
            "trend_score": props.get("trend_score"),
            "type": props.get("type"),
        }
        rows.append(row)

    if rows:
        try:
            supabase.table("Clustered_Data_For_Mobile").upsert(rows).execute()
            print(f" Uploaded {len(rows)} accident points to Supabase.")
        except Exception as e:
            print(f" Accident upload failed: {e}")
    else:
        print(" No valid accident rows to upload.")


def upload_cluster_centers(file_path: str):
    """Upload cluster centers to 'Cluster_Centers'."""
    if not os.path.exists(file_path):
        print(f" Cluster centers file not found: {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        clusters = json.load(f)

    if not clusters:
        print(" No cluster centers found in JSON.")
        return

    rows = []
    for c in clusters:
        row = {
            "cluster_id": c.get("cluster_id"),
            "center_lat": c.get("center_lat"),
            "center_lon": c.get("center_lon"),
            "accident_count": c.get("accident_count"),
            "danger_score": c.get("danger_score"),
            "recent_accidents": c.get("recent_accidents"),
            "avg_temporal_weight": c.get("avg_temporal_weight"),
            "avg_trend_score": c.get("avg_trend_score"),
            "barangays": c.get("barangays"),
        }
        rows.append(row)

    if rows:
        try:
            supabase.table("Cluster_Centers").upsert(rows).execute()
            print(f" Uploaded {len(rows)} cluster centers to Supabase.")
        except Exception as e:
            print(f" Cluster centers upload failed: {e}")
    else:
        print(" No valid cluster rows to upload.")


# --------------------------
# Main Execution
# --------------------------
if __name__ == "__main__":
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    accident_file = os.path.join(backend_dir, "data", "accidents_clustered.geojson")
    cluster_file = os.path.join(backend_dir, "data", "cluster_centers.json")

    print(" Starting upload to Supabase...")

    upload_accident_points(accident_file)
    upload_cluster_centers(cluster_file)

    print(" Upload process finished.")
