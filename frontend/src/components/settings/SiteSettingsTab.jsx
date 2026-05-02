import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const SiteSettingsTab = ({ onDevModeChange }) => {
    const toast = useToast();
    const [settings, setSettings] = useState({
        platform_mode: 'saas',
        default_domain: '',
        license_key: '',
        default_language: 'en',
        session_timeout_minutes: 120,
        registration_enabled: false,
        dev_mode: false,
        company_currency: 'USD',
        company_name: '',
        company_address: '',
        company_city: '',
        company_phone: '',
        company_email: '',
        company_vat_id: '',
        tax_enabled: false,
        tax_name: 'VAT',
        tax_amount: '0'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const data = await api.getSystemSettings();
            setSettings({
                platform_mode: data.platform_mode || 'saas',
                default_domain: data.default_domain || '',
                license_key: data.license_key || '',
                default_language: data.default_language || 'en',
                session_timeout_minutes: data.session_timeout_minutes != null ? Number(data.session_timeout_minutes) : 120,
                registration_enabled: data.registration_enabled || false,
                dev_mode: data.dev_mode || false,
                company_currency: data.company_currency || 'USD',
                company_name: data.company_name || '',
                company_address: data.company_address || '',
                company_city: data.company_city || '',
                company_phone: data.company_phone || '',
                company_email: data.company_email || '',
                company_vat_id: data.company_vat_id || '',
                tax_enabled: data.tax_enabled || false,
                tax_name: data.tax_name || 'VAT',
                tax_amount: data.tax_amount || '0'
            });
        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveSettings() {
        setSaving(true);

        try {
            await api.updateSystemSettings(settings);
            toast.success('Settings saved successfully');
            if (onDevModeChange) {
                onDevModeChange(settings.dev_mode);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    const handleFieldChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'it', name: 'Italiano' },
        { code: 'de', name: 'Deutsch' },
        { code: 'fr', name: 'Français' },
        { code: 'es', name: 'Español' },
    ];

    const currencies = [
        { code: 'USD', name: 'US Dollar ($)' },
        { code: 'EUR', name: 'Euro (€)' },
        { code: 'GBP', name: 'British Pound (£)' },
        { code: 'JPY', name: 'Japanese Yen (¥)' },
        { code: 'CAD', name: 'Canadian Dollar (C$)' },
        { code: 'AUD', name: 'Australian Dollar (A$)' },
        { code: 'CHF', name: 'Swiss Franc (Fr)' },
        { code: 'CNY', name: 'Chinese Yuan (¥)' },
        { code: 'INR', name: 'Indian Rupee (₹)' },
        { code: 'BRL', name: 'Brazilian Real (R$)' },
    ];

    if (loading) {
        return <div className="settings-section"><p>Loading...</p></div>;
    }

    return (
        <div className="flex flex-col gap-5">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Site Settings</h2>
                <p className="text-sm text-muted-foreground">Configure global site settings.</p>
            </div>

            {/* Platform Mode */}
            <div className="settings-card">
                <h3 className="text-sm font-semibold text-foreground mb-1">Platform Mode</h3>
                <p className="text-xs text-muted-foreground mb-3">
                    Choose how the Templates page works. You can change this at any time.
                </p>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        {
                            value: 'saas',
                            label: 'SaaS',
                            title: 'Software as a Service',
                            desc: 'Offer hosted software applications (Docker apps, databases, etc.) to your customers.'
                        },
                        {
                            value: 'waas',
                            label: 'WaaS',
                            title: 'Website as a Service',
                            desc: 'Offer managed WordPress websites with design templates, preview, and one-click deploy.'
                        }
                    ].map(({ value, label, title, desc }) => (
                        <button
                            key={value}
                            type="button"
                            disabled={saving}
                            onClick={() => handleFieldChange('platform_mode', value)}
                            className={[
                                'flex flex-col items-start gap-1 rounded-md border px-3 py-3 text-left transition-all',
                                settings.platform_mode === value
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-muted-foreground'
                            ].join(' ')}
                        >
                            <div className="flex items-center gap-2 w-full">
                                <span className={[
                                    'text-xs font-bold px-1.5 py-0.5 rounded',
                                    settings.platform_mode === value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                ].join(' ')}>{label}</span>
                                <span className="text-xs font-semibold text-foreground">{title}</span>
                                {settings.platform_mode === value && (
                                    <span className="ml-auto text-xs text-primary font-medium">Active</span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* General toggles */}
            <div className="settings-card">
                <h3 className="text-sm font-semibold text-foreground mb-3">General</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <div>
                            <p className="text-xs font-medium text-foreground">Public Registration</p>
                            <p className="text-xs text-muted-foreground">Allow new users to self-register.</p>
                        </div>
                        <label className="toggle-switch ml-4 shrink-0">
                            <input type="checkbox" checked={settings.registration_enabled}
                                onChange={(e) => handleFieldChange('registration_enabled', e.target.checked)}
                                disabled={saving} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <div>
                            <p className="text-xs font-medium text-foreground">Developer Mode</p>
                            <p className="text-xs text-muted-foreground">Enable diagnostics &amp; icon reference.</p>
                        </div>
                        <label className="toggle-switch ml-4 shrink-0">
                            <input type="checkbox" checked={settings.dev_mode}
                                onChange={(e) => handleFieldChange('dev_mode', e.target.checked)}
                                disabled={saving} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Site Configuration */}
            <div className="settings-card">
                <h3 className="text-sm font-semibold text-foreground mb-3">Site Configuration</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Default Domain</label>
                        <input type="text" className="form-control w-full"
                            value={settings.default_domain} disabled={saving}
                            onChange={(e) => handleFieldChange('default_domain', e.target.value)}
                            placeholder="panel.example.com" />
                    </div>
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">License Key</label>
                        <input type="text" className="form-control w-full"
                            value={settings.license_key} disabled={saving}
                            onChange={(e) => handleFieldChange('license_key', e.target.value)}
                            placeholder="XXXX-XXXX-XXXX-XXXX" />
                    </div>
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Default Language</label>
                        <select value={settings.default_language}
                            onChange={(e) => handleFieldChange('default_language', e.target.value)}
                            disabled={saving} className="form-control w-full">
                            {languages.map(l => (
                                <option key={l.code} value={l.code}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Session Timeout (minutes)</label>
                        <input type="number" min="1" max="10080" className="form-control w-full"
                            value={settings.session_timeout_minutes} disabled={saving}
                            onChange={(e) => handleFieldChange('session_timeout_minutes', parseInt(e.target.value, 10) || 120)}
                            placeholder="120" />
                    </div>
                </div>
            </div>

            {/* Company info */}
            <div className="settings-card">
                <h3 className="text-sm font-semibold text-foreground mb-3">Company Information</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Currency</label>
                        <select value={settings.company_currency}
                            onChange={(e) => handleFieldChange('company_currency', e.target.value)}
                            disabled={saving} className="form-control w-full">
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Company Name</label>
                        <input type="text" className="form-control w-full"
                            value={settings.company_name} disabled={saving}
                            onChange={(e) => handleFieldChange('company_name', e.target.value)}
                            placeholder="Your Company Ltd." />
                    </div>
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                        <input type="email" className="form-control w-full"
                            value={settings.company_email} disabled={saving}
                            onChange={(e) => handleFieldChange('company_email', e.target.value)}
                            placeholder="billing@company.com" />
                    </div>
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                        <input type="text" className="form-control w-full"
                            value={settings.company_phone} disabled={saving}
                            onChange={(e) => handleFieldChange('company_phone', e.target.value)}
                            placeholder="+1 234 567 890" />
                    </div>
                    <div className="form-group mb-0 col-span-2">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
                        <input type="text" className="form-control w-full"
                            value={settings.company_address} disabled={saving}
                            onChange={(e) => handleFieldChange('company_address', e.target.value)}
                            placeholder="123 Business St, Suite 100" />
                    </div>
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
                        <input type="text" className="form-control w-full"
                            value={settings.company_city} disabled={saving}
                            onChange={(e) => handleFieldChange('company_city', e.target.value)}
                            placeholder="New York" />
                    </div>
                    <div className="form-group mb-0">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">VAT / Tax ID</label>
                        <input type="text" className="form-control w-full"
                            value={settings.company_vat_id} disabled={saving}
                            onChange={(e) => handleFieldChange('company_vat_id', e.target.value)}
                            placeholder="US123456789" />
                    </div>
                </div>
            </div>

            {/* Tax */}
            <div className="settings-card">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Tax Management</h3>
                    <label className="toggle-switch shrink-0">
                        <input type="checkbox" checked={settings.tax_enabled}
                            onChange={(e) => handleFieldChange('tax_enabled', e.target.checked)}
                            disabled={saving} />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                {settings.tax_enabled && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="form-group mb-0">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tax Name</label>
                            <input type="text" className="form-control w-full"
                                value={settings.tax_name} disabled={saving}
                                onChange={(e) => handleFieldChange('tax_name', e.target.value)}
                                placeholder="VAT, GST, etc." />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tax Amount (%)</label>
                            <input type="number" step="0.01" className="form-control w-full"
                                value={settings.tax_amount} disabled={saving}
                                onChange={(e) => handleFieldChange('tax_amount', e.target.value)}
                                placeholder="20" />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

export default SiteSettingsTab;
