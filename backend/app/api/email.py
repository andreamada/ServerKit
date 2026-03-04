from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User
from app.services.email_service import EmailService

email_bp = Blueprint('email', __name__)


def admin_required(fn):
    """Decorator to require admin role."""
    from functools import wraps

    @wraps(fn)
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


# ==========================================
# STATUS & CONFIG
# ==========================================

@email_bp.route('/status', methods=['GET'])
@jwt_required()
def get_email_status():
    """Get overall email server status."""
    status = EmailService.get_status()
    return jsonify(status), 200


@email_bp.route('/config', methods=['GET'])
@jwt_required()
@admin_required
def get_config():
    """Get email configuration."""
    config = EmailService.get_config()
    return jsonify(config), 200


@email_bp.route('/config', methods=['PUT'])
@jwt_required()
@admin_required
def update_config():
    """Update email configuration."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    result = EmailService.save_config(data)
    return jsonify(result), 200 if result['success'] else 400


# ==========================================
# POSTFIX
# ==========================================

@email_bp.route('/postfix/install', methods=['POST'])
@jwt_required()
@admin_required
def install_postfix():
    """Install Postfix."""
    result = EmailService.install_postfix()
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/postfix/config', methods=['GET'])
@jwt_required()
@admin_required
def get_postfix_config():
    """Get Postfix configuration."""
    result = EmailService.get_postfix_config()
    return jsonify(result), 200 if result.get('success') else 400


@email_bp.route('/postfix/config', methods=['PUT'])
@jwt_required()
@admin_required
def update_postfix_config():
    """Update Postfix configuration."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    result = EmailService.update_postfix_config(data)
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/queue', methods=['GET'])
@jwt_required()
@admin_required
def get_mail_queue():
    """Get mail queue."""
    result = EmailService.get_mail_queue()
    return jsonify(result), 200 if result.get('success') else 400


@email_bp.route('/queue/flush', methods=['POST'])
@jwt_required()
@admin_required
def flush_mail_queue():
    """Flush mail queue."""
    result = EmailService.flush_mail_queue()
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/queue/<queue_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_queued_message(queue_id):
    """Delete a message from the queue."""
    result = EmailService.delete_queued_message(queue_id)
    return jsonify(result), 200 if result['success'] else 400


# ==========================================
# DOVECOT
# ==========================================

@email_bp.route('/dovecot/install', methods=['POST'])
@jwt_required()
@admin_required
def install_dovecot():
    """Install Dovecot."""
    result = EmailService.install_dovecot()
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/dovecot/config', methods=['GET'])
@jwt_required()
@admin_required
def get_dovecot_config():
    """Get Dovecot configuration."""
    result = EmailService.get_dovecot_config()
    return jsonify(result), 200 if result.get('success') else 400


# ==========================================
# EMAIL ACCOUNTS
# ==========================================

@email_bp.route('/accounts', methods=['GET'])
@jwt_required()
@admin_required
def list_accounts():
    """List all email accounts."""
    accounts = EmailService.list_accounts()
    return jsonify({'accounts': accounts}), 200


@email_bp.route('/accounts', methods=['POST'])
@jwt_required()
@admin_required
def create_account():
    """Create a new email account."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['email', 'password', 'domain']
    for field in required:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    result = EmailService.create_account(
        email=data['email'],
        password=data['password'],
        domain=data['domain'],
        quota_mb=data.get('quota_mb', 1024)
    )
    return jsonify(result), 201 if result['success'] else 400


@email_bp.route('/accounts/<int:account_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_account(account_id):
    """Update an email account."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    result = EmailService.update_account(account_id, **data)
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/accounts/<int:account_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_account(account_id):
    """Delete an email account."""
    result = EmailService.delete_account(account_id)
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/accounts/<int:account_id>/forwarding', methods=['PUT'])
@jwt_required()
@admin_required
def set_forwarding(account_id):
    """Set forwarding for an email account."""
    data = request.get_json()
    if not data or 'forward_to' not in data:
        return jsonify({'error': 'forward_to is required'}), 400

    result = EmailService.set_forwarding(
        account_id,
        forward_to=data['forward_to'],
        keep_copy=data.get('keep_copy', True)
    )
    return jsonify(result), 200 if result['success'] else 400


# ==========================================
# SPAMASSASSIN
# ==========================================

@email_bp.route('/spamassassin/install', methods=['POST'])
@jwt_required()
@admin_required
def install_spamassassin():
    """Install SpamAssassin."""
    result = EmailService.install_spamassassin()
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/spamassassin/config', methods=['GET'])
@jwt_required()
@admin_required
def get_spamassassin_config():
    """Get SpamAssassin configuration."""
    result = EmailService.get_spamassassin_config()
    return jsonify(result), 200 if result.get('success') else 400


@email_bp.route('/spamassassin/config', methods=['PUT'])
@jwt_required()
@admin_required
def update_spamassassin_config():
    """Update SpamAssassin configuration."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    result = EmailService.update_spamassassin_config(data)
    return jsonify(result), 200 if result['success'] else 400


# ==========================================
# DKIM / SPF / DMARC
# ==========================================

@email_bp.route('/dkim/install', methods=['POST'])
@jwt_required()
@admin_required
def install_dkim():
    """Install OpenDKIM."""
    result = EmailService.install_dkim()
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/dkim/generate', methods=['POST'])
@jwt_required()
@admin_required
def generate_dkim_key():
    """Generate DKIM key for a domain."""
    data = request.get_json()
    if not data or 'domain' not in data:
        return jsonify({'error': 'domain is required'}), 400

    result = EmailService.generate_dkim_key(
        domain=data['domain'],
        selector=data.get('selector', 'mail')
    )
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/dns/<domain>', methods=['GET'])
@jwt_required()
@admin_required
def get_dns_records(domain):
    """Get recommended DNS records for a domain."""
    result = EmailService.get_dns_records(domain)
    return jsonify(result), 200 if result['success'] else 400


# ==========================================
# SERVICE CONTROL
# ==========================================

@email_bp.route('/services/<service>/start', methods=['POST'])
@jwt_required()
@admin_required
def start_service(service):
    """Start an email service."""
    result = EmailService.start_service(service)
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/services/<service>/stop', methods=['POST'])
@jwt_required()
@admin_required
def stop_service(service):
    """Stop an email service."""
    result = EmailService.stop_service(service)
    return jsonify(result), 200 if result['success'] else 400


@email_bp.route('/services/<service>/restart', methods=['POST'])
@jwt_required()
@admin_required
def restart_service(service):
    """Restart an email service."""
    result = EmailService.restart_service(service)
    return jsonify(result), 200 if result['success'] else 400


# ==========================================
# WEBMAIL
# ==========================================

@email_bp.route('/webmail/status', methods=['GET'])
@jwt_required()
def get_webmail_status():
    """Get webmail installation status."""
    status = EmailService.get_webmail_status()
    return jsonify(status), 200


@email_bp.route('/webmail/install', methods=['POST'])
@jwt_required()
@admin_required
def install_webmail():
    """Install Roundcube webmail."""
    result = EmailService.install_webmail()
    return jsonify(result), 200 if result['success'] else 400


# ==========================================
# LOGS
# ==========================================

@email_bp.route('/logs', methods=['GET'])
@jwt_required()
@admin_required
def get_mail_logs():
    """Get mail logs."""
    lines = request.args.get('lines', 100, type=int)
    result = EmailService.get_mail_log(lines=lines)
    return jsonify(result), 200
