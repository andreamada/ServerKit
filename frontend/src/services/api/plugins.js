// Plugin management API methods

export async function getInstalledPlugins(status) {
    const params = status ? `?status=${status}` : '';
    return this.request(`/plugins${params}`);
}

export async function getPlugin(pluginId) {
    return this.request(`/plugins/${pluginId}`);
}

export async function installPlugin(url) {
    return this.request('/plugins/install', {
        method: 'POST',
        body: JSON.stringify({ url }),
    });
}

export async function uninstallPlugin(pluginId) {
    return this.request(`/plugins/${pluginId}`, {
        method: 'DELETE',
    });
}

export async function enablePlugin(pluginId) {
    return this.request(`/plugins/${pluginId}/enable`, {
        method: 'POST',
    });
}

export async function disablePlugin(pluginId) {
    return this.request(`/plugins/${pluginId}/disable`, {
        method: 'POST',
    });
}
