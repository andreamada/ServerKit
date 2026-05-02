import React, { useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AppHeader from '../components/layout/AppHeader';
import CommandPalette from '../components/CommandPalette';
import LogsDrawer from '../components/LogsDrawer';
import { LogsDrawerProvider } from '../contexts/LogsDrawerContext';
import { CommandPaletteProvider, useCommandPalette } from '../contexts/CommandPaletteContext';
import { SidebarProvider, SidebarInset } from '../components/ui/sidebar';

function DashboardLayoutInner() {
    const { open, openPalette, closePalette } = useCommandPalette();

    const handleKeyDown = useCallback((e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openPalette();
        }
    }, [openPalette]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <LogsDrawerProvider>
            <SidebarProvider>
                <Sidebar />
                <SidebarInset>
                    <AppHeader />
                    <main className="main-content flex-1 p-10">
                        <Outlet />
                    </main>
                </SidebarInset>
                <CommandPalette open={open} onClose={closePalette} />
                <LogsDrawer />
            </SidebarProvider>
        </LogsDrawerProvider>
    );
}

const DashboardLayout = () => (
    <CommandPaletteProvider>
        <DashboardLayoutInner />
    </CommandPaletteProvider>
);

export default DashboardLayout;
