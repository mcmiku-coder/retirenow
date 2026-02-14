import React from 'react';
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import DetailedTooltipContent from './DetailedTooltipContent';

const DetailedChart = ({ chartData, retirementDate, language, isPdf = false, focusYears = [],
    showMC50 = false, showMC25 = false, showMC10 = false, showMC5 = false, showActivatedOwnings = false
}) => {

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
        text: '#FFFFFF',
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
        } else if (dataKey === 'activatedOwnings') {
            breakdown = Object.entries(payload.activatedOwingsBreakdown || {});
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
            return <DetailedTooltipContent data={data} language={language} isPdf={isPdf} />;
        }
        return null;
    };

    // Calculate gradient offset for MC5 line
    const getGradientOffset = () => {
        if (!chartData || chartData.length === 0) return 0.5;
        const dataMax = Math.max(...chartData.map(i => Math.max(i.mc5 || 0, i.cumulativeBalance || 0)));
        const dataMin = Math.min(...chartData.map(i => Math.min(i.mc5 || 0, i.cumulativeBalance || 0)));

        if (dataMax <= 0) return 0;
        if (dataMin >= 0) return 1;

        return dataMax / (dataMax - dataMin);
    };

    const gradientOffset = getGradientOffset();

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
                    <defs>
                        <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={gradientOffset} stopColor="#22c55e" stopOpacity={1} />
                            <stop offset={gradientOffset} stopColor="#ef4444" stopOpacity={1} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                        dataKey="year"
                        tick={{ fontSize: isPdf ? 11 : 15, fill: colors.text }}
                        stroke={colors.axis}
                        interval={0}
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

                    {/* Focus Years Bars */}
                    {focusYears.map((focus, index) => focus.active && focus.year && (
                        <ReferenceLine
                            key={`focus-${index}`}
                            x={parseInt(focus.year)}
                            stroke={isPdf ? "#666666" : "#ffffff"}
                            shape={(props) => {
                                const { x1, y1, x2, y2, stroke, strokeWidth, strokeOpacity } = props;
                                const yTop = Math.min(y1, y2);
                                const yBottom = Math.max(y1, y2);
                                const gap = 30;

                                return (
                                    <line
                                        x1={x1}
                                        y1={yTop + gap}
                                        x2={x2}
                                        y2={yBottom}
                                        stroke={stroke}
                                        strokeWidth={strokeWidth}
                                        strokeOpacity={strokeOpacity}
                                    />
                                );
                            }}
                            label={{
                                position: 'insideTop',
                                dy: 10,
                                value: `F${focus.id}`,
                                fill: isPdf ? "#000000" : "#ffffff",
                                fontSize: 14,
                                fontWeight: 'bold'
                            }}
                        />
                    ))}

                    {/* 1. Activated Ownings Bar (Optional) */}
                    {showActivatedOwnings && (
                        <Bar
                            dataKey="activatedOwnings"
                            fill="#ec4899"
                            name="Activated Ownings"
                            stackId="stack"
                            barSize={isPdf ? 20 : 30}
                            shape={<CustomBarShape />}
                            isAnimationActive={false}
                        />
                    )}

                    {/* 2. Income & Costs Bars (Always Visible) */}
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

                    {/* 3. Monte Carlo Lines (Optional) */}

                    {/* MC 50% (Median - Purple for PDF, Blue for Web) */}
                    {showMC50 && (
                        <Line
                            type="monotone"
                            dataKey="mc50"
                            stroke={isPdf ? "#8e44ad" : "#3b82f6"} // Purple for PDF
                            strokeWidth={2}
                            name={isPdf ? (language === 'fr' ? "MC 50% (Médian)" : "MC 50% (Median)") : "MC 50% (Pessimistic)"}
                            dot={false}
                            isAnimationActive={false}
                            label={(props) => {
                                const { x, y, value, index } = props;
                                if (chartData && index === chartData.length - 1) {
                                    return (
                                        <text x={x} y={y} dx={10} dy={4} fill={isPdf ? "#8e44ad" : "#3b82f6"} fontSize={18} fontWeight="bold" textAnchor="start" style={{ pointerEvents: 'none' }}>
                                            {Math.round(value).toLocaleString('de-CH')}
                                        </text>
                                    );
                                }
                                return null;
                            }}
                        />
                    )}

                    {/* MC 25% (Conservative - Amber/Orange) */}
                    {showMC25 && (
                        <Line
                            type="monotone"
                            dataKey="mc25"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            name="MC 25% (Conservative)"
                            dot={false}
                            isAnimationActive={false}
                            label={(props) => {
                                const { x, y, value, index } = props;
                                if (chartData && index === chartData.length - 1) {
                                    return (
                                        <text x={x} y={y} dx={10} dy={4} fill="#f59e0b" fontSize={18} fontWeight="bold" textAnchor="start" style={{ pointerEvents: 'none' }}>
                                            {Math.round(value).toLocaleString('de-CH')}
                                        </text>
                                    );
                                }
                                return null;
                            }}
                        />
                    )}

                    {/* MC 10% (Very Pessimistic - Red/Orange) */}
                    {showMC10 && (
                        <Line
                            type="monotone"
                            dataKey="mc10"
                            stroke="#dc2626"
                            strokeWidth={2}
                            name="MC 10% (Pessimistic)"
                            dot={false}
                            isAnimationActive={false}
                            label={(props) => {
                                const { x, y, value, index } = props;
                                if (chartData && index === chartData.length - 1) {
                                    return (
                                        <text x={x} y={y} dx={10} dy={4} fill="#dc2626" fontSize={18} fontWeight="bold" textAnchor="start" style={{ pointerEvents: 'none' }}>
                                            {Math.round(value).toLocaleString('de-CH')}
                                        </text>
                                    );
                                }
                                return null;
                            }}
                        />
                    )}

                    {/* MC 5% (Extremely Pessimistic - Blue for PDF, Gradient for Web) */}
                    {showMC5 && (
                        <Line
                            type="monotone"
                            dataKey="mc5"
                            stroke={isPdf ? "#3b82f6" : "url(#splitColor)"} // Blue for PDF
                            strokeWidth={3}
                            name="MC 5% (Very Pessimistic)"
                            dot={false}
                            isAnimationActive={false}
                            label={(props) => {
                                const { x, y, value, index } = props;
                                if (chartData && index === chartData.length - 1) {
                                    const fillColor = isPdf ? "#3b82f6" : (value >= 0 ? "#22c55e" : "#ef4444");
                                    return (
                                        <text
                                            x={x}
                                            y={y}
                                            dx={10}
                                            dy={4}
                                            fill={fillColor}
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
                    )}

                    {/* 4. Baseline (Cumulative Balance - Yellow/Gold) - Always Visible */}
                    <Line
                        type="monotone"
                        dataKey="cumulativeBalance"
                        stroke={(isPdf && (showMC50 || showMC25 || showMC10 || showMC5) && chartData?.[0]?.mc5 !== undefined) ? "#374151" : "#eab308"}
                        strokeDasharray={(isPdf && (showMC50 || showMC25 || showMC10 || showMC5) && chartData?.[0]?.mc5 !== undefined) ? "5 5" : "0"}
                        strokeWidth={3}
                        name={(isPdf && (showMC50 || showMC25 || showMC10 || showMC5) && chartData?.[0]?.mc5 !== undefined) ? (language === 'fr' ? "Ligne de base" : "Base Line") : "Cumulative Balance"}
                        dot={false}
                        isAnimationActive={false}
                        label={(props) => {
                            const { x, y, value, index } = props;
                            // Only show label if MC5 is NOT shown to avoid clutter, or ensure distinct position?
                            // User request implies both can be active. Let's keep it.
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
                        fillOpacity={0.05}
                        stroke="none"
                        legendType="none"
                        tooltipType="none"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DetailedChart;
