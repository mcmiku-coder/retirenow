import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/apiConfig';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import PageHeader from '../../components/PageHeader';
import { Trash2, Plus, GripVertical, Save, Undo, Play, Code, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import PromoClip from '../PromoClip';
import { SCRIPTS as DEFAULT_SCRIPTS } from '../../data/promoClipData'; // Import default scripts from data file

const PromoClipAdmin = ({ token }) => {
    // Configuration State
    const [language, setLanguage] = useState('en');
    const [scripts, setScripts] = useState(DEFAULT_SCRIPTS);

    const [previewMode, setPreviewMode] = useState(false);

    // Save logic
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [voiceSpeed, setVoiceSpeed] = useState(1.05); // Default speed

    // Load Voices
    useEffect(() => {
        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            const langPrefix = language === 'fr' ? 'fr' : 'en';
            const relevantVoices = available.filter(v => v.lang.startsWith(langPrefix));
            setVoices(relevantVoices);

            // Auto-select if not set
            if (!selectedVoice && relevantVoices.length > 0) {
                const preferred = relevantVoices.find(v =>
                    v.name.includes("Google") || v.name.includes("Siri") || v.name.includes("Premium")
                );
                setSelectedVoice(preferred ? preferred.name : relevantVoices[0].name);
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, [language]);


    const [loading, setLoading] = useState(true);

    // Load Config from API
    useEffect(() => {
        const fetchConfig = async () => {
            const activeToken = token || sessionStorage.getItem('admin_token');
            if (!activeToken) return;

            try {
                // Use full URL to bypass proxy issues
                const res = await fetch(`${API_BASE_URL}/api/promo-config`, {
                    headers: { 'Authorization': `Bearer ${activeToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Object.keys(data).length > 0) {
                        if (data.scripts) setScripts(data.scripts);
                        if (data.voiceSettings && data.voiceSettings[language]) {
                            setSelectedVoice(data.voiceSettings[language].voice);
                            setVoiceSpeed(data.voiceSettings[language].speed);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load config:", err);
                toast.error("Failed to load configuration");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [language, token]);


    // Save logic
    const handleSave = async () => {
        const activeToken = token || sessionStorage.getItem('admin_token');
        if (!activeToken) {
            toast.error("Not authenticated");
            return;
        }

        const config = {
            scripts,
            voiceSettings: {
                [language]: {
                    voice: selectedVoice,
                    speed: voiceSpeed
                }
            }
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/promo-config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${activeToken}`
                },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                toast.success("Configuration saved to server!");
            } else {
                const errorText = await res.text();
                console.error("Save failed:", res.status, res.statusText, errorText);
                throw new Error(`Failed to save: ${res.status} ${res.statusText} - ${errorText}`);
            }
        } catch (err) {
            console.error("Save error details:", err);
            toast.error(`Failed to save configuration: ${err.message}`);
        }
    };

    const handleReset = () => {
        if (window.confirm("Reset to default scripts? All changes will be lost.")) {
            setScripts(DEFAULT_SCRIPTS);
            setVoiceSpeed(1.05);
            // Optional: You might want to save the reset state to the server immediately
            // handleSave(); 
            toast.info("Reset to defaults (Click Save to apply)");
        }
    };

    // Text-to-Speech Preview
    const transformText = (text) => text; // Placeholder if needed

    const playSceneAudio = (text) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voiceObj = voices.find(v => v.name === selectedVoice);
        if (voiceObj) utterance.voice = voiceObj;
        utterance.rate = voiceSpeed;
        utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    // Table Helper
    const updateScene = (index, field, value) => {
        const newScripts = { ...scripts };
        newScripts[language][index][field] = value;
        setScripts(newScripts);
    };

    const addScene = (index = -1) => {
        const newScripts = { ...scripts };
        const newId = `scene_${Date.now()}`;
        const newScene = {
            id: newId,
            duration: 0,
            delay: 1.4, // Default delay
            text: "New scene text...",
            image: "/promo/placeholder.jpg",
            subtitle: "New Scene",
            transition: 'fade' // Default
        };

        if (index === -1) {
            newScripts[language].push(newScene);
        } else {
            newScripts[language].splice(index + 1, 0, newScene);
        }

        setScripts(newScripts);
    };

    const removeScene = (index) => {
        const newScripts = { ...scripts };
        newScripts[language].splice(index, 1);
        setScripts(newScripts);
    };

    // Render Preview
    if (previewMode) {
        return (
            <div className="fixed inset-0 z-50 bg-black">
                <Button
                    variant="destructive"
                    className="absolute top-4 left-4 z-[70]"
                    onClick={() => setPreviewMode(false)}
                >
                    Exit Preview
                </Button>
                <PromoClip
                    propScripts={scripts}
                    propLanguage={language}
                    propVoice={selectedVoice}
                    propSpeed={voiceSpeed}
                />
            </div>
        );
    }

    // Generate Source File (Download)
    const handleGenerateSourceFile = () => {
        const sourceCode = `export const SCRIPTS = ${JSON.stringify(scripts, null, 4)};`;

        const blob = new Blob([sourceCode], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'promoClipData.js';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("File 'promoClipData.js' generated! Replace frontend/src/data/promoClipData.js with this file.");
    };

    // Overwrite Source File (Dev Only)
    const handleOverwriteSource = async () => {
        if (!window.confirm("⚠️ DANGER: This will overwrite 'frontend/src/data/promoClipData.js' on the server disk.\n\nAre you running locally and sure you want to do this?")) {
            return;
        }

        try {
            const token = sessionStorage.getItem('admin_token');
            // Use full URL to avoid proxy issues, just in case
            const response = await fetch(`${API_BASE_URL}/api/admin/save-promo-source`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ scripts })
            });

            if (response.ok) {
                toast.success("Source file overwritten successfully! The changes are now hardcoded.");
            } else {
                const data = await response.json();
                toast.error(`Failed to overwrite: ${data.detail}`);
            }
        } catch (error) {
            console.error("Overwrite error:", error);
            toast.error("Error connecting to server");
        }
    };

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="w-full max-w-[95%] mx-auto">
                <PageHeader
                    title="Promo Clip Configuration"
                    subtitle="Manage scenes, text, and voice settings for the promotional video."
                />

                <div className="space-y-6">
                    {/* Actions Toolbar */}
                    <div className="flex justify-end items-center gap-2 mb-6">
                        <Button variant="outline" onClick={handleReset} title="Reset to Defaults">
                            <Undo className="h-4 w-4 mr-2" /> Defaults
                        </Button>
                        <Button variant="destructive" onClick={handleOverwriteSource} title="Directly overwrite the source file on disk (Dev Only)">
                            <Save className="h-4 w-4 mr-2" />
                            Overwrite Source
                        </Button>
                        <Button variant="outline" onClick={handleGenerateSourceFile} title="Download source file to update defaults">
                            <Code className="h-4 w-4 mr-2" />
                            Generate File
                        </Button>
                        <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                            {previewMode ? <><LayoutTemplate className="h-4 w-4 mr-2" /> Edit Mode</> : <><Play className="h-4 w-4 mr-2" /> Preview Mode</>}
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <Save className="h-4 w-4 mr-2" />}
                            Save Config
                        </Button>
                    </div>

                    {/* Global Controls */}
                    <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardContent className="p-4 flex gap-6 items-center flex-wrap">
                            {/* Language */}
                            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${language === 'en' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => setLanguage('fr')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${language === 'fr' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    Français
                                </button>
                            </div>

                            {/* Voice Selector (Box 1) */}
                            <div className="flex-1 min-w-[200px] space-y-1">
                                <Label className="text-xs">Narrator Voice</Label>
                                <Select value={selectedVoice || ''} onValueChange={setSelectedVoice}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="Select Voice" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {voices.map(v => (
                                            <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Speed Selector (Box 2) */}
                            <div className="w-[120px] space-y-1">
                                <Label className="text-xs">Speed (x)</Label>
                                <Select value={voiceSpeed.toString()} onValueChange={(val) => setVoiceSpeed(parseFloat(val))}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0.8">0.8x (Slow)</SelectItem>
                                        <SelectItem value="0.9">0.9x</SelectItem>
                                        <SelectItem value="1.0">1.0x (Normal)</SelectItem>
                                        <SelectItem value="1.05">1.05x</SelectItem>
                                        <SelectItem value="1.1">1.1x</SelectItem>
                                        <SelectItem value="1.2">1.2x (Fast)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>


                    <Card>
                        <CardHeader>
                            <CardTitle>Scene Editor ({language.toUpperCase()})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {scripts[language].map((scene, index) => (
                                    <div key={scene.id || index} className="grid grid-cols-12 gap-4 items-start p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 relative group">
                                        {/* Order / Handle */}
                                        <div className="col-span-1 pt-8 text-center text-slate-400">
                                            <span className="font-mono text-xs">#{index + 1}</span>
                                        </div>

                                        {/* Image Source */}
                                        <div className="col-span-3 space-y-2">
                                            <Label className="text-xs">Image Source</Label>
                                            <Input
                                                value={scene.image}
                                                onChange={(e) => updateScene(index, 'image', e.target.value)}
                                                className="font-mono text-xs"
                                            />
                                            <Label className="text-xs">Subtitle (Overlay)</Label>
                                            <Input
                                                value={scene.subtitle}
                                                onChange={(e) => updateScene(index, 'subtitle', e.target.value)}
                                            />
                                        </div>

                                        {/* Transition & Delay */}
                                        <div className="col-span-2 space-y-2">
                                            <Label className="text-xs">Entry Transition</Label>
                                            <Select
                                                value={scene.transition || 'fade'}
                                                onValueChange={(val) => updateScene(index, 'transition', val)}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fade">Fade In</SelectItem>
                                                    <SelectItem value="zoom">Zoom In</SelectItem>
                                                    <SelectItem value="slide-left">Slide Left</SelectItem>
                                                    <SelectItem value="slide-right">Slide Right</SelectItem>
                                                    <SelectItem value="appear">Appear (Instant)</SelectItem>
                                                    <SelectItem value="blur">Blur In</SelectItem>
                                                    <SelectItem value="drop">Drop In</SelectItem>
                                                    <SelectItem value="glitch">Glitch (Chaos)</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {/* Audio Delay (Box 4) */}
                                            <Label className="text-xs">Audio Delay (sec)</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={scene.delay !== undefined ? scene.delay : 1.4}
                                                onChange={(e) => updateScene(index, 'delay', parseFloat(e.target.value))}
                                                className="h-9"
                                            />
                                        </div>

                                        {/* Text Script */}
                                        <div className="col-span-5 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs">Script Text (Spoken & Displayed)</Label>
                                                {/* Play Button (Box 3) */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 hover:text-green-500"
                                                    onClick={() => playSceneAudio(scene.text)}
                                                    title="Preview Audio"
                                                >
                                                    <Play className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={scene.text}
                                                onChange={(e) => updateScene(index, 'text', e.target.value)}
                                                rows={3}
                                                className="resize-none"
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-1 pt-8 text-right flex flex-col gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-100 h-6 w-6"
                                                onClick={() => removeScene(index)}
                                                title="Remove Scene"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 h-6 w-6"
                                                onClick={() => addScene(index)}
                                                title="Insert Scene Below"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PromoClipAdmin;
