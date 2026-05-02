"""Service for system settings operations."""
from app import db
from app.models import SystemSettings, User


class SettingsService:
    """Service for managing system settings."""

    # Default settings with their types and descriptions
    DEFAULT_SETTINGS = {
        'setup_completed': {
            'value': False,
            'type': 'boolean',
            'description': 'Whether initial setup has been completed'
        },
        'registration_enabled': {
            'value': False,
            'type': 'boolean',
            'description': 'Allow public user registration'
        },
        'instance_name': {
            'value': 'ServerKit',
            'type': 'string',
            'description': 'Name of this ServerKit instance'
        },
        'audit_log_retention_days': {
            'value': 90,
            'type': 'integer',
            'description': 'Number of days to retain audit logs'
        },
        'onboarding_use_cases': {
            'value': [],
            'type': 'json',
            'description': 'Use cases selected during onboarding wizard'
        },
        'dev_mode': {
            'value': False,
            'type': 'boolean',
            'description': 'Enable developer mode for debugging tools and icon reference'
        },
        # SSO / OAuth settings
        'sso_google_enabled': {'value': False, 'type': 'boolean', 'description': 'Enable Google OAuth login'},
        'sso_google_client_id': {'value': '', 'type': 'string', 'description': 'Google OAuth client ID'},
        'sso_google_client_secret': {'value': '', 'type': 'string', 'description': 'Google OAuth client secret'},
        'sso_github_enabled': {'value': False, 'type': 'boolean', 'description': 'Enable GitHub OAuth login'},
        'sso_github_client_id': {'value': '', 'type': 'string', 'description': 'GitHub OAuth client ID'},
        'sso_github_client_secret': {'value': '', 'type': 'string', 'description': 'GitHub OAuth client secret'},
        'sso_oidc_enabled': {'value': False, 'type': 'boolean', 'description': 'Enable generic OIDC login'},
        'sso_oidc_provider_name': {'value': '', 'type': 'string', 'description': 'OIDC provider display name'},
        'sso_oidc_client_id': {'value': '', 'type': 'string', 'description': 'OIDC client ID'},
        'sso_oidc_client_secret': {'value': '', 'type': 'string', 'description': 'OIDC client secret'},
        'sso_oidc_discovery_url': {'value': '', 'type': 'string', 'description': 'OIDC discovery URL'},
        'sso_saml_enabled': {'value': False, 'type': 'boolean', 'description': 'Enable SAML 2.0 login'},
        'sso_saml_entity_id': {'value': '', 'type': 'string', 'description': 'SAML SP entity ID'},
        'sso_saml_idp_metadata_url': {'value': '', 'type': 'string', 'description': 'SAML IdP metadata URL'},
        'sso_saml_idp_sso_url': {'value': '', 'type': 'string', 'description': 'SAML IdP SSO URL'},
        'sso_saml_idp_cert': {'value': '', 'type': 'string', 'description': 'SAML IdP certificate (PEM)'},
        'sso_auto_provision': {'value': True, 'type': 'boolean', 'description': 'Auto-create users on first SSO login'},
        'sso_default_role': {'value': 'developer', 'type': 'string', 'description': 'Default role for SSO-provisioned users'},
        'sso_force_sso': {'value': False, 'type': 'boolean', 'description': 'Disable password login (SSO only)'},
        'sso_allowed_domains': {'value': [], 'type': 'json', 'description': 'Restrict SSO to these email domains'},
        # Rate limiting settings
        'rate_limit_standard': {'value': '100 per minute', 'type': 'string', 'description': 'Rate limit for standard API keys'},
        'rate_limit_elevated': {'value': '500 per minute', 'type': 'string', 'description': 'Rate limit for elevated API keys'},
        'rate_limit_unlimited': {'value': '5000 per minute', 'type': 'string', 'description': 'Rate limit for unlimited API keys'},
        'rate_limit_unauthenticated': {'value': '30 per minute', 'type': 'string', 'description': 'Rate limit for unauthenticated requests'},
        # Company Settings (WaaS)
        'company_currency': {'value': 'USD', 'type': 'string', 'description': 'Default currency for the platform'},
        'company_name': {'value': '', 'type': 'string', 'description': 'Legal name of the company'},
        'company_address': {'value': '', 'type': 'string', 'description': 'Business address'},
        'company_city': {'value': '', 'type': 'string', 'description': 'Business city'},
        'company_phone': {'value': '', 'type': 'string', 'description': 'Business contact phone'},
        'company_email': {'value': '', 'type': 'string', 'description': 'Business contact email'},
        'company_vat_id': {'value': '', 'type': 'string', 'description': 'Company VAT/Tax ID'},
        'tax_enabled': {'value': False, 'type': 'boolean', 'description': 'Enable tax management'},
        'tax_name': {'value': 'VAT', 'type': 'string', 'description': 'Name of the tax (e.g., VAT, GST)'},
        'tax_amount': {'value': '0', 'type': 'string', 'description': 'Tax amount in percentage'},
        # Platform mode
        'platform_mode': {
            'value': 'saas',
            'type': 'string',
            'description': "Platform delivery model: 'saas' (Software as a Service — deploys apps) or 'waas' (Website as a Service — deploys WordPress sites)"
        },
        # Site configuration
        'default_domain': {'value': '', 'type': 'string', 'description': 'Default domain for the panel (e.g. panel.example.com)'},
        'license_key': {'value': '', 'type': 'string', 'description': 'ServerKit license key'},
        'default_language': {'value': 'en', 'type': 'string', 'description': 'Default interface language code'},
        'session_timeout_minutes': {'value': 120, 'type': 'integer', 'description': 'Inactivity timeout in minutes before users are logged out'},
        # Privacy & GDPR
        'gdpr_retention_logs': {'value': 2555, 'type': 'integer', 'description': 'Server log retention in days'},
        'gdpr_retention_user_data': {'value': 730, 'type': 'integer', 'description': 'User account data retention in days'},
        'gdpr_retention_audit_logs': {'value': 90, 'type': 'integer', 'description': 'Audit log retention in days'},
        'gdpr_retention_backups': {'value': 365, 'type': 'integer', 'description': 'Backup data retention in days'},
        'gdpr_retention_sessions': {'value': 7, 'type': 'integer', 'description': 'Session data retention in days'},
        'gdpr_grace_period_days': {'value': 7, 'type': 'integer', 'description': 'Days users can cancel account deletion request'},
        'gdpr_export_cooldown_hours': {'value': 24, 'type': 'integer', 'description': 'Minimum hours between data export requests'},
        'gdpr_cookie_consent': {'value': False, 'type': 'boolean', 'description': 'Show cookie consent banner to visitors'},
        'gdpr_allow_export': {'value': True, 'type': 'boolean', 'description': 'Allow users to export their personal data'},
        'gdpr_allow_deletion': {'value': False, 'type': 'boolean', 'description': 'Allow users to delete their own accounts'},
        # Payment Gateways
        'payment_bank_enabled': {'value': False, 'type': 'boolean', 'description': 'Enable bank transfer payment method'},
        'payment_bank_instructions': {'value': '', 'type': 'string', 'description': 'Bank transfer payment instructions shown to users'},
        'payment_paypal_enabled': {'value': False, 'type': 'boolean', 'description': 'Enable PayPal payment gateway'},
        'payment_paypal_client_id': {'value': '', 'type': 'string', 'description': 'PayPal OAuth client ID'},
        'payment_paypal_client_secret': {'value': '', 'type': 'string', 'description': 'PayPal OAuth client secret'},
        'payment_paypal_webhook_id': {'value': '', 'type': 'string', 'description': 'PayPal webhook ID'},
        'payment_paypal_sandbox': {'value': True, 'type': 'boolean', 'description': 'Use PayPal sandbox (test) environment'},
        'payment_stripe_enabled': {'value': False, 'type': 'boolean', 'description': 'Enable Stripe payment gateway'},
        'payment_stripe_secret_key': {'value': '', 'type': 'string', 'description': 'Stripe secret API key'},
        'payment_stripe_webhook_secret': {'value': '', 'type': 'string', 'description': 'Stripe webhook signing secret'},
        'payment_tap_enabled': {'value': False, 'type': 'boolean', 'description': 'Enable Tap payment gateway'},
        'payment_tap_environment': {'value': 'sandbox', 'type': 'string', 'description': 'Tap environment: sandbox or production'},
        'payment_tap_merchant_id': {'value': '', 'type': 'string', 'description': 'Tap merchant ID'},
        'payment_tap_test_public_key': {'value': '', 'type': 'string', 'description': 'Tap test public key'},
        'payment_tap_test_secret_key': {'value': '', 'type': 'string', 'description': 'Tap test secret key'},
    }

    @staticmethod
    def get(key, default=None):
        """Get a setting value by key."""
        return SystemSettings.get(key, default)

    @staticmethod
    def set(key, value, user_id=None):
        """Set a setting value by key."""
        # Get the expected type from defaults
        default_config = SettingsService.DEFAULT_SETTINGS.get(key, {})
        value_type = default_config.get('type', 'string')
        description = default_config.get('description')

        setting = SystemSettings.set(
            key=key,
            value=value,
            value_type=value_type,
            description=description,
            user_id=user_id
        )
        db.session.commit()
        return setting

    @staticmethod
    def get_all():
        """Get all settings as a dictionary."""
        settings = SystemSettings.query.all()
        result = {}
        for setting in settings:
            result[setting.key] = setting.get_typed_value()
        return result

    @staticmethod
    def get_all_with_metadata():
        """Get all settings with full metadata."""
        settings = SystemSettings.query.all()
        return [setting.to_dict() for setting in settings]

    @staticmethod
    def initialize_defaults():
        """Initialize default settings if they don't exist."""
        for key, config in SettingsService.DEFAULT_SETTINGS.items():
            existing = SystemSettings.query.filter_by(key=key).first()
            if not existing:
                SystemSettings.set(
                    key=key,
                    value=config['value'],
                    value_type=config['type'],
                    description=config['description']
                )
        db.session.commit()

    @staticmethod
    def needs_setup():
        """Check if initial setup is needed."""
        from app.models.user import User
        user_count = User.query.count()
        if user_count == 0:
            return True
        setup_completed = SettingsService.get('setup_completed', False)
        if setup_completed:
            return False  # Once completed, never re-enable without admin action
        return True

    @staticmethod
    def complete_setup(user_id=None):
        """Mark the initial setup as completed."""
        SettingsService.set('setup_completed', True, user_id=user_id)

    @staticmethod
    def is_registration_enabled():
        """Check if public registration is enabled."""
        # If no users exist, always allow registration (for first user)
        user_count = User.query.count()
        if user_count == 0:
            return True
        return SettingsService.get('registration_enabled', False)

    @staticmethod
    def set_registration_enabled(enabled, user_id=None):
        """Enable or disable public registration."""
        SettingsService.set('registration_enabled', enabled, user_id=user_id)

    @staticmethod
    def migrate_legacy_roles():
        """Migrate users with 'user' role to 'developer' role."""
        try:
            users_to_migrate = User.query.filter_by(role='user').all()
            count = 0
            for user in users_to_migrate:
                user.role = User.ROLE_DEVELOPER
                count += 1
            if count > 0:
                db.session.commit()
            return count
        except Exception:
            db.session.rollback()
            return 0

    @staticmethod
    def ensure_admin_exists():
        """
        Check if at least one admin exists.
        If users exist but no admins, something is wrong.
        """
        admin_count = User.query.filter_by(role=User.ROLE_ADMIN).count()
        user_count = User.query.count()
        return admin_count > 0 or user_count == 0
