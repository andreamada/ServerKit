import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [setupStatus, setSetupStatus] = useState({
        needsSetup: false,
        registrationEnabled: false,
        ssoProviders: [],
        passwordLoginEnabled: true,
        needsMigration: false,
        migrationInfo: null,
        sessionTimeoutMinutes: 120,
        checked: false
    });
    // Always points to the current logout function — avoids stale closure in the idle timer
    const logoutRef = useRef(null);

    useEffect(() => {
        checkSetupStatus();
    }, []);

    async function checkSetupStatus(retries = 3) {
        try {
            const status = await api.getSetupStatus();
            setSetupStatus({
                needsSetup: status.needs_setup,
                registrationEnabled: status.registration_enabled,
                ssoProviders: status.sso_providers || [],
                passwordLoginEnabled: status.password_login_enabled !== false,
                needsMigration: status.needs_migration || false,
                migrationInfo: status.migration_info || null,
                sessionTimeoutMinutes: parseInt(status.session_timeout_minutes) || 120,
                checked: true
            });

            // Always check auth — user may be mid-onboarding wizard with valid session
            await checkAuth();
        } catch (error) {
            console.error('Setup status check failed:', error);
            // Backend may not be ready yet — retry before falling back
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 2000));
                return checkSetupStatus(retries - 1);
            }
            // Exhausted retries — assume fresh install so user isn't locked out
            setSetupStatus(prev => ({
                ...prev,
                needsSetup: true,
                registrationEnabled: true,
                checked: true
            }));
            await checkAuth();
        }
    }

    async function checkAuth() {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const data = await api.getCurrentUser();
                setUser(data.user);
            } catch (error) {
                console.error('Auth check failed:', error);
                api.clearTokens();
            }
        }
        setLoading(false);
    }

    async function refreshSetupStatus() {
        try {
            const status = await api.getSetupStatus();
            setSetupStatus({
                needsSetup: status.needs_setup,
                registrationEnabled: status.registration_enabled,
                ssoProviders: status.sso_providers || [],
                passwordLoginEnabled: status.password_login_enabled !== false,
                needsMigration: status.needs_migration || false,
                migrationInfo: status.migration_info || null,
                sessionTimeoutMinutes: parseInt(status.session_timeout_minutes) || 120,
                checked: true
            });
        } catch (error) {
            console.error('Failed to refresh setup status:', error);
        }
    }

    async function login(email, password) {
        const data = await api.login(email, password);
        setUser(data.user);
        return data;
    }

    async function register(email, username, password, inviteToken) {
        const data = await api.register(email, username, password, inviteToken);
        setUser(data.user);
        return data;
    }

    async function completeOnboarding(useCases) {
        await api.completeOnboarding(useCases);
        setSetupStatus(prev => ({
            ...prev,
            needsSetup: false,
            registrationEnabled: false,
            checked: true
        }));
    }

    function logout() {
        api.logout();
        setUser(null);
    }

    // Keep ref current so the idle timer never closes over a stale logout
    logoutRef.current = logout;

    // Idle session timeout — fires logout after N minutes with no user activity
    useEffect(() => {
        if (!user) return;
        const ms = (setupStatus.sessionTimeoutMinutes || 120) * 60 * 1000;
        let timer;
        const reset = () => {
            clearTimeout(timer);
            timer = setTimeout(() => logoutRef.current(), ms);
        };
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(e => window.addEventListener(e, reset, { passive: true }));
        reset();
        return () => {
            clearTimeout(timer);
            events.forEach(e => window.removeEventListener(e, reset));
        };
    }, [user, setupStatus.sessionTimeoutMinutes]);

    async function updateUser(data) {
        const response = await api.updateCurrentUser(data);
        setUser(response.user);
        return response;
    }

    async function refreshUser() {
        const data = await api.getCurrentUser();
        setUser(data.user);
        return data.user;
    }

    function hasPermission(feature, level = 'read') {
        if (!user) return false;
        if (user.role === 'admin') return true;
        const perms = user.permissions || {};
        const featurePerms = perms[feature] || {};
        return !!featurePerms[level];
    }

    const value = {
        user,
        setUser,
        loading,
        login,
        register,
        completeOnboarding,
        logout,
        updateUser,
        refreshUser,
        refreshSetupStatus,
        hasPermission,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isDeveloper: user?.role === 'admin' || user?.role === 'developer',
        isViewer: !!user?.role,
        setupStatus,
        needsSetup: setupStatus.needsSetup,
        needsMigration: setupStatus.needsMigration,
        migrationInfo: setupStatus.migrationInfo,
        registrationEnabled: setupStatus.registrationEnabled,
        ssoProviders: setupStatus.ssoProviders,
        passwordLoginEnabled: setupStatus.passwordLoginEnabled,
        sessionTimeoutMinutes: setupStatus.sessionTimeoutMinutes,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
