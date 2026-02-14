
/**
 * verify_phase_5_standalone.js
 */

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

function calculateRecomposedBaselineAtIndex(mcDetails, detSeries, idx) {
    if (!mcDetails || !detSeries || detSeries.length === 0) return 0;

    let origIdx = idx;
    if (!Number.isFinite(idx)) idx = 0;
    if (idx < 0) idx = 0;

    if (origIdx !== idx) console.warn("[RECOMP CLAMP BASELINE]", { origIdx, idx });

    const safeDetIdx = clamp(Math.floor(idx), 0, detSeries.length - 1);
    const D = detSeries[safeDetIdx] || 0;

    const principalPath = mcDetails.principalPath;
    const P = (principalPath && principalPath.length > 0)
        ? principalPath[clamp(Math.floor(idx), 0, principalPath.length - 1)] || 0
        : 0;

    return D - P;
}

function calculateRecomposedTotalAtIndex(mcDetails, detSeries, idx, percentileKey = 'p50') {
    if (!mcDetails || !detSeries || detSeries.length === 0) return 0;

    const B = calculateRecomposedBaselineAtIndex(mcDetails, detSeries, idx);

    let sanitisedIdx = idx;
    if (!Number.isFinite(sanitisedIdx)) sanitisedIdx = 0;
    if (sanitisedIdx < 0) sanitisedIdx = 0;

    const pKey = typeof percentileKey === 'string' ? percentileKey : `p${percentileKey}`;
    const mcPath = mcDetails.percentiles?.[pKey];

    if (!mcPath || mcPath.length === 0) return B;

    const safeMcIdx = clamp(Math.floor(sanitisedIdx), 0, mcPath.length - 1);
    const mcVal = mcPath[safeMcIdx] || 0;

    return B + mcVal;
}

// MOCK DATA
const detSeries = new Float64Array(370);
for (let i = 0; i < 370; i++) detSeries[i] = 100000 + (i / 370) * 145000;

const mcDetails = {
    principalPath: new Float64Array(370).fill(100000),
    percentiles: {
        p5: new Float64Array(370).fill(5000),
        p10: new Float64Array(370).fill(10000)
    },
    simulationStartDate: "2026-01-01T00:00:00.000Z",
    horizonMonths: 369
};

function runTest() {
    console.log("--- PHASE 5 HARDENING PROOF ---");

    // [TEST 1] Standard Positive Run
    console.log("\n[TEST 1] Year 1 (Idx 12)");
    console.log("B(12):", Math.round(calculateRecomposedBaselineAtIndex(mcDetails, detSeries, 12)));
    console.log("T10(12):", Math.round(calculateRecomposedTotalAtIndex(mcDetails, detSeries, 12, 'p10')));

    // [TEST 2] Clamping Proof
    console.log("\n[TEST 2] Negative Index (-5)");
    const b_neg = calculateRecomposedBaselineAtIndex(mcDetails, detSeries, -5);
    console.log("B(-5) Result:", b_neg);

    console.log("\n[TEST 3] Out of Range (500)");
    const b_high = calculateRecomposedBaselineAtIndex(mcDetails, detSeries, 500);
    console.log("B(500) Result:", Math.round(b_high));

    // [TEST 4] Early Years Value Check
    console.log("\n[TEST 4] PDF/UI Value Check (Early Years)");
    for (let yr = 2026; yr <= 2030; yr++) {
        const idx = (yr - 2026) * 12 + 12; // Year end idx
        const B = calculateRecomposedBaselineAtIndex(mcDetails, detSeries, idx);
        console.log(`Year ${yr}: Recomposed Baseline B = ${Math.round(B)}`);
    }

    // [TEST 5] MC UI SET Logic Confirm
    console.log("\n[MC UI SET] UI STATE MOCK:");
    console.log({
        hasMC: true,
        simStart: mcDetails.simulationStartDate,
        horizonMonths: mcDetails.horizonMonths,
        p5Len: mcDetails.percentiles.p5.length,
        principalLen: mcDetails.principalPath.length,
        detLen: detSeries.length
    });
}

runTest();
