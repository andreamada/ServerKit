import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ResourceTierProvider } from './contexts/ResourceTierContext';
import { ToastContainer } from './components/Toast';
import { LoadingState } from './components/Spinner';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Setup from './pages/Setup';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';

// Lazy-loaded pages
const Applications = lazy(() => import('./pages/Applications'));
const ApplicationDetail = lazy(() => import('./pages/ApplicationDetail'));
const Docker = lazy(() => import('./pages/Docker'));
const Databases = lazy(() => import('./pages/Databases'));
const Domains = lazy(() => import('./pages/Domains'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const Backups = lazy(() => import('./pages/Backups'));
const Terminal = lazy(() => import('./pages/Terminal'));
const Settings = lazy(() => import('./pages/Settings'));
const FileManager = lazy(() => import('./pages/FileManager'));
// FTPServer — absorbed into FileManager page as tab
// Firewall is now part of Security page
const Git = lazy(() => import('./pages/Git'));
const CronJobs = lazy(() => import('./pages/CronJobs'));
const Security = lazy(() => import('./pages/Security'));
const Templates = lazy(() => import('./pages/Templates'));
const WorkflowBuilder = lazy(() => import('./pages/WorkflowBuilder'));
const Servers = lazy(() => import('./pages/Servers'));
const ServerDetail = lazy(() => import('./pages/ServerDetail'));
// Downloads — absorbed into Marketplace page as tab
const WordPress = lazy(() => import('./pages/WordPress'));
const WordPressDetail = lazy(() => import('./pages/WordPressDetail'));
const WordPressProjects = lazy(() => import('./pages/WordPressProjects'));
const WordPressProject = lazy(() => import('./pages/WordPressProject'));
// SSLCertificates — absorbed into Domains page as tab
const Email = lazy(() => import('./pages/Email'));
const SSOCallback = lazy(() => import('./pages/SSOCallback'));
const DatabaseMigration = lazy(() => import('./pages/DatabaseMigration'));
// AgentPlugins, ServerTemplates — absorbed into Servers page as tabs
const Workspaces = lazy(() => import('./pages/Workspaces'));
// DNSZones, SSLCertificates — absorbed into Domains page as tabs
// StatusPages — absorbed into Monitoring page as a tab
// CloudProvision, AgentFleet, FleetMonitor — absorbed into Servers page as tabs
const Marketplace = lazy(() => import('./pages/Marketplace'));

// Page title mapping
const PAGE_TITLES = {
    '/': 'Dashboard',
    '/login': 'Login',
    '/register': 'Register',
    '/setup': 'Setup',
    '/services': 'Services',
    '/apps': 'Applications',
    '/wordpress': 'WordPress Sites',
    '/wordpress/projects': 'WordPress Projects',
    '/templates': 'Templates',
    '/workflow': 'Workflow Builder',
    '/domains': 'Domains',
    '/databases': 'Databases',
    // SSL absorbed into Domains
    '/docker': 'Docker',
    '/servers': 'Servers',
    // Downloads absorbed into Marketplace
    '/git': 'Git Repositories',
    '/files': 'File Manager',
    // FTP absorbed into File Manager
    '/monitoring': 'Monitoring',
    '/backups': 'Backups',
    '/cron': 'Cron Jobs',
    '/security': 'Security',
    '/email': 'Email Server',
    '/terminal': 'Terminal',
    '/settings': 'Settings',
    '/migrate': 'Database Migration',
    // Fleet, Fleet Monitor, Agent Plugins, Server Templates, Cloud — absorbed into Servers
    '/workspaces': 'Workspaces',
    // DNS absorbed into Domains, Status Pages absorbed into Monitoring, Cloud absorbed into Servers
    '/marketplace': 'Marketplace',
};

function PageTitleUpdater() {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;
        let title = PAGE_TITLES[path];

        // Handle dynamic routes and tab sub-routes
        if (!title) {
            // Check if it's a base page with a tab suffix (e.g., /security/firewall)
            const basePath = '/' + path.split('/')[1];
            if (PAGE_TITLES[basePath]) {
                title = PAGE_TITLES[basePath];
            } else if (path.startsWith('/services/')) title = 'Service Details';
            else if (path.startsWith('/apps/')) title = 'Application Details';
            else if (path.startsWith('/servers/')) title = 'Server Details';
            else if (path.startsWith('/wordpress/projects/')) title = 'WordPress Pipeline';
            else if (path.startsWith('/wordpress/')) title = 'WordPress Site';
            else title = 'ServerKit';
        }

        document.title = title ? `${title} | ServerKit` : 'ServerKit';
    }, [location]);

    return null;
}

function PrivateRoute({ children }) {
    const { isAuthenticated, loading, needsSetup, needsMigration } = useAuth();

    if (loading) {
        return <LoadingState />;
    }

    // Priority: migrations > setup > auth
    if (needsMigration) {
        return <Navigate to="/migrate" />;
    }

    if (needsSetup) {
        return <Navigate to="/setup" />;
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
    const { isAuthenticated, loading, needsSetup, needsMigration } = useAuth();

    if (loading) {
        return <LoadingState />;
    }

    // Priority: migrations > setup > auth
    if (needsMigration) {
        return <Navigate to="/migrate" />;
    }

    if (needsSetup) {
        return <Navigate to="/setup" />;
    }

    return isAuthenticated ? <Navigate to="/" /> : children;
}

function SetupRoute({ children }) {
    const { loading, needsSetup, isAuthenticated } = useAuth();

    if (loading) {
        return <LoadingState />;
    }

    // If setup is not needed, redirect appropriately
    if (!needsSetup) {
        return isAuthenticated ? <Navigate to="/" /> : <Navigate to="/login" />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Suspense fallback={<LoadingState />}>
        <Routes>
            <Route path="/migrate" element={<DatabaseMigration />} />
            <Route path="/setup" element={
                <SetupRoute>
                    <Setup />
                </SetupRoute>
            } />
            <Route path="/login" element={
                <PublicRoute>
                    <Login />
                </PublicRoute>
            } />
            <Route path="/login/callback/:provider" element={
                <PublicRoute>
                    <SSOCallback />
                </PublicRoute>
            } />
            <Route path="/register" element={
                <PublicRoute>
                    <Register />
                </PublicRoute>
            } />
            <Route path="/" element={
                <PrivateRoute>
                    <DashboardLayout />
                </PrivateRoute>
            }>
                <Route index element={<Dashboard />} />
                <Route path="services" element={<Services />} />
                <Route path="services/:id" element={<ServiceDetail />} />
                <Route path="apps" element={<Navigate to="/services" replace />} />
                <Route path="apps/:id" element={<ApplicationDetail />} />
                <Route path="apps/:id/:tab" element={<ApplicationDetail />} />
                <Route path="wordpress" element={<WordPress />} />
                <Route path="wordpress/projects" element={<WordPressProjects />} />
                <Route path="wordpress/projects/:id" element={<WordPressProject />} />
                <Route path="wordpress/projects/:id/:tab" element={<WordPressProject />} />
                <Route path="wordpress/:id" element={<WordPressDetail />} />
                <Route path="wordpress/:id/:tab" element={<WordPressDetail />} />
                <Route path="templates" element={<Templates />} />
                <Route path="workflow" element={<WorkflowBuilder />} />
                <Route path="domains" element={<Domains />} />
                <Route path="domains/:tab" element={<Domains />} />
                <Route path="databases" element={<Databases />} />
                <Route path="databases/:tab" element={<Databases />} />
                <Route path="ssl" element={<Navigate to="/domains/ssl" replace />} />
                <Route path="docker" element={<Docker />} />
                <Route path="docker/:tab" element={<Docker />} />
                <Route path="servers" element={<Servers />} />
                <Route path="servers/fleet" element={<Servers />} />
                <Route path="servers/monitor" element={<Servers />} />
                <Route path="servers/cloud" element={<Servers />} />
                <Route path="servers/plugins" element={<Servers />} />
                <Route path="servers/config" element={<Servers />} />
                <Route path="servers/:id" element={<ServerDetail />} />
                <Route path="servers/:id/:tab" element={<ServerDetail />} />
                <Route path="fleet" element={<Navigate to="/servers/fleet" replace />} />
                <Route path="fleet-monitor" element={<Navigate to="/servers/monitor" replace />} />
                <Route path="agent-plugins" element={<Navigate to="/servers/plugins" replace />} />
                <Route path="server-templates" element={<Navigate to="/servers/config" replace />} />
                <Route path="cloud" element={<Navigate to="/servers/cloud" replace />} />
                <Route path="workspaces" element={<Workspaces />} />
                <Route path="dns" element={<Navigate to="/domains/dns" replace />} />
                <Route path="status-pages" element={<Navigate to="/monitoring/status-pages" replace />} />
                <Route path="marketplace" element={<Marketplace />} />
                <Route path="marketplace/:tab" element={<Marketplace />} />
                <Route path="downloads" element={<Navigate to="/marketplace/downloads" replace />} />
                <Route path="firewall" element={<Navigate to="/security/firewall" replace />} />
                <Route path="git" element={<Git />} />
                <Route path="git/:tab" element={<Git />} />
                <Route path="files" element={<FileManager />} />
                <Route path="files/:tab" element={<FileManager />} />
                <Route path="ftp" element={<Navigate to="/files/ftp" replace />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="monitoring/:tab" element={<Monitoring />} />
                <Route path="backups" element={<Backups />} />
                <Route path="backups/:tab" element={<Backups />} />
                <Route path="cron" element={<CronJobs />} />
                <Route path="security" element={<Security />} />
                <Route path="security/:tab" element={<Security />} />
                <Route path="email" element={<Email />} />
                <Route path="email/:tab" element={<Email />} />
                <Route path="terminal" element={<Terminal />} />
                <Route path="terminal/:tab" element={<Terminal />} />
                <Route path="settings" element={<Settings />} />
                <Route path="settings/:tab" element={<Settings />} />
            </Route>
        </Routes>
        </Suspense>
    );
}

function App() {
    return (
        <Router>
            <PageTitleUpdater />
            <ThemeProvider>
                <AuthProvider>
                    <ResourceTierProvider>
                        <ToastProvider>
                            <AppRoutes />
                            <ToastContainer />
                        </ToastProvider>
                    </ResourceTierProvider>
                </AuthProvider>
            </ThemeProvider>
        </Router>
    );
}

export default App;
