
import React, { createContext, useContext, useEffect, useState } from 'react';
import { TEMPLATES, FONTS } from '../config/themeOptions';
import { useLanguage } from './LanguageContext';

const ThemeContext = createContext(null);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const { t: originalT, setOverrides } = useLanguage();
    const [config, setConfig] = useState({
        theme: 'Default',
        font: 'Inter',
        colors: TEMPLATES.Default.colors,
        images: {},
        textOverrides: {}
    });
    const [loading, setLoading] = useState(true);

    // Fetch config from backend on mount
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
                const response = await fetch(`${apiUrl}/api/config`);
                if (response.ok) {
                    const data = await response.json();
                    // Merge with defaults to ensure all keys exist
                    const mergedConfig = {
                        ...data,
                        colors: { ...TEMPLATES.Default.colors, ...data.colors },
                        images: { ...data.images },
                        textOverrides: { ...data.textOverrides }
                    };
                    setConfig(mergedConfig);
                }
            } catch (error) {
                console.error('Failed to fetch theme config, using defaults:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    // Apply CSS variables whenever config changes
    useEffect(() => {
        const root = document.documentElement;

        // Apply Colors
        // Helper to convert Hex to HSL "val val val" (no commas, for tailwind opacity)
        const hexToHSL = (hex) => {
            let r = 0, g = 0, b = 0;
            if (hex.length === 4) {
                r = "0x" + hex[1] + hex[1];
                g = "0x" + hex[2] + hex[2];
                b = "0x" + hex[3] + hex[3];
            } else if (hex.length === 7) {
                r = "0x" + hex[1] + hex[2];
                g = "0x" + hex[3] + hex[4];
                b = "0x" + hex[5] + hex[6];
            }
            // Then to HSL
            r /= 255;
            g /= 255;
            b /= 255;
            let cmin = Math.min(r, g, b),
                cmax = Math.max(r, g, b),
                delta = cmax - cmin,
                h = 0,
                s = 0,
                l = 0;

            if (delta === 0)
                h = 0;
            else if (cmax === r)
                h = ((g - b) / delta) % 6;
            else if (cmax === g)
                h = (b - r) / delta + 2;
            else
                h = (r - g) / delta + 4;

            h = Math.round(h * 60);
            if (h < 0) h += 360;

            l = (cmax + cmin) / 2;
            s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
            s = +(s * 100).toFixed(1);
            l = +(l * 100).toFixed(1);

            return `${h} ${s}% ${l}%`;
        }

        // Apply Colors
        Object.entries(config.colors).forEach(([key, value]) => {
            if (value) {
                // Set the theme variable (Hex)
                root.style.setProperty(`--theme-${key}`, value);

                // Set the Tailwind variable (HSL)
                const extendedKeys = [
                    'primary', 'secondary', 'background', 'surface', 'text', 'border',
                    'cardForeground', 'muted', 'mutedForeground', 'accent', 'accentForeground', 'input', 'ring'
                ];

                if (extendedKeys.includes(key)) {
                    const hsl = hexToHSL(value);
                    // Always set the theme-specific HSL variable
                    root.style.setProperty(`--theme-${key}-hsl`, hsl);

                    // Specific Mappings for Tailwind compatibility in Public Theme
                    // Note: These mappings are consumed by the .public-theme class in index.css
                    // We don't need to do anything extra here if index.css maps --theme-* correctly.
                    // But we DO need to ensure index.css has the mappings.
                }
            }
        });

        // Apply Font
        const fontDef = FONTS.find(f => f.label === config.font) || FONTS[0];
        root.style.setProperty('--theme-font', fontDef.value);

        // Update Document Title if overridden? (Optional)
        // if (config.textOverrides['app.title']) {
        //   document.title = config.textOverrides['app.title'];
        // }

    }, [config]);

    // Sync overrides with LanguageContext
    useEffect(() => {
        if (config.textOverrides) {
            setOverrides(config.textOverrides);
        }
    }, [config.textOverrides]);

    // Enhanced translation function
    const t_override = (key) => {
        // Check for override first
        if (config.textOverrides && config.textOverrides[key]) {
            return config.textOverrides[key];
        }
        // Fallback to standard translation
        return originalT(key);
    };

    // Helper to update config locally (for Admin Preview or after Save)
    const updateConfig = (newConfig) => {
        setConfig(newConfig);
    };

    const getImageUrl = (key, fallback) => {
        return (config.images && config.images[key]) ? config.images[key] : fallback;
    };

    return (
        <ThemeContext.Provider value={{
            config,
            updateConfig,
            t: t_override,
            getImageUrl,
            loading
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
