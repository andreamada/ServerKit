import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ArrowRight, LayoutDashboard } from 'lucide-react';
import { SIDEBAR_ITEMS, CATEGORY_LABELS } from '../components/sidebarItems';
import { useAuth } from '../contexts/AuthContext';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/utils';

// Settings tabs that are searchable
const SETTINGS_ENTRIES = [
    { label: 'Profile', route: '/settings/profile', description: 'Edit your name, email, and avatar' },
    { label: 'Security', route: '/settings/security', description: 'Password, two-factor authentication' },
    { label: 'Notifications', route: '/settings/notifications', description: 'Alert and email preferences' },
    { label: 'Appearance', route: '/settings/appearance', description: 'Theme, accent color, and layout' },
    { label: 'Sidebar', route: '/settings/sidebar', description: 'Customize sidebar navigation' },
    { label: 'White Label', route: '/settings/whitelabel', description: 'Branding and logo settings' },
    { label: 'Activity', route: '/settings/activity', description: 'Audit log and user activity' },
    { label: 'Site Settings', route: '/settings/site', description: 'Domain, license, session timeout' },
    { label: 'SSO', route: '/settings/sso', description: 'Single sign-on configuration' },
    { label: 'API', route: '/settings/api', description: 'API keys and access tokens' },
    { label: 'Migrations', route: '/settings/migrations', description: 'Database migration history' },
    { label: 'System Info', route: '/settings/system', description: 'Server and runtime details' },
    { label: 'About', route: '/settings/about', description: 'Version and license information' },
];

function groupNavResults(items) {
    const groups = {};
    for (const item of items) {
        const cat = item.category;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(item);
    }
    return groups;
}

function ResultItem({ label, description, route, onNavigate }) {
    return (
        <button
            onClick={() => onNavigate(route)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
        >
            <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{label}</p>
                {description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>
                )}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
    );
}

function ResultGroup({ title, children }) {
    return (
        <div>
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
            </p>
            <div className="flex flex-col gap-0.5">{children}</div>
        </div>
    );
}

const Search = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const inputRef = useRef(null);

    const initialQuery = searchParams.get('q') || '';
    const [query, setQuery] = useState(initialQuery);

    useEffect(() => {
        setQuery(searchParams.get('q') || '');
    }, [searchParams]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && query.trim()) {
            setSearchParams({ q: query.trim() });
        }
        if (e.key === 'Escape') {
            setQuery('');
            setSearchParams({});
        }
    };

    const goTo = (route) => navigate(route);

    const q = query.toLowerCase().trim();

    const navResults = q
        ? SIDEBAR_ITEMS.filter(item => {
            if (item.requiresAdmin && !isAdmin) return false;
            return item.label.toLowerCase().includes(q);
        })
        : [];

    const settingsResults = q
        ? SETTINGS_ENTRIES.filter(entry => {
            if (!isAdmin && ['Activity', 'Site Settings', 'SSO', 'API', 'Migrations', 'System Info'].includes(entry.label)) return false;
            return entry.label.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q);
        })
        : [];

    const navGroups = groupNavResults(navResults);
    const hasResults = navResults.length > 0 || settingsResults.length > 0;

    return (
        <div className="flex flex-col gap-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Search</h1>
                <p className="text-sm text-muted-foreground">Find anything across the platform.</p>
            </div>

            <Separator />

            {/* Search input */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 shadow-sm focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-shadow)] transition-all">
                <SearchIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search pages, settings, and more…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setSearchParams({}); inputRef.current?.focus(); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Results */}
            {q && (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
                    {!hasResults && (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <SearchIcon className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm font-medium text-foreground">No results for &ldquo;{q}&rdquo;</p>
                            <p className="text-xs text-muted-foreground">Try a different keyword.</p>
                        </div>
                    )}

                    {Object.entries(navGroups).map(([cat, items]) => (
                        <ResultGroup key={cat} title={CATEGORY_LABELS[cat] ?? cat}>
                            {items.map(item => (
                                <ResultItem
                                    key={item.id}
                                    label={item.label}
                                    route={item.route}
                                    onNavigate={goTo}
                                />
                            ))}
                        </ResultGroup>
                    ))}

                    {settingsResults.length > 0 && (
                        <ResultGroup title="Settings">
                            {settingsResults.map(entry => (
                                <ResultItem
                                    key={entry.route}
                                    label={entry.label}
                                    description={entry.description}
                                    route={entry.route}
                                    onNavigate={goTo}
                                />
                            ))}
                        </ResultGroup>
                    )}
                </div>
            )}

            {!q && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <SearchIcon className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">Start typing to search</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Search across navigation, settings, and more.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Search;
