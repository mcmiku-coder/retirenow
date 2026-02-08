import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';

import DetailedChart from '../components/DetailedChart';
import DetailedTooltipContent from '../components/DetailedTooltipContent';

const DetailedGraph = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { language } = useLanguage();
    const [chartData, setChartData] = useState([]);
    const [summaryData, setSummaryData] = useState({});
    const [retirementDate, setRetirementDate] = useState(null);

    // Focus Years State
    const [focusYears, setFocusYears] = useState([
        { id: 1, active: false, year: '' },
        { id: 2, active: false, year: '' },
        { id: 3, active: false, year: '' },
        { id: 4, active: false, year: '' }
    ]);

    // Graph Options State
    const [graphOptions, setGraphOptions] = useState({
        showMC5: true, // Default per user request (Main line)
        showMC10: false,
        showMC25: false,
        showMC50: false,
        showActivatedOwnings: false
    });

    const toggleGraphOption = (key) => {
        setGraphOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        // Get data passed from ScenarioResult page
        if (location.state?.yearlyData && location.state?.summaryData) {
            // Process data to add negCosts for the chart
            const processedData = location.state.yearlyData.map(year => ({
                ...year,
                negCosts: -(Math.abs(year.costs || 0))
            }));
            setChartData(processedData);
            setSummaryData(location.state.summaryData);

            // Get retirement date from state
            if (location.state?.retirementDate) {
                setRetirementDate(location.state.retirementDate);
            }

            // Get focusYears from state or localStorage (Persist settings across sessions)
            let loadedYears = null;

            // 1. Try to get from navigation state (ONLY if it has active years)
            // Fix: ScenarioResult passes an empty array by default if no years were selected previously.
            // We must ignore that empty array to allow localStorage to load.
            if (location.state?.focusYears && Array.isArray(location.state.focusYears) && location.state.focusYears.some(y => y.active)) {
                loadedYears = location.state.focusYears;
            }

            // 2. If no active years in state, try localStorage
            if (!loadedYears) {
                const savedFocusYears = localStorage.getItem('retirenow_focusYears');
                if (savedFocusYears) {
                    try {
                        const parsed = JSON.parse(savedFocusYears);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            loadedYears = parsed;
                        }
                    } catch (e) {
                        console.error("Failed to parse saved focus years:", e);
                    }
                }
            }

            // 3. Last resort: If still nothing loaded, AND we have state (even if empty), use it to clear/reset?
            // Actually, if we are here, it means:
            // - State has no active years.
            // - LocalStorage has no data (or failed).
            // In this case, we SHOULD fallback to the default empty state (recieved from location),
            // effectively "clearing" the selection if the user intended to clear it (and it syncs to LS via useEffect).
            if (!loadedYears && location.state?.focusYears && Array.isArray(location.state.focusYears)) {
                loadedYears = location.state.focusYears;
            }

            if (loadedYears) {
                setFocusYears(loadedYears);
            }
        } else {
            // If no data, redirect back
            navigate('/scenario-result');
        }
    }, [location.state, navigate]);

    // Save focusYears to localStorage whenever they change
    useEffect(() => {
        if (focusYears?.length > 0) {
            localStorage.setItem('retirenow_focusYears', JSON.stringify(focusYears));
        }
    }, [focusYears]);

    const handleBack = () => {
        // Pass focusYears back to ScenarioResult so they can be included in the PDF
        console.log('DetailedGraph Navigating Back with state:', {
            ...location.state,
            focusYears: focusYears
        });
        navigate('/result', {
            state: {
                ...location.state, // Preserve existing state if any
                focusYears: focusYears,
                graphOptions: graphOptions
            }
        });
    };

    // Handle focus year changes
    const updateFocusYear = (index, field, value) => {
        const newFocusYears = [...focusYears];
        newFocusYears[index] = { ...newFocusYears[index], [field]: value };

        // Auto-activate if year is selected and was inactive
        if (field === 'year' && value && !newFocusYears[index].active) {
            newFocusYears[index].active = true;
        }

        setFocusYears(newFocusYears);
    };

    // Get available years from chart data
    const availableYears = chartData.map(d => d.year);

    return (
        <div className="flex flex-grow bg-background min-h-screen">
            {/* Left Sidebar - Reduced width to 8% */}
            <div className="w-[8%] bg-card border-r border-border p-3 flex flex-col overflow-y-auto">
                {/* Back Button */}
                <button
                    onClick={handleBack}
                    className="mb-8 px-4 py-2 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors flex items-center justify-center w-full"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    {language === 'fr' ? 'Retour' : 'Back'}
                </button>

                {/* Detailed Years Controls */}
                <div className="mb-6">
                    <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                        {language === 'fr' ? 'Années détaillées' : 'Detailed Years'}
                    </h3>

                    <div className="space-y-6">
                        {focusYears.map((focus, index) => (
                            <div key={focus.id} className="flex flex-col gap-2 p-3 rounded-lg bg-background/50 border border-border/50">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`focus-${focus.id}`}
                                        checked={focus.active}
                                        onCheckedChange={(checked) => updateFocusYear(index, 'active', checked)}
                                    />
                                    <Label
                                        htmlFor={`focus-${focus.id}`}
                                        className="text-xs font-medium cursor-pointer"
                                    >
                                        Focus {focus.id}
                                    </Label>
                                </div>

                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={focus.year}
                                    onChange={(e) => updateFocusYear(index, 'year', e.target.value)}
                                    disabled={!focus.active && false}
                                >
                                    <option value="">{language === 'fr' ? 'Sélectionner...' : 'Select year...'}</option>
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Graph Options Controls */}
                <div className="flex-1">
                    <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                        {language === 'fr' ? 'Projection' : 'Projection'}
                    </h3>
                    <div className="space-y-3">
                        {/* MC 5% */}
                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="opt-mc5"
                                checked={graphOptions.showMC5}
                                onCheckedChange={() => toggleGraphOption('showMC5')}
                                className="h-4 w-4 mt-0.5"
                            />
                            <Label htmlFor="opt-mc5" className="text-xs font-medium cursor-pointer leading-tight">
                                {language === 'fr' ? 'MC 5% (Très Pessimiste)' : 'MC 5% (Very Pessimistic)'}
                            </Label>
                        </div>

                        {/* MC 10% */}
                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="opt-mc10"
                                checked={graphOptions.showMC10}
                                onCheckedChange={() => toggleGraphOption('showMC10')}
                                className="h-4 w-4 mt-0.5"
                            />
                            <Label htmlFor="opt-mc10" className="text-xs font-medium cursor-pointer leading-tight">
                                {language === 'fr' ? 'MC 10% (Pessimiste)' : 'MC 10% (Pessimistic)'}
                            </Label>
                        </div>

                        {/* MC 25% */}
                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="opt-mc25"
                                checked={graphOptions.showMC25}
                                onCheckedChange={() => toggleGraphOption('showMC25')}
                                className="h-4 w-4 mt-0.5"
                            />
                            <Label htmlFor="opt-mc25" className="text-xs font-medium cursor-pointer leading-tight">
                                {language === 'fr' ? 'MC 25% (Conservateur)' : 'MC 25% (Conservative)'}
                            </Label>
                        </div>

                        {/* MC 50% */}
                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="opt-mc50"
                                checked={graphOptions.showMC50}
                                onCheckedChange={() => toggleGraphOption('showMC50')}
                                className="h-4 w-4 mt-0.5"
                            />
                            <Label htmlFor="opt-mc50" className="text-xs font-medium cursor-pointer leading-tight">
                                {language === 'fr' ? 'MC 50% (Médian)' : 'MC 50% (Median)'}
                            </Label>
                        </div>

                        {/* Activated Ownings */}
                        <div className="flex items-start space-x-2 pt-2 border-t border-border/50">
                            <Checkbox
                                id="opt-ownings"
                                checked={graphOptions.showActivatedOwnings}
                                onCheckedChange={() => toggleGraphOption('showActivatedOwnings')}
                                className="h-4 w-4 mt-0.5"
                            />
                            <Label htmlFor="opt-ownings" className="text-xs font-medium cursor-pointer leading-tight">
                                {language === 'fr' ? 'Inclure Avoirs Non-activés' : 'Show Non-Available Assets'}
                            </Label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Graph Area - 92% width */}
            <div className="w-[92%] p-6 flex flex-col bg-background overflow-y-auto">
                {/* Title */}
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-center mb-0 text-foreground">
                        {language === 'fr' ? 'Graphique détaillé des résultats' : 'Detailed Simulation Results Graph'}
                    </h1>
                </div>

                {/* Full-Height Chart - Fixed height container */}
                <div className="mb-8">
                    <DetailedChart
                        chartData={chartData}
                        retirementDate={retirementDate}
                        language={language}
                        focusYears={focusYears}
                        showMC5={graphOptions.showMC5}
                        showMC10={graphOptions.showMC10}
                        showMC25={graphOptions.showMC25}
                        showMC50={graphOptions.showMC50}
                        showActivatedOwnings={graphOptions.showActivatedOwnings}
                    />
                </div>

                {/* Focus Cards Section - 2x2 Grid */}
                {focusYears.some(f => f.active && f.year) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-bottom-4">
                        {focusYears.map((focus) => {
                            if (!focus.active || !focus.year) return null;

                            const yearData = chartData.find(d => String(d.year) === String(focus.year));
                            if (!yearData) return null;

                            return (
                                <div key={focus.id} className="flex flex-col">
                                    <div className="text-xs font-bold text-muted-foreground mb-1 ml-1 uppercase tracking-wider">
                                        Focus {focus.id}
                                    </div>
                                    <DetailedTooltipContent
                                        data={yearData}
                                        language={language}
                                        isPdf={false}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailedGraph;
