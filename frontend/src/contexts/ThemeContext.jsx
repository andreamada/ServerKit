import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const DEFAULT_ACCENT = '#6366f1';

const DEFAULT_WHITE_LABEL = {
    enabled: false,
    mode: 'image_text',    // 'image_text' | 'image_full' | 'text_only'
    brandName: '',
    logoData: '',          // base64 data URL
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

// Apply accent CSS custom properties to the document
function applyAccentToDOM(hex) {
    const variants = deriveAccentVariants(hex);
    const style = document.documentElement.style;
    style.setProperty('--accent-primary', variants.primary);
    style.setProperty('--accent-hover', variants.hover);
    style.setProperty('--accent-glow', variants.glow);
    style.setProperty('--accent-shadow', variants.shadow);
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

    // Update the DOM attribute, .dark class, and resolved theme
    const applyTheme = useCallback((newTheme) => {
        const resolved = getResolvedTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        document.documentElement.classList.toggle('dark', resolved === 'dark');
        setResolvedTheme(resolved);
    }, []);

    // Public setter that updates state, localStorage, and DOM
    const setTheme = useCallback((newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
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
