import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Star, Settings, LogOut, Sun, Moon, Monitor, ChevronRight, Layers, Palette, PanelLeft, Check, ChevronsUpDown } from 'lucide-react';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuSeparator, DropdownMenuLabel,
} from './ui/dropdown-menu';
import { api } from '../services/api';
import ServerKitLogo from './ServerKitLogo';
import { SIDEBAR_CATEGORIES, CATEGORY_LABELS, SIDEBAR_PRESETS, getVisibleItems } from './sidebarItems';
import { cn } from '../lib/utils';
import {
    Sidebar as ShadcnSidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    SidebarTrigger,
    useSidebar,
} from './ui/sidebar';

const Sidebar = () => {
    const { open: sidebarOpen } = useSidebar();
    const { user, logout, updateUser } = useAuth();
    const { theme, setTheme, whiteLabel } = useTheme();
    const navigate = useNavigate();
    const [starAnimating, setStarAnimating] = useState(false);
    const [wpInstalled, setWpInstalled] = useState(false);

    useEffect(() => {
        api.getWordPressStatus()
            .then(data => setWpInstalled(!!data?.installed))
            .catch(() => setWpInstalled(false));
    }, []);

    useEffect(() => {
        if (whiteLabel.enabled) return;
        let playCount = 0;
        let timeoutId;
        const triggerAnimation = () => {
            setStarAnimating(true);
            setTimeout(() => setStarAnimating(false), 1500);
            playCount++;
        };
        const scheduleNext = () => {
            const multiplier = playCount + 1;
            const delay = (Math.random() * (11 - 8) * multiplier + 8 * multiplier) * 60 * 1000;
            timeoutId = setTimeout(() => { triggerAnimation(); scheduleNext(); }, delay);
        };
        const initialDelay = setTimeout(() => { triggerAnimation(); scheduleNext(); }, 60000);
        return () => { clearTimeout(initialDelay); clearTimeout(timeoutId); };
    }, [whiteLabel.enabled]);

    const conditions = { wpInstalled };
    const currentPreset = user?.sidebar_config?.preset || 'full';
    const [manualExpanded, setManualExpanded] = useState({});
    const [autoExpanded, setAutoExpanded] = useState(null);
    const location = useLocation();

    const toggleExpand = (itemId) => {
        const currentlyExpanded = manualExpanded[itemId] ?? (autoExpanded === itemId);
        setManualExpanded(prev => ({ ...prev, [itemId]: !currentlyExpanded }));
    };

    const handlePresetSwitch = (presetKey) => {
        if (presetKey === currentPreset) return;
        const config = { preset: presetKey, hiddenItems: [] };
        updateUser({ sidebar_config: config });
        api.updateCurrentUser({ sidebar_config: config }).catch(() => {});
    };

    const visibleItems = useMemo(() => getVisibleItems(user?.sidebar_config), [user?.sidebar_config]);

    const groupedItems = useMemo(() => {
        const groups = {};
        for (const cat of SIDEBAR_CATEGORIES) {
            const items = visibleItems.filter(item => item.category === cat);
            if (items.length > 0) groups[cat] = items;
        }
        return groups;
    }, [visibleItems]);

    useEffect(() => {
        const path = location.pathname;
        let activeParent = null;
        for (const item of visibleItems) {
            if (!item.subItems?.length) continue;
            if (path === item.route || path.startsWith(item.route + '/') ||
                item.subItems.some(sub => path === sub.route || path.startsWith(sub.route + '/'))) {
                activeParent = item.id;
                break;
            }
        }
        setAutoExpanded(activeParent);
        setManualExpanded({});
    }, [location.pathname, visibleItems]);

    const NavIcon = ({ icon }) => {
        const sz = sidebarOpen ? 16 : 18;
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                width={sz} height={sz} className="shrink-0"
                dangerouslySetInnerHTML={{ __html: icon }}
            />
        );
    };

    const renderNavItem = (item) => {
        const hasChildren = item.subItems && item.subItems.length > 0;
        const isExpanded = manualExpanded[item.id] ?? (autoExpanded === item.id);
        const visibleSubs = hasChildren
            ? item.subItems.filter(sub => !sub.requiresCondition || conditions[sub.requiresCondition])
            : [];
        const effectivelyHasChildren = hasChildren && visibleSubs.length > 0;

        return (
            <SidebarMenuItem key={item.id}>
                {effectivelyHasChildren ? (
                    <>
                        <SidebarMenuButton
                            onClick={() => {
                                if (!sidebarOpen && visibleSubs.length > 0) {
                                    navigate(visibleSubs[0].route);
                                } else {
                                    toggleExpand(item.id);
                                }
                            }}
                            isActive={location.pathname.startsWith(item.route)}
                            tooltip={!sidebarOpen ? item.label : undefined}
                        >
                            <NavIcon icon={item.icon} />
                            <span className={cn(!sidebarOpen && 'sr-only')}>{item.label}</span>
                            {sidebarOpen && <ChevronRight className={cn('ml-auto h-4 w-4 transition-transform duration-200', isExpanded && 'rotate-90')} />}
                        </SidebarMenuButton>
                        {sidebarOpen && isExpanded && visibleSubs.length > 0 && (
                            <SidebarMenuSub>
                                {visibleSubs.map(sub => (
                                    <SidebarMenuSubItem key={sub.id}>
                                        <SidebarMenuSubButton
                                            isActive={location.pathname === sub.route || location.pathname.startsWith(sub.route + '/')}
                                            onClick={() => navigate(sub.route)}
                                        >
                                            <NavIcon icon={sub.icon} />
                                            <span>{sub.label}</span>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        )}
                    </>
                ) : (() => {
                    const isActive = item.end
                        ? location.pathname === item.route
                        : location.pathname === item.route || location.pathname.startsWith(item.route + '/');
                    return (
                        <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => navigate(item.route)}
                            tooltip={!sidebarOpen ? item.label : undefined}
                        >
                            <NavIcon icon={item.icon} />
                            <span className={cn(!sidebarOpen && 'sr-only')}>{item.label}</span>
                        </SidebarMenuButton>
                    );
                })()}
            </SidebarMenuItem>
        );
    };

    return (
        <>
        <ShadcnSidebar>
            {/* Header / Brand — with collapse toggle */}
            <SidebarHeader>
                <div className={cn('flex h-[52px] items-center gap-2 px-2', !sidebarOpen && 'justify-center px-0')}>
                    {!sidebarOpen ? (
                        /* Collapsed: only show the expand trigger */
                        <SidebarTrigger />
                    ) : whiteLabel.enabled ? (
                        /* Expanded + whiteLabel */
                        <>
                            {whiteLabel.mode === 'image_full' ? (
                                <div className="flex flex-1 items-center justify-center overflow-hidden" style={{ maxHeight: 36 }}>
                                    {whiteLabel.logoData
                                        ? <img src={whiteLabel.logoData} alt={whiteLabel.brandName || 'Brand'} className="object-contain" style={{ maxHeight: 36 }} />
                                        : <Layers className="h-6 w-6 text-sidebar-foreground/50" />}
                                </div>
                            ) : whiteLabel.mode === 'text_only' ? (
                                <span className="truncate text-sm font-semibold text-sidebar-foreground flex-1">{whiteLabel.brandName || 'Brand'}</span>
                            ) : (
                                <>
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-accent">
                                        {whiteLabel.logoData
                                            ? <img src={whiteLabel.logoData} alt={whiteLabel.brandName || 'Brand'} className="h-full w-full object-contain" />
                                            : <Layers className="h-4 w-4 text-sidebar-foreground/50" />}
                                    </div>
                                    <span className="truncate text-sm font-semibold text-sidebar-foreground flex-1">{whiteLabel.brandName || 'Brand'}</span>
                                </>
                            )}
                            <SidebarTrigger className="ml-auto" />
                        </>
                    ) : (
                        /* Expanded + default ServerKit brand */
                        <>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
                                <ServerKitLogo width={20} height={20} />
                            </div>
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-semibold text-sidebar-foreground">ServerKit</span>
                                <span className="truncate text-[10px] text-sidebar-foreground/50">Server Management</span>
                            </div>
                            <a
                                href="https://github.com/andreamada/ServerKit"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn('brand-star flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sidebar-foreground/40 transition-all hover:text-amber-400', starAnimating && 'animating')}
                                title="Star on GitHub"
                            >
                                <Star className="h-3.5 w-3.5" />
                                <span className="star-particles"><span /><span /><span /><span /><span /><span /></span>
                                <span className="star-ring" />
                                <span className="star-tooltip">Star us!</span>
                            </a>
                            <SidebarTrigger className="ml-auto" />
                        </>
                    )}
                </div>
            </SidebarHeader>

            {/* Nav content */}
            <SidebarContent>
                {SIDEBAR_CATEGORIES.map(cat => {
                    const items = groupedItems[cat];
                    if (!items) return null;
                    return (
                        <SidebarGroup key={cat}>
                            <SidebarGroupLabel>{CATEGORY_LABELS[cat]}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {items.map(renderNavItem)}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    );
                })}
            </SidebarContent>

            {/* Footer / User — Radix DropdownMenu handles portal+z-index */}
            <SidebarFooter>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton size="lg">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            {sidebarOpen && (
                                <>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold" style={{color:'hsl(var(--sidebar-foreground))'}}>{user?.username || 'User'}</span>
                                        <span className="truncate text-xs" style={{color:'hsl(var(--sidebar-foreground) / 0.6)'}}>{user?.email || 'admin'}</span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto h-4 w-4" style={{color:'hsl(var(--sidebar-foreground) / 0.4)', flexShrink:0}} />
                                </>
                            )}
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
                        align="end"
                        sideOffset={8}
                        className="w-64"
                    >
                        <DropdownMenuLabel className="font-normal pb-1">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-foreground">{user?.username || 'User'}</span>
                                <span className="text-xs text-muted-foreground">{user?.email || ''}</span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Theme</p>
                            <div className="flex gap-1 rounded-md bg-muted p-0.5">
                                {[
                                    { val: 'dark', icon: <Moon className="h-3.5 w-3.5" />, title: 'Dark' },
                                    { val: 'light', icon: <Sun className="h-3.5 w-3.5" />, title: 'Light' },
                                    { val: 'system', icon: <Monitor className="h-3.5 w-3.5" />, title: 'System' },
                                ].map(({ val, icon, title }) => (
                                    <button key={val} title={title} onClick={() => setTheme(val)}
                                        className={cn(
                                            'flex flex-1 items-center justify-center rounded py-1.5 text-muted-foreground transition-all text-xs',
                                            theme === val ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
                                        )}>
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="px-2 py-1.5">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sidebar View</p>
                            <div className="flex flex-wrap gap-1">
                                {Object.entries(SIDEBAR_PRESETS).map(([key, preset]) => (
                                    <button key={key} onClick={() => handlePresetSwitch(key)} title={preset.description}
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-all',
                                            currentPreset === key
                                                ? 'border-primary/50 bg-primary/10 text-primary'
                                                : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                                        )}>
                                        {preset.label}
                                        {currentPreset === key && <Check className="h-2 w-2" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <DropdownMenuSeparator />
                        {[
                            { icon: <Palette className="h-3.5 w-3.5" />, label: 'Appearance', path: '/settings/appearance' },
                            { icon: <PanelLeft className="h-3.5 w-3.5" />, label: 'Customize Sidebar', path: '/settings/sidebar' },
                            { icon: <Settings className="h-3.5 w-3.5" />, label: 'All Settings', path: '/settings' },
                        ].map(({ icon, label, path }) => (
                            <DropdownMenuItem key={path} onSelect={() => navigate(path)}
                                className="gap-2 text-xs font-medium cursor-pointer">
                                {icon}
                                {label}
                                <ChevronRight className="ml-auto h-3 w-3 opacity-40" />
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={logout}
                            className="gap-2 text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                            <LogOut className="h-3.5 w-3.5" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>

            <SidebarRail />
        </ShadcnSidebar>
        </>
    );
};

export default Sidebar;
