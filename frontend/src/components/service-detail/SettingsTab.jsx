import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { ConfirmDialog } from '../ConfirmDialog';

const SettingsTab = ({ app, deployConfig, onUpdate, onOpenGitModal }) => {
    const navigate = useNavigate();
    const toast = useToast();
    const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
    const [deleting, setDeleting] = useState(false);
    const [environmentType, setEnvironmentType] = useState(app.environment_type || 'standalone');
    const [savingEnvironment, setSavingEnvironment] = useState(false);
    const [unlinking, setUnlinking] = useState(false);

    const envLabels = {
        standalone: 'Standalone',
        production: 'Production',
        development: 'Development',
        staging: 'Staging',
    };

    async function handleEnvironmentChange(newType) {
        if (newType === app.environment_type) return;

        setSavingEnvironment(true);
        try {
            await api.updateAppEnvironment(app.id, newType);
            setEnvironmentType(newType);
            onUpdate();
        } catch (err) {
            toast.error('Failed to update environment type');
            setEnvironmentType(app.environment_type || 'standalone');
        } finally {
            setSavingEnvironment(false);
        }
    }

    async function handleUnlink() {
        const ok = await confirm({
            title: 'Unlink Application',
            message: `Unlink ${app.name} from its linked application? Both apps will revert to standalone mode.`,
            confirmText: 'Unlink',
        });
        if (!ok) return;

        setUnlinking(true);
        try {
            await api.unlinkApp(app.id);
            onUpdate();
        } catch (err) {
            toast.error('Failed to unlink app');
        } finally {
            setUnlinking(false);
        }
    }

    async function handleDelete() {
        const first = await confirm({
            title: 'Delete Service',
            message: `Delete "${app.name}"? This action cannot be undone.`,
            confirmText: 'Yes, Delete',
        });
        if (!first) return;

        const second = await confirm({
            title: 'Confirm Deletion',
            message: 'This will permanently remove the service and all its data. Are you sure?',
            confirmText: 'Delete Forever',
        });
        if (!second) return;

        setDeleting(true);
        try {
            await api.deleteApp(app.id);
        } catch (err) {
            toast.error('Failed to delete service: ' + (err.message || 'Unknown error'));
        } finally {
            navigate('/services');
        }
    }

    return (
        <div className="svc-settings">
            {/* Repository Configuration */}
            <div className="svc-settings__section">
                <h3 className="svc-settings__section-title">Repository</h3>
                <div className="card">
                    <div className="settings-row">
                        <div className="settings-label">
                            <span>Connected Repository</span>
                            <span className="settings-hint">
                                {deployConfig
                                    ? `${deployConfig.repo_url} (${deployConfig.branch || 'main'})`
                                    : 'No repository connected'}
                            </span>
                        </div>
                        <div className="settings-control">
                            <button className="btn btn-secondary" onClick={onOpenGitModal}>
                                {deployConfig ? 'Edit' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Environment Configuration */}
            <div className="svc-settings__section">
                <h3 className="svc-settings__section-title">Environment</h3>
                <div className="card settings-section">
                    <div className="settings-row">
                        <div className="settings-label">
                            <span>Environment Type</span>
                            <span className="settings-hint">
                                {app.has_linked_app
                                    ? 'This app is linked. Unlink to change environment type.'
                                    : 'Set how this application is used in your workflow.'}
                            </span>
                        </div>
                        <div className="settings-control">
                            {app.has_linked_app ? (
                                <span className={`env-badge env-${app.environment_type}`}>
                                    {envLabels[app.environment_type] || app.environment_type}
                                </span>
                            ) : (
                                <select
                                    value={environmentType}
                                    onChange={(e) => handleEnvironmentChange(e.target.value)}
                                    disabled={savingEnvironment}
                                    className="settings-select"
                                >
                                    <option value="standalone">Standalone</option>
                                    <option value="development">Development</option>
                                    <option value="staging">Staging</option>
                                    <option value="production">Production</option>
                                </select>
                            )}
                            {savingEnvironment && <span className="settings-saving">Saving...</span>}
                        </div>
                    </div>

                    {app.has_linked_app && (
                        <div className="settings-row">
                            <div className="settings-label">
                                <span>Linked Application</span>
                                <span className="settings-hint">
                                    Unlinking will reset both apps to standalone mode.
                                </span>
                            </div>
                            <div className="settings-control">
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleUnlink}
                                    disabled={unlinking}
                                >
                                    {unlinking ? 'Unlinking...' : 'Unlink'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="svc-settings__section">
                <h3 className="svc-settings__section-title">Danger Zone</h3>
                <div className="card danger-zone">
                    <p>Once you delete a service, there is no going back. All data will be permanently removed.</p>
                    <button
                        className="btn btn-danger"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting...' : 'Delete Service'}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                variant={confirmState.variant}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </div>
    );
};

export default SettingsTab;
