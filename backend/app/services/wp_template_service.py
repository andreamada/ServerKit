"""WordPress WaaS Template Service — manages site-design templates for WordPress deployments."""

import os
import re
import json
import yaml
from typing import Dict, List, Optional
from app import paths


class WpTemplateService:
    # Bundled templates ship with the codebase
    BUNDLED_DIR = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        'wp-templates'
    )
    # On Linux/production use /etc/serverkit; on Windows dev use a local project directory
    _config_base = (
        paths.SERVERKIT_CONFIG_DIR if os.name != 'nt'
        else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '_serverkit-data')
    )
    CUSTOM_DIR = os.path.join(_config_base, 'wp-templates')
    CONFIG_FILE = os.path.join(_config_base, 'wp-templates.json')

    # ── Config helpers ────────────────────────────────────────────────────────

    @classmethod
    def get_config(cls) -> Dict:
        if os.path.exists(cls.CONFIG_FILE):
            try:
                with open(cls.CONFIG_FILE, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        return {'custom_categories': []}

    @classmethod
    def save_config(cls, config: Dict) -> Dict:
        try:
            os.makedirs(os.path.dirname(cls.CONFIG_FILE), exist_ok=True)
            with open(cls.CONFIG_FILE, 'w') as f:
                json.dump(config, f, indent=2)
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # ── Template loading ──────────────────────────────────────────────────────

    @classmethod
    def _load_file(cls, filepath: str, source: str) -> Optional[Dict]:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
            if not data or not data.get('name'):
                return None
            file_id = os.path.splitext(os.path.basename(filepath))[0]
            return {
                'id': data.get('id', file_id),
                'name': data.get('name', ''),
                'description': data.get('description', ''),
                'version': data.get('version', '1.0.0'),
                'category': data.get('category', 'general'),
                'tags': data.get('tags', []),
                'featured': data.get('featured', False),
                'color_scheme': data.get('color_scheme', 'light'),
                'screenshot': data.get('screenshot', ''),
                'screenshots': data.get('screenshots', {}),
                'preview_url': data.get('preview_url', ''),
                'theme': data.get('theme', {}),
                'plugins': data.get('plugins', []),
                'pages': data.get('pages', []),
                'starter_content': data.get('starter_content', False),
                'source': source,
                'editable': source == 'custom',
            }
        except Exception:
            return None

    # ── Public API ────────────────────────────────────────────────────────────

    @classmethod
    def list_templates(cls, category: str = None, search: str = None) -> List[Dict]:
        templates: List[Dict] = []
        seen: set = set()

        for directory, source in [(cls.CUSTOM_DIR, 'custom'), (cls.BUNDLED_DIR, 'bundled')]:
            if not os.path.exists(directory):
                continue
            for fn in sorted(os.listdir(directory)):
                if not fn.endswith(('.yaml', '.yml')):
                    continue
                t = cls._load_file(os.path.join(directory, fn), source)
                if t and t['id'] not in seen:
                    seen.add(t['id'])
                    templates.append(t)

        if category:
            templates = [t for t in templates if t['category'] == category]
        if search:
            s = search.lower()
            templates = [
                t for t in templates
                if s in t['name'].lower()
                or s in t['description'].lower()
                or s in t['category'].lower()
                or any(s in tag.lower() for tag in t.get('tags', []))
            ]

        # featured first, then alphabetical
        return sorted(templates, key=lambda t: (not t['featured'], t['name'].lower()))

    @classmethod
    def get_template(cls, template_id: str) -> Dict:
        for directory, source in [(cls.CUSTOM_DIR, 'custom'), (cls.BUNDLED_DIR, 'bundled')]:
            for ext in ('.yaml', '.yml'):
                path = os.path.join(directory, f"{template_id}{ext}")
                if os.path.exists(path):
                    t = cls._load_file(path, source)
                    if t:
                        return {'success': True, 'template': t}
        return {'success': False, 'error': 'Template not found'}

    @classmethod
    def get_template_raw(cls, template_id: str) -> Dict:
        for directory in (cls.CUSTOM_DIR, cls.BUNDLED_DIR):
            for ext in ('.yaml', '.yml'):
                path = os.path.join(directory, f"{template_id}{ext}")
                if os.path.exists(path):
                    try:
                        with open(path, 'r', encoding='utf-8') as f:
                            data = yaml.safe_load(f) or {}
                        return {
                            'success': True,
                            'template': data,
                            'editable': directory == cls.CUSTOM_DIR
                        }
                    except Exception as e:
                        return {'success': False, 'error': str(e)}
        return {'success': False, 'error': 'Template not found'}

    @classmethod
    def create_template(cls, data: Dict) -> Dict:
        name = data.get('name', '').strip()
        if not name:
            return {'success': False, 'error': 'Name is required'}

        template_id = data.get('id') or re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        os.makedirs(cls.CUSTOM_DIR, exist_ok=True)
        filepath = os.path.join(cls.CUSTOM_DIR, f"{template_id}.yaml")
        if os.path.exists(filepath):
            return {'success': False, 'error': 'Template ID already exists'}

        payload = {k: v for k, v in data.items() if k not in ('source', 'editable')}
        payload['id'] = template_id
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                yaml.dump(payload, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
            return {'success': True, 'template_id': template_id}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def update_template(cls, template_id: str, data: Dict) -> Dict:
        filepath = os.path.join(cls.CUSTOM_DIR, f"{template_id}.yaml")
        if not os.path.exists(filepath):
            return {'success': False, 'error': 'Template not found or not editable'}
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                existing = yaml.safe_load(f) or {}
        except Exception:
            existing = {}
        existing.update({k: v for k, v in data.items() if k not in ('id', 'source', 'editable')})
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                yaml.dump(existing, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
            return {'success': True, 'template_id': template_id}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def delete_template(cls, template_id: str) -> Dict:
        for ext in ('.yaml', '.yml'):
            path = os.path.join(cls.CUSTOM_DIR, f"{template_id}{ext}")
            if os.path.exists(path):
                os.remove(path)
                return {'success': True}
        return {'success': False, 'error': 'Template not found or not deletable (bundled templates cannot be deleted)'}

    # ── From-backup preview ───────────────────────────────────────────────────

    @classmethod
    def _find_free_port(cls, start: int = 8200, end: int = 8299) -> int:
        import socket
        for port in range(start, end + 1):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('', port))
                    return port
            except OSError:
                continue
        raise RuntimeError('No free port available in range')

    @classmethod
    def create_from_backup(cls, name: str, description: str, category: str,
                           version: str, theme_name: str, theme_slug: str,
                           plugins: str, featured: bool,
                           backup_file, db_file) -> Dict:
        """Extract a WP backup, register as template, then start Docker preview in background."""
        import zipfile
        import subprocess
        import shutil
        import tempfile

        name = name.strip()
        if not name:
            return {'success': False, 'error': 'Name is required'}

        template_id = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        preview_dir = os.path.join(cls.CUSTOM_DIR, 'previews', template_id)
        os.makedirs(preview_dir, exist_ok=True)
        wp_content_dir = os.path.join(preview_dir, 'wp-content')

        try:
            # Save backup to a temp path, then close before reading (Windows-safe)
            tmp_fd, tmp_path = tempfile.mkstemp(suffix='.zip')
            os.close(tmp_fd)
            backup_file.save(tmp_path)

            try:
                with zipfile.ZipFile(tmp_path, 'r') as zf:
                    members = [m for m in zf.namelist() if 'wp-content/' in m]
                    if members:
                        zf.extractall(preview_dir, members=members)
                    else:
                        zf.extractall(wp_content_dir)
            except zipfile.BadZipFile:
                os.unlink(tmp_path)
                shutil.rmtree(preview_dir, ignore_errors=True)
                return {'success': False, 'error': 'Invalid or corrupted zip file'}
            finally:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

            # Save DB dump if provided
            if db_file:
                sql_path = os.path.join(preview_dir, 'import.sql')
                db_file.save(sql_path)

            # Find a free port for the preview
            port = cls._find_free_port()

            # Write docker-compose
            compose_content = f"""name: {template_id}-template
services:
  db:
    image: mysql:8.0
    container_name: {template_id}-template-db
    environment:
      MYSQL_ROOT_PASSWORD: preview123
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress
    volumes:
      - db_data:/var/lib/mysql
  wp:
    image: wordpress:latest
    container_name: {template_id}-template
    depends_on:
      - db
    ports:
      - "{port}:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - ./wp-content:/var/www/html/wp-content

volumes:
  db_data:
"""
            compose_path = os.path.join(preview_dir, 'docker-compose.yml')
            with open(compose_path, 'w') as f:
                f.write(compose_content)

            preview_url = f'http://localhost:{port}'

            # Parse comma-separated plugins list
            plugin_list = [p.strip() for p in plugins.split(',') if p.strip()] if plugins else []

            # Register the template YAML immediately (before Docker starts)
            template_data = {
                'name': name,
                'description': description or '',
                'category': category or 'general',
                'version': version or '1.0.0',
                'featured': bool(featured),
                'preview_url': preview_url,
                'theme': {
                    'name': theme_name or '',
                    'slug': theme_slug or '',
                },
                'plugins': plugin_list,
            }
            result = cls.create_template(template_data)
            if not result.get('success'):
                return result

            # Start Docker in the background — don't block the HTTP response
            if os.name != 'nt':
                subprocess.Popen(
                    ['docker', 'compose', 'up', '-d'],
                    cwd=preview_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )

            result['preview_url'] = preview_url
            result['port'] = port
            return result

        except Exception as exc:
            return {'success': False, 'error': str(exc)}

    # ── Categories ────────────────────────────────────────────────────────────

    @classmethod
    def get_categories(cls) -> List[str]:
        templates = cls.list_templates()
        from_templates = {t['category'] for t in templates if t['category']}
        custom = set(cls.get_config().get('custom_categories', []))
        return sorted(from_templates | custom)

    @classmethod
    def get_custom_categories(cls) -> List[str]:
        return sorted(cls.get_config().get('custom_categories', []))

    @classmethod
    def add_custom_category(cls, name: str) -> Dict:
        name = re.sub(r'[^a-z0-9 -]', '', name.strip().lower()).replace(' ', '-').strip('-')
        if not name:
            return {'success': False, 'error': 'Invalid category name'}
        config = cls.get_config()
        cats = config.setdefault('custom_categories', [])
        if name in cats:
            return {'success': False, 'error': 'Category already exists'}
        cats.append(name)
        cats.sort()
        return cls.save_config(config)

    @classmethod
    def remove_custom_category(cls, name: str) -> Dict:
        config = cls.get_config()
        cats = config.get('custom_categories', [])
        if name not in cats:
            return {'success': False, 'error': 'Category not found'}
        config['custom_categories'] = [c for c in cats if c != name]
        return cls.save_config(config)
