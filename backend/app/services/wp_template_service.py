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
    def _save_sql_dump(cls, db_file, dest_path: str) -> None:
        """Save a SQL dump file, decompressing .gz if needed."""
        import gzip
        import shutil
        import tempfile

        tmp_fd, tmp_path = tempfile.mkstemp()
        os.close(tmp_fd)
        try:
            db_file.save(tmp_path)
            # Detect gzip magic bytes
            with open(tmp_path, 'rb') as f:
                magic = f.read(2)
            if magic == b'\x1f\x8b':
                with gzip.open(tmp_path, 'rb') as gz, open(dest_path, 'wb') as out:
                    shutil.copyfileobj(gz, out)
            else:
                shutil.copy2(tmp_path, dest_path)
                os.unlink(tmp_path)
                tmp_path = None
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

    @classmethod
    def _fix_urls_background(cls, flask_app, template_id: str, preview_url: str,
                             sql_path: str, wp_content_dir: str,
                             app_id: int = None, app_dir: str = None) -> None:
        """After containers start: wait for MySQL import, fix URLs, copy wp-content, mark running."""
        import subprocess
        import time

        db_container = f'{template_id}_template_db'
        wp_container = f'{template_id}_template'

        # ── 1. Detect table prefix from the SQL dump ──────────────────────────
        prefix = 'wp_'
        if sql_path:
            try:
                with open(sql_path, 'r', encoding='utf-8', errors='ignore') as f:
                    head = f.read(16384)
                m = re.search(r'CREATE TABLE `(\w+)options`', head)
                if m:
                    prefix = m.group(1)
            except Exception:
                pass

        # ── 2. Wait for MySQL to finish the initdb.d import ───────────────────
        if sql_path:
            for _ in range(72):  # up to 6 min
                time.sleep(5)
                try:
                    r = subprocess.run(
                        ['docker', 'exec', db_container,
                         'mysql', '-u', 'wordpress', '-pwordpress', 'wordpress',
                         '-e', f'SELECT option_value FROM `{prefix}options`'
                               f' WHERE option_name="siteurl" LIMIT 1'],
                        capture_output=True, timeout=10,
                    )
                    if r.returncode == 0 and b'http' in r.stdout:
                        break
                except Exception:
                    continue
            else:
                pass  # continue anyway — fix URLs best-effort

            # Fix siteurl and home to point at the preview URL
            try:
                fix_sql = (
                    f"UPDATE `{prefix}options` "
                    f"SET option_value = '{preview_url}' "
                    f"WHERE option_name IN ('siteurl', 'home');"
                )
                subprocess.run(
                    ['docker', 'exec', db_container,
                     'mysql', '-u', 'wordpress', '-pwordpress', 'wordpress', '-e', fix_sql],
                    capture_output=True, timeout=30,
                )
            except Exception:
                pass

        # ── 3. Wait for the WP container to be running, then docker-cp wp-content ──
        if wp_content_dir and os.path.isdir(wp_content_dir):
            # Wait up to 3 min for the wp container to appear
            for _ in range(36):
                time.sleep(5)
                try:
                    r = subprocess.run(
                        ['docker', 'inspect', '--format', '{{.State.Running}}', wp_container],
                        capture_output=True, timeout=10,
                    )
                    if r.returncode == 0 and b'true' in r.stdout:
                        break
                except Exception:
                    continue

            # Copy all wp-content subdirs into the container
            # docker cp <src>/. <container>:<dest>  copies the *contents* of src
            # Use abspath — docker cp requires an absolute path on Windows
            try:
                abs_wp_content = os.path.abspath(wp_content_dir)
                subprocess.run(
                    ['docker', 'cp', abs_wp_content + '/.', f'{wp_container}:/var/www/html/wp-content/'],
                    timeout=300,
                )
                # Fix ownership inside the container
                subprocess.run(
                    ['docker', 'exec', wp_container,
                     'chown', '-R', 'www-data:www-data', '/var/www/html/wp-content'],
                    capture_output=True, timeout=60,
                )
            except Exception:
                pass

        # ── 4. Mark the Application as running ───────────────────────────────
        if app_id and flask_app:
            try:
                with flask_app.app_context():
                    from app import db
                    from app.models import Application
                    rec = db.session.get(Application, app_id)
                    if rec:
                        rec.status = 'running'
                        db.session.commit()
            except Exception:
                pass

    @classmethod
    def create_from_backup(cls, name: str, description: str, category: str,
                           version: str, theme_name: str, theme_slug: str,
                           plugins: str, featured: bool,
                           backup_file, db_file, user_id: int = None) -> Dict:
        """Extract a WP backup, register as template, start Docker preview, and create an Application record."""
        import zipfile
        import subprocess
        import shutil
        import tempfile
        import threading

        name = name.strip()
        if not name:
            return {'success': False, 'error': 'Name is required'}

        template_id = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
        # Store app files in the shared apps directory so it appears in Services
        app_dir = os.path.join(paths.APPS_DIR, template_id)
        wp_content_dir = os.path.join(app_dir, 'wp-content')

        # Early collision check: prevent [Errno 17] and confusing partial failures
        if os.path.exists(app_dir):
            return {'success': False, 'error': f'A template named "{name}" already exists. Delete it first.'}
        # Also check the YAML template registry
        yaml_path = os.path.join(cls.CUSTOM_DIR, f'{template_id}.yaml')
        if os.path.exists(yaml_path):
            return {'success': False, 'error': f'Template ID "{template_id}" already registered. Delete it first.'}

        # Grab Flask app object while we're in request context (needed for background thread)
        flask_app = None
        try:
            from flask import current_app
            flask_app = current_app._get_current_object()
        except Exception:
            pass

        try:
            os.makedirs(app_dir, exist_ok=True)
            # Save backup to a temp path, then close before reading (Windows-safe)
            tmp_fd, tmp_path = tempfile.mkstemp(suffix='.zip')
            os.close(tmp_fd)
            backup_file.save(tmp_path)

            try:
                os.makedirs(wp_content_dir, exist_ok=True)
                with zipfile.ZipFile(tmp_path, 'r') as zf:
                    all_names = zf.namelist()
                    # Find members that contain wp-content/
                    wp_members = [m for m in all_names if 'wp-content/' in m]
                    if wp_members:
                        # Strip everything before (and including) 'wp-content/' so all
                        # files land directly under app_dir/wp-content/
                        for member in wp_members:
                            idx = member.find('wp-content/')
                            rel = member[idx + len('wp-content/'):]  # path inside wp-content
                            if not rel or rel.endswith('/'):
                                continue  # skip directory entries
                            dest = os.path.join(wp_content_dir, rel)
                            # On Windows, prepend \\?\ to bypass MAX_PATH 260-char limit
                            if os.name == 'nt':
                                dest = '\\\\?\\' + os.path.abspath(dest)
                            parent = os.path.dirname(dest)
                            if os.name == 'nt' and not parent.startswith('\\\\?\\'):
                                parent = '\\\\?\\' + os.path.abspath(parent)
                            os.makedirs(parent, exist_ok=True)
                            with zf.open(member) as src, open(dest, 'wb') as dst:
                                shutil.copyfileobj(src, dst)
                    else:
                        # No wp-content structure found — extract everything flat into wp_content_dir
                        zf.extractall(wp_content_dir)
            except zipfile.BadZipFile:
                shutil.rmtree(app_dir, ignore_errors=True)
                return {'success': False, 'error': 'Invalid or corrupted zip file'}
            finally:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

            # Save SQL dump (handles .gz decompression)
            sql_path = None
            if db_file:
                sql_path = os.path.join(app_dir, 'import.sql')
                cls._save_sql_dump(db_file, sql_path)

            # Find a free port for the preview
            port = cls._find_free_port()
            preview_url = f'http://localhost:{port}'

            # docker-compose for this WP preview instance.
            # - wp-content is bind-mounted from the extracted directory.
            # - DB data uses a named volume with an explicit name (no project-prefix duplication).
            # - SQL dump (if any) is mounted into initdb.d so MySQL imports it automatically.
            # - A healthcheck on db + depends_on condition ensures WP only starts AFTER the
            #   SQL import is fully complete, preventing the "WordPress install" page.
            vol_name = f'{template_id}_template_db'

            # Build compose sections that differ based on whether a SQL dump was provided
            db_sql_mount = f'      - ./import.sql:/docker-entrypoint-initdb.d/import.sql:ro\n' if sql_path else ''
            if sql_path:
                wp_depends_block = (
                    '    depends_on:\n'
                    '      db:\n'
                    '        condition: service_healthy\n'
                )
            else:
                wp_depends_block = '    depends_on:\n      - db\n'

            compose_content = (
                f'name: {template_id}_template\n'
                f'services:\n'
                f'  db:\n'
                f'    image: mysql:8.0\n'
                f'    container_name: {template_id}_template_db\n'
                f'    environment:\n'
                f'      MYSQL_ROOT_PASSWORD: preview123\n'
                f'      MYSQL_DATABASE: wordpress\n'
                f'      MYSQL_USER: wordpress\n'
                f'      MYSQL_PASSWORD: wordpress\n'
                f'    volumes:\n'
                f'      - {vol_name}:/var/lib/mysql\n'
                + db_sql_mount +
                f'    healthcheck:\n'
                f'      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "wordpress", "-pwordpress"]\n'
                f'      interval: 5s\n'
                f'      timeout: 5s\n'
                f'      retries: 20\n'
                f'      start_period: 30s\n'
                f'  wp:\n'
                f'    image: wordpress:latest\n'
                f'    container_name: {template_id}_template\n'
                + wp_depends_block +
                f'    ports:\n'
                f'      - "{port}:80"\n'
                f'    environment:\n'
                f'      WORDPRESS_DB_HOST: db\n'
                f'      WORDPRESS_DB_USER: wordpress\n'
                f'      WORDPRESS_DB_PASSWORD: wordpress\n'
                f'      WORDPRESS_DB_NAME: wordpress\n'
                f'\n'
                f'volumes:\n'
                f'  {vol_name}:\n'
                f'    name: {vol_name}\n'
            )
            compose_path = os.path.join(app_dir, 'docker-compose.yml')
            with open(compose_path, 'w') as f:
                f.write(compose_content)

            # Parse comma-separated plugins list
            plugin_list = [p.strip() for p in plugins.split(',') if p.strip()] if plugins else []

            # Register the template YAML in the wp-templates config dir
            template_data = {
                'name': name,
                'description': description or '',
                'category': category or 'general',
                'version': version or '1.0.0',
                'featured': bool(featured),
                'preview_url': preview_url,
                'theme': {'name': theme_name or '', 'slug': theme_slug or ''},
                'plugins': plugin_list,
            }
            result = cls.create_template(template_data)
            if not result.get('success'):
                return result

            # Create an Application DB record so this WP preview shows in Services
            app_id = None
            if user_id is not None and flask_app:
                try:
                    with flask_app.app_context():
                        from app import db
                        from app.models import Application
                        from app.models.wordpress_site import WordPressSite
                        app_record = Application(
                            name=name,
                            app_type='wp_template',
                            status='deploying',
                            port=port,
                            root_path=app_dir,
                            docker_image='wordpress:latest',
                            container_id=f'{template_id}_template',
                            user_id=user_id,
                        )
                        db.session.add(app_record)
                        db.session.flush()  # get app_record.id before commit

                        wp_site = WordPressSite(
                            application_id=app_record.id,
                            is_production=True,
                            environment_type='standalone',
                            compose_project_name=f'{template_id}_template',
                            container_prefix=template_id,
                        )
                        db.session.add(wp_site)
                        db.session.commit()
                        app_id = app_record.id
                        result['app_id'] = app_id
                except Exception:
                    pass  # non-fatal — template YAML was still created

            # Start everything — MySQL auto-imports via initdb.d, WP waits for db healthcheck
            subprocess.Popen(
                ['docker', 'compose', 'up', '-d'],
                cwd=app_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            # Background thread: fix URLs + docker-cp wp-content into the running container
            t = threading.Thread(
                target=cls._fix_urls_background,
                args=(flask_app, template_id, preview_url, sql_path, wp_content_dir,
                      app_id, app_dir),
                daemon=True,
            )
            t.start()

            result['preview_url'] = preview_url
            result['port'] = port
            return result

        except Exception as exc:
            return {'success': False, 'error': str(exc)}

    # ── Preview status ────────────────────────────────────────────────────────

    @classmethod
    def get_preview_status(cls, template_id: str) -> Dict:
        """Return live container status with descriptive message for the frontend progress bar."""
        import subprocess
        import urllib.request
        import urllib.error

        # Check if container exists at all (image pull may still be in progress)
        try:
            r = subprocess.run(
                ['docker', 'inspect', '--format',
                 '{{.State.Status}}|||{{.State.Running}}',
                 f'{template_id}_template'],
                capture_output=True, text=True, timeout=10,
            )
        except Exception:
            return {'status': 'starting', 'message': 'Pulling Docker images…'}

        if r.returncode != 0:
            return {'status': 'starting', 'message': 'Pulling Docker images…'}

        parts = r.stdout.strip().split('|||')
        container_status = parts[0] if parts else ''
        is_running = parts[1].strip() == 'true' if len(parts) > 1 else False

        if not is_running:
            if container_status in ('created', 'restarting'):
                return {'status': 'starting', 'message': 'Starting containers…'}
            return {'status': 'starting', 'message': 'Container starting…'}

        # Container running — resolve preview URL and probe HTTP
        t = cls.get_template(template_id)
        if not t.get('success'):
            return {'status': 'error', 'message': 'Template not found'}

        preview_url = t['template'].get('preview_url', '')
        if not preview_url:
            return {'status': 'error', 'message': 'No preview URL configured'}

        # While the background thread (DB import + docker cp) is still working,
        # keep reporting 'starting' with a meaningful message.
        try:
            from app import db
            from app.models import Application
            rec = Application.query.filter_by(container_id=f'{template_id}_template').first()
            if rec and rec.status != 'running':
                # Decide message based on whether SQL import has finished yet
                sql_path = None
                try:
                    app_dir_check = os.path.join(paths.APPS_DIR, template_id)
                    sql_candidate = os.path.join(app_dir_check, 'import.sql')
                    if os.path.exists(sql_candidate):
                        sql_path = sql_candidate
                except Exception:
                    pass
                if sql_path:
                    # Check if the siteurl row has been updated already
                    try:
                        import re as _re
                        with open(sql_path, 'r', encoding='utf-8', errors='ignore') as _f:
                            _head = _f.read(16384)
                        _m = _re.search(r'CREATE TABLE `(\w+)options`', _head)
                        _prefix = _m.group(1) if _m else 'wp_'
                        _r = subprocess.run(
                            ['docker', 'exec', f'{template_id}_template_db',
                             'mysql', '-u', 'wordpress', '-pwordpress', 'wordpress',
                             '-e', f'SELECT option_value FROM `{_prefix}options`'
                                   f' WHERE option_name="siteurl" LIMIT 1'],
                            capture_output=True, timeout=5,
                        )
                        if _r.returncode == 0 and b'http' in _r.stdout:
                            return {'status': 'starting', 'message': 'Copying files into container…'}
                        else:
                            return {'status': 'starting', 'message': 'Importing database…'}
                    except Exception:
                        return {'status': 'starting', 'message': 'Importing database…'}
                else:
                    return {'status': 'starting', 'message': 'Copying files into container…'}
        except Exception:
            pass

        def _mark_running():
            try:
                from app import db
                from app.models import Application
                rec = Application.query.filter_by(container_id=f'{template_id}_template').first()
                if rec and rec.status != 'running':
                    rec.status = 'running'
                    db.session.commit()
            except Exception:
                pass

        try:
            req = urllib.request.Request(preview_url, headers={'User-Agent': 'ServerKit/1.0'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status < 500:
                    _mark_running()
                    return {'status': 'ready', 'preview_url': preview_url}
        except urllib.error.HTTPError as e:
            if e.code < 500:
                _mark_running()
                return {'status': 'ready', 'preview_url': preview_url}
        except Exception:
            pass

        return {'status': 'starting', 'message': 'WordPress initializing…'}

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
