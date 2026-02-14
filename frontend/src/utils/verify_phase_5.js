
/**
 * verify_phase_5.js
 */
const {
    calculateMonthlyDeterministicSeries,
    calculateRecomposedBaselineAtIndex,
    calculateRecomposedTotalAtIndex,
    runInvestedBookSimulation
} = require('./projectionCalculator');
const { toUtcMonthStart, getSimulationStartDate, getYearEndMonthIndex } = require('./simulationDateUtils');

async function testPhase5() {
    console.log("--- PHASE 5 COMPREHENSIVE VERIFICATION ---");

    const params = {
        projection: {
            yearlyBreakdown: [
                { year: 2026, cumulativeBalance: 105000, annualBalance: 5000 },
                { year: 2027, cumulativeBalance: 110000, annualBalance: 5000 },
                { year: 2049, cumulativeBalance: 200000, annualBalance: 5000 },
                { year: 2050, cumulativeBalance: 245000, annualBalance: 45000 }
            ]
        },
        userData: { theoreticalDeathDate: "2060-01-01" },
        assets: [{ id: 'a1', amount: 100000, strategy: 'Invested', availabilityDate: "2026-01-01" }],
        scenarioData: { investmentSelections: { a1: 'p1' } }
    };

    // 1. Verify Simulation Start Date Alignment
    console.log("\n[TEST 1] Start Date Alignment Check");
    const simRes = await runInvestedBookSimulation(params);
    const expectedStart = "2026-01-01T00:00:00.000Z";
    console.log("Sim Start Date:", simRes.simulationStartDate);
    console.log("Start Year Correct?", simRes.simulationStartDate === expectedStart);

    // 2. Verify Deterministic Series (D)
    console.log("\n[TEST 2] Deterministic Series Verification");
    const detSeries = calculateMonthlyDeterministicSeries(params.projection, simRes.simulationStartDate, simRes.horizonMonths);
    console.log("D(0):", Math.round(detSeries[0])); // Expected 100,000

    // 3. Verify Hardened Recomposition (No NaN, clamping logic)
    console.log("\n[TEST 3] Hardened Recomposition (Clamping & NaN-proof)");

    // Test negative index
    const b_neg = calculateRecomposedBaselineAtIndex(simRes, detSeries, -10);
    console.log("B(-10):", b_neg); // Expected same as B(0)

    // Test out of range index
    const highIdx = 1000000;
    const b_high = calculateRecomposedBaselineAtIndex(simRes, detSeries, highIdx);
    console.log(`B(${highIdx}):`, b_high); // Expected same as last valid value

    // Test NaN index
    const b_nan = calculateRecomposedBaselineAtIndex(simRes, detSeries, NaN);
    console.log("B(NaN):", b_nan); // Expected same as B(0)

    // 4. Verify Early Years for PDF/UI Consistency
    console.log("\n[TEST 4] Early Years Value Check (2026-2030)");
    const simStart = new Date(simRes.simulationStartDate);
    for (let yr = 2026; yr <= 2030; yr++) {
        const idx = getYearEndMonthIndex(simStart, yr);
        const B = calculateRecomposedBaselineAtIndex(simRes, detSeries, idx);
        console.log(`Year ${yr} (idx ${idx}): Baseline B = ${Math.round(B)}`);
    }

    // 5. [MC UI SET] Mock Log Output
    console.log("\n[MC UI SET] LOG (Simulated UI Output)");
    console.log({
        hasMC: !!simRes,
        simStart: simRes.simulationStartDate,
        horizonMonths: simRes.horizonMonths,
        p5Len: simRes.percentiles.p5.length,
        principalLen: simRes.principalPath.length,
        detLen: detSeries.length
    });
}

testPhase5().catch(console.error);
