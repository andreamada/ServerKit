import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import CommandPalette from '../components/CommandPalette';
import LogsDrawer from '../components/LogsDrawer';
import { LogsDrawerProvider } from '../contexts/LogsDrawerContext';

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
            <div className="dashboard-layout">
                <Sidebar />
                <main className="main-content">
                    <Outlet />
                </main>
                <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
                <LogsDrawer />
            </div>
        </LogsDrawerProvider>
    );
};

export default DashboardLayout;
