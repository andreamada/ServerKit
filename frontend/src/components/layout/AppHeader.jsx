import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ShoppingCart, Globe, ChevronDown, Settings, LogOut, User, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
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
    const [lang, setLang] = useState('en');
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const searchRef = useRef(null);

    // Ctrl+K focuses search
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchValue.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`);
            setSearchValue('');
        }
        if (e.key === 'Escape') {
            setSearchValue('');
            searchRef.current?.blur();
        }
    };

    return (
        <header className="sticky top-0 flex h-14 items-center gap-4 border-b border-border bg-background px-4" style={{zIndex: 40}}>

            {/* Left spacer */}
            <div className="flex-1" />

            {/* Center: Search */}
            <div className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-all w-64',
                searchFocused
                    ? 'border-ring ring-2 ring-ring/30 bg-background'
                    : 'border-border bg-muted/40 hover:bg-muted/70'
            )}>
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                    ref={searchRef}
                    value={searchValue}
                    onChange={e => setSearchValue(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    onKeyDown={handleSearch}
                    placeholder="Search..."
                    className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-sm"
                />
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                    ⌘K
                </kbd>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1">

                {/* Cart */}
                <button
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none"
                    title="Cart"
                >
                    <ShoppingCart className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </button>

                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none"
                            title="Notifications"
                        >
                            <Bell style={{ width: 18, height: 18 }} />
                            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel className="text-sm font-semibold text-foreground">Notifications</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="py-6 text-center text-sm text-muted-foreground">No new notifications</div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Language */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none"
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
                            <span className="hidden md:inline font-medium text-foreground">{user?.username || 'User'}</span>
                            <ChevronDown style={{ width: 13, height: 13 }} className="opacity-60" />
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
