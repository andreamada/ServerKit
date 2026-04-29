import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { PanelLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/use-mobile';

// ─── Constants ───────────────────────────────────────────────────────────────
const SIDEBAR_WIDTH = 256; // px
const SIDEBAR_WIDTH_ICON = 56; // px
const TABLET_BREAKPOINT = 1024; // collapse below this

// ─── Context ─────────────────────────────────────────────────────────────────
const SidebarContext = React.createContext(null);

function useSidebar() {
    const ctx = React.useContext(SidebarContext);
    if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider.');
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
function useIsNarrow() {
    const [isNarrow, setIsNarrow] = React.useState(() => window.innerWidth < TABLET_BREAKPOINT);
    React.useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
        const onChange = () => setIsNarrow(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);
    return isNarrow;
}

function SidebarProvider({ defaultOpen = true, children, className, style, ...props }) {
    const isMobile = useIsMobile();
    const isNarrow = useIsNarrow();
    const [open, setOpenState] = React.useState(() => {
        if (window.innerWidth < TABLET_BREAKPOINT) return false;
        try {
            const cookie = document.cookie.split('; ').find(r => r.startsWith('sidebar_state='));
            if (cookie) return cookie.split('=')[1] === 'true';
        } catch { /* ignore */ }
        return defaultOpen;
    });

    // Auto-collapse when viewport shrinks below tablet breakpoint
    React.useEffect(() => {
        if (isNarrow) setOpenState(false);
    }, [isNarrow]);

    const setOpen = React.useCallback((value) => {
        const next = typeof value === 'function' ? value(open) : value;
        setOpenState(next);
        document.cookie = `sidebar_state=${next}; path=/; max-age=${60 * 60 * 24 * 7}`;
    }, [open]);

    const toggleSidebar = React.useCallback(() => setOpen(o => !o), [setOpen]);

    React.useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [toggleSidebar]);

    const ctx = React.useMemo(() => ({
        open, setOpen, toggleSidebar, isMobile,
        collapsed: !open,
        width: open ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON,
    }), [open, setOpen, toggleSidebar, isMobile]);

    return (
        <SidebarContext.Provider value={ctx}>
            <div
                className={cn('flex min-h-screen w-full', className)}
                style={style}
                {...props}
            >
                {children}
            </div>
        </SidebarContext.Provider>
    );
}

// ─── Sidebar shell ─────────────────────────────────────────────────────────────
function Sidebar({ className, children, ...props }) {
    const { open, width } = useSidebar();
    return (
        <aside
            data-slot="sidebar"
            data-state={open ? 'expanded' : 'collapsed'}
            className={cn(
                'relative flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
                'sticky top-0 h-screen shrink-0',
                'transition-[width] duration-200 ease-linear',
                className
            )}
            style={{ width }}
            {...props}
        >
            {children}
        </aside>
    );
}

// ─── Trigger ───────────────────────────────────────────────────────────────────
function SidebarTrigger({ className, ...props }) {
    const { toggleSidebar } = useSidebar();
    return (
        <button
            type="button"
            data-slot="sidebar-trigger"
            onClick={toggleSidebar}
            className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-md',
                'text-foreground/70 hover:bg-accent hover:text-accent-foreground',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                className
            )}
            title="Toggle Sidebar (Ctrl+B)"
            {...props}
        >
            <PanelLeft className="h-4 w-4" />
            <span className="sr-only">Toggle Sidebar</span>
        </button>
    );
}

// ─── Rail (thin click strip on right edge) ─────────────────────────────────────
function SidebarRail({ className, ...props }) {
    const { toggleSidebar } = useSidebar();
    return (
        <button
            type="button"
            data-slot="sidebar-rail"
            aria-label="Toggle Sidebar"
            tabIndex={-1}
            onClick={toggleSidebar}
            className={cn(
                'absolute right-0 inset-y-0 z-20 w-1 cursor-col-resize opacity-0 hover:opacity-100',
                'hover:bg-sidebar-border transition-opacity',
                className
            )}
            {...props}
        />
    );
}

// ─── Inset (main content area) ─────────────────────────────────────────────────
function SidebarInset({ className, ...props }) {
    return (
        <div
            data-slot="sidebar-inset"
            className={cn('flex flex-1 flex-col min-h-screen bg-background', className)}
            {...props}
        />
    );
}

// ─── Header / Footer / Content ─────────────────────────────────────────────────
function SidebarHeader({ className, ...props }) {
    return <div data-slot="sidebar-header" className={cn('flex flex-col gap-2 p-2 shrink-0', className)} {...props} />;
}

function SidebarFooter({ className, ...props }) {
    return <div data-slot="sidebar-footer" className={cn('flex flex-col gap-2 p-2 shrink-0', className)} style={{ overflow: 'visible' }} {...props} />;
}

function SidebarContent({ className, ...props }) {
    return (
        <div
            data-slot="sidebar-content"
            className={cn('flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden', className)}
            {...props}
        />
    );
}

function SidebarSeparator({ className, ...props }) {
    return <div data-slot="sidebar-separator" className={cn('mx-2 h-px bg-sidebar-border', className)} {...props} />;
}

// ─── Groups ─────────────────────────────────────────────────────────────────────
function SidebarGroup({ className, ...props }) {
    return <div data-slot="sidebar-group" className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />;
}

function SidebarGroupLabel({ className, asChild = false, ...props }) {
    const { open } = useSidebar();
    const Comp = asChild ? Slot : 'div';
    return (
        <Comp
            data-slot="sidebar-group-label"
            className={cn(
                'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70',
                'transition-[opacity,height] duration-200 overflow-hidden whitespace-nowrap',
                open ? 'opacity-100' : 'h-0 opacity-0 pointer-events-none',
                className
            )}
            {...props}
        />
    );
}

function SidebarGroupContent({ className, ...props }) {
    return <div data-slot="sidebar-group-content" className={cn('w-full text-sm', className)} {...props} />;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function SidebarMenu({ className, ...props }) {
    return <ul data-slot="sidebar-menu" className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }) {
    return <li data-slot="sidebar-menu-item" className={cn('relative', className)} {...props} />;
}

// ─── MenuButton — hover/active via React state to bypass Tailwind purge ─────────
const SidebarMenuButton = React.forwardRef(function SidebarMenuButton({
    asChild = false,
    isActive = false,
    size = 'default',
    tooltip,
    className,
    children,
    ...props
}, ref) {
    const { open } = useSidebar();
    const [hovered, setHovered] = React.useState(false);
    const Comp = asChild ? Slot : 'button';

    const height = size === 'lg' ? 48 : size === 'sm' ? 28 : 32;

    return (
        <Comp
            ref={ref}
            data-slot="sidebar-menu-button"
            data-active={isActive}
            style={{
                height,
                backgroundColor: isActive
                    ? 'var(--accent-primary, hsl(var(--sidebar-accent)))'
                    : hovered
                        ? 'var(--accent-primary, hsl(var(--sidebar-accent)))'
                        : 'transparent',
                color: isActive || hovered
                    ? 'white'
                    : 'hsl(var(--sidebar-foreground))',
                fontWeight: isActive ? '500' : '400',
            }}
            className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 text-sm',
                'transition-colors duration-100 outline-none',
                'cursor-pointer border-0 bg-transparent text-left',
                size === 'lg' && 'px-2',
                !open && 'justify-center px-0',
                className
            )}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            {...props}
        >
            {asChild ? children : (
                open ? children : (
                    React.Children.toArray(children).find(c =>
                        React.isValidElement(c) && (c.type === 'svg' || (typeof c.type !== 'string' && c.props?.viewBox !== undefined))
                    ) || React.Children.toArray(children)[0]
                )
            )}
        </Comp>
    );
});

// ─── MenuSub ───────────────────────────────────────────────────────────────────
function SidebarMenuSub({ className, ...props }) {
    return (
        <ul
            data-slot="sidebar-menu-sub"
            className={cn('mx-3.5 flex min-w-0 flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5', className)}
            {...props}
        />
    );
}

function SidebarMenuSubItem({ className, ...props }) {
    return <li data-slot="sidebar-menu-sub-item" className={cn('relative', className)} {...props} />;
}

function SidebarMenuSubButton({ asChild = false, isActive = false, size = 'md', className, children, ...props }) {
    const [hovered, setHovered] = React.useState(false);
    const Comp = asChild ? Slot : 'a';
    return (
        <Comp
            data-slot="sidebar-menu-sub-button"
            data-active={isActive}
            style={{
                backgroundColor: isActive ? 'var(--accent-primary, hsl(var(--sidebar-accent)))' : hovered ? 'var(--accent-primary, hsl(var(--sidebar-accent)))' : 'transparent',
                color: isActive || hovered ? 'white' : 'hsl(var(--sidebar-foreground) / 0.7)',
                fontWeight: isActive ? '500' : '400',
            }}
            className={cn(
                'flex h-7 min-w-0 items-center gap-2 rounded-md px-2 outline-none',
                'transition-colors duration-100 cursor-pointer border-0 bg-transparent text-left',
                size === 'sm' ? 'text-xs' : 'text-sm',
                className
            )}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            {...props}
        >
            {children}
        </Comp>
    );
}

// ─── Exports ───────────────────────────────────────────────────────────────────
export {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
};
