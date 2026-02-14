/**
 * Baseline Regression Test: 2050 Injection Alignment
 * Identifies why B(2049) and B(2050) diverge.
 */

const { getSimulationStartDate, getYearEndMonthIndex, dateToMonthIndex } = require('./utils/simulationDateUtils');

function mockProjection() {
    return {
        yearlyBreakdown: [
            { year: 2049, cumulativeBalance: 200000 },
            { year: 2050, cumulativeBalance: 245000 } // +45k injection in Jan 2050
        ]
    };
}

function mockMCDetails() {
    const simStart = new Date("2024-01-01");
    const m2049 = getYearEndMonthIndex(simStart, 2049); // 312
    const m2050 = getYearEndMonthIndex(simStart, 2050); // 324

    // Simulated Principal Path (Old engine logic: injection at t=312 for Jan 2050)
    const principalPath = new Float64Array(400).fill(0);
    // Jan 2050 injection (Index 312 per current dateToMonthIndex)
    for (let i = 312; i < principalPath.length; i++) {
        principalPath[i] = 45000;
    }

    return {
        simulationStartDate: simStart.toISOString(),
        principalPath,
        startYear: 2024
    };
}

function test() {
    const proj = mockProjection();
    const mc = mockMCDetails();
    const simStart = new Date(mc.simulationStartDate);

    console.log("--- Baseline Alignment Audit ---");

    // Year 2049 Node
    const idx49 = getYearEndMonthIndex(simStart, 2049); // 312
    const D49 = proj.yearlyBreakdown[0].cumulativeBalance;
    const P49 = mc.principalPath[idx49];
    const B49 = D49 - P49;

    console.log(`Year 2049 (Index ${idx49}): D=${D49}, P=${P49}, B=${B49}`);

    // Year 2050 Node
    const idx50 = getYearEndMonthIndex(simStart, 2050); // 324
    const D50 = proj.yearlyBreakdown[1].cumulativeBalance;
    const P50 = mc.principalPath[idx50];
    const B50 = D50 - P50;

    console.log(`Year 2050 (Index ${idx50}): D=${D50}, P=${P50}, B=${B50}`);

    const jump = B50 - B49;
    console.log(`Baseline Jump 2049 -> 2050: ${jump}`);

    if (Math.abs(jump) > 0) {
        console.log("❌ REPRODUCTION SUCCESSFUL: Baseline jumps by " + jump + " at injection boundary.");
    } else {
        console.log("✅ Baseline is smooth (unexpected for bug reproduction).");
    }
}

test();
