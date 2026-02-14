
const isInvested = true;
const projection = {
    finalBalance: 250000 // Original (possibly incorrect for UI card when invested)
};

const chartData = [
    { year: 2049, cumulativeBalance: 195000, mc5: 195000 },
    { year: 2050, cumulativeBalance: 200000, mc5: 245000 },
    { year: 2051, cumulativeBalance: 245000, mc5: 250000 } // Recomposed baseline = 245k
];

const finalChartRow = chartData[chartData.length - 1];

// RULE 3: Baseline Consistency
const finalBaselineBalance = (isInvested && finalChartRow) ? finalChartRow.cumulativeBalance : projection.finalBalance;
const final5Balance = (isInvested && finalChartRow && finalChartRow.mc5 !== undefined) ? finalChartRow.mc5 : null;

// [UI Baseline Consistency] dev-only probe
if (chartData && chartData.length > 0) {
    console.log("[UI Baseline Consistency]", {
        isInvested,
        chartBaselineFinal: chartData.at(-1)?.cumulativeBalance,
        projectionFinalBalance: projection?.finalBalance,
        baselineCardValue: finalBaselineBalance
    });
}

const canQuitVerdict = isInvested ? (final5Balance >= 0) : (finalBaselineBalance >= 0);

console.log("Verdict Result:", { canQuitVerdict });
