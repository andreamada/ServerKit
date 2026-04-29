import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'backend', 'instance', 'serverkit.db')
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
try:
    cursor.execute('DELETE FROM users')
    cursor.execute("DELETE FROM system_settings WHERE key='setup_completed'")
    conn.commit()
    print("Database cleared. You can now register as the first user.")
except sqlite3.OperationalError as e:
    print(f"Error clearing database: {e}")
finally:
    conn.close()
