import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';

const Marketplace = () => {
    const toast = useToast();
    const { user } = useAuth();
    const [extensions, setExtensions] = useState([]);
    const [myExtensions, setMyExtensions] = useState([]);
    const [plugins, setPlugins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [tab, setTab] = useState('browse');
    const [showSubmit, setShowSubmit] = useState(false);
    const [pluginUrl, setPluginUrl] = useState('');
    const [installing, setInstalling] = useState(false);
    const [form, setForm] = useState({ name: '', display_name: '', description: '', category: 'utility', version: '1.0.0', author: '' });

    const categories = ['monitoring', 'security', 'deployment', 'integration', 'ui', 'utility'];

    const loadExtensions = useCallback(async () => {
        try {
            const [eData, mData, pData] = await Promise.all([
                api.getMarketplaceExtensions(category, search),
                api.getMyExtensions(),
                api.getInstalledPlugins().catch(() => ({ plugins: [] })),
            ]);
            setExtensions(eData.extensions || []);
            setMyExtensions(mData.extensions || []);
            setPlugins(pData.plugins || []);
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

    const handlePluginInstall = async () => {
        if (!pluginUrl.trim()) return;
        setInstalling(true);
        try {
            const result = await api.installPlugin(pluginUrl.trim());
            toast.success(`Plugin "${result.display_name}" installed. Restart backend to activate routes.`);
            setPluginUrl('');
            loadExtensions();
        } catch (err) {
            toast.error(err.message || 'Plugin installation failed');
        } finally {
            setInstalling(false);
        }
    };

    const handlePluginUninstall = async (pluginId) => {
        try {
            await api.uninstallPlugin(pluginId);
            toast.success('Plugin uninstalled');
            loadExtensions();
        } catch (err) { toast.error(err.message); }
    };

    const handlePluginToggle = async (plugin) => {
        try {
            if (plugin.status === 'active') {
                await api.disablePlugin(plugin.id);
                toast.success('Plugin disabled');
            } else {
                await api.enablePlugin(plugin.id);
                toast.success('Plugin enabled');
            }
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
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Marketplace</h1>
                    <p className="page-description">{extensions.length} extensions available</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn" onClick={() => setShowSubmit(true)}>Submit Extension</button>
                </div>
            </div>

            <div className="tabs">
                <button className={`tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Browse</button>
                <button className={`tab ${tab === 'installed' ? 'active' : ''}`} onClick={() => setTab('installed')}>Installed ({myExtensions.length})</button>
                <button className={`tab ${tab === 'plugins' ? 'active' : ''}`} onClick={() => setTab('plugins')}>Plugins ({plugins.length})</button>
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
                                        <button className="btn btn-sm btn-primary" onClick={() => handleInstall(ext.id)}>Install</button>
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
                            <button className="btn btn-sm btn-danger" onClick={() => handleUninstall(inst.id)}>Uninstall</button>
                        </div>
                    ))}
                    {myExtensions.length === 0 && <div className="empty-state"><p>No extensions installed.</p></div>}
                </div>
            )}

            {tab === 'plugins' && (
                <div className="plugins-section">
                    <div className="plugin-install-form card">
                        <h3>Install Plugin from URL</h3>
                        <p className="text-muted">Paste a GitHub repo URL, release URL, or direct zip link.</p>
                        <div className="plugin-install-row">
                            <input
                                className="form-input"
                                placeholder="https://github.com/user/serverkit-plugin"
                                value={pluginUrl}
                                onChange={e => setPluginUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handlePluginInstall()}
                                disabled={installing}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handlePluginInstall}
                                disabled={installing || !pluginUrl.trim()}
                            >
                                {installing ? 'Installing...' : 'Install'}
                            </button>
                        </div>
                    </div>

                    <div className="installed-list">
                        {plugins.map(plugin => (
                            <div key={plugin.id} className={`installed-item card ${plugin.status === 'error' ? 'installed-item--error' : ''}`}>
                                <div className="installed-item__info">
                                    <strong>{plugin.display_name}</strong>
                                    <span className="text-muted">v{plugin.version}</span>
                                    <span className={`badge badge--${plugin.status === 'active' ? 'success' : plugin.status === 'error' ? 'danger' : 'outline'}`}>
                                        {plugin.status}
                                    </span>
                                    {plugin.has_backend && <span className="badge badge--subtle">Backend</span>}
                                    {plugin.has_frontend && <span className="badge badge--subtle">Frontend</span>}
                                </div>
                                {plugin.description && <p className="text-muted" style={{ margin: '4px 0 8px', fontSize: '13px' }}>{plugin.description}</p>}
                                {plugin.error_message && <p className="text-danger" style={{ margin: '4px 0 8px', fontSize: '12px' }}>{plugin.error_message}</p>}
                                <div className="installed-item__actions">
                                    <button
                                        className={`btn btn-sm ${plugin.status === 'active' ? 'btn-outline' : 'btn-primary'}`}
                                        onClick={() => handlePluginToggle(plugin)}
                                    >
                                        {plugin.status === 'active' ? 'Disable' : 'Enable'}
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={() => handlePluginUninstall(plugin.id)}>Uninstall</button>
                                </div>
                            </div>
                        ))}
                        {plugins.length === 0 && (
                            <div className="empty-state">
                                <p>No plugins installed. Use the form above to install one from a URL.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showSubmit && (
                <div className="modal-overlay" onClick={() => setShowSubmit(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Submit Extension</h2><button className="modal-close" onClick={() => setShowSubmit(false)}>&times;</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label>Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                            <div className="form-group"><label>Display Name</label><input className="form-input" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} /></div>
                            <div className="form-group"><label>Description</label><textarea className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
                            <div className="form-group"><label>Category</label><select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div className="form-group"><label>Author</label><input className="form-input" value={form.author} onChange={e => setForm({...form, author: e.target.value})} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn" onClick={() => setShowSubmit(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={!form.name}>Submit</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketplace;
