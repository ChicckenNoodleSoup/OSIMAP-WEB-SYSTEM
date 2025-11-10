import pandas as pd
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import logging
from typing import Dict, List, Any

load_dotenv()

# ==============================
# Logging
# ==============================
logging.basicConfig(level=logging.WARNING)  # OPTIMIZED: Only show warnings and errors
logger = logging.getLogger(__name__)

# Silence verbose HTTP request logging from httpx/supabase
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

# ==============================
# ExcelToSupabase class
# ==============================
class ExcelToSupabase:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase: Client = create_client(supabase_url, supabase_key)

    def read_all_sheets(self, file_path: str) -> Dict[str, pd.DataFrame]:
        try:
            all_sheets = pd.read_excel(file_path, sheet_name=None)
            logger.info(f"Found {len(all_sheets)} sheets in {file_path}")
            logger.info(f"Sheet names: {list(all_sheets.keys())}")
            return all_sheets
        except Exception as e:
            logger.error(f"Error reading Excel file: {str(e)}")
            raise

    def process_all_sheets(self, file_path: str, table_name: str, add_year_column: bool = True) -> bool:
        try:
            all_sheets = self.read_all_sheets(file_path)
            total_success = True
            combined_data = []

            for sheet_name, df in all_sheets.items():
                logger.info(f"Processing sheet: {sheet_name}")
                df_clean = self.clean_data(df)

                if len(df_clean) == 0:
                    logger.warning(f"No valid data found in sheet {sheet_name}, skipping...")
                    continue

                if add_year_column:
                    year = self.extract_year_from_sheet_name(sheet_name)
                    if year:
                        df_clean['year'] = year
                        logger.info(f"Added year column with value: {year}")

                sheet_data = self.dataframe_to_dict_list(df_clean)
                combined_data.extend(sheet_data)

                logger.info(f"Processed {len(sheet_data)} records from sheet {sheet_name}")

            if combined_data:
                logger.info(f"Inserting combined data from all sheets ({len(combined_data)} total records)")
                
                # Choose insertion method
                if USE_UPSERT:
                    success = self.upsert_data(table_name, combined_data)
                else:
                    success = self.insert_data(table_name, combined_data)
                    
                total_success = total_success and success
            else:
                logger.warning("No data found in any sheet!")
                total_success = False

            return total_success
        except Exception as e:
            logger.error(f"Error processing sheets: {str(e)}")
            return False

    def extract_year_from_sheet_name(self, sheet_name: str) -> int:
        import re
        year_match = re.search(r'\b(19|20)\d{2}\b', str(sheet_name))
        if year_match:
            return int(year_match.group())
        logger.warning(f"Could not extract year from sheet name: {sheet_name}")
        return None

    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace(r'[^\w]', '', regex=True)
        required_columns = ['barangay', 'lat', 'lng', 'datecommitted', 'timecommitted', 'offensetype']
        severity_calc_columns = ['victimcount', 'suspectcount', 'victiminjured', 'victimkilled', 'victimunharmed', 'suspectkilled']
        all_needed_columns = required_columns + severity_calc_columns
        available_columns = df.columns.tolist()
        column_mapping = {}
        for req_col in all_needed_columns:
            if req_col in available_columns:
                column_mapping[req_col] = req_col
            else:
                for avail_col in available_columns:
                    if req_col.replace('_', '').lower() in avail_col.replace('_', '').lower():
                        column_mapping[req_col] = avail_col
                        break
        logger.info(f"Column mapping: {column_mapping}")
        missing_required = [col for col in required_columns if col not in column_mapping]
        missing_severity = [col for col in severity_calc_columns if col not in column_mapping]
        if missing_required:
            logger.error(f"Missing required columns: {missing_required}")
        if missing_severity:
            logger.warning(f"Missing severity calculation columns: {missing_severity}")
        found_columns = [column_mapping[col] for col in all_needed_columns if col in column_mapping]
        df_filtered = df[found_columns].copy()
        rename_map = {v: k for k, v in column_mapping.items() if k in all_needed_columns}
        df_filtered = df_filtered.rename(columns=rename_map)
        initial_rows = len(df_filtered)
        logger.info(f"Initial rows after column selection: {initial_rows}")
        available_required_columns = [col for col in required_columns if col in df_filtered.columns]
        df_filtered = df_filtered.dropna(subset=available_required_columns)
        for col in severity_calc_columns:
            if col in df_filtered.columns:
                if col in ['victimcount', 'suspectcount']:
                    df_filtered[col] = df_filtered[col].fillna(0).astype(int)
                else:
                    df_filtered[col] = df_filtered[col].fillna('No')
        df_filtered['severity'] = df_filtered.apply(self.calculate_severity, axis=1)
        final_columns = [col for col in required_columns if col in df_filtered.columns] + ['severity']
        df_final = df_filtered[final_columns].copy()
        final_rows = len(df_final)
        removed_rows = initial_rows - final_rows
        logger.info(f"Removed {removed_rows} rows with missing data")
        logger.info(f"Final cleaned data shape: {df_final.shape}")
        logger.info(f"Final columns: {df_final.columns.tolist()}")
        if 'severity' in df_final.columns:
            severity_dist = df_final['severity'].value_counts()
            logger.info(f"Severity distribution: {severity_dist.to_dict()}")
        return df_final

    def calculate_severity(self, row) -> str:
        try:
            victim_count = int(row.get('victimcount', 0))
            suspect_count = int(row.get('suspectcount', 0))
            victim_killed = str(row.get('victimkilled', 'No')).lower() in ['yes', 'y', '1', 'true']
            victim_injured = str(row.get('victiminjured', 'No')).lower() in ['yes', 'y', '1', 'true']
            suspect_killed = str(row.get('suspectkilled', 'No')).lower() in ['yes', 'y', '1', 'true']
            victim_unharmed = str(row.get('victimunharmed', 'No')).lower() in ['yes', 'y', '1', 'true']
            severity_score = 0
            if victim_killed or suspect_killed:
                severity_score += 100
            if victim_injured:
                severity_score += 50
            total_people = victim_count + suspect_count
            if total_people >= 10:
                severity_score += 30
            elif total_people >= 5:
                severity_score += 20
            elif total_people >= 3:
                severity_score += 10
            elif total_people >= 1:
                severity_score += 5
            if victim_unharmed and not victim_injured and not victim_killed:
                severity_score = max(0, severity_score - 20)
            if severity_score >= 100:
                return 'Critical'
            elif severity_score >= 60:
                return 'High'
            elif severity_score >= 30:
                return 'Medium'
            elif severity_score >= 10:
                return 'Low'
            else:
                return 'Minor'
        except Exception as e:
            logger.warning(f"Error calculating severity for row: {e}")
            return 'Unknown'

    def dataframe_to_dict_list(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Convert DataFrame to list of dictionaries with proper JSON serialization"""
        import datetime
        
        # Convert to dict first
        records = df.to_dict('records')
        
        # Clean each record to ensure JSON serialization
        cleaned_records = []
        for record in records:
            cleaned_record = {}
            for key, value in record.items():
                # Handle different datetime types
                if isinstance(value, (pd.Timestamp, datetime.datetime)):
                    cleaned_record[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                elif isinstance(value, datetime.time):
                    cleaned_record[key] = value.strftime('%H:%M:%S')
                elif isinstance(value, datetime.date):
                    cleaned_record[key] = value.strftime('%Y-%m-%d')
                elif pd.isna(value):
                    cleaned_record[key] = None
                else:
                    cleaned_record[key] = value
            cleaned_records.append(cleaned_record)
        
        return cleaned_records

    def check_existing_data(self, table_name: str) -> Dict[str, Any]:
        """Get existing data with optimized duplicate checking using sets - OPTIMIZED VERSION"""
        try:
            logger.info(" Checking for existing data to prevent duplicates...")
            response = self.supabase.table(table_name).select("*").execute()
            
            if hasattr(response, 'error') and response.error:
                logger.warning(f"Could not fetch existing data: {response.error}")
                return {"signatures": set(), "full_records": []}
            
            existing_records = response.data or []
            
            # Use set for O(1) lookups
            existing_signatures = set()
            
            # Batch process records to reduce function call overhead
            for row in existing_records:
                # Pre-compute and clean values once
                barangay = str(row.get('barangay', '')).lower().strip()
                lat = str(row.get('lat', ''))  # Convert to string for consistency
                lng = str(row.get('lng', ''))
                date_committed = str(row.get('datecommitted', ''))
                time_committed = str(row.get('timecommitted', ''))
                offense_type = str(row.get('offensetype', '')).lower().strip()
                
                # Create all signature variations at once and add to set
                signatures = {
                    f"{barangay}|{lat}|{lng}|{date_committed}|{time_committed}|{offense_type}",  # primary
                    f"{barangay}|{lat}|{lng}|{date_committed}|{offense_type}",  # without time
                    f"{lat}|{lng}|{date_committed}|{offense_type}",  # coordinate + offense
                }
                existing_signatures.update(signatures)
            
            logger.info(f" Found {len(existing_records)} existing records in database")
            logger.info(f" Generated {len(existing_signatures)} signature variations for matching")
            
            return {
                "signatures": existing_signatures,
                "full_records": existing_records,
                "count": len(existing_records)
            }
            
        except Exception as e:
            logger.error(f" Error checking existing data: {str(e)}")
            return {"signatures": set(), "full_records": [], "count": 0}

    def filter_duplicates(self, data: List[Dict[str, Any]], existing_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Optimized duplicate filtering with O(n) complexity - OPTIMIZED VERSION"""
        existing_signatures = existing_data["signatures"]
        
        # Use set for current batch signatures for O(1) lookup
        current_batch_signatures = set()
        filtered_data = []
        duplicate_count = 0
        
        for record in data:
            # Pre-compute and clean values once per record
            barangay = str(record.get('barangay', '')).lower().strip()
            lat = str(record.get('lat', ''))
            lng = str(record.get('lng', ''))
            date_committed = str(record.get('datecommitted', ''))
            time_committed = str(record.get('timecommitted', ''))
            offense_type = str(record.get('offensetype', '')).lower().strip()
            
            # Create primary signature for current batch tracking
            primary_sig = f"{barangay}|{lat}|{lng}|{date_committed}|{time_committed}|{offense_type}"
            
            # Check current batch first (most likely to hit)
            if primary_sig in current_batch_signatures:
                duplicate_count += 1
                continue
            
            # Create signature variations for existing data check
            signatures_to_check = {
                primary_sig,
                f"{barangay}|{lat}|{lng}|{date_committed}|{offense_type}",
                f"{lat}|{lng}|{date_committed}|{offense_type}",
            }
            
            # Check if any signature exists in existing data using set intersection (very fast)
            if existing_signatures & signatures_to_check:  # Set intersection
                duplicate_count += 1
                logger.debug(f" Duplicate found: {barangay} at ({lat}, {lng}) on {date_committed} - {offense_type}")
            else:
                # Not a duplicate - add to results
                filtered_data.append(record)
                current_batch_signatures.add(primary_sig)
        
        logger.info(f" Filtered out {duplicate_count} duplicate records")
        logger.info(f" {len(filtered_data)} new unique records ready for insertion")
        
        return filtered_data

    def filter_duplicates_pandas(self, data: List[Dict[str, Any]], existing_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Ultra-fast duplicate filtering using pandas for large datasets - ALTERNATIVE OPTIMIZED VERSION"""
        if not data:
            return data
        
        # Convert to DataFrame for vectorized operations
        df_new = pd.DataFrame(data)
        
        # Clean and prepare columns using vectorized operations
        df_new['barangay_clean'] = df_new['barangay'].astype(str).str.lower().str.strip()
        df_new['lat_clean'] = df_new['lat'].astype(str)
        df_new['lng_clean'] = df_new['lng'].astype(str)
        df_new['date_clean'] = df_new['datecommitted'].astype(str)
        df_new['time_clean'] = df_new['timecommitted'].astype(str)
        df_new['offense_clean'] = df_new['offensetype'].astype(str).str.lower().str.strip()
        
        # Create signature using vectorized string operations
        df_new['signature'] = (
            df_new['barangay_clean'] + '|' + 
            df_new['lat_clean'] + '|' + 
            df_new['lng_clean'] + '|' + 
            df_new['date_clean'] + '|' + 
            df_new['time_clean'] + '|' + 
            df_new['offense_clean']
        )
        
        # Remove internal duplicates within the new dataset
        df_new_unique = df_new.drop_duplicates(subset=['signature'], keep='first')
        
        # Filter against existing signatures using pandas isin() which is highly optimized
        existing_signatures = existing_data["signatures"]
        mask_not_duplicate = ~df_new_unique['signature'].isin(existing_signatures)
        df_filtered = df_new_unique[mask_not_duplicate]
        
        # Convert back to list of dictionaries, excluding our helper columns
        original_columns = [col for col in df_filtered.columns if not col.endswith('_clean') and col != 'signature']
        filtered_data = df_filtered[original_columns].to_dict('records')
        
        duplicate_count = len(data) - len(filtered_data)
        logger.info(f" Pandas filtering removed {duplicate_count} duplicate records")
        logger.info(f" {len(filtered_data)} new unique records ready for insertion")
        
        return filtered_data

    def insert_data(self, table_name: str, data: List[Dict[str, Any]], batch_size: int = 1000) -> bool:
        try:
            # Check for existing data first
            existing_data = self.check_existing_data(table_name)
            
            logger.info(f" Original data count: {len(data)}")
            logger.info(f" Existing records in database: {existing_data['count']}")
            
            # Filter out duplicates - USE OPTIMIZED VERSION
            # For very large datasets (100K+ records), uncomment the next line instead:
            # filtered_data = self.filter_duplicates_pandas(data, existing_data)
            filtered_data = self.filter_duplicates(data, existing_data)
            
            if not filtered_data:
                logger.info(" No new records to insert - all records already exist in database")
                return True
            
            total_records = len(filtered_data)
            logger.info(f" Starting to insert {total_records} new records into {table_name}")
            
            inserted_count = 0
            for i in range(0, total_records, batch_size):
                batch = filtered_data[i:i + batch_size]
                
                try:
                    result = self.supabase.table(table_name).insert(batch).execute()
                    
                    if hasattr(result, 'error') and result.error:
                        logger.error(f" Error inserting batch {i//batch_size + 1}: {result.error}")
                        # Try individual inserts for this batch to see which records are problematic
                        self.insert_batch_individually(table_name, batch, i//batch_size + 1)
                    else:
                        batch_size_actual = len(batch)
                        inserted_count += batch_size_actual
                        logger.info(f" Inserted batch {i//batch_size + 1}/{(total_records + batch_size - 1)//batch_size} ({batch_size_actual} records)")
                        
                except Exception as e:
                    logger.error(f" Exception inserting batch {i//batch_size + 1}: {str(e)}")
                    self.insert_batch_individually(table_name, batch, i//batch_size + 1)
            
            logger.info(f" Successfully processed {total_records} records, inserted {inserted_count} new records")
            return True
            
        except Exception as e:
            logger.error(f" Error in insert_data: {str(e)}")
            return False

    def insert_batch_individually(self, table_name: str, batch: List[Dict[str, Any]], batch_num: int):
        """Try to insert records individually when batch fails"""
        logger.info(f" Attempting individual inserts for batch {batch_num}")
        
        for i, record in enumerate(batch):
            try:
                result = self.supabase.table(table_name).insert([record]).execute()
                if hasattr(result, 'error') and result.error:
                    logger.warning(f" Failed to insert individual record {i+1}: {result.error}")
                else:
                    logger.debug(f" Individual insert successful for record {i+1}")
            except Exception as e:
                logger.warning(f" Exception inserting individual record {i+1}: {str(e)}")

    def upsert_data(self, table_name: str, data: List[Dict[str, Any]], batch_size: int = 1000) -> bool:
        """Use Supabase upsert with comprehensive conflict resolution including offense type"""
        try:
            total_records = len(data)
            
            inserted_count = 0
            duplicate_count = 0
            
            for i in range(0, total_records, batch_size):
                batch = data[i:i + batch_size]
                
                try:
                    # OPTIMIZED: Use upsert with count to track new inserts
                    result = self.supabase.table(table_name).upsert(
                        batch,
                        ignore_duplicates=True,  # Skip duplicates silently
                        count='exact'  # Count affected rows to track new inserts
                    ).execute()
                    
                    # Count new inserts (count will be 0 for duplicates)
                    batch_inserted = result.count if hasattr(result, 'count') and result.count else 0
                    inserted_count += batch_inserted
                    duplicate_count += (len(batch) - batch_inserted)
                        
                except Exception as e:
                    # Only log if it's NOT a duplicate key error
                    error_str = str(e)
                    if 'duplicate key' not in error_str.lower() and '23505' not in error_str:
                        logger.error(f" Batch {i//batch_size + 1} error: {str(e)}")
                    else:
                        # All duplicates in this batch
                        duplicate_count += len(batch)
            
            # Output summary for server.js to parse (hidden markers + visible message)
            print(f"[SUMMARY]INSERTED:{inserted_count}", flush=True)  # Hidden marker
            print(f"[SUMMARY]DUPLICATES:{duplicate_count}", flush=True)  # Hidden marker
            print(f"   Upsert complete: {inserted_count} new, {duplicate_count} duplicates", flush=True)
            return True
            
        except Exception as e:
            logger.error(f" Error upserting data: {str(e)}")
            return False

    def upsert_batch_individually(self, table_name: str, batch: List[Dict[str, Any]], batch_num: int):
        """Try to upsert records individually when batch fails - DEPRECATED (should not be called)"""
        # This function is kept for backward compatibility but should not be called
        # with the optimized batch upsert using ignore_duplicates=True
        logger.warning(f" Fallback to individual upserts triggered for batch {batch_num} - this is slow!")
        
        duplicates = 0
        errors = 0
        
        for i, record in enumerate(batch):
            try:
                result = self.supabase.table(table_name).upsert([record], ignore_duplicates=True).execute()
                if hasattr(result, 'error') and result.error:
                    # Only log actual errors, not duplicate conflicts
                    if 'duplicate key' in str(result.error):
                        duplicates += 1
                    else:
                        errors += 1
                        if errors <= 5:  # Only log first 5 errors
                            logger.error(f" Record {i+1} error: {result.error}")
            except Exception as e:
                if 'duplicate key' not in str(e):
                    errors += 1
                    if errors <= 5:
                        logger.error(f" Record {i+1} exception: {str(e)}")
                else:
                    duplicates += 1
        
        logger.warning(f" Batch {batch_num}: {duplicates} duplicates skipped, {errors} errors")

# ==============================
# Configuration
# ==============================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
TABLE_NAME = 'road_traffic_accident'
USE_UPSERT = True  # OPTIMIZED: Use database upsert instead of manual duplicate filtering

def find_latest_excel_file():
    """Find the most recent Excel file in the data folder"""
    # Get data folder path (inside backend directory)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_folder = os.path.join(script_dir, "data")
    
    if not os.path.exists(data_folder):
        logger.error(f"Data folder not found: {data_folder}")
        return None
    
    excel_files = [f for f in os.listdir(data_folder) if f.endswith(('.xlsx', '.xls'))]
    if not excel_files:
        logger.error("No Excel files found in data folder")
        return None
    
    # Get the most recently modified Excel file
    excel_files_with_time = []
    for f in excel_files:
        full_path = os.path.join(data_folder, f)
        mod_time = os.path.getmtime(full_path)
        excel_files_with_time.append((full_path, mod_time))
    
    latest_file = max(excel_files_with_time, key=lambda x: x[1])[0]
    logger.info(f"Processing latest Excel file: {latest_file}")
    return latest_file

# ==============================
# Main function (run once, not infinite loop)
# ==============================
def main():
    try:
        logger.info(" Starting Excel to Supabase import...")
        
        # Find the latest Excel file
        excel_file = find_latest_excel_file()
        if not excel_file:
            return False
        
        # Initialize importer and process
        importer = ExcelToSupabase(SUPABASE_URL, SUPABASE_KEY)
        success = importer.process_all_sheets(excel_file, TABLE_NAME, add_year_column=True)
        
        if success:
            logger.info(" Excel to Supabase import completed successfully!")
            return True
        else:
            logger.error(" Excel to Supabase import failed!")
            return False
            
    except Exception as e:
        logger.error(f" Error in main execution: {str(e)}")
        return False

if __name__ == "__main__":
    main()