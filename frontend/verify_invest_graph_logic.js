
// Mock Data
const simulationStartDateStr = "2026-01-01T00:00:00.000Z";
const horizonMonths = 24; // 2 years

const mockDetails = {
    horizonMonths: horizonMonths,
    injections: [
        { monthIndex: 0, amount: 1000 },    // Jan 2026
        { monthIndex: 5, amount: -200 },    // Jun 2026
        { monthIndex: 12, amount: 500 },    // Jan 2027
        { monthIndex: 23, amount: 100 }     // Dec 2027
    ],
    principalPath: Array.from({ length: 25 }, (_, i) => 10000 + i * 100), // Increasing Principal
    percentiles: {
        p50: Array.from({ length: 25 }, (_, i) => 10000 + i * 200) // Increasing Value
    }
};

// --- LOGIC UNDER TEST (Copied from InvestFlowGraph.js) ---
const processMonteCarloData = (details, startDateStr, scenario) => {
    const startDate = new Date(startDateStr);

    // Group by Year
    const yearsMap = new Map();

    // Initialize years
    for (let m = 0; m <= details.horizonMonths; m++) {
        const date = new Date(startDate);
        date.setUTCMonth(date.getUTCMonth() + m);
        const year = date.getUTCFullYear();

        if (!yearsMap.has(year)) {
            yearsMap.set(year, {
                year,
                netFlow: 0,
                investedPrincipal: 0,
                portfolioValue: 0,
                lastMonthIndex: m
            });
        }
        const yData = yearsMap.get(year);
        yData.lastMonthIndex = m; // Update to latest month seen for this year
    }

    // 1. Calculate Net Flows
    if (details.injections) {
        details.injections.forEach(inj => {
            const date = new Date(startDate);
            date.setUTCMonth(date.getUTCMonth() + inj.monthIndex);
            const year = date.getUTCFullYear();

            if (yearsMap.has(year)) {
                const yData = yearsMap.get(year);
                yData.netFlow += inj.amount;
            }
        });
    }

    // 2 & 3. Get Principal and Portfolio Value (EOY)
    const principalPath = details.principalPath;
    const portfolioPath = details.percentiles[scenario];

    yearsMap.forEach(yData => {
        const idx = yData.lastMonthIndex;

        if (idx < principalPath.length) {
            yData.investedPrincipal = principalPath[idx];
        }

        if (portfolioPath && idx < portfolioPath.length) {
            yData.portfolioValue = portfolioPath[idx];
        }
    });

    return Array.from(yearsMap.values());
};

// --- TESTS ---
console.log("Running Invest Flow Graph Logic Verifications...");

const results = processMonteCarloData(mockDetails, simulationStartDateStr, 'p50');

// 1. Check Year Count
// 2026, 2027, 2028 (Jan 1 2028 is month 24 if we start at 0? Wait, month 24 is Jan 2028)
// horizonMonths = 24 means 0..24 indices? usually implies 25 data points.
// logic loops m <= horizonMonths.
// 0..24 = 25 months.
// Jan 2026 (0) to Jan 2028 (24).
// So we expect 2026, 2027, 2028.
const years = results.map(r => r.year);
console.log("Years found:", years);
if (years.includes(2026) && years.includes(2027) && years.includes(2028)) {
    console.log("PASS: Years correct.");
} else {
    console.error("FAIL: Years incorrect.");
}

// 2. Check Net Flow 2026
// 1000 - 200 = 800
const y2026 = results.find(r => r.year === 2026);
console.log(`2026 Net Flow: ${y2026.netFlow} (Expected 800)`);
if (y2026.netFlow === 800) console.log("PASS: 2026 Flow"); else console.error("FAIL: 2026 Flow");

// 3. Check Net Flow 2027
// 500 + 100 = 600
const y2027 = results.find(r => r.year === 2027);
console.log(`2027 Net Flow: ${y2027.netFlow} (Expected 600)`);
if (y2027.netFlow === 600) console.log("PASS: 2027 Flow"); else console.error("FAIL: 2027 Flow");

// 4. Check EOY Principal 2026
// 2026 ends at month 11 (Dec 2026).
// Principal at index 11: 10000 + 11*100 = 11100.
// Wait, loop updates lastMonthIndex.
// For 2026, index goes 0..11. lastMonthIndex = 11.
console.log(`2026 Principal: ${y2026.investedPrincipal} (Expected 11100)`);
if (y2026.investedPrincipal === 11100) console.log("PASS: 2026 Principal"); else console.error("FAIL: 2026 Principal");

// 5. Check EOY Value 2026
// Value at index 11: 10000 + 11*200 = 12200.
console.log(`2026 Value: ${y2026.portfolioValue} (Expected 12200)`);
if (y2026.portfolioValue === 12200) console.log("PASS: 2026 Value"); else console.error("FAIL: 2026 Value");

// 6. Check EOY 2028 (Partial Year)
// Month 24 is Jan 2028.
// lastMonthIndex = 24.
const y2028 = results.find(r => r.year === 2028);
console.log(`2028 Principal (Month 24): ${y2028.investedPrincipal} (Expected ${10000 + 24 * 100})`);
if (y2028.investedPrincipal === 12400) console.log("PASS: 2028 Principal"); else console.error("FAIL: 2028 Principal");

