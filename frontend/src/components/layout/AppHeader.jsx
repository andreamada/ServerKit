import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ShoppingCart, Globe, ChevronDown, Settings, LogOut, User, Check, BellOff, CheckCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommandPalette } from '../../contexts/CommandPaletteContext';
import { cn } from '../../lib/utils';
import { Separator } from '../ui/separator';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
    DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '../ui/dropdown-menu';

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'it', label: 'Italiano' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
];

export default function AppHeader() {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const { openPalette } = useCommandPalette();
    const [lang, setLang] = useState('en');

    return (
        <header className="sticky top-0 flex h-14 items-center gap-4 border-b border-border bg-background px-4" style={{zIndex: 50}}>

            {/* Left spacer */}
            <div className="flex-1" />

            {/* Center: Search trigger */}
            <button
                onClick={openPalette}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm w-64 transition-colors hover:bg-muted/70 hover:border-[var(--accent-primary)]"
            >
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-left text-muted-foreground">Search...</span>
                <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                    ⌘K
                </kbd>
            </button>

            {/* Right: actions */}
            <div className="flex items-center gap-1">

                {/* Cart */}
                <button
                    style={{ color: 'hsl(var(--sidebar-foreground))' }}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:outline-none"
                    title="Cart"
                >
                    <ShoppingCart className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </button>

                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            style={{ color: 'hsl(var(--sidebar-foreground))' }}
                            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:outline-none"
                            title="Notifications"
                        >
                            <Bell style={{ width: 18, height: 18 }} />
                            {/* Unread badge — hidden when 0 */}
                            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                            </span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-96 p-0 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold" style={{ color: 'hsl(var(--popover-foreground))' }}>Notifications</span>
                                <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold h-4 min-w-4 px-1">0</span>
                            </div>
                            <button
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-accent"
                                style={{ color: 'hsl(var(--popover-foreground))', opacity: 0.6 }}
                                title="Mark all as read"
                            >
                                <CheckCheck style={{ width: 13, height: 13 }} />
                                Mark all read
                            </button>
                        </div>
                        {/* Tabs */}
                        <div className="flex border-b border-border px-4">
                            <button className="border-b-2 border-foreground px-3 py-2 text-xs font-medium" style={{ color: 'hsl(var(--popover-foreground))' }}>All</button>
                            <button className="px-3 py-2 text-xs font-medium opacity-50 hover:opacity-80 transition-opacity" style={{ color: 'hsl(var(--popover-foreground))' }}>Unread</button>
                        </div>
                        {/* Empty state */}
                        <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <BellOff style={{ width: 22, height: 22 }} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium" style={{ color: 'hsl(var(--popover-foreground))' }}>All caught up</p>
                                <p className="mt-0.5 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>No new notifications right now.</p>
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="border-t border-border px-4 py-2">
                            <button
                                className="w-full rounded px-2 py-1.5 text-center text-xs font-medium transition-colors hover:bg-accent"
                                style={{ color: 'hsl(var(--popover-foreground))' }}
                                onClick={() => navigate('/notifications')}
                            >
                                View all notifications
                            </button>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Language */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            style={{ color: 'hsl(var(--sidebar-foreground))' }}
                            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm transition-colors hover:bg-accent focus-visible:outline-none"
                            title="Language"
                        >
                            <Globe style={{ width: 16, height: 16 }} />
                            <span className="hidden sm:inline font-medium uppercase">{lang}</span>
                            <ChevronDown style={{ width: 13, height: 13 }} className="opacity-60" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>Language</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={lang} onValueChange={setLang}>
                            {LANGUAGES.map(l => (
                                <DropdownMenuRadioItem key={l.code} value={l.code}>
                                    {l.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Separator orientation="vertical" className="mx-1 h-6" />

                {/* Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-accent focus-visible:outline-none">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="hidden md:inline font-medium" style={{ color: 'hsl(var(--sidebar-foreground))' }}>{user?.username || 'User'}</span>
                            <ChevronDown style={{ width: 13, height: 13, color: 'hsl(var(--sidebar-foreground))', opacity: 0.5 }} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-foreground">{user?.username || 'User'}</span>
                                <span className="text-xs text-muted-foreground">{user?.email || ''}</span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/settings')}>
                            <Settings className="mr-2" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logout} className="text-red-500 focus:text-red-500">
                            <LogOut className="mr-2" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
