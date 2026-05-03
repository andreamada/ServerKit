"""WordPress WaaS Template API endpoints."""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User
from app.services.wp_template_service import WpTemplateService

wp_templates_bp = Blueprint('wp_templates', __name__)


def admin_required(fn):
    from functools import wraps

    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


# ── Browse ────────────────────────────────────────────────────────────────────

@wp_templates_bp.route('/', methods=['GET'])
@jwt_required()
def list_templates():
    category = request.args.get('category')
    search = request.args.get('search')
    templates = WpTemplateService.list_templates(category=category, search=search)
    return jsonify({'templates': templates, 'count': len(templates)}), 200


@wp_templates_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    return jsonify({'categories': WpTemplateService.get_categories()}), 200


@wp_templates_bp.route('/<template_id>', methods=['GET'])
@jwt_required()
def get_template(template_id):
    result = WpTemplateService.get_template(template_id)
    return jsonify(result), 200 if result.get('success') else 404


# ── CRUD (admin) ──────────────────────────────────────────────────────────────

@wp_templates_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required
def create_template():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    result = WpTemplateService.create_template(data)
    return jsonify(result), 201 if result.get('success') else 400


@wp_templates_bp.route('/<template_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_template(template_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    result = WpTemplateService.update_template(template_id, data)
    return jsonify(result), 200 if result.get('success') else 400


@wp_templates_bp.route('/<template_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_template(template_id):
    result = WpTemplateService.delete_template(template_id)
    return jsonify(result), 200 if result.get('success') else 404


@wp_templates_bp.route('/<template_id>/raw', methods=['GET'])
@jwt_required()
@admin_required
def get_template_raw(template_id):
    result = WpTemplateService.get_template_raw(template_id)
    return jsonify(result), 200 if result.get('success') else 404


@wp_templates_bp.route('/<template_id>/preview-status', methods=['GET'])
@jwt_required()
def get_preview_status(template_id):
    return jsonify(WpTemplateService.get_preview_status(template_id)), 200


# ── Create from backup ────────────────────────────────────────────────────────

@wp_templates_bp.route('/from-backup', methods=['POST'])
@jwt_required()
@admin_required
def create_from_backup():
    user_id = get_jwt_identity()
    name = request.form.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    backup_file = request.files.get('backup_file')
    if not backup_file:
        return jsonify({'error': 'Backup file is required'}), 400

    result = WpTemplateService.create_from_backup(
        name=name,
        description=request.form.get('description', ''),
        category=request.form.get('category', 'general'),
        version=request.form.get('version', '1.0.0'),
        theme_name=request.form.get('theme_name', ''),
        theme_slug=request.form.get('theme_slug', ''),
        plugins=request.form.get('plugins', ''),
        featured=request.form.get('featured', '0') in ('1', 'true', 'True'),
        backup_file=backup_file,
        db_file=request.files.get('db_file'),
        user_id=user_id,
    )
    return jsonify(result), 201 if result.get('success') else 400


# ── Custom categories ─────────────────────────────────────────────────────────

@wp_templates_bp.route('/categories/custom', methods=['GET'])
@jwt_required()
def get_custom_categories():
    return jsonify({'categories': WpTemplateService.get_custom_categories()}), 200


@wp_templates_bp.route('/categories/custom', methods=['POST'])
@jwt_required()
@admin_required
def add_custom_category():
    data = request.get_json() or {}
    result = WpTemplateService.add_custom_category(data.get('name', ''))
    return jsonify(result), 201 if result.get('success') else 400


@wp_templates_bp.route('/categories/custom/<name>', methods=['DELETE'])
@jwt_required()
@admin_required
def remove_custom_category(name):
    result = WpTemplateService.remove_custom_category(name)
    return jsonify(result), 200 if result.get('success') else 404
