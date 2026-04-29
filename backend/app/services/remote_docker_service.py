"""
Remote Docker Service

Provides Docker operations on remote servers via agents.
This service routes Docker commands to the appropriate agent
and returns the results.
"""

from typing import Optional, List, Dict, Any
from flask_jwt_extended import get_jwt_identity

from app.services.agent_registry import agent_registry
from app.models.server import Server


def _fmt_bytes(n: int) -> str:
    """Convert byte count to human-readable string (e.g. 4.2 GB)."""
    if not n:
        return '0 B'
    for unit in ('B', 'KB', 'MB', 'GB', 'TB'):
        if n < 1024:
            return f'{n:.1f} {unit}'
        n /= 1024
    return f'{n:.1f} PB'


def _time_from_agent_timestamp(ts_ms) -> dict:
    """Build a time dict from the agent's Unix-millisecond timestamp (UTC)."""
    from datetime import datetime as _dt
    try:
        dt = _dt.utcfromtimestamp(int(ts_ms) / 1000) if ts_ms else _dt.utcnow()
    except (TypeError, ValueError, OSError):
        dt = _dt.utcnow()
    return {
        'current_time':           dt.isoformat(),
        'current_time_formatted': dt.strftime('%Y-%m-%d %H:%M:%S'),
        'timezone_id':            'UTC',
        'timezone_name':          'UTC',
        'utc_offset':             'UTC+0:00',
        'utc_offset_seconds':     0,
    }


def _normalize_agent_metrics(data: dict) -> dict:
    """Convert the agent's flat SystemMetrics struct to the nested shape the dashboard expects."""
    mem_total = data.get('memory_total', 0)
    mem_used  = data.get('memory_used',  0)
    mem_free  = max(mem_total - mem_used, 0)

    swap_total = data.get('swap_total', 0)
    swap_used  = data.get('swap_used',  0)

    disk_total = data.get('disk_total', 0)
    disk_used  = data.get('disk_used',  0)
    disk_free  = max(disk_total - disk_used, 0)

    net_rx = data.get('network_rx', 0)
    net_tx = data.get('network_tx', 0)

    return {
        'cpu': {
            'percent':        data.get('cpu_percent', 0),
            'count_logical':  data.get('cpu_threads', data.get('cpu_cores', 0)),
            'count_physical': data.get('cpu_cores', 0),
            'per_core':       data.get('cpu_per_core', []),
        },
        'memory': {
            'ram': {
                'total':        mem_total,
                'used':         mem_used,
                'free':         mem_free,
                'percent':      data.get('memory_percent', 0),
                'total_human':  _fmt_bytes(mem_total),
                'used_human':   _fmt_bytes(mem_used),
                'free_human':   _fmt_bytes(mem_free),
                'cached_human': '0 B',
            },
            'swap': {
                'total':       swap_total,
                'used':        swap_used,
                'percent':     data.get('swap_percent', 0),
                'total_human': _fmt_bytes(swap_total),
                'used_human':  _fmt_bytes(swap_used),
            },
        },
        'disk': {
            'partitions': [{
                'device':      '/',
                'mountpoint':  '/',
                'total':       disk_total,
                'used':        disk_used,
                'free':        disk_free,
                'percent':     data.get('disk_percent', 0),
                'total_human': _fmt_bytes(disk_total),
                'used_human':  _fmt_bytes(disk_used),
                'free_human':  _fmt_bytes(disk_free),
            }],
        },
        'network': {
            'io': {
                'bytes_recv':       net_rx,
                'bytes_sent':       net_tx,
                'bytes_recv_human': _fmt_bytes(net_rx),
                'bytes_sent_human': _fmt_bytes(net_tx),
                'bytes_recv_rate':  data.get('network_rx_rate', 0),
                'bytes_sent_rate':  data.get('network_tx_rate', 0),
            },
        },
        'system': {
            'uptime_seconds': data.get('uptime', 0),
            'hostname':       data.get('hostname', ''),
            'kernel':         data.get('kernel_version', ''),
            'ip_address':     '',
        },
        'load_average': {
            '1min':  data.get('load_avg_1', 0),
            '5min':  data.get('load_avg_5', 0),
            '15min': data.get('load_avg_15', 0),
        },
        'time':      _time_from_agent_timestamp(data.get('timestamp')),
        'timestamp': data.get('timestamp', ''),
    }


def _normalize_agent_system_info(data: dict) -> dict:
    """Convert the agent's flat SystemInfo struct to the shape the dashboard expects."""
    return {
        'hostname':      data.get('hostname', ''),
        'os':            data.get('os', ''),
        'platform':      data.get('platform', data.get('os', '')),
        'kernel':        data.get('kernel_version', ''),
        'architecture':  data.get('architecture', ''),
        'ip_address':    '',
        # Flat keys kept for OverviewTab compatibility
        'cpu_model':     data.get('cpu_model', ''),
        'cpu_cores':     data.get('cpu_cores', 0),
        'cpu_threads':   data.get('cpu_threads', 0),
        'total_memory':  data.get('total_memory', 0),
        'total_disk':    data.get('total_disk', 0),
        # Nested keys for Dashboard compatibility
        'cpu': {
            'model':        data.get('cpu_model', ''),
            'architecture': data.get('architecture', ''),
            'cores':        data.get('cpu_cores', 0),
            'threads':      data.get('cpu_threads', 0),
        },
    }


class RemoteDockerService:
    """
    Service for executing Docker commands on remote servers.

    All methods accept a server_id parameter to target a specific server.
    If server_id is None or 'local', the command is executed locally
    using the existing DockerService.
    """

    # ==================== Containers ====================

    @staticmethod
    def list_containers(server_id: str, all: bool = False, user_id: int = None) -> Dict[str, Any]:
        """
        List containers on a remote server.

        Args:
            server_id: Target server ID
            all: Include stopped containers
            user_id: User ID for audit logging

        Returns:
            dict: {success, data: [containers], error}
        """
        if not server_id or server_id == 'local':
            # Use local Docker
            from app.services.docker_service import DockerService
            try:
                containers = DockerService.list_containers(all=all)
                return {'success': True, 'data': containers}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:container:list',
            params={'all': all},
            user_id=user_id
        )

    @staticmethod
    def inspect_container(server_id: str, container_id: str, user_id: int = None) -> Dict[str, Any]:
        """Inspect a container on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                info = DockerService.inspect_container(container_id)
                return {'success': True, 'data': info}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:container:inspect',
            params={'id': container_id},
            user_id=user_id
        )

    @staticmethod
    def start_container(server_id: str, container_id: str, user_id: int = None) -> Dict[str, Any]:
        """Start a container on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                DockerService.start_container(container_id)
                return {'success': True}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:container:start',
            params={'id': container_id},
            user_id=user_id
        )

    @staticmethod
    def stop_container(server_id: str, container_id: str, timeout: int = None, user_id: int = None) -> Dict[str, Any]:
        """Stop a container on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                DockerService.stop_container(container_id, timeout=timeout)
                return {'success': True}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        params = {'id': container_id}
        if timeout:
            params['timeout'] = timeout

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:container:stop',
            params=params,
            user_id=user_id
        )

    @staticmethod
    def restart_container(server_id: str, container_id: str, timeout: int = None, user_id: int = None) -> Dict[str, Any]:
        """Restart a container on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                DockerService.restart_container(container_id, timeout=timeout)
                return {'success': True}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        params = {'id': container_id}
        if timeout:
            params['timeout'] = timeout

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:container:restart',
            params=params,
            user_id=user_id
        )

    @staticmethod
    def remove_container(
        server_id: str,
        container_id: str,
        force: bool = False,
        remove_volumes: bool = False,
        user_id: int = None
    ) -> Dict[str, Any]:
        """Remove a container on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                DockerService.remove_container(container_id, force=force, v=remove_volumes)
                return {'success': True}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:container:remove',
            params={
                'id': container_id,
                'force': force,
                'remove_volumes': remove_volumes
            },
            user_id=user_id
        )

    @staticmethod
    def get_container_stats(server_id: str, container_id: str, user_id: int = None) -> Dict[str, Any]:
        """Get container stats from a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                stats = DockerService.get_container_stats(container_id)
                return {'success': True, 'data': stats}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:container:stats',
            params={'id': container_id},
            user_id=user_id
        )

    @staticmethod
    def get_container_logs(server_id: str, container_id: str, tail: str = '100',
                           since: str = None, timestamps: bool = True,
                           user_id: int = None) -> Dict[str, Any]:
        """
        Get container logs from a remote server.

        Args:
            server_id: Target server ID
            container_id: Container ID or name
            tail: Number of lines to show from end (default 100, 'all' for all)
            since: Show logs since timestamp (e.g., '2021-01-01T00:00:00Z')
            timestamps: Include timestamps in output
            user_id: User ID for audit logging

        Returns:
            dict: {success, data: {logs: str}, error}
        """
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                logs = DockerService.get_container_logs(
                    container_id,
                    tail=tail,
                    since=since,
                    timestamps=timestamps
                )
                return {'success': True, 'data': {'logs': logs}}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:container:logs',
            params={
                'id': container_id,
                'tail': tail,
                'since': since or '',
                'timestamps': timestamps
            },
            timeout=30.0,
            user_id=user_id
        )

    # ==================== Images ====================

    @staticmethod
    def list_images(server_id: str, user_id: int = None) -> Dict[str, Any]:
        """List images on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                images = DockerService.list_images()
                return {'success': True, 'data': images}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:image:list',
            params={},
            user_id=user_id
        )

    @staticmethod
    def pull_image(server_id: str, image: str, user_id: int = None) -> Dict[str, Any]:
        """Pull an image on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                result = DockerService.pull_image(image)
                return {'success': True, 'data': result}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:image:pull',
            params={'image': image},
            timeout=300.0,  # 5 minutes for pull
            user_id=user_id
        )

    @staticmethod
    def remove_image(server_id: str, image_id: str, force: bool = False, user_id: int = None) -> Dict[str, Any]:
        """Remove an image on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                DockerService.remove_image(image_id, force=force)
                return {'success': True}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:image:remove',
            params={'id': image_id, 'force': force},
            user_id=user_id
        )

    # ==================== Volumes ====================

    @staticmethod
    def list_volumes(server_id: str, user_id: int = None) -> Dict[str, Any]:
        """List volumes on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                volumes = DockerService.list_volumes()
                return {'success': True, 'data': volumes}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:volume:list',
            params={},
            user_id=user_id
        )

    @staticmethod
    def remove_volume(server_id: str, name: str, force: bool = False, user_id: int = None) -> Dict[str, Any]:
        """Remove a volume on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                DockerService.remove_volume(name, force=force)
                return {'success': True}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:volume:remove',
            params={'name': name, 'force': force},
            user_id=user_id
        )

    # ==================== Networks ====================

    @staticmethod
    def list_networks(server_id: str, user_id: int = None) -> Dict[str, Any]:
        """List networks on a remote server"""
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                networks = DockerService.list_networks()
                return {'success': True, 'data': networks}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:network:list',
            params={},
            user_id=user_id
        )

    # ==================== System ====================

    @staticmethod
    def get_system_metrics(server_id: str, user_id: int = None) -> Dict[str, Any]:
        """Get system metrics from a remote server"""
        if not server_id or server_id == 'local':
            from app.services.system_service import SystemService
            try:
                metrics = SystemService.get_all_metrics()
                return {'success': True, 'data': metrics}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        result = agent_registry.send_command(
            server_id=server_id,
            action='system:metrics',
            params={},
            user_id=user_id
        )
        if result.get('success') and isinstance(result.get('data'), dict):
            normalized = _normalize_agent_metrics(result['data'])
            server = Server.query.get(server_id)
            if server:
                normalized['system']['ip_address'] = server.ip_address or ''
            result['data'] = normalized
        return result

    @staticmethod
    def get_system_info(server_id: str, user_id: int = None) -> Dict[str, Any]:
        """Get system info from a remote server"""
        if not server_id or server_id == 'local':
            from app.services.system_service import SystemService
            try:
                info = SystemService.get_system_info()
                return {'success': True, 'data': info}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        result = agent_registry.send_command(
            server_id=server_id,
            action='system:info',
            params={},
            user_id=user_id
        )
        if result.get('success') and isinstance(result.get('data'), dict):
            normalized = _normalize_agent_system_info(result['data'])
            server = Server.query.get(server_id)
            if server:
                normalized['ip_address'] = server.ip_address or ''
            result['data'] = normalized
        return result

    # ==================== Utility ====================

    @staticmethod
    def get_available_servers() -> List[Dict[str, Any]]:
        """
        Get list of available servers for Docker operations.

        Returns servers that are online and have Docker permissions.
        """
        # Always include local server
        servers = [{
            'id': 'local',
            'name': 'Local (this server)',
            'status': 'online',
            'is_local': True
        }]

        # Get remote servers
        connected_ids = set(agent_registry.get_connected_servers())

        remote_servers = Server.query.filter(
            Server.status.in_(['online', 'connecting'])
        ).all()

        for server in remote_servers:
            has_docker_perm = server.has_permission('docker:container:read')
            servers.append({
                'id': server.id,
                'name': server.name,
                'status': 'online' if server.id in connected_ids else server.status,
                'is_local': False,
                'has_docker': has_docker_perm,
                'group_name': server.group.name if server.group else None
            })

        return servers

    # ==================== Docker Compose ====================

    @staticmethod
    def compose_list(server_id: str, user_id: int = None) -> Dict[str, Any]:
        """
        List compose projects on a remote server.

        Args:
            server_id: Target server ID
            user_id: User ID for audit logging

        Returns:
            dict: {success, data: [projects], error}
        """
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                projects = DockerService.compose_list()
                return {'success': True, 'data': projects}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:compose:list',
            params={},
            user_id=user_id
        )

    @staticmethod
    def compose_ps(server_id: str, project_path: str, user_id: int = None) -> Dict[str, Any]:
        """
        List containers for a compose project.

        Args:
            server_id: Target server ID
            project_path: Path to docker-compose.yml
            user_id: User ID for audit logging

        Returns:
            dict: {success, data: [containers], error}
        """
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                containers = DockerService.compose_ps(project_path)
                return {'success': True, 'data': containers}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:compose:ps',
            params={'project_path': project_path},
            user_id=user_id
        )

    @staticmethod
    def compose_up(server_id: str, project_path: str, detach: bool = True,
                   build: bool = False, user_id: int = None) -> Dict[str, Any]:
        """
        Start a compose project.

        Args:
            server_id: Target server ID
            project_path: Path to docker-compose.yml
            detach: Run in detached mode
            build: Build images before starting
            user_id: User ID for audit logging

        Returns:
            dict: {success, output, error}
        """
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                result = DockerService.compose_up(project_path, detach=detach, build=build)
                return {'success': True, 'data': result}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:compose:up',
            params={
                'project_path': project_path,
                'detach': detach,
                'build': build
            },
            timeout=300.0,  # 5 minutes for compose up
            user_id=user_id
        )

    @staticmethod
    def compose_down(server_id: str, project_path: str, volumes: bool = False,
                     remove_orphans: bool = True, user_id: int = None) -> Dict[str, Any]:
        """
        Stop a compose project.

        Args:
            server_id: Target server ID
            project_path: Path to docker-compose.yml
            volumes: Remove volumes
            remove_orphans: Remove orphan containers
            user_id: User ID for audit logging

        Returns:
            dict: {success, output, error}
        """
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                result = DockerService.compose_down(project_path, volumes=volumes, remove_orphans=remove_orphans)
                return {'success': True, 'data': result}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:compose:down',
            params={
                'project_path': project_path,
                'volumes': volumes,
                'remove_orphans': remove_orphans
            },
            timeout=120.0,  # 2 minutes for compose down
            user_id=user_id
        )

    @staticmethod
    def compose_logs(server_id: str, project_path: str, service: str = None,
                     tail: int = 100, user_id: int = None) -> Dict[str, Any]:
        """
        Get logs from a compose project.

        Args:
            server_id: Target server ID
            project_path: Path to docker-compose.yml
            service: Specific service name (optional)
            tail: Number of lines to retrieve
            user_id: User ID for audit logging

        Returns:
            dict: {success, data: {logs: str}, error}
        """
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                logs = DockerService.compose_logs(project_path, service=service, tail=tail)
                return {'success': True, 'data': {'logs': logs}}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:compose:logs',
            params={
                'project_path': project_path,
                'service': service or '',
                'tail': tail
            },
            timeout=30.0,
            user_id=user_id
        )

    @staticmethod
    def compose_restart(server_id: str, project_path: str, service: str = None,
                        user_id: int = None) -> Dict[str, Any]:
        """
        Restart a compose project or specific service.

        Args:
            server_id: Target server ID
            project_path: Path to docker-compose.yml
            service: Specific service name (optional)
            user_id: User ID for audit logging

        Returns:
            dict: {success, output, error}
        """
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                result = DockerService.compose_restart(project_path, service=service)
                return {'success': True, 'data': result}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:compose:restart',
            params={
                'project_path': project_path,
                'service': service or ''
            },
            user_id=user_id
        )

    @staticmethod
    def compose_pull(server_id: str, project_path: str, service: str = None,
                     user_id: int = None) -> Dict[str, Any]:
        """
        Pull images for a compose project.

        Args:
            server_id: Target server ID
            project_path: Path to docker-compose.yml
            service: Specific service name (optional)
            user_id: User ID for audit logging

        Returns:
            dict: {success, output, error}
        """
        if not server_id or server_id == 'local':
            from app.services.docker_service import DockerService
            try:
                result = DockerService.compose_pull(project_path, service=service)
                return {'success': True, 'data': result}
            except Exception as e:
                return {'success': False, 'error': str(e)}

        return agent_registry.send_command(
            server_id=server_id,
            action='docker:compose:pull',
            params={
                'project_path': project_path,
                'service': service or ''
            },
            timeout=300.0,  # 5 minutes for pull
            user_id=user_id
        )
