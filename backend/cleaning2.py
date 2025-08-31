import pandas as pd
from supabase import create_client, Client
import os
import logging
from typing import Dict, List, Any

# ==============================
# Logging
# ==============================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        return df.to_dict('records')

    def check_existing_data(self, table_name: str) -> Dict[str, Any]:
        """Get existing data with more comprehensive duplicate checking"""
        try:
            logger.info("🔍 Checking for existing data to prevent duplicates...")
            response = self.supabase.table(table_name).select("*").execute()
            
            if hasattr(response, 'error') and response.error:
                logger.warning(f"Could not fetch existing data: {response.error}")
                return {"signatures": set(), "full_records": []}
            
            existing_signatures = set()
            existing_records = response.data or []
            
            for row in existing_records:
                barangay = str(row.get('barangay', '')).lower().strip()
                lat = row.get('lat', '')
                lng = row.get('lng', '')
                date_committed = row.get('datecommitted', '')
                time_committed = row.get('timecommitted', '')
                offense_type = str(row.get('offensetype', '')).lower().strip()
                
                # Create multiple signature types for better matching
                # Primary signature with all fields including offense type and time
                primary_sig = f"{barangay}|{lat}|{lng}|{date_committed}|{time_committed}|{offense_type}"
                
                # Alternative signature without time (in case time formatting differs)
                alt_sig = f"{barangay}|{lat}|{lng}|{date_committed}|{offense_type}"
                
                # Coordinate + offense signature (in case barangay spelling differs)
                coord_offense_sig = f"{lat}|{lng}|{date_committed}|{offense_type}"
                
                # Full match signature with time (most restrictive)
                full_sig = f"{barangay}|{lat}|{lng}|{date_committed}|{time_committed}|{offense_type}"
                
                existing_signatures.add(primary_sig)
                existing_signatures.add(alt_sig)
                existing_signatures.add(coord_offense_sig)
                existing_signatures.add(full_sig)
            
            logger.info(f"📊 Found {len(existing_records)} existing records in database")
            logger.info(f"🔑 Generated {len(existing_signatures)} signature variations for matching")
            
            return {
                "signatures": existing_signatures,
                "full_records": existing_records,
                "count": len(existing_records)
            }
            
        except Exception as e:
            logger.error(f"❌ Error checking existing data: {str(e)}")
            return {"signatures": set(), "full_records": [], "count": 0}

    def filter_duplicates(self, data: List[Dict[str, Any]], existing_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Filter out duplicate records using multiple signature matching including offense type"""
        filtered_data = []
        duplicate_count = 0
        existing_signatures = existing_data["signatures"]
        
        # Track signatures from current batch to avoid internal duplicates
        current_batch_signatures = set()
        
        for record in data:
            barangay = str(record.get('barangay', '')).lower().strip()
            lat = record.get('lat', '')
            lng = record.get('lng', '')
            date_committed = record.get('datecommitted', '')
            time_committed = record.get('timecommitted', '')
            offense_type = str(record.get('offensetype', '')).lower().strip()
            
            # Create the same signature types as in check_existing_data
            primary_sig = f"{barangay}|{lat}|{lng}|{date_committed}|{time_committed}|{offense_type}"
            alt_sig = f"{barangay}|{lat}|{lng}|{date_committed}|{offense_type}"
            coord_offense_sig = f"{lat}|{lng}|{date_committed}|{offense_type}"
            full_sig = f"{barangay}|{lat}|{lng}|{date_committed}|{time_committed}|{offense_type}"
            
            # Check if any signature matches existing data
            is_duplicate = (
                primary_sig in existing_signatures or 
                alt_sig in existing_signatures or 
                coord_offense_sig in existing_signatures or
                full_sig in existing_signatures or
                primary_sig in current_batch_signatures
            )
            
            if not is_duplicate:
                filtered_data.append(record)
                current_batch_signatures.add(primary_sig)
                # Add to existing signatures to prevent future duplicates in this session
                existing_signatures.add(primary_sig)
                existing_signatures.add(alt_sig)
                existing_signatures.add(coord_offense_sig)
                existing_signatures.add(full_sig)
            else:
                duplicate_count += 1
                logger.debug(f"🚫 Duplicate found: {barangay} at ({lat}, {lng}) on {date_committed} - {offense_type}")
        
        logger.info(f"🚫 Filtered out {duplicate_count} duplicate records")
        logger.info(f"✅ {len(filtered_data)} new unique records ready for insertion")
        
        return filtered_data

    def insert_data(self, table_name: str, data: List[Dict[str, Any]], batch_size: int = 1000) -> bool:
        try:
            # Check for existing data first
            existing_data = self.check_existing_data(table_name)
            
            logger.info(f"📋 Original data count: {len(data)}")
            logger.info(f"📊 Existing records in database: {existing_data['count']}")
            
            # Filter out duplicates
            filtered_data = self.filter_duplicates(data, existing_data)
            
            if not filtered_data:
                logger.info("📭 No new records to insert - all records already exist in database")
                return True
            
            total_records = len(filtered_data)
            logger.info(f"📤 Starting to insert {total_records} new records into {table_name}")
            
            inserted_count = 0
            for i in range(0, total_records, batch_size):
                batch = filtered_data[i:i + batch_size]
                
                try:
                    result = self.supabase.table(table_name).insert(batch).execute()
                    
                    if hasattr(result, 'error') and result.error:
                        logger.error(f"❌ Error inserting batch {i//batch_size + 1}: {result.error}")
                        # Try individual inserts for this batch to see which records are problematic
                        self.insert_batch_individually(table_name, batch, i//batch_size + 1)
                    else:
                        batch_size_actual = len(batch)
                        inserted_count += batch_size_actual
                        logger.info(f"✅ Inserted batch {i//batch_size + 1}/{(total_records + batch_size - 1)//batch_size} ({batch_size_actual} records)")
                        
                except Exception as e:
                    logger.error(f"❌ Exception inserting batch {i//batch_size + 1}: {str(e)}")
                    self.insert_batch_individually(table_name, batch, i//batch_size + 1)
            
            logger.info(f"🎉 Successfully processed {total_records} records, inserted {inserted_count} new records")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error in insert_data: {str(e)}")
            return False

    def insert_batch_individually(self, table_name: str, batch: List[Dict[str, Any]], batch_num: int):
        """Try to insert records individually when batch fails"""
        logger.info(f"🔄 Attempting individual inserts for batch {batch_num}")
        
        for i, record in enumerate(batch):
            try:
                result = self.supabase.table(table_name).insert([record]).execute()
                if hasattr(result, 'error') and result.error:
                    logger.warning(f"⚠️ Failed to insert individual record {i+1}: {result.error}")
                else:
                    logger.debug(f"✅ Individual insert successful for record {i+1}")
            except Exception as e:
                logger.warning(f"⚠️ Exception inserting individual record {i+1}: {str(e)}")

    def upsert_data(self, table_name: str, data: List[Dict[str, Any]], batch_size: int = 1000) -> bool:
        """Use Supabase upsert with comprehensive conflict resolution including offense type"""
        try:
            total_records = len(data)
            logger.info(f"🔄 Starting to upsert {total_records} records into {table_name}")
            logger.info("🔧 Using upsert mode - will update existing records or insert new ones")
            
            for i in range(0, total_records, batch_size):
                batch = data[i:i + batch_size]
                
                try:
                    # Use upsert with on_conflict parameter including offense type and time
                    result = self.supabase.table(table_name).upsert(
                        batch,
                        on_conflict="barangay,lat,lng,datecommitted,timecommitted,offensetype",  # All key fields including time
                        ignore_duplicates=False  # Update instead of ignoring
                    ).execute()
                    
                    if hasattr(result, 'error') and result.error:
                        logger.error(f"❌ Error upserting batch {i//batch_size + 1}: {result.error}")
                        # Fall back to individual upserts
                        self.upsert_batch_individually(table_name, batch, i//batch_size + 1)
                    else:
                        logger.info(f"✅ Upserted batch {i//batch_size + 1}/{(total_records + batch_size - 1)//batch_size}")
                        
                except Exception as e:
                    logger.error(f"❌ Exception upserting batch {i//batch_size + 1}: {str(e)}")
                    self.upsert_batch_individually(table_name, batch, i//batch_size + 1)
            
            logger.info(f"🎉 Successfully upserted all {total_records} records")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error upserting data: {str(e)}")
            return False

    def upsert_batch_individually(self, table_name: str, batch: List[Dict[str, Any]], batch_num: int):
        """Try to upsert records individually when batch fails"""
        logger.info(f"🔄 Attempting individual upserts for batch {batch_num}")
        
        for i, record in enumerate(batch):
            try:
                result = self.supabase.table(table_name).upsert([record], ignore_duplicates=True).execute()
                if hasattr(result, 'error') and result.error:
                    logger.warning(f"⚠️ Failed to upsert individual record {i+1}: {result.error}")
                else:
                    logger.debug(f"✅ Individual upsert successful for record {i+1}")
            except Exception as e:
                logger.warning(f"⚠️ Exception upserting individual record {i+1}: {str(e)}")

# ==============================
# Configuration
# ==============================
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://bdysgnfgqcywjrqaqdsj.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeXNnbmZncWN5d2pycWFxZHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAwMzk0OSwiZXhwIjoyMDcxNTc5OTQ5fQ.wERBHIapZAJX1FxZVlTidbgysY0L4Pxc6pVLKer0c4Q')
TABLE_NAME = 'road_traffic_accident'
USE_UPSERT = False  # Set to True to use upsert instead of duplicate filtering

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
        logger.info("🚀 Starting Excel to Supabase import...")
        
        # Find the latest Excel file
        excel_file = find_latest_excel_file()
        if not excel_file:
            return False
        
        # Initialize importer and process
        importer = ExcelToSupabase(SUPABASE_URL, SUPABASE_KEY)
        success = importer.process_all_sheets(excel_file, TABLE_NAME, add_year_column=True)
        
        if success:
            logger.info("✅ Excel to Supabase import completed successfully!")
            return True
        else:
            logger.error("❌ Excel to Supabase import failed!")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error in main execution: {str(e)}")
        return False

if __name__ == "__main__":
    main()