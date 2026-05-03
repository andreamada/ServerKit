// WordPress standalone endpoints (from api.js, NOT the separate wordpress.js service)

export async function getWordPressStatus() {
    return this.request('/wordpress/standalone/status');
}

export async function getWordPressRequirements() {
    return this.request('/wordpress/standalone/requirements');
}

export async function installWordPress(data) {
    return this.request('/wordpress/standalone/install', {
        method: 'POST',
        body: data
    });
}

export async function uninstallWordPress(removeData = false) {
    return this.request('/wordpress/standalone/uninstall', {
        method: 'POST',
        body: { removeData }
    });
}

export async function startWordPress() {
    return this.request('/wordpress/standalone/start', { method: 'POST' });
}

export async function stopWordPress() {
    return this.request('/wordpress/standalone/stop', { method: 'POST' });
}

export async function restartWordPress() {
    return this.request('/wordpress/standalone/restart', { method: 'POST' });
}

// ── WaaS Template Library ─────────────────────────────────────────────────────

export async function listWpTemplates(category = null, search = null) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    const qs = params.toString();
    return this.request(`/wp-templates/${qs ? `?${qs}` : ''}`);
}

export async function getWpTemplateCategories() {
    return this.request('/wp-templates/categories');
}

export async function getWpCustomCategories() {
    return this.request('/wp-templates/categories/custom');
}

export async function addWpCustomCategory(name) {
    return this.request('/wp-templates/categories/custom', {
        method: 'POST',
        body: { name },
    });
}

export async function removeWpCustomCategory(name) {
    return this.request(`/wp-templates/categories/custom/${encodeURIComponent(name)}`, {
        method: 'DELETE',
    });
}

export async function createWpTemplate(data) {
    return this.request('/wp-templates/', {
        method: 'POST',
        body: data,
    });
}

export async function updateWpTemplate(templateId, data) {
    return this.request(`/wp-templates/${templateId}`, {
        method: 'PUT',
        body: data,
    });
}

export async function deleteWpTemplate(templateId) {
    return this.request(`/wp-templates/${templateId}`, {
        method: 'DELETE',
    });
}

export async function createWpTemplateFromBackup(formData) {
    return this.request('/wp-templates/from-backup', {
        method: 'POST',
        body: formData,
    });
}

export async function getWpPreviewStatus(templateId) {
    return this.request(`/wp-templates/${templateId}/preview-status`);
}

export async function deployWpSiteFromTemplate(templateId, data) {
    return this.request(`/wp-templates/${templateId}/deploy`, {
        method: 'POST',
        body: data,
    });
}
