import os
import sys

# Add backend to path so we can import config
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_dir)

from config import Config
import sqlite3

db_uri = Config.SQLALCHEMY_DATABASE_URI
db_path = db_uri.replace('sqlite:///', '')

print(f"Checking database at: {db_path}")

if not os.path.exists(db_path):
    print("Database file does not exist!")
    sys.exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT count(*) FROM users")
    user_count = cursor.fetchone()[0]
    print(f"User count: {user_count}")
    
    cursor.execute("SELECT username FROM users")
    users = cursor.fetchall()
    print(f"Users: {users}")
    
    cursor.execute("SELECT key, value FROM system_settings WHERE key='setup_completed'")
    setup = cursor.fetchone()
    print(f"setup_completed: {setup}")
    
    cursor.execute("SELECT key, value FROM system_settings WHERE key='registration_enabled'")
    reg = cursor.fetchone()
    print(f"registration_enabled: {reg}")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
