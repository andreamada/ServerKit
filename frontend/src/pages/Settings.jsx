import { useState, useEffect } from 'react';
import useTabParam from '../hooks/useTabParam';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { cn } from '../lib/utils';
import { Separator } from '../components/ui/separator';
import ProfileTab from '../components/settings/ProfileTab';
import SecuritySettingsTab from '../components/settings/SecuritySettingsTab';
import AppearanceTab from '../components/settings/AppearanceTab';
import SidebarSettings from '../components/settings/SidebarSettings';
import WhiteLabelTab from '../components/settings/WhiteLabelTab';
import NotificationsTab from '../components/settings/NotificationsTab';
import SystemTab from '../components/settings/SystemTab';
import UsersTab from '../components/settings/UsersTab';
import ActivityTab from '../components/settings/ActivityTab';
import SiteSettingsTab from '../components/settings/SiteSettingsTab';
import PricingPlansTab from '../components/settings/PricingPlansTab';
import SSOConfigTab from '../components/settings/SSOConfigTab';
import ApiSettingsTab from '../components/settings/ApiSettingsTab';
import MigrationHistoryTab from '../components/settings/MigrationHistoryTab';
import IconReferenceTab from '../components/settings/IconReferenceTab';
import AboutTab from '../components/settings/AboutTab';
import {
    User, Lock, Bell, Sun, LayoutTemplate, Layers,
    Users, Activity, Settings2, CreditCard, LogIn,
    Code, Database, Monitor, Info,
} from 'lucide-react';

const VALID_TABS = ['profile', 'security', 'appearance', 'sidebar', 'whitelabel', 'notifications', 'system', 'users', 'activity', 'site', 'sso', 'api', 'migrations', 'developer', 'about', 'pricing'];

function NavItem({ tab, label, icon: Icon, activeTab, setActiveTab }) {
    const active = activeTab === tab;
    return (
        <button
            onClick={() => setActiveTab(tab)}
            className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
        </button>
    );
}

function NavSection({ title }) {
    return (
        <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground opacity-60">
            {title}
        </p>
    );
}

const Settings = () => {
    const [activeTab, setActiveTab] = useTabParam('/settings', VALID_TABS);
    const { isAdmin } = useAuth();
    const [devMode, setDevMode] = useState(false);

    useEffect(() => {
        if (isAdmin) {
            api.getSystemSettings().then(data => {
                setDevMode(data.dev_mode || false);
            }).catch(() => {});
        }
    }, [isAdmin]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your account and system preferences.</p>
            </div>

            <Separator />

            <div className="flex gap-8">
                {/* Sidebar nav */}
                <nav className="flex w-44 shrink-0 flex-col gap-0.5">
                    <NavSection title="Account" />
                    <NavItem tab="profile"       label="Profile"        icon={User}           activeTab={activeTab} setActiveTab={setActiveTab} />
                    <NavItem tab="security"      label="Security"       icon={Lock}           activeTab={activeTab} setActiveTab={setActiveTab} />
                    <NavItem tab="notifications" label="Notifications"  icon={Bell}           activeTab={activeTab} setActiveTab={setActiveTab} />

                    <NavSection title="Preferences" />
                    <NavItem tab="appearance"    label="Appearance"     icon={Sun}            activeTab={activeTab} setActiveTab={setActiveTab} />
                    <NavItem tab="sidebar"       label="Sidebar"        icon={LayoutTemplate} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <NavItem tab="whitelabel"    label="White Label"    icon={Layers}         activeTab={activeTab} setActiveTab={setActiveTab} />

                    {isAdmin && (
                        <>
                            <NavSection title="Admin" />
                            <NavItem tab="users"    label="Users"         icon={Users}     activeTab={activeTab} setActiveTab={setActiveTab} />
                            <NavItem tab="activity" label="Activity"      icon={Activity}  activeTab={activeTab} setActiveTab={setActiveTab} />
                            <NavItem tab="site"     label="Site Settings" icon={Settings2} activeTab={activeTab} setActiveTab={setActiveTab} />

                            <NavSection title="Workspace" />
                            <NavItem tab="pricing"    label="Pricing Plans" icon={CreditCard} activeTab={activeTab} setActiveTab={setActiveTab} />
                            <NavItem tab="sso"        label="SSO"           icon={LogIn}      activeTab={activeTab} setActiveTab={setActiveTab} />
                            <NavItem tab="api"        label="API"           icon={Code}       activeTab={activeTab} setActiveTab={setActiveTab} />
                            <NavItem tab="migrations" label="Migrations"    icon={Database}   activeTab={activeTab} setActiveTab={setActiveTab} />
                            <NavItem tab="system"     label="System Info"   icon={Monitor}    activeTab={activeTab} setActiveTab={setActiveTab} />
                        </>
                    )}

                    {devMode && isAdmin && (
                        <>
                            <NavSection title="Developer" />
                            <NavItem tab="developer" label="Icon Reference" icon={Code} activeTab={activeTab} setActiveTab={setActiveTab} />
                        </>
                    )}

                    <NavSection title="General" />
                    <NavItem tab="about" label="About" icon={Info} activeTab={activeTab} setActiveTab={setActiveTab} />
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {activeTab === 'profile'       && <ProfileTab />}
                    {activeTab === 'security'      && <SecuritySettingsTab />}
                    {activeTab === 'appearance'    && <AppearanceTab />}
                    {activeTab === 'sidebar'       && <SidebarSettings />}
                    {activeTab === 'whitelabel'    && <WhiteLabelTab />}
                    {activeTab === 'notifications' && <NotificationsTab />}
                    {activeTab === 'users'         && isAdmin && <UsersTab />}
                    {activeTab === 'activity'      && isAdmin && <ActivityTab />}
                    {activeTab === 'site'          && isAdmin && <SiteSettingsTab onDevModeChange={setDevMode} />}
                    {activeTab === 'pricing'       && isAdmin && <PricingPlansTab />}
                    {activeTab === 'sso'           && isAdmin && <SSOConfigTab />}
                    {activeTab === 'api'           && isAdmin && <ApiSettingsTab />}
                    {activeTab === 'migrations'    && isAdmin && <MigrationHistoryTab />}
                    {activeTab === 'system'        && isAdmin && <SystemTab />}
                    {activeTab === 'developer'     && devMode && isAdmin && <IconReferenceTab />}
                    {activeTab === 'about'         && <AboutTab />}
                </div>
            </div>
        </div>
    );
};

export default Settings;
