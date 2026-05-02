import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';

const STATIC_PAGES = [
    { label: 'Dashboard',          path: '/',                   category: 'Pages',          keywords: 'home overview' },
    { label: 'Services',           path: '/services',           category: 'Pages',          keywords: 'apps containers' },
    { label: 'Docker',             path: '/docker',             category: 'Pages',          keywords: 'containers images' },
    { label: 'Databases',          path: '/databases',          category: 'Pages',          keywords: 'mysql postgres sql' },
    { label: 'Domains',            path: '/domains',            category: 'Pages',          keywords: 'dns nginx' },
    { label: 'SSL Certificates',   path: '/ssl',                category: 'Pages',          keywords: 'https tls' },
    { label: 'Templates',          path: '/templates',          category: 'Pages',          keywords: 'deploy one-click' },
    { label: 'Workflow Builder',   path: '/workflow',           category: 'Pages',          keywords: 'automation pipeline' },
    { label: 'WordPress',          path: '/wordpress',          category: 'Pages',          keywords: 'wp sites' },
    { label: 'WordPress Projects', path: '/wordpress/projects', category: 'Pages',          keywords: 'wp environments' },
    { label: 'Git',                path: '/git',                category: 'Pages',          keywords: 'repos deploy' },
    { label: 'Files',              path: '/files',              category: 'Pages',          keywords: 'file manager explorer' },
    { label: 'FTP Server',         path: '/ftp',                category: 'Pages',          keywords: 'sftp upload' },
    { label: 'Monitoring',         path: '/monitoring',         category: 'Pages',          keywords: 'metrics uptime' },
    { label: 'Backups',            path: '/backups',            category: 'Pages',          keywords: 'snapshots restore' },
    { label: 'Cron Jobs',          path: '/cron',               category: 'Pages',          keywords: 'schedule tasks' },
    { label: 'Security',           path: '/security',           category: 'Pages',          keywords: 'firewall fail2ban' },
    { label: 'Email',              path: '/email',              category: 'Pages',          keywords: 'smtp postfix' },
    { label: 'Terminal',           path: '/terminal',           category: 'Pages',          keywords: 'shell ssh console' },
    { label: 'Servers',            path: '/servers',            category: 'Pages',          keywords: 'fleet agents' },
    { label: 'Fleet Monitor',      path: '/fleet-monitor',      category: 'Pages',          keywords: 'agents status' },
    { label: 'DNS Zones',          path: '/dns',                category: 'Pages',          keywords: 'records nameserver' },
    { label: 'Status Pages',       path: '/status-pages',       category: 'Pages',          keywords: 'uptime incidents' },
    { label: 'Cloud Provision',    path: '/cloud',              category: 'Pages',          keywords: 'vps deploy' },
    { label: 'Marketplace',        path: '/marketplace',        category: 'Pages',          keywords: 'extensions plugins' },
    { label: 'Downloads',          path: '/downloads',          category: 'Pages',          keywords: 'agent installer' },
    // Administration
    { label: 'Users',              path: '/users',              category: 'Administration', keywords: 'accounts team roles invitations' },
    { label: 'Subscriptions',      path: '/subscriptions',      category: 'Administration', keywords: 'billing plans customers' },
    { label: 'Transactions',       path: '/transactions',       category: 'Administration', keywords: 'payments invoices history' },
    { label: 'Pricing Plans',      path: '/pricing',            category: 'Administration', keywords: 'tiers packages billing' },
    { label: 'Payment Gateways',   path: '/payment-gateways',   category: 'Administration', keywords: 'stripe paypal billing' },
    // Settings
    { label: 'Settings',           path: '/settings',           category: 'Settings',       keywords: 'profile preferences' },
    { label: 'Settings: Profile',  path: '/settings/profile',   category: 'Settings',       keywords: 'avatar name email' },
    { label: 'Settings: Security', path: '/settings/security',  category: 'Settings',       keywords: 'password 2fa' },
    { label: 'Settings: API Keys', path: '/settings/api',       category: 'Settings',       keywords: 'tokens access' },
    { label: 'Settings: SSO',      path: '/settings/sso',       category: 'Settings',       keywords: 'oauth saml login' },
    { label: 'Settings: Appearance', path: '/settings/appearance', category: 'Settings',    keywords: 'theme dark light accent' },
    { label: 'Settings: Notifications', path: '/settings/notifications', category: 'Settings', keywords: 'alerts email slack' },
    { label: 'Settings: Site',     path: '/settings/site',      category: 'Settings',       keywords: 'domain license language session' },
    { label: 'Settings: System',   path: '/settings/system',    category: 'Settings',       keywords: 'server config info' },
];

function scoreItem(item, query) {
    const q = query.toLowerCase();
    const label = item.label.toLowerCase();
    const kw = (item.keywords || '').toLowerCase();
    const path = item.path.toLowerCase();
    if (label.startsWith(q)) return 4;
    if (label.includes(q)) return 3;
    if (kw.includes(q)) return 2;
    if (path.includes(q)) return 1;
    return -1;
}

const Kbd = ({ children }) => (
    <kbd className="inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
        {children}
    </kbd>
);

const CommandPalette = ({ open, onClose }) => {
    const [query, setQuery] = useState('');
    const [dynamicItems, setDynamicItems] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const navigate = useNavigate();

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
                    containers.forEach(c => items.push({
                        label: c.name || c.Names?.[0]?.replace(/^\//, ''),
                        path: `/docker`,
                        category: 'Containers',
                        keywords: `${c.Image || ''} ${c.State || ''}`,
                    }));
                }
            } catch {}
            try {
                const serverData = await api.getServers();
                const servers = serverData?.servers || serverData || [];
                if (!cancelled && Array.isArray(servers)) {
                    servers.forEach(s => items.push({
                        label: s.name || s.hostname,
                        path: `/servers/${s.id}`,
                        category: 'Servers',
                        keywords: `${s.hostname || ''} ${s.ip_address || ''}`,
                    }));
                }
            } catch {}
            if (!cancelled) setDynamicItems(items);
        }
        fetchDynamic();
        return () => { cancelled = true; };
    }, [open]);

    useEffect(() => {
        if (open) requestAnimationFrame(() => inputRef.current?.focus());
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

    useEffect(() => { setSelectedIndex(0); }, [results]);

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
        }
    }, [results, selectedIndex, handleSelect]);

    useEffect(() => {
        if (!listRef.current) return;
        const items = listRef.current.querySelectorAll('[data-item]');
        items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    // Group results by category
    const grouped = useMemo(() => {
        const g = {};
        results.forEach(item => {
            if (!g[item.category]) g[item.category] = [];
            g[item.category].push(item);
        });
        return g;
    }, [results]);

    // Build a flat list for selectedIndex tracking
    const flatItems = useMemo(() => results, [results]);

    let itemCounter = -1;

    return (
        <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150" />
                <Dialog.Content
                    onOpenAutoFocus={e => e.preventDefault()}
                    aria-label="Command palette"
                    className={cn(
                        'fixed left-1/2 top-[18%] z-50 w-full max-w-lg -translate-x-1/2',
                        'rounded-xl border border-border bg-popover shadow-2xl overflow-hidden',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                        'data-[state=closed]:slide-out-to-top-4 data-[state=open]:slide-in-from-top-4',
                        'duration-150'
                    )}
                >
                    {/* Search input row */}
                    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search pages, services, servers…"
                            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                            autoComplete="off"
                            spellCheck="false"
                        />
                        <Kbd>ESC</Kbd>
                    </div>

                    {/* Results list */}
                    <div
                        ref={listRef}
                        className="max-h-[min(60vh,380px)] overflow-y-auto overscroll-contain p-1"
                    >
                        {results.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                No results for &ldquo;{query}&rdquo;
                            </div>
                        ) : (
                            Object.entries(grouped).map(([category, items]) => (
                                <div key={category}>
                                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {category}
                                    </p>
                                    {items.map(item => {
                                        itemCounter++;
                                        const idx = itemCounter;
                                        const isSelected = idx === selectedIndex;
                                        return (
                                            <button
                                                key={`${item.category}-${item.path}-${item.label}`}
                                                data-item
                                                className={cn(
                                                    'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                                                    isSelected
                                                        ? 'bg-accent text-accent-foreground'
                                                        : 'text-foreground hover:bg-accent/60'
                                                )}
                                                onClick={() => handleSelect(item)}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                            >
                                                <span className="font-medium truncate">{item.label}</span>
                                                <span className="shrink-0 text-[11px] text-muted-foreground">{item.path}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-4 border-t border-border px-4 py-2">
                        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Kbd>↑</Kbd><Kbd>↓</Kbd> navigate
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Kbd>↵</Kbd> open
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Kbd>ESC</Kbd> close
                        </span>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default CommandPalette;
