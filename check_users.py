import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'backend', 'instance', 'serverkit.db')
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
try:
    cursor.execute('SELECT username, email FROM users')
    users = cursor.fetchall()
    print(f"Found {len(users)} users:")
    for user in users:
        print(f"  - {user[0]} ({user[1]})")
    
    cursor.execute("SELECT key, value FROM system_settings WHERE key='setup_completed'")
    setup = cursor.fetchone()
    print(f"Setup completed: {setup[1] if setup else 'Not found'}")
except sqlite3.OperationalError as e:
    print(f"Error reading users: {e}")
finally:
    conn.close()
