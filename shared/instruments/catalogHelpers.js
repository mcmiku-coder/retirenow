/**
 * Instrument Catalog Helper Functions
 * 
 * Utility functions for working with the code-owned instrument catalog.
 * All functions operate on in-memory data only.
 */

import { INSTRUMENT_CATALOG } from './instrumentCatalog.js';

/**
 * Get instrument by ID
 */
export function getInstrumentById(id) {
    return INSTRUMENT_CATALOG.find(i => i.id === id);
}

/**
 * Get all active instruments
 */
export function getActiveInstruments() {
    return INSTRUMENT_CATALOG.filter(i => i.active);
}

/**
 * Get all instruments (including inactive)
 */
export function getAllInstruments() {
    return [...INSTRUMENT_CATALOG];
}

/**
 * Validate instrument structure
 */
export function validateInstrument(instrument, existingCatalog = INSTRUMENT_CATALOG) {
    const errors = [];

    // Required fields
    if (!instrument.id || typeof instrument.id !== 'string') {
        errors.push('ID is required and must be a string');
    } else {
        // Check for duplicate IDs (excluding self if editing)
        const duplicate = existingCatalog.find(i => i.id === instrument.id);
        if (duplicate && duplicate !== instrument) {
            errors.push(`Duplicate ID: ${instrument.id}`);
        }
    }

    if (!instrument.name || typeof instrument.name !== 'string') {
        errors.push('Name is required and must be a string');
    }

    if (!instrument.assetClass || typeof instrument.assetClass !== 'string') {
        errors.push('Asset class is required and must be a string');
    }

    // Time series validation
    if (!Array.isArray(instrument.timeSeries) || instrument.timeSeries.length < 2) {
        errors.push('Time series must be an array with at least 2 data points');
    } else {
        // Validate each point
        for (let i = 0; i < instrument.timeSeries.length; i++) {
            const point = instrument.timeSeries[i];
            if (!point.date || !point.value) {
                errors.push(`Invalid time series point at index ${i}: missing date or value`);
                break;
            }
            if (typeof point.value !== 'number' || point.value <= 0) {
                errors.push(`Invalid value at index ${i}: ${point.value} (must be positive number)`);
                break;
            }
        }
    }

    // Frequency validation
    if (!instrument.frequency || !['daily', 'monthly', 'annual'].includes(instrument.frequency)) {
        errors.push('Frequency must be one of: daily, monthly, annual');
    }

    // Active flag
    if (typeof instrument.active !== 'boolean') {
        errors.push('Active must be a boolean');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Calculate metrics from time series
 * Computes volatility, mean return, Sharpe ratio on-the-fly
 */
export function calculateMetrics(timeSeries) {
    if (!timeSeries || timeSeries.length < 2) {
        return null;
    }

    // Calculate returns
    const returns = [];
    for (let i = 1; i < timeSeries.length; i++) {
        const ret = (timeSeries[i].value - timeSeries[i - 1].value) / timeSeries[i - 1].value;
        returns.push(ret);
    }

    // Mean return
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Volatility (standard deviation)
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Sharpe ratio (assuming risk-free rate of 0 for simplicity)
    const sharpeRatio = volatility > 0 ? meanReturn / volatility : 0;

    // Annualize if needed (this is simplified - real implementation would check frequency)
    const annualizedReturn = meanReturn;
    const annualizedVolatility = volatility;

    return {
        dataPoints: timeSeries.length,
        returns: returns.length,
        meanReturn: annualizedReturn,
        volatility: annualizedVolatility,
        sharpeRatio,
        minReturn: Math.min(...returns),
        maxReturn: Math.max(...returns),
        startValue: timeSeries[0].value,
        endValue: timeSeries[timeSeries.length - 1].value,
        totalReturn: (timeSeries[timeSeries.length - 1].value - timeSeries[0].value) / timeSeries[0].value
    };
}

/**
 * Calculate correlation between two time series
 */
export function calculateCorrelation(timeSeries1, timeSeries2) {
    if (!timeSeries1 || !timeSeries2 || timeSeries1.length !== timeSeries2.length) {
        return null;
    }

    // Calculate returns
    const returns1 = [];
    const returns2 = [];

    for (let i = 1; i < timeSeries1.length; i++) {
        returns1.push((timeSeries1[i].value - timeSeries1[i - 1].value) / timeSeries1[i - 1].value);
        returns2.push((timeSeries2[i].value - timeSeries2[i - 1].value) / timeSeries2[i - 1].value);
    }

    // Calculate means
    const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length;
    const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length;

    // Calculate covariance and standard deviations
    let covariance = 0;
    let variance1 = 0;
    let variance2 = 0;

    for (let i = 0; i < returns1.length; i++) {
        const diff1 = returns1[i] - mean1;
        const diff2 = returns2[i] - mean2;
        covariance += diff1 * diff2;
        variance1 += diff1 * diff1;
        variance2 += diff2 * diff2;
    }

    covariance /= returns1.length;
    const stdDev1 = Math.sqrt(variance1 / returns1.length);
    const stdDev2 = Math.sqrt(variance2 / returns2.length);

    // Correlation coefficient
    const correlation = (stdDev1 > 0 && stdDev2 > 0) ? covariance / (stdDev1 * stdDev2) : 0;

    return correlation;
}

/**
 * Generate correlation matrix for all instruments
 */
export function generateCorrelationMatrix(instruments = INSTRUMENT_CATALOG) {
    const matrix = {};

    for (let i = 0; i < instruments.length; i++) {
        matrix[instruments[i].id] = {};
        for (let j = 0; j < instruments.length; j++) {
            if (i === j) {
                matrix[instruments[i].id][instruments[j].id] = 1.0;
            } else {
                const corr = calculateCorrelation(
                    instruments[i].timeSeries,
                    instruments[j].timeSeries
                );
                matrix[instruments[i].id][instruments[j].id] = corr;
            }
        }
    }

    return matrix;
}
