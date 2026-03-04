import { useState, useEffect } from 'react';
import useTabParam from '../hooks/useTabParam';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const VALID_TABS = ['overview', 'accounts', 'postfix', 'dovecot', 'spam', 'authentication', 'queue', 'webmail', 'logs'];

const Email = () => {
    const [activeTab, setActiveTab] = useTabParam('/email', VALID_TABS);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStatus();
    }, []);

    async function loadStatus() {
        try {
            const data = await api.getEmailStatus();
            setStatus(data);
        } catch (err) {
            console.error('Failed to load email status:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="page"><div className="loading">Loading email server status...</div></div>;
    }

    return (
        <div className="page email-page">
            <div className="page-header">
                <div>
                    <h1>Email Server</h1>
                    <p className="page-subtitle">Manage Postfix, Dovecot, spam filtering, and email authentication</p>
                </div>
            </div>

            <div className="tabs-nav tabs-nav-scrollable">
                <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    Overview
                </button>
                <button className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>
                    Accounts
                </button>
                <button className={`tab-btn ${activeTab === 'postfix' ? 'active' : ''}`} onClick={() => setActiveTab('postfix')}>
                    Postfix (SMTP)
                </button>
                <button className={`tab-btn ${activeTab === 'dovecot' ? 'active' : ''}`} onClick={() => setActiveTab('dovecot')}>
                    Dovecot (IMAP)
                </button>
                <button className={`tab-btn ${activeTab === 'spam' ? 'active' : ''}`} onClick={() => setActiveTab('spam')}>
                    Spam Filter
                </button>
                <button className={`tab-btn ${activeTab === 'authentication' ? 'active' : ''}`} onClick={() => setActiveTab('authentication')}>
                    DKIM/SPF/DMARC
                </button>
                <button className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => setActiveTab('queue')}>
                    Mail Queue
                </button>
                <button className={`tab-btn ${activeTab === 'webmail' ? 'active' : ''}`} onClick={() => setActiveTab('webmail')}>
                    Webmail
                </button>
                <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
                    Logs
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'overview' && <OverviewTab status={status} onRefresh={loadStatus} />}
                {activeTab === 'accounts' && <AccountsTab />}
                {activeTab === 'postfix' && <PostfixTab status={status} onRefresh={loadStatus} />}
                {activeTab === 'dovecot' && <DovecotTab status={status} onRefresh={loadStatus} />}
                {activeTab === 'spam' && <SpamTab status={status} onRefresh={loadStatus} />}
                {activeTab === 'authentication' && <AuthenticationTab status={status} onRefresh={loadStatus} />}
                {activeTab === 'queue' && <QueueTab />}
                {activeTab === 'webmail' && <WebmailTab />}
                {activeTab === 'logs' && <LogsTab />}
            </div>
        </div>
    );
};


// ==========================================
// OVERVIEW TAB
// ==========================================

const OverviewTab = ({ status, onRefresh }) => {
    const { showToast } = useToast();

    const services = [
        { key: 'postfix', label: 'Postfix', desc: 'SMTP mail transfer agent', data: status?.postfix },
        { key: 'dovecot', label: 'Dovecot', desc: 'IMAP/POP3 server', data: status?.dovecot },
        { key: 'spamassassin', label: 'SpamAssassin', desc: 'Spam filtering engine', data: status?.spamassassin },
        { key: 'opendkim', label: 'OpenDKIM', desc: 'DKIM email signing', data: status?.opendkim },
    ];

    async function handleServiceAction(service, action) {
        try {
            if (action === 'start') await api.startEmailService(service);
            else if (action === 'stop') await api.stopEmailService(service);
            else if (action === 'restart') await api.restartEmailService(service);
            showToast(`${service} ${action}ed successfully`, 'success');
            onRefresh();
        } catch (err) {
            showToast(err.message || `Failed to ${action} ${service}`, 'error');
        }
    }

    return (
        <div className="email-overview">
            <div className="services-grid">
                {services.map(svc => (
                    <div key={svc.key} className="card email-service-card">
                        <div className="card-body">
                            <div className="email-service-header">
                                <div>
                                    <h3>{svc.label}</h3>
                                    <p className="text-secondary">{svc.desc}</p>
                                </div>
                                <span className={`badge ${svc.data?.running ? 'badge-success' : svc.data?.installed ? 'badge-warning' : 'badge-secondary'}`}>
                                    {svc.data?.running ? 'Running' : svc.data?.installed ? 'Stopped' : 'Not Installed'}
                                </span>
                            </div>

                            {svc.data?.version && (
                                <div className="email-service-meta">
                                    <span className="text-secondary">Version: {svc.data.version}</span>
                                </div>
                            )}

                            {svc.data?.installed && (
                                <div className="email-service-actions">
                                    {svc.data.running ? (
                                        <>
                                            <button className="btn btn-sm btn-outline" onClick={() => handleServiceAction(svc.key, 'restart')}>
                                                Restart
                                            </button>
                                            <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleServiceAction(svc.key, 'stop')}>
                                                Stop
                                            </button>
                                        </>
                                    ) : (
                                        <button className="btn btn-sm btn-primary" onClick={() => handleServiceAction(svc.key, 'start')}>
                                            Start
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// ==========================================
// ACCOUNTS TAB
// ==========================================

const AccountsTab = () => {
    const { showToast } = useToast();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingForward, setEditingForward] = useState(null);
    const [formData, setFormData] = useState({ email: '', password: '', domain: '', quota_mb: 1024 });
    const [forwardData, setForwardData] = useState({ forward_to: '', keep_copy: true });

    useEffect(() => {
        loadAccounts();
    }, []);

    async function loadAccounts() {
        try {
            const data = await api.getEmailAccounts();
            setAccounts(data.accounts || []);
        } catch (err) {
            showToast('Failed to load accounts', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e) {
        e.preventDefault();
        try {
            const result = await api.createEmailAccount(formData);
            if (result.success) {
                showToast('Account created', 'success');
                setShowCreate(false);
                setFormData({ email: '', password: '', domain: '', quota_mb: 1024 });
                loadAccounts();
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function handleDelete(accountId) {
        if (!confirm('Delete this email account? This cannot be undone.')) return;
        try {
            const result = await api.deleteEmailAccount(accountId);
            if (result.success) {
                showToast('Account deleted', 'success');
                loadAccounts();
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function handleToggle(account) {
        try {
            await api.updateEmailAccount(account.id, { enabled: !account.enabled });
            showToast(`Account ${account.enabled ? 'disabled' : 'enabled'}`, 'success');
            loadAccounts();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function handleForwarding(e) {
        e.preventDefault();
        try {
            const result = await api.setEmailForwarding(editingForward, forwardData);
            if (result.success) {
                showToast('Forwarding updated', 'success');
                setEditingForward(null);
                loadAccounts();
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    if (loading) return <div className="loading">Loading accounts...</div>;

    return (
        <div className="email-accounts">
            <div className="section-header">
                <h2>Email Accounts</h2>
                <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
                    {showCreate ? 'Cancel' : 'Create Account'}
                </button>
            </div>

            {showCreate && (
                <form className="card email-create-form" onSubmit={handleCreate}>
                    <div className="card-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="user@example.com"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Domain</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.domain}
                                    onChange={e => setFormData({ ...formData, domain: e.target.value })}
                                    placeholder="example.com"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Strong password"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Quota (MB)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={formData.quota_mb}
                                    onChange={e => setFormData({ ...formData, quota_mb: parseInt(e.target.value) || 1024 })}
                                    min="100"
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
                            Create Account
                        </button>
                    </div>
                </form>
            )}

            {accounts.length === 0 ? (
                <div className="card">
                    <div className="card-body empty-state">
                        <p>No email accounts configured yet.</p>
                    </div>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Domain</th>
                                <th>Quota</th>
                                <th>Forwarding</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map(account => (
                                <tr key={account.id}>
                                    <td><strong>{account.email}</strong></td>
                                    <td>{account.domain}</td>
                                    <td>{account.quota_mb} MB</td>
                                    <td>{account.forward_to || 'None'}</td>
                                    <td>
                                        <span className={`badge ${account.enabled ? 'badge-success' : 'badge-secondary'}`}>
                                            {account.enabled ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="btn-group">
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => handleToggle(account)}
                                            >
                                                {account.enabled ? 'Disable' : 'Enable'}
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => {
                                                    setEditingForward(account.id);
                                                    setForwardData({
                                                        forward_to: account.forward_to || '',
                                                        keep_copy: account.forward_keep_copy !== false,
                                                    });
                                                }}
                                            >
                                                Forward
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(account.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editingForward && (
                <div className="modal-overlay" onClick={() => setEditingForward(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Email Forwarding</h3>
                            <button className="modal-close" onClick={() => setEditingForward(null)}>&times;</button>
                        </div>
                        <form onSubmit={handleForwarding}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Forward To</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={forwardData.forward_to}
                                        onChange={e => setForwardData({ ...forwardData, forward_to: e.target.value })}
                                        placeholder="user@other.com, user2@other.com"
                                    />
                                    <small className="form-help">Comma-separated email addresses. Leave empty to disable forwarding.</small>
                                </div>
                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={forwardData.keep_copy}
                                            onChange={e => setForwardData({ ...forwardData, keep_copy: e.target.checked })}
                                        />
                                        Keep a copy in this mailbox
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setEditingForward(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};


// ==========================================
// POSTFIX TAB
// ==========================================

const PostfixTab = ({ status, onRefresh }) => {
    const { showToast } = useToast();
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (status?.postfix?.installed) loadConfig();
        else setLoading(false);
    }, [status]);

    async function loadConfig() {
        try {
            const data = await api.getPostfixConfig();
            setConfig(data.config || {});
        } catch (err) {
            console.error('Failed to load Postfix config:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleInstall() {
        setInstalling(true);
        try {
            const result = await api.installPostfix();
            if (result.success) {
                showToast('Postfix installed', 'success');
                onRefresh();
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setInstalling(false);
        }
    }

    async function handleSave() {
        try {
            const result = await api.updatePostfixConfig(config);
            if (result.success) {
                showToast('Configuration saved', 'success');
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    if (loading) return <div className="loading">Loading...</div>;

    if (!status?.postfix?.installed) {
        return (
            <div className="card">
                <div className="card-body empty-state">
                    <h3>Postfix Not Installed</h3>
                    <p>Postfix is a high-performance mail transfer agent (MTA) used for sending and receiving email.</p>
                    <button
                        className="btn btn-primary"
                        onClick={handleInstall}
                        disabled={installing}
                    >
                        {installing ? 'Installing...' : 'Install Postfix'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="email-postfix">
            <div className="card">
                <div className="card-header">
                    <h3>Postfix Configuration</h3>
                </div>
                <div className="card-body">
                    {config && (
                        <div className="form-grid">
                            {Object.entries(config).map(([key, value]) => (
                                <div className="form-group" key={key}>
                                    <label>{key}</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={value}
                                        onChange={e => setConfig({ ...config, [key]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: '16px' }}>
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};


// ==========================================
// DOVECOT TAB
// ==========================================

const DovecotTab = ({ status, onRefresh }) => {
    const { showToast } = useToast();
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (status?.dovecot?.installed) loadConfig();
        else setLoading(false);
    }, [status]);

    async function loadConfig() {
        try {
            const data = await api.getDovecotConfig();
            setConfig(data.config || {});
        } catch (err) {
            console.error('Failed to load Dovecot config:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleInstall() {
        setInstalling(true);
        try {
            const result = await api.installDovecot();
            if (result.success) {
                showToast('Dovecot installed', 'success');
                onRefresh();
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setInstalling(false);
        }
    }

    if (loading) return <div className="loading">Loading...</div>;

    if (!status?.dovecot?.installed) {
        return (
            <div className="card">
                <div className="card-body empty-state">
                    <h3>Dovecot Not Installed</h3>
                    <p>Dovecot is an IMAP and POP3 server that allows email clients to access mailboxes.</p>
                    <button
                        className="btn btn-primary"
                        onClick={handleInstall}
                        disabled={installing}
                    >
                        {installing ? 'Installing...' : 'Install Dovecot'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="email-dovecot">
            <div className="card">
                <div className="card-header">
                    <h3>Dovecot Configuration</h3>
                    <span className={`badge ${status?.dovecot?.running ? 'badge-success' : 'badge-warning'}`}>
                        {status?.dovecot?.running ? 'Running' : 'Stopped'}
                    </span>
                </div>
                <div className="card-body">
                    {config && Object.keys(config).length > 0 ? (
                        <div className="config-list">
                            {Object.entries(config).map(([key, value]) => (
                                <div className="config-item" key={key}>
                                    <span className="config-key">{key}</span>
                                    <span className="config-value">{value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-secondary">Using default Dovecot configuration.</p>
                    )}
                </div>
            </div>
        </div>
    );
};


// ==========================================
// SPAM FILTER TAB
// ==========================================

const SpamTab = ({ status, onRefresh }) => {
    const { showToast } = useToast();
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (status?.spamassassin?.installed) loadConfig();
        else setLoading(false);
    }, [status]);

    async function loadConfig() {
        try {
            const data = await api.getSpamAssassinConfig();
            setConfig(data.config || {});
        } catch (err) {
            console.error('Failed to load SpamAssassin config:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleInstall() {
        setInstalling(true);
        try {
            const result = await api.installSpamAssassin();
            if (result.success) {
                showToast('SpamAssassin installed', 'success');
                onRefresh();
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setInstalling(false);
        }
    }

    async function handleSave() {
        try {
            const result = await api.updateSpamAssassinConfig(config);
            if (result.success) {
                showToast('SpamAssassin configuration saved', 'success');
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    if (loading) return <div className="loading">Loading...</div>;

    if (!status?.spamassassin?.installed) {
        return (
            <div className="card">
                <div className="card-body empty-state">
                    <h3>SpamAssassin Not Installed</h3>
                    <p>SpamAssassin is a mail filter that identifies spam using content analysis and DNS blocklists.</p>
                    <button
                        className="btn btn-primary"
                        onClick={handleInstall}
                        disabled={installing}
                    >
                        {installing ? 'Installing...' : 'Install SpamAssassin'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="email-spam">
            <div className="card">
                <div className="card-header">
                    <h3>SpamAssassin Configuration</h3>
                </div>
                <div className="card-body">
                    {config && (
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Required Score (higher = less aggressive)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={config.required_score}
                                    onChange={e => setConfig({ ...config, required_score: parseFloat(e.target.value) })}
                                    step="0.5"
                                    min="1"
                                    max="10"
                                />
                            </div>
                            <div className="form-group">
                                <label>Spam Subject Prefix</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={config.rewrite_header_subject}
                                    onChange={e => setConfig({ ...config, rewrite_header_subject: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={config.use_bayes}
                                        onChange={e => setConfig({ ...config, use_bayes: e.target.checked })}
                                    />
                                    Enable Bayesian Filtering
                                </label>
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={config.bayes_auto_learn}
                                        onChange={e => setConfig({ ...config, bayes_auto_learn: e.target.checked })}
                                    />
                                    Auto-learn from messages
                                </label>
                            </div>
                        </div>
                    )}
                    <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: '16px' }}>
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};


// ==========================================
// AUTHENTICATION TAB (DKIM/SPF/DMARC)
// ==========================================

const AuthenticationTab = ({ status, onRefresh }) => {
    const { showToast } = useToast();
    const [domain, setDomain] = useState('');
    const [selector, setSelector] = useState('mail');
    const [dnsRecords, setDnsRecords] = useState(null);
    const [installing, setInstalling] = useState(false);
    const [generating, setGenerating] = useState(false);

    async function handleInstallDkim() {
        setInstalling(true);
        try {
            const result = await api.installDkim();
            if (result.success) {
                showToast('OpenDKIM installed', 'success');
                onRefresh();
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setInstalling(false);
        }
    }

    async function handleGenerateKey() {
        if (!domain) {
            showToast('Please enter a domain', 'error');
            return;
        }
        setGenerating(true);
        try {
            const result = await api.generateDkimKey({ domain, selector });
            if (result.success) {
                showToast('DKIM key generated', 'success');
                loadDnsRecords();
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setGenerating(false);
        }
    }

    async function loadDnsRecords() {
        if (!domain) return;
        try {
            const data = await api.getEmailDnsRecords(domain);
            setDnsRecords(data.records || []);
        } catch (err) {
            showToast('Failed to load DNS records', 'error');
        }
    }

    return (
        <div className="email-authentication">
            {!status?.opendkim?.installed && (
                <div className="card">
                    <div className="card-body empty-state">
                        <h3>OpenDKIM Not Installed</h3>
                        <p>DKIM signs outgoing emails to prove they were sent from your server and have not been tampered with.</p>
                        <button
                            className="btn btn-primary"
                            onClick={handleInstallDkim}
                            disabled={installing}
                        >
                            {installing ? 'Installing...' : 'Install OpenDKIM'}
                        </button>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <h3>Generate DKIM Key</h3>
                </div>
                <div className="card-body">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Domain</label>
                            <input
                                type="text"
                                className="form-control"
                                value={domain}
                                onChange={e => setDomain(e.target.value)}
                                placeholder="example.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Selector</label>
                            <input
                                type="text"
                                className="form-control"
                                value={selector}
                                onChange={e => setSelector(e.target.value)}
                                placeholder="mail"
                            />
                        </div>
                    </div>
                    <div className="btn-group" style={{ marginTop: '16px' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleGenerateKey}
                            disabled={generating || !domain}
                        >
                            {generating ? 'Generating...' : 'Generate Key'}
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={loadDnsRecords}
                            disabled={!domain}
                        >
                            Show DNS Records
                        </button>
                    </div>
                </div>
            </div>

            {dnsRecords && dnsRecords.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h3>Required DNS Records</h3>
                    </div>
                    <div className="card-body">
                        <p className="text-secondary" style={{ marginBottom: '16px' }}>
                            Add these records to your DNS settings for email authentication.
                        </p>
                        <div className="dns-records-list">
                            {dnsRecords.map((record, i) => (
                                <div key={i} className="dns-record-item">
                                    <div className="dns-record-header">
                                        <span className="badge badge-info">{record.type}</span>
                                        <span className="dns-record-purpose">{record.purpose}</span>
                                    </div>
                                    <div className="dns-record-details">
                                        <div className="dns-field">
                                            <span className="dns-label">Name:</span>
                                            <code>{record.name}</code>
                                        </div>
                                        <div className="dns-field">
                                            <span className="dns-label">Value:</span>
                                            <code className="dns-value">{record.value}</code>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// ==========================================
// MAIL QUEUE TAB
// ==========================================

const QueueTab = () => {
    const { showToast } = useToast();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);

    useEffect(() => {
        loadQueue();
    }, []);

    async function loadQueue() {
        setLoading(true);
        try {
            const data = await api.getMailQueue();
            setQueue(data.queue || []);
            setCount(data.count || 0);
        } catch (err) {
            showToast('Failed to load mail queue', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleFlush() {
        try {
            await api.flushMailQueue();
            showToast('Queue flushed', 'success');
            loadQueue();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function handleDelete(queueId) {
        try {
            await api.deleteQueuedMessage(queueId);
            showToast('Message deleted', 'success');
            loadQueue();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    if (loading) return <div className="loading">Loading mail queue...</div>;

    return (
        <div className="email-queue">
            <div className="section-header">
                <h2>Mail Queue ({count} messages)</h2>
                <div className="btn-group">
                    <button className="btn btn-outline" onClick={loadQueue}>Refresh</button>
                    <button className="btn btn-primary" onClick={handleFlush} disabled={count === 0}>
                        Flush Queue
                    </button>
                </div>
            </div>

            {queue.length === 0 ? (
                <div className="card">
                    <div className="card-body empty-state">
                        <p>Mail queue is empty.</p>
                    </div>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Queue ID</th>
                                <th>Size</th>
                                <th>Date</th>
                                <th>Sender</th>
                                <th>Recipients</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {queue.map(item => (
                                <tr key={item.id}>
                                    <td><code>{item.id}</code></td>
                                    <td>{item.size} B</td>
                                    <td>{item.date}</td>
                                    <td>{item.sender}</td>
                                    <td>{(item.recipients || []).join(', ')}</td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDelete(item.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


// ==========================================
// WEBMAIL TAB
// ==========================================

const WebmailTab = () => {
    const { showToast } = useToast();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        loadStatus();
    }, []);

    async function loadStatus() {
        try {
            const data = await api.getWebmailStatus();
            setStatus(data);
        } catch (err) {
            console.error('Failed to load webmail status:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleInstall() {
        setInstalling(true);
        try {
            const result = await api.installWebmail();
            if (result.success) {
                showToast('Roundcube installed', 'success');
                loadStatus();
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setInstalling(false);
        }
    }

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="email-webmail">
            <div className="card">
                <div className="card-body">
                    {status?.installed ? (
                        <div className="webmail-status">
                            <div className="email-service-header">
                                <div>
                                    <h3>Roundcube Webmail</h3>
                                    <p className="text-secondary">Browser-based email client for your users</p>
                                </div>
                                <span className="badge badge-success">Installed</span>
                            </div>
                            {status.url && (
                                <p style={{ marginTop: '16px' }}>
                                    Access webmail at: <a href={status.url} target="_blank" rel="noopener noreferrer"><strong>{status.url}</strong></a>
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <h3>Roundcube Webmail</h3>
                            <p>Roundcube provides a browser-based interface for users to read and send email.</p>
                            <button
                                className="btn btn-primary"
                                onClick={handleInstall}
                                disabled={installing}
                            >
                                {installing ? 'Installing...' : 'Install Roundcube'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// ==========================================
// LOGS TAB
// ==========================================

const LogsTab = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState(null);

    useEffect(() => {
        loadLogs();
    }, []);

    async function loadLogs() {
        setLoading(true);
        try {
            const data = await api.getMailLogs(200);
            setLogs(data.lines || []);
            setSource(data.source);
        } catch (err) {
            console.error('Failed to load mail logs:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="loading">Loading logs...</div>;

    return (
        <div className="email-logs">
            <div className="section-header">
                <h2>Mail Logs</h2>
                <div className="btn-group">
                    {source && <span className="text-secondary">Source: {source}</span>}
                    <button className="btn btn-outline" onClick={loadLogs}>Refresh</button>
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    {logs.length === 0 ? (
                        <p className="text-secondary">No mail logs available.</p>
                    ) : (
                        <pre className="log-output">{logs.join('\n')}</pre>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Email;
