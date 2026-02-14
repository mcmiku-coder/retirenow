
/**
 * UI FORENSIC SIMULATOR
 */

// Step 1: Mock Utils (same logic as in app)
const toUtcMonthStart = (input) => {
    const d = new Date(input);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

const dateToMonthIndex = (startDateStr, targetDateStr) => {
    const start = toUtcMonthStart(startDateStr);
    const target = toUtcMonthStart(targetDateStr);
    return (target.getUTCFullYear() - start.getUTCFullYear()) * 12 + (target.getUTCMonth() - start.getUTCMonth());
};

const getYearEndMonthIndex = (simulationStartDate, year) => {
    return dateToMonthIndex(simulationStartDate, `${year + 1}-01-01`);
};

// Step 2: Simulate Engine State (Step 1 results)
const simStartDate = toUtcMonthStart("2049-01-01");
const principalPath = new Float64Array(37);
// Year-End 2049 (idx 12) = 0
// Injection happens at idx 12 (Jan 2050)
// Path evolves: P[0..12]=0, P[13..36]=45000
for (let i = 13; i <= 36; i++) principalPath[i] = 45000;

// Step 3: Simulate Deterministic Series (Step 2 results)
const detSeries = new Float64Array(37);
// D0=195k, D12=200k, D24=245k
for (let i = 0; i <= 12; i++) detSeries[i] = 195000 + (i / 12) * 5000;
for (let i = 13; i <= 24; i++) {
    const fraction = (i - 12) / 12;
    detSeries[i] = 200000 + fraction * 45000;
}
for (let i = 25; i <= 36; i++) detSeries[i] = 245000 + ((i - 24) / 12) * 5000;

const mcDetails = {
    simulationStartDate: simStartDate.toISOString(),
    principalPath: principalPath,
    detSeries: detSeries,
    percentiles: {
        p5: new Float64Array(37)
    }
};

const projection = {
    yearlyBreakdown: [
        { year: 2049, cumulativeBalance: 200000, annualBalance: 5000 },
        { year: 2050, cumulativeBalance: 245000, annualBalance: 45000 },
        { year: 2051, cumulativeBalance: 250000, annualBalance: 5000 }
    ]
};

// HELPERS (copied from projectionCalculator.js)
function calculateRecomposedBaselineAtIndex(mcDetails, detSeries, idx) {
    const D = detSeries[idx];
    const P = mcDetails.principalPath[idx];
    return D - P;
}

// THE PROBE (copied from ScenarioResult.js)
console.log("[UI RECOMP META]", {
    simStartDate: simStartDate.toISOString(),
    detSeriesLen: detSeries?.length,
    principalLen: mcDetails?.principalPath?.length,
    p5Len: mcDetails?.percentiles?.p5?.length
});

projection.yearlyBreakdown.forEach((row) => {
    const rowYear = parseInt(row.year);
    const yearEndIdx = getYearEndMonthIndex(simStartDate, rowYear);

    const baseVal = calculateRecomposedBaselineAtIndex(mcDetails, detSeries, yearEndIdx);

    if ([2049, 2050, 2051].includes(rowYear)) {
        console.log("[UI RECOMP PROBE]", {
            rowYear,
            yearEndIdx,
            D_yearEnd: Math.round(baseVal + (mcDetails.principalPath?.[yearEndIdx] || 0)),
            P_yearEnd: Math.round(mcDetails.principalPath?.[yearEndIdx] || 0),
            B_yearEnd: Math.round(baseVal),
            rawProjectionYearEnd: Math.round(row.cumulativeBalance || 0),
            rawAnnualBalance: Math.round(row.annualBalance || 0)
        });
    }
});
