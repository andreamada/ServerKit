import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATIC_PAGES = [
    { label: 'Services', path: '/services', category: 'Pages', keywords: 'apps containers' },
    { label: 'Docker', path: '/docker', category: 'Pages', keywords: 'containers images' },
    { label: 'Databases', path: '/databases', category: 'Pages', keywords: 'mysql postgres sql' },
    { label: 'Domains', path: '/domains', category: 'Pages', keywords: 'dns nginx' },
    { label: 'SSL Certificates', path: '/ssl', category: 'Pages', keywords: 'https tls' },
    { label: 'Templates', path: '/templates', category: 'Pages', keywords: 'deploy one-click' },
    { label: 'Deployments', path: '/deployments', category: 'Pages', keywords: 'deploy jobs status logs' },
    { label: 'Workflow Builder', path: '/workflow', category: 'Pages', keywords: 'automation pipeline' },
    { label: 'WordPress', path: '/wordpress', category: 'Pages', keywords: 'wp sites' },
    { label: 'WordPress Projects', path: '/wordpress/projects', category: 'Pages', keywords: 'wp environments' },
    { label: 'Git', path: '/git', category: 'Pages', keywords: 'repos deploy' },
    { label: 'Files', path: '/files', category: 'Pages', keywords: 'file manager explorer' },
    { label: 'FTP Server', path: '/ftp', category: 'Pages', keywords: 'sftp upload' },
    { label: 'Monitoring', path: '/monitoring', category: 'Pages', keywords: 'metrics uptime' },
    { label: 'Backups', path: '/backups', category: 'Pages', keywords: 'snapshots restore' },
    { label: 'Cron Jobs', path: '/cron', category: 'Pages', keywords: 'schedule tasks' },
    { label: 'Security', path: '/security', category: 'Pages', keywords: 'firewall fail2ban' },
    { label: 'Email', path: '/email', category: 'Pages', keywords: 'smtp postfix' },
    { label: 'Terminal', path: '/terminal', category: 'Pages', keywords: 'shell ssh console' },
    { label: 'Servers', path: '/servers', category: 'Pages', keywords: 'fleet agents' },
    { label: 'Fleet Monitor', path: '/fleet-monitor', category: 'Pages', keywords: 'agents status' },
    { label: 'DNS Zones', path: '/dns', category: 'Pages', keywords: 'records nameserver' },
    { label: 'Status Pages', path: '/status-pages', category: 'Pages', keywords: 'uptime incidents' },
    { label: 'Cloud Provision', path: '/cloud', category: 'Pages', keywords: 'vps deploy' },
    { label: 'Marketplace', path: '/marketplace', category: 'Pages', keywords: 'extensions plugins' },
    { label: 'Downloads', path: '/downloads', category: 'Pages', keywords: 'agent installer' },
    { label: 'Settings', path: '/settings', category: 'Settings', keywords: 'profile preferences' },
    { label: 'Settings: Users', path: '/settings/users', category: 'Settings', keywords: 'accounts team' },
    { label: 'Settings: API Keys', path: '/settings/api', category: 'Settings', keywords: 'tokens access' },
    { label: 'Settings: SSO', path: '/settings/sso', category: 'Settings', keywords: 'oauth saml login' },
    { label: 'Settings: Appearance', path: '/settings/appearance', category: 'Settings', keywords: 'theme dark light' },
    { label: 'Settings: Notifications', path: '/settings/notifications', category: 'Settings', keywords: 'alerts email slack' },
    { label: 'Settings: System', path: '/settings/system', category: 'Settings', keywords: 'server config' },
];

function fuzzyMatch(text, query) {
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return -1;
    return idx === 0 ? 2 : 1;
}

function scoreItem(item, query) {
    const labelScore = fuzzyMatch(item.label, query);
    if (labelScore > 0) return labelScore + 1;
    const kwScore = fuzzyMatch(item.keywords || '', query);
    if (kwScore > 0) return kwScore;
    const pathScore = fuzzyMatch(item.path, query);
    if (pathScore > 0) return pathScore;
    return -1;
}

const CommandPalette = ({ open, onClose }) => {
    const [query, setQuery] = useState('');
    const [dynamicItems, setDynamicItems] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const navigate = useNavigate();

    // Fetch dynamic items (services/containers + servers) when opened
    useEffect(() => {
        if (!open) return;
        setQuery('');
        setSelectedIndex(0);

        let cancelled = false;
        async function fetchDynamic() {
            const items = [];
            try {
                const containers = await api.getContainers();
                if (!cancelled && Array.isArray(containers)) {
                    containers.forEach(c => {
                        items.push({
                            label: c.name || c.Names?.[0]?.replace(/^\//, ''),
                            path: `/docker`,
                            category: 'Containers',
                            keywords: `${c.Image || ''} ${c.State || ''}`,
                        });
                    });
                }
            } catch {}
            try {
                const serverData = await api.getServers();
                const servers = serverData?.servers || serverData || [];
                if (!cancelled && Array.isArray(servers)) {
                    servers.forEach(s => {
                        items.push({
                            label: s.name || s.hostname,
                            path: `/servers/${s.id}`,
                            category: 'Servers',
                            keywords: `${s.hostname || ''} ${s.ip_address || ''}`,
                        });
                    });
                }
            } catch {}
            if (!cancelled) setDynamicItems(items);
        }
        fetchDynamic();
        return () => { cancelled = true; };
    }, [open]);

    // Focus input when opened
    useEffect(() => {
        if (open && inputRef.current) {
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    const allItems = useMemo(() => [...STATIC_PAGES, ...dynamicItems], [dynamicItems]);

    const results = useMemo(() => {
        if (!query.trim()) return allItems.slice(0, 20);
        return allItems
            .map(item => ({ ...item, score: scoreItem(item, query.trim()) }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);
    }, [query, allItems]);

    // Reset selected index when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [results]);

    const handleSelect = useCallback((item) => {
        navigate(item.path);
        onClose();
    }, [navigate, onClose]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            handleSelect(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    }, [results, selectedIndex, handleSelect, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        if (!listRef.current) return;
        const selected = listRef.current.children[selectedIndex];
        if (selected) selected.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    if (!open) return null;

    // Group results by category
    const grouped = {};
    results.forEach(item => {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
    });

    let flatIndex = -1;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
                <div className="command-palette__input-wrapper">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search pages, services, servers..."
                        className="command-palette__input"
                        autoComplete="off"
                        spellCheck="false"
                    />
                    <kbd className="command-palette__kbd">ESC</kbd>
                </div>
                <div className="command-palette__results" ref={listRef}>
                    {results.length === 0 ? (
                        <div className="command-palette__empty">No results found</div>
                    ) : (
                        Object.entries(grouped).map(([category, items]) => (
                            <div key={category} className="command-palette__group">
                                <div className="command-palette__group-label">{category}</div>
                                {items.map(item => {
                                    flatIndex++;
                                    const idx = flatIndex;
                                    return (
                                        <button
                                            key={`${item.category}-${item.path}-${item.label}`}
                                            className={`command-palette__item ${idx === selectedIndex ? 'command-palette__item--active' : ''}`}
                                            onClick={() => handleSelect(item)}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                        >
                                            <span className="command-palette__item-label">{item.label}</span>
                                            <span className="command-palette__item-path">{item.path}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
