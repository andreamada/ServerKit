import React, { useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const SetupStepConfig = ({ onComplete }) => {
    const toast = useToast();
    const [defaultDomain, setDefaultDomain] = useState('');
    const [licenseKey, setLicenseKey] = useState('');
    const [saving, setSaving] = useState(false);

    async function handleContinue() {
        setSaving(true);
        try {
            if (defaultDomain.trim() || licenseKey.trim()) {
                await api.updateSystemSettings({
                    default_domain: defaultDomain.trim(),
                    license_key: licenseKey.trim(),
                });
            }
            onComplete({ defaultDomain: defaultDomain.trim(), licenseKey: licenseKey.trim() });
        } catch (err) {
            toast.error(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="wizard-step">
            <h2 className="wizard-step-title">Site Configuration</h2>
            <p className="wizard-step-description">
                Optionally set your default domain and license key. You can update these later in Settings.
            </p>

            <div className="flex flex-col gap-3 mb-6">
                <div className="form-group mb-0">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Default Domain
                    </label>
                    <input
                        type="text"
                        className="form-control w-full"
                        value={defaultDomain}
                        onChange={e => setDefaultDomain(e.target.value)}
                        placeholder="panel.example.com"
                        disabled={saving}
                    />
                    <span className="form-hint text-xs text-muted-foreground mt-1 block">
                        The primary domain used for your panel and new deployments.
                    </span>
                </div>

                <div className="form-group mb-0">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        License Key
                    </label>
                    <input
                        type="text"
                        className="form-control w-full"
                        value={licenseKey}
                        onChange={e => setLicenseKey(e.target.value)}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        disabled={saving}
                    />
                    <span className="form-hint text-xs text-muted-foreground mt-1 block">
                        Your ServerKit license key, if applicable.
                    </span>
                </div>
            </div>

            <div className="wizard-nav" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                <button className="btn-wizard-next" onClick={handleContinue} disabled={saving}>
                    {saving ? 'Saving…' : 'Continue'}
                </button>
            </div>
        </div>
    );
};

export default SetupStepConfig;
