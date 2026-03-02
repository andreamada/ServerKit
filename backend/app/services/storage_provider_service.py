import os
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Optional

from app import paths


class StorageProviderService:
    """Service for managing remote backup storage (S3-compatible, Backblaze B2)."""

    CONFIG_FILE = os.path.join(paths.SERVERKIT_CONFIG_DIR, 'storage.json')

    @classmethod
    def get_config(cls) -> Dict:
        """Get storage provider configuration."""
        if os.path.exists(cls.CONFIG_FILE):
            try:
                with open(cls.CONFIG_FILE, 'r') as f:
                    return json.load(f)
            except Exception:
                pass

        return {
            'provider': 'local',
            's3': {
                'bucket': '',
                'region': 'us-east-1',
                'access_key': '',
                'secret_key': '',
                'endpoint_url': '',
                'path_prefix': 'serverkit-backups'
            },
            'b2': {
                'bucket': '',
                'key_id': '',
                'application_key': '',
                'endpoint_url': '',
                'path_prefix': 'serverkit-backups'
            },
            'auto_upload': False,
            'keep_local_copy': True
        }

    @classmethod
    def get_config_masked(cls) -> Dict:
        """Get storage config with secrets masked."""
        config = cls.get_config()
        masked = json.loads(json.dumps(config))

        secret_fields = {
            's3': ['access_key', 'secret_key'],
            'b2': ['key_id', 'application_key']
        }

        for provider, fields in secret_fields.items():
            if provider in masked:
                for field in fields:
                    val = masked[provider].get(field, '')
                    if val and len(val) > 4:
                        masked[provider][field] = val[:4] + '*' * (len(val) - 4)

        return masked

    @classmethod
    def save_config(cls, config: Dict) -> Dict:
        """Save storage provider configuration."""
        try:
            os.makedirs(paths.SERVERKIT_CONFIG_DIR, exist_ok=True)

            # Merge with existing config to preserve unmasked secrets
            existing = cls.get_config()
            secret_fields = {
                's3': ['access_key', 'secret_key'],
                'b2': ['key_id', 'application_key']
            }

            for provider, fields in secret_fields.items():
                if provider in config:
                    for field in fields:
                        new_val = config[provider].get(field, '')
                        if new_val and '*' in new_val:
                            # Keep existing value if masked
                            config[provider][field] = existing.get(provider, {}).get(field, '')

            with open(cls.CONFIG_FILE, 'w') as f:
                json.dump(config, f, indent=2)
            return {'success': True, 'message': 'Storage configuration saved'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def _get_client(cls, config: Dict = None):
        """Get boto3 S3 client based on config."""
        import boto3

        if config is None:
            config = cls.get_config()

        provider = config.get('provider', 'local')
        if provider == 'local':
            return None, None, None

        if provider == 's3':
            provider_config = config.get('s3', {})
            client = boto3.client(
                's3',
                region_name=provider_config.get('region', 'us-east-1'),
                aws_access_key_id=provider_config.get('access_key'),
                aws_secret_access_key=provider_config.get('secret_key'),
                endpoint_url=provider_config.get('endpoint_url') or None
            )
            bucket = provider_config.get('bucket', '')
            prefix = provider_config.get('path_prefix', 'serverkit-backups')

        elif provider == 'b2':
            provider_config = config.get('b2', {})
            client = boto3.client(
                's3',
                endpoint_url=provider_config.get('endpoint_url'),
                aws_access_key_id=provider_config.get('key_id'),
                aws_secret_access_key=provider_config.get('application_key')
            )
            bucket = provider_config.get('bucket', '')
            prefix = provider_config.get('path_prefix', 'serverkit-backups')

        else:
            return None, None, None

        return client, bucket, prefix

    @classmethod
    def test_connection(cls, config: Dict = None) -> Dict:
        """Test connection to storage provider."""
        try:
            client, bucket, prefix = cls._get_client(config)
            if client is None:
                return {'success': False, 'error': 'No remote provider configured'}

            # Try to list objects (limited to 1) to verify access
            client.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=1)

            return {
                'success': True,
                'message': f'Connected to bucket "{bucket}" successfully'
            }
        except Exception as e:
            error_msg = str(e)
            if 'NoSuchBucket' in error_msg:
                return {'success': False, 'error': f'Bucket "{bucket}" does not exist'}
            if 'AccessDenied' in error_msg or 'InvalidAccessKeyId' in error_msg:
                return {'success': False, 'error': 'Access denied - check your credentials'}
            return {'success': False, 'error': error_msg}

    @classmethod
    def upload_file(cls, local_path: str, remote_key: str = None) -> Dict:
        """Upload a file to remote storage."""
        try:
            client, bucket, prefix = cls._get_client()
            if client is None:
                return {'success': False, 'error': 'No remote provider configured'}

            if not os.path.exists(local_path):
                return {'success': False, 'error': f'Local file not found: {local_path}'}

            if remote_key is None:
                # Use relative path from backup dir as key
                remote_key = os.path.relpath(local_path, paths.SERVERKIT_BACKUP_DIR)

            full_key = f"{prefix}/{remote_key}" if prefix else remote_key

            file_size = os.path.getsize(local_path)

            # Use multipart upload for files > 100MB
            from boto3.s3.transfer import TransferConfig
            transfer_config = TransferConfig(
                multipart_threshold=100 * 1024 * 1024,
                multipart_chunksize=50 * 1024 * 1024
            )

            client.upload_file(
                local_path, bucket, full_key,
                Config=transfer_config
            )

            return {
                'success': True,
                'message': f'Uploaded to {full_key}',
                'remote_key': full_key,
                'size': file_size
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def upload_directory(cls, local_dir: str, remote_prefix: str = None) -> Dict:
        """Upload all files in a directory to remote storage."""
        try:
            client, bucket, prefix = cls._get_client()
            if client is None:
                return {'success': False, 'error': 'No remote provider configured'}

            if not os.path.isdir(local_dir):
                return {'success': False, 'error': f'Directory not found: {local_dir}'}

            if remote_prefix is None:
                remote_prefix = os.path.relpath(local_dir, paths.SERVERKIT_BACKUP_DIR)

            uploaded = 0
            total_size = 0

            for root, dirs, files in os.walk(local_dir):
                for filename in files:
                    local_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(local_path, local_dir)
                    full_key = f"{prefix}/{remote_prefix}/{rel_path}" if prefix else f"{remote_prefix}/{rel_path}"

                    client.upload_file(local_path, bucket, full_key)
                    uploaded += 1
                    total_size += os.path.getsize(local_path)

            return {
                'success': True,
                'message': f'Uploaded {uploaded} file(s)',
                'files_uploaded': uploaded,
                'total_size': total_size
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def download_file(cls, remote_key: str, local_path: str) -> Dict:
        """Download a file from remote storage."""
        try:
            client, bucket, prefix = cls._get_client()
            if client is None:
                return {'success': False, 'error': 'No remote provider configured'}

            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            client.download_file(bucket, remote_key, local_path)

            return {
                'success': True,
                'message': f'Downloaded to {local_path}',
                'local_path': local_path,
                'size': os.path.getsize(local_path)
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def delete_file(cls, remote_key: str) -> Dict:
        """Delete a file from remote storage."""
        try:
            client, bucket, prefix = cls._get_client()
            if client is None:
                return {'success': False, 'error': 'No remote provider configured'}

            client.delete_object(Bucket=bucket, Key=remote_key)

            return {'success': True, 'message': f'Deleted {remote_key}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def list_files(cls, prefix_filter: str = None) -> Dict:
        """List files in remote storage."""
        try:
            client, bucket, prefix = cls._get_client()
            if client is None:
                return {'success': False, 'error': 'No remote provider configured'}

            search_prefix = prefix or ''
            if prefix_filter:
                search_prefix = f"{search_prefix}/{prefix_filter}" if search_prefix else prefix_filter

            files = []
            paginator = client.get_paginator('list_objects_v2')

            for page in paginator.paginate(Bucket=bucket, Prefix=search_prefix):
                for obj in page.get('Contents', []):
                    files.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat(),
                        'etag': obj.get('ETag', '').strip('"')
                    })

            return {
                'success': True,
                'files': files,
                'total_count': len(files),
                'total_size': sum(f['size'] for f in files)
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @classmethod
    def verify_file(cls, remote_key: str, local_path: str) -> Dict:
        """Verify a remote file matches the local file (size + MD5)."""
        try:
            client, bucket, prefix = cls._get_client()
            if client is None:
                return {'success': False, 'error': 'No remote provider configured'}

            if not os.path.exists(local_path):
                return {'success': False, 'error': 'Local file not found', 'verified': False}

            # Get remote file metadata
            response = client.head_object(Bucket=bucket, Key=remote_key)
            remote_size = response['ContentLength']
            remote_etag = response.get('ETag', '').strip('"')

            # Compare size
            local_size = os.path.getsize(local_path)
            size_match = remote_size == local_size

            # Compute local MD5 for simple files (non-multipart)
            md5_match = None
            if '-' not in remote_etag:
                md5 = hashlib.md5()
                with open(local_path, 'rb') as f:
                    for chunk in iter(lambda: f.read(8192), b''):
                        md5.update(chunk)
                local_md5 = md5.hexdigest()
                md5_match = local_md5 == remote_etag

            verified = size_match and (md5_match is None or md5_match)

            return {
                'success': True,
                'verified': verified,
                'local_size': local_size,
                'remote_size': remote_size,
                'size_match': size_match,
                'md5_match': md5_match
            }
        except Exception as e:
            return {'success': False, 'error': str(e), 'verified': False}

    @classmethod
    def get_remote_stats(cls) -> Dict:
        """Get statistics about remote storage usage."""
        result = cls.list_files()
        if not result.get('success'):
            return {
                'remote_count': 0,
                'remote_size': 0,
                'remote_size_human': '0 B'
            }

        total_size = result.get('total_size', 0)
        return {
            'remote_count': result.get('total_count', 0),
            'remote_size': total_size,
            'remote_size_human': cls._format_size(total_size)
        }

    @staticmethod
    def _format_size(size: int) -> str:
        """Format size in human readable format."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} PB"
