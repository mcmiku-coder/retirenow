/**
 * Golden Verification: Single Injection 45k Scenario
 * Tests the JUMP-AWARE recomposition logic.
 */

function getPrincipalAtIndex(mcDetails, idx) {
    if (!mcDetails || !mcDetails.principalPath) return 0;
    const path = mcDetails.principalPath;
    if (idx < 0) return 0;
    if (idx >= path.length) return path[path.length - 1];
    return path[idx];
}

function calculateRecomposedBaselineAtIndex(projection, mcDetails, idx) {
    const yearlyBreakdown = projection; // Mock projection is just the array
    const startYear = mcDetails.startYear;
    const scalarYearNode = startYear + (idx - 11) / 12;

    const getBAtYear = (year) => {
        const row = yearlyBreakdown.find(r => Number(r.year) === year);
        if (!row) return null;
        // Mock: Year Y ends at Month (Y-startYear)*12 + 11
        const yearEndIdx = (year - startYear) * 12 + 11;
        const D_node = parseFloat(row.cumulativeBalance || 0);
        const P_node = getPrincipalAtIndex(mcDetails, yearEndIdx);
        return D_node - P_node;
    };

    const floorYear = Math.floor(scalarYearNode);
    const ceilYear = Math.ceil(scalarYearNode);

    const B_floor = getBAtYear(floorYear);
    const B_ceil = getBAtYear(ceilYear);

    if (B_floor === null && B_ceil === null) return 0;
    if (B_floor === null) return B_ceil;
    if (B_ceil === null || floorYear === ceilYear) return B_floor;

    // Linear interpolation of B
    const fraction = (scalarYearNode - floorYear) / (ceilYear - floorYear);
    return B_floor + fraction * (B_ceil - B_floor);
}

function calculateRecomposedTotalAtIndex(projection, mcDetails, idx, pKey) {
    const B = calculateRecomposedBaselineAtIndex(projection, mcDetails, idx);
    const mcPath = mcDetails.percentiles[pKey];
    const mcVal = idx >= mcPath.length ? mcPath[mcPath.length - 1] : mcPath[idx];
    return B + mcVal;
}

// MOCK DATA: Injection of 45k in Jan 2035 (Month 120)
const startYear = 2025;
const yearlyBreakdown = [];
for (let y = 0; y <= 20; y++) {
    yearlyBreakdown.push({
        year: startYear + y,
        cumulativeBalance: y < 10 ? 200000 : 245000
    });
}

const principalPath = new Array(241).fill(0).map((_, m) => m < 120 ? 0 : 45000);
const mcP5 = new Array(241).fill(0).map((_, m) => m < 120 ? 0 : 45000); // 0% growth test

const mcDetails = { startYear, principalPath, percentiles: { p5: mcP5 } };
const projection = yearlyBreakdown;

console.log("--- GOLDEN Injection Scenario Verification (JUMP-AWARE) ---");

// Check Month 119 (Dec 2034)
const B119 = calculateRecomposedBaselineAtIndex(projection, mcDetails, 119);
const T119 = calculateRecomposedTotalAtIndex(projection, mcDetails, 119, 'p5');

// Check Month 120 (Jan 2035 - Injection Moment)
const B120 = calculateRecomposedBaselineAtIndex(projection, mcDetails, 120);
const T120 = calculateRecomposedTotalAtIndex(projection, mcDetails, 120, 'p5');

// Check Month 131 (Dec 2035 - Year End)
const B131 = calculateRecomposedBaselineAtIndex(projection, mcDetails, 131);
const T131 = calculateRecomposedTotalAtIndex(projection, mcDetails, 131, 'p5');

console.log(`\nDec 2034 (Month 119): B=${B119}, T5=${T119}`);
console.log(`Jan 2035 (Month 120 - Injection): B=${B120}, T5=${T120}`);
console.log(`Dec 2035 (Month 131 - Year End): B=${B131}, T5=${T131}`);

const baselineJumpAtInjection = B120 - B119;
const totalJumpAtInjection = T120 - T119;

console.log(`\nBaseline Jump at Injection: ${baselineJumpAtInjection} (Target: 0)`);
console.log(`Total Jump at Injection: ${totalJumpAtInjection} (Target: 45000)`);

console.log(`\nYear-to-Year Consistency Check (Dec 34 vs Dec 35):`);
console.log(`  Baseline Delta: ${B131 - B119} (Target: 0)`);
console.log(`  Total P5 Delta: ${T131 - T119} (Target: 45000 if injection is 45k)`);

if (Math.abs(B120 - B119) < 0.001 && Math.abs(B131 - B119) < 0.001) {
    console.log("\n✅ VERIFICATION PASSED: Golden Identity holds AND Baseline is smooth at injection.");
} else {
    console.log("\n❌ VERIFICATION FAILED: Baseline jump detected.");
}
