import { API_BASE_URL } from '../utils/apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Play, Mic, AlertCircle, Volume2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";

// SCRIPT & SCENE CONFIGURATION
import { SCRIPTS } from '../data/promoClipData';


const PromoClip = ({ propScripts, propLanguage, propVoice, propSpeed }) => {
    // State for live config
    const [liveConfig, setLiveConfig] = useState(null);

    // Determines active values based on Props > LiveConfig > Defaults
    const activeScripts = propScripts || (liveConfig && liveConfig.scripts) || SCRIPTS;
    // For voice/speed, we prioritize props (preview mode), then live config for that language, then defaults
    const activeVoiceOverride = propVoice || (liveConfig && liveConfig.voiceSettings?.[propLanguage || 'en']?.voice);
    const activeSpeedOverride = propSpeed || (liveConfig && liveConfig.voiceSettings?.[propLanguage || 'en']?.speed);

    const [isPlaying, setIsPlaying] = useState(false);
    const currentLanguage = propLanguage || 'en';
    const [internalLanguage, setInternalLanguage] = useState('en');
    const language = propLanguage || internalLanguage;
    const scenes = activeScripts[language] || [];

    const [currentSceneIndex, setCurrentSceneIndex] = useState(-1);
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [imagesLoaded, setImagesLoaded] = useState({});

    const [isArmed, setIsArmed] = useState(false);
    const lastPlayedSceneRef = useRef(-1);

    // Fetch Live Config on Mount
    useEffect(() => {
        if (propScripts) return; // Don't fetch if in preview mode (props provided)


        // ... (existing imports)

        // ...

        const fetchConfig = async () => {
            try {
                // Use full URL to bypass proxy issues
                const res = await fetch(`${API_BASE_URL}/api/promo-config`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && Object.keys(data).length > 0) {
                        setLiveConfig(data);
                    }
                }
            } catch (err) {
                console.error("Failed to load live config", err);
            }
        };
        fetchConfig();
    }, [propScripts]);

    // Voice Loading (Only load if no propVoice provided, or just to have fallback)
    useEffect(() => {
        const loadVoices = () => {
            // ... (existing load logic)
            // ...
            // Only auto-select if we don't have a propVoice
            if (!propVoice) {
                // ... (existing auto-select logic)
            }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, [language, propVoice]);

    // ...

    // Animation Sequencer
    useEffect(() => {
        if (currentSceneIndex < 0 || !scenes || currentSceneIndex >= scenes.length) return;

        const scene = scenes[currentSceneIndex];

        // Determine Voice and Speed
        // Priority: propVoice > selectedVoice > default
        const activeVoiceName = activeVoiceOverride || selectedVoice;
        const activeSpeed = activeSpeedOverride || 1.05;
        const activeDelay = scene.delay !== undefined ? scene.delay * 1000 : 1400; // Convert sec to ms

        if (activeVoiceName) {
            const utterance = new SpeechSynthesisUtterance(scene.text);
            const voiceObj = voices.find(v => v.name === activeVoiceName);
            if (voiceObj) utterance.voice = voiceObj;
            utterance.rate = activeSpeed;
            utterance.pitch = 1.0;
            utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US';

            // ... (event listeners) ...

            // Delay before speaking (DYNAMIC)
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, activeDelay);

        } else {
            // No voice selected, fallback to timer
            const timer = setTimeout(() => {
                setCurrentSceneIndex(prev => prev + 1);
            }, 5000); // Default duration if no voice
            return () => clearTimeout(timer);
        }

    }, [isPlaying, currentSceneIndex, selectedVoice, voices, language, activeVoiceOverride, activeSpeedOverride, activeScripts]);

    const startAnimation = () => {
        setCurrentSceneIndex(0);
        setIsPlaying(true);
    };

    const stopAnimation = () => {
        setIsPlaying(false);
        setCurrentSceneIndex(-1);
        setIsArmed(false);
        lastPlayedSceneRef.current = -1;
        window.speechSynthesis.cancel();
    };

    const testVoice = (voiceName) => {
        const voice = voices.find(v => v.name === voiceName);
        if (voice) {
            const text = language === 'fr'
                ? "La planification de retraite est complexe. Suis-je prêt ?"
                : "Retirement planning is complex. Am I ready?";
            const u = new SpeechSynthesisUtterance(text);
            u.voice = voice;
            u.lang = voice.lang;
            window.speechSynthesis.speak(u);
        }
    };

    const handleTrigger = () => {
        setTimeout(() => {
            setIsArmed(false);
            startAnimation();
        }, 1000); // 1 second delay to hide overlay and start recording
    };

    const currentScene = activeScripts[language][currentSceneIndex];

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative font-sans">
            {/* ARMED OVERLAY - RECORDING FRAME GUIDE */}
            {isArmed && (
                <div
                    className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 cursor-pointer"
                    onClick={handleTrigger}
                >
                    {/* ... (content same) ... */}
                    {/* The Frame: Matches animation container dimensions exactly */}
                    <div className="relative w-full max-w-6xl aspect-video rounded-xl border-4 border-yellow-500 border-dashed flex items-center justify-center bg-black/20 pointer-events-none">

                        {/* Corner Markers for precision */}
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-yellow-500 -mt-2 -ml-2 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-yellow-500 -mt-2 -mr-2 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-yellow-500 -mb-2 -ml-2 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-yellow-500 -mb-2 -mr-2 rounded-br-lg"></div>

                        {/* Instructions Box - Pointer events auto to allow button click if needed */}
                        <div className="pointer-events-auto text-center space-y-6 max-w-lg p-8 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 transition-transform active:scale-95">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-white uppercase tracking-widest">
                                    {language === 'fr' ? 'PRÊT à Enregistrer' : 'READY TO RECORD'}
                                </h2>
                                <p className="text-yellow-500 font-bold uppercase tracking-wide text-sm">
                                    {language === 'fr' ? 'CADREZ LA ZONE JAUNE' : 'FRAME THE YELLOW BOX'}
                                </p>
                            </div>

                            <div className="space-y-3 text-lg text-zinc-300 border-t border-zinc-800 pt-4">
                                <p>1. {language === 'fr' ? 'Lancez l\'outil Capture d\'Écran' : 'Start Snipping Tool (Video)'}</p>
                                <p>2. {language === 'fr' ? 'Sélectionnez TOUT le cadre' : 'Select entire yellow frame'}</p>
                                <p>3. {language === 'fr' ? 'Lancez l\'enregistrement' : 'Start Recording'}</p>
                            </div>

                            {/* BIG TRIGGER BUTTON */}
                            <Button
                                size="lg"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleTrigger();
                                }}
                                className="w-full mt-6 py-8 text-xl font-bold bg-green-600 hover:bg-green-700 animate-pulse border-2 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                            >
                                {language === 'fr' ? 'CLIQUEZ ICI pour Démarrer' : 'CLICK HERE TO START'}
                            </Button>

                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering the start
                                    setIsArmed(false);
                                }}
                                className="w-full mt-2 opacity-50 hover:opacity-100"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* SETUP SCREEN - UPDATED LAYOUT */}
            {!isPlaying && !isArmed && (
                <div className="absolute inset-0 z-50 flex items-start pt-24 justify-center bg-zinc-900">
                    <div className="max-w-2xl w-full p-8 space-y-8">
                        <div className="text-center space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight">Promo Clip Generator v4.5</h1>
                            <p className="text-zinc-400">8 Scenes + Script + Voiceover</p>
                        </div>



                        {/* Instructions */}
                        <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700 space-y-4">
                            <div className="flex gap-4">
                                <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                                <div className="text-sm text-zinc-300 space-y-2">
                                    <p><strong>Missing Images?</strong> Ensure you have preserved screenshots in <code>frontend/public/promo/</code>:</p>
                                    <ul className="list-disc pl-4 space-y-1 text-xs font-mono text-zinc-400">
                                        <li>0-landing_FR.jpg ... 8-simulation_FR.jpg</li>
                                    </ul>
                                </div>
                            </div>
                        </div>



                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <Button size="lg" onClick={startAnimation} className="w-full text-lg py-6 bg-zinc-700 text-white hover:bg-zinc-600">
                                <Play className="mr-2 h-5 w-5" /> {language === 'fr' ? 'Démarrer' : 'Start Now'}
                            </Button>
                            <Button size="lg" onClick={() => setIsArmed(true)} className="w-full text-lg py-6 bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-900">
                                <Mic className="mr-2 h-5 w-5" /> {language === 'fr' ? 'Armer (Pre-Record)' : 'Arm (Pre-Record)'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ANIMATION STAGE */}
            <AnimatePresence mode="wait">
                {isPlaying && currentScene && (
                    <motion.div
                        key={currentScene.id}
                        className="absolute inset-0 flex flex-col items-center justify-center"
                        initial={
                            currentScene.transition === 'appear' ? { opacity: 1 } :
                                currentScene.transition === 'slide-left' ? { x: '100%' } :
                                    currentScene.transition === 'slide-right' ? { x: '-100%' } :
                                        currentScene.transition === 'zoom' ? { scale: 0.5, opacity: 0 } :
                                            currentScene.transition === 'blur' ? { opacity: 0, filter: 'blur(10px)' } :
                                                currentScene.transition === 'drop' ? { y: -50, opacity: 0 } :
                                                    currentScene.transition === 'glitch' ? { opacity: 0, x: -20 } :
                                                        { opacity: 0 }
                        }
                        animate={
                            currentScene.transition === 'appear' ? { opacity: 1 } :
                                currentScene.transition === 'slide-left' ? { x: 0 } :
                                    currentScene.transition === 'slide-right' ? { x: 0 } :
                                        currentScene.transition === 'zoom' ? { scale: 1, opacity: 1 } :
                                            currentScene.transition === 'blur' ? { opacity: 1, filter: 'blur(0px)' } :
                                                currentScene.transition === 'drop' ? { y: 0, opacity: 1 } :
                                                    currentScene.transition === 'glitch' ? {
                                                        opacity: [0, 1, 0.5, 1],
                                                        x: [10, -10, 5, -5, 0],
                                                        scale: [1.1, 0.9, 1.05, 1],
                                                        filter: ["brightness(1)", "brightness(2)", "brightness(1)"]
                                                    } :
                                                        { opacity: 1 }
                        }
                        exit={
                            currentScene.transition === 'appear' ? { opacity: 0 } :
                                currentScene.transition === 'slide-left' ? { x: '-100%', opacity: 0 } :
                                    currentScene.transition === 'slide-right' ? { x: '100%', opacity: 0 } :
                                        currentScene.transition === 'glitch' ? { opacity: 0, scale: 1.5, filter: "brightness(0)" } :
                                            { opacity: 0 }
                        }
                        transition={{
                            duration: currentScene.transition === 'appear' ? 0 :
                                currentScene.transition === 'glitch' ? 0.4 : 0.8,
                            ease: currentScene.transition === 'glitch' ? "anticipate" : "easeOut"
                        }}
                    >
                        {/* 1. Background Blur */}
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110"
                            style={{ backgroundImage: `url(${currentScene.image})` }}
                        />

                        {/* 2. Main Image (Ken Burns Effect default, but can be overridden if needed) */}
                        <div className="relative z-10 w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-900">
                            {imagesLoaded[currentScene.image] ? (
                                <motion.img
                                    src={currentScene.image}
                                    alt={currentScene.id}
                                    className="w-full h-full object-cover object-top"
                                    initial={{ scale: 1.1 }}
                                    animate={{ scale: 1.0 }}
                                    transition={{ duration: currentScene.duration / 1000 || 5, ease: "linear" }}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-zinc-500 bg-zinc-800">
                                    Placeholder: {currentScene.image} not found
                                </div>
                            )}

                            {/* Overlay Gradient for Text */}
                            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 to-transparent" />
                        </div>

                        {/* 3. Text Overlay */}
                        <div className="absolute bottom-12 w-full max-w-4xl text-center space-y-4 z-20 px-8">
                            <motion.h2
                                className="text-sm font-bold uppercase tracking-widest text-blue-400"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                            >
                                {currentScene.subtitle}
                            </motion.h2>
                            <motion.p
                                className="text-lg md:text-xl font-medium leading-relaxed text-white drop-shadow-md max-w-2xl mx-auto bg-black/50 p-4 rounded-xl backdrop-blur-sm"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                "{currentScene.text}"
                            </motion.p>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>

            {/* STOP BUTTON (Hidden UI during recording if possible, but accessible) */}
            {isPlaying && (
                <button
                    onClick={stopAnimation}
                    className="absolute top-4 right-4 z-50 p-2 bg-red-500/20 hover:bg-red-500 text-white rounded-full opacity-0 hover:opacity-100 transition-opacity"
                    title="Stop Recording"
                >
                    <div className="h-3 w-3 bg-red-500 rounded-sm" />
                </button>
            )}
        </div>
    );
};

export default PromoClip;
