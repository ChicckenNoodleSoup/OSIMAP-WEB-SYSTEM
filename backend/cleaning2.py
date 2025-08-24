import os
import pandas as pd
import mysql.connector
from mysql.connector import Error

# ==============================
# CONFIGURATION
# ==============================
DATA_FOLDER = "./data"  # folder containing Excel files
DB_CONFIG = {
    "host": "localhost",
    "port": 3309,  # custom MySQL port
    "user": "root",
    "password": "root",
    "database": "_test excel to sql"  # ⚠ Make sure no spaces in DB name
}
TABLE_NAME = "accidents"

required_cols = ["barangay", "dateCommitted", "timeCommitted", "lat", "lng", "offense"]

# ==============================
# STEP 1: FIND AND READ EXCEL FILES
# ==============================
excel_files = [f for f in os.listdir(DATA_FOLDER) if f.endswith(".xlsx")]

if not excel_files:
    print("❌ No Excel files found in the data folder.")
    exit(1)

print(f"📂 Found {len(excel_files)} Excel file(s): {excel_files}")

all_data = []

for file in excel_files:
    path = os.path.join(DATA_FOLDER, file)
    print(f"\n📥 Processing file: {file}")
    all_sheets = pd.read_excel(path, sheet_name=None)

    for sheet_name, df in all_sheets.items():
        print(f"  - Sheet: {sheet_name} ({len(df)} rows)")
        if not set(required_cols).issubset(df.columns):
            print(f"    ⚠ Skipping sheet '{sheet_name}' — missing required columns.")
            continue

        df = df[required_cols]
        df = df.dropna(subset=required_cols)
        df["dateCommitted"] = pd.to_datetime(df["dateCommitted"], errors="coerce")
        df = df.dropna(subset=["dateCommitted"])
        df = df.sort_values(by="dateCommitted").reset_index(drop=True)

        print(f"    ✅ Cleaned data: {len(df)} rows remain.")
        all_data.append(df)

if not all_data:
    print("❌ No valid data found in any Excel files.")
    exit(1)

df_all = pd.concat(all_data, ignore_index=True)
df_all = df_all.sort_values(by="dateCommitted").reset_index(drop=True)

print(f"\n📊 Combined data has {len(df_all)} rows.")
print(f"📅 Year range: {df_all['dateCommitted'].dt.year.min()} - {df_all['dateCommitted'].dt.year.max()}")

# ==============================
# STEP 2: CREATE TABLE IF NOT EXISTS
# ==============================
create_table_query = f"""
CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    barangay VARCHAR(255),
    dateCommitted DATE,
    timeCommitted TIME,
    lat DOUBLE,
    lng DOUBLE,
    offense TEXT,
    UNIQUE KEY unique_accident (barangay, dateCommitted, timeCommitted, lat, lng, offense(255))
);
"""

# ==============================
# STEP 3: INSERT INTO DATABASE
# ==============================
try:
    connection = mysql.connector.connect(**DB_CONFIG)
    cursor = connection.cursor()

    print("\n🔗 Connecting to MySQL and creating table if not exists...")
    cursor.execute(create_table_query)

    insert_query = f"""
    INSERT IGNORE INTO {TABLE_NAME}
    (barangay, dateCommitted, timeCommitted, lat, lng, offense)
    VALUES (%s, %s, %s, %s, %s, %s)
    """

    rows_inserted = 0
    for _, row in df_all.iterrows():
        cursor.execute(insert_query, (
            row["barangay"],
            row["dateCommitted"].date(),
            row["timeCommitted"] if pd.notna(row["timeCommitted"]) else None,
            float(row["lat"]),
            float(row["lng"]),
            row["offense"]
        ))
        rows_inserted += cursor.rowcount

    connection.commit()
    print(f"✅ Successfully inserted {rows_inserted} new records into `{TABLE_NAME}`.")

except Error as e:
    print(f"❌ MySQL Error: {e}")

finally:
    if 'connection' in locals() and connection.is_connected():
        cursor.close()
        connection.close()
        print("🔌 MySQL connection closed.")