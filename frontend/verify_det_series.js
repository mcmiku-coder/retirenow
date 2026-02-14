
/**
 * Self-contained Simulation Date Utils for verification
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

/**
 * Implementation of calculateMonthlyDeterministicSeries for verification
 */
function calculateMonthlyDeterministicSeries(projection, simStartDate, horizonMonths) {
    const yearlyBreakdown = projection?.yearlyBreakdown || [];
    const series = new Float64Array(horizonMonths + 1);
    if (yearlyBreakdown.length === 0) return series;

    const startDate = toUtcMonthStart(simStartDate);

    const nodes = [];

    // [CLEAN ROOM] Rule 1: Explicit D0 Source
    const d0Val = parseFloat(projection.initialBalance || projection.startingBalance || projection.totalInitial || 0);
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

// SIMULATE THE RUNTIME PROBE
function runStep2Probe() {
    const simStartDateISO = "2049-01-01";
    const horizonMonths = 36;

    const projection = {
        initialBalance: 195000, // Explicitly provided
        yearlyBreakdown: [
            { year: 2049, cumulativeBalance: 200000 },
            { year: 2050, cumulativeBalance: 245000 },
            { year: 2051, cumulativeBalance: 250000 }
        ]
    };

    const detSeries = calculateMonthlyDeterministicSeries(projection, simStartDateISO, horizonMonths);

    if (detSeries) {
        const startDate = toUtcMonthStart(simStartDateISO);
        const simStartYear = startDate.getUTCFullYear();
        const idxYearStart = getYearEndMonthIndex(startDate, simStartYear);
        const idx0 = 0;
        const idx2049 = getYearEndMonthIndex(startDate, 2049);
        const idx2050 = getYearEndMonthIndex(startDate, 2050);

        const firstRow = projection.yearlyBreakdown[0] || {};

        console.log("[Deterministic Verification Probe]", {
            simStartDate: startDate.toISOString(),
            horizonMonths: horizonMonths,
            detSeriesLength: detSeries.length,
            d0_verification: {
                initialBalanceFound: !!(projection.initialBalance || projection.startingBalance || projection.totalInitial),
                chosenD0: detSeries[0],
                firstRowYear: firstRow.year,
                firstRowCumBalance: Math.round(firstRow.cumulativeBalance || 0)
            },
            nodes: {
                idx0: { idx: idx0, val: detSeries[idx0] },
                idxYearEndStart: { year: simStartYear, idx: idxYearStart, val: detSeries[idxYearStart] },
                idx2049: { idx: idx2049, val: detSeries[idx2049] },
                idx2050: { idx: idx2050, val: detSeries[idx2050] }
            },
            first6: Array.from(detSeries.slice(0, 6)).map(v => Math.round(v)),
            last3: Array.from(detSeries.slice(-3)).map(v => Math.round(v))
        });
    }
}

runStep2Probe();
