import pandas as pd
from supabase import create_client, Client
import os
import sys
import argparse
from typing import Dict, List, Any
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExcelToSupabase:
    def __init__(self, supabase_url: str, supabase_key: str):
        """
        Initialize the ExcelToSupabase class with Supabase credentials
        """
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

    def read_excel(self, file_path: str, sheet_name: str = None) -> pd.DataFrame:
        try:
            if sheet_name:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
            else:
                df = pd.read_excel(file_path)
            logger.info(f"Successfully read {len(df)} rows from {file_path}")
            return df
        except Exception as e:
            logger.error(f"Error reading Excel file: {str(e)}")
            raise
    
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
            victim_unharmed = str(row.get('victim_unharmed', 'No')).lower() in ['yes', 'y', '1', 'true']
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
    
    def insert_data(self, table_name: str, data: List[Dict[str, Any]], batch_size: int = 1000) -> bool:
        try:
            total_records = len(data)
            logger.info(f"Starting to insert {total_records} records into {table_name}")
            for i in range(0, total_records, batch_size):
                batch = data[i:i + batch_size]
                result = self.supabase.table(table_name).insert(batch).execute()
                if hasattr(result, 'error') and result.error:
                    logger.error(f"Error inserting batch {i//batch_size + 1}: {result.error}")
                    return False
                logger.info(f"Inserted batch {i//batch_size + 1}/{(total_records + batch_size - 1)//batch_size}")
            logger.info(f"Successfully inserted all {total_records} records")
            return True
        except Exception as e:
            logger.error(f"Error inserting data: {str(e)}")
            return False
    
    def upsert_data(self, table_name: str, data: List[Dict[str, Any]], on_conflict: str = None, batch_size: int = 1000) -> bool:
        try:
            total_records = len(data)
            logger.info(f"Starting to upsert {total_records} records into {table_name}")
            for i in range(0, total_records, batch_size):
                batch = data[i:i + batch_size]
                if on_conflict:
                    result = self.supabase.table(table_name).upsert(batch, on_conflict=on_conflict).execute()
                else:
                    result = self.supabase.table(table_name).upsert(batch).execute()
                if hasattr(result, 'error') and result.error:
                    logger.error(f"Error upserting batch {i//batch_size + 1}: {result.error}")
                    return False
                logger.info(f"Upserted batch {i//batch_size + 1}/{(total_records + batch_size - 1)//batch_size}")
            logger.info(f"Successfully upserted all {total_records} records")
            return True
        except Exception as e:
            logger.error(f"Error upserting data: {str(e)}")
            return False

# ==================== EXISTING MAIN FUNCTION ==================== #

SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://bdysgnfgqcywjrqaqdsj.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'YOUR_KEY_HERE')
TABLE_NAME = 'road_traffic_accident'  # Supabase table name
DATA_FOLDER = './data'  # Folder to watch

def main(excel_file_path=None):
    importer = ExcelToSupabase(SUPABASE_URL, SUPABASE_KEY)
    file_to_process = excel_file_path
    if not file_to_process:
        # Pick first Excel file in the data folder if no path specified
        files = [f for f in os.listdir(DATA_FOLDER) if f.endswith(('.xlsx', '.xls'))]
        if not files:
            logger.warning("No Excel files found in data folder")
            return
        file_to_process = os.path.join(DATA_FOLDER, files[0])
    success = importer.process_all_sheets(file_to_process, TABLE_NAME, add_year_column=True)
    if success:
        logger.info("All data imported successfully!")
    else:
        logger.error("Some sheets failed to import!")

# ==================== AUTOMATION USING WATCHDOG ==================== #

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import time

class ExcelHandler(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith(('.xlsx', '.xls')):
            logger.info(f"Detected new Excel file: {event.src_path}")
            main(event.src_path)
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(('.xlsx', '.xls')):
            logger.info(f"Detected modified Excel file: {event.src_path}")
            main(event.src_path)

def watch_folder():
    event_handler = ExcelHandler()
    observer = Observer()
    observer.schedule(event_handler, DATA_FOLDER, recursive=False)
    observer.start()
    logger.info(f"Watching folder {DATA_FOLDER} for new or updated Excel files...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    watch_folder()
