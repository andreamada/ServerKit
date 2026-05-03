const SERVICE_TYPES = {
    docker: {
        label: 'Docker',
        color: '#2496ed',
        bgColor: 'rgba(36, 150, 237, 0.1)',
        borderColor: 'rgba(36, 150, 237, 0.2)',
        icon: 'docker',
        tabs: ['overview', 'events', 'logs', 'environment', 'shell', 'metrics', 'settings'],
    },
    flask: {
        label: 'Flask',
        color: '#fcd34d',
        bgColor: 'rgba(252, 211, 77, 0.1)',
        borderColor: 'rgba(252, 211, 77, 0.2)',
        icon: 'flask',
        tabs: ['overview', 'events', 'logs', 'environment', 'packages', 'gunicorn', 'commands', 'metrics', 'settings'],
    },
    django: {
        label: 'Django',
        color: '#34d399',
        bgColor: 'rgba(52, 211, 153, 0.1)',
        borderColor: 'rgba(52, 211, 153, 0.2)',
        icon: 'django',
        tabs: ['overview', 'events', 'logs', 'environment', 'packages', 'gunicorn', 'commands', 'metrics', 'settings'],
    },
    php: {
        label: 'PHP',
        color: '#777bb4',
        bgColor: 'rgba(119, 123, 180, 0.1)',
        borderColor: 'rgba(119, 123, 180, 0.2)',
        icon: 'php',
        tabs: ['overview', 'events', 'logs', 'environment', 'settings'],
    },
    static: {
        label: 'Static',
        color: '#60a5fa',
        bgColor: 'rgba(96, 165, 250, 0.1)',
        borderColor: 'rgba(96, 165, 250, 0.2)',
        icon: 'static',
        tabs: ['overview', 'events', 'environment', 'settings'],
    },
    wordpress: {
        label: 'WordPress',
        color: '#21759b',
        bgColor: 'rgba(33, 117, 155, 0.1)',
        borderColor: 'rgba(33, 117, 155, 0.2)',
        icon: 'wordpress',
        tabs: ['overview', 'events', 'logs', 'environment', 'settings'],
    },
    wp_template: {
        label: 'WP Template',
        color: '#21759b',
        bgColor: 'rgba(33, 117, 155, 0.1)',
        borderColor: 'rgba(33, 117, 155, 0.2)',
        icon: 'wordpress',
        tabs: ['overview', 'events', 'logs', 'environment', 'settings'],
    },
};

const STATUS_CONFIG = {
    running: { label: 'Live', color: '#10b981', dotClass: 'live' },
    stopped: { label: 'Stopped', color: '#71717a', dotClass: 'stopped' },
    deploying: { label: 'Deploying', color: '#f59e0b', dotClass: 'deploying' },
    failed: { label: 'Failed', color: '#ef4444', dotClass: 'failed' },
    building: { label: 'Building', color: '#3b82f6', dotClass: 'building' },
};

const DEPLOY_STATUS = {
    success: { label: 'Live', color: '#10b981' },
    failed: { label: 'Failed', color: '#ef4444' },
    in_progress: { label: 'In Progress', color: '#f59e0b' },
    rolled_back: { label: 'Rolled Back', color: '#71717a' },
    pending: { label: 'Pending', color: '#3b82f6' },
};

export function getServiceType(appType) {
    return SERVICE_TYPES[appType] || {
        label: appType?.charAt(0).toUpperCase() + appType?.slice(1) || 'Unknown',
        color: '#a1a1aa',
        bgColor: 'rgba(161, 161, 170, 0.1)',
        borderColor: 'rgba(161, 161, 170, 0.2)',
        icon: 'default',
        tabs: ['overview', 'events', 'logs', 'environment', 'settings'],
    };
}

export function getStatusConfig(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.stopped;
}

export function getDeployStatus(status) {
    return DEPLOY_STATUS[status] || DEPLOY_STATUS.pending;
}

export function getTabsForType(appType) {
    const type = getServiceType(appType);
    return type.tabs;
}

export function isPythonApp(appType) {
    return ['flask', 'django'].includes(appType);
}

export function isDockerApp(appType) {
    return appType === 'docker';
}

export function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 30) return `${diffDay}d ago`;
    return date.toLocaleDateString();
}

export function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '-';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}m ${sec}s`;
}

export { SERVICE_TYPES, STATUS_CONFIG, DEPLOY_STATUS };
