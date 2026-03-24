import React, { useState } from 'react';
import ConfigPanel from '../ConfigPanel';
import { Play, Clock, Webhook, Zap, Copy, Check } from 'lucide-react';

const TriggerConfigPanel = ({ node, onChange, onClose, onDelete }) => {
    const { data } = node;
    const { triggerType = 'manual', label = 'Trigger', isActive = true, triggerConfig = {} } = data;
    const [copied, setCopied] = useState(false);

    const handleTypeChange = (type) => {
        const typeLabels = {
            manual: 'Manual Trigger',
            cron: 'Scheduled Task',
            webhook: 'Webhook Trigger',
            event: 'Event Listener'
        };
        onChange({
            ...data,
            triggerType: type,
            label: typeLabels[type] || `${type} Trigger`
        });
    };

    const handleConfigChange = (key, value) => {
        onChange({
            ...data,
            triggerConfig: { ...triggerConfig, [key]: value }
        });
    };

    const toggleActive = () => {
        onChange({ ...data, isActive: !isActive });
    };

    const webhookUrl = triggerConfig.webhook_id
        ? `${window.location.origin}/api/v1/workflows/hooks/${triggerConfig.webhook_id}`
        : null;

    const copyWebhookUrl = () => {
        if (webhookUrl) {
            navigator.clipboard.writeText(webhookUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const triggerTypes = [
        { id: 'manual', icon: Play, label: 'Manual', desc: 'Run on demand via button or API' },
        { id: 'cron', icon: Clock, label: 'Schedule', desc: 'Run on a cron schedule' },
        { id: 'webhook', icon: Webhook, label: 'Webhook', desc: 'Triggered by HTTP POST' },
        { id: 'event', icon: Zap, label: 'Event', desc: 'React to system events' },
    ];

    return (
        <ConfigPanel
            title="Trigger"
            icon={<Play size={16} />}
            color="#3b82f6"
            onClose={onClose}
            footer={onDelete && (
                <button className="btn-delete-node" onClick={onDelete}>
                    Remove Node
                </button>
            )}
        >
            <div className="form-group">
                <label>Label</label>
                <input
                    type="text"
                    value={label}
                    onChange={(e) => onChange({ ...data, label: e.target.value })}
                />
            </div>

            <div className="form-group">
                <label>Trigger Type</label>
                <div className="trigger-type-grid">
                    {triggerTypes.map(({ id, icon: Icon, label: typeLabel, desc }) => (
                        <button
                            key={id}
                            className={`trigger-type-btn ${triggerType === id ? 'active' : ''}`}
                            onClick={() => handleTypeChange(id)}
                        >
                            <Icon size={18} />
                            <span className="trigger-type-name">{typeLabel}</span>
                            <span className="trigger-type-desc">{desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label className="toggle-label">
                    <span>Enabled</span>
                    <button
                        className={`toggle-switch ${isActive ? 'active' : ''}`}
                        onClick={toggleActive}
                    >
                        <span className="toggle-knob" />
                    </button>
                </label>
            </div>

            {triggerType === 'cron' && (
                <div className="form-group">
                    <label>Cron Expression</label>
                    <input
                        type="text"
                        className="font-mono"
                        value={triggerConfig.cron || '0 * * * *'}
                        onChange={(e) => handleConfigChange('cron', e.target.value)}
                        placeholder="e.g. 0 0 * * *"
                    />
                    <span className="form-hint">
                        Format: minute hour day month weekday. Examples: <code>*/5 * * * *</code> (every 5 min), <code>0 0 * * *</code> (daily midnight)
                    </span>
                </div>
            )}

            {triggerType === 'webhook' && (
                <div className="form-group">
                    <label>Webhook URL</label>
                    {webhookUrl ? (
                        <>
                            <div className="input-with-action">
                                <input
                                    type="text"
                                    value={webhookUrl}
                                    readOnly
                                    className="input-readonly font-mono"
                                />
                                <button className="input-action-btn" onClick={copyWebhookUrl} title="Copy URL">
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                            <span className="form-hint">
                                Send a POST request to this URL to trigger the workflow. Request body is available as <code>context.body</code>.
                            </span>
                        </>
                    ) : (
                        <div className="panel-info-box panel-info-warning">
                            Save the workflow first to generate the webhook URL.
                        </div>
                    )}
                </div>
            )}

            {triggerType === 'event' && (
                <div className="form-group">
                    <label>System Event</label>
                    <select
                        value={triggerConfig.eventType || 'health_check_failed'}
                        onChange={(e) => handleConfigChange('eventType', e.target.value)}
                    >
                        <option value="health_check_failed">Health Check Failed</option>
                        <option value="high_cpu">High CPU Usage (&gt;80%)</option>
                        <option value="high_memory">High Memory Usage (&gt;80%)</option>
                        <option value="git_push">Git Push Received</option>
                        <option value="app_stopped">Application Stopped</option>
                    </select>
                    <span className="form-hint">
                        Event data is available as <code>context.event_data</code> in scripts and conditions.
                    </span>
                </div>
            )}

            {triggerType === 'manual' && (
                <div className="panel-info-box">
                    Click <strong>Execute</strong> in the toolbar or call the workflow API to run manually.
                </div>
            )}
        </ConfigPanel>
    );
};

export default TriggerConfigPanel;
