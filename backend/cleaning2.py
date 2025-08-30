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
        
        Args:
            supabase_url: Your Supabase project URL
            supabase_key: Your Supabase anon/service role key
        """
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
    def read_all_sheets(self, file_path: str) -> Dict[str, pd.DataFrame]:
        """
        Read data from all sheets in an Excel file
        
        Args:
            file_path: Path to the Excel file
            
        Returns:
            Dictionary with sheet names as keys and DataFrames as values
        """
        try:
            # Read all sheets
            all_sheets = pd.read_excel(file_path, sheet_name=None)
            
            logger.info(f"Found {len(all_sheets)} sheets in {file_path}")
            logger.info(f"Sheet names: {list(all_sheets.keys())}")
            
            return all_sheets
            
        except Exception as e:
            logger.error(f"Error reading Excel file: {str(e)}")
            raise
    
    def process_all_sheets(self, file_path: str, table_name: str, add_year_column: bool = True) -> bool:
        """
        Process all sheets in an Excel file and insert into Supabase
        
        Args:
            file_path: Path to the Excel file
            table_name: Name of the Supabase table
            add_year_column: Whether to add a 'year' column based on sheet name
            
        Returns:
            True if all sheets processed successfully, False otherwise
        """
        try:
            # Read all sheets
            all_sheets = self.read_all_sheets(file_path)
            
            total_success = True
            combined_data = []
            
            for sheet_name, df in all_sheets.items():
                logger.info(f"Processing sheet: {sheet_name}")
                
                # Clean the data for this sheet
                df_clean = self.clean_data(df)
                
                if len(df_clean) == 0:
                    logger.warning(f"No valid data found in sheet {sheet_name}, skipping...")
                    continue
                
                # Add year column if requested (try to extract year from sheet name)
                if add_year_column:
                    year = self.extract_year_from_sheet_name(sheet_name)
                    if year:
                        df_clean['year'] = year
                        logger.info(f"Added year column with value: {year}")
                
                # Convert to list of dictionaries
                sheet_data = self.dataframe_to_dict_list(df_clean)
                combined_data.extend(sheet_data)
                
                logger.info(f"Processed {len(sheet_data)} records from sheet {sheet_name}")
            
            if combined_data:
                # Insert all data at once
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
        """
        Extract year from sheet name
        
        Args:
            sheet_name: Name of the sheet
            
        Returns:
            Year as integer, or None if not found
        """
        import re
        
        # Look for 4-digit year in sheet name
        year_match = re.search(r'\b(19|20)\d{2}\b', str(sheet_name))
        if year_match:
            return int(year_match.group())
        
        logger.warning(f"Could not extract year from sheet name: {sheet_name}")
        return None
    def read_excel(self, file_path: str, sheet_name: str = None) -> pd.DataFrame:
        """
        Read data from Excel file
        
        Args:
            file_path: Path to the Excel file
            sheet_name: Name of the sheet to read (if None, reads first sheet)
            
        Returns:
            DataFrame containing the Excel data
        """
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
        """
        Clean the DataFrame for Supabase insertion
        Keep only specific columns, calculate serevirity, and remove rows with missing required data
        
        Args:
            df: Input DataFrame
            
        Returns:
            Cleaned DataFrame with only required columns plus calculated severity
        """
        # Clean column names first (remove spaces, special characters, make lowercase)
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace(r'[^\w]', '', regex=True)
        
        # Define required columns (using cleaned names)
        required_columns = ['barangay', 'lat', 'lng', 'datecommitted', 'timecommitted', 'offensetype']
        
        # Define columns needed for severity calculation (but not for final output)
        severity_calc_columns = ['victimcount', 'suspectcount', 'victiminjured', 'victimkilled', 'victimunharmed', 'suspectkilled']

        # All columns we need to find in the Excel
        all_needed_columns = required_columns + severity_calc_columns

        # Find matching columns (handle variations in naming)
        available_columns = df.columns.tolist()
        column_mapping = {}
        
        for req_col in all_needed_columns:
            # Try exact match first
            if req_col in available_columns:
                column_mapping[req_col] = req_col
            else:
                # Try to find similar column names
                for avail_col in available_columns:
                    if req_col.replace('_', '').lower() in avail_col.replace('_', '').lower():
                        column_mapping[req_col] = avail_col
                        break
        
        # Log which columns were found
        logger.info(f"Column mapping: {column_mapping}")
        
        # Check if all required columns are found
        missing_required = [col for col in required_columns if col not in column_mapping]

        # Check if severity columns are found
        missing_severity = [col for col in severity_calc_columns if col not in column_mapping]

        if missing_required:
            logger.error(f"Missing required columns: {missing_required}")
        if missing_severity:
            logger.warning(f"Missing severity calculation columns: {missing_severity}")

        
        # Select all found columns for processing
        found_columns = [column_mapping[col] for col in all_needed_columns if col in column_mapping]
        df_filtered = df[found_columns].copy()
        
        # Rename columns to standardized names
        rename_map = {v: k for k, v in column_mapping.items() if k in all_needed_columns}
        df_filtered = df_filtered.rename(columns=rename_map)
        
        initial_rows = len(df_filtered)
        logger.info(f"Initial rows after column selection: {initial_rows}")
        
        # Remove rows where ANY of the required columns have missing data
        available_required_columns = [col for col in required_columns if col in df_filtered.columns]
        df_filtered = df_filtered.dropna(subset=available_required_columns)
        
        # Fill missing values in severity calculation columns with defaults
        for col in severity_calc_columns:
            if col in df_filtered.columns:
                if col in ['victimcount', 'suspectcount']:
                    df_filtered[col] = df_filtered[col].fillna(0).astype(int)
                else:
                    df_filtered[col] = df_filtered[col].fillna('No')
        
        # Calculate severity using all available columns
        df_filtered['severity'] = df_filtered.apply(self.calculate_severity, axis=1)

        # Now select ONLY the core columns + severity for final output
        final_columns = [col for col in required_columns if col in df_filtered.columns] + ['severity']
        df_final = df_filtered[final_columns].copy()

        final_rows = len(df_final)
        removed_rows = initial_rows - final_rows
        
        logger.info(f"Removed {removed_rows} rows with missing data")
        logger.info(f"Final cleaned data shape: {df_final.shape}")
        logger.info(f"Final columns: {df_final.columns.tolist()}")

        # Show severity distribution
        if 'severity' in df_final.columns:
            severity_dist = df_final['severity'].value_counts()
            logger.info(f"Severity distribution: {severity_dist.to_dict()}")

        return df_final
    
    def calculate_severity(self, row) -> str:
        """
        Calculate accident severity based on victim and suspect data

        Args:
            row: DataFrame row with victim/suspect information

        Returns:
            Severity level: 'Critical', 'High', 'Medium', 'Low', 'Minor'
        """
        try:
            # Get values with defaults
            victim_count = int(row.get('victimcount', 0))
            suspect_count = int(row.get('suspectcount', 0))
            victim_killed = str(row.get('victimkilled', 'No')).lower() in ['yes', 'y', '1', 'true']
            victim_injured = str(row.get('victiminjured', 'No')).lower() in ['yes', 'y', '1', 'true']
            suspect_killed = str(row.get('suspectkilled', 'No')).lower() in ['yes', 'y', '1', 'true']
            victim_unharmed = str(row.get('victim_unharmed', 'No')).lower() in ['yes', 'y', '1', 'true']

            # Severity calculation logic
            severity_score = 0

            # Deaths are the highest priority
            if victim_killed or suspect_killed:
                severity_score += 100

            # Injuries are high priority
            if victim_injured:
                severity_score += 50

            # Number of people involved
            total_people = victim_count + suspect_count
            if total_people >= 10:
                severity_score += 30
            elif total_people >= 5:
                severity_score += 20
            elif total_people >= 3:
                severity_score += 10
            elif total_people >= 1:
                severity_score += 5

            # If everyone is unharmed, reduce severity
            if victim_unharmed and not victim_injured and not victim_killed:
                severity_score = max(0, severity_score - 20)

            # Determine severity level
            if severity_score >= 100:
                return 'Critical'   # Any Deaths
            elif severity_score >= 60:
                return 'High'       # Injuries + multiple people
            elif severity_score >= 30:
                return 'Medium'     # Many people involved or injuries
            elif severity_score >= 10:
                return 'Low'        # Few people, minor incident
            else:
                return 'Minor'      # Very minor incidents

        except Exception as e:
            logger.warning(f"Error calculating severity for row: {e}")
            return 'Unknown'


    def dataframe_to_dict_list(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Convert DataFrame to list of dictionaries for Supabase insertion
        
        Args:
            df: Input DataFrame
            
        Returns:
            List of dictionaries
        """
        return df.to_dict('records')
    
    def insert_data(self, table_name: str, data: List[Dict[str, Any]], batch_size: int = 1000) -> bool:
        """
        Insert data into Supabase table in batches
        
        Args:
            table_name: Name of the Supabase table
            data: List of dictionaries to insert
            batch_size: Number of records to insert per batch
            
        Returns:
            True if successful, False otherwise
        """
        try:
            total_records = len(data)
            logger.info(f"Starting to insert {total_records} records into {table_name}")
            
            # Insert data in batches
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
    
    def upsert_data(self, table_name: str, data: List[Dict[str, Any]], 
                   on_conflict: str = None, batch_size: int = 1000) -> bool:
        """
        Upsert data into Supabase table (insert or update if exists)
        
        Args:
            table_name: Name of the Supabase table
            data: List of dictionaries to upsert
            on_conflict: Column name for conflict resolution (e.g., 'id', 'email')
            batch_size: Number of records to upsert per batch
            
        Returns:
            True if successful, False otherwise
        """
        try:
            total_records = len(data)
            logger.info(f"Starting to upsert {total_records} records into {table_name}")
            
            # Upsert data in batches
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

def main():
    """
    Main function to run the Excel to Supabase import
    """
    # Configuration - replace with your actual values
    SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://bdysgnfgqcywjrqaqdsj.supabase.co')
    SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeXNnbmZncWN5d2pycWFxZHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAwMzk0OSwiZXhwIjoyMDcxNTc5OTQ5fQ.wERBHIapZAJX1FxZVlTidbgysY0L4Pxc6pVLKer0c4Q')
    EXCEL_FILE_PATH = 'C:/Users/Jan Nikko/Downloads/osimapdatabaseweb/crime-map-proto/backend/data/DVTSU(1).xlsx'  # Replace with your Excel file path
    TABLE_NAME = 'road_traffic_accident'  # Replace with your Supabase table name
    
    # Initialize the importer
    importer = ExcelToSupabase(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Option 1: Process all sheets at once (recommended for yearly data)
        logger.info("Processing all sheets in Excel file...")
        success = importer.process_all_sheets(EXCEL_FILE_PATH, TABLE_NAME, add_year_column=True)
        
        if success:
            logger.info("All data imported successfully!")
        else:
            logger.error("Some sheets failed to import!")
            
        # Option 2: Process individual sheets (alternative approach)
        # Uncomment the code below if you prefer to process sheets individually
        """
        # Get all sheet names first
        all_sheets = importer.read_all_sheets(EXCEL_FILE_PATH)
        
        for sheet_name, df in all_sheets.items():
            logger.info(f"Processing sheet: {sheet_name}")
            
            # Clean the data
            df_clean = importer.clean_data(df)
            
            if len(df_clean) == 0:
                logger.warning(f"No valid data in sheet {sheet_name}, skipping...")
                continue
            
            # Add year column
            year = importer.extract_year_from_sheet_name(sheet_name)
            if year:
                df_clean['year'] = year
            
            # Convert and insert
            data = importer.dataframe_to_dict_list(df_clean)
            success = importer.insert_data(TABLE_NAME, data)
            
            if success:
                logger.info(f"Successfully imported sheet: {sheet_name}")
            else:
                logger.error(f"Failed to import sheet: {sheet_name}")
        """
            
    except Exception as e:
        logger.error(f"Import process failed: {str(e)}")

if __name__ == "__main__":
    main()