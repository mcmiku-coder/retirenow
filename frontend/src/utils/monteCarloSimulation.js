/**
 * DEPRECATED
 * 
 * This file contained the legacy Monte Carlo simulation logic.
 * It has been replaced by `monteCarloEngine.js`.
 * 
 * All functionality has been migrated to `projectionCalculator.js` which uses the new engine.
 * 
 * Do not import from this file.
 */

export const runPortfolioMonteCarloSimulation = () => {
    console.error("Legacy Monte Carlo Simulation called. This function is deprecated.");
    return null;
};

export const extractPercentile = () => [];
export const calculateBandwidth = () => ({ upper: [], lower: [] });
