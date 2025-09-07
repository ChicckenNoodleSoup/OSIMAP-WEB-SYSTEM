import os
import logging
from pathlib import Path
from datetime import datetime
import shutil

# ==============================
# Logging Configuration
# ==============================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FileCleanup:
    def __init__(self, data_folder_path: str = None):
        """Initialize the file cleanup utility
        
        Args:
            data_folder_path: Optional custom path to data folder. 
                            If None, uses ./data relative to script location
        """
        if data_folder_path:
            self.data_folder = Path(data_folder_path)
        else:
            # Default to data folder in same directory as script
            script_dir = Path(__file__).parent
            self.data_folder = script_dir / "data"
        
        logger.info(f" Data folder path: {self.data_folder.absolute()}")

    def find_excel_files(self) -> list:
        """Find all Excel files in the data folder
        
        Returns:
            List of Path objects for Excel files
        """
        if not self.data_folder.exists():
            logger.warning(f" Data folder not found: {self.data_folder}")
            return []
        
        excel_extensions = ['.xlsx', '.xls', '.xlsm', '.xlsb']
        excel_files = []
        
        for ext in excel_extensions:
            excel_files.extend(self.data_folder.glob(f"*{ext}"))
        
        logger.info(f" Found {len(excel_files)} Excel file(s)")
        return excel_files

    def get_latest_excel_file(self) -> Path:
        """Get the most recently modified Excel file
        
        Returns:
            Path object of the latest Excel file, or None if no files found
        """
        excel_files = self.find_excel_files()
        
        if not excel_files:
            logger.warning(" No Excel files found in data folder")
            return None
        
        # Sort by modification time (most recent first)
        latest_file = max(excel_files, key=lambda f: f.stat().st_mtime)
        
        # Get human-readable modification time
        mod_time = datetime.fromtimestamp(latest_file.stat().st_mtime)
        logger.info(f" Latest Excel file: {latest_file.name} (modified: {mod_time})")
        
        return latest_file

    def backup_file(self, file_path: Path, backup_folder: str = "backup") -> bool:
        """Create a backup of the file before deletion
        
        Args:
            file_path: Path to the file to backup
            backup_folder: Name of backup folder (created in data directory)
            
        Returns:
            True if backup successful, False otherwise
        """
        try:
            backup_dir = self.data_folder / backup_folder
            backup_dir.mkdir(exist_ok=True)
            
            # Create backup filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"{file_path.stem}_{timestamp}{file_path.suffix}"
            backup_path = backup_dir / backup_name
            
            shutil.copy2(file_path, backup_path)
            logger.info(f" Backup created: {backup_path.name}")
            return True
            
        except Exception as e:
            logger.error(f" Failed to create backup: {str(e)}")
            return False

    def delete_excel_file(self, file_path: Path, create_backup: bool = True) -> bool:
        """Delete an Excel file with optional backup
        
        Args:
            file_path: Path to the file to delete
            create_backup: Whether to create a backup before deletion
            
        Returns:
            True if deletion successful, False otherwise
        """
        if not file_path.exists():
            logger.warning(f" File not found: {file_path}")
            return False
        
        try:
            file_size = file_path.stat().st_size / 1024  # Size in KB
            
            # Create backup if requested
            if create_backup:
                backup_success = self.backup_file(file_path)
                if not backup_success:
                    logger.warning(" Proceeding with deletion despite backup failure")
            
            # Delete the file
            file_path.unlink()
            logger.info(f" Successfully deleted: {file_path.name} ({file_size:.1f} KB)")
            return True
            
        except Exception as e:
            logger.error(f" Failed to delete file {file_path.name}: {str(e)}")
            return False

    def delete_all_excel_files(self, create_backup: bool = True) -> dict:
        """Delete all Excel files in the data folder
        
        Args:
            create_backup: Whether to create backups before deletion
            
        Returns:
            Dictionary with deletion results
        """
        excel_files = self.find_excel_files()
        
        if not excel_files:
            logger.info(" No Excel files to delete")
            return {"deleted": 0, "failed": 0, "files": []}
        
        results = {"deleted": 0, "failed": 0, "files": []}
        
        for file_path in excel_files:
            if self.delete_excel_file(file_path, create_backup):
                results["deleted"] += 1
                results["files"].append({"name": file_path.name, "status": "deleted"})
            else:
                results["failed"] += 1
                results["files"].append({"name": file_path.name, "status": "failed"})
        
        logger.info(f" Cleanup complete - Deleted: {results['deleted']}, Failed: {results['failed']}")
        return results

    def delete_latest_excel_file(self, create_backup: bool = True) -> bool:
        """Delete only the most recently uploaded Excel file
        
        Args:
            create_backup: Whether to create a backup before deletion
            
        Returns:
            True if deletion successful, False otherwise
        """
        latest_file = self.get_latest_excel_file()
        
        if not latest_file:
            logger.info(" No Excel file to delete")
            return True
        
        return self.delete_excel_file(latest_file, create_backup)

    def clean_old_backups(self, days_old: int = 30) -> int:
        """Remove backup files older than specified days
        
        Args:
            days_old: Remove backups older than this many days
            
        Returns:
            Number of backups removed
        """
        backup_dir = self.data_folder / "backup"
        
        if not backup_dir.exists():
            logger.info(" No backup folder found")
            return 0
        
        current_time = datetime.now().timestamp()
        cutoff_time = current_time - (days_old * 24 * 60 * 60)
        
        removed_count = 0
        
        for backup_file in backup_dir.iterdir():
            if backup_file.is_file():
                file_time = backup_file.stat().st_mtime
                if file_time < cutoff_time:
                    try:
                        backup_file.unlink()
                        logger.info(f" Removed old backup: {backup_file.name}")
                        removed_count += 1
                    except Exception as e:
                        logger.error(f" Failed to remove backup {backup_file.name}: {str(e)}")
        
        if removed_count > 0:
            logger.info(f" Removed {removed_count} old backup files")
        else:
            logger.info(" No old backups to remove")
        
        return removed_count

def main():
    """Main function to delete the latest Excel file after processing"""
    try:
        logger.info(" Starting file cleanup process...")
        
        # Initialize cleanup utility
        cleanup = FileCleanup()
        
        # Delete the latest Excel file (the one that was just processed)
        success = cleanup.delete_latest_excel_file(create_backup=False)
        
        if success:
            logger.info(" File cleanup completed successfully!")
            
            # Optional: Clean old backups (older than 30 days)
            cleanup.clean_old_backups(days_old=30)
        else:
            logger.error(" File cleanup failed!")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f" Unexpected error in cleanup process: {str(e)}")
        return False

def delete_specific_file(filename: str):
    """Delete a specific Excel file by name
    
    Args:
        filename: Name of the file to delete
    """
    try:
        cleanup = FileCleanup()
        file_path = cleanup.data_folder / filename
        
        if file_path.exists() and file_path.suffix.lower() in ['.xlsx', '.xls', '.xlsm', '.xlsb']:
            success = cleanup.delete_excel_file(file_path, create_backup=True)
            if success:
                logger.info(f" Successfully deleted: {filename}")
            else:
                logger.error(f" Failed to delete: {filename}")
        else:
            logger.warning(f" File not found or not an Excel file: {filename}")
            
    except Exception as e:
        logger.error(f" Error deleting specific file: {str(e)}")

if __name__ == "__main__":
    main()