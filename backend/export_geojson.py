import json
import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# ==============================
# CONFIGURATION
# ==============================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
TABLE_NAME = 'road_traffic_accident'

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
def get_output_path():
    """Get the output path for GeoJSON file in the data folder"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_folder = os.path.join(script_dir, "data")
    
    # Create data folder if it doesn't exist
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)
        logger.info(f"Created data folder: {data_folder}")
    
    output_path = os.path.join(data_folder, "accidents.geojson")
    return output_path

def fetch_all_data(batch_size=1000):
    """Fetch all accident records from Supabase with pagination"""
    all_data = []
    start = 0

    logger.info(" Fetching data from Supabase...")
    
    while True:
        response = supabase.table(TABLE_NAME).select("*").range(start, start + batch_size - 1).execute()
        if hasattr(response, "error") and response.error:
            raise Exception(f"Supabase fetch error: {response.error}")
        
        data = response.data if hasattr(response, "data") else []
        if not data:
            break

        all_data.extend(data)
        logger.info(f"Fetched {len(data)} records (total: {len(all_data)})")
        start += batch_size

    logger.info(f" Total records fetched: {len(all_data)}")
    return all_data

def to_geojson(data):
    """Convert Supabase rows to GeoJSON format"""
    features = []
    skipped_count = 0
    
    logger.info(" Converting data to GeoJSON format...")
    
    for row in data:
        try:
            lat = float(row.get("lat", 0))
            lon = float(row.get("lng", 0))
            
            # Skip invalid coordinates
            if lat == 0 or lon == 0:
                skipped_count += 1
                continue

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point", 
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "id": row.get("id"),
                    "datecommitted": row.get("datecommitted"),
                    "timecommitted": row.get("timecommitted"),
                    "barangay": row.get("barangay"),
                    "offensetype": row.get("offensetype"),
                    "severity": row.get("severity"),
                    "year": row.get("year")
                }
            })
        except Exception as e:
            logger.warning(f"Skipping row due to error: {e}")
            skipped_count += 1

    logger.info(f" Converted {len(features)} valid records to GeoJSON")
    if skipped_count > 0:
        logger.warning(f" Skipped {skipped_count} records due to invalid coordinates or errors")

    return {
        "type": "FeatureCollection", 
        "features": features,
        "metadata": {
            "total_features": len(features),
            "generated_at": "2025-08-31",  # You might want to use datetime.now().isoformat()
            "source_table": TABLE_NAME
        }
    }

def save_geojson(geojson, output_path):
    """Save GeoJSON to file"""
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        logger.info(f" GeoJSON saved to: {output_path}")
        
        # Log file size
        file_size = os.path.getsize(output_path)
        file_size_mb = file_size / (1024 * 1024)
        logger.info(f" File size: {file_size_mb:.2f} MB")
        
        return True
    except Exception as e:
        logger.error(f" Error saving GeoJSON: {e}")
        return False

# ==============================
# MAIN FUNCTION (run once, not infinite loop)
# ==============================
def main():
    try:
        logger.info(" Starting Supabase to GeoJSON export...")
        
        # Get output path
        output_path = get_output_path()
        
        # Fetch data from Supabase
        rows = fetch_all_data()
        
        if not rows:
            logger.warning(" No data found in Supabase table")
            return False
        
        # Convert to GeoJSON
        geojson = to_geojson(rows)
        
        # Save GeoJSON file
        success = save_geojson(geojson, output_path)
        
        if success:
            logger.info(" Supabase to GeoJSON export completed successfully!")
            return True
        else:
            logger.error(" Failed to save GeoJSON file")
            return False
            
    except Exception as e:
        logger.error(f" Error in main execution: {str(e)}")
        return False

if __name__ == "__main__":
    main()