import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const SiteSettingsTab = ({ onDevModeChange }) => {
    const toast = useToast();
    const [settings, setSettings] = useState({
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
        <div className="settings-section">
            <div className="section-header-with-actions">
                <div>
                    <h2>Site Settings</h2>
                    <p className="section-description">Configure global site settings</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSaveSettings}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            <div className="settings-card">
                <h3>User Registration</h3>
                <p>Allow new users to create accounts on the login page.</p>

                <div className="form-group">
                    <label className="toggle-switch-label">
                        <span>Enable public registration</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.registration_enabled}
                                onChange={(e) => handleFieldChange('registration_enabled', e.target.checked)}
                                disabled={saving}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </label>
                    <span className="form-help">
                        When disabled, only administrators can create new user accounts.
                    </span>
                </div>
            </div>

            <div className="settings-card">
                <h3>Developer Mode</h3>
                <p>Enable developer tools and diagnostics.</p>

                <div className="form-group">
                    <label className="toggle-switch-label">
                        <span>Enable developer mode</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.dev_mode}
                                onChange={(e) => handleFieldChange('dev_mode', e.target.checked)}
                                disabled={saving}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </label>
                    <span className="form-help">
                        Enables the Developer tab with icon reference and diagnostic tools.
                    </span>
                </div>
            </div>

            <div className="settings-card">
                <h3>Company Information</h3>
                <p>Configure company details and business information</p>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Default Currency</label>
                        <select
                            value={settings.company_currency}
                            onChange={(e) => handleFieldChange('company_currency', e.target.value)}
                            disabled={saving}
                            className="form-control"
                        >
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Company Name</label>
                        <input
                            type="text"
                            value={settings.company_name}
                            onChange={(e) => handleFieldChange('company_name', e.target.value)}
                            disabled={saving}
                            className="form-control"
                            placeholder="Your Company Ltd."
                        />
                    </div>

                    <div className="form-group">
                        <label>Company Email</label>
                        <input
                            type="email"
                            value={settings.company_email}
                            onChange={(e) => handleFieldChange('company_email', e.target.value)}
                            disabled={saving}
                            className="form-control"
                            placeholder="billing@company.com"
                        />
                    </div>

                    <div className="form-group">
                        <label>Company Phone</label>
                        <input
                            type="text"
                            value={settings.company_phone}
                            onChange={(e) => handleFieldChange('company_phone', e.target.value)}
                            disabled={saving}
                            className="form-control"
                            placeholder="+1 234 567 890"
                        />
                    </div>

                    <div className="form-group full-width">
                        <label>Company Address</label>
                        <input
                            type="text"
                            value={settings.company_address}
                            onChange={(e) => handleFieldChange('company_address', e.target.value)}
                            disabled={saving}
                            className="form-control"
                            placeholder="123 Business St, Suite 100"
                        />
                    </div>

                    <div className="form-group">
                        <label>City</label>
                        <input
                            type="text"
                            value={settings.company_city}
                            onChange={(e) => handleFieldChange('company_city', e.target.value)}
                            disabled={saving}
                            className="form-control"
                            placeholder="New York"
                        />
                    </div>

                    <div className="form-group">
                        <label>VAT / Tax ID</label>
                        <input
                            type="text"
                            value={settings.company_vat_id}
                            onChange={(e) => handleFieldChange('company_vat_id', e.target.value)}
                            disabled={saving}
                            className="form-control"
                            placeholder="US123456789"
                        />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <h3>Tax Management</h3>
                <p>Configure tax settings for your services</p>

                <div className="form-group">
                    <label className="toggle-switch-label">
                        <span>Enable Tax Management</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.tax_enabled}
                                onChange={(e) => handleFieldChange('tax_enabled', e.target.checked)}
                                disabled={saving}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </label>
                </div>

                {settings.tax_enabled && (
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Tax Name</label>
                            <input
                                type="text"
                                value={settings.tax_name}
                                onChange={(e) => handleFieldChange('tax_name', e.target.value)}
                                disabled={saving}
                                className="form-control"
                                placeholder="VAT, GST, etc."
                            />
                        </div>

                        <div className="form-group">
                            <label>Tax Amount (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={settings.tax_amount}
                                onChange={(e) => handleFieldChange('tax_amount', e.target.value)}
                                disabled={saving}
                                className="form-control"
                                placeholder="20"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="section-footer-actions">
                <button
                    className="btn btn-primary"
                    onClick={handleSaveSettings}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

export default SiteSettingsTab;
