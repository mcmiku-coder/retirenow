/**
 * Monte Carlo Simulation Engine for Investment Projections
 * Portfolio-Level Simulation with Correlation
 * 
 * This module provides functions to run Monte Carlo simulations on entire portfolios
 * using Geometric Brownian Motion with correlation between assets via Cholesky decomposition.
 */

import { getProductById, getCorrelation } from '../data/investmentProducts';

/**
 * Generate a random number from a standard normal distribution (mean=0, std=1)
 * Uses Box-Muller transform for accurate normal distribution
 * 
 * @returns {number} Random value from standard normal distribution
 */
function generateNormalRandom() {
    let u1 = 0, u2 = 0;
    // Ensure we don't get 0 which would cause log(0)
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();

    // Box-Muller transform
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0;
}

/**
 * Perform Cholesky decomposition on a correlation matrix
 * Returns lower triangular matrix L such that L * L^T = correlationMatrix
 * 
 * @param {Array<Array<number>>} matrix - Correlation matrix (must be positive definite)
 * @returns {Array<Array<number>>} Lower triangular Cholesky matrix
 */
function choleskyDecomposition(matrix) {
    const n = matrix.length;
    const L = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;
            for (let k = 0; k < j; k++) {
                sum += L[i][k] * L[j][k];
            }

            if (i === j) {
                L[i][j] = Math.sqrt(Math.max(matrix[i][i] - sum, 0.0001)); // Ensure positive
            } else {
                L[i][j] = (matrix[i][j] - sum) / L[j][j];
            }
        }
    }

    return L;
}

/**
 * Generate correlated random returns for multiple assets
 * 
 * @param {Array<Object>} portfolioAssets - Array of {product, weight, amount}
 * @returns {Array<number>} Array of correlated random returns (one per asset)
 */
function generateCorrelatedReturns(portfolioAssets) {
    const n = portfolioAssets.length;

    // Build correlation matrix
    const corrMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const assetClass1 = portfolioAssets[i].product.assetClass;
            const assetClass2 = portfolioAssets[j].product.assetClass;
            corrMatrix[i][j] = getCorrelation(assetClass1, assetClass2);
        }
    }

    // Cholesky decomposition
    const L = choleskyDecomposition(corrMatrix);

    // Generate independent standard normal random variables
    const independentZ = Array(n).fill(0).map(() => generateNormalRandom());

    // Transform to correlated variables using Cholesky matrix
    const correlatedZ = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            correlatedZ[i] += L[i][j] * independentZ[j];
        }
    }

    // Convert to returns using each asset's mean and volatility
    const returns = portfolioAssets.map((asset, i) => {
        const mu = asset.product.metrics.avgReturn / 100;
        const sigma = asset.product.metrics.avgVolatility / 100;
        return mu + sigma * correlatedZ[i];
    });

    return returns;
}

/**
 * Generate a single return path for an entire portfolio
 * 
 * @param {Array<Object>} portfolioAssets - Array of {product, weight, amount}
 * @param {number} years - Number of years to simulate
 * @returns {Array<number>} Array of portfolio values for each year (including initial)
 */
export function generatePortfolioPath(portfolioAssets, years) {
    const initialValue = portfolioAssets.reduce((sum, asset) => sum + asset.amount, 0);
    const path = [initialValue];

    // Track each asset's value separately
    const assetValues = portfolioAssets.map(asset => asset.amount);

    for (let year = 1; year <= years; year++) {
        // Generate correlated returns for all assets
        const returns = generateCorrelatedReturns(portfolioAssets);

        // Apply returns to each asset
        for (let i = 0; i < portfolioAssets.length; i++) {
            assetValues[i] = assetValues[i] * (1 + returns[i]);
        }

        // Sum to get total portfolio value
        const portfolioValue = assetValues.reduce((sum, val) => sum + val, 0);
        path.push(portfolioValue);
    }

    return path;
}

/**
 * Run Monte Carlo simulation for an entire portfolio (Invested Book)
 * 
 * @param {Array<Object>} investedAssets - Array of assets with investment selections
 * @param {Object} scenarioData - Scenario data with investmentSelections
 * @param {number} years - Number of years to simulate
 * @param {number} iterations - Number of simulations to run (default: 10000)
 * @returns {Object} Simulation results with paths and percentiles
 */
export function runPortfolioMonteCarloSimulation(investedAssets, scenarioData, years, iterations = 10000) {
    // Build portfolio from invested assets
    const portfolioAssets = investedAssets
        .map(asset => {
            const productId = scenarioData.investmentSelections[asset.id];
            if (!productId) return null;

            const product = getProductById(productId);
            if (!product) return null;

            return {
                assetId: asset.id,
                product: product,
                amount: parseFloat(asset.amount || 0),
                weight: 0 // Will calculate after filtering
            };
        })
        .filter(item => item !== null && item.amount > 0);

    if (portfolioAssets.length === 0) {
        return null;
    }

    // Calculate weights
    const totalAmount = portfolioAssets.reduce((sum, asset) => sum + asset.amount, 0);
    portfolioAssets.forEach(asset => {
        asset.weight = asset.amount / totalAmount;
    });

    console.log(`Running portfolio Monte Carlo with ${portfolioAssets.length} assets, total: ${totalAmount}`);

    // Run simulations
    // We store arrays of values per year to calculate Point-in-Time percentiles
    // Structure: yearValues[yearIndex] = [val_sim1, val_sim2, ...]
    const yearValues = Array(years + 1).fill(0).map(() => new Float32Array(iterations));

    for (let i = 0; i < iterations; i++) {
        const path = generatePortfolioPath(portfolioAssets, years);
        for (let y = 0; y <= years; y++) {
            yearValues[y][i] = path[y];
        }
    }

    // Calculate percentiles for each year independently (Point-in-Time)
    // This creates smooth curves ("cones of uncertainty") instead of wiggly single paths
    const percentiles = {};
    const pLevels = [5, 10, 25, 50, 75, 90, 95];

    // Initialize percentile paths
    pLevels.forEach(p => {
        percentiles[`p${p}`] = { path: new Float32Array(years + 1) };
    });

    for (let y = 0; y <= years; y++) {
        // Sort values for this year
        yearValues[y].sort(); // Float32Array sorts numerically by default in modern browsers (or lexicographically in old, but we assume modern env)

        pLevels.forEach(p => {
            const index = Math.floor((p / 100) * (iterations - 1));
            percentiles[`p${p}`].path[y] = yearValues[y][index];
        });
    }

    // Return the result (structure compatible with existing consumers)
    return {
        portfolioAssets: portfolioAssets,
        totalAmount: totalAmount,
        simulations: [], // We no longer return raw paths to save memory
        percentiles: percentiles,
        timestamp: Date.now()
    };
}

/**
 * Extract a specific percentile from portfolio simulation results
 * 
 * @param {Object} simulationResult - Result from runPortfolioMonteCarloSimulation
 * @param {number} percentile - Percentile to extract (5-95)
 * @returns {Array<{year: number, value: number}>} Year-by-year projection
 */
export function extractPercentile(simulationResult, percentile) {
    const percentileKey = `p${percentile}`;
    const percentileData = simulationResult.percentiles[percentileKey];

    if (!percentileData) {
        console.warn(`Percentile ${percentile} not found, using p50 as fallback`);
        return extractPercentile(simulationResult, 50);
    }

    // Convert path array to year-value objects
    return percentileData.path.map((value, index) => ({
        year: new Date().getFullYear() + index,
        value: Math.round(value)
    }));
}

/**
 * Calculate percentile range (upper and lower) for bandwidth display
 * 
 * @param {Object} simulationResult - Portfolio simulation result
 * @param {number} centerPercentile - Center percentile (usually 50)
 * @param {number} bandwidth - Spread from center (e.g., 5 for ±5%)
 * @returns {Object} Object with upper and lower projection arrays
 */
export function calculateBandwidth(simulationResult, centerPercentile, bandwidth) {
    const upperPercentile = Math.min(centerPercentile + bandwidth, 95);
    const lowerPercentile = Math.max(centerPercentile - bandwidth, 5);

    return {
        upper: extractPercentile(simulationResult, upperPercentile),
        lower: extractPercentile(simulationResult, lowerPercentile)
    };
}

/**
 * Simulation cache management (portfolio-level)
 */
let portfolioSimulationCache = null;

/**
 * Get cached portfolio simulation result
 * Cache key is based on the portfolio composition (asset IDs + product IDs)
 * 
 * @param {Array<Object>} investedAssets - Array of assets
 * @param {Object} scenarioData - Scenario data with investmentSelections
 * @returns {Object|null} Cached simulation result or null
 */
export function getCachedPortfolioSimulation(investedAssets, scenarioData) {
    if (!portfolioSimulationCache) return null;

    // Generate cache key from portfolio composition
    const cacheKey = investedAssets
        .map(asset => `${asset.id}:${scenarioData.investmentSelections[asset.id]}:${asset.amount}`)
        .sort()
        .join('|');

    if (portfolioSimulationCache.key === cacheKey) {
        // Check if cache is still valid (1 hour expiration)
        if (Date.now() - portfolioSimulationCache.timestamp < 3600000) {
            return portfolioSimulationCache.result;
        }
    }

    return null;
}

/**
 * Store portfolio simulation result in cache
 * 
 * @param {Array<Object>} investedAssets - Array of assets
 * @param {Object} scenarioData - Scenario data with investmentSelections
 * @param {Object} simulationResult - Result from runPortfolioMonteCarloSimulation
 */
export function cachePortfolioSimulation(investedAssets, scenarioData, simulationResult) {
    const cacheKey = investedAssets
        .map(asset => `${asset.id}:${scenarioData.investmentSelections[asset.id]}:${asset.amount}`)
        .sort()
        .join('|');

    portfolioSimulationCache = {
        key: cacheKey,
        result: simulationResult,
        timestamp: Date.now()
    };
}

/**
 * Clear portfolio simulation cache
 */
export function clearPortfolioSimulationCache() {
    portfolioSimulationCache = null;
}

/**
 * Extract year-by-year returns from a percentile path
 * Used to apply Monte Carlo returns in the simulation loop
 * 
 * @param {Object} portfolioSimulation - Result from runPortfolioMonteCarloSimulation
 * @param {number} percentile - Percentile to extract (5-95)
 * @returns {Array<number>} Array of annual returns (e.g., [0.068, 0.052, -0.015, ...])
 */
export function getYearlyReturns(portfolioSimulation, percentile) {
    if (!portfolioSimulation || !portfolioSimulation.percentiles) {
        return [];
    }

    const percentileKey = `p${percentile}`;
    const percentileData = portfolioSimulation.percentiles[percentileKey];

    if (!percentileData || !percentileData.path) {
        console.warn(`Percentile ${percentile} not found in simulation results`);
        return [];
    }

    const path = percentileData.path;
    const returns = [];

    // Calculate year-over-year returns
    for (let i = 1; i < path.length; i++) {
        const yearReturn = (path[i] - path[i - 1]) / path[i - 1];
        returns.push(yearReturn);
    }

    return returns;
}
