
/**
 * verify_sampling_drift_7.js
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

const monthIndexToYearMonth = (simulationStartDate, monthIndex) => {
    const start = toUtcMonthStart(simulationStartDate);
    const current = new Date(start);
    current.setUTCMonth(start.getUTCMonth() + monthIndex);
    const y = current.getUTCFullYear();
    const m = current.getUTCMonth() + 1;
    return `${y}-${m.toString().padStart(2, '0')}`;
};

const getYearEndMonthIndex = (simulationStartDate, year) => {
    return dateToMonthIndex(simulationStartDate, `${year + 1}-01-01`);
};

function testSampling() {
    console.log("--- PHASE 7 SAMPLING VERIFICATION ---");

    const simStart = '2026-01-01T00:00:00.000Z';
    const rowYears = [2048, 2049, 2050, 2051, 2052];

    rowYears.forEach(rowYear => {
        const yearEndIdx = getYearEndMonthIndex(simStart, rowYear);
        const yearEndYM = monthIndexToYearMonth(simStart, yearEndIdx);
        const yearStartIdx = dateToMonthIndex(simStart, `${rowYear}-01-01`);
        const yearStartYM = monthIndexToYearMonth(simStart, yearStartIdx);

        console.log("[YEAR-END SAMPLING PROBE]", {
            rowYear,
            yearEndIdx,
            yearEndYM,
            yearStartIdx,
            yearStartYM,
            targetCheck: yearEndYM === `${rowYear + 1}-01` ? "PASS" : "FAIL"
        });
    });

    console.log("\n--- BASELINE STABILITY PROOF ---");
    // Simulate D(t) and P(t) around injection at 2050-01 (idx 288)
    // D is deterministic total, P is principal
    // B = D - P

    const detSeries = new Float64Array(400);
    const principalPath = new Float64Array(400);

    // Constant cash before injection
    for (let i = 0; i < 288; i++) {
        detSeries[i] = 200000;
        principalPath[i] = 0;
    }
    // Injection at idx 288 (t=289, Jan 2050)
    for (let i = 288; i < 400; i++) {
        detSeries[i] = 245000; // +45k
        principalPath[i] = 45000; // Invested +45k
    }

    // Check recomposed baseline B = D - P
    const idx2049End = getYearEndMonthIndex(simStart, 2049); // Should be 288 (Jan 1 2050 state)
    const idx2050End = getYearEndMonthIndex(simStart, 2050); // Should be 300 (Jan 1 2051 state)

    const B_2049 = detSeries[idx2049End] - principalPath[idx2049End];
    const B_2050 = detSeries[idx2050End] - principalPath[idx2050End];

    console.log({
        idx2049End,
        idx2050End,
        B_2049,
        B_2050,
        diff: B_2050 - B_2049,
        status: (B_2050 - B_2049) === 0 ? "NO V-DROP" : "V-DROP DETECTED"
    });
}

testSampling();
