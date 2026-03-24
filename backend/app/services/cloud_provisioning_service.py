import logging
from datetime import datetime
from app import db
from app.models.cloud_server import CloudProvider, CloudServer, CloudSnapshot

logger = logging.getLogger(__name__)


class CloudProvisioningService:
    """Service for provisioning cloud servers via provider APIs."""

    SUPPORTED_PROVIDERS = {
        'digitalocean': {
            'name': 'DigitalOcean',
            'regions': ['nyc1', 'nyc3', 'sfo3', 'ams3', 'lon1', 'fra1', 'sgp1', 'blr1', 'tor1', 'syd1'],
            'sizes': ['s-1vcpu-1gb', 's-1vcpu-2gb', 's-2vcpu-2gb', 's-2vcpu-4gb', 's-4vcpu-8gb', 's-8vcpu-16gb'],
            'images': ['ubuntu-22-04-x64', 'ubuntu-24-04-x64', 'debian-12-x64', 'centos-stream-9-x64', 'rocky-9-x64'],
        },
        'hetzner': {
            'name': 'Hetzner Cloud',
            'regions': ['nbg1', 'fsn1', 'hel1', 'ash', 'hil'],
            'sizes': ['cx22', 'cx32', 'cx42', 'cx52', 'cpx11', 'cpx21', 'cpx31'],
            'images': ['ubuntu-22.04', 'ubuntu-24.04', 'debian-12', 'centos-stream-9', 'rocky-9'],
        },
        'vultr': {
            'name': 'Vultr',
            'regions': ['ewr', 'ord', 'dfw', 'sea', 'lax', 'atl', 'ams', 'lhr', 'fra', 'nrt', 'icn', 'sgp', 'syd'],
            'sizes': ['vc2-1c-1gb', 'vc2-1c-2gb', 'vc2-2c-4gb', 'vc2-4c-8gb', 'vc2-6c-16gb'],
            'images': ['Ubuntu 22.04', 'Ubuntu 24.04', 'Debian 12', 'CentOS Stream 9'],
        },
        'linode': {
            'name': 'Linode (Akamai)',
            'regions': ['us-east', 'us-central', 'us-west', 'eu-west', 'eu-central', 'ap-south', 'ap-northeast', 'ap-southeast'],
            'sizes': ['g6-nanode-1', 'g6-standard-1', 'g6-standard-2', 'g6-standard-4', 'g6-standard-6'],
            'images': ['linode/ubuntu22.04', 'linode/ubuntu24.04', 'linode/debian12'],
        },
    }

    # --- Providers ---

    @staticmethod
    def list_providers():
        return CloudProvider.query.filter_by(is_active=True).all()

    @staticmethod
    def get_provider(provider_id):
        return CloudProvider.query.get(provider_id)

    @staticmethod
    def create_provider(data, user_id=None):
        ptype = data.get('provider_type')
        if ptype not in CloudProvisioningService.SUPPORTED_PROVIDERS:
            raise ValueError(f'Unsupported provider: {ptype}')

        provider = CloudProvider(
            name=data.get('name', CloudProvisioningService.SUPPORTED_PROVIDERS[ptype]['name']),
            provider_type=ptype,
            api_key_encrypted=data.get('api_key', ''),
            created_by=user_id,
        )
        db.session.add(provider)
        db.session.commit()
        return provider

    @staticmethod
    def delete_provider(provider_id):
        provider = CloudProvider.query.get(provider_id)
        if not provider:
            return False
        provider.is_active = False
        db.session.commit()
        return True

    @staticmethod
    def get_provider_options(provider_type):
        return CloudProvisioningService.SUPPORTED_PROVIDERS.get(provider_type, {})

    # --- Servers ---

    @staticmethod
    def list_servers(provider_id=None):
        query = CloudServer.query.filter(CloudServer.status != CloudServer.STATUS_DESTROYED)
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        return query.order_by(CloudServer.created_at.desc()).all()

    @staticmethod
    def get_server(server_id):
        return CloudServer.query.get(server_id)

    @staticmethod
    def create_server(data, user_id=None):
        """Provision a new cloud server."""
        provider = CloudProvider.query.get(data['provider_id'])
        if not provider:
            raise ValueError('Provider not found')

        server = CloudServer(
            provider_id=provider.id,
            name=data['name'],
            region=data.get('region'),
            size=data.get('size'),
            image=data.get('image'),
            ssh_key_id=data.get('ssh_key_id'),
            created_by=user_id,
        )
        db.session.add(server)
        db.session.commit()

        # Call provider API to create server
        try:
            result = CloudProvisioningService._provider_create(provider, server, data)
            server.external_id = result.get('id')
            server.ip_address = result.get('ip_address')
            server.ipv6_address = result.get('ipv6_address')
            server.monthly_cost = result.get('monthly_cost', 0)
            server.status = CloudServer.STATUS_ACTIVE
            server.hostname = result.get('hostname', server.name)
            db.session.commit()
        except Exception as e:
            server.status = CloudServer.STATUS_ERROR
            server.server_metadata = {'error': str(e)}
            db.session.commit()
            raise

        # Auto-install agent if requested
        if data.get('install_agent') and server.ip_address:
            try:
                CloudProvisioningService._install_agent(server)
                server.agent_installed = True
                db.session.commit()
            except Exception as e:
                logger.warning(f'Agent install failed for {server.name}: {e}')

        return server

    @staticmethod
    def destroy_server(server_id):
        server = CloudServer.query.get(server_id)
        if not server:
            return False

        try:
            CloudProvisioningService._provider_destroy(server.provider, server)
        except Exception as e:
            logger.error(f'Provider destroy failed: {e}')

        server.status = CloudServer.STATUS_DESTROYED
        server.destroyed_at = datetime.utcnow()
        db.session.commit()
        return True

    @staticmethod
    def resize_server(server_id, new_size):
        server = CloudServer.query.get(server_id)
        if not server:
            return None
        try:
            CloudProvisioningService._provider_resize(server.provider, server, new_size)
            server.size = new_size
            db.session.commit()
            return server
        except Exception as e:
            raise ValueError(f'Resize failed: {e}')

    # --- Snapshots ---

    @staticmethod
    def create_snapshot(server_id, name):
        server = CloudServer.query.get(server_id)
        if not server:
            raise ValueError('Server not found')

        snapshot = CloudSnapshot(
            server_id=server_id,
            name=name,
        )
        db.session.add(snapshot)
        db.session.commit()

        try:
            result = CloudProvisioningService._provider_snapshot(server.provider, server, name)
            snapshot.external_id = result.get('id')
            snapshot.size_gb = result.get('size_gb')
            snapshot.status = 'available'
            db.session.commit()
        except Exception as e:
            snapshot.status = 'error'
            db.session.commit()
            raise

        return snapshot

    @staticmethod
    def get_snapshots(server_id):
        return CloudSnapshot.query.filter_by(server_id=server_id).order_by(CloudSnapshot.created_at.desc()).all()

    @staticmethod
    def delete_snapshot(snapshot_id):
        snapshot = CloudSnapshot.query.get(snapshot_id)
        if not snapshot:
            return False
        db.session.delete(snapshot)
        db.session.commit()
        return True

    @staticmethod
    def get_cost_summary():
        """Get total monthly cost across all active servers."""
        servers = CloudServer.query.filter(
            CloudServer.status.in_([CloudServer.STATUS_ACTIVE, CloudServer.STATUS_OFF])
        ).all()

        by_provider = {}
        total = 0
        for s in servers:
            key = s.provider.name if s.provider else 'Unknown'
            by_provider.setdefault(key, {'count': 0, 'cost': 0})
            by_provider[key]['count'] += 1
            by_provider[key]['cost'] += s.monthly_cost or 0
            total += s.monthly_cost or 0

        return {
            'total_monthly': round(total, 2),
            'server_count': len(servers),
            'by_provider': by_provider,
        }

    # --- Provider API calls ---

    @staticmethod
    def _provider_create(provider, server, data):
        """Call provider API to create server. Returns dict with id, ip_address, etc."""
        ptype = provider.provider_type

        if ptype == 'digitalocean':
            import requests
            resp = requests.post('https://api.digitalocean.com/v2/droplets', json={
                'name': server.name,
                'region': server.region,
                'size': server.size,
                'image': server.image,
                'ssh_keys': [data.get('ssh_key_id')] if data.get('ssh_key_id') else [],
            }, headers={'Authorization': f'Bearer {provider.api_key_encrypted}'}, timeout=30)
            resp.raise_for_status()
            droplet = resp.json().get('droplet', {})
            networks = droplet.get('networks', {})
            ipv4 = next((n['ip_address'] for n in networks.get('v4', []) if n['type'] == 'public'), None)
            return {
                'id': str(droplet.get('id')),
                'ip_address': ipv4,
                'monthly_cost': droplet.get('size', {}).get('price_monthly', 0),
            }

        elif ptype == 'hetzner':
            import requests
            resp = requests.post('https://api.hetzner.cloud/v1/servers', json={
                'name': server.name,
                'server_type': server.size,
                'image': server.image,
                'location': server.region,
            }, headers={'Authorization': f'Bearer {provider.api_key_encrypted}'}, timeout=30)
            resp.raise_for_status()
            srv = resp.json().get('server', {})
            return {
                'id': str(srv.get('id')),
                'ip_address': srv.get('public_net', {}).get('ipv4', {}).get('ip'),
            }

        # Fallback for unsupported or mock
        return {'id': 'mock-id', 'ip_address': '0.0.0.0'}

    @staticmethod
    def _provider_destroy(provider, server):
        if not server.external_id:
            return
        ptype = provider.provider_type
        if ptype == 'digitalocean':
            import requests
            requests.delete(
                f'https://api.digitalocean.com/v2/droplets/{server.external_id}',
                headers={'Authorization': f'Bearer {provider.api_key_encrypted}'}, timeout=30
            )

    @staticmethod
    def _provider_resize(provider, server, new_size):
        pass  # Provider-specific resize logic

    @staticmethod
    def _provider_snapshot(provider, server, name):
        return {'id': 'snap-mock', 'size_gb': 0}

    @staticmethod
    def _install_agent(server):
        """SSH into server and install the ServerKit agent."""
        pass  # Would use paramiko or similar to SSH and run install script
