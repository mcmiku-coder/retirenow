import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useLanguage } from '../context/LanguageContext';

import DetailedChart from '../components/DetailedChart';

const DetailedGraph = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { language } = useLanguage();
    const [chartData, setChartData] = useState([]);
    const [summaryData, setSummaryData] = useState({});
    const [retirementDate, setRetirementDate] = useState(null);

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
        } else {
            // If no data, redirect back
            navigate('/scenario-result');
        }
    }, [location.state, navigate]);

    const handleBack = () => {
        navigate(-1);
    };

    // Format currency for display
    const formatCurrency = (value) => {
        if (!value && value !== 0) return 'CHF 0';
        return `CHF ${Math.round(value).toLocaleString('de-CH')}`;
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Left Sidebar - 10% width */}
            <div className="w-[10%] bg-card border-r border-border p-4 flex flex-col">
                {/* Back Button */}
                <button
                    onClick={handleBack}
                    className="mb-6 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center justify-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </button>

                {/* Placeholder for future checkboxes */}
                <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Options</h3>
                    {/* Future checkbox options will go here */}
                </div>
            </div>

            {/* Main Graph Area - 90% width */}
            <div className="w-[90%] p-6 flex flex-col bg-background">
                {/* Title */}
                <div className="mb-2">
                    <h1 className="text-2xl font-bold text-center mb-0 text-foreground">Detailed Simulation Results Graph</h1>
                </div>

                {/* Full-Height Chart - 880px with dark background */}
                <DetailedChart
                    chartData={chartData}
                    retirementDate={retirementDate}
                    language={language}
                />
            </div>
        </div>
    );
};

export default DetailedGraph;
