
export const FONTS = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Roboto', value: '"Roboto", sans-serif' },
    { label: 'Open Sans', value: '"Open Sans", sans-serif' },
    { label: 'Lato', value: '"Lato", sans-serif' },
    { label: 'Montserrat', value: '"Montserrat", sans-serif' },
    { label: 'Playfair Display', value: '"Playfair Display", serif' },
];

export const TEMPLATES = {
    Default: {
        font: 'Inter',
        colors: {
            primary: '#ea384c', // Red (Original)
            secondary: '#2a2f3a', // Dark Slate (Original)
            background: '#0e1116', // Deep Dark Blue (Original)
            surface: '#15171e', // Card BG (Original)
            text: '#fcedd8', // Cream White Text (Original)
            border: '#2a2f3a', // Border (Original)

            // Extended Keys
            cardForeground: '#fcedd8',
            muted: '#2a2f3a',
            mutedForeground: '#a3a3a3',
            accent: '#2a2f3a',
            accentForeground: '#fcedd8',
            input: '#2a2f3a',
            ring: '#ea384c',
        }
    },
    Punk: {
        font: 'Montserrat',
        colors: {
            primary: '#db2777', // Pink 600
            secondary: '#7e22ce', // Purple 700
            background: '#000000',
            surface: '#18181b', // Zinc 900
            text: '#f4f4f5', // Zinc 100
            border: '#27272a', // Zinc 800
        }
    },
    Corporate: {
        font: 'Roboto',
        colors: {
            primary: '#0f172a', // Slate 900
            secondary: '#64748b', // Slate 500
            background: '#f8fafc',
            surface: '#ffffff',
            text: '#334155', // Slate 700
            border: '#cbd5e1', // Slate 300
        }
    },
    Nature: {
        font: 'Lato',
        colors: {
            primary: '#059669', // Emerald 600
            secondary: '#65a30d', // Lime 600
            background: '#f0fdf4', // Green 50
            surface: '#ffffff',
            text: '#14532d', // Green 900
            border: '#bbf7d0', // Green 200
        }
    }
};

export const COLOR_KEYS = [
    { key: 'primary', label: 'Primary Color (Buttons, Links)' },
    { key: 'secondary', label: 'Secondary Color (Accents)' },
    { key: 'background', label: 'Page Background' },
    { key: 'surface', label: 'Card/Table Background' },
    { key: 'text', label: 'Text Color (Main)' },
    { key: 'border', label: 'Border Color' },

    // Extended Configuration
    { key: 'cardForeground', label: 'Card Text Color' },
    { key: 'muted', label: 'Muted Background (Subtitles)' },
    { key: 'mutedForeground', label: 'Muted Text Color' },
    { key: 'accent', label: 'Accent Background (Hover/Items)' },
    { key: 'accentForeground', label: 'Accent Text Color' },
    { key: 'input', label: 'Input Field Background' },
    { key: 'ring', label: 'Focus Ring Color' },
];

export const IMAGE_KEYS = [
    { key: 'logo', label: 'Top Left Logo URL' },
    { key: 'hero', label: 'Homepage Hero Image URL' },
];
