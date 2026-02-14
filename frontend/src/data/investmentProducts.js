// Investment Products Data
// Dynamically loaded from the instrument catalog (Code-Owned Source)
// All data is MONTHLY resolution.

import { INSTRUMENT_CATALOG } from '../shared/instruments/instrumentCatalog';
import { calculateMetrics } from '../shared/instruments/catalogHelpers';

// Transform Catalog to Application Product Model
export const investmentProducts = INSTRUMENT_CATALOG.map(inst => {
    // Calculate metrics on the fly
    const metrics = calculateMetrics(inst.timeSeries);

    // Map timeSeries to performanceData (keeping monthly resolution as requested)
    const performanceData = inst.timeSeries.map(pt => ({
        date: pt.date, // YYYY-MM-DD
        year: pt.date.substring(0, 4), // Keep year for backward compatibility if needed, but date is primary
        value: pt.value
    }));

    return {
        id: inst.id,
        name: inst.name,
        ticker: inst.id.toUpperCase(), // Derived ticker
        description: `${inst.assetClass} - ${inst.name}`, // Simple description
        assetClass: inst.assetClass,
        quotationCurrency: inst.quotationCurrency || 'CHF',
        metrics: {
            avgReturn: metrics ? parseFloat(metrics.meanReturn.toFixed(1)) : 0,
            avgVolatility: metrics ? parseFloat(metrics.volatility.toFixed(1)) : 0,
            max3YLoss: metrics ? parseFloat(metrics.maxDrawdown.toFixed(1)) : 0, // Using maxDrawdown as proxy for max3YLoss
            max3YLossPeriod: metrics ? metrics.maxDrawdownPeriod : '',
            max3YGain: metrics ? parseFloat(metrics.bestYear.toFixed(1)) : 0, // approximate mapping
            max3YGainPeriod: '', // Not currently calculated in simpler metrics
        },
        performanceData: performanceData
    };
});

export const getProductById = (id) => {
    return investmentProducts.find(product => product.id === id);
};

export const getAllProducts = () => {
    return investmentProducts;
};

/**
 * Correlation Matrix between Asset Classes
 * Based on historical correlations between major asset classes
 * Values range from -1 (perfect negative correlation) to +1 (perfect positive correlation)
 */
export const assetClassCorrelations = {
    'Equities': {
        'Equities': 1.00,      // Perfect correlation with itself
        'Bonds': -0.15,        // Slight negative correlation (flight to safety)
        'Real Estate': 0.55,   // Moderate positive correlation
        'Commodities': 0.25,   // Low positive correlation
        'Money Market': 0.05   // Very low correlation (near zero)
    },
    'Bonds': {
        'Equities': -0.15,
        'Bonds': 1.00,
        'Real Estate': 0.10,
        'Commodities': -0.05,
        'Money Market': 0.40    // Higher correlation with cash-like assets
    },
    'Real Estate': {
        'Equities': 0.55,
        'Bonds': 0.10,
        'Real Estate': 1.00,
        'Commodities': 0.30,
        'Money Market': 0.05
    },
    'Commodities': {
        'Equities': 0.25,
        'Bonds': -0.05,
        'Real Estate': 0.30,
        'Commodities': 1.00,
        'Money Market': 0.00
    },
    'Money Market': {
        'Equities': 0.05,
        'Bonds': 0.40,
        'Real Estate': 0.05,
        'Commodities': 0.00,
        'Money Market': 1.00
    }
};

/**
 * Get correlation between two asset classes
 * @param {string} assetClass1 - First asset class
 * @param {string} assetClass2 - Second asset class
 * @returns {number} Correlation coefficient (-1 to 1)
 */
export const getCorrelation = (assetClass1, assetClass2) => {
    if (!assetClassCorrelations[assetClass1] || !assetClassCorrelations[assetClass1][assetClass2]) {
        console.warn(`Correlation not found for ${assetClass1} and ${assetClass2}, defaulting to 0`);
        return 0;
    }
    return assetClassCorrelations[assetClass1][assetClass2];
};

// Helper to get asset class icon and color
export const getAssetClassStyle = (assetClass) => {
    const styles = {
        'Equities': { color: 'text-red-500', bgColor: 'bg-red-500/10' },
        'Bonds': { color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
        'Real Estate': { color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
        'Money Market': { color: 'text-green-500', bgColor: 'bg-green-500/10' },
        'Commodities': { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    };
    return styles[assetClass] || { color: 'text-gray-500', bgColor: 'bg-gray-500/10' };
};
