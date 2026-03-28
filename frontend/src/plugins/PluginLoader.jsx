/**
 * PluginLoader - Dynamically loads installed plugin components.
 *
 * Uses Vite's import.meta.glob to discover plugin entry points at build time.
 * Plugins installed via the plugin system are placed in src/plugins/<slug>/
 * and their components are auto-discovered here.
 *
 * Each plugin's index.js should export:
 *   - A default component (the widget/UI to render)
 *   - Optionally a Provider component for context wrapping
 */
import React, { Suspense, useMemo } from 'react';

// Vite glob import: discovers all plugin index.js files at build time
// Each returns { default: Component, Provider?: Component }
const pluginModules = import.meta.glob('./**/index.js', { eager: true });

/**
 * Get all discovered plugins with their components.
 */
export function getInstalledPlugins() {
    const plugins = [];

    for (const [path, mod] of Object.entries(pluginModules)) {
        // path looks like "./serverkit-ai/index.js"
        const match = path.match(/^\.\/([^/]+)\/index\.js$/);
        if (!match) continue;

        const slug = match[1];
        // Skip internal files
        if (slug === 'PluginLoader') continue;

        plugins.push({
            slug,
            Component: mod.default || mod.AiAssistant || null,
            Provider: mod.AiAssistantProvider || mod.Provider || null,
            module: mod,
        });
    }

    return plugins;
}

/**
 * Renders all installed plugin widgets.
 * Wraps each in its Provider if one is exported.
 *
 * @param {object} props
 * @param {object} props.api - The ApiService instance to pass to plugins
 */
const PluginLoader = ({ api }) => {
    const plugins = useMemo(() => getInstalledPlugins(), []);

    if (plugins.length === 0) return null;

    return (
        <>
            {plugins.map(({ slug, Component, Provider }) => {
                if (!Component) return null;

                const widget = <Component key={slug} api={api} />;

                if (Provider) {
                    return (
                        <Provider key={`provider-${slug}`}>
                            {widget}
                        </Provider>
                    );
                }

                return widget;
            })}
        </>
    );
};

export default PluginLoader;
