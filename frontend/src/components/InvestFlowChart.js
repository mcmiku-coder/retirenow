import React from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell, Scatter, LabelList } from 'recharts';

const InvestFlowChart = ({ data, language, selectedScenario, maxPosLayers = 0, maxNegLayers = 0, isPdf = false }) => {
    // Format currency
    const formatCurrency = (value) => {
        if (!value && value !== 0) return '0';
        return `${Math.round(value).toLocaleString('de-CH')}`;
    };

    const formatShortCurrency = (val) => {
        if (Math.abs(val) >= 1000) {
            return `${(val / 1000).toFixed(0)}k`;
        }
        return Math.round(val).toString();
    };

    const colors = {
        grid: isPdf ? '#e5e7eb' : '#374151',
        text: isPdf ? '#000000' : '#FFFFFF',
        axis: isPdf ? '#000000' : '#4b5563',
        barInfo: '#9ca3af', // Light gray for Principal
        barValue: '#a855f7', // Vivid Purple for Value
        barPositive: '#22c55e', // Green for Inflow
        barNegative: '#ef4444', // Red for Outflow
        separator: isPdf ? '#d1d5db' : 'rgba(255,255,255,0.1)'
    };

    const valueColor = colors.barValue;

    // Custom Label for the Stacked Column
    const CustomStackedLabel = (props) => {
        const { x, y, payload } = props;
        if (!payload) return null;

        const d = payload;
        const totalPos = d.totalPos || 0;
        const totalNeg = d.totalNeg || 0;
        const fontSize = 10;
        const lineSpacing = 12;

        // Determine how many labels we are stacking to adjust offset
        let stackCount = 2; // Principal + Valuation always present
        if (totalPos > 0) stackCount++;
        if (totalNeg < 0) stackCount++;

        // Shift the entire group up based on count
        const groupShift = (stackCount - 1) * lineSpacing;

        return (
            <g transform={`translate(${x},${y - 10 - groupShift})`}>
                {/* 1. Positive Flow (Top) */}
                {totalPos > 0 && (
                    <text
                        x={0} y={0} textAnchor="middle"
                        fill={colors.barPositive} fontSize={fontSize + 1} fontWeight="bold"
                    >
                        +{formatShortCurrency(totalPos)}
                    </text>
                )}

                {/* 2. Principal (Middle-Top) */}
                <text
                    x={0} y={totalPos > 0 ? lineSpacing : 0} textAnchor="middle"
                    fill={colors.barInfo} fontSize={fontSize}
                >
                    {formatShortCurrency(d.investedPrincipal)}
                </text>

                {/* 3. Valuation (Middle-Bottom) */}
                <text
                    x={0} y={(totalPos > 0 ? 2 : 1) * lineSpacing} textAnchor="middle"
                    fill={valueColor} fontSize={fontSize + 1} fontWeight="bold"
                >
                    {formatShortCurrency(d.portfolioValue)}
                </text>

                {/* 4. Negative Flow (Bottom) */}
                {totalNeg < 0 && (
                    <text
                        x={0} y={(stackCount - 1) * lineSpacing} textAnchor="middle"
                        fill={colors.barNegative} fontSize={fontSize + 1} fontWeight="bold"
                    >
                        {formatShortCurrency(totalNeg)}
                    </text>
                )}
            </g>
        );
    };

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const netFlow = d.netFlow || 0;

            const fullFormat = (v) => `CHF ${Math.round(v).toLocaleString('de-CH')}`;

            return (
                <div className={`p-3 rounded shadow-lg border text-xs min-w-[200px] ${isPdf ? 'bg-white text-black border-gray-300' : 'bg-gray-800 text-white border-gray-700'}`}>
                    <p className="font-bold mb-2 border-b pb-1">{language === 'fr' ? `Année ${label}` : `Year ${label}`}</p>

                    <div className="flex justify-between gap-4 mb-2">
                        <span style={{ color: netFlow >= 0 ? colors.barPositive : colors.barNegative }} className="font-bold">
                            {language === 'fr' ? 'Flux Net Total' : 'Total Net Flow'}:
                        </span>
                        <span className="font-mono font-bold">{fullFormat(netFlow)}</span>
                    </div>

                    {/* Detailed Positive Flows */}
                    {d.posFlows && d.posFlows.length > 0 && (
                        <div className="mb-2 pl-2 border-l-2 border-green-500/50">
                            {d.posFlows.map((f, i) => (
                                <div key={`pos-${i}`} className="flex justify-between gap-4 text-[10px] opacity-90">
                                    <span>{f.name || 'Inflow'}:</span>
                                    <span className="font-mono">{fullFormat(f.amount)}</span>
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
                                    <span className="font-mono">{fullFormat(f.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between gap-4 mb-1 border-t pt-1">
                        <span style={{ color: colors.barInfo }}>
                            {language === 'fr' ? 'Principal Actif' : 'Active Principal'}:
                        </span>
                        <span className="font-mono">{fullFormat(d.investedPrincipal)}</span>
                    </div>

                    <div className="flex justify-between gap-4 mb-1 font-bold">
                        <span style={{ color: valueColor }}>
                            {language === 'fr' ? 'Valeur investissements avec gains/pertes accumulés' : 'Investment valuation incl. cumulated gain/loss'} ({selectedScenario.toUpperCase()}):
                        </span>
                        <span className="font-mono">{fullFormat(d.portfolioValue)}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Generate Stacked Bars for Flows
    const renderFlowBars = () => {
        const bars = [];
        for (let i = 0; i < maxPosLayers; i++) {
            bars.push(
                <Bar
                    key={`posLayer${i}`}
                    dataKey={`posLayer${i}`}
                    stackId="netFlow"
                    fill={colors.barPositive}
                    stroke="white"
                    strokeWidth={0.5}
                    name={i === 0 ? (language === 'fr' ? 'Nouvel Invest.' : 'New Invest.') : undefined}
                    legendType={i === 0 ? 'rect' : 'none'}
                    barSize={20}
                />
            );
        }
        for (let i = 0; i < maxNegLayers; i++) {
            bars.push(
                <Bar
                    key={`negLayer${i}`}
                    dataKey={`negLayer${i}`}
                    stackId="netFlow"
                    fill={colors.barNegative}
                    stroke="white"
                    strokeWidth={0.5}
                    name={i === 0 ? (language === 'fr' ? 'Sortie Invest.' : 'Invest. Exit') : undefined}
                    legendType={i === 0 ? 'rect' : 'none'}
                    barSize={20}
                />
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
                    margin={{ top: 80, right: 30, left: 20, bottom: 5 }}
                    barGap={2}
                    stackOffset="sign"
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis
                        dataKey="year"
                        stroke={colors.axis}
                        tick={{ fill: colors.text, fontSize: 12 }}
                    />
                    <YAxis
                        stroke={colors.axis}
                        tick={{ fill: colors.text, fontSize: 11 }}
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                        domain={[0, (dataMax) => dataMax * 1.3]}
                    />
                    {!isPdf && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />}
                    <Legend wrapperStyle={{ color: colors.text, paddingTop: '10px' }} />

                    {/* Year Separators (Placed BETWEEN categories) */}
                    {data.map((entry, index) => {
                        if (index === 0) return null;
                        return (
                            <ReferenceLine
                                key={`sep-${index}`}
                                x={entry.year}
                                stroke={colors.separator}
                                strokeWidth={1}
                                isFront={false}
                                position="start"
                            />
                        );
                    })}

                    <ReferenceLine y={0} stroke={colors.axis} />

                    {/* Render Dynamic Flow Bars */}
                    {renderFlowBars()}

                    {/* Bar 2: Invested Principal */}
                    <Bar dataKey="investedPrincipal" name={language === 'fr' ? 'Principal Actif' : 'Active Principal'} fill={colors.barInfo} barSize={20} />

                    {/* Bar 3: Portfolio Value */}
                    <Bar
                        dataKey="portfolioValue"
                        name={language === 'fr' ? 'Valeur investissements avec gains/pertes accumulés' : 'Investment valuation incl. cumulated gain/loss'}
                        fill={valueColor}
                        barSize={20}
                    />

                    {/* Value Labels (Scatter hack for easy alignment at top of bars) */}
                    <Scatter
                        data={data}
                        dataKey="maxYearlyValue"
                        shape={CustomStackedLabel}
                    />

                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default InvestFlowChart;
