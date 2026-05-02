import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const DEFAULT = {
    gdpr_retention_logs: 2555,
    gdpr_retention_user_data: 730,
    gdpr_retention_audit_logs: 90,
    gdpr_retention_backups: 365,
    gdpr_retention_sessions: 7,
    gdpr_grace_period_days: 7,
    gdpr_export_cooldown_hours: 24,
    gdpr_cookie_consent: false,
    gdpr_allow_export: true,
    gdpr_allow_deletion: false,
};

const PrivacyGdprTab = () => {
    const toast = useToast();
    const [settings, setSettings] = useState(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const data = await api.getSystemSettings();
            setSettings({
                gdpr_retention_logs: data.gdpr_retention_logs != null ? Number(data.gdpr_retention_logs) : DEFAULT.gdpr_retention_logs,
                gdpr_retention_user_data: data.gdpr_retention_user_data != null ? Number(data.gdpr_retention_user_data) : DEFAULT.gdpr_retention_user_data,
                gdpr_retention_audit_logs: data.gdpr_retention_audit_logs != null ? Number(data.gdpr_retention_audit_logs) : DEFAULT.gdpr_retention_audit_logs,
                gdpr_retention_backups: data.gdpr_retention_backups != null ? Number(data.gdpr_retention_backups) : DEFAULT.gdpr_retention_backups,
                gdpr_retention_sessions: data.gdpr_retention_sessions != null ? Number(data.gdpr_retention_sessions) : DEFAULT.gdpr_retention_sessions,
                gdpr_grace_period_days: data.gdpr_grace_period_days != null ? Number(data.gdpr_grace_period_days) : DEFAULT.gdpr_grace_period_days,
                gdpr_export_cooldown_hours: data.gdpr_export_cooldown_hours != null ? Number(data.gdpr_export_cooldown_hours) : DEFAULT.gdpr_export_cooldown_hours,
                gdpr_cookie_consent: data.gdpr_cookie_consent || false,
                gdpr_allow_export: data.gdpr_allow_export !== undefined ? data.gdpr_allow_export : DEFAULT.gdpr_allow_export,
                gdpr_allow_deletion: data.gdpr_allow_deletion || false,
            });
        } catch (err) {
            console.error('Failed to load GDPR settings:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await api.updateSystemSettings(settings);
            toast.success('Privacy settings saved successfully');
        } catch (err) {
            toast.error(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));
    const setInt = (key, raw, min = 1) => set(key, Math.max(min, parseInt(raw, 10) || min));

    if (loading) {
        return <div className="settings-section"><p>Loading...</p></div>;
    }

    return (
        <div className="flex flex-col gap-5">

            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Privacy &amp; GDPR</h2>
                <p className="text-sm text-muted-foreground">Configure data retention, consent, and user rights.</p>
            </div>

            {/* Data Retention */}
            <div className="settings-card">
                <h3 className="text-sm font-semibold text-foreground mb-1">Data Retention</h3>
                <p className="text-xs text-muted-foreground mb-4">Configure how long different types of data are retained.</p>

                <div className="grid grid-cols-2 gap-3">
                    <RetentionField
                        label="Server Logs"
                        value={settings.gdpr_retention_logs}
                        unit="days"
                        hint="Minimum 365 days for legal compliance"
                        min={365}
                        disabled={saving}
                        onChange={v => setInt('gdpr_retention_logs', v, 365)}
                    />
                    <RetentionField
                        label="User Account Data"
                        value={settings.gdpr_retention_user_data}
                        unit="days"
                        min={1}
                        disabled={saving}
                        onChange={v => setInt('gdpr_retention_user_data', v)}
                    />
                    <RetentionField
                        label="Audit Logs"
                        value={settings.gdpr_retention_audit_logs}
                        unit="days"
                        min={1}
                        disabled={saving}
                        onChange={v => setInt('gdpr_retention_audit_logs', v)}
                    />
                    <RetentionField
                        label="Backup Data"
                        value={settings.gdpr_retention_backups}
                        unit="days"
                        min={1}
                        disabled={saving}
                        onChange={v => setInt('gdpr_retention_backups', v)}
                    />
                    <RetentionField
                        label="Session Data"
                        value={settings.gdpr_retention_sessions}
                        unit="days"
                        min={1}
                        disabled={saving}
                        onChange={v => setInt('gdpr_retention_sessions', v)}
                    />
                </div>
            </div>

            {/* Grace Periods & Rate Limits */}
            <div className="settings-card">
                <h3 className="text-sm font-semibold text-foreground mb-1">Grace Periods &amp; Rate Limits</h3>
                <p className="text-xs text-muted-foreground mb-4">Control deletion windows and request throttling.</p>

                <div className="grid grid-cols-2 gap-3">
                    <RetentionField
                        label="Deletion Grace Period"
                        value={settings.gdpr_grace_period_days}
                        unit="days"
                        hint="Users can cancel deletion during this period"
                        min={1}
                        disabled={saving}
                        onChange={v => setInt('gdpr_grace_period_days', v)}
                    />
                    <RetentionField
                        label="Export Request Cooldown"
                        value={settings.gdpr_export_cooldown_hours}
                        unit="hours"
                        hint="Minimum time between data export requests"
                        min={1}
                        disabled={saving}
                        onChange={v => setInt('gdpr_export_cooldown_hours', v)}
                    />
                </div>
            </div>

            {/* Privacy Features */}
            <div className="settings-card">
                <h3 className="text-sm font-semibold text-foreground mb-3">Privacy Features</h3>
                <div className="flex flex-col gap-2">
                    <ToggleRow
                        label="Cookie Consent Banner"
                        desc="Show cookie consent banner to visitors"
                        checked={settings.gdpr_cookie_consent}
                        disabled={saving}
                        onChange={v => set('gdpr_cookie_consent', v)}
                    />
                    <ToggleRow
                        label="Data Export"
                        desc="Allow users to export their personal data"
                        checked={settings.gdpr_allow_export}
                        disabled={saving}
                        onChange={v => set('gdpr_allow_export', v)}
                    />
                    <ToggleRow
                        label="Account Deletion"
                        desc="Allow users to delete their own accounts"
                        checked={settings.gdpr_allow_deletion}
                        disabled={saving}
                        onChange={v => set('gdpr_allow_deletion', v)}
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

function RetentionField({ label, value, unit, hint, min = 1, disabled, onChange }) {
    return (
        <div className="form-group mb-0">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min={min}
                    className="form-control w-28"
                    value={value}
                    disabled={disabled}
                    onChange={e => onChange(e.target.value)}
                />
                <span className="text-xs text-muted-foreground shrink-0">{unit}</span>
            </div>
            {hint && <p className="mt-1 text-[11px] text-muted-foreground opacity-70">{hint}</p>}
        </div>
    );
}

function ToggleRow({ label, desc, checked, disabled, onChange }) {
    return (
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <label className="toggle-switch ml-4 shrink-0">
                <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={e => onChange(e.target.checked)}
                />
                <span className="toggle-slider" />
            </label>
        </div>
    );
}

export default PrivacyGdprTab;
