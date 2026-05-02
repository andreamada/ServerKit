import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import PermissionEditor from './PermissionEditor';
import Modal from '../Modal';

const ROLES = [
    { value: 'admin',     label: 'Admin',     desc: 'Full system access including user management and settings' },
    { value: 'developer', label: 'Developer', desc: 'Manage applications, deployments, databases, and domains' },
    { value: 'viewer',    label: 'Viewer',    desc: 'Read-only access to dashboards and logs' },
];

const UserModal = ({ user, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'developer',
        is_active: true,
    });
    const [permissions, setPermissions] = useState({});
    const [showPermissions, setShowPermissions] = useState(false);
    const [templates, setTemplates] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user: currentUser } = useAuth();

    const isEditing = !!user;
    const isSelf = user?.id === currentUser?.id;

    useEffect(() => {
        if (user) {
            setFormData({
                email: user.email || '',
                username: user.username || '',
                password: '',
                confirmPassword: '',
                role: user.role || 'developer',
                is_active: user.is_active !== false,
            });
            if (user.permissions && Object.keys(user.permissions).length > 0) {
                setPermissions(user.permissions);
                setShowPermissions(true);
            }
        }
    }, [user]);

    useEffect(() => {
        api.getPermissionTemplates().then(data => {
            setTemplates(data.templates || {});
        }).catch(() => {});
    }, []);

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (name === 'role' && templates[value]) {
            setPermissions(templates[value]);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.username) {
            setError('Email and username are required');
            return;
        }
        if (!isEditing && !formData.password) {
            setError('Password is required for new users');
            return;
        }
        if (formData.password && formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (formData.password && formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const userData = {
                email: formData.email,
                username: formData.username,
                role: formData.role,
                is_active: formData.is_active,
            };
            if (formData.password) userData.password = formData.password;
            if (showPermissions && formData.role !== 'admin') userData.permissions = permissions;
            await onSave(userData);
        } catch (err) {
            setError(err.message || 'Failed to save user');
        } finally {
            setLoading(false);
        }
    }

    const footer = (
        <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" form="user-modal-form" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create User')}
            </button>
        </>
    );

    return (
        <Modal open={true} onClose={onClose} title={isEditing ? 'Edit User' : 'Add New User'} size="md" footer={footer}>
            <form id="user-modal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block" htmlFor="email">Email</label>
                        <input
                            className="form-control"
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="user@example.com"
                            required
                        />
                    </div>
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block" htmlFor="username">Username</label>
                        <input
                            className="form-control"
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter username"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block" htmlFor="password">
                            {isEditing ? 'New Password' : 'Password'}
                        </label>
                        <input
                            className="form-control"
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={isEditing ? 'Leave blank to keep current' : 'At least 8 characters'}
                            required={!isEditing}
                        />
                    </div>
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block" htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            className="form-control"
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm password"
                            required={!!formData.password}
                        />
                    </div>
                </div>

                <div className="form-group mb-0">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block" htmlFor="role">Role</label>
                    <select
                        className="form-control"
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        disabled={isSelf}
                    >
                        <option value="admin">Admin — Full access</option>
                        <option value="developer">Developer — Manage apps and deployments</option>
                        <option value="viewer">Viewer — Read-only access</option>
                    </select>
                    {isSelf && (
                        <p className="mt-1 text-[11px] text-muted-foreground opacity-70">You cannot change your own role</p>
                    )}
                </div>

                <div className="rounded-md border border-border bg-muted/30 divide-y divide-border overflow-hidden">
                    {ROLES.map(r => (
                        <div key={r.value} className="flex items-start gap-3 px-3 py-2">
                            <span className={`mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${
                                r.value === 'admin' ? 'bg-red-500/15 text-red-500' :
                                r.value === 'developer' ? 'bg-blue-500/15 text-blue-500' :
                                'bg-muted text-muted-foreground'
                            }`}>{r.label}</span>
                            <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                        <p className="text-xs font-medium text-foreground">Account Active</p>
                        {isSelf && (
                            <p className="text-[11px] text-muted-foreground opacity-70">You cannot deactivate your own account</p>
                        )}
                    </div>
                    <label className="toggle-switch ml-4 shrink-0">
                        <input
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            disabled={isSelf}
                        />
                        <span className="toggle-slider" />
                    </label>
                </div>

                {formData.role !== 'admin' && (
                    <div>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                                if (!showPermissions && templates[formData.role]) {
                                    setPermissions(templates[formData.role]);
                                }
                                setShowPermissions(!showPermissions);
                            }}
                        >
                            {showPermissions ? 'Hide' : 'Customize'} Permissions
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" style={{ marginLeft: 4 }}>
                                {showPermissions
                                    ? <polyline points="18 15 12 9 6 15" />
                                    : <polyline points="6 9 12 15 18 9" />
                                }
                            </svg>
                        </button>
                        {showPermissions && (
                            <div className="mt-3">
                                <PermissionEditor permissions={permissions} onChange={setPermissions} />
                            </div>
                        )}
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default UserModal;
