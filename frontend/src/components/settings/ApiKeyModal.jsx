import { useState } from 'react';
import { X, Copy, Check, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import { copyToClipboard as clipboardWrite } from '../../utils/clipboard';

const SCOPE_OPTIONS = [
    { value: '*', label: 'Full Access' },
    { value: 'apps:read', label: 'Apps (Read)' },
    { value: 'apps:write', label: 'Apps (Write)' },
    { value: 'docker:read', label: 'Docker (Read)' },
    { value: 'docker:write', label: 'Docker (Write)' },
    { value: 'system:read', label: 'System (Read)' },
    { value: 'databases:read', label: 'Databases (Read)' },
    { value: 'databases:write', label: 'Databases (Write)' },
    { value: 'backups:read', label: 'Backups (Read)' },
    { value: 'backups:write', label: 'Backups (Write)' },
    { value: 'domains:read', label: 'Domains (Read)' },
    { value: 'domains:write', label: 'Domains (Write)' },
];

const TIER_OPTIONS = [
    { value: 'standard', label: 'Standard', desc: '100 req/min' },
    { value: 'elevated', label: 'Elevated', desc: '500 req/min' },
    { value: 'unlimited', label: 'Unlimited', desc: '5000 req/min' },
];

const ApiKeyModal = ({ onClose, onSubmit, createdKey }) => {
    const [name, setName] = useState('');
    const [scopes, setScopes] = useState(['*']);
    const [tier, setTier] = useState('standard');
    const [expiresAt, setExpiresAt] = useState('');
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleScopeToggle = (scope) => {
        if (scope === '*') {
            setScopes(['*']);
            return;
        }
        setScopes(prev => {
            const filtered = prev.filter(s => s !== '*');
            if (filtered.includes(scope)) {
                return filtered.filter(s => s !== scope);
            }
            return [...filtered, scope];
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            await onSubmit({
                name: name.trim(),
                scopes,
                tier,
                expires_at: expiresAt || null,
            });
        } finally {
            setSaving(false);
        }
    };

    const copyKey = () => {
        if (createdKey) {
            clipboardWrite(createdKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Show created key view
    if (createdKey) {
        return (
            <Modal open={true} onClose={onClose} title="API Key Created" className="api-key-modal">
                        <div className="api-key-modal__warning">
                            <AlertTriangle size={16} />
                            <span>Copy this key now. It will not be shown again.</span>
                        </div>
                        <div className="api-key-modal__key-display">
                            <code>{createdKey}</code>
                            <button className="btn btn-sm btn-secondary" onClick={copyKey}>
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    <div className="modal-footer">
                        <button className="btn btn-primary" onClick={onClose}>Done</button>
                    </div>
            </Modal>
        );
    }

    return (
        <Modal open={true} onClose={onClose} title="Create API Key" className="api-key-modal">
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. CI/CD Pipeline, Monitoring Script"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Tier</label>
                            <div className="api-key-modal__tiers">
                                {TIER_OPTIONS.map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        className={`api-key-modal__tier-btn ${tier === t.value ? 'active' : ''}`}
                                        onClick={() => setTier(t.value)}
                                    >
                                        <span className="api-key-modal__tier-label">{t.label}</span>
                                        <span className="api-key-modal__tier-desc">{t.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Scopes</label>
                            <div className="api-key-modal__scopes">
                                {SCOPE_OPTIONS.map(s => (
                                    <label key={s.value} className="api-key-modal__scope-item">
                                        <input
                                            type="checkbox"
                                            checked={scopes.includes(s.value) || (s.value !== '*' && scopes.includes('*'))}
                                            disabled={s.value !== '*' && scopes.includes('*')}
                                            onChange={() => handleScopeToggle(s.value)}
                                        />
                                        <span>{s.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Expiration (optional)</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={expiresAt}
                                onChange={e => setExpiresAt(e.target.value)}
                            />
                            <span className="form-help">Leave empty for no expiration</span>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
                            {saving ? 'Creating...' : 'Create Key'}
                        </button>
                    </div>
                </form>
        </Modal>
    );
};

export default ApiKeyModal;
