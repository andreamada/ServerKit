import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { hexToHsl } from '../lib/utils';

const ThemeContext = createContext(null);

const DEFAULT_ACCENT = '#6366f1';

const DEFAULT_WHITE_LABEL = {
    enabled: false,
    mode: 'image_text',    // 'image_text' | 'image_full' | 'text_only'
    brandName: '',
    logoData: '',          // base64 data URL
    faviconData: '',       // base64 data URL
};

// Get the resolved theme based on current setting and OS preference
function getResolvedTheme(theme) {
    if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
}

// Convert hex to { r, g, b }
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 99, g: 102, b: 241 };
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    };
}

// Derive accent color variants from a hex color
function deriveAccentVariants(hex) {
    const { r, g, b } = hexToRgb(hex);
    // Darken by ~12% for hover
    const darken = (v) => Math.max(0, Math.round(v * 0.88));
    return {
        primary: hex,
        hover: `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`,
        glow: `rgba(${r}, ${g}, ${b}, 0.15)`,
        shadow: `rgba(${r}, ${g}, ${b}, 0.3)`,
    };
}

// Apply custom favicon, or restore defaults when cleared
function applyFavicon(dataUrl) {
    document.querySelectorAll("link[rel*='icon']").forEach(el => {
        if (dataUrl) {
            el.setAttribute('href', dataUrl);
            el.setAttribute('type', 'image/png');
        } else {
            const sizes = el.getAttribute('sizes');
            if (sizes === '32x32') { el.setAttribute('href', '/favicon-32x32.png'); el.setAttribute('type', 'image/png'); }
            else if (sizes === '16x16') { el.setAttribute('href', '/favicon-16x16.png'); el.setAttribute('type', 'image/png'); }
            else { el.setAttribute('href', '/favicon.ico'); el.setAttribute('type', 'image/x-icon'); }
        }
    });
}

// Apply accent CSS custom properties to the document
function applyAccentToDOM(hex) {
    const style = document.documentElement.style;
    const { hover, glow, shadow } = deriveAccentVariants(hex);
    const hsl = hexToHsl(hex);
    style.setProperty('--accent-primary', hex);
    style.setProperty('--accent-hover', hover);
    style.setProperty('--accent-glow', glow);
    style.setProperty('--accent-shadow', shadow);
    style.setProperty('--ring', hsl);
    style.setProperty('--primary', hsl);
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        return localStorage.getItem('theme') || 'dark';
    });

    const [resolvedTheme, setResolvedTheme] = useState(() => {
        const stored = localStorage.getItem('theme') || 'dark';
        return getResolvedTheme(stored);
    });

    const [accentColor, setAccentColorState] = useState(() => {
        return localStorage.getItem('accent_color') || DEFAULT_ACCENT;
    });

    const [whiteLabel, setWhiteLabelState] = useState(() => {
        try {
            const stored = localStorage.getItem('white_label');
            return stored ? { ...DEFAULT_WHITE_LABEL, ...JSON.parse(stored) } : DEFAULT_WHITE_LABEL;
        } catch {
            return DEFAULT_WHITE_LABEL;
        }
    });

    useEffect(() => {
        const loadWhiteLabel = async () => {
            try {
                const res = await api.getWhiteLabel();
                if (res.enabled !== undefined) {
                    setWhiteLabel(res);
                    localStorage.setItem('white_label', JSON.stringify(res));
                }
            } catch (e) {
                console.warn('Failed to load white-label config');
            }
        };
        loadWhiteLabel();
    }, []);

    // Update the DOM attribute, .dark class, and resolved theme
    const applyTheme = useCallback(() => {
        const resolved = getResolvedTheme(theme);
        setResolvedTheme(resolved);
        document.documentElement.setAttribute('data-theme', resolved);
        document.documentElement.style.setProperty('--accent-primary', accentColor);
        const { hover, glow, shadow } = deriveAccentVariants(accentColor);
        document.documentElement.style.setProperty('--accent-hover', hover);
        document.documentElement.style.setProperty('--accent-glow', glow);
        document.documentElement.style.setProperty('--accent-shadow', shadow);
        const hsl = hexToHsl(accentColor);
        document.documentElement.style.setProperty('--ring', hsl);
        document.documentElement.style.setProperty('--primary', hsl);
        document.documentElement.classList.toggle('dark', resolved === 'dark');
    }, [theme, accentColor]);

    // Public setter that updates state, localStorage, and DOM
    const setTheme = useCallback((newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme();
    }, [applyTheme]);

    // Public setter for accent color
    const setAccentColor = useCallback((hex) => {
        setAccentColorState(hex);
        localStorage.setItem('accent_color', hex);
        applyAccentToDOM(hex);
    }, []);

    // Public setter for white label config (accepts partial updates)
    const setWhiteLabel = useCallback((partial) => {
        setWhiteLabelState(prev => {
            const next = { ...prev, ...partial };
            localStorage.setItem('white_label', JSON.stringify(next));
            return next;
        });
    }, []);

    // Listen for OS theme changes when using 'system' theme
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            setResolvedTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // Apply theme and accent on mount
    useEffect(() => {
        applyTheme(theme);
        applyAccentToDOM(accentColor);
    }, [theme, applyTheme, accentColor]);

    // Apply custom favicon whenever white-label favicon changes
    useEffect(() => {
        applyFavicon(whiteLabel.enabled && whiteLabel.faviconData ? whiteLabel.faviconData : '');
    }, [whiteLabel.enabled, whiteLabel.faviconData]);

    const value = {
        theme,           // Current setting: 'dark' | 'light' | 'system'
        resolvedTheme,   // Actual appearance: 'dark' | 'light'
        setTheme,        // Function to change theme
        accentColor,     // Current accent hex color
        setAccentColor,  // Function to change accent color
        whiteLabel,      // White label config object
        setWhiteLabel,   // Function to update white label config
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeContext;
