import React from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const InvestFlowChart = ({ data, language, selectedScenario, maxPosLayers = 0, maxNegLayers = 0, isPdf = false }) => {
    // Format currency
    const formatCurrency = (value) => {
        if (!value && value !== 0) return 'CHF 0';
        return `CHF ${Math.round(value).toLocaleString('de-CH')}`;
    };

    const colors = {
        grid: isPdf ? '#e5e7eb' : '#374151',
        text: isPdf ? '#000000' : '#FFFFFF',
        axis: isPdf ? '#000000' : '#4b5563',
        barInfo: '#6b7280', // Gray for Principal (User Request)
        barValue: '#8b5cf6', // Purple for Value (default)
        barPositive: '#22c55e', // Green for Inflow
        barNegative: '#ef4444', // Red for Outflow
    };

    // Determine color for Value bar based on scenario
    const getValueColor = () => {
        switch (selectedScenario) {
            // case 'p5': return '#ef4444'; // Red
            // case 'p10': return '#f97316'; // Orange
            // case 'p25': return '#eab308'; // Yellow
            // case 'p50': return '#3b82f6'; // Blue
            // case 'p95': return '#22c55e'; // Green
            default: return colors.barValue; // Always Purple (User Request)
        }
    };

    const valueColor = getValueColor();

    // Custom Tooltip
    // [FIX] Update tooltip to show detailed flows if available
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;

            // Reconstruct Net Flow form layers if not present (backward compat) or just use pre-calc netFlow if available
            // d.netFlow should be available from data processing
            const netFlow = d.netFlow || 0;

            return (
                <div className={`p-3 rounded shadow-lg border text-xs min-w-[200px] ${isPdf ? 'bg-white text-black border-gray-300' : 'bg-gray-800 text-white border-gray-700'}`}>
                    <p className="font-bold mb-2 border-b pb-1">{language === 'fr' ? `Année ${label}` : `Year ${label}`}</p>

                    <div className="flex justify-between gap-4 mb-2">
                        <span style={{ color: netFlow >= 0 ? colors.barPositive : colors.barNegative }} className="font-bold">
                            {language === 'fr' ? 'Flux Net Total' : 'Total Net Flow'}:
                        </span>
                        <span className="font-mono font-bold">{formatCurrency(netFlow)}</span>
                    </div>

                    {/* Detailed Positive Flows */}
                    {d.posFlows && d.posFlows.length > 0 && (
                        <div className="mb-2 pl-2 border-l-2 border-green-500/50">
                            {d.posFlows.map((f, i) => (
                                <div key={`pos-${i}`} className="flex justify-between gap-4 text-[10px] opacity-90">
                                    <span>{f.name || 'Inflow'}:</span>
                                    <span className="font-mono">{formatCurrency(f.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Detailed Negative Flows */}
                    {d.negFlows && d.negFlows.length > 0 && (
                        <div className="mb-2 pl-2 border-l-2 border-red-500/50">
                            {d.negFlows.map((f, i) => (
                                <div key={`neg-${i}`} className="flex justify-between gap-4 text-[10px] opacity-90">
                                    <span>{f.name || 'Outflow'}:</span>
                                    <span className="font-mono">{formatCurrency(f.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between gap-4 mb-1 border-t pt-1">
                        <span style={{ color: colors.barInfo }}>
                            {language === 'fr' ? 'Principal Actif' : 'Active Principal'}:
                        </span>
                        <span className="font-mono">{formatCurrency(d.investedPrincipal)}</span>
                    </div>

                    <div className="flex justify-between gap-4 mb-1 font-bold">
                        <span style={{ color: valueColor }}>
                            {language === 'fr' ? 'Valorisation Portefeuille Investi' : 'Invested Portfolio Valuation'} ({selectedScenario.toUpperCase()}):
                        </span>
                        <span className="font-mono">{formatCurrency(d.portfolioValue)}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Generate Stacked Bars for Flows
    // We use a fixed number of layers based on max detected, ensuring consistent coloring/stacking.
    const renderFlowBars = () => {
        const bars = [];

        // Positive Layers
        for (let i = 0; i < maxPosLayers; i++) {
            bars.push(
                <Bar
                    key={`posLayer${i}`}
                    dataKey={`posLayer${i}`}
                    stackId="netFlow"
                    fill={colors.barPositive}
                    stroke="white"
                    strokeWidth={1}
                    name={i === 0 ? (language === 'fr' ? 'Nouvel Invest.' : 'New Invest.') : undefined} // Legend only for first
                    legendType={i === 0 ? 'rect' : 'none'}
                    barSize={20}
                />
            );
        }

        // Negative Layers
        for (let i = 0; i < maxNegLayers; i++) {
            bars.push(
                <Bar
                    key={`negLayer${i}`}
                    dataKey={`negLayer${i}`}
                    stackId="netFlow"
                    fill={colors.barNegative}
                    stroke="white"
                    strokeWidth={1}
                    name={i === 0 ? (language === 'fr' ? 'Sortie Invest.' : 'Invest. Exit') : undefined} // Legend only for first
                    legendType={i === 0 ? 'rect' : 'none'}
                    barSize={20}
                />
            );
        }

        // Fallback if no layers (e.g. initial empty state or simple netFlow backward compat)
        if (maxPosLayers === 0 && maxNegLayers === 0) {
            bars.push(
                <Bar key="netFlowFallback" dataKey="netFlow" stackId="netFlow" name={language === 'fr' ? 'Flux Net' : 'Net Flow'} barSize={20}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.netFlow >= 0 ? colors.barPositive : colors.barNegative} />
                    ))}
                </Bar>
            );
        }

        return bars;
    };

    return (
        <div className="w-full h-full p-4 rounded-lg border" style={{
            backgroundColor: isPdf ? '#ffffff' : 'transparent',
            borderColor: colors.grid,
            height: isPdf ? '100%' : '600px'
        }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barGap={2}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis
                        dataKey="year"
                        stroke={colors.axis}
                        tick={{ fill: colors.text, fontSize: 12 }}
                    />
                    <YAxis
                        stroke={colors.axis}
                        tick={{ fill: colors.text, fontSize: 12 }}
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    {!isPdf && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />}
                    <Legend wrapperStyle={{ color: colors.text }} />

                    <ReferenceLine y={0} stroke={colors.axis} />

                    {/* Render Dynamic Flow Bars */}
                    {renderFlowBars()}

                    {/* Bar 2: Invested Principal */}
                    <Bar dataKey="investedPrincipal" name={language === 'fr' ? 'Principal Actif' : 'Active Principal'} fill={colors.barInfo} barSize={20} />

                    {/* Bar 3: Portfolio Value */}
                    <Bar dataKey="portfolioValue" name={language === 'fr' ? `Valorisation Portefeuille Investi ${selectedScenario.toUpperCase()}` : `Invested Portfolio Valuation ${selectedScenario.toUpperCase()}`} fill={valueColor} barSize={20} />

                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default InvestFlowChart;
