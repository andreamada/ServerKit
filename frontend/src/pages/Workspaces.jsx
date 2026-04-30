import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

const Workspaces = () => {
    const toast = useToast();
    const { user } = useAuth();
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(null);
    const [members, setMembers] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [form, setForm] = useState({ name: '', description: '', max_servers: 0, max_users: 0 });

    const loadWorkspaces = useCallback(async () => {
        try {
            const data = await api.getWorkspaces();
            setWorkspaces(data.workspaces || []);
        } catch (err) {
            toast.error('Failed to load workspaces');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

    const handleCreate = async () => {
        try {
            await api.createWorkspace(form);
            toast.success('Workspace created');
            setShowCreateModal(false);
            setForm({ name: '', description: '', max_servers: 0, max_users: 0 });
            loadWorkspaces();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.deleteWorkspace(id);
            toast.success('Workspace deleted');
            setDeleteConfirm(null);
            loadWorkspaces();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleArchive = async (id) => {
        try {
            await api.archiveWorkspace(id);
            toast.success('Workspace archived');
            loadWorkspaces();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const loadMembers = async (wsId) => {
        try {
            const [mData, uData] = await Promise.all([
                api.getWorkspaceMembers(wsId),
                api.getUsers().catch(() => ({ users: [] }))
            ]);
            setMembers(mData.members || []);
            setAllUsers(uData.users || []);
            setShowMembersModal(wsId);
        } catch (err) {
            toast.error('Failed to load members');
        }
    };

    const handleAddMember = async (wsId, userId) => {
        try {
            await api.addWorkspaceMember(wsId, userId);
            toast.success('Member added');
            loadMembers(wsId);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            await api.removeWorkspaceMember(memberId);
            toast.success('Member removed');
            if (showMembersModal) loadMembers(showMembersModal);
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="workspaces-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Workspaces</h1>
                    <p className="page-description">{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        Create Workspace
                    </button>
                </div>
            </div>

            <div className="workspaces-grid">
                {workspaces.map(ws => (
                    <div key={ws.id} className="workspace-card card">
                        <div className="workspace-card__header">
                            <div className="workspace-card__title">
                                {ws.primary_color && (
                                    <span className="workspace-card__color" style={{ backgroundColor: ws.primary_color }} />
                                )}
                                <h3>{ws.name}</h3>
                            </div>
                            <span className={`badge badge--${ws.status === 'active' ? 'success' : 'warning'}`}>
                                {ws.status}
                            </span>
                        </div>
                        {ws.description && <p className="workspace-card__desc">{ws.description}</p>}
                        <div className="workspace-card__meta">
                            <span>{ws.member_count} member{ws.member_count !== 1 ? 's' : ''}</span>
                            <span className="text-muted">/{ws.slug}</span>
                        </div>
                        {(ws.max_servers > 0 || ws.max_users > 0) && (
                            <div className="workspace-card__quotas">
                                {ws.max_servers > 0 && <span>Max {ws.max_servers} servers</span>}
                                {ws.max_users > 0 && <span>Max {ws.max_users} users</span>}
                            </div>
                        )}
                        <div className="workspace-card__actions">
                            <button className="btn btn-sm" onClick={() => loadMembers(ws.id)}>Members</button>
                            {ws.status === 'active' && (
                                <button className="btn btn-sm btn-warning" onClick={() => handleArchive(ws.id)}>Archive</button>
                            )}
                            {user?.is_admin && (
                                <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(ws)}>Delete</button>
                            )}
                        </div>
                    </div>
                ))}
                {workspaces.length === 0 && (
                    <div className="empty-state">
                        <p>No workspaces yet. Create one to isolate servers by team or project.</p>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create Workspace</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <Label>Name</Label>
                                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="My Team" />
                            </div>
                            <div className="form-group">
                                <Label>Description</Label>
                                <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <Label>Max Servers (0 = unlimited)</Label>
                                    <Input type="number" value={form.max_servers} onChange={e => setForm({...form, max_servers: parseInt(e.target.value) || 0})} />
                                </div>
                                <div className="form-group">
                                    <Label>Max Users (0 = unlimited)</Label>
                                    <Input type="number" value={form.max_users} onChange={e => setForm({...form, max_users: parseInt(e.target.value) || 0})} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={!form.name}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {showMembersModal && (
                <div className="modal-overlay" onClick={() => setShowMembersModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Workspace Members</h2>
                            <button className="modal-close" onClick={() => setShowMembersModal(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="members-list">
                                {members.map(m => (
                                    <div key={m.id} className="member-row">
                                        <div>
                                            <strong>{m.username || m.email}</strong>
                                            <span className="badge badge--outline ml-2">{m.role}</span>
                                        </div>
                                        {m.role !== 'owner' && (
                                            <button className="btn btn-sm btn-danger" onClick={() => handleRemoveMember(m.id)}>Remove</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <hr />
                            <h4>Add Member</h4>
                            <div className="server-select-list">
                                {allUsers.filter(u => !members.find(m => m.user_id === u.id)).map(u => (
                                    <div key={u.id} className="server-select-item" onClick={() => handleAddMember(showMembersModal, u.id)}>
                                        <span>{u.username || u.email}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirm && (
                <ConfirmDialog
                    title="Delete Workspace"
                    message={`Delete "${deleteConfirm.name}"? All data will be lost.`}
                    onConfirm={() => handleDelete(deleteConfirm.id)}
                    onCancel={() => setDeleteConfirm(null)}
                    variant="danger"
                />
            )}
        </div>
    );
};

export default Workspaces;
