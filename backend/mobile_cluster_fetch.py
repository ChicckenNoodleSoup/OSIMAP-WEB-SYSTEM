import os
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
# Config
# --------------------------
BUCKET_NAME = "geojson"  # make sure this bucket exists in Supabase

def upload_file_to_bucket(local_path: str, bucket_path: str):
    """Upload a file to Supabase Storage bucket."""
    if not os.path.exists(local_path):
        print(f" File not found: {local_path}")
        return

    try:
        with open(local_path, "rb") as f:
            data = f.read()

        # First remove existing file (if any), then upload new one
        try:
            supabase.storage.from_(BUCKET_NAME).remove([bucket_path])
        except Exception:
            pass  # ignore if file doesn't exist yet

        supabase.storage.from_(BUCKET_NAME).upload(bucket_path, data)
        print(f" Uploaded {local_path} to bucket as {bucket_path}")
    except Exception as e:
        print(f" Upload failed for {local_path}: {e}")

# --------------------------
# Main Execution
# --------------------------
if __name__ == "__main__":
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    accident_file = os.path.join(backend_dir, "data", "accidents_clustered.geojson")
    cluster_file = os.path.join(backend_dir, "data", "cluster_centers.json")

    print(" Starting upload to Supabase Storage...")

    upload_file_to_bucket(accident_file, "accidents_clustered.geojson")
    upload_file_to_bucket(cluster_file, "cluster_centers.json")

    print(" Upload process finished.")
