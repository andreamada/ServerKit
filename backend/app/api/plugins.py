"""
Plugins API - Install, manage, and uninstall ServerKit plugins.

Supports installing plugins from:
  - GitHub repo URLs (resolves latest release automatically)
  - GitHub release URLs (specific version)
  - Direct zip download URLs
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.audit_service import AuditService
from app.models.audit_log import AuditLog

plugins_bp = Blueprint('plugins', __name__)


def get_current_user():
    from flask_jwt_extended import get_jwt_identity
    from app.models.user import User
    return User.query.get(get_jwt_identity())


@plugins_bp.route('/', methods=['GET'])
@jwt_required()
def list_plugins():
    """List all installed plugins."""
    from app.services.plugin_service import list_plugins
    status = request.args.get('status')
    plugins = list_plugins(status=status)
    return jsonify({'plugins': [p.to_dict() for p in plugins]})


@plugins_bp.route('/<int:plugin_id>', methods=['GET'])
@jwt_required()
def get_plugin(plugin_id):
    """Get details of an installed plugin."""
    from app.services.plugin_service import get_plugin
    plugin = get_plugin(plugin_id)
    if not plugin:
        return jsonify({'error': 'Plugin not found'}), 404
    return jsonify(plugin.to_dict())


@plugins_bp.route('/install', methods=['POST'])
@jwt_required()
def install_plugin():
    """Install a plugin from a URL.

    Body: { "url": "https://github.com/user/repo" }

    Accepts:
      - GitHub repo URL (downloads latest release)
      - GitHub release URL (specific version)
      - Direct .zip URL
    """
    user = get_current_user()
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'url required'}), 400

    url = data['url'].strip()
    if not url:
        return jsonify({'error': 'url cannot be empty'}), 400

    from app.services.plugin_service import install_from_url
    try:
        plugin = install_from_url(url, user_id=user.id)
        AuditService.log(
            action=AuditLog.ACTION_RESOURCE_CREATE,
            user_id=user.id,
            target_type='plugin',
            target_id=plugin.id,
            details={'name': plugin.name, 'version': plugin.version, 'url': url}
        )
        return jsonify(plugin.to_dict()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Installation failed: {e}'}), 500


@plugins_bp.route('/<int:plugin_id>', methods=['DELETE'])
@jwt_required()
def uninstall_plugin(plugin_id):
    """Uninstall a plugin (removes files and DB record)."""
    user = get_current_user()
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    from app.services.plugin_service import uninstall_plugin, get_plugin
    plugin = get_plugin(plugin_id)
    if not plugin:
        return jsonify({'error': 'Plugin not found'}), 404

    plugin_name = plugin.name
    uninstall_plugin(plugin_id)

    AuditService.log(
        action=AuditLog.ACTION_RESOURCE_DELETE,
        user_id=user.id,
        target_type='plugin',
        target_id=plugin_id,
        details={'name': plugin_name}
    )
    return jsonify({'message': f'Plugin {plugin_name} uninstalled. Restart to fully unload backend routes.'})


@plugins_bp.route('/<int:plugin_id>/enable', methods=['POST'])
@jwt_required()
def enable_plugin(plugin_id):
    """Enable a disabled plugin."""
    user = get_current_user()
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    from app.services.plugin_service import enable_plugin
    plugin = enable_plugin(plugin_id)
    if not plugin:
        return jsonify({'error': 'Plugin not found'}), 404
    return jsonify(plugin.to_dict())


@plugins_bp.route('/<int:plugin_id>/disable', methods=['POST'])
@jwt_required()
def disable_plugin(plugin_id):
    """Disable a plugin without removing it."""
    user = get_current_user()
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    from app.services.plugin_service import disable_plugin
    plugin = disable_plugin(plugin_id)
    if not plugin:
        return jsonify({'error': 'Plugin not found'}), 404
    return jsonify(plugin.to_dict())
