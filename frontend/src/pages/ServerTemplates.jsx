import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const ServerTemplates = () => {
    const toast = useToast();
    const { user } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [library, setLibrary] = useState({});
    const [compliance, setCompliance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedDetail, setSelectedDetail] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [servers, setServers] = useState([]);
    const [tab, setTab] = useState('templates');

    const [form, setForm] = useState({
        name: '', description: '', category: 'general',
        packages: '', services: [], firewall_rules: [],
        auto_remediate: false, remediation_approval_required: true
    });

    const loadData = useCallback(async () => {
        try {
            const [tData, lData, cData] = await Promise.all([
                api.getServerTemplates(),
                api.getServerTemplateLibrary(),
                api.getTemplateCompliance(),
            ]);
            setTemplates(tData.templates || []);
            setLibrary(lData.templates || {});
            setCompliance(cData);
        } catch (err) {
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
        api.getServers().then(d => setServers(d.servers || [])).catch(() => {});
    }, [loadData]);

    const handleCreate = async () => {
        try {
            const data = {
                ...form,
                packages: form.packages.split('\n').map(p => p.trim()).filter(Boolean),
            };
            await api.createServerTemplate(data);
            toast.success('Template created');
            setShowCreateModal(false);
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleCreateFromLibrary = async (key) => {
        try {
            await api.createServerTemplateFromLibrary(key);
            toast.success('Template created from library');
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.deleteServerTemplate(id);
            toast.success('Template deleted');
            setDeleteConfirm(null);
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleAssign = async (templateId, serverId) => {
        try {
            await api.assignServerTemplate(templateId, serverId);
            toast.success('Template assigned');
            setShowAssignModal(false);
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleCheckDrift = async (assignmentId) => {
        try {
            await api.checkTemplateDrift(assignmentId);
            toast.success('Drift check initiated');
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleRemediate = async (assignmentId) => {
        try {
            await api.remediateTemplateDrift(assignmentId);
            toast.success('Remediation initiated');
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const categoryLabels = {
        general: 'General', web: 'Web Server', database: 'Database', mail: 'Mail Server', custom: 'Custom'
    };

    if (loading) return <Spinner />;

    return (
        <div className="server-templates-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Server Templates</h1>
                    <p className="page-description">
                        {templates.length} template{templates.length !== 1 ? 's' : ''}
                        {compliance && ` \u2022 ${compliance.compliance_pct}% fleet compliance`}
                    </p>
                </div>
                <div className="page-header-actions">
                    {user?.is_admin && (
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            Create Template
                        </button>
                    )}
                </div>
            </div>

            {compliance && (
                <div className="compliance-bar">
                    <div className="compliance-bar__stats">
                        <div className="stat-item stat-item--success">
                            <span className="stat-item__value">{compliance.compliant}</span>
                            <span className="stat-item__label">Compliant</span>
                        </div>
                        <div className="stat-item stat-item--danger">
                            <span className="stat-item__value">{compliance.drifted}</span>
                            <span className="stat-item__label">Drifted</span>
                        </div>
                        <div className="stat-item stat-item--muted">
                            <span className="stat-item__value">{compliance.unknown}</span>
                            <span className="stat-item__label">Unknown</span>
                        </div>
                    </div>
                    <div className="compliance-bar__progress">
                        <div className="progress-fill" style={{ width: `${compliance.compliance_pct}%` }} />
                    </div>
                </div>
            )}

            <div className="tabs">
                <button className={`tab ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Templates</button>
                <button className={`tab ${tab === 'library' ? 'active' : ''}`} onClick={() => setTab('library')}>Library</button>
            </div>

            {tab === 'templates' && (
                <div className="templates-grid">
                    {templates.map(tmpl => (
                        <div key={tmpl.id} className="template-card card" onClick={() => setSelectedDetail(selectedDetail?.id === tmpl.id ? null : tmpl)}>
                            <div className="template-card__header">
                                <h3>{tmpl.name}</h3>
                                <span className="badge badge--outline">{categoryLabels[tmpl.category] || tmpl.category}</span>
                            </div>
                            {tmpl.description && <p className="template-card__desc">{tmpl.description}</p>}
                            <div className="template-card__meta">
                                <span>v{tmpl.version}</span>
                                <span>{tmpl.assignment_count} server{tmpl.assignment_count !== 1 ? 's' : ''}</span>
                                {tmpl.parent_name && <span>Inherits: {tmpl.parent_name}</span>}
                            </div>
                            <div className="template-card__spec">
                                {tmpl.packages?.length > 0 && <span>{tmpl.packages.length} packages</span>}
                                {tmpl.services?.length > 0 && <span>{tmpl.services.length} services</span>}
                                {tmpl.firewall_rules?.length > 0 && <span>{tmpl.firewall_rules.length} firewall rules</span>}
                            </div>
                            <div className="template-card__actions" onClick={e => e.stopPropagation()}>
                                <button className="btn btn-sm btn-primary" onClick={() => { setSelectedTemplate(tmpl); setShowAssignModal(true); }}>
                                    Assign
                                </button>
                                {user?.is_admin && (
                                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(tmpl)}>Delete</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <div className="empty-state">
                            <p>No templates yet. Create one or use a library template.</p>
                        </div>
                    )}
                </div>
            )}

            {tab === 'library' && (
                <div className="templates-grid">
                    {Object.entries(library).map(([key, tmpl]) => (
                        <div key={key} className="template-card card">
                            <div className="template-card__header">
                                <h3>{tmpl.name}</h3>
                                <span className="badge badge--outline">{categoryLabels[tmpl.category] || tmpl.category}</span>
                            </div>
                            <p className="template-card__desc">{tmpl.description}</p>
                            <div className="template-card__spec">
                                {tmpl.packages?.length > 0 && <span>{tmpl.packages.length} packages</span>}
                                {tmpl.services?.length > 0 && <span>{tmpl.services.length} services</span>}
                                {tmpl.firewall_rules?.length > 0 && <span>{tmpl.firewall_rules.length} firewall rules</span>}
                            </div>
                            <div className="template-card__actions">
                                <button className="btn btn-sm btn-primary" onClick={() => handleCreateFromLibrary(key)}>
                                    Use Template
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create Template</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <Label>Name</Label>
                                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <Label>Description</Label>
                                <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
                            </div>
                            <div className="form-group">
                                <Label>Category</Label>
                                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="form-group">
                                <Label>Packages (one per line)</Label>
                                <Textarea className="font-mono" value={form.packages} onChange={e => setForm({...form, packages: e.target.value})} rows={4} placeholder="nginx&#10;php-fpm&#10;certbot" />
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={form.auto_remediate} onChange={e => setForm({...form, auto_remediate: e.target.checked})} />
                                    Auto-remediate drift
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={!form.name}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && selectedTemplate && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Assign {selectedTemplate.name}</h2>
                            <button className="modal-close" onClick={() => setShowAssignModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p>Select a server to apply this template:</p>
                            <div className="server-select-list">
                                {servers.map(server => (
                                    <div key={server.id} className="server-select-item" onClick={() => handleAssign(selectedTemplate.id, server.id)}>
                                        <span className={`status-dot status-dot--${server.status === 'online' ? 'success' : 'danger'}`} />
                                        <span>{server.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirm && (
                <ConfirmDialog
                    title="Delete Template"
                    message={`Delete "${deleteConfirm.name}"? This cannot be undone.`}
                    onConfirm={() => handleDelete(deleteConfirm.id)}
                    onCancel={() => setDeleteConfirm(null)}
                    variant="danger"
                />
            )}
        </div>
    );
};

export default ServerTemplates;
