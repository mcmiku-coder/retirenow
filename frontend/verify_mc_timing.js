
const crypto = require('crypto');

// --- UTILS (Mocking imports) ---

function createSeededRandom(seed) {
    // Simple LCG for deterministic testing if needed, or just Math.random
    // Using a simple seeded generator for consistency
    let state = seed;
    return () => {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}

function gaussianPair(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng(); // Converting [0,1) to (0,1)
    while (v === 0) v = rng();
    const R = Math.sqrt(-2.0 * Math.log(u));
    const theta = 2.0 * Math.PI * v;
    return [R * Math.cos(theta), R * Math.sin(theta)];
}

function percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const k = Math.floor(p * (sorted.length - 1));
    return sorted[k];
}

// --- ENGINE (Condensed from monteCarloEngine.js) ---

class MonteCarloEngine {
    constructor(seed = 12345) {
        this.rng = createSeededRandom(seed);
    }

    _choleskyDecomposition(matrix) {
        const n = matrix.length;
        const L = Array(n).fill(0).map(() => new Float64Array(n));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                let sum = 0;
                for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
                if (i === j) {
                    const val = matrix[i][i] - sum;
                    L[i][j] = Math.sqrt(Math.max(val, 1e-10));
                } else {
                    L[i][j] = (matrix[i][j] - sum) / L[j][j];
                }
            }
        }
        return L;
    }

    run(config) {
        const { assets, cashflows, horizonMonths, iterations = 100, initialCash = 0 } = config;

        // Mock Stats (Simple Logic for Test)
        // Assume 1 Asset, 5% return, 15% vol
        const nAssets = assets.length;
        const nFactors = nAssets;
        const means = [0.05 / 12]; // Monthly Mean
        const yearlySigma = 0.15;
        const monthlyVar = (yearlySigma / Math.sqrt(12)) ** 2;
        const covMatrix = [[monthlyVar]];

        const L = this._choleskyDecomposition(covMatrix);
        const drifts = means.map((mu, i) => mu - 0.5 * covMatrix[i][i]);

        // Cashflow Buckets
        const cashflowBuckets = new Array(horizonMonths + 1).fill(null).map(() => []);
        if (cashflows) {
            cashflows.forEach(f => {
                if (f.monthIndex <= horizonMonths) cashflowBuckets[f.monthIndex].push(f);
            });
        }

        const state = new Float64Array(iterations * nAssets);
        const pLevels = [5, 10, 50, 90, 95];
        const percentiles = {};
        pLevels.forEach(p => percentiles[`p${p}`] = new Float64Array(horizonMonths + 1));

        // Month 0
        const initialTotal = initialCash + assets.reduce((s, a) => s + a.initialValue, 0);
        pLevels.forEach(p => percentiles[`p${p}`][0] = initialTotal);

        const totals = new Float64Array(iterations);

        // DEBUG Data
        let debugCaptured = false;
        const debugData = {
            injectionMonth: null,
            injectionAmount: 0,
            postReturnVal: 0,
            postInjectionVal: 0,
            yearEndVal: 0
        };

        // LOOP
        for (let t = 1; t <= horizonMonths; t++) {
            const monthCashflows = cashflowBuckets[t];

            for (let k = 0; k < iterations; k++) {
                // Evolve
                let portValue = 0; // Assuming 0 cash start for asset only test
                const offset = k * nAssets;

                for (let i = 0; i < nAssets; i++) {
                    const [z] = gaussianPair(this.rng); // Simplify for 1 asset
                    const shock = Math.sqrt(covMatrix[i][i]) * z;
                    const ret = Math.exp(drifts[i] + shock);

                    if (t === 1 && k === 0) {
                        // Init state
                        state[offset + i] = assets[i].initialValue * ret;
                    } else {
                        state[offset + i] *= ret;
                    }
                    portValue += state[offset + i];
                }

                // DEBUG Capture Pre-Injection
                if (k === 0 && monthCashflows.length > 0 && !debugCaptured) {
                    debugData.postReturnVal = portValue;
                }

                // Apply Cashflows
                for (let c = 0; c < monthCashflows.length; c++) {
                    const flow = monthCashflows[c];
                    const amount = flow.amount;
                    // Assume asset 0
                    state[offset + 0] += amount;
                    portValue += amount;

                    // DEBUG Capture Injection
                    if (k === 0 && !debugCaptured && Math.abs(amount) > 1) {
                        debugData.injectionMonth = t;
                        debugData.injectionAmount = amount;
                        debugData.postInjectionVal = portValue;
                        debugCaptured = true;
                    }
                }
                totals[k] = portValue;
            }

            // Year End Capture
            if (debugCaptured && debugData.yearEndVal === 0) {
                // If injection was Jan (t), Dec is t + 11
                // t=1 (Jan). Dec is t=12.
                // t % 12 === 0
                if (t % 12 === 0 && t >= debugData.injectionMonth) {
                    debugData.yearEndVal = totals[0];
                }
            }
        }

        return { debugTrace: debugData };
    }
}

// --- RUN SCENARIO ---
// Scenario: Start 2025. Injection 01.01.2050.
// Start Year: 2025
// Injection Year: 2050
// Delta Years: 25
// Multiply by 12: 300 months?
// Wait, 2050 - 2025 = 25 years.
// If start is Jan 2025. Jan 2050 is Month 1 + (25 * 12) = Month 301?
// Let's assume start 01.01.2025.
// 01.01.2050 is exactly 25 years later.
// 25 * 12 = 300 months.
// So Month Index 300? (If 0-indexed) or 301?
// User said Injection is 01.01.2050.
// Let's calculate index. 
// (2050 - 2025) * 12 + (1 - 1) = 300.
// If Engine is 1-based (t=1 is Jan 2025), then Jan 2050 is t=301.

const startYear = 2025;
const injectionYear = 2050;
const horizonMonths = (2060 - 2025) * 12; // 35 years
const injectionMonthIndex = (injectionYear - startYear) * 12 + 1; // Jan 2050. If Jan 2025 is 1, Jan 2050 is 301.

console.log(`Running Simulation...`);
console.log(`Start Year: ${startYear}`);
console.log(`Injection: 01.01.${injectionYear} (Month Index: ${injectionMonthIndex})`);

const engine = new MonteCarloEngine(12345);
const result = engine.run({
    assets: [{ id: 'SPI', initialValue: 0 }], // Start empty
    cashflows: [{ monthIndex: injectionMonthIndex, amount: 45000, assetId: 'SPI' }],
    horizonMonths: horizonMonths,
    iterations: 10 // Minimal for debug check
});

console.log('\nENGINE VALIDATION (debugTrace)');
console.log(`- injectionMonthIndex: ${result.debugTrace.injectionMonth}`);
console.log(`- postReturnVal: ${result.debugTrace.postReturnVal.toFixed(2)}`);
console.log(`- postInjectionVal: ${result.debugTrace.postInjectionVal.toFixed(2)}`);
console.log(`- yearEndVal: ${result.debugTrace.yearEndVal.toFixed(2)}`);
console.log(`- injectionAmount: ${result.debugTrace.injectionAmount}`);
