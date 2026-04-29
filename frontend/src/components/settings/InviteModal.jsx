import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PermissionEditor from './PermissionEditor';
import Modal from '../Modal';
import { copyToClipboard as clipboardWrite } from '../../utils/clipboard';

const InviteModal = ({ onClose, onCreated }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('developer');
    const [expiryDays, setExpiryDays] = useState(7);
    const [showPermissions, setShowPermissions] = useState(false);
    const [permissions, setPermissions] = useState({});
    const [templates, setTemplates] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        api.getPermissionTemplates().then(data => {
            setTemplates(data.templates || {});
            if (data.templates?.developer) {
                setPermissions(data.templates.developer);
            }
        }).catch(() => {});
    }, []);

    function handleRoleChange(e) {
        const newRole = e.target.value;
        setRole(newRole);
        if (templates[newRole]) {
            setPermissions(templates[newRole]);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = {
                role,
                expires_in_days: expiryDays === 0 ? null : expiryDays,
            };
            if (email.trim()) data.email = email.trim();
            if (showPermissions && role !== 'admin') {
                data.permissions = permissions;
            }

            const response = await api.createInvitation(data);
            setResult(response);
            if (onCreated) onCreated();
        } catch (err) {
            setError(err.message || 'Failed to create invitation');
        } finally {
            setLoading(false);
        }
    }

    function copyLink() {
        if (result?.invite_url) {
            clipboardWrite(result.invite_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    // Show result screen after creation
    if (result) {
        return (
            <Modal open={true} onClose={onClose} title="Invitation Created" size="md">
                        <p>Share this invitation link:</p>
                        <div className="invite-link-display">
                            <code>{result.invite_url}</code>
                            <button className="btn btn-sm btn-ghost" onClick={copyLink}>
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        {result.email_sent && (
                            <p className="text-success" style={{ marginTop: 12 }}>
                                Invitation email sent to {result.invitation.email}
                            </p>
                        )}
                        {result.email_error && (
                            <p className="text-warning" style={{ marginTop: 12 }}>
                                Email could not be sent: {result.email_error}
                            </p>
                        )}
                    <div className="modal-footer">
                        <button className="btn btn-primary" onClick={onClose}>Done</button>
                    </div>
            </Modal>
        );
    }

    return (
        <Modal open={true} onClose={onClose} title="Invite User" size="md">
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="invite-email">Email (optional)</label>
                            <input
                                type="email"
                                id="invite-email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="user@example.com (leave blank for link-only)"
                            />
                            <span className="form-help">
                                If provided, an invitation email will be sent. Otherwise, share the link manually.
                            </span>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="invite-role">Role</label>
                                <select id="invite-role" value={role} onChange={handleRoleChange}>
                                    <option value="admin">Admin</option>
                                    <option value="developer">Developer</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="invite-expiry">Expires</label>
                                <select id="invite-expiry" value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))}>
                                    <option value={1}>1 day</option>
                                    <option value={3}>3 days</option>
                                    <option value={7}>7 days</option>
                                    <option value={30}>30 days</option>
                                    <option value={0}>Never</option>
                                </select>
                            </div>
                        </div>

                        {role !== 'admin' && (
                            <div className="customize-permissions-section">
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        if (!showPermissions && templates[role]) {
                                            setPermissions(templates[role]);
                                        }
                                        setShowPermissions(!showPermissions);
                                    }}
                                >
                                    {showPermissions ? 'Hide' : 'Customize'} Permissions
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" style={{ marginLeft: 4 }}>
                                        {showPermissions
                                            ? <polyline points="18 15 12 9 6 15"/>
                                            : <polyline points="6 9 12 15 18 9"/>
                                        }
                                    </svg>
                                </button>
                                {showPermissions && (
                                    <PermissionEditor
                                        permissions={permissions}
                                        onChange={setPermissions}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Invitation'}
                        </button>
                    </div>
                </form>
        </Modal>
    );
};

export default InviteModal;
