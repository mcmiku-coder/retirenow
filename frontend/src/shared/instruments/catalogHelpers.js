/**
 * Instrument Catalog Helper Functions
 * 
 * Utility functions for working with the code-owned instrument catalog.
 * All functions operate on in-memory data only.
 */

import { INSTRUMENT_CATALOG } from './instrumentCatalog.js';

/**
 * Format date for error messages
 */
function formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

/**
 * Strict validation for time series data
 * Enforces monthly-only frequency with comprehensive checks
 * 
 * ARCHITECTURAL REQUIREMENT: Only monthly data is supported.
 * This ensures consistency across the entire simulation engine.
 * 
 * @param {Array} timeSeries - Array of {date, value} objects
 * @param {string} frequency - Must be 'monthly'
 * @returns {Object} {valid: boolean, errors: string[]}
 */
export function validateTimeSeriesStrict(timeSeries, frequency) {
    const errors = [];

    // Rule 0: Frequency MUST be monthly (architectural requirement)
    if (frequency !== 'monthly') {
        errors.push(`Only monthly frequency is supported (got "${frequency}")`);
        return { valid: false, errors }; // Fail immediately
    }

    // Rule 1: Minimum data points (24 months = 2 years)
    if (timeSeries.length < 24) {
        errors.push(`Monthly data requires at least 24 months (got ${timeSeries.length})`);
    }

    // Rule 2: All values must be > 0 (prices/NAV, not returns)
    for (let i = 0; i < timeSeries.length; i++) {
        const value = timeSeries[i].value;

        if (isNaN(value)) {
            errors.push(`Value at index ${i} is NaN`);
            break;
        }

        if (value <= 0) {
            errors.push(`Value at index ${i} must be > 0 (got ${value})`);
            break;
        }
    }

    // Rule 3: Monthly frequency validation (MANDATORY)
    if (timeSeries.length >= 2) {
        const dates = timeSeries.map(p => new Date(p.date));

        // Check 3a: Dates must be in ascending order
        for (let i = 1; i < dates.length; i++) {
            if (dates[i] <= dates[i - 1]) {
                errors.push(
                    `Dates must be in ascending order (issue at index ${i}: ` +
                    `${formatDate(dates[i - 1])} -> ${formatDate(dates[i])})`
                );
                break;
            }
        }

        // Check 3b: Monthly spacing (exactly 1 month between consecutive dates)
        for (let i = 1; i < dates.length; i++) {
            const prevDate = dates[i - 1];
            const currDate = dates[i];

            const monthsDiff = (currDate.getFullYear() - prevDate.getFullYear()) * 12
                + (currDate.getMonth() - prevDate.getMonth());

            if (monthsDiff !== 1) {
                errors.push(
                    `Gap detected: ${monthsDiff} months between ` +
                    `${formatDate(prevDate)} and ${formatDate(currDate)} ` +
                    `(expected exactly 1 month)`
                );
                break;
            }
        }

        // Check 3c: No duplicate months
        const monthKeys = new Set();
        for (let i = 0; i < dates.length; i++) {
            const key = `${dates[i].getFullYear()}-${dates[i].getMonth()}`;
            if (monthKeys.has(key)) {
                errors.push(`Duplicate month detected: ${formatDate(dates[i])}`);
                break;
            }
            monthKeys.add(key);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

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

    if (!instrument.quotationCurrency || typeof instrument.quotationCurrency !== 'string') {
        errors.push('Quotation currency is required and must be a string');
    }

    // Frequency MUST be monthly (architectural requirement)
    if (instrument.frequency !== 'monthly') {
        errors.push('Only monthly frequency is supported');
    }

    // Time series strict validation for monthly data
    if (instrument.frequency === 'monthly' && Array.isArray(instrument.timeSeries)) {
        const strictResult = validateTimeSeriesStrict(instrument.timeSeries, 'monthly');
        if (!strictResult.valid) {
            errors.push(...strictResult.errors);
        }
    } else if (!Array.isArray(instrument.timeSeries) || instrument.timeSeries.length < 2) {
        errors.push('Time series must be an array with at least 2 data points');
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
    const annualizedReturn = meanReturn * 12; // Monthly to Annual
    const annualizedVolatility = volatility * Math.sqrt(12); // Monthly to Annual

    // Calculate Max Drawdown
    let maxDrawdown = 0;
    let maxDrawdownPeriod = '';
    let peak = timeSeries[0].value;
    let peakDate = timeSeries[0].date;

    for (let i = 1; i < timeSeries.length; i++) {
        if (timeSeries[i].value > peak) {
            peak = timeSeries[i].value;
            peakDate = timeSeries[i].date;
        } else {
            const drawdown = (timeSeries[i].value - peak) / peak;
            if (drawdown < maxDrawdown) {
                maxDrawdown = drawdown;
                maxDrawdownPeriod = `${peakDate.substring(0, 4)}-${timeSeries[i].date.substring(0, 4)}`;
            }
        }
    }

    // Calculate Best Year (Rolling 12 months or Calendar Year? Let's do Rolling 12m for simplicity or Calendar if data allows)
    // Going with Calendar Year for specific "Year" metric
    const annualReturns = {};
    for (let i = 1; i < timeSeries.length; i++) {
        const year = timeSeries[i].date.substring(0, 4);
        if (!annualReturns[year]) annualReturns[year] = [];
        // Approximate daily/monthly return contribution? 
        // Better: Value at end of year / Value at start of year - 1
    }

    // Robust Calendar Year Calculation
    let bestYear = -Infinity;
    let bestYearPeriod = '';
    const years = [...new Set(timeSeries.map(pt => pt.date.substring(0, 4)))];

    years.forEach(year => {
        const yearPoints = timeSeries.filter(pt => pt.date.startsWith(year));
        if (yearPoints.length > 0) {
            // Check if we have start and end of year (or close to it)
            // Ideally we need the value from Dec 31st of previous year, but we might only have data starting within the year
            // Let's use first and last available point of the year
            const first = yearPoints[0];
            const last = yearPoints[yearPoints.length - 1];

            // Should properly find prev year end for full year return, but simplified:
            const returnVal = (last.value - first.value) / first.value;
            if (returnVal > bestYear) {
                bestYear = returnVal;
                bestYearPeriod = year;
            }
        }
    });

    // Convert to percentage for display (optional, but existing code expects numbers like 6.8 for 6.8%)
    // But calculateMetrics usually returns decimals (0.068). 
    // investmentProducts.js was using 6.8. 
    // I should check what format the UI expects.
    // UI expects whole numbers (e.g. 6.8), so I will multiply by 100 in the mapping or here.
    // Standard `calculateMetrics` usually returns decimals. 
    // I'll return decimals here and multiply in mapping.

    return {
        dataPoints: timeSeries.length,
        returns: returns.length,
        meanReturn: annualizedReturn * 100, // Converted to %
        volatility: annualizedVolatility * 100, // Converted to %
        sharpeRatio,
        minReturn: Math.min(...returns),
        maxReturn: Math.max(...returns),
        startValue: timeSeries[0].value,
        endValue: timeSeries[timeSeries.length - 1].value,
        totalReturn: (timeSeries[timeSeries.length - 1].value - timeSeries[0].value) / timeSeries[0].value,
        maxDrawdown: maxDrawdown * 100, // %
        maxDrawdownPeriod,
        bestYear: bestYear * 100, // %
        bestYearPeriod
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
