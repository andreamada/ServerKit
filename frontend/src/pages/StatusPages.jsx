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

const StatusPages = () => {
    const toast = useToast();
    const { user } = useAuth();
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPage, setSelectedPage] = useState(null);
    const [components, setComponents] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [showCreatePage, setShowCreatePage] = useState(false);
    const [showCreateComponent, setShowCreateComponent] = useState(false);
    const [showCreateIncident, setShowCreateIncident] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [tab, setTab] = useState('components');

    const [pageForm, setPageForm] = useState({ name: '', slug: '', description: '', primary_color: '#4f46e5' });
    const [compForm, setCompForm] = useState({ name: '', group: 'Services', check_type: 'http', check_target: '', check_interval: 60 });
    const [incidentForm, setIncidentForm] = useState({ title: '', impact: 'minor', body: '' });

    const loadPages = useCallback(async () => {
        try {
            const data = await api.getStatusPages();
            setPages(data.pages || []);
        } catch (err) {
            toast.error('Failed to load status pages');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadPages(); }, [loadPages]);

    const loadPageDetails = async (pageId) => {
        try {
            const [cData, iData] = await Promise.all([
                api.getStatusPageComponents(pageId),
                api.getStatusPageIncidents(pageId),
            ]);
            setComponents(cData.components || []);
            setIncidents(iData.incidents || []);
            setSelectedPage(pages.find(p => p.id === pageId));
        } catch (err) {
            toast.error('Failed to load details');
        }
    };

    const handleCreatePage = async () => {
        try {
            const page = await api.createStatusPage(pageForm);
            toast.success('Status page created');
            setShowCreatePage(false);
            setPageForm({ name: '', slug: '', description: '', primary_color: '#4f46e5' });
            loadPages();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleCreateComponent = async () => {
        if (!selectedPage) return;
        try {
            await api.createStatusComponent(selectedPage.id, compForm);
            toast.success('Component added');
            setShowCreateComponent(false);
            loadPageDetails(selectedPage.id);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleRunCheck = async (compId) => {
        try {
            const result = await api.runStatusCheck(compId);
            toast.success(`Check: ${result.status} (${result.response_time}ms)`);
            if (selectedPage) loadPageDetails(selectedPage.id);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleCreateIncident = async () => {
        if (!selectedPage) return;
        try {
            await api.createStatusIncident(selectedPage.id, incidentForm);
            toast.success('Incident created');
            setShowCreateIncident(false);
            setIncidentForm({ title: '', impact: 'minor', body: '' });
            loadPageDetails(selectedPage.id);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleResolveIncident = async (incidentId) => {
        try {
            await api.updateStatusIncident(incidentId, { status: 'resolved', update_body: 'Issue has been resolved.' });
            toast.success('Incident resolved');
            if (selectedPage) loadPageDetails(selectedPage.id);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const statusColors = {
        operational: 'success', degraded: 'warning', partial_outage: 'warning', major_outage: 'danger', maintenance: 'info'
    };

    if (loading) return <Spinner />;

    return (
        <div className="status-pages-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Status Pages</h1>
                    <p className="page-description">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="page-header-actions">
                    {user?.is_admin && (
                        <button className="btn btn-primary" onClick={() => setShowCreatePage(true)}>Create Page</button>
                    )}
                </div>
            </div>

            <div className="status-layout">
                <div className="status-pages-list">
                    {pages.map(page => (
                        <div key={page.id} className={`status-page-item ${selectedPage?.id === page.id ? 'active' : ''}`}
                            onClick={() => loadPageDetails(page.id)}>
                            <strong>{page.name}</strong>
                            <span className="text-muted">/{page.slug} \u2022 {page.component_count} components</span>
                        </div>
                    ))}
                    {pages.length === 0 && <div className="empty-state"><p>No status pages yet.</p></div>}
                </div>

                {selectedPage && (
                    <div className="status-detail-panel">
                        <div className="status-detail-panel__header">
                            <h2>{selectedPage.name}</h2>
                            <span className="text-muted">/{selectedPage.slug}</span>
                        </div>

                        <div className="tabs">
                            <button className={`tab ${tab === 'components' ? 'active' : ''}`} onClick={() => setTab('components')}>Components</button>
                            <button className={`tab ${tab === 'incidents' ? 'active' : ''}`} onClick={() => setTab('incidents')}>Incidents</button>
                        </div>

                        {tab === 'components' && (
                            <>
                                <div className="status-actions-bar">
                                    {user?.is_admin && (
                                        <button className="btn btn-sm btn-primary" onClick={() => setShowCreateComponent(true)}>Add Component</button>
                                    )}
                                </div>
                                <div className="components-list">
                                    {components.map(comp => (
                                        <div key={comp.id} className="component-row">
                                            <div className="component-row__info">
                                                <span className={`status-dot status-dot--${statusColors[comp.status] || 'muted'}`} />
                                                <div>
                                                    <strong>{comp.name}</strong>
                                                    <span className="text-muted"> \u2022 {comp.group}</span>
                                                </div>
                                            </div>
                                            <div className="component-row__stats">
                                                <span>{comp.uptime_30d?.toFixed(2)}% uptime</span>
                                                {comp.last_response_time && <span>{comp.last_response_time}ms</span>}
                                            </div>
                                            <div className="component-row__actions">
                                                <button className="btn btn-sm" onClick={() => handleRunCheck(comp.id)}>Check Now</button>
                                            </div>
                                        </div>
                                    ))}
                                    {components.length === 0 && <p className="text-muted">No components yet.</p>}
                                </div>
                            </>
                        )}

                        {tab === 'incidents' && (
                            <>
                                <div className="status-actions-bar">
                                    {user?.is_admin && (
                                        <button className="btn btn-sm btn-primary" onClick={() => setShowCreateIncident(true)}>Create Incident</button>
                                    )}
                                </div>
                                <div className="incidents-list">
                                    {incidents.map(inc => (
                                        <div key={inc.id} className="incident-row">
                                            <div className="incident-row__header">
                                                <strong>{inc.title}</strong>
                                                <span className={`badge badge--${inc.status === 'resolved' ? 'success' : 'warning'}`}>{inc.status}</span>
                                            </div>
                                            <span className="text-muted">Impact: {inc.impact}</span>
                                            {inc.body && <p>{inc.body}</p>}
                                            {inc.status !== 'resolved' && user?.is_admin && (
                                                <button className="btn btn-sm btn-success" onClick={() => handleResolveIncident(inc.id)}>Resolve</button>
                                            )}
                                        </div>
                                    ))}
                                    {incidents.length === 0 && <p className="text-muted">No incidents.</p>}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {showCreatePage && (
                <div className="modal-overlay" onClick={() => setShowCreatePage(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Create Status Page</h2><button className="modal-close" onClick={() => setShowCreatePage(false)}>&times;</button></div>
                        <div className="modal-body">
                            <div className="form-group"><Label>Name</Label><Input value={pageForm.name} onChange={e => setPageForm({...pageForm, name: e.target.value})} /></div>
                            <div className="form-group"><Label>Slug (URL path)</Label><Input value={pageForm.slug} onChange={e => setPageForm({...pageForm, slug: e.target.value})} placeholder="my-services" /></div>
                            <div className="form-group"><Label>Description</Label><Textarea value={pageForm.description} onChange={e => setPageForm({...pageForm, description: e.target.value})} rows={2} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn" onClick={() => setShowCreatePage(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreatePage} disabled={!pageForm.name || !pageForm.slug}>Create</button></div>
                    </div>
                </div>
            )}

            {showCreateComponent && (
                <div className="modal-overlay" onClick={() => setShowCreateComponent(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Add Component</h2><button className="modal-close" onClick={() => setShowCreateComponent(false)}>&times;</button></div>
                        <div className="modal-body">
                            <div className="form-group"><Label>Name</Label><Input value={compForm.name} onChange={e => setCompForm({...compForm, name: e.target.value})} /></div>
                            <div className="form-group"><Label>Group</Label><Input value={compForm.group} onChange={e => setCompForm({...compForm, group: e.target.value})} /></div>
                            <div className="form-group"><Label>Check Type</Label>
                                <Select value={compForm.check_type} onValueChange={v => setCompForm({...compForm, check_type: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="http">HTTP</SelectItem>
                                        <SelectItem value="tcp">TCP</SelectItem>
                                        <SelectItem value="dns">DNS</SelectItem>
                                        <SelectItem value="ping">Ping</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="form-group"><Label>Check Target</Label><Input value={compForm.check_target} onChange={e => setCompForm({...compForm, check_target: e.target.value})} placeholder="https://example.com or host:port" /></div>
                            <div className="form-group"><Label>Check Interval (seconds)</Label><Input type="number" value={compForm.check_interval} onChange={e => setCompForm({...compForm, check_interval: parseInt(e.target.value) || 60})} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn" onClick={() => setShowCreateComponent(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreateComponent} disabled={!compForm.name}>Add</button></div>
                    </div>
                </div>
            )}

            {showCreateIncident && (
                <div className="modal-overlay" onClick={() => setShowCreateIncident(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Create Incident</h2><button className="modal-close" onClick={() => setShowCreateIncident(false)}>&times;</button></div>
                        <div className="modal-body">
                            <div className="form-group"><Label>Title</Label><Input value={incidentForm.title} onChange={e => setIncidentForm({...incidentForm, title: e.target.value})} /></div>
                            <div className="form-group"><Label>Impact</Label>
                                <Select value={incidentForm.impact} onValueChange={v => setIncidentForm({...incidentForm, impact: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="minor">Minor</SelectItem>
                                        <SelectItem value="major">Major</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="form-group"><Label>Description</Label><Textarea value={incidentForm.body} onChange={e => setIncidentForm({...incidentForm, body: e.target.value})} rows={3} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn" onClick={() => setShowCreateIncident(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreateIncident} disabled={!incidentForm.title}>Create</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusPages;
