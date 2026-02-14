
const { createSeededRandom, gaussianPair, alignTimeSeries, percentile, calculatePercentiles } = (() => {
    return {
        createSeededRandom: (seed) => {
            return function () {
                let t = seed += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
        },
        gaussianPair: (rng) => {
            let u1 = 0; while (u1 === 0) u1 = rng();
            const u2 = rng();
            const r = Math.sqrt(-2.0 * Math.log(u1));
            const theta = 2.0 * Math.PI * u2;
            return [r * Math.cos(theta), r * Math.sin(theta)];
        },
        alignTimeSeries: (list) => list,
        percentile: (arr, p) => arr[Math.floor(p * (arr.length - 1))],
        calculatePercentiles: (arr, ps) => {
            const sorted = Array.from(arr).sort((a, b) => a - b);
            const res = {};
            ps.forEach(p => res[p] = sorted[Math.floor(p * (sorted.length - 1))]);
            return res;
        }
    };
})();

class MonteCarloEngine {
    constructor(seed = Date.now()) {
        this.rng = createSeededRandom(seed);
    }

    _computeStatistics(assets) {
        const n = assets.length;
        const means = new Float64Array(n).fill(0); // Zero growth for probe
        const covMatrix = Array(n).fill(0).map((_, i) => {
            const row = new Float64Array(n);
            row[i] = 0; // Zero volatility for probe
            return row;
        });
        return { means, covMatrix, assetMap: assets.map(a => a.id) };
    }

    _choleskyDecomposition(matrix) {
        const n = matrix.length;
        return Array(n).fill(0).map(() => new Float64Array(n));
    }

    run(config) {
        const {
            assets,
            cashflows,
            horizonMonths,
            iterations = 1,
            initialCash = 0,
            simulationStartYear
        } = config;

        const stats = this._computeStatistics(assets);
        const { means, covMatrix, assetMap } = stats;
        const nFactors = means.length;
        const nAssets = assets.length;
        const assetIndices = assets.map(a => assetMap.indexOf(a.id));
        const L = this._choleskyDecomposition(covMatrix);
        const drifts = new Float64Array(nAssets).fill(0);
        const assetIndexMap = new Map();
        assets.forEach((a, i) => assetIndexMap.set(a.id, i));

        const cashflowBuckets = new Array(horizonMonths + 1).fill(null).map(() => []);
        if (cashflows) {
            cashflows.forEach(f => {
                if (f.monthIndex <= horizonMonths) {
                    cashflowBuckets[f.monthIndex].push(f);
                }
            });
        }

        const state = new Float64Array(iterations * nAssets);
        for (let k = 0; k < iterations; k++) {
            for (let i = 0; i < nAssets; i++) {
                state[k * nAssets + i] = assets[i].initialValue;
            }
        }

        const pLevels = [5, 10, 25, 50, 75, 90, 95];
        const percentiles = {};
        pLevels.forEach(p => {
            percentiles[`p${p}`] = new Float64Array(horizonMonths + 1);
        });

        const initialTotal = initialCash + assets.reduce((s, a) => s + (a.initialValue || 0), 0);
        const initialPrincipal = assets.reduce((s, a) => s + (a.initialValue || 0), 0);

        const principalPath = new Float64Array(horizonMonths + 1);
        let currentPrincipal = initialPrincipal;
        principalPath[0] = currentPrincipal;

        pLevels.forEach(p => {
            percentiles[`p${p}`][0] = initialTotal;
        });

        const reportedInjections = [];
        const totals = new Float64Array(iterations);
        const factors = new Float64Array(nFactors);
        const shocks = new Float64Array(nFactors);

        for (let t = 1; t <= horizonMonths; t++) {
            const monthCashflows = cashflowBuckets[t - 1];
            let monthlyNetFlow = 0;

            if (monthCashflows) {
                for (let c = 0; c < monthCashflows.length; c++) {
                    monthlyNetFlow += monthCashflows[c].amount;
                }
            }
            currentPrincipal += monthlyNetFlow;
            principalPath[t] = currentPrincipal;

            if (Math.abs(monthlyNetFlow) >= 1) {
                reportedInjections.push({
                    monthIndex: t - 1,
                    amount: monthlyNetFlow
                });
            }

            for (let k = 0; k < iterations; k++) {
                let portValue = initialCash;
                const offset = k * nAssets;

                for (let i = 0; i < nAssets; i++) {
                    state[offset + i] *= 1; // No growth
                    portValue += state[offset + i];
                }

                for (let c = 0; c < monthCashflows.length; c++) {
                    const flow = monthCashflows[c];
                    const amount = flow.amount;
                    const ai = assetIndexMap.get(flow.assetId);
                    if (ai !== undefined) {
                        state[offset + ai] += amount;
                        portValue += amount;
                    } else {
                        portValue += amount;
                    }
                }
                totals[k] = portValue;
            }

            const pDecimals = pLevels.map(p => p / 100);
            const computed = calculatePercentiles(totals, pDecimals);
            pLevels.forEach((p, idx) => {
                percentiles[`p${p}`][t] = computed[pDecimals[idx]];
            });
        }

        if (simulationStartYear && cashflows) {
            const injFlow = cashflows.find(f => Math.abs(f.amount) === 45000);
            const injMonthIndex_fromCashflows = injFlow ? injFlow.monthIndex : null;
            const idx2049 = (2050 - simulationStartYear) * 12;
            const idx2050 = (2051 - simulationStartYear) * 12;

            console.log("[Engine Verification Probe]", {
                simulationStartYear,
                injMonthIndex_fromCashflows,
                idx2049,
                idx2050,
                P_idx2049: principalPath[idx2049],
                P_idx2050: principalPath[idx2050]
            });
        }

        return { percentiles, principalPath, injections: reportedInjections };
    }
}

const engine = new MonteCarloEngine(123);
engine.run({
    assets: [{ id: 'A', initialValue: 0 }],
    cashflows: [{ monthIndex: 12, amount: 45000, assetId: 'A' }],
    horizonMonths: 36,
    iterations: 1,
    initialCash: 0,
    simulationStartYear: 2049
});
