import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AppHeader from '../components/layout/AppHeader';
import CommandPalette from '../components/CommandPalette';
import LogsDrawer from '../components/LogsDrawer';
import { LogsDrawerProvider } from '../contexts/LogsDrawerContext';
import { SidebarProvider, SidebarInset } from '../components/ui/sidebar';

const DashboardLayout = () => {
    const [paletteOpen, setPaletteOpen] = useState(false);

    const handleKeyDown = useCallback((e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setPaletteOpen(prev => !prev);
        }
    }, []);

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
                <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
                <LogsDrawer />
            </SidebarProvider>
        </LogsDrawerProvider>
    );
};

export default DashboardLayout;
