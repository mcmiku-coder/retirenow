import React from 'react';
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const DetailedChart = ({ chartData, retirementDate, language, isPdf = false }) => {

    // Format currency for display
    const formatCurrency = (value) => {
        if (!value && value !== 0) return 'CHF 0';
        return `CHF ${Math.round(value).toLocaleString('de-CH')}`;
    };

    // Theme colors
    const colors = isPdf ? {
        axis: '#000000',
        grid: '#e5e7eb',
        text: '#000000',
        tooltipBg: '#ffffff',
        tooltipText: '#000000',
        tooltipBorder: '#e5e7eb',
        background: '#ffffff'
    } : {
        axis: '#4b5563',
        grid: '#374151',
        text: '#9ca3af',
        tooltipBg: '#1f2937',
        tooltipText: '#ffffff',
        tooltipBorder: '#374151',
        background: 'transparent'
    };

    // Custom Bar Shape for segmented bars with borders
    const CustomBarShape = (props) => {
        const { x, y, width, height, payload, dataKey } = props;

        // Safety check
        const absHeight = Math.abs(height);
        if (!payload || !absHeight || absHeight < 1) return null;

        const baseFill = props.fill;
        let breakdown = [];

        // Get breakdown data
        if (dataKey === 'income') {
            breakdown = Object.entries(payload.incomeBreakdown || {}).filter(([name]) => !name.includes('(Activated)'));
        } else if (dataKey === 'negCosts') {
            breakdown = Object.entries(payload.costBreakdown || {});
        }

        const rectY = height < 0 ? y + height : y;

        // Filter active items
        const activeItems = breakdown.filter(([_, v]) => Math.abs(parseFloat(v) || 0) > 0);

        // If no breakdown, render solid block
        if (activeItems.length === 0) {
            return <rect x={x} y={rectY} width={width} height={absHeight} fill={baseFill} />;
        }

        // Calculate total
        const totalValue = activeItems.reduce((sum, [_, v]) => sum + Math.abs(parseFloat(v) || 0), 0);

        if (totalValue === 0) {
            return <rect x={x} y={rectY} width={width} height={absHeight} fill={baseFill} />;
        }

        // Sort by size
        const sortedItems = [...activeItems].sort((a, b) => Math.abs(parseFloat(b[1] || 0)) - Math.abs(parseFloat(a[1] || 0)));

        const elements = [];
        let accumulatedHeight = 0;

        sortedItems.forEach(([name, value], index) => {
            const valAbs = Math.abs(parseFloat(value) || 0);
            const segmentHeight = (valAbs / totalValue) * absHeight;

            if (segmentHeight < 0.5) return;

            elements.push(
                <rect
                    key={`rect-${dataKey}-${index}`}
                    x={x}
                    y={rectY + accumulatedHeight}
                    width={width}
                    height={segmentHeight}
                    fill={baseFill}
                />
            );

            // Add separator line (white border between segments)
            if (index < sortedItems.length - 1) {
                elements.push(
                    <line
                        key={`line-${dataKey}-${index}`}
                        x1={x}
                        y1={rectY + accumulatedHeight + segmentHeight}
                        x2={x + width}
                        y2={rectY + accumulatedHeight + segmentHeight}
                        stroke="#ffffff"
                        strokeWidth={1}
                        opacity={0.8}
                    />
                );
            }

            accumulatedHeight += segmentHeight;
        });

        return <g>{elements}</g>;
    };

    // Custom Tooltip Component (Ported from ScenarioResult)
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;

            // Adjust styles for PDF mode vs Web mode
            const containerClass = isPdf
                ? "bg-white text-black p-3 rounded shadow-lg border border-gray-300 text-xs min-w-[600px]"
                : "bg-gray-800 text-white p-3 rounded shadow-lg border border-gray-700 text-xs min-w-[600px]";

            const headerClass = isPdf
                ? "flex justify-between items-center bg-gray-100 p-2 -mx-3 -mt-3 mb-2 border-b border-gray-300 rounded-t"
                : "flex justify-between items-center bg-gray-900/50 p-2 -mx-3 -mt-3 mb-2 border-b border-gray-700 rounded-t";

            const headerTextClass = isPdf ? "font-bold text-sm text-gray-800 pl-1" : "font-bold text-sm text-gray-100 pl-1";

            const labelClass = isPdf ? "text-gray-600 font-normal" : "text-gray-400 font-normal";
            const borderClass = isPdf ? "border-b border-gray-300" : "border-b border-gray-600";
            const topBorderClass = isPdf ? "border-t border-gray-300" : "border-t border-gray-600";


            return (
                <div className={containerClass}>
                    {/* Header Row: Year left, Balances right */}
                    <div className={headerClass}>
                        <p className={headerTextClass}>{language === 'fr' ? `Année ${label}` : `Year ${label}`}</p>

                        <div className="flex gap-4">
                            <div className={`flex items-center gap-2 font-bold ${data.annualBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                <span className={labelClass}>{language === 'fr' ? 'Annuel:' : 'Annual:'}</span>
                                <span>{Math.round(data.annualBalance || (data.income - data.costs)).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 font-bold text-blue-500">
                                <span className={labelClass}>{language === 'fr' ? 'Cumulé:' : 'Cumul:'}</span>
                                <span>{Math.round(data.cumulativeBalance).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6 mb-2 mt-3">
                        <div className="flex-1">
                            <p className={`font-semibold text-green-600 mb-1 ${borderClass} pb-1`}>{language === 'fr' ? 'Revenus (CHF)' : 'Income (CHF)'}</p>
                            {Object.entries(data.incomeBreakdown || {}).map(([name, val]) => (
                                <div key={name} className="flex justify-between gap-4">
                                    <span>{name}</span>
                                    <span>{Math.round(val).toLocaleString()}</span>
                                </div>
                            ))}
                            {data.activatedOwnings > 0 && (
                                <div className="flex justify-between gap-4 text-pink-500 font-medium">
                                    <span>{language === 'fr' ? 'Avoirs activés' : 'Activated Ownings'}</span>
                                    <span>{Math.round(data.activatedOwnings).toLocaleString()}</span>
                                </div>
                            )}
                            <div className={`${topBorderClass} mt-1 pt-1 flex justify-between font-bold`}>
                                <span>Total</span>
                                <span>{Math.round(data.income + (data.activatedOwnings || 0)).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex-1">
                            <p className={`font-semibold text-red-500 mb-1 ${borderClass} pb-1`}>{language === 'fr' ? 'Dépenses (CHF)' : 'Costs (CHF)'}</p>
                            {Object.entries(data.costBreakdown || {}).map(([name, val]) => (
                                <div key={name} className="flex justify-between gap-4">
                                    <span>{name}</span>
                                    <span>{Math.round(val).toLocaleString()}</span>
                                </div>
                            ))}
                            <div className={`${topBorderClass} mt-1 pt-1 flex justify-between font-bold`}>
                                <span>Total</span>
                                <span>{Math.round(data.costs).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex-1 rounded-lg p-4 border" style={{
            height: isPdf ? '100%' : '880px',
            backgroundColor: colors.background,
            borderColor: isPdf ? 'transparent' : colors.grid
        }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 120, left: 60, bottom: 60 }}
                    stackOffset="sign"
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                        dataKey="year"
                        tick={{ fontSize: isPdf ? 12 : 18, fill: colors.text }} // Smaller font for PDF
                        stroke={colors.axis}
                        interval={0} // Force show all years
                    />
                    <YAxis
                        label={{ value: 'Amount (CHF)', angle: -90, position: 'insideLeft', fill: colors.text, fontSize: 18 }}
                        tick={{ fontSize: 18, fill: colors.text }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        stroke={colors.axis}
                    />
                    {!isPdf && <Tooltip content={<CustomTooltip />} />}
                    <Legend
                        verticalAlign="top"
                        height={36}
                        wrapperStyle={{ fontSize: isPdf ? '14px' : '21px', color: colors.text }}
                    />

                    {/* Zero reference line */}
                    <ReferenceLine y={0} stroke={isPdf ? "#000000" : "#ffffff"} strokeWidth={2} />

                    {/* Retirement date line */}
                    {retirementDate && (
                        <ReferenceLine
                            x={new Date(retirementDate).getFullYear()}
                            stroke="#f59042"
                            strokeDasharray="3 3"
                            strokeWidth={2}
                            label={{
                                position: 'insideTopRight',
                                dy: 20,
                                value: `Retirement: ${new Date(retirementDate).toLocaleDateString('de-CH')}`,
                                fill: '#f59042',
                                fontSize: 18,
                                fontWeight: 'bold'
                            }}
                        />
                    )}

                    {/* Stacked bars with segmented rendering */}
                    <Bar
                        dataKey="income"
                        fill="#22c55e"
                        name="Income"
                        stackId="stack"
                        barSize={isPdf ? 20 : 30}
                        shape={<CustomBarShape />}
                        isAnimationActive={false}
                    />

                    <Bar
                        dataKey="negCosts"
                        fill="#ef4444"
                        name="Costs"
                        stackId="stack"
                        barSize={isPdf ? 20 : 30}
                        shape={<CustomBarShape />}
                        isAnimationActive={false}
                    />

                    {/* Cumulative balance line with ending balance label */}
                    <Line
                        type="monotone"
                        dataKey="cumulativeBalance"
                        stroke="#eab308"
                        strokeWidth={3}
                        name="Cumulative Balance"
                        dot={false}
                        isAnimationActive={false}
                        label={(props) => {
                            const { x, y, value, index } = props;
                            if (chartData && index === chartData.length - 1) {
                                return (
                                    <text
                                        x={x}
                                        y={y}
                                        dx={10}
                                        dy={4}
                                        fill="#eab308"
                                        fontSize={18}
                                        fontWeight="bold"
                                        textAnchor="start"
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {Math.round(value).toLocaleString('de-CH')}
                                    </text>
                                );
                            }
                            return null;
                        }}
                    />

                    {/* Area fill - NO name prop to avoid duplicate legend */}
                    <Area
                        type="monotone"
                        dataKey="cumulativeBalance"
                        fill="#eab308"
                        fillOpacity={0.1}
                        stroke="none"
                        legendType="none"
                        tooltipType="none" // Ensure it doesn't try to show up specifically
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DetailedChart;
