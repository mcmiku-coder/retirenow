
/**
 * verify_fix_3.8.js
 */

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

function calculateMonthlyDeterministicSeries(projection, simStartDate, horizonMonths) {
    const yearlyBreakdown = projection?.yearlyBreakdown || [];
    const series = new Float64Array(horizonMonths + 1);
    if (yearlyBreakdown.length === 0) return series;

    const startDate = toUtcMonthStart(simStartDate);
    const nodes = [];

    // [FIX 3.8 A] Robust D0 reconstruction
    const firstRow = yearlyBreakdown[0];
    const d0Val = (parseFloat(firstRow.cumulativeBalance || 0) - parseFloat(firstRow.annualBalance || 0));
    nodes.push({ monthIndex: 0, value: d0Val });

    yearlyBreakdown.forEach(row => {
        nodes.push({
            monthIndex: getYearEndMonthIndex(startDate, parseInt(row.year)),
            value: parseFloat(row.cumulativeBalance || 0)
        });
    });

    let nodePtr = 0;
    for (let m = 0; m <= horizonMonths; m++) {
        while (nodePtr < nodes.length - 1 && nodes[nodePtr + 1].monthIndex < m) {
            nodePtr++;
        }
        if (nodePtr >= nodes.length - 1) {
            series[m] = nodes[nodes.length - 1].value;
            continue;
        }
        const startNode = nodes[nodePtr];
        const endNode = nodes[nodePtr + 1];
        if (m === startNode.monthIndex) {
            series[m] = startNode.value;
        } else if (m === endNode.monthIndex) {
            series[m] = endNode.value;
        } else {
            const range = endNode.monthIndex - startNode.monthIndex;
            const fraction = (m - startNode.monthIndex) / range;
            series[m] = startNode.value + fraction * (endNode.value - startNode.value);
        }
    }
    return series;
}

// SIMULATE ACCEPTANCE SCENARIO
async function runTest() {
    console.log("--- RUNNING STEP 3.8 VERIFICATION ---");

    const params = {
        projection: {
            yearlyBreakdown: [
                { year: 2026, cumulativeBalance: 105000, annualBalance: 5000 },
                { year: 2027, cumulativeBalance: 110000, annualBalance: 5000 },
                { year: 2028, cumulativeBalance: 115000, annualBalance: 5000 },
                { year: 2049, cumulativeBalance: 200000, annualBalance: 5000 },
                { year: 2050, cumulativeBalance: 245000, annualBalance: 45000 }
            ]
        },
        userData: { theoreticalDeathDate: "2060-01-01" },
        assets: [{ id: 'a1', amount: 100000, strategy: 'Invested' }],
        scenarioData: { investmentSelections: { a1: 'p1' } }
    };

    // [FIX 3.8 B] Align Start Year
    const firstYear = parseInt(params.projection?.yearlyBreakdown?.[0]?.year);
    const simStartYear = !isNaN(firstYear) ? firstYear : new Date().getFullYear();
    const startDate = toUtcMonthStart(`${simStartYear}-01-01`);
    const horizonMonths = (2060 - simStartYear) * 12;

    const detSeries = calculateMonthlyDeterministicSeries(params.projection, startDate, horizonMonths);

    // Mock Principal Path (100k initial, jumps to 145k in 2050)
    const principalPath = new Float64Array(horizonMonths + 1);
    for (let i = 0; i < principalPath.length; i++) {
        const yr = simStartYear + Math.floor(i / 12);
        principalPath[i] = (yr >= 2050) ? 145000 : 100000;
    }

    // [FIX 3.8 C] Invariant Probe Output
    console.log("[Deterministic Verification Probe]", {
        simStartDate: startDate.toISOString(),
        d0_verification: {
            firstRowYear: params.projection.yearlyBreakdown[0].year,
            firstRowCumBalance: Math.round(params.projection.yearlyBreakdown[0].cumulativeBalance),
            firstRowAnnualBalance: Math.round(params.projection.yearlyBreakdown[0].annualBalance),
            chosenD0: Math.round(detSeries[0])
        },
        earlyYears: [0, 1, 2, 3, 4].map(yOffset => {
            const targetYear = simStartYear + yOffset;
            const idx = getYearEndMonthIndex(startDate, targetYear);
            const D = detSeries[idx];
            const P = principalPath[idx];
            return {
                year: targetYear,
                idx,
                D: Math.round(D),
                P: Math.round(P),
                B: Math.round(D - P)
            };
        })
    });
}

runTest();
