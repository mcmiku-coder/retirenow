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
    cachePortfolioSimulation
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
        return productId && getProductById(productId) && asset.strategy === 'Invested';
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
        userData,
        incomes,
        costs,
        assets,
        debts,
        retirementData,
        scenarioData,
        activeFilters
    } = params;

    if (!portfolioSimulation) {
        return calculateBaselineProjection(params);
    }

    // Get Monte Carlo projection for the Invested Book
    const monteCarloProjection = extractPercentile(portfolioSimulation, percentile);

    // This would integrate Monte Carlo results with the rest of the simulation
    // For now, return the Monte Carlo projection as placeholder
    // The actual implementation will properly combine with incomes/costs/debts

    return monteCarloProjection;
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
