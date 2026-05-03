import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Search, X, Plus, Edit2, Trash2, RefreshCw, ChevronRight,
    Globe, BookOpen, Star, Package, FolderOpen, Settings2,
    Monitor, Tablet, Smartphone, ExternalLink, Tag, Layers,
    LayoutGrid, Puzzle, FileCode2, AlertCircle, CheckCircle2,
    ArrowLeft, Eye, Download, Server, Wrench, Upload,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
    restaurant: '🍽️', food: '🍽️', landing: '🚀', saas: '☁️',
    portfolio: '🎨', ecommerce: '🛒', shop: '🛒', blog: '✍️',
    corporate: '🏢', agency: '💼', healthcare: '🏥', medical: '🏥',
    education: '🎓', church: '⛪', nonprofit: '❤️', hotel: '🏨',
    real_estate: '🏠', fitness: '💪', beauty: '💅', tech: '⚡',
    finance: '💰', legal: '⚖️', construction: '🏗️', general: '📄',
};

function categoryIcon(cat) {
    return CATEGORY_ICONS[cat?.toLowerCase()] || '📄';
}

// ─────────────────────────────────────────────────────────────────────────────
// WaaS — Device Preview Frame
// ─────────────────────────────────────────────────────────────────────────────

function DeviceFrame({ viewport, screenshot, previewUrl, templateName, domain }) {
    const isMobile = viewport === 'mobile';
    const isTablet = viewport === 'tablet';
    const isDesktop = viewport === 'desktop';

    const urlText = previewUrl || domain || 'preview.example.com';

    const screenContent = (screenshot || previewUrl) ? (
        previewUrl
            ? <iframe
                src={previewUrl}
                title={templateName}
                className={`block w-full border-none ${isMobile ? 'wp-iframe-mobile' : isTablet ? 'wp-iframe-tablet' : 'wp-iframe-desktop'}`}
                style={{ height: isDesktop ? '540px' : isTablet ? '560px' : '520px' }}
            />
            : <img src={screenshot} alt={templateName} className="block w-full h-full object-cover" />
    ) : (
        <div className="flex flex-col items-center justify-center gap-3 bg-muted/30 text-muted-foreground"
            style={{ minHeight: isDesktop ? '540px' : isTablet ? '420px' : '520px' }}>
            <Eye size={32} className="opacity-30" />
            <p className="text-sm">No preview available</p>
            <p className="text-xs opacity-60">Upload a screenshot in the editor</p>
        </div>
    );

    if (isDesktop) {
        return (
            <div className="wp-device wp-device-desktop">
                <div className="wp-device-chrome">
                    <div className="wp-chrome-dots"><span /><span /><span /></div>
                    <div className="wp-chrome-url">{urlText}</div>
                </div>
                <div className="wp-device-screen wp-device-screen-desktop">{screenContent}</div>
            </div>
        );
    }
    if (isTablet) {
        return (
            <div className="wp-device wp-device-tablet">
                <div className="wp-device-chrome wp-device-chrome-tablet">
                    <div className="wp-chrome-url wp-chrome-url-tablet">{urlText}</div>
                </div>
                <div className="wp-device-screen wp-device-screen-tablet">{screenContent}</div>
                <div className="wp-device-homebutton" />
            </div>
        );
    }
    return (
        <div className="wp-device wp-device-mobile">
            <div className="wp-device-notch" />
            <div className="wp-device-screen wp-device-screen-mobile">{screenContent}</div>
            <div className="wp-device-homebutton" />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// WaaS — Preview Modal
// ─────────────────────────────────────────────────────────────────────────────

function WaasPreviewModal({ template, onClose, onInstall, isAdmin }) {
    const [viewport, setViewport] = useState('desktop');

    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const screenshot = template.screenshots?.[viewport] || template.screenshot || '';

    return (
        <div className="waas-preview-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            {/* Header */}
            <div className="waas-preview-header">
                <div className="waas-preview-title">
                    <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={onClose}>
                        <ArrowLeft size={14} /> Back
                    </button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <span className="text-sm font-semibold">{template.name}</span>
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">v{template.version}</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Viewport switcher */}
                    <div className="waas-viewport-controls">
                        {[
                            { id: 'desktop', icon: Monitor, label: 'Desktop' },
                            { id: 'tablet',  icon: Tablet,  label: 'Tablet' },
                            { id: 'mobile',  icon: Smartphone, label: 'Mobile' },
                        ].map(({ id, icon: Icon, label }) => (
                            <button
                                key={id}
                                className={`waas-viewport-btn ${viewport === id ? 'active' : ''}`}
                                title={label}
                                onClick={() => setViewport(id)}
                            >
                                <Icon size={15} />
                            </button>
                        ))}
                    </div>

                    {template.preview_url && (
                        <a href={template.preview_url} target="_blank" rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm flex items-center gap-1">
                            <ExternalLink size={13} /> Live Demo
                        </a>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
                </div>
            </div>

            {/* Body */}
            <div className="waas-preview-body">
                {/* Device stage */}
                <div className="waas-preview-stage">
                    <DeviceFrame
                        viewport={viewport}
                        screenshot={screenshot}
                        previewUrl={template.preview_url}
                        templateName={template.name}
                    />
                </div>

                {/* Info sidebar */}
                <div className="waas-preview-sidebar">
                    <div className="waas-preview-info">
                        <h2 className="text-base font-semibold mb-1">{template.name}</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4">{template.description}</p>

                        <div className="flex flex-col gap-3">
                            <InfoRow label="Category" value={
                                <span className="flex items-center gap-1 capitalize">
                                    {categoryIcon(template.category)} {template.category}
                                </span>
                            } />
                            <InfoRow label="Color scheme" value={
                                <span className="capitalize">{template.color_scheme || '—'}</span>
                            } />
                            {template.theme?.name && (
                                <InfoRow label="Theme" value={template.theme.name} />
                            )}
                            {template.plugins?.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Plugins</p>
                                    <div className="flex flex-col gap-1">
                                        {template.plugins.map(p => (
                                            <div key={p} className="flex items-center gap-2 text-xs">
                                                <Puzzle size={11} className="text-muted-foreground shrink-0" />
                                                <span className="text-foreground">{p}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {template.pages?.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                        Pages ({template.pages.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {template.pages.map(p => (
                                            <span key={p} className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">{p}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="waas-preview-footer">
                        {isAdmin && (
                            <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={() => onInstall(template)}>
                                <Download size={13} /> Deploy
                            </button>
                        )}
                        <button className="btn btn-primary flex-1 flex items-center justify-center gap-1"
                            onClick={() => onInstall(template)}>
                            Use Template <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-muted-foreground shrink-0">{label}</span>
            <span className="text-xs text-foreground text-right">{value}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// WaaS — Template Card
// ─────────────────────────────────────────────────────────────────────────────

function WaasCard({ template, onPreview, onInstall }) {
    return (
        <div className="waas-template-card">
            {/* Screenshot */}
            <div className="waas-card-screenshot" onClick={() => onPreview(template)}>
                {template.screenshot
                    ? <img src={template.screenshot} alt={template.name} loading="lazy" />
                    : (
                        <div className="waas-card-screenshot-placeholder">
                            {categoryIcon(template.category)}
                        </div>
                    )
                }
                {template.featured && (
                    <span className="waas-featured-badge">
                        <Star size={9} /> Featured
                    </span>
                )}
                {template.source === 'custom' && (
                    <span className="waas-custom-badge">Custom</span>
                )}
            </div>

            {/* Body */}
            <div className="waas-card-body">
                <h3 className="waas-card-title">{template.name}</h3>
                <p className="waas-card-desc">{template.description}</p>
                <div className="waas-card-meta">
                    <span className="template-cat-badge capitalize">{template.category}</span>
                    {template.theme?.name && (
                        <span className="template-cat-badge">{template.theme.name}</span>
                    )}
                    {template.color_scheme && (
                        <span className="template-version-badge capitalize">{template.color_scheme}</span>
                    )}
                </div>
            </div>

            {/* Footer actions */}
            <div className="waas-card-footer">
                <button className="btn btn-ghost btn-sm flex-1 flex items-center justify-center gap-1"
                    onClick={() => onPreview(template)}>
                    <Eye size={13} /> Preview
                </button>
                <button className="btn btn-primary btn-sm flex-1 flex items-center justify-center gap-1"
                    onClick={() => onInstall(template)}>
                    Use <ChevronRight size={13} />
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// WaaS — Template Editor Modal
// ─────────────────────────────────────────────────────────────────────────────

const BLANK_WP_TEMPLATE = {
    name: '', description: '', version: '1.0.0',
    category: 'general', color_scheme: 'light', featured: false,
    screenshot: '', preview_url: '',
    theme_slug: '', theme_name: '',
    plugins: '', pages: '',
};

function WaasTemplateEditor({ initial, onClose, onSaved }) {
    const toast = useToast();
    const isNew = !initial?.id;
    const [form, setForm] = useState(() => initial ? {
        name: initial.name || '',
        description: initial.description || '',
        version: initial.version || '1.0.0',
        category: initial.category || 'general',
        color_scheme: initial.color_scheme || 'light',
        featured: initial.featured || false,
        screenshot: initial.screenshot || '',
        preview_url: initial.preview_url || '',
        theme_slug: initial.theme?.slug || '',
        theme_name: initial.theme?.name || '',
        plugins: (initial.plugins || []).join(', '),
        pages: (initial.pages || []).join(', '),
    } : { ...BLANK_WP_TEMPLATE });
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    async function handleSave() {
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        setSaving(true);
        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            version: form.version.trim() || '1.0.0',
            category: form.category.trim() || 'general',
            color_scheme: form.color_scheme,
            featured: form.featured,
            screenshot: form.screenshot.trim(),
            preview_url: form.preview_url.trim(),
            theme: { slug: form.theme_slug.trim(), name: form.theme_name.trim() },
            plugins: form.plugins.split(',').map(p => p.trim()).filter(Boolean),
            pages: form.pages.split(',').map(p => p.trim()).filter(Boolean),
        };
        try {
            if (isNew) {
                await api.createWpTemplate(payload);
                toast.success('Template created');
            } else {
                await api.updateWpTemplate(initial.id, payload);
                toast.success('Template updated');
            }
            onSaved();
        } catch (err) {
            toast.error(err.message || 'Failed to save template');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal modal-lg">
                <div className="modal-header">
                    <h3>{isNew ? 'New WordPress Template' : `Edit — ${initial.name}`}</h3>
                    <button className="modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="modal-body">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="form-group mb-0 col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                            <input className="form-control w-full" value={form.name}
                                onChange={e => set('name', e.target.value)} placeholder="My Template" />
                        </div>
                        <div className="form-group mb-0 col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                            <textarea className="form-control w-full" rows={3} value={form.description}
                                onChange={e => set('description', e.target.value)}
                                placeholder="Short description visible in the template gallery" />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                            <input className="form-control w-full" value={form.category}
                                onChange={e => set('category', e.target.value)} placeholder="restaurant" />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Color Scheme</label>
                            <select className="form-control w-full" value={form.color_scheme}
                                onChange={e => set('color_scheme', e.target.value)}>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="warm">Warm</option>
                                <option value="cool">Cool</option>
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Theme Slug</label>
                            <input className="form-control w-full" value={form.theme_slug}
                                onChange={e => set('theme_slug', e.target.value)} placeholder="astra" />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Theme Name</label>
                            <input className="form-control w-full" value={form.theme_name}
                                onChange={e => set('theme_name', e.target.value)} placeholder="Astra" />
                        </div>
                        <div className="form-group mb-0 col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Screenshot URL</label>
                            <input className="form-control w-full" value={form.screenshot}
                                onChange={e => set('screenshot', e.target.value)}
                                placeholder="https://..." />
                        </div>
                        <div className="form-group mb-0 col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Live Preview URL <span className="text-muted-foreground/60">(optional)</span></label>
                            <input className="form-control w-full" value={form.preview_url}
                                onChange={e => set('preview_url', e.target.value)}
                                placeholder="https://demo.example.com/my-template" />
                        </div>
                        <div className="form-group mb-0 col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Plugins <span className="text-muted-foreground/60">(comma-separated)</span></label>
                            <input className="form-control w-full" value={form.plugins}
                                onChange={e => set('plugins', e.target.value)}
                                placeholder="elementor, woocommerce, contact-form-7" />
                        </div>
                        <div className="form-group mb-0 col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Pages <span className="text-muted-foreground/60">(comma-separated)</span></label>
                            <input className="form-control w-full" value={form.pages}
                                onChange={e => set('pages', e.target.value)}
                                placeholder="Home, About, Contact" />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Version</label>
                            <input className="form-control w-full" value={form.version}
                                onChange={e => set('version', e.target.value)} placeholder="1.0.0" />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <label className="toggle-switch shrink-0">
                                <input type="checkbox" checked={form.featured}
                                    onChange={e => set('featured', e.target.checked)} />
                                <span className="toggle-slider" />
                            </label>
                            <span className="text-xs text-muted-foreground">Mark as featured</span>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : isNew ? 'Create Template' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// WaaS — From-Backup Modal (the only creation path)
// ─────────────────────────────────────────────────────────────────────────────

const UPLOAD_STEPS = [
    'Uploading backup file…',
    'Extracting WordPress content…',
    'Registering template…',
];
const UPLOAD_DELAYS = [0, 2000, 4500];

const LAUNCH_MESSAGES = [
    'Starting containers…',
    'Pulling WordPress image…',
    'Waiting for MySQL…',
    'WordPress initializing…',
];

function WaasFromBackupModal({ onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState({
        name: '', description: '', category: 'general',
        version: '1.0.0', theme_name: '', theme_slug: '',
        plugins: '', featured: false,
    });
    const [backupFile, setBackupFile] = useState(null);
    const [dbFile, setDbFile] = useState(null);
    // phase: 'form' | 'uploading' | 'launching' | 'ready'
    const [phase, setPhase] = useState('form');
    const [uploadStep, setUploadStep] = useState(0);
    const [launchMsg, setLaunchMsg] = useState('Starting containers…');
    const [templateId, setTemplateId] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    // Animate upload progress steps
    useEffect(() => {
        if (phase !== 'uploading') return;
        const timers = UPLOAD_DELAYS.map((delay, i) => setTimeout(() => setUploadStep(i), delay));
        return () => timers.forEach(clearTimeout);
    }, [phase]);

    // Poll backend for real container status
    useEffect(() => {
        if (phase !== 'launching' || !templateId) return;

        const timers = { poll: null };

        async function poll() {
            try {
                const s = await api.getWpPreviewStatus(templateId);
                if (s.status === 'ready') {
                    clearInterval(timers.poll);
                    setPreviewUrl(s.preview_url || previewUrl);
                    setPhase('ready');
                } else if (s.status === 'error') {
                    clearInterval(timers.poll);
                    toast.error(s.message || 'Container failed to start');
                    setPhase('form');
                } else if (s.message) {
                    setLaunchMsg(s.message);
                }
            } catch { /* ignore transient poll errors */ }
        }

        poll();
        timers.poll = setInterval(poll, 5000);

        return () => clearInterval(timers.poll);
    }, [phase, templateId]);

    async function handleUpload() {
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        if (!backupFile) { toast.error('Backup file is required'); return; }

        setPhase('uploading');
        setUploadStep(0);

        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('description', form.description);
        fd.append('category', form.category);
        fd.append('version', form.version);
        fd.append('theme_name', form.theme_name);
        fd.append('theme_slug', form.theme_slug);
        fd.append('plugins', form.plugins);
        fd.append('featured', form.featured ? '1' : '0');
        fd.append('backup_file', backupFile);
        if (dbFile) fd.append('db_file', dbFile);

        try {
            const res = await api.createWpTemplateFromBackup(fd);
            setTemplateId(res.template_id);
            setPreviewUrl(res.preview_url);
            setLaunchMsg(LAUNCH_MESSAGES[0]);
            setPhase('launching');
        } catch (err) {
            toast.error(err.message || 'Upload failed');
            setPhase('form');
        }
    }

    // ── Ready screen ──────────────────────────────────────────────────────────
    if (phase === 'ready') {
        return (
            <div className="modal-overlay">
                <div className="modal">
                    <div className="modal-header">
                        <h3>Template Ready</h3>
                        <button className="modal-close" onClick={onClose}><X size={16} /></button>
                    </div>
                    <div className="modal-body">
                        <div className="flex flex-col items-center gap-4 py-6">
                            <CheckCircle2 size={40} className="text-success" />
                            <p className="text-sm font-medium">WordPress preview is live</p>
                            <p className="text-xs text-muted-foreground text-center">
                                Your template has been created. Open the preview to complete the WordPress setup
                                (site name, admin email and password only — themes and plugins are already installed).
                            </p>
                            {previewUrl && (
                                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                                    className="btn btn-primary btn-sm flex items-center gap-1">
                                    <ExternalLink size={13} /> Open Preview
                                </a>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={onSaved}>Done</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal modal-lg">
                <div className="modal-header">
                    <h3>New WordPress Template</h3>
                    <button className="modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="modal-body">
                    {phase === 'uploading' ? (
                        <div className="flex flex-col gap-3 py-8 px-2">
                            <div className="flex items-center gap-3">
                                <RefreshCw size={15} className="animate-spin text-primary shrink-0" />
                                <span className="text-sm text-foreground font-medium flex-1 truncate">
                                    {UPLOAD_STEPS[uploadStep]}
                                </span>
                                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                                    {Math.round((uploadStep / (UPLOAD_STEPS.length - 1)) * 100)}%
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-700"
                                    style={{ width: `${Math.round((uploadStep / (UPLOAD_STEPS.length - 1)) * 100)}%` }} />
                            </div>
                        </div>
                    ) : phase === 'launching' ? (
                        <div className="flex flex-col gap-4 py-8 px-2">
                            <div className="flex items-center gap-3">
                                <RefreshCw size={15} className="animate-spin text-primary shrink-0" />
                                <span className="text-sm text-foreground font-medium flex-1">{launchMsg}</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary/50 rounded-full animate-pulse w-full" />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Docker is pulling WordPress and MySQL images. This takes 2–5 minutes on first run.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="form-group mb-0 col-span-2">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                                <input className="form-control w-full" value={form.name}
                                    onChange={e => set('name', e.target.value)} placeholder="My Site Template" />
                            </div>
                            <div className="form-group mb-0 col-span-2">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                                <textarea className="form-control w-full" rows={2} value={form.description}
                                    onChange={e => set('description', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                                <input className="form-control w-full" value={form.category}
                                    onChange={e => set('category', e.target.value)} placeholder="restaurant" />
                            </div>
                            <div className="form-group mb-0">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Version</label>
                                <input className="form-control w-full" value={form.version}
                                    onChange={e => set('version', e.target.value)} placeholder="1.0.0" />
                            </div>
                            <div className="form-group mb-0">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Theme Name</label>
                                <input className="form-control w-full" value={form.theme_name}
                                    onChange={e => set('theme_name', e.target.value)} placeholder="Astra" />
                            </div>
                            <div className="form-group mb-0">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Theme Slug</label>
                                <input className="form-control w-full" value={form.theme_slug}
                                    onChange={e => set('theme_slug', e.target.value)} placeholder="astra" />
                            </div>
                            <div className="form-group mb-0 col-span-2">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                    Plugins <span className="text-muted-foreground/60">(comma-separated)</span>
                                </label>
                                <input className="form-control w-full" value={form.plugins}
                                    onChange={e => set('plugins', e.target.value)}
                                    placeholder="elementor, woocommerce, contact-form-7" />
                            </div>

                            <div className="form-group mb-0 col-span-2">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                    WordPress Backup <span className="text-muted-foreground/60">(.zip or .wpress)</span> *
                                </label>
                                <label className="upload-drop-zone cursor-pointer">
                                    <input type="file" className="hidden" accept=".zip,.wpress"
                                        onChange={e => setBackupFile(e.target.files[0] || null)} />
                                    {backupFile ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={15} className="text-success shrink-0" />
                                            <span className="text-sm truncate flex-1">{backupFile.name}</span>
                                            <button type="button" className="text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={e => { e.preventDefault(); setBackupFile(null); }}>
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Upload size={22} />
                                            <span className="text-sm">Click to select backup file</span>
                                        </div>
                                    )}
                                </label>
                            </div>

                            <div className="form-group mb-0 col-span-2">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                    Database Dump <span className="text-muted-foreground/60">(.sql or .gz — optional)</span>
                                </label>
                                <label className="upload-drop-zone cursor-pointer">
                                    <input type="file" className="hidden" accept=".sql,.gz"
                                        onChange={e => setDbFile(e.target.files[0] || null)} />
                                    {dbFile ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={15} className="text-success shrink-0" />
                                            <span className="text-sm truncate flex-1">{dbFile.name}</span>
                                            <button type="button" className="text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={e => { e.preventDefault(); setDbFile(null); }}>
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Upload size={22} />
                                            <span className="text-sm">Click to select database dump</span>
                                        </div>
                                    )}
                                </label>
                            </div>

                            <div className="flex items-center gap-2 col-span-2">
                                <label className="toggle-switch shrink-0">
                                    <input type="checkbox" checked={form.featured}
                                        onChange={e => set('featured', e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                                <span className="text-xs text-muted-foreground">Mark as featured</span>
                            </div>

                            <div className="col-span-2 rounded-md bg-muted/50 px-3 py-2">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Your WordPress backup will be uploaded, wp-content extracted, and a Docker preview container
                                    named <code className="font-mono">&lt;template&gt;-template</code> started automatically.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                {phase === 'form' && (
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary flex items-center gap-1" onClick={handleUpload}
                            disabled={!form.name.trim() || !backupFile}>
                            <Upload size={13} /> Upload &amp; Create Preview
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// WaaS — Manage Tab
// ─────────────────────────────────────────────────────────────────────────────

function WaasManageTab({ isAdmin }) {
    const toast = useToast();
    const [templates, setTemplates] = useState([]);
    const [customCats, setCustomCats] = useState([]);
    const [newCat, setNewCat] = useState('');
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    const reload = useCallback(async () => {
        try {
            const [tr, cr] = await Promise.all([api.listWpTemplates(), api.getWpCustomCategories()]);
            setTemplates(tr.templates || []);
            setCustomCats(cr.categories || []);
        } catch { toast.error('Failed to load templates'); }
        finally { setLoading(false); }
    }, [toast]);

    useEffect(() => { reload(); }, [reload]);

    async function addCategory() {
        if (!newCat.trim()) return;
        try {
            await api.addWpCustomCategory(newCat.trim());
            setNewCat('');
            reload();
        } catch (err) { toast.error(err.message || 'Failed'); }
    }

    async function removeCategory(name) {
        try {
            await api.removeWpCustomCategory(name);
            reload();
        } catch (err) { toast.error(err.message || 'Failed'); }
    }

    async function deleteTemplate(t) {
        if (!confirm(`Delete "${t.name}"?`)) return;
        try {
            await api.deleteWpTemplate(t.id);
            toast.success('Template deleted');
            reload();
        } catch (err) { toast.error(err.message || 'Failed'); }
    }

    if (loading) return <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>;

    return (
        <div className="flex flex-col gap-6">
            {/* Categories */}
            <div className="settings-card">
                <div className="settings-card__header">
                    <div className="settings-card__header-left">
                        <h3 className="text-sm font-semibold">Custom Categories</h3>
                        <p className="text-xs text-muted-foreground">Add extra categories to the template filter bar.</p>
                    </div>
                </div>
                <div className="flex gap-2 mb-3">
                    <input className="form-control flex-1" value={newCat}
                        onChange={e => setNewCat(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCategory()}
                        placeholder="e.g. wedding, podcast" />
                    <button className="btn btn-primary btn-sm flex items-center gap-1"
                        onClick={addCategory} disabled={!newCat.trim()}>
                        <Plus size={13} /> Add
                    </button>
                </div>
                {customCats.length === 0
                    ? <p className="text-xs text-muted-foreground">No custom categories yet.</p>
                    : (
                        <div className="flex flex-wrap gap-2">
                            {customCats.map(c => (
                                <div key={c} className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs capitalize">
                                    {c}
                                    <button className="ml-1 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeCategory(c)}>
                                        <X size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                }
            </div>

            {/* Template library */}
            <div className="settings-card">
                <div className="settings-card__header">
                    <div className="settings-card__header-left">
                        <h3 className="text-sm font-semibold">Template Library</h3>
                        <p className="text-xs text-muted-foreground">{templates.length} templates total</p>
                    </div>
                    {isAdmin && (
                        <button className="btn btn-primary btn-sm flex items-center gap-1"
                            onClick={() => setCreating(true)}>
                            <Plus size={13} /> New Template
                        </button>
                    )}
                </div>

                <div className="waas-manage-grid">
                    {templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(t => (
                        <div key={t.id} className="waas-manage-card">
                            <div className="waas-manage-thumb">
                                {t.screenshot
                                    ? <img src={t.screenshot} alt={t.name} className="w-full h-full object-cover" />
                                    : (
                                        <div className="flex items-center justify-center h-full text-2xl text-muted-foreground">
                                            {categoryIcon(t.category)}
                                        </div>
                                    )
                                }
                            </div>
                            <div className="waas-manage-info">
                                <div className="flex items-center gap-1 mb-0.5">
                                    <span className="text-xs font-semibold text-foreground truncate flex-1">{t.name}</span>
                                    {t.featured && <Star size={10} className="text-amber-400 shrink-0" />}
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    <span className="template-cat-badge capitalize">{t.category}</span>
                                    <span className="template-version-badge">{t.source}</span>
                                </div>
                            </div>
                            {isAdmin && t.source === 'custom' && (
                                <div className="waas-manage-actions">
                                    <button className="btn btn-ghost btn-xs"
                                        onClick={() => setEditing(t)}>
                                        <Edit2 size={12} />
                                    </button>
                                    <button className="btn btn-ghost btn-xs text-destructive"
                                        onClick={() => deleteTemplate(t)}>
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <Paginator page={page} total={templates.length} onPage={setPage} />
            </div>

            {creating && (
                <WaasFromBackupModal
                    onClose={() => setCreating(false)}
                    onSaved={() => { setCreating(false); reload(); }}
                />
            )}
            {editing && (
                <WaasTemplateEditor
                    initial={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); reload(); }}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared — Pagination
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function Paginator({ page, total, onPage }) {
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) return null;
    return (
        <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
                {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-1">
                <button className="btn btn-ghost btn-xs" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                    <button key={p}
                        className={`btn btn-xs ${p === page ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => onPage(p)}>
                        {p}
                    </button>
                ))}
                <button className="btn btn-ghost btn-xs" disabled={page === pages} onClick={() => onPage(page + 1)}>›</button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// WaaS — Browse Tab
// ─────────────────────────────────────────────────────────────────────────────

function WaasBrowseTab({ isAdmin }) {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [templates, setTemplates] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('q') || '');
    const [activeCategory, setActiveCategory] = useState(searchParams.get('cat') || '');
    const [preview, setPreview] = useState(null);
    const [page, setPage] = useState(1);
    const searchRef = useRef(null);

    const load = useCallback(async (cat, q) => {
        try {
            const [tr, cr] = await Promise.all([
                api.listWpTemplates(cat || null, q || null),
                api.getWpTemplateCategories(),
            ]);
            setTemplates(tr.templates || []);
            setCategories(cr.categories || []);
        } catch { toast.error('Failed to load templates'); }
        finally { setLoading(false); }
    }, [toast]);

    useEffect(() => { load(activeCategory, search); }, []);

    function applyFilters(cat, q) {
        setActiveCategory(cat);
        setSearch(q);
        setPage(1);
        const params = {};
        if (cat) params.cat = cat;
        if (q) params.q = q;
        setSearchParams(params, { replace: true });
        load(cat, q);
    }

    function handleSearch(e) {
        if (e.key === 'Enter') applyFilters(activeCategory, search);
    }

    function clearSearch() { setSearch(''); applyFilters(activeCategory, ''); }

    function handleInstall(t) {
        toast.info(`Deploy "${t.name}" — integrate with your WordPress installer here.`);
    }

    const featured = templates.filter(t => t.featured);
    const rest = templates.filter(t => !t.featured);
    const displayList = search || activeCategory ? templates : rest;
    const pagedList = displayList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="flex flex-col gap-5">
            {/* Search + category filter */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                            ref={searchRef}
                            className="form-control w-full pl-9 pr-8"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={handleSearch}
                            placeholder="Search templates…"
                        />
                        {search && (
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={clearSearch}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <button className="btn btn-primary btn-sm flex items-center gap-1"
                        onClick={() => applyFilters(activeCategory, search)}>
                        <Search size={13} /> Search
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        className={`category-btn ${!activeCategory ? 'active' : ''}`}
                        onClick={() => applyFilters('', search)}
                    >All</button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => applyFilters(cat, search)}
                        >
                            <span className="capitalize">{cat}</span>
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center text-muted-foreground text-sm py-12">Loading templates…</div>
            ) : templates.length === 0 ? (
                <div className="templates-empty-state">
                    <FolderOpen size={40} className="opacity-30" />
                    <p className="text-sm font-medium">No templates found</p>
                    {(search || activeCategory) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => applyFilters('', '')}>Clear filters</button>
                    )}
                </div>
            ) : (
                <>
                    {/* Featured section */}
                    {!search && !activeCategory && featured.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <Star size={14} className="text-amber-400" />
                                <h3 className="text-sm font-semibold">Featured</h3>
                            </div>
                            <div className="waas-templates-grid">
                                {featured.map(t => (
                                    <WaasCard key={t.id} template={t}
                                        onPreview={setPreview}
                                        onInstall={handleInstall} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All / rest */}
                    {displayList.length > 0 && (
                        <div className="flex flex-col gap-3">
                            {!search && !activeCategory && featured.length > 0 && (
                                <h3 className="text-sm font-semibold">All Templates</h3>
                            )}
                            <div className="waas-templates-grid">
                                {pagedList.map(t => (
                                    <WaasCard key={t.id} template={t}
                                        onPreview={setPreview}
                                        onInstall={handleInstall} />
                                ))}
                            </div>
                            <Paginator page={page} total={displayList.length} onPage={setPage} />
                        </div>
                    )}
                </>
            )}

            {preview && (
                <WaasPreviewModal
                    template={preview}
                    onClose={() => setPreview(null)}
                    onInstall={() => { setPreview(null); toast.info('Deploy flow coming soon'); }}
                    isAdmin={isAdmin}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// WaaS — Root component
// ─────────────────────────────────────────────────────────────────────────────

function WaasTemplates({ isAdmin }) {
    const [tab, setTab] = useState('browse');

    return (
        <div className="page-container templates-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">WordPress Templates</h1>
                    <p className="page-description text-sm text-muted-foreground mt-1">
                        Browse and deploy website designs for your WordPress clients
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border mb-5">
                {[
                    { id: 'browse', label: 'Browse', icon: LayoutGrid },
                    ...(isAdmin ? [{ id: 'manage', label: 'Manage', icon: Wrench }] : []),
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={[
                            'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                            tab === id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        ].join(' ')}
                    >
                        <Icon size={14} /> {label}
                    </button>
                ))}
            </div>

            {tab === 'browse' && <WaasBrowseTab isAdmin={isAdmin} />}
            {tab === 'manage' && isAdmin && <WaasManageTab isAdmin={isAdmin} />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaaS — category grouping
// ─────────────────────────────────────────────────────────────────────────────

const SAAS_CAT_GROUP = {
    // Web & CMS
    web: 'Web & CMS', cms: 'Web & CMS', blog: 'Web & CMS', website: 'Web & CMS', php: 'Web & CMS', wordpress: 'Web & CMS',
    // E-Commerce
    ecommerce: 'E-Commerce', shop: 'E-Commerce', store: 'E-Commerce', commerce: 'E-Commerce', woocommerce: 'E-Commerce',
    // Database
    database: 'Database', db: 'Database', sql: 'Database', nosql: 'Database', cache: 'Database',
    mysql: 'Database', postgresql: 'Database', postgres: 'Database', mongodb: 'Database',
    redis: 'Database', mariadb: 'Database', elasticsearch: 'Database',
    // Monitoring
    monitoring: 'Monitoring', metrics: 'Monitoring', observability: 'Monitoring',
    logging: 'Monitoring', analytics: 'Monitoring', alerting: 'Monitoring',
    grafana: 'Monitoring', prometheus: 'Monitoring',
    // Security & Auth
    security: 'Security', vpn: 'Security', auth: 'Security', identity: 'Security',
    firewall: 'Security', password: 'Security', vault: 'Security',
    // Storage & Backup
    storage: 'Storage', backup: 'Storage', files: 'Storage', s3: 'Storage', cloud: 'Storage',
    // Communication
    communication: 'Comms', chat: 'Comms', email: 'Comms', messaging: 'Comms', video: 'Comms', mail: 'Comms',
    // Development
    development: 'Dev Tools', devtools: 'Dev Tools', ci: 'Dev Tools', cd: 'Dev Tools',
    git: 'Dev Tools', code: 'Dev Tools', docker: 'Dev Tools', container: 'Dev Tools',
    // Media
    media: 'Media', streaming: 'Media', photos: 'Media', music: 'Media',
    // Productivity
    productivity: 'Productivity', office: 'Productivity', notes: 'Productivity', tasks: 'Productivity',
    // AI / Data
    ai: 'AI & Data', ml: 'AI & Data', data: 'AI & Data', llm: 'AI & Data',
};

function getSaasGroup(categories = []) {
    for (const cat of categories) {
        const lower = cat.toLowerCase();
        for (const [key, group] of Object.entries(SAAS_CAT_GROUP)) {
            if (lower === key || lower.includes(key)) return group;
        }
    }
    return 'Other';
}

// ─────────────────────────────────────────────────────────────────────────────
// SaaS — icon helpers
// ─────────────────────────────────────────────────────────────────────────────

const ICON_MAP = {
    wordpress: '🔵', nextcloud: '☁️', grafana: '📊', portainer: '🐳',
    'uptime-kuma': '📡', gitea: '🦁', vaultwarden: '🔐', jellyfin: '🎬',
    ghost: '👻', n8n: '🤖', nginx: '🌐', mysql: '🗄️', postgresql: '🐘',
    redis: '⚡', mongodb: '🍃', elasticsearch: '🔍', kibana: '📈',
    prometheus: '🔥', alertmanager: '🚨', minio: '🪣', postgres: '🐘',
    mariadb: '🐬', phpmyadmin: '🗄️', adminer: '🗄️', mailhog: '📧',
    keycloak: '🔑', traefik: '🔀', haproxy: '⚖️', caddy: '🔒',
    apache: '🪶', php: '🐘', python: '🐍', node: '💚', java: '☕',
    go: '🐹', rust: '🦀', ruby: '💎', perl: '🐪',
};

function SaasIcon({ template, size = 40, failed, onFail }) {
    const id = template.id || '';
    const icon = template.icon;
    const key = Object.keys(ICON_MAP).find(k => id.includes(k) || (template.name || '').toLowerCase().includes(k));
    const emoji = key ? ICON_MAP[key] : null;

    if (icon && !failed) {
        return <img src={icon} alt="" width={size} height={size}
            className="object-contain" onError={onFail} />;
    }
    if (emoji) {
        return <span style={{ fontSize: size * 0.6 }}>{emoji}</span>;
    }
    return <Package size={size * 0.6} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SaaS — Template Card
// ─────────────────────────────────────────────────────────────────────────────

const FEATURED_IDS = ['wordpress', 'nextcloud', 'grafana', 'portainer', 'uptime-kuma',
    'gitea', 'vaultwarden', 'jellyfin', 'ghost', 'n8n', 'nginx'];

function SaasCard({ template, onClick }) {
    const [iconFailed, setIconFailed] = useState(false);
    const isFeatured = template.featured || FEATURED_IDS.some(f => (template.id || '').includes(f));

    return (
        <div className="template-card-new" onClick={() => onClick(template)}>
            {isFeatured && (
                <div className="template-featured-badge">
                    <Star size={8} /> Hot
                </div>
            )}
            <div className="template-card-icon">
                <SaasIcon template={template} size={40}
                    failed={iconFailed} onFail={() => setIconFailed(true)} />
            </div>
            <div className="template-card-body">
                <h3 className="template-card-name">{template.name}</h3>
                <p className="template-card-desc">{template.description}</p>
                <div className="template-card-meta">
                    {template.version && (
                        <span className="template-version-badge">v{template.version}</span>
                    )}
                    {(template.categories || []).slice(0, 2).map(c => (
                        <span key={c} className="template-cat-badge capitalize">{c}</span>
                    ))}
                </div>
            </div>
            <ChevronRight size={14} className="template-card-arrow" />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaaS — Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────

function SaasDetailDrawer({ template, onClose, onInstall }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getTemplate(template.id).then(r => setDetail(r.template)).finally(() => setLoading(false));
    }, [template.id]);

    useEffect(() => {
        const fn = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [onClose]);

    const t = detail || template;

    return (
        <div className="template-drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="template-drawer">
                <div className="template-drawer-header">
                    <div className="flex items-center gap-3">
                        <div className="template-drawer-icon">
                            <SaasIcon template={t} size={48} failed={false} onFail={() => {}} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">{t.name}</h3>
                            {t.version && <p className="text-xs text-muted-foreground">v{t.version}</p>}
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
                </div>

                <div className="template-drawer-body">
                    {loading ? (
                        <div className="text-center text-muted-foreground text-sm py-8">Loading…</div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>

                            {/* Links */}
                            <div className="flex gap-2">
                                {t.documentation && (
                                    <a href={t.documentation} target="_blank" rel="noopener noreferrer"
                                        className="btn btn-ghost btn-sm flex items-center gap-1">
                                        <BookOpen size={12} /> Docs
                                    </a>
                                )}
                                {t.website && (
                                    <a href={t.website} target="_blank" rel="noopener noreferrer"
                                        className="btn btn-ghost btn-sm flex items-center gap-1">
                                        <Globe size={12} /> Website
                                    </a>
                                )}
                            </div>

                            {/* Categories */}
                            {t.categories?.length > 0 && (
                                <DrawerSection title="Categories" icon={<Tag size={12} />}>
                                    <div className="flex flex-wrap gap-1">
                                        {t.categories.map(c => (
                                            <span key={c} className="template-cat-badge capitalize">{c}</span>
                                        ))}
                                    </div>
                                </DrawerSection>
                            )}

                            {/* Variables */}
                            {t.variables?.filter(v => !v.hidden && !v.auto_generated).length > 0 && (
                                <DrawerSection title="Configuration" icon={<Settings2 size={12} />}>
                                    <div className="variables-list">
                                        {t.variables.filter(v => !v.hidden && !v.auto_generated).map(v => (
                                            <div key={v.name} className={`variable-item ${v.required ? 'required' : ''}`}>
                                                <div className="variable-header">
                                                    <span className="variable-name">{v.name}</span>
                                                    {v.required && <span className="required-badge">Required</span>}
                                                </div>
                                                {v.description && <p className="variable-description">{v.description}</p>}
                                                {v.default && <p className="variable-default">default: {v.default}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </DrawerSection>
                            )}

                            {/* Source */}
                            {t.source && (
                                <DrawerSection title="Source" icon={<Server size={12} />}>
                                    <span className="template-version-badge capitalize">{t.source}</span>
                                </DrawerSection>
                            )}
                        </div>
                    )}
                </div>

                <div className="template-drawer-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                    <button className="btn btn-primary flex items-center gap-1" onClick={() => onInstall(t)}>
                        <Download size={13} /> Deploy
                    </button>
                </div>
            </div>
        </div>
    );
}

function DrawerSection({ title, icon, children }) {
    return (
        <div className="detail-section">
            <h4>{icon}{title}</h4>
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaaS — Install Modal
// ─────────────────────────────────────────────────────────────────────────────

function SaasInstallModal({ template, onClose, onInstalled }) {
    const toast = useToast();
    const [appName, setAppName] = useState('');
    const [variables, setVariables] = useState({});
    const [installing, setInstalling] = useState(false);

    const userVars = (template.variables || []).filter(v => !v.auto_generated && !v.hidden);

    async function handleInstall() {
        if (!appName.trim()) { toast.error('App name is required'); return; }
        setInstalling(true);
        try {
            const result = await api.installTemplate(template.id, appName, variables);
            if (result.success) {
                toast.success(`${template.name} deployed as "${appName}"`);
                onInstalled();
            } else {
                toast.error(result.error || 'Deploy failed');
            }
        } catch (err) {
            toast.error(err.message || 'Deploy failed');
        } finally {
            setInstalling(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3>Deploy — {template.name}</h3>
                    <button className="modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="modal-body install-modal">
                    <div className="form-group">
                        <label>Application Name</label>
                        <input className="form-control w-full" value={appName}
                            onChange={e => setAppName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            placeholder="my-app" />
                        <p className="text-xs text-muted-foreground mt-1">Lowercase alphanumeric and hyphens</p>
                    </div>
                    {userVars.map(v => (
                        <div className="form-group" key={v.name}>
                            <label>{v.description || v.name}{v.required && ' *'}</label>
                            {v.options ? (
                                <select className="form-control w-full"
                                    value={variables[v.name] || ''}
                                    onChange={e => setVariables(prev => ({ ...prev, [v.name]: e.target.value }))}>
                                    <option value="">Select…</option>
                                    {v.options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ) : (
                                <input className="form-control w-full"
                                    value={variables[v.name] || ''}
                                    onChange={e => setVariables(prev => ({ ...prev, [v.name]: e.target.value }))}
                                    placeholder={v.default || ''} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleInstall} disabled={installing}>
                        {installing ? 'Deploying…' : 'Deploy'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaaS — Manage Tab
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_COMPOSE = `services:
  app:
    image: yourimage:latest
    ports:
      - "\${PORT}:80"
`;

function SaasManageTab() {
    const toast = useToast();
    const [localTemplates, setLocalTemplates] = useState([]);
    const [customCats, setCustomCats] = useState([]);
    const [newCat, setNewCat] = useState('');
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [loadingEdit, setLoadingEdit] = useState(null);
    const [page, setPage] = useState(1);

    async function reload() {
        try {
            const [tr, cr] = await Promise.all([api.listLocalTemplates(), api.getCustomCategories()]);
            setLocalTemplates(tr.templates || []);
            setCustomCats(cr.categories || []);
        } catch { toast.error('Failed to load'); }
    }

    async function handleEdit(t) {
        setLoadingEdit(t.id);
        try {
            const raw = await api.getLocalTemplateRaw(t.id);
            setEditing({ ...t, compose_yaml: raw.compose_yaml || '' });
        } catch {
            setEditing(t);
        } finally {
            setLoadingEdit(null);
        }
    }

    useEffect(() => { reload(); }, []);

    async function addCat() {
        if (!newCat.trim()) return;
        try { await api.addCustomCategory(newCat.trim()); setNewCat(''); reload(); }
        catch (err) { toast.error(err.message); }
    }

    async function removeCat(name) {
        try { await api.removeCustomCategory(name); reload(); }
        catch (err) { toast.error(err.message); }
    }

    async function deleteLocal(t) {
        if (!confirm(`Delete "${t.name}"?`)) return;
        try { await api.deleteLocalTemplate(t.id); toast.success('Deleted'); reload(); }
        catch (err) { toast.error(err.message); }
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Custom categories */}
            <div className="settings-card">
                <div className="settings-card__header">
                    <div className="settings-card__header-left">
                        <h3 className="text-sm font-semibold">Custom Categories</h3>
                    </div>
                </div>
                <div className="flex gap-2 mb-3">
                    <input className="form-control flex-1" value={newCat}
                        onChange={e => setNewCat(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCat()}
                        placeholder="e.g. monitoring" />
                    <button className="btn btn-primary btn-sm" onClick={addCat}><Plus size={13} /> Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {customCats.map(c => (
                        <div key={c} className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                            {c}
                            <button className="ml-1 text-muted-foreground hover:text-destructive"
                                onClick={() => removeCat(c)}><X size={11} /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Local templates */}
            <div className="settings-card">
                <div className="settings-card__header">
                    <div className="settings-card__header-left">
                        <h3 className="text-sm font-semibold">Local Templates</h3>
                    </div>
                    <button className="btn btn-primary btn-sm flex items-center gap-1"
                        onClick={() => setCreating(true)}>
                        <Plus size={13} /> New
                    </button>
                </div>
                {localTemplates.length === 0
                    ? <p className="text-xs text-muted-foreground">No local templates.</p>
                    : (
                        <div className="flex flex-col gap-2">
                            {localTemplates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(t => (
                                <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-md">
                                    <div>
                                        <p className="text-xs font-medium">{t.name}</p>
                                        <p className="text-xs text-muted-foreground">{t.id}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button className="btn btn-ghost btn-xs"
                                            onClick={() => handleEdit(t)}
                                            disabled={loadingEdit === t.id}>
                                            {loadingEdit === t.id
                                                ? <RefreshCw size={12} className="animate-spin" />
                                                : <Edit2 size={12} />}
                                        </button>
                                        <button className="btn btn-ghost btn-xs text-destructive"
                                            onClick={() => deleteLocal(t)}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <Paginator page={page} total={localTemplates.length} onPage={setPage} />
                        </div>
                    )
                }
            </div>

            {(creating || editing) && (
                <SaasTemplateEditor
                    initial={editing || null}
                    onClose={() => { setEditing(null); setCreating(false); }}
                    onSaved={() => { setEditing(null); setCreating(false); reload(); }}
                />
            )}
        </div>
    );
}

function SaasTemplateEditor({ initial, onClose, onSaved }) {
    const toast = useToast();
    const isNew = !initial;
    const [form, setForm] = useState({
        name: initial?.name || '',
        version: initial?.version || '1.0.0',
        description: initial?.description || '',
        categories: (initial?.categories || []).join(', '),
        featured: initial?.featured || false,
        compose_yaml: initial?.compose_yaml || DEFAULT_COMPOSE,
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    async function handleSave() {
        setSaving(true);
        const payload = {
            ...form,
            categories: form.categories.split(',').map(c => c.trim()).filter(Boolean),
            featured: form.featured,
        };
        try {
            if (isNew) {
                await api.createLocalTemplate(payload);
                toast.success('Template created');
            } else {
                await api.updateLocalTemplate(initial.id, payload);
                toast.success('Template updated');
            }
            onSaved();
        } catch (err) {
            toast.error(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal modal-lg">
                <div className="modal-header">
                    <h3>{isNew ? 'New Template' : `Edit — ${initial.name}`}</h3>
                    <button className="modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="modal-body">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="form-group mb-0">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                            <input className="form-control w-full" value={form.name}
                                onChange={e => set('name', e.target.value)} />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Version</label>
                            <input className="form-control w-full" value={form.version}
                                onChange={e => set('version', e.target.value)} />
                        </div>
                        <div className="form-group mb-0 col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                            <textarea className="form-control w-full" rows={2} value={form.description}
                                onChange={e => set('description', e.target.value)} />
                        </div>
                        <div className="form-group mb-0 col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Categories (comma-separated)</label>
                            <input className="form-control w-full" value={form.categories}
                                onChange={e => set('categories', e.target.value)} />
                        </div>
                        <div className="form-group mb-0 col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                                <FileCode2 size={12} /> Docker Compose YAML
                            </label>
                            <textarea className="form-control w-full font-mono text-xs" rows={12}
                                value={form.compose_yaml}
                                onChange={e => set('compose_yaml', e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="toggle-switch shrink-0">
                                <input type="checkbox" checked={form.featured}
                                    onChange={e => set('featured', e.target.checked)} />
                                <span className="toggle-slider" />
                            </label>
                            <span className="text-xs text-muted-foreground">Mark as featured</span>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaaS — Repositories Tab
// ─────────────────────────────────────────────────────────────────────────────

function SaasReposTab() {
    const toast = useToast();
    const [repos, setRepos] = useState([]);
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [syncing, setSyncing] = useState(false);

    async function reload() {
        try { const r = await api.listTemplateRepos(); setRepos(r.repositories || []); }
        catch { toast.error('Failed to load repos'); }
    }

    useEffect(() => { reload(); }, []);

    async function addRepo() {
        if (!newName.trim() || !newUrl.trim()) { toast.error('Name and URL required'); return; }
        try { await api.addTemplateRepo(newName, newUrl); setNewName(''); setNewUrl(''); reload(); }
        catch (err) { toast.error(err.message); }
    }

    async function removeRepo(url) {
        if (!confirm('Remove this repository?')) return;
        try { await api.removeTemplateRepo(url); reload(); }
        catch (err) { toast.error(err.message); }
    }

    async function syncAll() {
        setSyncing(true);
        try {
            const r = await api.syncTemplates();
            toast.success(`Synced ${r.synced || 0} template(s)`);
            if (r.errors?.length) r.errors.forEach(e => toast.warning(e));
        } catch (err) { toast.error(err.message); }
        finally { setSyncing(false); }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="settings-card">
                <div className="settings-card__header">
                    <div className="settings-card__header-left">
                        <h3 className="text-sm font-semibold">Template Repositories</h3>
                    </div>
                    <button className="btn btn-ghost btn-sm flex items-center gap-1"
                        onClick={syncAll} disabled={syncing}>
                        <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing…' : 'Sync All'}
                    </button>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                    {repos.length === 0
                        ? <p className="text-xs text-muted-foreground">No repositories configured.</p>
                        : repos.map(r => (
                            <div key={r.url} className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-md">
                                <div className="flex items-center gap-2 min-w-0">
                                    {r.built_in
                                        ? <Package size={12} className="text-primary shrink-0" />
                                        : r.enabled
                                            ? <CheckCircle2 size={12} className="text-success shrink-0" />
                                            : <AlertCircle size={12} className="text-muted-foreground shrink-0" />
                                    }
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium truncate flex items-center gap-1.5">
                                            {r.name}
                                            {r.built_in && (
                                                <span className="text-xs text-primary/70 font-normal">
                                                    {r.template_count != null ? `· ${r.template_count} templates` : '· built-in'}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-mono truncate">{r.url}</p>
                                    </div>
                                </div>
                                {!r.built_in && (
                                    <button className="btn btn-ghost btn-xs text-destructive shrink-0 ml-2"
                                        onClick={() => removeRepo(r.url)}><Trash2 size={12} /></button>
                                )}
                            </div>
                        ))
                    }
                </div>

                <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Add Repository</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <input className="form-control" value={newName}
                            onChange={e => setNewName(e.target.value)} placeholder="Repository name" />
                        <input className="form-control" value={newUrl}
                            onChange={e => setNewUrl(e.target.value)} placeholder="https://…" />
                    </div>
                    <button className="btn btn-primary btn-sm self-start flex items-center gap-1"
                        onClick={addRepo}>
                        <Plus size={13} /> Add Repository
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaaS — Browse Tab
// ─────────────────────────────────────────────────────────────────────────────

function SaasBrowseTab({ isAdmin }) {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [allTemplates, setAllTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('q') || '');
    const [activeGroup, setActiveGroup] = useState('');
    const [repoErrors, setRepoErrors] = useState([]);
    const [detail, setDetail] = useState(null);
    const [installing, setInstalling] = useState(null);
    const [page, setPage] = useState(1);

    const load = useCallback(async (q) => {
        try {
            const tr = await api.listTemplates(null, q || null);
            setAllTemplates(tr.templates || []);
            if (tr.repo_errors?.length) setRepoErrors(tr.repo_errors);
        } catch { toast.error('Failed to load templates'); }
        finally { setLoading(false); }
    }, [toast]);

    useEffect(() => { load(search); }, []);

    const groups = useMemo(() => {
        const seen = new Set();
        for (const t of allTemplates) {
            seen.add(getSaasGroup(t.categories || []));
        }
        return [...seen].sort();
    }, [allTemplates]);

    const visibleTemplates = useMemo(() => {
        if (!activeGroup) return allTemplates;
        return allTemplates.filter(t => getSaasGroup(t.categories || []) === activeGroup);
    }, [allTemplates, activeGroup]);

    function applySearch(q) {
        setSearch(q);
        setPage(1);
        const params = {};
        if (q) params.q = q;
        setSearchParams(params, { replace: true });
        load(q);
    }

    const pagedTemplates = useMemo(
        () => visibleTemplates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [visibleTemplates, page]
    );

    return (
        <div className="flex flex-col gap-5">
            {repoErrors.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="font-medium mb-0.5">Some remote repositories could not be reached</p>
                        {repoErrors.map((e, i) => <p key={i} className="opacity-80 font-mono break-all">{e}</p>)}
                    </div>
                    <button onClick={() => setRepoErrors([])}><X size={13} /></button>
                </div>
            )}

            {/* Search + group filters */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                            className="form-control w-full pl-9 pr-8"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applySearch(search)}
                            placeholder="Search applications…"
                        />
                        {search && (
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => applySearch('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button className={`category-btn ${!activeGroup ? 'active' : ''}`}
                        onClick={() => { setActiveGroup(''); setPage(1); }}>All</button>
                    {groups.map(g => (
                        <button key={g}
                            className={`category-btn ${activeGroup === g ? 'active' : ''}`}
                            onClick={() => { setActiveGroup(g); setPage(1); }}>
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center text-muted-foreground text-sm py-12">Loading templates…</div>
            ) : visibleTemplates.length === 0 ? (
                <div className="templates-empty-state">
                    <Package size={40} className="opacity-30" />
                    <p className="text-sm font-medium">No templates found</p>
                    {(search || activeGroup) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { applySearch(''); setActiveGroup(''); }}>
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="templates-grid">
                        {pagedTemplates.map(t => (
                            <SaasCard key={t.id} template={t} onClick={setDetail} />
                        ))}
                    </div>
                    <Paginator page={page} total={visibleTemplates.length} onPage={setPage} />
                </>
            )}

            {detail && (
                <SaasDetailDrawer
                    template={detail}
                    onClose={() => setDetail(null)}
                    onInstall={(t) => { setDetail(null); setInstalling(t); }}
                />
            )}
            {installing && (
                <SaasInstallModal
                    template={installing}
                    onClose={() => setInstalling(null)}
                    onInstalled={() => setInstalling(null)}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaaS — Root component
// ─────────────────────────────────────────────────────────────────────────────

function SaasTemplates({ isAdmin }) {
    const [tab, setTab] = useState('browse');

    return (
        <div className="page-container templates-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">App Templates</h1>
                    <p className="page-description text-sm text-muted-foreground mt-1">
                        One-click deployment for popular self-hosted applications
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-1 border-b border-border mb-5">
                {[
                    { id: 'browse',       label: 'Browse',       icon: LayoutGrid },
                    ...(isAdmin ? [
                        { id: 'manage',   label: 'Manage',       icon: Wrench },
                        { id: 'repos',    label: 'Repositories', icon: Globe },
                    ] : []),
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={[
                            'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                            tab === id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        ].join(' ')}
                    >
                        <Icon size={14} /> {label}
                    </button>
                ))}
            </div>

            {tab === 'browse' && <SaasBrowseTab isAdmin={isAdmin} />}
            {tab === 'manage' && isAdmin && <SaasManageTab />}
            {tab === 'repos'  && isAdmin && <SaasReposTab />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — platform mode switcher
// ─────────────────────────────────────────────────────────────────────────────

export default function Templates() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [platformMode, setPlatformMode] = useState(null);

    useEffect(() => {
        api.getSystemSettings()
            .then(s => setPlatformMode(s.platform_mode || 'saas'))
            .catch(() => setPlatformMode('saas'));
    }, []);

    if (!platformMode) {
        return (
            <div className="page-container flex items-center justify-center" style={{ minHeight: '40vh' }}>
                <p className="text-muted-foreground text-sm">Loading…</p>
            </div>
        );
    }

    if (platformMode === 'waas') return <WaasTemplates isAdmin={isAdmin} />;
    return <SaasTemplates isAdmin={isAdmin} />;
}
