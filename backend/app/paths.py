import os

# Base directories (override via env vars; defaults = production)
SERVERKIT_DIR = os.environ.get('SERVERKIT_DIR', '/var/serverkit')
SERVERKIT_CONFIG_DIR = os.environ.get('SERVERKIT_CONFIG_DIR', '/etc/serverkit')
SERVERKIT_LOG_DIR = os.environ.get('SERVERKIT_LOG_DIR', '/var/log/serverkit')
SERVERKIT_BACKUP_DIR = os.environ.get('SERVERKIT_BACKUP_DIR', '/var/backups/serverkit')
SERVERKIT_CACHE_DIR = os.environ.get('SERVERKIT_CACHE_DIR', '/var/cache/serverkit')
SERVERKIT_QUARANTINE_DIR = os.environ.get('SERVERKIT_QUARANTINE_DIR', '/var/quarantine')

# Derived paths
APPS_DIR = os.path.join(SERVERKIT_DIR, 'apps')
DEPLOYMENTS_DIR = os.path.join(SERVERKIT_DIR, 'deployments')
TEMPLATES_DIR = os.path.join(SERVERKIT_CONFIG_DIR, 'templates')
BUILD_LOG_DIR = os.path.join(SERVERKIT_LOG_DIR, 'builds')
BUILD_CACHE_DIR = os.path.join(SERVERKIT_CACHE_DIR, 'builds')
DB_BACKUP_DIR = os.path.join(SERVERKIT_BACKUP_DIR, 'databases')
WP_BACKUP_DIR = os.path.join(SERVERKIT_BACKUP_DIR, 'wordpress')
SNAPSHOT_DIR = os.path.join(SERVERKIT_BACKUP_DIR, 'snapshots')

# Email / Mail server paths
VMAIL_DIR = os.environ.get('VMAIL_DIR', '/var/vmail')
VMAIL_UID = 5000
VMAIL_GID = 5000
EMAIL_CONFIG_DIR = os.path.join(SERVERKIT_CONFIG_DIR, 'email')


def ensure_paths():
    """Ensure all required directories exist."""
    paths = [
        SERVERKIT_DIR,
        SERVERKIT_CONFIG_DIR,
        SERVERKIT_LOG_DIR,
        SERVERKIT_BACKUP_DIR,
        SERVERKIT_CACHE_DIR,
        SERVERKIT_QUARANTINE_DIR,
        APPS_DIR,
        DEPLOYMENTS_DIR,
        TEMPLATES_DIR,
        BUILD_LOG_DIR,
        BUILD_CACHE_DIR,
        DB_BACKUP_DIR,
        WP_BACKUP_DIR,
        SNAPSHOT_DIR,
        EMAIL_CONFIG_DIR
    ]
    for path in paths:
        try:
            os.makedirs(path, exist_ok=True)
        except Exception as e:
            # If it's a permission error on an absolute path like /var/serverkit,
            # we just log it. In production, these should be created by setup scripts.
            print(f"Warning: Could not create directory {path}: {e}")
