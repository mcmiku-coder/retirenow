
import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { TEMPLATES, FONTS, COLOR_KEYS, IMAGE_KEYS } from '../../config/themeOptions';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';
import { translations } from '../../utils/translations';
import PageHeader from '../../components/PageHeader';
import { Save, Undo } from 'lucide-react';

const AdminConfigPage = () => {
    const { t } = useLanguage();
    const { config: activeConfig, updateConfig } = useTheme();
    const [config, setLocalConfig] = useState(activeConfig);
    const [loading, setLoading] = useState(false);
    const [selectedLang, setSelectedLang] = useState('en');

    // Sync local state with global config when it loads
    useEffect(() => {
        setLocalConfig(activeConfig);
    }, [activeConfig]);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Get admin key (In a real app, this should be handled by a secure session, 
            // but for this implementation we reused the existing key mechanism logic or context)
            // For now, prompt for key or assume secure session context if implemented.
            // Simplified: we will use a prompt or env var for demo, or better:
            // The user already logged in as Admin, so we might need to send the token.
            // BUT: The server endpoint requires `admin_key` in body as per previous implementation.
            // Let's retrieve it from AuthContext if stored, or prompt.
            // Re-using the prompt logic from Admin Dashboard:

            const adminKey = prompt("Please confirm Admin Key to save changes:", "quit-admin-2024-secret");
            if (!adminKey) {
                setLoading(false);
                return;
            }

            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/admin/config?admin_key=${adminKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                toast.success('Configuration saved successfully');
                updateConfig(config); // Update live context
            } else {
                toast.error('Failed to save configuration');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Error saving configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateChange = (templateName) => {
        const template = TEMPLATES[templateName];
        if (template) {
            setLocalConfig(prev => ({
                ...prev,
                theme: templateName,
                font: template.font,
                colors: { ...template.colors }
            }));
            toast.info(`Applied ${templateName} template settings`);
        }
    };

    const handleColorChange = (key, value) => {
        setLocalConfig(prev => ({
            ...prev,
            colors: { ...prev.colors, [key]: value }
        }));
    };

    const handleImageChange = (key, value) => {
        setLocalConfig(prev => ({
            ...prev,
            images: { ...prev.images, [key]: value }
        }));
    };

    const handleTextOverride = (key, value) => {
        setLocalConfig(prev => {
            const prevOverrides = prev.textOverrides || {};
            // Create specific copy of the selected language object
            const langOverrides = { ...(prevOverrides[selectedLang] || {}) };

            if (value && value.trim() !== '') {
                langOverrides[key] = value;
            } else {
                delete langOverrides[key];
            }

            // Create new root overrides object
            const newOverrides = { ...prevOverrides };

            // Update or remove the language object
            if (Object.keys(langOverrides).length > 0) {
                newOverrides[selectedLang] = langOverrides;
            } else {
                delete newOverrides[selectedLang];
            }

            return { ...prev, textOverrides: newOverrides };
        });
    };

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="w-full max-w-[95%] mx-auto">
                <PageHeader
                    title="White Labeling / Customization"
                    subtitle="Customize the look and feel of your application."
                />

                <div className="space-y-6">
                    {/* Actions Toolbar */}
                    <div className="flex justify-end items-center gap-2 mb-6">
                        <Button variant="outline" onClick={() => setLocalConfig(activeConfig)}>
                            <Undo className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <Save className="h-4 w-4 mr-2" />}
                            {loading ? 'Saving...' : 'Apply & Save'}
                        </Button>
                    </div>

                    <Tabs defaultValue="design" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="design">Design & Branding</TabsTrigger>
                            <TabsTrigger value="content">Text & Content</TabsTrigger>
                        </TabsList>

                        {/* DESIGN TAB */}
                        <TabsContent value="design" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Theme Templates</CardTitle>
                                    <CardDescription>Select a pre-configured theme to start.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex gap-4">
                                    <Select onValueChange={handleTemplateChange} value={config.theme}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Select Template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(TEMPLATES).map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Typography & Colors</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Font Family</Label>
                                            <Select
                                                value={config.font}
                                                onValueChange={(val) => setLocalConfig(prev => ({ ...prev, font: val }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {FONTS.map(f => (
                                                        <SelectItem key={f.label} value={f.label}>{f.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {COLOR_KEYS.map(item => (
                                            <div key={item.key} className="space-y-2">
                                                <Label>{item.label}</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="color"
                                                        value={config.colors[item.key] || '#000000'}
                                                        onChange={(e) => handleColorChange(item.key, e.target.value)}
                                                        className="w-12 h-10 p-1 cursor-pointer"
                                                    />
                                                    <Input
                                                        type="text"
                                                        value={config.colors[item.key] || ''}
                                                        onChange={(e) => handleColorChange(item.key, e.target.value)}
                                                        className="font-mono"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Images & Assets</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {IMAGE_KEYS.map(item => (
                                        <div key={item.key} className="space-y-2">
                                            <Label>{item.label}</Label>
                                            <Input
                                                placeholder="https://..."
                                                value={config.images[item.key] || ''}
                                                onChange={(e) => handleImageChange(item.key, e.target.value)}
                                            />
                                            {config.images[item.key] && (
                                                <div className="mt-2 text-xs text-muted-foreground">
                                                    Preview: <img src={config.images[item.key]} alt="Preview" className="h-8 inline-block ml-2 border rounded" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* CONTENT TAB */}
                        <TabsContent value="content">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>Text Overrides</CardTitle>
                                            <CardDescription>
                                                Customize text labels. Keys are organized by page/section.
                                                Leave "Override" empty to use the system default.
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label>Language to Edit:</Label>
                                            <Select value={selectedLang} onValueChange={setSelectedLang}>
                                                <SelectTrigger className="w-[120px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="en">English (EN)</SelectItem>
                                                    <SelectItem value="fr">Français (FR)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-8">
                                        {Object.entries(translations[selectedLang] || translations.en).map(([sectionKey, sectionValue]) => {
                                            // Helper to flatten nested objects for this section
                                            const flatten = (obj, prefix = '') => {
                                                return Object.keys(obj).reduce((acc, k) => {
                                                    const pre = prefix.length ? prefix + '.' : '';
                                                    if (typeof obj[k] === 'object' && obj[k] !== null) {
                                                        Object.assign(acc, flatten(obj[k], pre + k));
                                                    } else {
                                                        acc[pre + k] = obj[k];
                                                    }
                                                    return acc;
                                                }, {});
                                            };

                                            const flatSection = typeof sectionValue === 'object'
                                                ? flatten(sectionValue)
                                                : { '': sectionValue };

                                            return (
                                                <div key={sectionKey} className="border rounded-lg p-4 bg-muted/20">
                                                    <h3 className="text-lg font-bold mb-4 capitalize text-primary">{sectionKey}</h3>
                                                    <div className="grid grid-cols-[180px_1fr_1fr] gap-4 font-semibold text-sm text-muted-foreground mb-2 px-2">
                                                        <div>Key / Label</div>
                                                        <div>Default ({selectedLang.toUpperCase()})</div>
                                                        <div>Override</div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {Object.entries(flatSection).map(([key, value]) => {
                                                            const fullKey = `${sectionKey}.${key}`;
                                                            // Get current override safely
                                                            const currentOverride = config.textOverrides[selectedLang]?.[fullKey] || '';

                                                            return (
                                                                <div key={fullKey} className="grid grid-cols-[180px_1fr_1fr] gap-4 items-center p-2 bg-card rounded border">
                                                                    <div className="text-xs font-mono text-muted-foreground break-all">
                                                                        {key}
                                                                    </div>
                                                                    <div className="text-sm truncate" title={String(value)}>
                                                                        {String(value)}
                                                                    </div>
                                                                    <Input
                                                                        className="h-8"
                                                                        placeholder="Override..."
                                                                        value={currentOverride}
                                                                        onChange={(e) => handleTextOverride(fullKey, e.target.value)}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};

export default AdminConfigPage;
