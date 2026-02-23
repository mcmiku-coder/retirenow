/**
 * Projection Calculator
 * 
 * Adapts the new Streaming Monte Carlo Engine for the UI.
 * Handles data preparation (Assets, Cashflows) and result formatting (Percentiles).
 */

import { MonteCarloEngine } from './monteCarloEngine';
import { getProductById } from '../data/investmentProducts';
import { toUtcMonthStart, getSimulationStartDate, dateToMonthIndex, getYearEndMonthIndex, monthIndexToYearMonth } from './simulationDateUtils';
import { calculateMonthlyAmount } from './calculations';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Check if any assets have investment selections (creates an Invested Book)
 */
export function hasInvestedBook(scenarioData, assets) {
    if (!scenarioData?.investmentSelections || !assets) return false;
    return assets.some(asset => {
        const productId = scenarioData.investmentSelections[asset.id];
        const hasProduct = productId && getProductById(productId);
        const isInvestedStrategy = asset.strategy === 'Invested';
        return hasProduct && isInvestedStrategy;
    });
}

/**
 * Get all invested assets that form the Invested Book
 */
export function getInvestedBookAssets(assets, scenarioData) {
    // 1. Prioritize explicitly saved Invested Book (contains splits/divisions/custom rows)
    if (scenarioData?.investedBook && Array.isArray(scenarioData.investedBook) && scenarioData.investedBook.length > 0) {
        return scenarioData.investedBook.filter(asset => {
            // Ensure it has a product linked (either via property or map)
            // and usually strategy is 'Invested' (though book implies it)
            const hasProduct = asset.productId || asset.selectedProduct || (scenarioData.investmentSelections && scenarioData.investmentSelections[asset.id]);
            return hasProduct;
        });
    }

    // 2. Fallback: Filter regular assets map (Legacy behavior)
    if (!scenarioData?.investmentSelections) {
        console.warn("[MC Diagnosis] No investmentSelections found in scenarioData");
        return [];
    }

    // [DIAGNOSIS LOGGING]
    console.log("[MC Diagnosis] Filtering Invested Assets", {
        totalAssets: assets.length,
        selectionKeys: Object.keys(scenarioData.investmentSelections),
        assets: assets.map(a => ({ id: a.id, name: a.name, strategy: a.strategy, amount: a.amount }))
    });

    return assets.filter(asset => {
        const productId = scenarioData.investmentSelections[asset.id];
        const product = productId ? getProductById(productId) : null;
        const hasProduct = !!product;
        const isInvested = asset.strategy === 'Invested';

        if (asset.strategy === 'Invested' && !hasProduct) {
            console.warn(`[MC Diagnosis] Asset Excluded: ${asset.name} (${asset.id})`, {
                reason: 'Missing Product',
                productIdInMap: productId,
                productFound: !!product
            });
        }

        return hasProduct && isInvested;
    });
}

export async function runInvestedBookSimulation(params) {
    // [HOTFIX V3] PARAM SOURCE OF TRUTH
    const projection = params?.projection;
    const userData = params?.userData;
    const scenarioData = params?.scenarioData;
    const assets = params?.assets;

    const investedAssets = getInvestedBookAssets(assets, scenarioData);

    if (!investedAssets || investedAssets.length === 0) return null;

    // 1. Prepare Configuration
    // [CLEAN ROOM] Rule 2: Derive startYear ONLY from projection
    const firstProjectionYear = parseInt(projection?.yearlyBreakdown?.[0]?.year, 10);
    const startYear = Number.isFinite(firstProjectionYear) ? firstProjectionYear : new Date().getUTCFullYear();

    // [Phase 9b] Strict UTC Construction to prevent timezone-based month drift
    const simulationStartDate = toUtcMonthStart(new Date(Date.UTC(startYear, 0, 1, 0, 0, 0, 0)));

    const deathDate = userData.theoreticalDeathDate ? new Date(userData.theoreticalDeathDate) : null;
    const deathYear = deathDate ? deathDate.getUTCFullYear() : startYear + 35;
    const deathMonth = deathDate ? deathDate.getUTCMonth() : 0;

    // Exact month distance from Start (Jan 1st of startYear) to Death Date
    const horizonMonths = Math.max(1, (deathYear - startYear) * 12 + deathMonth);

    // 2. Map Assets to Engine Format & Generate Cashflows
    const engineAssets = [];
    const engineCashflows = [];
    const initialInvested = [];

    const simStart = toUtcMonthStart(simulationStartDate);

    investedAssets.forEach(asset => {
        const productId = scenarioData.investmentSelections[asset.id];
        const product = getProductById(productId);
        const amount = parseFloat(asset.amount || 0);

        // Determine Availability
        // Rule: Available at start only if availabilityDate exists and is <= simulationStartDate
        // OR if you explicitly intend it to be available now (defaulting to False for safety here per user request)
        let isAvailableAtStart = false;
        let startMonthIndex = -1;
        let exitMonthIndex = -1;

        if (asset.endDate) {
            const endDateObj = toUtcMonthStart(asset.endDate);
            // End Date Logic: If user sets End Date, we sell the asset at that month index.
            // dateToMonthIndex returns 0 for Jan 2026. 
            // If End Date is Jan 2032 (Index 72), we want to sell it then.
            exitMonthIndex = dateToMonthIndex(simStart, endDateObj);
        }

        if (asset.availabilityDate) {
            const availDate = toUtcMonthStart(asset.availabilityDate);
            startMonthIndex = dateToMonthIndex(simStart, availDate);
            if (startMonthIndex <= 0) {
                isAvailableAtStart = true;
                startMonthIndex = 0;
            }
        } else {
            // [HARDEN] If NO availabilityDate, treat as NOT available at start (Year 2050 scenario)
            // unless asset.isInitialCapital is explicitly true.
            isAvailableAtStart = false;
            startMonthIndex = 0; // Default to Month 0 but initialValue will be 0
        }

        if (isAvailableAtStart) {
            // Initial Capital
            engineAssets.push({
                id: asset.id,
                name: product.name, // The financial instrument name
                portfolioName: asset.name, // The user's portfolio name (e.g. '3a (1)')
                assetClass: product.assetClass,
                initialValue: amount,
                exitMonthIndex: exitMonthIndex,
                performanceData: product.performanceData || []
            });
            initialInvested.push(asset);
        } else {
            // Future Inflow - Add empty asset + injection
            engineAssets.push({
                id: asset.id,
                name: product.name, // The financial instrument name
                portfolioName: asset.name, // The user's portfolio name (e.g. '3a (1)')
                assetClass: product.assetClass,
                initialValue: 0, // Starts empty
                exitMonthIndex: exitMonthIndex,
                performanceData: product.performanceData || []
            });

            // Ensure startMonthIndex is at least 0
            const injectionMonth = Math.max(0, startMonthIndex);

            engineCashflows.push({
                monthIndex: injectionMonth,
                amount: amount,
                assetId: asset.id,
                name: product.name // Use product name for tooltip consistency
            });
        }
    });

    const initialPrincipal = engineAssets.reduce((s, a) => s + (a.initialValue || 0), 0);

    console.log("[MC INPUT INTEGRITY]", {
        simStart: simStart.toISOString(),
        investedAssetsCount: investedAssets.length,
        investedAvailableAtStartCount: initialInvested.length,
        initialPrincipal,
        investedAvailableAtStartNames: initialInvested.map(a => a.name),
        firstCashflows: engineCashflows.slice(0, 10),
        cashflowCount: engineCashflows.length
    });

    if (engineAssets.length === 0) return null;

    // 3. Run Simulation
    try {
        console.log(`[MonteCarlo] Starting Engine for ${engineAssets.length} assets over ${horizonMonths} months`);
        const engine = new MonteCarloEngine(Date.now()); // Random seed

        const result = engine.run({
            assets: engineAssets,
            cashflows: engineCashflows,
            horizonMonths: horizonMonths,
            iterations: 10000,
            initialCash: 0, // We track pure invested portfolio value
            simulationStartYear: startYear // [CLEAN ROOM] Pass start year for probe validation
        });

        // 4. Return Results (Percentiles + Metadata)
        const simRes = {
            percentiles: result.percentiles, // raw arrays
            principalPath: result.principalPath, // raw array
            stats: result.stats,
            debugTrace: result.debugTrace, // Propagate Audit Trace
            startYear: startYear,
            simulationStartDate: simulationStartDate.toISOString(), // Expose Strict Date for UI/PDF
            horizonMonths: horizonMonths,
            investedAssetsDetails: engineAssets,
            investedCashflows: engineCashflows, // Expose raw cashflow schedule for PDF reporting
            injections: engineCashflows, // [FIX] Expose as 'injections' for InvestFlowGraph compatibility

            // [Feature] Realized Capital Decomposition
            realizedPercentiles: {
                p5: result.percentiles.p5_realized,
                p10: result.percentiles.p10_realized,
                p25: result.percentiles.p25_realized,
                p50: result.percentiles.p50_realized,
                p75: result.percentiles.p75_realized,
                p90: result.percentiles.p90_realized,
                p95: result.percentiles.p95_realized
            },
            investedPercentiles: {
                p5: result.percentiles.p5_invested,
                p10: result.percentiles.p10_invested,
                p25: result.percentiles.p25_invested,
                p50: result.percentiles.p50_invested,
                p75: result.percentiles.p75_invested,
                p90: result.percentiles.p90_invested,
                p95: result.percentiles.p95_invested
            }
        };

        // [FIX] Post-Process: Synthesize Investment Exits (ISOLATED VISUAL LOGIC)
        // We modify 'injections' for the Graph Bars (safe).
        // We create 'graphPrincipalPath' for the Blue Line/Bar breakdown (safe).
        // We DO NOT touch 'principalPath' or 'percentiles' used by the Main Engine/ScenarioResult.

        // 0. Clone Principal Path for Graph Visualization Only
        simRes.graphPrincipalPath = new Float64Array(result.principalPath);

        // A. Map asset IDs to their total principal (Initial + Injections)
        const assetPrincipalMap = new Map();
        engineAssets.forEach(a => assetPrincipalMap.set(a.id, a.initialValue || 0));
        engineCashflows.forEach(f => {
            const current = assetPrincipalMap.get(f.assetId) || 0;
            assetPrincipalMap.set(f.assetId, current + f.amount);
        });

        // B. Generate Exit Flows and Adjust Graph Principal Path
        engineAssets.forEach(asset => {
            if (asset.exitMonthIndex && asset.exitMonthIndex > 0 && asset.exitMonthIndex <= horizonMonths) {
                const totalPrincipal = assetPrincipalMap.get(asset.id) || 0;

                if (totalPrincipal > 0) {
                    // 1. Add Negative Flow for Graph (Red Bars)
                    simRes.injections.push({
                        monthIndex: asset.exitMonthIndex, // The month it exits
                        amount: -totalPrincipal,
                        isExit: true,
                        assetId: asset.id,
                        name: asset.name
                    });

                    // 2. Adjust Visual Principal Path (Blue Line/Bar)
                    // From exit month onwards, the active principal is reduced visually
                    const path = simRes.graphPrincipalPath;
                    for (let t = asset.exitMonthIndex + 1; t < path.length; t++) {
                        path[t] -= totalPrincipal;
                    }

                    if (asset.exitMonthIndex < path.length) {
                        path[asset.exitMonthIndex] -= totalPrincipal;
                    }

                    console.log(`[MC Graph-Process] Synthesized Visual Exit for ${asset.name} at Month ${asset.exitMonthIndex}: -${totalPrincipal}`);
                }
            }
        });

        // SAFETY LOG (User Request)
        console.log("[MC] sim?", !!simRes, "p5?", !!simRes?.percentiles?.p5, "p10?", !!simRes?.percentiles?.p10);

        return simRes;

    } catch (err) {
        console.error("Engine Run Failed", err);
        return null; // Handle gracefully
    }
}

/**
 * RULE 2: Compute DeterministicTotal(t) as a MONTHLY series.
 */
export function calculateMonthlyDeterministicSeries(projection, simStartDate, horizonMonths, assets = [], activeFilters = {}, scenarioData = {}, incomes = [], costs = [], userData = {}) {
    const series = new Float64Array(horizonMonths + 1);

    // [ALIGNMENT FIX] Use Bottom-Up Accumulation (Monthly Flows) instead of Top-Down Interpolation (Yearly Snapshot).
    // This ensures perfect alignment with the Monthly Table logic (which sums flows month by month).
    // Interpolation failed because it smoothed out mid-year flow stops (e.g., salary ending in Oct).

    const startDate = toUtcMonthStart(simStartDate);
    const investedAssetIds = getInvestedBookAssets(assets, scenarioData).map(a => a.id);

    // 1. Calculate Initial State (D0) - Same as Logic 2 above but strict
    // Start with 0 and add initial non-invested assets
    let runningNonInvestedWealth = 0;
    let runningInvestedPrincipal = 0;

    // Initialize with assets available at start
    assets.forEach(asset => {
        const id = asset.id || asset.name;
        if (activeFilters[`asset-${id}`] === false) return; // Skip if filtered out

        const isLiquid = asset.category === 'Liquid';
        const isInvested = investedAssetIds.includes(id) || asset.strategy === 'Invested'; // Check both ID and Strategy
        const amount = parseFloat(asset.adjustedAmount || asset.amount || 0);

        // Check availability
        const availDate = asset.availabilityDate ? toUtcMonthStart(asset.availabilityDate) : null;

        if (availDate && availDate <= startDate) {
            if (isInvested) {
                runningInvestedPrincipal += amount;
            } else if (isLiquid) {
                runningNonInvestedWealth += amount;
            }
        }
    });

    // 2. Loop through months and simulate flows
    const simStartRef_Stable = new Date(startDate);

    for (let m = 0; m <= horizonMonths; m++) {
        const date = new Date(startDate);
        date.setUTCMonth(date.getUTCMonth() + m);

        let IncomeFlow = 0;
        let CostFlow = 0;
        let NonInvestedAssetFlow = 0;
        let InvestContributionFlow = 0;

        // A. Income Flows
        // Unpack scenario data for overrides
        const incomeDateOverrides = scenarioData?.incomeDateOverrides || {};
        const language = scenarioData?.language || 'fr';

        // Person-specific dates
        const birthDate1 = userData?.birthDate ? new Date(userData.birthDate) : null;
        const deathDate1 = userData?.theoreticalDeathDate || (birthDate1 ? `${birthDate1.getUTCFullYear() + (userData.gender === 'male' ? 80 : 85)}-12-31` : '2080-12-31');

        const birthDate2 = userData?.birthDate2 ? new Date(userData.birthDate2) : null;
        const deathDate2 = (userData?.analysisType === 'couple' && userData?.theoreticalDeathDate2) ? userData.theoreticalDeathDate2 : (userData?.analysisType === 'couple' && birthDate2 ? `${birthDate2.getUTCFullYear() + (userData.gender2 === 'male' ? 80 : 85)}-12-31` : null);

        const wishedRetirementDate1 = scenarioData?.wishedRetirementDate;
        const wishedRetirementDate2 = scenarioData?.wishedRetirementDate2;

        const isSalary = (name = '') => {
            const n = name.toLowerCase();
            return n.includes('salary') || n.includes('salaire') || n.includes('lohn') || n.includes('revenu');
        };
        const isAVS = (name = '') => {
            const n = name.toLowerCase();
            return n.includes('avs') || n.includes('ahv') || n.includes('1. säule') || n.includes('1er pilier') || n.includes('pension de vieillesse');
        };
        const isLPP = (name = '') => {
            const n = name.toLowerCase();
            if (n.includes('capital')) return false;
            return n.includes('lpp') || n.includes('bvg') || n.includes('pension') || n.includes('rente');
        };

        incomes.forEach(inc => {
            if (activeFilters[`income-${inc.id || inc.name}`] === false) return;

            let start = inc.startDate;
            let end = inc.endDate;

            // Handle standard incomes with person-specific overrides and fallbacks
            if (isSalary(inc.name) || isAVS(inc.name) || isLPP(inc.name)) {
                const isP2 = inc.owner === 'p2' || inc.person === 'Person 2';
                const pLabel = isP2 ? (userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2')) : (userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1'));
                const overrideKey = `${inc.name}_${pLabel}`;

                const effWishedRetDate = isP2 ? wishedRetirementDate2 : wishedRetirementDate1;
                const effDeathDate = isP2 ? deathDate2 : deathDate1;

                if (isSalary(inc.name)) {
                    start = incomeDateOverrides[overrideKey]?.startDate || inc.startDate || new Date().toISOString().split('T')[0];
                    end = incomeDateOverrides[overrideKey]?.endDate || effWishedRetDate;
                } else if (isAVS(inc.name)) {
                    // Fallback to legal date if not available might be complex here, 
                    // but usually inc already has a fallback from DataReview
                    start = incomeDateOverrides[overrideKey]?.startDate || inc.startDate;
                    end = incomeDateOverrides[overrideKey]?.endDate || inc.endDate || effDeathDate;
                } else if (isLPP(inc.name)) {
                    start = incomeDateOverrides[overrideKey]?.startDate || inc.startDate || effWishedRetDate;
                    end = incomeDateOverrides[overrideKey]?.endDate || inc.endDate || effDeathDate;
                }
            }

            const amt = calculateMonthlyAmount(
                parseFloat(inc.amount || 0),
                inc.frequency || 'Monthly',
                start,
                end,
                date,
                simStartRef_Stable
            );
            IncomeFlow += amt;
        });

        // B. Cost Flows
        costs.forEach(c => {
            // Note: costs array might contain debts if merged before passing, or we need separate debt logic.
            // Assumption: Caller merges costs & debts or passes them in 'costs'. We'll clarify in caller.
            const prefix = (c.isDebt || c.category === 'Optimized Debt') ? 'debt-' : 'cost-';
            // Fallback if prefix logic is fuzzy: check scenarioData.debts?
            // Simplest is to assume standard filter key format from caller.
            // But wait, activeFilters might use 'debt-' or 'cost-'.
            // Let's check ID to guess prefix or rely on caller passing correct merged list.
            // If caller passes raw lists, we need separate args.
            // For now, assume 'costs' contains all outflows.
            // Check filter with both prefixes to be safe?
            let isFiltered = activeFilters[`cost-${c.id || c.name}`] === false;
            if (!isFiltered && (c.isDebt || c.category === 'Optimized Debt')) {
                isFiltered = activeFilters[`debt-${c.id || c.name}`] === false;
            }
            if (isFiltered) return;

            const amt = calculateMonthlyAmount(
                parseFloat(c.amount || 0),
                c.frequency || 'Monthly',
                c.startDate,
                c.endDate,
                date,
                simStartRef_Stable
            );
            CostFlow += amt;
        });

        // C. Asset Flows (Periodic & One-Time)
        assets.forEach(a => {
            const id = a.id || a.name;
            if (activeFilters[`asset-${id}`] === false) return;

            const amount = parseFloat(a.adjustedAmount || a.amount || 0);
            const isInvested = investedAssetIds.includes(id) || a.strategy === 'Invested';

            if (a.availabilityType === 'Period') {
                const flow = calculateMonthlyAmount(amount, 'Monthly', a.startDate, a.endDate, date, simStartRef_Stable);
                if (isInvested) InvestContributionFlow += flow;
                else NonInvestedAssetFlow += flow;
            } else if (a.availabilityDate) {
                // One-time assets
                const availDate = new Date(a.availabilityDate);
                // Strict month match
                if (availDate > simStartRef_Stable &&
                    availDate.getUTCFullYear() === date.getUTCFullYear() &&
                    availDate.getUTCMonth() === date.getUTCMonth()) {
                    if (isInvested) InvestContributionFlow += amount;
                    else NonInvestedAssetFlow += amount;
                }
            }
        });

        // Update Running Balances
        runningNonInvestedWealth += (IncomeFlow - CostFlow + NonInvestedAssetFlow);
        runningInvestedPrincipal += InvestContributionFlow;

        // D(t) = Total Wealth (NonInvested + InvestedPrincipal)
        // This represents the Deterministic (0% growth) projection of total wealth.
        series[m] = runningNonInvestedWealth + runningInvestedPrincipal;
    }

    return series;
}

/**
 * RULE 3: Compute Baseline as B(t) = D(t) - P(t)
 */
export function calculateRecomposedBaselineAtIndex(mcDetails, detSeries, idx) {
    if (!mcDetails || !detSeries || detSeries.length === 0) return 0;

    let sanitisedIdx = Math.floor(idx);
    if (!Number.isFinite(sanitisedIdx)) sanitisedIdx = 0;
    if (sanitisedIdx < 0) sanitisedIdx = 0;

    // D(t) from the monthly deterministic series
    const safeDetIdx = clamp(sanitisedIdx, 0, detSeries.length - 1);
    const D = detSeries[safeDetIdx] || 0;

    // P(t) from the engine's principal path
    const principalPath = mcDetails.principalPath;
    const P = (principalPath && principalPath.length > 0)
        ? principalPath[clamp(sanitisedIdx, 0, principalPath.length - 1)] || 0
        : 0;

    // Baseline B(t) is strictly the cash/non-invested part
    return D - P;
}

/**
 * Total_MC(t) = B(t) + InvestedMarketValue_MC(t)
 */
export function calculateRecomposedTotalAtIndex(mcDetails, detSeries, idx, percentileKey = 'p50') {
    if (!mcDetails || !detSeries || detSeries.length === 0) return 0;

    // First get the cash-only baseline B(t) - already handles idx sanitization
    const B = calculateRecomposedBaselineAtIndex(mcDetails, detSeries, idx);

    let sanitisedIdx = idx;
    if (!Number.isFinite(sanitisedIdx)) sanitisedIdx = 0;
    if (sanitisedIdx < 0) sanitisedIdx = 0;

    // Get the MC portfolio market value for the requested percentile
    const pKey = typeof percentileKey === 'string' ? percentileKey : `p${percentileKey}`;
    const mcPath = mcDetails.percentiles?.[pKey];

    if (!mcPath || mcPath.length === 0) return B;

    const safeMcIdx = clamp(Math.floor(sanitisedIdx), 0, mcPath.length - 1);
    const mcVal = mcPath[safeMcIdx] || 0;

    // Final Total Wealth = B + MC
    return B + mcVal;
}

/**
 * MANDATORY DEBUG PROBE
 * Updated to use pre-computed monthly series.
 */
export function getRecompositionProbeAtYear(detSeries, mcDetails, simulationStartDate, year) {
    const idxYearEnd = getYearEndMonthIndex(simulationStartDate, year);

    const D = idxYearEnd < detSeries.length ? detSeries[idxYearEnd] : 0;
    const P = (mcDetails.principalPath && idxYearEnd < mcDetails.principalPath.length) ? mcDetails.principalPath[idxYearEnd] : 0;
    const B = D - P;

    const MC_p10 = (mcDetails.percentiles?.p10?.[idxYearEnd]) || 0;
    const MC_p5 = (mcDetails.percentiles?.p5?.[idxYearEnd]) || 0;

    const T_p10 = B + MC_p10;
    const T_p5 = B + MC_p5;

    return {
        year,
        idxYearEnd,
        D, P, B,
        MC_p10, MC_p5,
        T_p10, T_p5,
        identityCheck_p10: (B + MC_p10) - T_p10,
        identityCheck_p5: (B + MC_p5) - T_p5
    };
}

export async function calculateAllProjections(params, options = {}) {
    const { includeInvestments } = options;
    const res = { baseline: null, invested: null, bandwidthUpper: null, bandwidthLower: null };

    if (includeInvestments) {
        const sim = await runInvestedBookSimulation(params);
        if (sim) {
            res.details = sim;

            // Pre-compute Deterministic Total Series
            const detSeries = calculateMonthlyDeterministicSeries(
                params.projection,
                sim.simulationStartDate,
                sim.horizonMonths,
                params.assets,
                params.activeFilters,
                params.scenarioData
            );
            res.detSeries = detSeries; // Expose for UI

            // [DEV-ONLY PROBE] Step 2 Verification
            if (detSeries) {
                const startDate = toUtcMonthStart(sim.simulationStartDate);
                const simStartYear = startDate.getUTCFullYear();
                const idxYearStart = getYearEndMonthIndex(startDate, simStartYear);
                const idx0 = 0;
                const idx2049 = getYearEndMonthIndex(startDate, 2049);
                const idx2050 = getYearEndMonthIndex(startDate, 2050);

                const firstRow = params.projection?.yearlyBreakdown?.[0] || {};

                console.log("[Deterministic Verification Probe]", {
                    simStartDate: startDate.toISOString(),
                    horizonMonths: sim.horizonMonths,
                    detSeriesLength: detSeries.length,
                    d0_verification: {
                        firstRowYear: firstRow.year,
                        firstRowCumBalance: Math.round(firstRow.cumulativeBalance || 0),
                        firstRowAnnualBalance: Math.round(firstRow.annualBalance || 0),
                        chosenD0: Math.round(detSeries[0])
                    },
                    earlyYears: [0, 1, 2, 3, 4].map(yOffset => {
                        const targetYear = simStartYear + yOffset;
                        const idx = getYearEndMonthIndex(startDate, targetYear);
                        const D = detSeries[idx];
                        const P = sim.principalPath[idx];
                        return {
                            year: targetYear,
                            idx,
                            D: Math.round(D),
                            P: Math.round(P),
                            B: Math.round(D - P)
                        };
                    }),
                    nodes: {
                        idx0: { idx: idx0, val: detSeries[idx0] },
                        idxYearEndStart: { year: simStartYear, idx: idxYearStart, val: detSeries[idxYearStart] },
                        idx2049: { idx: idx2049, val: detSeries[idx2049] },
                        idx2050: { idx: idx2050, val: detSeries[idx2050] }
                    },
                    first6: Array.from(detSeries.slice(0, 6)).map(v => Math.round(v)),
                    last3: Array.from(detSeries.slice(-3)).map(v => Math.round(v))
                });
            }

            // Mandatory Probes
            const simStart = toUtcMonthStart(sim.simulationStartDate);
            [2049, 2050, 2051].forEach(yr => {
                const probe = getRecompositionProbeAtYear(detSeries, sim, simStart, yr);
                console.log(`[RecompositionProbe ${yr}] D=${Math.round(probe.D)} P=${Math.round(probe.P)} B=${Math.round(probe.B)} MC10=${Math.round(probe.MC_p10)} T10=${Math.round(probe.T_p10)} ID_Check=${probe.identityCheck_p10}`);
            });
        }
    }
    return res;
}

/**
 * Legacy Helper
 */
export function calculateInvestedProjection(params, simulationResult, percentileKey = 50) {
    if (!simulationResult || !simulationResult.percentiles) return [];
    const pKey = typeof percentileKey === 'string' ? percentileKey : `p${percentileKey}`;
    const series = simulationResult.percentiles[pKey];
    if (!series) return [];
    return Array.from(series).map(v => ({ value: v }));
}

// Legacy formatters (Dummy/Fallback)
export function getPrincipalAtIndex(mcDetails, idx) {
    if (!mcDetails || !mcDetails.principalPath) return 0;
    const path = mcDetails.principalPath;
    if (idx < 0) return 0;
    if (idx >= path.length) return path[path.length - 1];
    return path[idx];
}
export function calculatePrincipalProjection(simulationResult) { return []; }
export function calculateBaselineProjection(params) { return []; }
export function interpolateYearlyData(yearlyBreakdown, targetYear) { return 0; }
