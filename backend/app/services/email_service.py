"""
Email Service

Manages mail server components:
- Postfix (SMTP)
- Dovecot (IMAP/POP3)
- SpamAssassin (spam filtering)
- DKIM/SPF/DMARC (email authentication)
- Email accounts (virtual users)
- Forwarding rules
"""

import os
import json
import subprocess
import re
from datetime import datetime
from typing import Dict, List, Optional

from app import paths
from app.utils.system import (
    PackageManager,
    ServiceControl,
    run_privileged,
    is_command_available,
)


class EmailService:
    """Service for email server management."""

    CONFIG_DIR = paths.SERVERKIT_CONFIG_DIR
    EMAIL_CONFIG = os.path.join(CONFIG_DIR, 'email.json')

    # Postfix paths
    POSTFIX_MAIN_CF = '/etc/postfix/main.cf'
    POSTFIX_MASTER_CF = '/etc/postfix/master.cf'
    VIRTUAL_MAILBOX_DOMAINS = '/etc/postfix/virtual_domains'
    VIRTUAL_MAILBOX_MAPS = '/etc/postfix/virtual_mailbox_maps'
    VIRTUAL_ALIAS_MAPS = '/etc/postfix/virtual_alias_maps'

    # Dovecot paths
    DOVECOT_CONF = '/etc/dovecot/dovecot.conf'
    DOVECOT_CONF_D = '/etc/dovecot/conf.d'

    # Mail storage
    VMAIL_DIR = '/var/vmail'
    VMAIL_UID = 5000
    VMAIL_GID = 5000

    # OpenDKIM
    DKIM_KEY_DIR = '/etc/opendkim/keys'
    DKIM_KEY_TABLE = '/etc/opendkim/key.table'
    DKIM_SIGNING_TABLE = '/etc/opendkim/signing.table'
    DKIM_TRUSTED_HOSTS = '/etc/opendkim/trusted.hosts'

    # ==========================================
    # STATUS & CONFIG
    # ==========================================

    @classmethod
    def get_config(cls) -> Dict:
        """Get email server configuration."""
        if os.path.exists(cls.EMAIL_CONFIG):
            try:
                with open(cls.EMAIL_CONFIG, 'r') as f:
                    return json.load(f)
            except Exception:
                pass

        return {
            'postfix': {'enabled': False},
            'dovecot': {'enabled': False},
            'spamassassin': {'enabled': False},
            'dkim': {'enabled': False},
        }

    @classmethod
    def save_config(cls, config: Dict) -> Dict:
        """Save email server configuration."""
        try:
            os.makedirs(cls.CONFIG_DIR, exist_ok=True)
            with open(cls.EMAIL_CONFIG, 'w') as f:
                json.dump(config, f, indent=2)
            return {'success': True, 'message': 'Configuration saved'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def get_status(cls) -> Dict:
        """Get overall email server status."""
        if os.name == 'nt':
            return {
                'postfix': {'installed': False, 'running': False},
                'dovecot': {'installed': False, 'running': False},
                'spamassassin': {'installed': False, 'running': False},
                'opendkim': {'installed': False, 'running': False},
                'available': False,
            }

        postfix = cls._get_service_status('postfix')
        dovecot = cls._get_service_status('dovecot')
        spamassassin = cls._get_service_status('spamassassin', cmd='spamd')
        opendkim = cls._get_service_status('opendkim')

        return {
            'postfix': postfix,
            'dovecot': dovecot,
            'spamassassin': spamassassin,
            'opendkim': opendkim,
            'available': postfix['installed'] or dovecot['installed'],
        }

    @classmethod
    def _get_service_status(cls, service: str, cmd: str = None) -> Dict:
        """Get installation and running status for a service."""
        cmd = cmd or service
        installed = is_command_available(cmd) or PackageManager.is_installed(service)
        running = ServiceControl.is_active(service) if installed else False
        enabled = ServiceControl.is_enabled(service) if installed else False

        result = {
            'installed': installed,
            'running': running,
            'enabled': enabled,
        }

        # Get version if installed
        if installed:
            result['version'] = cls._get_version(service)

        return result

    @classmethod
    def _get_version(cls, service: str) -> Optional[str]:
        """Get version string for a service."""
        try:
            if service == 'postfix':
                r = subprocess.run(['postconf', 'mail_version'], capture_output=True, text=True)
                if r.returncode == 0:
                    return r.stdout.strip().split('=')[-1].strip()
            elif service == 'dovecot':
                r = subprocess.run(['dovecot', '--version'], capture_output=True, text=True)
                if r.returncode == 0:
                    return r.stdout.strip().split()[0]
            elif service == 'spamassassin':
                r = subprocess.run(['spamd', '--version'], capture_output=True, text=True)
                if r.returncode == 0:
                    match = re.search(r'[\d.]+', r.stdout)
                    return match.group() if match else r.stdout.strip()
            elif service == 'opendkim':
                r = subprocess.run(['opendkim', '-V'], capture_output=True, text=True)
                output = r.stdout or r.stderr
                if output:
                    match = re.search(r'[\d.]+', output)
                    return match.group() if match else None
        except FileNotFoundError:
            pass
        return None

    # ==========================================
    # POSTFIX
    # ==========================================

    @classmethod
    def install_postfix(cls) -> Dict:
        """Install Postfix MTA."""
        try:
            if os.name == 'nt':
                return {'success': False, 'error': 'Postfix requires Linux'}

            # Pre-seed debconf to avoid interactive prompt
            manager = PackageManager.detect()
            if manager == 'apt':
                run_privileged(
                    'debconf-set-selections <<< "postfix postfix/main_mailer_type select Internet Site"',
                    shell=True
                )
                run_privileged(
                    'debconf-set-selections <<< "postfix postfix/mailname string $(hostname -f)"',
                    shell=True
                )

            result = PackageManager.install(['postfix', 'postfix-mysql'] if manager == 'apt'
                                            else ['postfix'])
            if result.returncode != 0:
                return {'success': False, 'error': result.stderr or 'Installation failed'}

            ServiceControl.enable('postfix')
            ServiceControl.start('postfix')

            return {'success': True, 'message': 'Postfix installed successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def get_postfix_config(cls) -> Dict:
        """Read key Postfix configuration values."""
        config = {}
        try:
            params = ['myhostname', 'mydomain', 'myorigin', 'inet_interfaces',
                       'mydestination', 'relay_host', 'mynetworks',
                       'smtpd_tls_cert_file', 'smtpd_tls_key_file',
                       'message_size_limit', 'mailbox_size_limit']

            for param in params:
                r = subprocess.run(['postconf', param], capture_output=True, text=True)
                if r.returncode == 0:
                    key, _, value = r.stdout.strip().partition(' = ')
                    config[key.strip()] = value.strip()

            return {'success': True, 'config': config}
        except FileNotFoundError:
            return {'success': False, 'error': 'postconf not found'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def update_postfix_config(cls, settings: Dict) -> Dict:
        """Update Postfix configuration parameters."""
        try:
            for key, value in settings.items():
                # Sanitize key — only allow word chars and underscores
                if not re.match(r'^[a-z_]+$', key):
                    continue
                run_privileged(['postconf', '-e', f'{key}={value}'])

            ServiceControl.reload('postfix')
            return {'success': True, 'message': 'Postfix configuration updated'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def get_mail_queue(cls) -> Dict:
        """Get Postfix mail queue."""
        try:
            r = run_privileged(['mailq'])
            if r.returncode != 0 and 'empty' not in (r.stdout or '').lower():
                return {'success': False, 'error': r.stderr or 'Failed to get queue'}

            lines = (r.stdout or '').strip().split('\n')
            queue_items = []
            current_item = {}

            for line in lines:
                if line.startswith('-') or 'Mail queue is empty' in line:
                    continue
                # Queue ID line
                match = re.match(r'^([A-F0-9]+)\s+(\d+)\s+(\w+\s+\w+\s+\d+\s+[\d:]+)\s+(.+)', line)
                if match:
                    if current_item:
                        queue_items.append(current_item)
                    current_item = {
                        'id': match.group(1),
                        'size': int(match.group(2)),
                        'date': match.group(3),
                        'sender': match.group(4),
                    }
                elif line.strip() and current_item:
                    # Recipient line
                    current_item.setdefault('recipients', []).append(line.strip())

            if current_item:
                queue_items.append(current_item)

            return {'success': True, 'queue': queue_items, 'count': len(queue_items)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def flush_mail_queue(cls) -> Dict:
        """Flush the Postfix mail queue."""
        try:
            r = run_privileged(['postqueue', '-f'])
            return {'success': True, 'message': 'Mail queue flushed'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def delete_queued_message(cls, queue_id: str) -> Dict:
        """Delete a specific message from the queue."""
        try:
            if not re.match(r'^[A-F0-9]+$', queue_id):
                return {'success': False, 'error': 'Invalid queue ID'}
            r = run_privileged(['postsuper', '-d', queue_id])
            if r.returncode != 0:
                return {'success': False, 'error': r.stderr or 'Failed to delete message'}
            return {'success': True, 'message': f'Message {queue_id} deleted'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # ==========================================
    # DOVECOT
    # ==========================================

    @classmethod
    def install_dovecot(cls) -> Dict:
        """Install Dovecot IMAP/POP3 server."""
        try:
            if os.name == 'nt':
                return {'success': False, 'error': 'Dovecot requires Linux'}

            manager = PackageManager.detect()
            packages = ['dovecot-core', 'dovecot-imapd', 'dovecot-pop3d',
                        'dovecot-lmtpd'] if manager == 'apt' else ['dovecot']

            result = PackageManager.install(packages)
            if result.returncode != 0:
                return {'success': False, 'error': result.stderr or 'Installation failed'}

            # Create vmail user/group
            run_privileged(['groupadd', '-g', str(cls.VMAIL_GID), 'vmail'], timeout=10)
            run_privileged(['useradd', '-u', str(cls.VMAIL_UID), '-g', 'vmail',
                            '-d', cls.VMAIL_DIR, '-s', '/usr/sbin/nologin', 'vmail'], timeout=10)
            run_privileged(['mkdir', '-p', cls.VMAIL_DIR])
            run_privileged(['chown', '-R', f'{cls.VMAIL_UID}:{cls.VMAIL_GID}', cls.VMAIL_DIR])

            ServiceControl.enable('dovecot')
            ServiceControl.start('dovecot')

            return {'success': True, 'message': 'Dovecot installed successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def get_dovecot_config(cls) -> Dict:
        """Get Dovecot configuration summary."""
        try:
            r = subprocess.run(['doveconf', '-n'], capture_output=True, text=True)
            if r.returncode != 0:
                return {'success': False, 'error': 'Failed to read Dovecot config'}

            config = {}
            for line in r.stdout.split('\n'):
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, _, value = line.partition('=')
                    config[key.strip()] = value.strip()

            return {'success': True, 'config': config}
        except FileNotFoundError:
            return {'success': False, 'error': 'doveconf not found'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # ==========================================
    # EMAIL ACCOUNTS
    # ==========================================

    @classmethod
    def list_accounts(cls) -> List[Dict]:
        """List all email accounts from the database."""
        from app.models import EmailAccount
        accounts = EmailAccount.query.all()
        return [a.to_dict() for a in accounts]

    @classmethod
    def create_account(cls, email: str, password: str, domain: str,
                       quota_mb: int = 1024) -> Dict:
        """Create a new email account."""
        from app.models import EmailAccount
        from app import db

        try:
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                return {'success': False, 'error': 'Invalid email address'}

            existing = EmailAccount.query.filter_by(email=email).first()
            if existing:
                return {'success': False, 'error': 'Email account already exists'}

            username = email.split('@')[0]

            # Create system mailbox directory
            if os.name != 'nt':
                maildir = os.path.join(cls.VMAIL_DIR, domain, username)
                run_privileged(['mkdir', '-p', maildir])
                run_privileged(['chown', '-R', f'{cls.VMAIL_UID}:{cls.VMAIL_GID}', maildir])

                # Generate password hash for Dovecot
                r = subprocess.run(
                    ['doveadm', 'pw', '-s', 'SHA512-CRYPT', '-p', password],
                    capture_output=True, text=True
                )
                if r.returncode == 0:
                    pw_hash = r.stdout.strip()
                else:
                    # Fallback if doveadm not available yet
                    pw_hash = password

                # Update virtual mailbox maps
                cls._update_virtual_maps(email, domain, username, pw_hash)

            account = EmailAccount(
                email=email,
                domain=domain,
                username=username,
                quota_mb=quota_mb,
                enabled=True,
            )
            db.session.add(account)
            db.session.commit()

            return {'success': True, 'data': account.to_dict(),
                    'message': f'Account {email} created'}
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}

    @classmethod
    def update_account(cls, account_id: int, **kwargs) -> Dict:
        """Update an email account."""
        from app.models import EmailAccount
        from app import db

        try:
            account = EmailAccount.query.get(account_id)
            if not account:
                return {'success': False, 'error': 'Account not found'}

            password = kwargs.pop('password', None)

            for key, value in kwargs.items():
                if hasattr(account, key):
                    setattr(account, key, value)

            # Update password if provided
            if password and os.name != 'nt':
                r = subprocess.run(
                    ['doveadm', 'pw', '-s', 'SHA512-CRYPT', '-p', password],
                    capture_output=True, text=True
                )
                if r.returncode == 0:
                    cls._update_virtual_maps(
                        account.email, account.domain,
                        account.username, r.stdout.strip()
                    )

            db.session.commit()
            return {'success': True, 'data': account.to_dict()}
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}

    @classmethod
    def delete_account(cls, account_id: int) -> Dict:
        """Delete an email account."""
        from app.models import EmailAccount
        from app import db

        try:
            account = EmailAccount.query.get(account_id)
            if not account:
                return {'success': False, 'error': 'Account not found'}

            email = account.email

            # Remove mailbox directory
            if os.name != 'nt':
                maildir = os.path.join(cls.VMAIL_DIR, account.domain, account.username)
                if os.path.exists(maildir):
                    run_privileged(['rm', '-rf', maildir])

            db.session.delete(account)
            db.session.commit()

            # Rebuild virtual maps
            cls._rebuild_virtual_maps()

            return {'success': True, 'message': f'Account {email} deleted'}
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}

    @classmethod
    def _update_virtual_maps(cls, email: str, domain: str,
                              username: str, pw_hash: str) -> None:
        """Update Postfix virtual mailbox maps and Dovecot passwd file."""
        # Ensure domain is in virtual_domains
        domains_file = cls.VIRTUAL_MAILBOX_DOMAINS
        if os.path.exists(domains_file):
            with open(domains_file, 'r') as f:
                domains = f.read()
        else:
            domains = ''

        if domain not in domains:
            run_privileged(f'echo "{domain}" >> {domains_file}', shell=True)

        # Add to virtual mailbox maps
        mailbox_entry = f'{email}    {domain}/{username}/\n'
        maps_file = cls.VIRTUAL_MAILBOX_MAPS
        cls._add_or_update_line(maps_file, email, mailbox_entry)

        # Update Dovecot virtual users passwd file
        passwd_file = f'/etc/dovecot/users'
        passwd_entry = (f'{email}:{pw_hash}:{cls.VMAIL_UID}:{cls.VMAIL_GID}::'
                        f'{cls.VMAIL_DIR}/{domain}/{username}::\n')
        cls._add_or_update_line(passwd_file, email, passwd_entry)

        # Rebuild postfix maps
        run_privileged(['postmap', maps_file])

    @classmethod
    def _add_or_update_line(cls, filepath: str, match_key: str, new_line: str) -> None:
        """Add or update a line in a file matching the key."""
        lines = []
        found = False

        if os.path.exists(filepath):
            r = run_privileged(['cat', filepath])
            if r.returncode == 0:
                lines = r.stdout.split('\n')

        updated = []
        for line in lines:
            if line.startswith(match_key):
                updated.append(new_line.rstrip())
                found = True
            elif line.strip():
                updated.append(line)

        if not found:
            updated.append(new_line.rstrip())

        content = '\n'.join(updated) + '\n'
        run_privileged(f'echo "{content}" > {filepath}', shell=True)

    @classmethod
    def _rebuild_virtual_maps(cls) -> None:
        """Rebuild virtual maps from database."""
        from app.models import EmailAccount

        accounts = EmailAccount.query.filter_by(enabled=True).all()

        # Rebuild domains file
        domains = set(a.domain for a in accounts)
        if domains:
            content = '\n'.join(domains) + '\n'
            run_privileged(f"printf '%s' '{content}' > {cls.VIRTUAL_MAILBOX_DOMAINS}", shell=True)

        # Rebuild mailbox maps
        maps_lines = []
        for a in accounts:
            maps_lines.append(f'{a.email}    {a.domain}/{a.username}/')
        if maps_lines:
            content = '\n'.join(maps_lines) + '\n'
            run_privileged(f"printf '%s' '{content}' > {cls.VIRTUAL_MAILBOX_MAPS}", shell=True)
            run_privileged(['postmap', cls.VIRTUAL_MAILBOX_MAPS])

    # ==========================================
    # FORWARDING
    # ==========================================

    @classmethod
    def set_forwarding(cls, account_id: int, forward_to: str,
                        keep_copy: bool = True) -> Dict:
        """Set email forwarding for an account."""
        from app.models import EmailAccount
        from app import db

        try:
            account = EmailAccount.query.get(account_id)
            if not account:
                return {'success': False, 'error': 'Account not found'}

            account.forward_to = forward_to
            account.forward_keep_copy = keep_copy

            # Update Postfix virtual alias maps
            if os.name != 'nt' and forward_to:
                aliases = forward_to
                if keep_copy:
                    aliases = f'{account.email}, {forward_to}'
                entry = f'{account.email}    {aliases}\n'
                cls._add_or_update_line(cls.VIRTUAL_ALIAS_MAPS, account.email, entry)
                run_privileged(['postmap', cls.VIRTUAL_ALIAS_MAPS])

            db.session.commit()
            return {'success': True, 'data': account.to_dict()}
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}

    # ==========================================
    # SPAMASSASSIN
    # ==========================================

    @classmethod
    def install_spamassassin(cls) -> Dict:
        """Install SpamAssassin."""
        try:
            if os.name == 'nt':
                return {'success': False, 'error': 'SpamAssassin requires Linux'}

            result = PackageManager.install(['spamassassin', 'spamc'])
            if result.returncode != 0:
                return {'success': False, 'error': result.stderr or 'Installation failed'}

            ServiceControl.enable('spamassassin')
            ServiceControl.start('spamassassin')

            # Update SpamAssassin rules
            run_privileged(['sa-update'], timeout=120)

            return {'success': True, 'message': 'SpamAssassin installed successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def get_spamassassin_config(cls) -> Dict:
        """Get SpamAssassin configuration."""
        config = {
            'required_score': 5.0,
            'rewrite_header_subject': '***SPAM***',
            'use_bayes': True,
            'bayes_auto_learn': True,
        }

        local_cf = '/etc/spamassassin/local.cf'
        try:
            if os.path.exists(local_cf):
                r = run_privileged(['cat', local_cf])
                if r.returncode == 0:
                    for line in r.stdout.split('\n'):
                        line = line.strip()
                        if line.startswith('#') or not line:
                            continue
                        parts = line.split(None, 1)
                        if len(parts) == 2:
                            key, value = parts
                            if key == 'required_score':
                                config['required_score'] = float(value)
                            elif key == 'rewrite_header':
                                config['rewrite_header_subject'] = value.replace('Subject ', '')
                            elif key == 'use_bayes':
                                config['use_bayes'] = value == '1'
                            elif key == 'bayes_auto_learn':
                                config['bayes_auto_learn'] = value == '1'
        except Exception:
            pass

        return {'success': True, 'config': config}

    @classmethod
    def update_spamassassin_config(cls, settings: Dict) -> Dict:
        """Update SpamAssassin configuration."""
        try:
            local_cf = '/etc/spamassassin/local.cf'
            lines = []

            if 'required_score' in settings:
                lines.append(f"required_score {settings['required_score']}")
            if 'rewrite_header_subject' in settings:
                lines.append(f"rewrite_header Subject {settings['rewrite_header_subject']}")
            if 'use_bayes' in settings:
                lines.append(f"use_bayes {'1' if settings['use_bayes'] else '0'}")
            if 'bayes_auto_learn' in settings:
                lines.append(f"bayes_auto_learn {'1' if settings['bayes_auto_learn'] else '0'}")

            content = '\n'.join(lines) + '\n'
            run_privileged(f"printf '%s' '{content}' > {local_cf}", shell=True)

            ServiceControl.restart('spamassassin')
            return {'success': True, 'message': 'SpamAssassin configuration updated'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # ==========================================
    # DKIM / SPF / DMARC
    # ==========================================

    @classmethod
    def install_dkim(cls) -> Dict:
        """Install OpenDKIM."""
        try:
            if os.name == 'nt':
                return {'success': False, 'error': 'OpenDKIM requires Linux'}

            manager = PackageManager.detect()
            packages = ['opendkim', 'opendkim-tools'] if manager == 'apt' else ['opendkim']

            result = PackageManager.install(packages)
            if result.returncode != 0:
                return {'success': False, 'error': result.stderr or 'Installation failed'}

            # Create directories
            run_privileged(['mkdir', '-p', cls.DKIM_KEY_DIR])
            run_privileged(['chown', '-R', 'opendkim:opendkim', '/etc/opendkim'])

            # Create initial config files
            for filepath in [cls.DKIM_KEY_TABLE, cls.DKIM_SIGNING_TABLE, cls.DKIM_TRUSTED_HOSTS]:
                if not os.path.exists(filepath):
                    run_privileged(f'touch {filepath}', shell=True)
                    run_privileged(['chown', 'opendkim:opendkim', filepath])

            # Set trusted hosts
            run_privileged(
                f"printf '127.0.0.1\\nlocalhost\\n' > {cls.DKIM_TRUSTED_HOSTS}",
                shell=True
            )

            ServiceControl.enable('opendkim')
            ServiceControl.start('opendkim')

            return {'success': True, 'message': 'OpenDKIM installed successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def generate_dkim_key(cls, domain: str, selector: str = 'mail') -> Dict:
        """Generate DKIM keys for a domain."""
        try:
            if os.name == 'nt':
                return {'success': False, 'error': 'OpenDKIM requires Linux'}

            if not re.match(r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', domain):
                return {'success': False, 'error': 'Invalid domain'}
            if not re.match(r'^[a-zA-Z0-9]+$', selector):
                return {'success': False, 'error': 'Invalid selector'}

            key_dir = os.path.join(cls.DKIM_KEY_DIR, domain)
            run_privileged(['mkdir', '-p', key_dir])

            # Generate key pair
            run_privileged([
                'opendkim-genkey',
                '-b', '2048',
                '-d', domain,
                '-D', key_dir,
                '-s', selector,
                '-v'
            ])

            run_privileged(['chown', '-R', 'opendkim:opendkim', key_dir])

            # Read the public key for DNS record
            txt_file = os.path.join(key_dir, f'{selector}.txt')
            r = run_privileged(['cat', txt_file])
            dns_record = r.stdout.strip() if r.returncode == 0 else ''

            # Update key table
            key_entry = f'{selector}._domainkey.{domain} {domain}:{selector}:{key_dir}/{selector}.private\n'
            cls._add_or_update_line(cls.DKIM_KEY_TABLE, f'{selector}._domainkey.{domain}', key_entry)

            # Update signing table
            sign_entry = f'*@{domain} {selector}._domainkey.{domain}\n'
            cls._add_or_update_line(cls.DKIM_SIGNING_TABLE, f'*@{domain}', sign_entry)

            # Add domain to trusted hosts
            run_privileged(f'echo "{domain}" >> {cls.DKIM_TRUSTED_HOSTS}', shell=True)

            ServiceControl.restart('opendkim')

            return {
                'success': True,
                'dns_record': dns_record,
                'selector': selector,
                'message': f'DKIM key generated for {domain}'
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def get_dns_records(cls, domain: str) -> Dict:
        """Get recommended DNS records for email authentication (SPF, DKIM, DMARC)."""
        records = []

        # SPF record
        records.append({
            'type': 'TXT',
            'name': domain,
            'value': 'v=spf1 mx a ~all',
            'purpose': 'SPF - Authorize this server to send email',
        })

        # DMARC record
        records.append({
            'type': 'TXT',
            'name': f'_dmarc.{domain}',
            'value': f'v=DMARC1; p=quarantine; rua=mailto:dmarc@{domain}; pct=100',
            'purpose': 'DMARC - Email authentication policy',
        })

        # DKIM record (read from generated key)
        if os.name != 'nt':
            key_dir = os.path.join(cls.DKIM_KEY_DIR, domain)
            txt_files = []
            try:
                r = run_privileged(['ls', key_dir])
                if r.returncode == 0:
                    txt_files = [f for f in r.stdout.split() if f.endswith('.txt')]
            except Exception:
                pass

            for txt_file in txt_files:
                selector = txt_file.replace('.txt', '')
                r = run_privileged(['cat', os.path.join(key_dir, txt_file)])
                if r.returncode == 0:
                    records.append({
                        'type': 'TXT',
                        'name': f'{selector}._domainkey.{domain}',
                        'value': r.stdout.strip(),
                        'purpose': f'DKIM - Email signing ({selector} selector)',
                    })

        # MX record
        records.append({
            'type': 'MX',
            'name': domain,
            'value': f'10 mail.{domain}',
            'purpose': 'MX - Direct email to this server',
        })

        return {'success': True, 'records': records}

    # ==========================================
    # SERVICE CONTROL
    # ==========================================

    @classmethod
    def start_service(cls, service: str) -> Dict:
        """Start an email service."""
        allowed = {'postfix', 'dovecot', 'spamassassin', 'opendkim'}
        if service not in allowed:
            return {'success': False, 'error': f'Unknown service: {service}'}

        try:
            r = ServiceControl.start(service)
            if r.returncode != 0:
                return {'success': False, 'error': r.stderr or f'Failed to start {service}'}
            return {'success': True, 'message': f'{service} started'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def stop_service(cls, service: str) -> Dict:
        """Stop an email service."""
        allowed = {'postfix', 'dovecot', 'spamassassin', 'opendkim'}
        if service not in allowed:
            return {'success': False, 'error': f'Unknown service: {service}'}

        try:
            r = ServiceControl.stop(service)
            if r.returncode != 0:
                return {'success': False, 'error': r.stderr or f'Failed to stop {service}'}
            return {'success': True, 'message': f'{service} stopped'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def restart_service(cls, service: str) -> Dict:
        """Restart an email service."""
        allowed = {'postfix', 'dovecot', 'spamassassin', 'opendkim'}
        if service not in allowed:
            return {'success': False, 'error': f'Unknown service: {service}'}

        try:
            r = ServiceControl.restart(service)
            if r.returncode != 0:
                return {'success': False, 'error': r.stderr or f'Failed to restart {service}'}
            return {'success': True, 'message': f'{service} restarted'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # ==========================================
    # WEBMAIL
    # ==========================================

    @classmethod
    def get_webmail_status(cls) -> Dict:
        """Check if Roundcube webmail is installed."""
        if os.name == 'nt':
            return {'installed': False, 'url': None}

        installed = (
            os.path.exists('/var/www/roundcube') or
            os.path.exists('/usr/share/roundcube') or
            PackageManager.is_installed('roundcube')
        )

        return {
            'installed': installed,
            'url': '/webmail' if installed else None,
        }

    @classmethod
    def install_webmail(cls) -> Dict:
        """Install Roundcube webmail."""
        try:
            if os.name == 'nt':
                return {'success': False, 'error': 'Roundcube requires Linux'}

            result = PackageManager.install(['roundcube', 'roundcube-plugins'])
            if result.returncode != 0:
                return {'success': False, 'error': result.stderr or 'Installation failed'}

            return {'success': True, 'message': 'Roundcube webmail installed'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # ==========================================
    # MAIL LOGS
    # ==========================================

    @classmethod
    def get_mail_log(cls, lines: int = 100) -> Dict:
        """Get recent mail log entries."""
        log_paths = ['/var/log/mail.log', '/var/log/maillog']

        for log_path in log_paths:
            if os.path.exists(log_path):
                try:
                    r = run_privileged(['tail', '-n', str(lines), log_path])
                    if r.returncode == 0:
                        log_lines = [l for l in r.stdout.split('\n') if l.strip()]
                        return {'success': True, 'lines': log_lines,
                                'source': log_path}
                except Exception:
                    continue

        # Try journalctl fallback
        try:
            r = run_privileged(['journalctl', '-u', 'postfix', '-n', str(lines), '--no-pager'])
            if r.returncode == 0:
                log_lines = [l for l in r.stdout.split('\n') if l.strip()]
                return {'success': True, 'lines': log_lines,
                        'source': 'journalctl'}
        except Exception:
            pass

        return {'success': True, 'lines': [], 'source': None}
