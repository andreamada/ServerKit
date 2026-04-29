import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Check, Server, HardDrive, Cpu, Shield } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const PricingPlansTab = () => {
    const toast = useToast();
    const [plans, setPlans] = useState([]);
    const [currency, setCurrency] = useState('USD');
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price_monthly: 0,
        price_yearly: 0,
        has_monthly: true,
        has_yearly: true,
        max_sites: 1,
        has_backups: false,
        resource_specs: {
            cpu: '1',
            memory: '1GB',
            disk: '10GB'
        }
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [plansData, settingsData] = await Promise.all([
                api.listPricingPlans(),
                api.getSystemSettings()
            ]);
            setPlans(plansData.plans || []);
            setCurrency(settingsData.company_currency || 'USD');
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    async function loadPlans() {
        try {
            const data = await api.listPricingPlans();
            setPlans(data.plans || []);
        } catch (err) {
            toast.error('Failed to load pricing plans');
        }
    }

    const handleEdit = (plan) => {
        setEditingId(plan.id);
        setFormData({
            name: plan.name,
            description: plan.description || '',
            price_monthly: plan.price_monthly !== null ? plan.price_monthly : 0,
            price_yearly: plan.price_yearly !== null ? plan.price_yearly : 0,
            has_monthly: plan.price_monthly !== null,
            has_yearly: plan.price_yearly !== null,
            max_sites: plan.max_sites || 1,
            has_backups: plan.has_backups || false,
            resource_specs: plan.resource_specs || { cpu: '1', memory: '1GB', disk: '10GB' }
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData({
            name: '',
            description: '',
            price_monthly: 0,
            price_yearly: 0,
            has_monthly: true,
            has_yearly: true,
            max_sites: 1,
            has_backups: false,
            resource_specs: { cpu: '1', memory: '1GB', disk: '10GB' }
        });
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('Plan name is required');
            return;
        }

        if (!formData.has_monthly && !formData.has_yearly) {
            toast.error('At least one price (monthly or yearly) must be enabled');
            return;
        }

        const payload = {
            ...formData,
            price_monthly: formData.has_monthly ? formData.price_monthly : null,
            price_yearly: formData.has_yearly ? formData.price_yearly : null
        };

        try {
            if (editingId) {
                await api.updatePricingPlan(editingId, payload);
                toast.success('Plan updated successfully');
            } else {
                await api.createPricingPlan(payload);
                toast.success('Plan created successfully');
            }
            handleCancel();
            loadPlans();
        } catch (err) {
            toast.error(err.message || 'Failed to save plan');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this plan?')) return;

        try {
            await api.deletePricingPlan(id);
            toast.success('Plan deleted successfully');
            loadPlans();
        } catch (err) {
            toast.error('Failed to delete plan');
        }
    };

    if (loading) return <div className="p-4 text-center">Loading plans...</div>;

    return (
        <div className="settings-section pricing-plans-tab">
            <div className="section-header-with-actions">
                <div>
                    <h2>Pricing Plans</h2>
                    <p className="section-description">Manage subscription plans for your SaaS containers</p>
                </div>
                {!isAdding && !editingId && (
                    <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
                        <Plus size={16} /> Add New Plan
                    </button>
                )}
            </div>

            {(isAdding || editingId) && (
                <div className="settings-card edit-card">
                    <h3>{editingId ? 'Edit Plan' : 'New Pricing Plan'}</h3>
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Plan Name</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. Professional"
                            />
                        </div>
                        <div className="form-group full-width">
                            <label>Description</label>
                            <textarea 
                                className="form-control" 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                placeholder="Brief summary of plan features..."
                                rows="2"
                            />
                        </div>
                        <div className="form-group">
                            <label className="toggle-switch-label">
                                <span>Monthly Billing</span>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.has_monthly} 
                                        onChange={e => setFormData({...formData, has_monthly: e.target.checked})}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>
                            {formData.has_monthly && (
                                <input 
                                    type="number" 
                                    className="form-control mt-2" 
                                    value={formData.price_monthly} 
                                    onChange={e => setFormData({...formData, price_monthly: e.target.value})}
                                    placeholder="Monthly price"
                                />
                            )}
                        </div>
                        <div className="form-group">
                            <label className="toggle-switch-label">
                                <span>Yearly Billing</span>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.has_yearly} 
                                        onChange={e => setFormData({...formData, has_yearly: e.target.checked})}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>
                            {formData.has_yearly && (
                                <input 
                                    type="number" 
                                    className="form-control mt-2" 
                                    value={formData.price_yearly} 
                                    onChange={e => setFormData({...formData, price_yearly: e.target.value})}
                                    placeholder="Yearly price"
                                />
                            )}
                        </div>
                        <div className="form-group">
                            <label>Max Sites</label>
                            <input 
                                type="number" 
                                className="form-control" 
                                value={formData.max_sites} 
                                onChange={e => setFormData({...formData, max_sites: e.target.value})}
                                min="1"
                            />
                        </div>
                        <div className="form-group">
                            <label className="toggle-switch-label">
                                <span>Include Backups</span>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.has_backups} 
                                        onChange={e => setFormData({...formData, has_backups: e.target.checked})}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>
                        </div>
                    </div>

                    <div className="resource-specs-section">
                        <h4>
                            <Server size={14} /> Resource Allocations
                        </h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label><Cpu size={14} /> CPU Units</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={formData.resource_specs.cpu} 
                                    onChange={e => setFormData({...formData, resource_specs: {...formData.resource_specs, cpu: e.target.value}})}
                                    placeholder="e.g. 1"
                                />
                            </div>
                            <div className="form-group">
                                <label><HardDrive size={14} /> Memory</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={formData.resource_specs.memory} 
                                    onChange={e => setFormData({...formData, resource_specs: {...formData.resource_specs, memory: e.target.value}})}
                                    placeholder="e.g. 1GB"
                                />
                            </div>
                            <div className="form-group">
                                <label><HardDrive size={14} /> Disk Space</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={formData.resource_specs.disk} 
                                    onChange={e => setFormData({...formData, resource_specs: {...formData.resource_specs, disk: e.target.value}})}
                                    placeholder="e.g. 20GB"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Save size={16} /> {editingId ? 'Update Plan' : 'Save Plan'}
                        </button>
                    </div>
                </div>
            )}

            <div className="plans-grid">
                {plans.length === 0 ? (
                    <div className="empty-state">
                        <Server size={48} />
                        <h3>No pricing plans defined</h3>
                        <p>Create your first plan to start offering SaaS services.</p>
                        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
                            <Plus size={16} /> Create Plan
                        </button>
                    </div>
                ) : (
                    plans.map(plan => (
                        <div key={plan.id} className={`plan-card ${!plan.is_active ? 'inactive' : ''}`}>
                            <div className="plan-header">
                                <div className="plan-title">
                                    <h3>{plan.name}</h3>
                                    <p>{plan.description}</p>
                                </div>
                                <div className="plan-actions">
                                    <button className="icon-btn" onClick={() => handleEdit(plan)} title="Edit">
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="icon-btn delete" onClick={() => handleDelete(plan.id)} title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            {plan.price_monthly !== null && (
                                <div className="plan-price">
                                    <span className="currency">{currency === 'USD' ? '$' : currency}</span>
                                    <span className="amount">{plan.price_monthly}</span>
                                    <span className="term">/ mo</span>
                                </div>
                            )}
                            {plan.price_yearly !== null && (
                                <div className={`plan-price ${plan.price_monthly !== null ? 'secondary' : ''}`}>
                                    <span className="currency">{currency === 'USD' ? '$' : currency}</span>
                                    <span className="amount">{plan.price_yearly}</span>
                                    <span className="term">/ yr</span>
                                </div>
                            )}

                            <div className="plan-specs">
                                <div className="spec-item">
                                    <Check size={14} />
                                    <span>{plan.max_sites} {plan.max_sites === 1 ? 'Site' : 'Sites'}</span>
                                </div>
                                <div className="spec-item">
                                    <Cpu size={14} />
                                    <span>{plan.resource_specs.cpu} Core</span>
                                </div>
                                <div className="spec-item">
                                    <HardDrive size={14} />
                                    <span>{plan.resource_specs.memory} RAM</span>
                                </div>
                                <div className="spec-item">
                                    <HardDrive size={14} />
                                    <span>{plan.resource_specs.disk} Disk</span>
                                </div>
                                {plan.has_backups && (
                                    <div className="spec-item">
                                        <Shield size={14} />
                                        <span>Backups</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PricingPlansTab;
