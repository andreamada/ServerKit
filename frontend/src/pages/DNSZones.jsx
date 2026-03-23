import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';

const DNSZones = () => {
    const toast = useToast();
    const { user } = useAuth();
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedZone, setSelectedZone] = useState(null);
    const [records, setRecords] = useState([]);
    const [showCreateZone, setShowCreateZone] = useState(false);
    const [showCreateRecord, setShowCreateRecord] = useState(false);
    const [showPropagation, setShowPropagation] = useState(null);
    const [propagationResults, setPropagationResults] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [zoneForm, setZoneForm] = useState({ domain: '', provider: 'manual' });
    const [recordForm, setRecordForm] = useState({
        record_type: 'A', name: '@', content: '', ttl: 3600, priority: null
    });

    const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'CAA', 'NS'];

    const loadZones = useCallback(async () => {
        try {
            const data = await api.getDNSZones();
            setZones(data.zones || []);
        } catch (err) {
            toast.error('Failed to load DNS zones');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadZones(); }, [loadZones]);

    const loadRecords = async (zoneId) => {
        try {
            const data = await api.getDNSRecords(zoneId);
            setRecords(data.records || []);
            setSelectedZone(zones.find(z => z.id === zoneId));
        } catch (err) {
            toast.error('Failed to load records');
        }
    };

    const handleCreateZone = async () => {
        try {
            await api.createDNSZone(zoneForm);
            toast.success('Zone created');
            setShowCreateZone(false);
            setZoneForm({ domain: '', provider: 'manual' });
            loadZones();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleCreateRecord = async () => {
        if (!selectedZone) return;
        try {
            await api.createDNSRecord(selectedZone.id, recordForm);
            toast.success('Record created');
            setShowCreateRecord(false);
            setRecordForm({ record_type: 'A', name: '@', content: '', ttl: 3600, priority: null });
            loadRecords(selectedZone.id);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeleteRecord = async (recordId) => {
        try {
            await api.deleteDNSRecord(recordId);
            toast.success('Record deleted');
            if (selectedZone) loadRecords(selectedZone.id);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeleteZone = async (id) => {
        try {
            await api.deleteDNSZone(id);
            toast.success('Zone deleted');
            setDeleteConfirm(null);
            if (selectedZone?.id === id) {
                setSelectedZone(null);
                setRecords([]);
            }
            loadZones();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleCheckPropagation = async (domain) => {
        try {
            const data = await api.checkDNSPropagation(domain);
            setPropagationResults(data.results || []);
            setShowPropagation(domain);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleExport = async (zoneId) => {
        try {
            const data = await api.exportDNSZone(zoneId);
            const blob = new Blob([data.zone_file], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedZone?.domain || 'zone'}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="dns-zones-page">
            <header className="top-bar">
                <div className="top-bar__title">
                    <h1>DNS Zones</h1>
                    <span className="top-bar__subtitle">{zones.length} zone{zones.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="top-bar__actions">
                    {user?.is_admin && (
                        <button className="btn btn--primary" onClick={() => setShowCreateZone(true)}>Add Zone</button>
                    )}
                </div>
            </header>

            <div className="dns-layout">
                <div className="dns-zones-list">
                    {zones.map(zone => (
                        <div key={zone.id}
                            className={`dns-zone-item ${selectedZone?.id === zone.id ? 'active' : ''}`}
                            onClick={() => loadRecords(zone.id)}>
                            <div className="dns-zone-item__info">
                                <strong>{zone.domain}</strong>
                                <span className="text-muted">{zone.provider} \u2022 {zone.record_count} records</span>
                            </div>
                            <div className="dns-zone-item__actions" onClick={e => e.stopPropagation()}>
                                <button className="btn btn--sm" onClick={() => handleCheckPropagation(zone.domain)}>Check</button>
                                {user?.is_admin && (
                                    <button className="btn btn--sm btn--danger" onClick={() => setDeleteConfirm(zone)}>Delete</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {zones.length === 0 && <div className="empty-state"><p>No DNS zones configured.</p></div>}
                </div>

                {selectedZone && (
                    <div className="dns-records-panel">
                        <div className="dns-records-panel__header">
                            <h2>{selectedZone.domain}</h2>
                            <div className="dns-records-panel__actions">
                                <button className="btn btn--sm" onClick={() => handleExport(selectedZone.id)}>Export</button>
                                {user?.is_admin && (
                                    <button className="btn btn--sm btn--primary" onClick={() => setShowCreateRecord(true)}>Add Record</button>
                                )}
                            </div>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Name</th>
                                    <th>Content</th>
                                    <th>TTL</th>
                                    <th>Priority</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(rec => (
                                    <tr key={rec.id}>
                                        <td><span className="badge badge--outline">{rec.record_type}</span></td>
                                        <td>{rec.name}</td>
                                        <td className="text-mono">{rec.content}</td>
                                        <td>{rec.ttl}</td>
                                        <td>{rec.priority || '-'}</td>
                                        <td>
                                            {user?.is_admin && (
                                                <button className="btn btn--sm btn--danger" onClick={() => handleDeleteRecord(rec.id)}>Delete</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {records.length === 0 && (
                                    <tr><td colSpan={6} className="text-center text-muted">No records</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreateZone && (
                <div className="modal-overlay" onClick={() => setShowCreateZone(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal__header">
                            <h2>Add DNS Zone</h2>
                            <button className="modal__close" onClick={() => setShowCreateZone(false)}>&times;</button>
                        </div>
                        <div className="modal__body">
                            <div className="form-group">
                                <label>Domain</label>
                                <input className="form-input" value={zoneForm.domain} onChange={e => setZoneForm({...zoneForm, domain: e.target.value})} placeholder="example.com" />
                            </div>
                            <div className="form-group">
                                <label>Provider</label>
                                <select className="form-select" value={zoneForm.provider} onChange={e => setZoneForm({...zoneForm, provider: e.target.value})}>
                                    <option value="manual">Manual</option>
                                    <option value="cloudflare">Cloudflare</option>
                                    <option value="route53">Route53</option>
                                    <option value="digitalocean">DigitalOcean</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal__footer">
                            <button className="btn" onClick={() => setShowCreateZone(false)}>Cancel</button>
                            <button className="btn btn--primary" onClick={handleCreateZone} disabled={!zoneForm.domain}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateRecord && (
                <div className="modal-overlay" onClick={() => setShowCreateRecord(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal__header">
                            <h2>Add DNS Record</h2>
                            <button className="modal__close" onClick={() => setShowCreateRecord(false)}>&times;</button>
                        </div>
                        <div className="modal__body">
                            <div className="form-group">
                                <label>Type</label>
                                <select className="form-select" value={recordForm.record_type} onChange={e => setRecordForm({...recordForm, record_type: e.target.value})}>
                                    {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Name</label>
                                <input className="form-input" value={recordForm.name} onChange={e => setRecordForm({...recordForm, name: e.target.value})} placeholder="@ or subdomain" />
                            </div>
                            <div className="form-group">
                                <label>Content</label>
                                <input className="form-input" value={recordForm.content} onChange={e => setRecordForm({...recordForm, content: e.target.value})} placeholder="IP address or hostname" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>TTL</label>
                                    <input className="form-input" type="number" value={recordForm.ttl} onChange={e => setRecordForm({...recordForm, ttl: parseInt(e.target.value) || 3600})} />
                                </div>
                                {(recordForm.record_type === 'MX' || recordForm.record_type === 'SRV') && (
                                    <div className="form-group">
                                        <label>Priority</label>
                                        <input className="form-input" type="number" value={recordForm.priority || ''} onChange={e => setRecordForm({...recordForm, priority: parseInt(e.target.value) || null})} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal__footer">
                            <button className="btn" onClick={() => setShowCreateRecord(false)}>Cancel</button>
                            <button className="btn btn--primary" onClick={handleCreateRecord} disabled={!recordForm.content}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {showPropagation && (
                <div className="modal-overlay" onClick={() => setShowPropagation(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal__header">
                            <h2>DNS Propagation: {showPropagation}</h2>
                            <button className="modal__close" onClick={() => setShowPropagation(null)}>&times;</button>
                        </div>
                        <div className="modal__body">
                            {propagationResults.map((r, i) => (
                                <div key={i} className="propagation-row">
                                    <span className={`status-dot status-dot--${r.propagated ? 'success' : 'danger'}`} />
                                    <strong>{r.nameserver}</strong>
                                    <span className="text-muted">({r.ip})</span>
                                    <span className="text-mono">{r.result?.join(', ') || 'No result'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirm && (
                <ConfirmDialog
                    title="Delete Zone"
                    message={`Delete zone "${deleteConfirm.domain}"? All records will be removed.`}
                    onConfirm={() => handleDeleteZone(deleteConfirm.id)}
                    onCancel={() => setDeleteConfirm(null)}
                    variant="danger"
                />
            )}
        </div>
    );
};

export default DNSZones;
