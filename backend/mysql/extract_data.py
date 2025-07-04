'''
Retrieve restaurant data from clean_copy.sqlite and save it on MySQL
'''
import sqlite3
from pathlib import Path
from dotenv import load_dotenv
import os
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("SQL_URL")
engine = create_engine(DATABASE_URL)

# __file__ is the path of the currently running script
# .resolve() makes it an absolute path
# .parent gives the directory the script is in
script_dir = Path(__file__).resolve().parent
db_path = script_dir.parent / "clean_copy.sqlite"  # Assumes file is next to the script

if not db_path.exists():
    raise FileNotFoundError(f"Database not found at: {db_path}")

# Connect
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

cursor.execute("SELECT r_id, name, type, address, lat, lon FROM restaurants")
rows = cursor.fetchall()

insert_query = text("""
INSERT IGNORE INTO Restaurant (
    restaurant_id, name, cuisine_type, location,
    menu_list, state_id, latitude, longitude
) VALUES (:restaurant_id, :name, :cuisine_type, :location,
          :menu_list, :state_id, :latitude, :longitude)
""")

with engine.connect() as conn:
    for row in rows:
        r_id, name, cuisine_type, location, lat, lon = row

        conn.execute(insert_query, {
            "restaurant_id": r_id,
            "name": name,
            "cuisine_type": cuisine_type,
            "location": location,
            "menu_list": None,     # or default value
            "state_id": None,      # or default value
            "latitude": lat,
            "longitude": lon
        })
    conn.commit()

# Close SQLite connection
conn.close()