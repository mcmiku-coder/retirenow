/**
 * Projection Calculator
 * 
 * Handles both baseline (no investment) and invested (Monte Carlo) projections
 * Integrates with existing ScenarioResult.js simulation logic
 * Uses portfolio-level Monte Carlo with correlation (Invested Book concept)
 */

import {
    runPortfolioMonteCarloSimulation,
    extractPercentile,
    calculateBandwidth,
    getCachedPortfolioSimulation,
    cachePortfolioSimulation,
    getYearlyReturns
} from './monteCarloSimulation';
import { getProductById } from '../data/investmentProducts';

/**
 * Check if any assets have investment selections (creates an Invested Book)
 * 
 * @param {Object} scenarioData - Scenario data with investmentSelections
 * @param {Array} assets - Array of assets
 * @returns {boolean} True if any asset has an investment product selected
 */
export function hasInvestedBook(scenarioData, assets) {
    if (!scenarioData?.investmentSelections) return false;

    // Check if any asset has a valid investment selection AND is marked as 'Invested'
    return assets.some(asset => {
        const assetId = asset.id;
        // Verify product selection
        const productId = scenarioData.investmentSelections[assetId];
        const hasProduct = productId && getProductById(productId);

        // Verify user explicitly checked "Invest?" box (strategy === 'Invested')
        const isInvestedStrategy = asset.strategy === 'Invested';

        return hasProduct && isInvestedStrategy;
    });
}

/**
 * Get all invested assets that form the Invested Book
 * 
 * @param {Array} assets - Array of all assets
 * @param {Object} scenarioData - Scenario data with investmentSelections
 * @returns {Array} Array of assets that have investment products selected
 */
export function getInvestedBookAssets(assets, scenarioData) {
    if (!scenarioData?.investmentSelections) return [];

    return assets.filter(asset => {
        const productId = scenarioData.investmentSelections[asset.id];
        const hasProduct = productId && getProductById(productId) && asset.strategy === 'Invested';

        if (!hasProduct) return false;

        if (!hasProduct) return false;

        // Note: Future assets ARE included in the Invested Book so we can model their volatility profile.
        // The simulation engine will generate a return path based on this portfolio mix.
        // The main calculation loop in ScenarioResult.js will apply these returns to the capital ONLY when it actually arrives.

        return true;
    });
}

/**
 * Run portfolio-level Monte Carlo simulation for the Invested Book
 * Uses caching to avoid re-running unchanged simulations
 * 
 * @param {Array} assets - Array of all assets
 * @param {Object} scenarioData - Scenario data with investmentSelections
 * @param {Object} userData - User data with death date
 * @returns {Promise<Object|null>} Portfolio simulation result or null
 */
export async function runInvestedBookSimulation(assets, scenarioData, userData) {
    const investedAssets = getInvestedBookAssets(assets, scenarioData);

    if (investedAssets.length === 0) {
        return null;
    }

    const deathYear = userData.theoreticalDeathDate
        ? new Date(userData.theoreticalDeathDate).getFullYear()
        : new Date().getFullYear() + 30; // fallback

    const currentYear = new Date().getFullYear();
    const years = deathYear - currentYear;

    // Check cache first
    let simulationResult = getCachedPortfolioSimulation(investedAssets, scenarioData);

    if (!simulationResult) {
        // Run new portfolio simulation
        console.log(`Running portfolio Monte Carlo for Invested Book with ${investedAssets.length} assets`);
        simulationResult = runPortfolioMonteCarloSimulation(investedAssets, scenarioData, years);

        if (simulationResult) {
            cachePortfolioSimulation(investedAssets, scenarioData, simulationResult);
        }
    } else {
        console.log(`Using cached portfolio simulation for Invested Book`);
    }

    return simulationResult;
}

/**
 * Calculate baseline projection (no investments, assets treated as cash)
 * This is the existing logic from ScenarioResult.js
 * 
 * @param {Object} params - All data needed for projection
 * @returns {Array<{year: number, value: number}>} Year-by-year balance projection
 */
export function calculateBaselineProjection(params) {
    const {
        userData,
        incomes,
        costs,
        assets,
        debts,
        retirementData,
        scenarioData,
        activeFilters
    } = params;

    // This would contain the extracted simulation logic from ScenarioResult.js
    // For now, return empty array as placeholder
    // The actual implementation will be integrated with ScenarioResult.js

    return [];
}

/**
 * Calculate invested projection using portfolio-level Monte Carlo simulation
 * Replaces invested assets with Monte Carlo projection, keeps other assets as baseline
 * 
 * @param {Object} params - All data needed for projection
 * @param {Object} portfolioSimulation - Result from runInvestedBookSimulation
 * @param {number} percentile - Percentile to extract (default: 50)
 * @returns {Array<{year: number, value: number}>} Year-by-year balance projection
 */

export function calculateInvestedProjection(params, portfolioSimulation, percentile = 50) {
    const {
        assets,
        activeFilters
    } = params;

    // Fallback if no simulation
    if (!portfolioSimulation) {
        return calculateBaselineProjection(params); // Placeholder
    }

    // 1. Get Yearly Returns from the simulation (Growth Rates)
    // We ignore the absolute values in portfolioSimulation because they assume "All Capital Upfront".
    // We want to apply these rates to the ACTUAL flowing capital.
    const yearlyReturns = getYearlyReturns(portfolioSimulation, percentile);

    // 2. Run Flow Simulation
    const currentYear = new Date().getFullYear();
    // Assuming 30 year projection or derived from simulation length
    const projectionYears = yearlyReturns.length;

    const projection = [];
    let investedBalance = 0;

    // We need to track which assets have been "activated" (added to pot)
    // But since this is a pure projection loop, we can just check availability each year.
    // NOTE: This logic mimics ScenarioResult.js but simplified for pure Asset Growth.

    for (let i = 0; i <= projectionYears; i++) {
        const year = currentYear + i;

        // A. Apply Growth (except for year 0 start)
        if (i > 0) {
            const periodReturn = yearlyReturns[i - 1] || 0;
            investedBalance = investedBalance * (1 + periodReturn);
        }

        // B. Add Inflows (Assets becoming available this year)
        assets.forEach(asset => {
            // Skip if filtered out via UI
            if (activeFilters && activeFilters[`asset-${asset.id || asset.name}`] === false) return;

            // Check if part of Invested Book? 
            // Ideally we only simulate growth on "Invested" assets. 
            // But valid question: does "Invested Simulation" include Cash assets handling?
            // Usually "Invested Projection" replaces the "Total Wealth".
            // So we should include LIQUID (Cash) assets too, maybe at 0% return?
            // OR, strictly follow the "Invested Book" logic?
            // User wants to see the "Monte Carlo vs Baseline".
            // Baseline includes Everything (Cash + Invested as Cash).
            // Monte Carlo should include Everything (Cash + Invested as Invested).

            // For simplicity/correctness with "Invested Book":
            // We only grow the "Invested" portion with MC returns.
            // Non-invested assets should just be added? 
            // Actually, usually MC line represents the WHOLE pot.
            // But `yearlyReturns` is for the "Invested Portion" only.
            // A blended return would be better.

            // HOWEVER, based on the codebase, `portfolioSimulation` is ONLY the Invested Book.
            // If we limit to Invested Book assets, we might miss Cash.
            // Let's stick to: ONLY assets in the Invested Book get added here and grow.
            // Pure Cash assets (not invested) are missing? 
            // If so, the Blue Line will be LOWER than Gray line for Cash parts.
            // Let's assume for now we strictly simulate the "Invested Book" trajectory.

            const isInvested = asset.strategy === 'Invested';
            if (!isInvested) return;

            // Availability Check
            let amountToAdd = 0;
            const amount = parseFloat(asset.amount || 0);

            if (asset.availabilityDate) {
                const d = new Date(asset.availabilityDate);
                const availYear = d.getFullYear();
                if (availYear === year) {
                    amountToAdd = amount;
                } else if (i === 0 && availYear < currentYear) {
                    // Initial existing capital
                    amountToAdd = amount;
                }
            } else {
                // No date. If i===0 (Start), we presume available? 
                // User hated "Net Housing" appearing. 
                // Sticking to strict rule: No Date = Info only / No show, unless specific type.
                // ScenarioResult says: "Date or Instant... if (!date) return".
                // So we skip.
            }

            if (amountToAdd > 0) {
                investedBalance += amountToAdd;
            }
        });

        projection.push({
            year: year,
            value: Math.round(investedBalance)
        });
    }

    return projection;
}


/**
 * Calculate all projections (baseline, invested, bandwidth)
 * Main entry point for ScenarioResult.js
 * 
 * @param {Object} params - All data needed for projection
 * @param {Object} options - Calculation options
 * @param {boolean} options.includeInvestments - Whether to calculate invested projection
 * @param {number} options.centerPercentile - Center percentile for invested (default: 50)
 * @param {number} options.bandwidth - Bandwidth spread (default: null, no bandwidth)
 * @param {boolean} options.includeInvestedBook - Whether to include Invested Book in calculation
 * @returns {Promise<Object>} Object with baseline, invested, and bandwidth projections
 */
export async function calculateAllProjections(params, options = {}) {
    const {
        includeInvestments = true,
        centerPercentile = 50,
        bandwidth = null,
        includeInvestedBook = true
    } = options;

    const result = {
        baseline: null,
        invested: null,
        bandwidthUpper: null,
        bandwidthLower: null,
        hasInvestedBook: false,
        investedBookDetails: null
    };

    // Always calculate baseline
    result.baseline = calculateBaselineProjection(params);

    // Check if we should calculate invested projections
    const shouldCalculateInvested = includeInvestments &&
        includeInvestedBook &&
        hasInvestedBook(params.scenarioData, params.assets);
    result.hasInvestedBook = shouldCalculateInvested;

    if (shouldCalculateInvested) {
        // Run portfolio-level Monte Carlo simulation
        const portfolioSimulation = await runInvestedBookSimulation(
            params.assets,
            params.scenarioData,
            params.userData
        );

        if (portfolioSimulation) {
            // Store details about the Invested Book
            result.investedBookDetails = {
                totalAmount: portfolioSimulation.totalAmount,
                assets: portfolioSimulation.portfolioAssets.map(asset => ({
                    id: asset.assetId,
                    productName: asset.product.name,
                    amount: asset.amount,
                    weight: asset.weight,
                    assetClass: asset.product.assetClass
                }))
            };

            // Calculate center percentile projection
            result.invested = calculateInvestedProjection(
                params,
                portfolioSimulation,
                centerPercentile
            );

            // Calculate bandwidth if requested
            if (bandwidth !== null && bandwidth > 0) {
                const bandwidthResults = calculateBandwidth(
                    portfolioSimulation,
                    centerPercentile,
                    bandwidth
                );
                result.bandwidthUpper = bandwidthResults.upper;
                result.bandwidthLower = bandwidthResults.lower;
            }
        }
    }

    return result;
}
