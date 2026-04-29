import os
import sys
import warnings
from datetime import timedelta

# Get base directory of the backend
basedir = os.path.abspath(os.path.dirname(__file__))

# Default insecure keys that must be changed in production
INSECURE_SECRET_KEYS = [
    'dev-secret-key-change-in-production',
    'jwt-secret-key-change-in-production',
    'change-this-to-a-secure-random-string',
    'change-this-to-another-secure-random-string',
]


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Database - use instance folder for Flask convention
    # If DATABASE_URL is not set, use a local sqlite database in the instance folder
    default_db_path = os.path.join(basedir, 'instance', 'serverkit.db')
    
    # Ensure instance directory exists
    os.makedirs(os.path.dirname(default_db_path), exist_ok=True)
    
    db_url = os.environ.get('DATABASE_URL')
    if db_url and db_url.startswith('sqlite:///'):
        # Convert relative SQLite paths to absolute to avoid CWD issues in different environments
        sqlite_path = db_url.replace('sqlite:///', '')
        if not os.path.isabs(sqlite_path):
            db_url = f'sqlite:///{os.path.abspath(os.path.join(basedir, sqlite_path))}'
        
        # Ensure the directory for the provided SQLite path exists
        actual_db_path = db_url.replace('sqlite:///', '')
        os.makedirs(os.path.dirname(actual_db_path), exist_ok=True)
            
    SQLALCHEMY_DATABASE_URI = db_url or f'sqlite:///{default_db_path}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Use DELETE journal mode: no /dev/shm dependency, works in all container environments.
    # WAL mode can fail with "attempt to write a readonly database" when /dev/shm is
    # restricted (common on some VPS/container providers).
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'check_same_thread': False},
        'pool_pre_ping': True,
    }

    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # CORS - Allow both dev server and Flask server
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5274,http://localhost:5000,http://localhost:5001,http://127.0.0.1:5173,http://127.0.0.1:5274,http://127.0.0.1:5000,http://127.0.0.1:5001').split(',')


class DevelopmentConfig(Config):
    DEBUG = True

    @classmethod
    def init_app(cls, app):
        if app.config.get('SECRET_KEY') == 'dev-secret-key-change-in-production':
            warnings.warn('WARNING: Using default SECRET_KEY. Change before deploying.')
        if app.config.get('JWT_SECRET_KEY') == 'jwt-secret-key-change-in-production':
            warnings.warn('WARNING: Using default JWT_SECRET_KEY. Change before deploying.')


class TestingConfig(Config):
    """Config for pytest and other automated tests."""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:')
    # Reduce noise during tests
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


class ProductionConfig(Config):
    DEBUG = False

    # Secure session cookies in production
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

    def __init__(self):
        # Validate that secret keys are not default values in production
        if self.SECRET_KEY in INSECURE_SECRET_KEYS:
            print("FATAL: SECRET_KEY is set to a default insecure value in production mode!", file=sys.stderr)
            print("Generate a secure key with: python -c \"import secrets; print(secrets.token_hex(32))\"", file=sys.stderr)
            sys.exit(1)

        if self.JWT_SECRET_KEY in INSECURE_SECRET_KEYS:
            print("FATAL: JWT_SECRET_KEY is set to a default insecure value in production mode!", file=sys.stderr)
            print("Generate a secure key with: python -c \"import secrets; print(secrets.token_hex(32))\"", file=sys.stderr)
            sys.exit(1)

    @classmethod
    def init_app(cls, app):
        """Validate production configuration."""
        insecure_keys = ['dev-secret-key-change-in-production', 'jwt-secret-key-change-in-production']
        if app.config['SECRET_KEY'] in insecure_keys:
            raise ValueError('CRITICAL: SECRET_KEY must be changed for production deployment')
        if app.config['JWT_SECRET_KEY'] in insecure_keys:
            raise ValueError('CRITICAL: JWT_SECRET_KEY must be changed for production deployment')
        # Validate CORS origins
        cors_raw = os.environ.get('CORS_ORIGINS', '')
        cors_origins = [o.strip() for o in cors_raw.split(',') if o.strip()]
        if not cors_origins:
            raise ValueError('CORS_ORIGINS must be explicitly set in production')
        app.config['CORS_ORIGINS'] = cors_origins


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
