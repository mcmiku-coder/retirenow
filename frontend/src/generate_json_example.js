const { getYearEndMonthIndex } = require('./simulationDateUtils_CommonJS'); // I'll make a temp copy for node

const simStart = new Date("2024-01-01");
const horizonMonths = 360;

// Deterministic Sample
const yearlyBreakdown = [
    { year: 2048, cumulativeBalance: 195000 },
    { year: 2049, cumulativeBalance: 200000 },
    { year: 2050, cumulativeBalance: 245000 }, // Injection 45k
    { year: 2051, cumulativeBalance: 250000 },
    { year: 2052, cumulativeBalance: 255000 }
];

// Engine Cashflows
const engineCashflows = [
    { monthIndex: 312, amount: 45000, assetId: "3a-1" } // Jan 1st 2050
];

// Principal Logic (Mirroring monteCarloEngine.js logic)
const principalPath = new Array(horizonMonths + 1).fill(0);
// t=313 processes monthIndex 312
for (let i = 313; i <= horizonMonths; i++) {
    principalPath[i] = 45000;
}

// B = D - P logic
const getB = (year) => {
    const idx = ((year + 1) - 2024) * 12;
    const row = yearlyBreakdown.find(r => r.year === year);
    const D = row.cumulativeBalance;
    const P = principalPath[idx];
    return D - P;
};

// Mock Percentiles (Stress)
const mc_p10 = 52000;
const mc_p5 = 48000;

const result = {
    meta: {
        simulationStartDate: "2024-01-01T00:00:00.000Z",
        horizonMonths: 360
    },
    engineCashflows,
    deterministicSample: yearlyBreakdown,
    recompositionProof: {
        2049: {
            idx: 312,
            D: 200000, P: 0, B: 200000,
            p10_val: mc_p10 * 0.9,
            total_p10: 200000 + (mc_p10 * 0.9)
        },
        2050: {
            idx: 324,
            D: 245000, P: 45000, B: 200000,
            p10_val: mc_p10,
            total_p10: 200000 + mc_p10
        },
        2051: {
            idx: 336,
            D: 250000, P: 45000, B: 205000,
            p10_val: mc_p10 * 1.1,
            total_p10: 205000 + (mc_p10 * 1.1)
        }
    }
};

console.log(JSON.stringify(result, null, 2));
