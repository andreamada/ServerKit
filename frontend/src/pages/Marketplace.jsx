import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Spinner, { LoadingState } from '../components/Spinner';
import useTabParam from '../hooks/useTabParam';

const Downloads = lazy(() => import('./Downloads'));

const VALID_TABS = ['browse', 'installed', 'downloads'];

const Marketplace = () => {
    const toast = useToast();
    const { user } = useAuth();
    const [extensions, setExtensions] = useState([]);
    const [myExtensions, setMyExtensions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [tab, setTab] = useTabParam('/marketplace', VALID_TABS);
    const [showSubmit, setShowSubmit] = useState(false);
    const [form, setForm] = useState({ name: '', display_name: '', description: '', category: 'utility', version: '1.0.0', author: '' });

    const categories = ['monitoring', 'security', 'deployment', 'integration', 'ui', 'utility'];

    const loadExtensions = useCallback(async () => {
        try {
            const [eData, mData] = await Promise.all([
                api.getMarketplaceExtensions(category, search),
                api.getMyExtensions(),
            ]);
            setExtensions(eData.extensions || []);
            setMyExtensions(mData.extensions || []);
        } catch (err) {
            toast.error('Failed to load extensions');
        } finally {
            setLoading(false);
        }
    }, [category, search, toast]);

    useEffect(() => { loadExtensions(); }, [loadExtensions]);

    const handleInstall = async (extId) => {
        try {
            await api.installMarketplaceExtension(extId);
            toast.success('Extension installed');
            loadExtensions();
        } catch (err) { toast.error(err.message); }
    };

    const handleUninstall = async (installId) => {
        try {
            await api.uninstallMarketplaceExtension(installId);
            toast.success('Extension uninstalled');
            loadExtensions();
        } catch (err) { toast.error(err.message); }
    };

    const handleSubmit = async () => {
        try {
            await api.createMarketplaceExtension(form);
            toast.success('Extension submitted');
            setShowSubmit(false);
            loadExtensions();
        } catch (err) { toast.error(err.message); }
    };

    const renderStars = (rating) => {
        const full = Math.floor(rating);
        return '\u2605'.repeat(full) + '\u2606'.repeat(5 - full);
    };

    if (loading) return <Spinner />;

    const installedIds = new Set(myExtensions.map(e => e.extension_id));

    return (
        <div className="marketplace-page">
            <header className="top-bar">
                <div className="top-bar__title">
                    <h1>Marketplace</h1>
                    <span className="top-bar__subtitle">{extensions.length} extensions available</span>
                </div>
                <div className="top-bar__actions">
                    <button className="btn" onClick={() => setShowSubmit(true)}>Submit Extension</button>
                </div>
            </header>

            <div className="tabs">
                <button className={`tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Browse</button>
                <button className={`tab ${tab === 'installed' ? 'active' : ''}`} onClick={() => setTab('installed')}>Installed ({myExtensions.length})</button>
                <button className={`tab ${tab === 'downloads' ? 'active' : ''}`} onClick={() => setTab('downloads')}>Downloads</button>
            </div>

            {tab === 'browse' && (
                <>
                    <div className="marketplace-filters">
                        <input className="form-input" placeholder="Search extensions..." value={search} onChange={e => setSearch(e.target.value)} />
                        <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                    </div>

                    <div className="extensions-grid">
                        {extensions.map(ext => (
                            <div key={ext.id} className="extension-card card">
                                <div className="extension-card__header">
                                    <h3>{ext.display_name}</h3>
                                    <span className="badge badge--outline">{ext.category}</span>
                                </div>
                                <p className="extension-card__desc">{ext.description}</p>
                                <div className="extension-card__meta">
                                    <span className="extension-card__rating">{renderStars(ext.rating)} ({ext.rating_count})</span>
                                    <span>{ext.download_count} installs</span>
                                </div>
                                <div className="extension-card__info">
                                    <span>v{ext.version}</span>
                                    {ext.author && <span>by {ext.author}</span>}
                                    <span className="badge badge--subtle">{ext.extension_type}</span>
                                </div>
                                <div className="extension-card__actions">
                                    {installedIds.has(ext.id) ? (
                                        <span className="badge badge--success">Installed</span>
                                    ) : (
                                        <button className="btn btn--sm btn--primary" onClick={() => handleInstall(ext.id)}>Install</button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {extensions.length === 0 && <div className="empty-state"><p>No extensions found.</p></div>}
                    </div>
                </>
            )}

            {tab === 'installed' && (
                <div className="installed-list">
                    {myExtensions.map(inst => (
                        <div key={inst.id} className="installed-item card">
                            <div className="installed-item__info">
                                <strong>{inst.extension_name}</strong>
                                <span className="text-muted">v{inst.installed_version}</span>
                            </div>
                            <button className="btn btn--sm btn--danger" onClick={() => handleUninstall(inst.id)}>Uninstall</button>
                        </div>
                    ))}
                    {myExtensions.length === 0 && <div className="empty-state"><p>No extensions installed.</p></div>}
                </div>
            )}

            {tab === 'downloads' && (
                <Suspense fallback={<LoadingState />}>
                    <Downloads />
                </Suspense>
            )}

            {showSubmit && (
                <div className="modal-overlay" onClick={() => setShowSubmit(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal__header"><h2>Submit Extension</h2><button className="modal__close" onClick={() => setShowSubmit(false)}>&times;</button></div>
                        <div className="modal__body">
                            <div className="form-group"><label>Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                            <div className="form-group"><label>Display Name</label><input className="form-input" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} /></div>
                            <div className="form-group"><label>Description</label><textarea className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
                            <div className="form-group"><label>Category</label><select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div className="form-group"><label>Author</label><input className="form-input" value={form.author} onChange={e => setForm({...form, author: e.target.value})} /></div>
                        </div>
                        <div className="modal__footer"><button className="btn" onClick={() => setShowSubmit(false)}>Cancel</button><button className="btn btn--primary" onClick={handleSubmit} disabled={!form.name}>Submit</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketplace;
