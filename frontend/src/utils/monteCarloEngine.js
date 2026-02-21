import { createSeededRandom, gaussianPair, alignTimeSeries, percentile, calculatePercentiles } from './monteCarloUtils';

/**
 * Monte Carlo Engine (Streaming Architecture)
 * 
 * Core engine for portfolio simulation.
 * - Uses Streaming Percentile Calculation (O(1) memory relative to horizon)
 * - No path storage
 * - Monthly timestep
 * - Uses Covariance Matrix directly (No Sigma multiplication)
 * - Factor-based simulation to handle duplicate assets correctly
 * - POLISH: Explicitly uses Log Returns (ln(Pt/Pt-1)) for statistics
 */
export class MonteCarloEngine {
    constructor(seed = Date.now()) {
        this.rng = createSeededRandom(seed);
    }

    /**
     * Compute historical statistics (mean returns, covariance matrix)
     * POLISH: Explicitly computes Log Returns here.
     */
    _computeStatistics(assets) {
        if (!assets || assets.length === 0) return null;

        // Extract series for alignment
        const seriesList = assets.map(a => a.performanceData || []);
        const alignedSeries = alignTimeSeries(seriesList); // Returns Array<Array<{date, value}>>

        if (!alignedSeries || alignedSeries.length === 0 || alignedSeries[0].length <= 1) {
            return this._computeFallbackStats(assets);
        }

        const n = alignedSeries.length;
        const sampleSize = alignedSeries[0].length - 1; // Returns are size N-1

        // Initialize Returns Matrix (Log Returns)
        const returnsMatrix = Array.from({ length: n }, () => new Float64Array(sampleSize));

        // Compute Log Returns: ln(P_t / P_{t-1})
        for (let i = 0; i < n; i++) {
            const series = alignedSeries[i];
            for (let t = 1; t < series.length; t++) {
                const p0 = series[t - 1].value;
                const p1 = series[t].value;
                if (p0 <= 0 || p1 <= 0 || !Number.isFinite(p0) || !Number.isFinite(p1)) {
                    returnsMatrix[i][t - 1] = 0;
                } else {
                    const ret = Math.log(p1 / p0);
                    returnsMatrix[i][t - 1] = Number.isFinite(ret) ? ret : 0;
                }
            }
        }

        const means = new Float64Array(n);
        const stdevs = new Float64Array(n);
        const covMatrix = Array.from({ length: n }, () => new Float64Array(n));
        const corrMatrix = Array.from({ length: n }, () => new Float64Array(n));

        // 1. Compute Means and Standard Deviations (Monthly)
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < sampleSize; j++) {
                const val = returnsMatrix[i][j];
                if (Number.isFinite(val)) sum += val;
            }
            const mean = sum / sampleSize;
            means[i] = Number.isFinite(mean) ? mean : 0;

            let varSum = 0;
            for (let j = 0; j < sampleSize; j++) {
                const diff = returnsMatrix[i][j] - means[i];
                if (Number.isFinite(diff)) varSum += diff * diff;
            }
            const stdev = (sampleSize > 0) ? Math.sqrt(varSum / sampleSize) : 0;
            stdevs[i] = Number.isFinite(stdev) ? stdev : 0;
        }

        // 2. Compute Covariance and Correlation Matrix
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                let sum = 0;
                for (let k = 0; k < sampleSize; k++) {
                    const term = (returnsMatrix[i][k] - means[i]) * (returnsMatrix[j][k] - means[j]);
                    if (Number.isFinite(term)) sum += term;
                }
                const cov = sum / sampleSize;
                const safeCov = Number.isFinite(cov) ? cov : 0;
                covMatrix[i][j] = safeCov;
                covMatrix[j][i] = safeCov;

                const denominator = stdevs[i] * stdevs[j];
                const corr = (denominator > 0 && Number.isFinite(safeCov)) ? safeCov / denominator : 0;
                const safeCorr = Number.isFinite(corr) ? corr : 0;
                corrMatrix[i][j] = safeCorr;
                corrMatrix[j][i] = safeCorr;
            }
        }

        // 3. Compute Asset-Specific Metadata for Reporting
        const assetStats = assets.map((a, i) => {
            const series = alignedSeries[i];

            // Max Drawdown calculation from history (with period tracking)
            let maxDD = 0;
            let peak = series[0].value;
            let peakDate = series[0].date;
            let maxDDPeakDate = series[0].date;
            let maxDDTroughDate = series[0].date;

            const fmtMonthYear = (dateStr) => {
                // dateStr is "YYYY-MM-DD"
                if (!dateStr || dateStr === 'N/A') return dateStr;
                const parts = dateStr.split('-');
                if (parts.length >= 2) return `${parts[1]}.${parts[0]}`;
                return dateStr;
            };

            for (const pt of series) {
                if (pt.value > peak) {
                    peak = pt.value;
                    peakDate = pt.date;
                } else {
                    const dd = (pt.value - peak) / peak;
                    if (dd < maxDD) {
                        maxDD = dd;
                        maxDDPeakDate = peakDate;
                        maxDDTroughDate = pt.date;
                    }
                }
            }

            const maxDrawdownPeriod = `${fmtMonthYear(maxDDPeakDate)} → ${fmtMonthYear(maxDDTroughDate)}`;

            return {
                id: a.id,
                name: a.name,               // Product Name
                portfolioName: a.portfolioName, // Holding Name
                assetClass: a.assetClass,
                quotationCurrency: a.quotationCurrency || 'CHF',
                meanReturnAnnual: (Number.isFinite(means[i]) ? means[i] : 0) * 12 * 100, // Converted to %
                volatilityAnnual: (Number.isFinite(stdevs[i]) ? stdevs[i] : 0) * Math.sqrt(12) * 100, // Converted to %
                maxDrawdown: (Number.isFinite(maxDD) ? maxDD : 0) * 100, // Converted to %
                maxDrawdownPeriod,
                historyCount: series.length,
                startDate: series[0]?.date || 'N/A',
                endDate: series[series.length - 1]?.date || 'N/A'
            };
        });

        return {
            means,
            covMatrix,
            corrMatrix,
            assetStats,
            historyInfo: {
                sampleSize: sampleSize + 1,
                startDate: alignedSeries[0][0].date,
                endDate: alignedSeries[0][sampleSize].date
            },
            assetMap: assets.map(a => a.id)
        };
    }

    _computeFallbackStats(assets) {
        // Fallback: 5% return, 15% vol
        const n = assets.length;
        const means = new Float64Array(n).fill(0.05 / 12);
        const yearlySigma = 0.15;
        const monthlySigma = yearlySigma / Math.sqrt(12);
        const monthlyVar = monthlySigma * monthlySigma;

        const covMatrix = Array.from({ length: n }, (_, i) => {
            const row = new Float64Array(n);
            row[i] = monthlyVar;
            return row;
        });

        const corrMatrix = Array.from({ length: n }, (_, i) => {
            const row = new Float64Array(n);
            row[i] = 1.0;
            return row;
        });

        const assetStats = assets.map(a => ({
            id: a.id,
            name: a.name,
            portfolioName: a.portfolioName,
            assetClass: a.assetClass || 'Unknown',
            quotationCurrency: a.quotationCurrency || 'CHF',
            meanReturnAnnual: 5.0,
            volatilityAnnual: 15.0,
            maxDrawdown: 0,
            historyCount: 0,
            startDate: 'N/A',
            endDate: 'N/A'
        }));

        return {
            means,
            covMatrix,
            corrMatrix,
            assetStats,
            historyInfo: { sampleSize: 0, startDate: 'N/A', endDate: 'N/A' },
            assetMap: assets.map(a => a.id)
        };
    }

    _choleskyDecomposition(matrix) {
        const n = matrix.length;
        const L = Array(n).fill(0).map(() => new Float64Array(n));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                let sum = 0;
                for (let k = 0; k < j; k++) {
                    sum += L[i][k] * L[j][k];
                }

                if (i === j) {
                    const val = matrix[i][i] - sum;
                    if (val <= 0) {
                        L[i][j] = Math.sqrt(Math.max(val, 1e-10));
                    } else {
                        L[i][j] = Math.sqrt(val);
                    }
                } else {
                    const diag = Math.max(L[j][j], 1e-12);
                    L[i][j] = (matrix[i][j] - sum) / diag;
                }
            }
        }
        return L;
    }

    run(config) {
        const {
            assets,
            cashflows,
            horizonMonths,
            iterations = 1000,
            initialCash = 0,
            simulationStartYear // [CLEAN ROOM] Added for dynamic probe validation
        } = config;

        // 1. Prepare Statistics
        const stats = this._computeStatistics(assets);
        if (!stats) throw new Error("Could not compute asset statistics");

        const { means, covMatrix, assetMap } = stats;

        // nFactors is the number of underlying unique assets we have statistics for
        const nFactors = means.length;
        const nAssets = assets.length; // Portfolio assets (count)

        // Mapping: Portfolio Asset Index -> Stat Factor Index
        const assetIndices = assets.map(a => assetMap.indexOf(a.id));

        // Cholesky on Covariance Matrix (Size: nFactors x nFactors)
        const L = this._choleskyDecomposition(covMatrix);

        // 2. Precompute Drifts
        // We compute drift for each *Portfolio Asset* to save time in loop
        // GBM Drift: mu - 0.5 * sigma^2
        const drifts = new Float64Array(nAssets);

        // Also handle fallback for assets not in stats (idx == -1)
        // Default conservative params for unknown assets
        const defaultSigma = 0.15 / Math.sqrt(12);
        const defaultDrift = (0.05 / 12) - 0.5 * defaultSigma * defaultSigma;

        for (let i = 0; i < nAssets; i++) {
            const idx = assetIndices[i];

            if (idx !== -1) {
                const mu = means[idx];
                const sig2 = covMatrix[idx][idx]; // Variance on diagonal
                drifts[i] = mu - 0.5 * sig2;
            } else {
                drifts[i] = defaultDrift;
            }
        }

        // Map cashflows to asset index for O(1) lookup
        const assetIndexMap = new Map();
        assets.forEach((a, i) => assetIndexMap.set(a.id, i));

        // POLISH: Pre-bucket cashflows by month for O(1) lookup
        const cashflowBuckets = new Array(horizonMonths + 1).fill(null).map(() => []);
        if (cashflows) {
            cashflows.forEach(f => {
                if (f.monthIndex <= horizonMonths) {
                    cashflowBuckets[f.monthIndex].push(f);
                }
            });
        }

        // 3. Initialize State
        // Flattened array: [iter 0 asset 0, iter 0 asset 1, ..., iter k asset i]
        const state = new Float64Array(iterations * nAssets);
        const realizedState = new Float64Array(iterations); // Tracks realized cash per iteration

        for (let k = 0; k < iterations; k++) {
            for (let i = 0; i < nAssets; i++) {
                state[k * nAssets + i] = assets[i].initialValue;
            }
        }

        // 4. Output Storage
        const pLevels = [5, 10, 25, 50, 75, 90, 95];
        const percentiles = {};
        pLevels.forEach(p => {
            percentiles[`p${p}`] = new Float64Array(horizonMonths + 1);
            percentiles[`p${p}_invested`] = new Float64Array(horizonMonths + 1);
            percentiles[`p${p}_realized`] = new Float64Array(horizonMonths + 1);
        });

        // 5. Initial Percentiles (Month 0)
        // [CLEAN ROOM] Rule 1: principalPath Initialization
        // Must represent ONLY nominal invested principal P(t).
        // initialPrincipal = sum(initialValue of invested assets only). No initialCash.
        const initialPrincipal = assets.reduce((s, a) => s + (a.initialValue || 0), 0);

        // Initial Total
        const initialTotal = initialCash + initialPrincipal;

        const principalPath = new Float64Array(horizonMonths + 1);
        let currentPrincipal = initialPrincipal;
        principalPath[0] = currentPrincipal;

        pLevels.forEach(p => {
            percentiles[`p${p}`][0] = initialTotal;
            percentiles[`p${p}_invested`][0] = initialTotal; // At t=0, everything is invested
            percentiles[`p${p}_realized`][0] = 0;
        });

        // Track Injections for Reporting
        const reportedInjections = [];

        // DEBUG: Audit Trace
        let debugCaptured = false;
        const debugData = {
            injectionMonth: null,
            injectionAmount: 0,
            postReturnVal: 0,
            postInjectionVal: 0,
            yearEndVal: 0
        };

        // Buffers
        const totals = new Float64Array(iterations);
        const totalsInvested = new Float64Array(iterations);
        const totalsRealized = new Float64Array(iterations);

        const factors = new Float64Array(nFactors); // Independent normals
        const shocks = new Float64Array(nFactors);  // Correlated (Covariance-scaled)

        // 6. Simulation Loop (Time -> Iterations)
        for (let t = 1; t <= horizonMonths; t++) {
            const monthCashflows = cashflowBuckets[t - 1];
            let monthlyNetFlow = 0;

            // Track principal evolution
            if (monthCashflows) {
                for (let c = 0; c < monthCashflows.length; c++) {
                    monthlyNetFlow += monthCashflows[c].amount;
                }
            }
            currentPrincipal += monthlyNetFlow;
            principalPath[t] = currentPrincipal;

            // [CLEAN ROOM] Rule 2: Injection Indexing
            // Storage must use 0-based monthIndex: (t - 1)
            if (Math.abs(monthlyNetFlow) >= 1) { // 1 CHF threshold
                reportedInjections.push({
                    monthIndex: t - 1,
                    amount: monthlyNetFlow
                });
            }

            for (let k = 0; k < iterations; k++) {

                // 6a. Generate Independent Factors (Size: nFactors)
                for (let i = 0; i < nFactors; i += 2) {
                    const [z1, z2] = gaussianPair(this.rng);
                    factors[i] = z1;
                    if (i + 1 < nFactors) factors[i + 1] = z2;
                }

                // 6b. Correlate Factors (Size: nFactors) -> Shocks
                // shocks[i] will have variance = covMatrix[i][i]
                for (let i = 0; i < nFactors; i++) {
                    let sum = 0;
                    for (let j = 0; j <= i; j++) {
                        sum += L[i][j] * factors[j];
                    }
                    shocks[i] = sum;
                }

                // 6c. Evolve Portfolio Assets (Factor-based mapping)
                let portValue = initialCash;
                const offset = k * nAssets;

                for (let i = 0; i < nAssets; i++) {
                    const idx = assetIndices[i];
                    let shock;

                    if (idx !== -1) {
                        shock = shocks[idx];
                    } else {
                        // Fallback: Independent shock using default params
                        // We must generate a new random here for unmapped assets
                        // Note: rng is stateful, so this is fine
                        const [z] = gaussianPair(this.rng);
                        shock = defaultSigma * z;
                    }

                    // S_t = S_{t-1} * exp(drift + correlatedRandom)
                    // No extra sigma mult here because 'shock' is already scaled by Covariance
                    const ret = Math.exp(drifts[i] + shock);
                    state[offset + i] *= ret;

                    portValue += state[offset + i];
                }

                // WARNING: portValue has evolved by ret, but Cashflow NOT yet added.
                // DEBUG: Capture Pre-Injection (Post-Return)
                if (k === 0 && monthCashflows.length > 0 && !debugCaptured) {
                    debugData.postReturnVal = portValue;
                }

                // 6d. Apply Cashflows (POLISH: Use pre-bucketed O(1) access)
                for (let c = 0; c < monthCashflows.length; c++) {
                    const flow = monthCashflows[c];
                    const amount = flow.amount;
                    const ai = assetIndexMap.get(flow.assetId);

                    if (ai !== undefined) {
                        state[offset + ai] += amount;
                        portValue += amount;
                    } else {
                        // Default to portfolio cash if asset not found
                        portValue += amount;
                    }

                    // DEBUG: Capture Injection
                    if (k === 0 && !debugCaptured && Math.abs(amount) > 1) {
                        debugData.injectionMonth = t;
                        debugData.injectionAmount = amount;
                        debugData.postInjectionVal = portValue;
                        debugCaptured = true;
                    }
                }

                // 6e. Asset Exit / Realisation Logic
                // If asset expires at this month t, move value to Realized State
                // [FIX] Use (t - 1) to align 0-based monthIndex with 1-based loop
                for (let i = 0; i < nAssets; i++) {
                    if (assets[i].exitMonthIndex === (t - 1)) {
                        const val = state[offset + i];
                        realizedState[k] += val;
                        state[offset + i] = 0;
                        // portValue (Invested) should decrease by this amount
                        portValue -= val;
                    }
                }

                totalsInvested[k] = portValue;
                totalsRealized[k] = realizedState[k];
                totals[k] = portValue + realizedState[k];
            }

            // 7. Compute Percentiles (Safe Sort)
            // Convert pLevels to 0..1 decimals
            const pDecimals = pLevels.map(p => p / 100);

            // Compute Totals
            const computedTotals = calculatePercentiles(totals, pDecimals);

            // Compute Invested
            const computedInvested = calculatePercentiles(totalsInvested, pDecimals);

            // Compute Realized
            const computedRealized = calculatePercentiles(totalsRealized, pDecimals);

            pLevels.forEach((p, idx) => {
                percentiles[`p${p}`][t] = computedTotals[pDecimals[idx]];
                percentiles[`p${p}_invested`][t] = computedInvested[pDecimals[idx]];
                percentiles[`p${p}_realized`][t] = computedRealized[pDecimals[idx]];
            });
        }

        // [DEV-ONLY PROBE] Dynamic verification for 2050 injection scenario
        // Computes indices from engine inputs ONLY (no external date helpers).
        if (simulationStartYear && cashflows) {
            const injFlow = cashflows.find(f => Math.abs(f.amount) === 45000);
            const injMonthIndex_fromCashflows = injFlow ? injFlow.monthIndex : null;

            // YearEndIndex(Y) = months between startYear-01 and (Y+1)-01
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

            // [MC P0 ACCEPTANCE] Acceptance log for ghost principal fix
            const firstInjection = cashflows.find(f => Math.abs(f.amount) > 0);
            const M = firstInjection ? firstInjection.monthIndex : null;
            console.log("[MC P0 ACCEPTANCE]", {
                initialPrincipal,
                firstInjectionMonthIndex: M,
                P0: principalPath[0],
                P_M: M !== null ? principalPath[M] : null,
                P_Mplus12: (M !== null && M + 12 < principalPath.length) ? principalPath[M + 12] : null
            });
        }

        return {
            percentiles,
            principalPath,
            injections: reportedInjections,
            stats: {
                ...stats,
                settings: {
                    iterations,
                    horizonMonths,
                    step: 'Monthly',
                    initialCash
                }
            },
            debugTrace: debugData
        };
    }
}
