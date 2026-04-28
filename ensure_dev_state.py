import sqlite3
import os
import werkzeug.security

db_path = os.path.join(os.path.dirname(__file__), 'backend', 'instance', 'serverkit.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

password_hash = werkzeug.security.generate_password_hash('admin1234')

try:
    # Ensure admin user exists and has a known password
    cursor.execute("SELECT id FROM users WHERE username='admin'")
    user = cursor.fetchone()
    if user:
        cursor.execute("UPDATE users SET password_hash=?, role='admin' WHERE username='admin'", (password_hash,))
        print("Updated existing admin user password to: admin1234")
    else:
        cursor.execute("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", 
                      ('admin', 'admin@admin.com', password_hash, 'admin'))
        print("Created new admin user with password: admin1234")
    
    # Force setup as completed and enable registration for dev
    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value, value_type) VALUES ('setup_completed', 'true', 'boolean')")
    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value, value_type) VALUES ('registration_enabled', 'true', 'boolean')")
    
    conn.commit()
    print("Persistence guaranteed: Admin user ready and setup marked as complete.")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
