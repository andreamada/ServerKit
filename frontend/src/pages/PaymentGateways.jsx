import React, { useState, useEffect } from 'react';
import { Copy, Check, Landmark, CreditCard, Wallet } from 'lucide-react';
import { Separator } from '../components/ui/separator';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

const BANK_INSTRUCTIONS_PLACEHOLDER = `Bank Name: Your Bank
Account Name: Your Company
Account Number: 1234567890
Routing Number: 123456789

Please use your email address as the payment reference.`;

const DEFAULT = {
    payment_bank_enabled: false,
    payment_bank_instructions: '',
    payment_paypal_enabled: false,
    payment_paypal_client_id: '',
    payment_paypal_client_secret: '',
    payment_paypal_webhook_id: '',
    payment_paypal_sandbox: true,
    payment_stripe_enabled: false,
    payment_stripe_secret_key: '',
    payment_stripe_webhook_secret: '',
    payment_tap_enabled: false,
    payment_tap_environment: 'sandbox',
    payment_tap_merchant_id: '',
    payment_tap_test_public_key: '',
    payment_tap_test_secret_key: '',
};

function CopyableUrl({ url }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
            <code className="flex-1 text-xs text-foreground font-mono truncate">{url}</code>
            <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title="Copy URL"
            >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
        </div>
    );
}

function GatewayCard({ title, icon: Icon, enabled, onToggle, saving, children }) {
    return (
        <div className="settings-card">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                </div>
                <label className="toggle-switch shrink-0">
                    <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)} disabled={saving} />
                    <span className="toggle-slider" />
                </label>
            </div>
            {enabled && (
                <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
                    {children}
                </div>
            )}
        </div>
    );
}

function Field({ label, hint, children }) {
    return (
        <div className="form-group mb-0">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
            {children}
            {hint && <p className="mt-1 text-[11px] text-muted-foreground opacity-70">{hint}</p>}
        </div>
    );
}

const PaymentGateways = () => {
    const toast = useToast();
    const [settings, setSettings] = useState(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);

    const origin = window.location.origin;

    useEffect(() => {
        api.getSystemSettings().then(data => {
            setSettings({
                payment_bank_enabled: data.payment_bank_enabled || false,
                payment_bank_instructions: data.payment_bank_instructions || '',
                payment_paypal_enabled: data.payment_paypal_enabled || false,
                payment_paypal_client_id: data.payment_paypal_client_id || '',
                payment_paypal_client_secret: data.payment_paypal_client_secret || '',
                payment_paypal_webhook_id: data.payment_paypal_webhook_id || '',
                payment_paypal_sandbox: data.payment_paypal_sandbox !== undefined ? data.payment_paypal_sandbox : true,
                payment_stripe_enabled: data.payment_stripe_enabled || false,
                payment_stripe_secret_key: data.payment_stripe_secret_key || '',
                payment_stripe_webhook_secret: data.payment_stripe_webhook_secret || '',
                payment_tap_enabled: data.payment_tap_enabled || false,
                payment_tap_environment: data.payment_tap_environment || 'sandbox',
                payment_tap_merchant_id: data.payment_tap_merchant_id || '',
                payment_tap_test_public_key: data.payment_tap_test_public_key || '',
                payment_tap_test_secret_key: data.payment_tap_test_secret_key || '',
            });
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

    async function saveGateway(prefix) {
        setSaving(prefix);
        try {
            const keys = Object.keys(settings).filter(k => k.startsWith(`payment_${prefix}`));
            const patch = Object.fromEntries(keys.map(k => [k, settings[k]]));
            await api.updateSystemSettings(patch);
            toast.success('Gateway settings saved');
        } catch (err) {
            toast.error(err.message || 'Failed to save settings');
        } finally {
            setSaving(null);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Payment Gateways</h1>
                    <p className="text-sm text-muted-foreground">Configure payment providers and gateway credentials.</p>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Payment Gateways</h1>
                <p className="text-sm text-muted-foreground">Configure payment providers and gateway credentials.</p>
            </div>
            <Separator />

            <div className="flex flex-col gap-4">

                {/* Bank Transfer */}
                <GatewayCard
                    title="Bank Transfer"
                    icon={Landmark}
                    enabled={settings.payment_bank_enabled}
                    onToggle={v => set('payment_bank_enabled', v)}
                    saving={saving === 'bank'}
                >
                    <Field
                        label="Payment Instructions"
                        hint="These instructions will be displayed to users when they select bank transfer. Include all necessary bank details and any reference requirements."
                    >
                        <textarea
                            className="form-control font-mono text-xs"
                            rows={7}
                            value={settings.payment_bank_instructions}
                            onChange={e => set('payment_bank_instructions', e.target.value)}
                            placeholder={BANK_INSTRUCTIONS_PLACEHOLDER}
                            disabled={saving === 'bank'}
                        />
                    </Field>
                    <div className="flex justify-end">
                        <button className="btn btn-primary btn-sm" onClick={() => saveGateway('bank')} disabled={saving === 'bank'}>
                            {saving === 'bank' ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </GatewayCard>

                {/* PayPal */}
                <GatewayCard
                    title="PayPal"
                    icon={Wallet}
                    enabled={settings.payment_paypal_enabled}
                    onToggle={v => set('payment_paypal_enabled', v)}
                    saving={saving === 'paypal'}
                >
                    <Field label="Webhook URL">
                        <CopyableUrl url={`${origin}/payment-gateways/paypal/webhook`} />
                        <p className="mt-1 text-[11px] text-muted-foreground opacity-70">Copy this URL and paste it in your PayPal dashboard webhook settings.</p>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="PayPal Client ID" hint="Found in your PayPal Developer Dashboard under your app credentials.">
                            <input
                                className="form-control"
                                type="text"
                                value={settings.payment_paypal_client_id}
                                onChange={e => set('payment_paypal_client_id', e.target.value)}
                                placeholder="Your PayPal Client ID"
                                disabled={saving === 'paypal'}
                            />
                        </Field>
                        <Field label="PayPal Client Secret" hint="Found in your PayPal Developer Dashboard under your app credentials.">
                            <input
                                className="form-control"
                                type="password"
                                value={settings.payment_paypal_client_secret}
                                onChange={e => set('payment_paypal_client_secret', e.target.value)}
                                placeholder="Your PayPal Client Secret"
                                disabled={saving === 'paypal'}
                            />
                        </Field>
                    </div>
                    <Field label="PayPal Webhook ID" hint="Create a webhook endpoint in your PayPal dashboard with the URL above.">
                        <input
                            className="form-control"
                            type="text"
                            value={settings.payment_paypal_webhook_id}
                            onChange={e => set('payment_paypal_webhook_id', e.target.value)}
                            placeholder="Your PayPal Webhook ID"
                            disabled={saving === 'paypal'}
                        />
                    </Field>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <div>
                            <p className="text-xs font-medium text-foreground">Sandbox Mode</p>
                            <p className="text-[11px] text-muted-foreground opacity-70">Enable for testing with PayPal sandbox environment. Disable for production.</p>
                        </div>
                        <label className="toggle-switch ml-4 shrink-0">
                            <input
                                type="checkbox"
                                checked={settings.payment_paypal_sandbox}
                                onChange={e => set('payment_paypal_sandbox', e.target.checked)}
                                disabled={saving === 'paypal'}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                    <div className="flex justify-end">
                        <button className="btn btn-primary btn-sm" onClick={() => saveGateway('paypal')} disabled={saving === 'paypal'}>
                            {saving === 'paypal' ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </GatewayCard>

                {/* Stripe */}
                <GatewayCard
                    title="Stripe"
                    icon={CreditCard}
                    enabled={settings.payment_stripe_enabled}
                    onToggle={v => set('payment_stripe_enabled', v)}
                    saving={saving === 'stripe'}
                >
                    <Field label="Webhook URL">
                        <CopyableUrl url={`${origin}/payment-gateways/stripe/webhook`} />
                        <p className="mt-1 text-[11px] text-muted-foreground opacity-70">Copy this URL and paste it in your Stripe dashboard webhook settings.</p>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Secret Key" hint="Found in your Stripe Dashboard under Developers > API keys.">
                            <input
                                className="form-control font-mono text-xs"
                                type="password"
                                value={settings.payment_stripe_secret_key}
                                onChange={e => set('payment_stripe_secret_key', e.target.value)}
                                placeholder="sk_live_..."
                                disabled={saving === 'stripe'}
                            />
                        </Field>
                        <Field label="Webhook Signing Secret" hint="Create a webhook endpoint in your Stripe dashboard with the URL above.">
                            <input
                                className="form-control font-mono text-xs"
                                type="password"
                                value={settings.payment_stripe_webhook_secret}
                                onChange={e => set('payment_stripe_webhook_secret', e.target.value)}
                                placeholder="whsec_..."
                                disabled={saving === 'stripe'}
                            />
                        </Field>
                    </div>
                    <div className="flex justify-end">
                        <button className="btn btn-primary btn-sm" onClick={() => saveGateway('stripe')} disabled={saving === 'stripe'}>
                            {saving === 'stripe' ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </GatewayCard>

                {/* Tap Payment */}
                <GatewayCard
                    title="Tap Payment"
                    icon={CreditCard}
                    enabled={settings.payment_tap_enabled}
                    onToggle={v => set('payment_tap_enabled', v)}
                    saving={saving === 'tap'}
                >
                    <Field label="Environment Mode">
                        <select
                            className="form-control"
                            value={settings.payment_tap_environment}
                            onChange={e => set('payment_tap_environment', e.target.value)}
                            disabled={saving === 'tap'}
                        >
                            <option value="sandbox">Sandbox (Testing)</option>
                            <option value="production">Production</option>
                        </select>
                    </Field>
                    <Field label="Merchant ID" hint="Enter your Tap Merchant ID (if applicable)">
                        <input
                            className="form-control"
                            type="text"
                            value={settings.payment_tap_merchant_id}
                            onChange={e => set('payment_tap_merchant_id', e.target.value)}
                            placeholder="Enter your Tap Merchant ID"
                            disabled={saving === 'tap'}
                        />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Test Public Key">
                            <input
                                className="form-control font-mono text-xs"
                                type="text"
                                value={settings.payment_tap_test_public_key}
                                onChange={e => set('payment_tap_test_public_key', e.target.value)}
                                placeholder="Enter your Tap test public key"
                                disabled={saving === 'tap'}
                            />
                        </Field>
                        <Field label="Test Secret Key">
                            <input
                                className="form-control font-mono text-xs"
                                type="password"
                                value={settings.payment_tap_test_secret_key}
                                onChange={e => set('payment_tap_test_secret_key', e.target.value)}
                                placeholder="Enter your Tap test secret key"
                                disabled={saving === 'tap'}
                            />
                        </Field>
                    </div>
                    <div className="flex justify-end">
                        <button className="btn btn-primary btn-sm" onClick={() => saveGateway('tap')} disabled={saving === 'tap'}>
                            {saving === 'tap' ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </GatewayCard>

            </div>
        </div>
    );
};

export default PaymentGateways;
