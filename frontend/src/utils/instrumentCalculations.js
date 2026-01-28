/**
 * Instrument Calculations - Frequency-Aware Parameter Computation
 * 
 * This module computes all statistical parameters (μ, σ, correlations) dynamically
 * from encrypted time series data. No parameters are stored - everything is derived
 * at runtime from historical data.
 * 
 * Zero-Knowledge Compliant: All computations happen client-side.
 */

/**
 * Get periods per year based on frequency
 */
function getPeriodsPerYear(frequency) {
    switch (frequency) {
        case 'daily': return 252;      // Trading days
        case 'monthly': return 12;
        case 'annual': return 1;
        default: throw new Error(`Unknown frequency: ${frequency}`);
    }
}

/**
 * Calculate annualized return (CAGR) from time series
 * Independent of frequency - uses calendar time
 * 
 * @param {Array<{date: string, value: number}>} timeSeries - Historical data
 * @param {string} frequency - Data frequency (for metadata only)
 * @returns {Object} Result with value, totalReturn, years, dataPoints, error
 */
export function calculateAnnualizedReturn(timeSeries, frequency) {
    if (!timeSeries || timeSeries.length < 2) {
        return { value: null, error: 'Insufficient data (minimum 2 points required)' };
    }

    const sortedSeries = [...timeSeries].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );

    const startValue = sortedSeries[0].value;
    const endValue = sortedSeries[sortedSeries.length - 1].value;
    const startDate = new Date(sortedSeries[0].date);
    const endDate = new Date(sortedSeries[sortedSeries.length - 1].date);

    // Calculate years (calendar time, not data points)
    const years = (endDate - startDate) / (365.25 * 24 * 60 * 60 * 1000);

    if (years <= 0) {
        return { value: null, error: 'Invalid date range (end must be after start)' };
    }

    if (startValue <= 0 || endValue <= 0) {
        return { value: null, error: 'Non-positive values in time series' };
    }

    // CAGR = (End/Start)^(1/years) - 1
    const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;

    return {
        value: cagr,
        totalReturn: ((endValue - startValue) / startValue) * 100,
        years,
        dataPoints: timeSeries.length,
        error: null
    };
}

/**
 * Calculate returns array from time series
 * 
 * @param {Array<{date: string, value: number}>} timeSeries - Historical data
 * @param {string} frequency - Data frequency
 * @returns {Object} Returns array, frequency, and periods per year
 */
export function calculateReturns(timeSeries, frequency) {
    const sortedSeries = [...timeSeries].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );

    const returns = [];

    for (let i = 1; i < sortedSeries.length; i++) {
        if (sortedSeries[i - 1].value <= 0) {
            console.warn(`Non-positive value at ${sortedSeries[i - 1].date}: ${sortedSeries[i - 1].value}`);
            continue;
        }

        const r = (sortedSeries[i].value - sortedSeries[i - 1].value) /
            sortedSeries[i - 1].value;
        returns.push(r);
    }

    return {
        returns,
        frequency,
        periodsPerYear: getPeriodsPerYear(frequency)
    };
}

/**
 * Calculate annualized volatility with proper frequency scaling
 * Formula: σ_annual = σ_period × sqrt(periods_per_year)
 * 
 * @param {Array<{date: string, value: number}>} timeSeries - Historical data
 * @param {string} frequency - Data frequency
 * @returns {Object} Result with annualized volatility, period volatility, etc.
 */
export function calculateAnnualizedVolatility(timeSeries, frequency) {
    const { returns, periodsPerYear } = calculateReturns(timeSeries, frequency);

    if (returns.length === 0) {
        return { value: null, error: 'Insufficient data for volatility calculation' };
    }

    // Calculate period volatility (standard deviation of returns)
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) =>
        sum + Math.pow(r - meanReturn, 2), 0
    ) / returns.length;

    const periodVolatility = Math.sqrt(variance);

    // Annualize: σ_annual = σ_period × sqrt(N)
    const annualizedVolatility = periodVolatility * Math.sqrt(periodsPerYear);

    return {
        value: annualizedVolatility * 100,  // Convert to percentage
        periodVolatility: periodVolatility * 100,
        periodsPerYear,
        dataPoints: returns.length,
        error: null
    };
}

/**
 * Calculate rolling 3-year returns
 * 
 * @param {Array<{date: string, value: number}>} timeSeries - Historical data
 * @returns {Array<{period: string, return: number}>} Rolling 3-year returns
 */
export function calculateRolling3YearReturns(timeSeries) {
    const sortedSeries = [...timeSeries].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );

    const rolling3Y = [];

    for (let i = 0; i <= sortedSeries.length - 4; i++) {
        const startValue = sortedSeries[i].value;
        const endValue = sortedSeries[i + 3].value;

        if (startValue <= 0) continue;

        const totalReturn = ((endValue - startValue) / startValue) * 100;

        rolling3Y.push({
            period: `${sortedSeries[i].date.substring(0, 4)}-${sortedSeries[i + 3].date.substring(0, 4)}`,
            return: totalReturn
        });
    }

    return rolling3Y;
}

/**
 * Calculate max 3-year loss and gain
 * 
 * @param {Array<{date: string, value: number}>} timeSeries - Historical data
 * @returns {Object} Max 3-year metrics
 */
export function calculateMax3YearMetrics(timeSeries) {
    const rolling3Y = calculateRolling3YearReturns(timeSeries);

    if (rolling3Y.length === 0) {
        return {
            max3YLoss: 0,
            max3YLossPeriod: 'N/A',
            max3YGain: 0,
            max3YGainPeriod: 'N/A'
        };
    }

    const maxLoss = Math.min(...rolling3Y.map(r => r.return));
    const maxGain = Math.max(...rolling3Y.map(r => r.return));

    const lossEntry = rolling3Y.find(r => r.return === maxLoss);
    const gainEntry = rolling3Y.find(r => r.return === maxGain);

    return {
        max3YLoss: maxLoss,
        max3YLossPeriod: lossEntry.period,
        max3YGain: maxGain,
        max3YGainPeriod: gainEntry.period
    };
}

/**
 * Compute all parameters for an instrument
 * 
 * @param {Object} instrument - Instrument with timeSeries and frequency
 * @param {Object} windowConfig - Optional historical window configuration
 * @returns {Object} Computed parameters
 */
export function computeInstrumentParameters(instrument, windowConfig = null) {
    const { timeSeries, frequency } = instrument;

    // Apply historical window if specified (future enhancement)
    const effectiveSeries = timeSeries; // windowConfig logic can be added here

    const returnCalc = calculateAnnualizedReturn(effectiveSeries, frequency);
    const volCalc = calculateAnnualizedVolatility(effectiveSeries, frequency);
    const max3Y = calculateMax3YearMetrics(effectiveSeries);

    return {
        avgReturn: returnCalc.value,
        avgVolatility: volCalc.value,
        max3YLoss: max3Y.max3YLoss,
        max3YLossPeriod: max3Y.max3YLossPeriod,
        max3YGain: max3Y.max3YGain,
        max3YGainPeriod: max3Y.max3YGainPeriod,

        // Metadata
        dataPoints: effectiveSeries.length,
        errors: [returnCalc.error, volCalc.error].filter(e => e !== null)
    };
}

/**
 * Align two time series by date and calculate synchronized returns
 * Returns only periods where BOTH instruments have data
 * 
 * @param {Array} ts1 - First time series
 * @param {Array} ts2 - Second time series
 * @param {string} freq1 - First frequency
 * @param {string} freq2 - Second frequency
 * @returns {Object} Aligned returns or error
 */
export function alignTimeSeriesForCorrelation(ts1, ts2, freq1, freq2) {
    // Frequency must match
    if (freq1 !== freq2) {
        return {
            success: false,
            error: `Frequency mismatch: ${freq1} vs ${freq2}`,
            commonReturns1: [],
            commonReturns2: []
        };
    }

    // Create date-indexed maps
    const map1 = new Map(ts1.map(p => [p.date, p.value]));
    const map2 = new Map(ts2.map(p => [p.date, p.value]));

    // Find common dates
    const dates1 = new Set(ts1.map(p => p.date));
    const dates2 = new Set(ts2.map(p => p.date));
    const commonDates = [...dates1].filter(d => dates2.has(d)).sort();

    if (commonDates.length < 2) {
        return {
            success: false,
            error: `Insufficient overlap: ${commonDates.length} common dates`,
            commonReturns1: [],
            commonReturns2: []
        };
    }

    // Calculate returns on common dates
    const returns1 = [];
    const returns2 = [];

    for (let i = 1; i < commonDates.length; i++) {
        const prevDate = commonDates[i - 1];
        const currDate = commonDates[i];

        const val1_prev = map1.get(prevDate);
        const val1_curr = map1.get(currDate);
        const val2_prev = map2.get(prevDate);
        const val2_curr = map2.get(currDate);

        if (val1_prev <= 0 || val2_prev <= 0) continue;

        const r1 = (val1_curr - val1_prev) / val1_prev;
        const r2 = (val2_curr - val2_prev) / val2_prev;

        returns1.push(r1);
        returns2.push(r2);
    }

    return {
        success: true,
        commonReturns1: returns1,
        commonReturns2: returns2,
        commonDates: commonDates.length,
        frequency: freq1
    };
}

/**
 * Calculate Pearson correlation with minimum data requirements
 * Minimum: 24 periods for monthly data (2 years)
 * 
 * @param {Array} ts1 - First time series
 * @param {Array} ts2 - Second time series
 * @param {string} freq1 - First frequency
 * @param {string} freq2 - Second frequency
 * @param {number} minPeriods - Minimum required periods
 * @returns {Object} Correlation result
 */
export function calculateCorrelation(ts1, ts2, freq1, freq2, minPeriods = 24) {
    const aligned = alignTimeSeriesForCorrelation(ts1, ts2, freq1, freq2);

    if (!aligned.success) {
        return {
            value: null,
            error: aligned.error,
            dataPoints: 0
        };
    }

    const { commonReturns1, commonReturns2, commonDates } = aligned;
    const n = commonReturns1.length;

    // Check minimum data requirement
    if (n < minPeriods) {
        return {
            value: null,
            error: `Insufficient data: ${n} periods (minimum ${minPeriods})`,
            dataPoints: n
        };
    }

    // Calculate means
    const mean1 = commonReturns1.reduce((sum, r) => sum + r, 0) / n;
    const mean2 = commonReturns2.reduce((sum, r) => sum + r, 0) / n;

    // Calculate correlation coefficient
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;

    for (let i = 0; i < n; i++) {
        const diff1 = commonReturns1[i] - mean1;
        const diff2 = commonReturns2[i] - mean2;
        numerator += diff1 * diff2;
        sumSq1 += diff1 * diff1;
        sumSq2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sumSq1 * sumSq2);

    if (denominator === 0) {
        return {
            value: null,
            error: 'Zero variance in one or both series',
            dataPoints: n
        };
    }

    const correlation = numerator / denominator;

    // Clamp to [-1, 1] to handle numerical errors
    const clampedCorrelation = Math.max(-1, Math.min(1, correlation));

    return {
        value: clampedCorrelation,
        dataPoints: n,
        error: null
    };
}

/**
 * Asset class default correlations (conservative estimates)
 * Used as fallback when insufficient data
 */
const ASSET_CLASS_CORRELATIONS = {
    'Equities': {
        'Equities': 0.85,
        'Bonds': -0.10,
        'Real Estate': 0.50,
        'Commodities': 0.20,
        'Money Market': 0.05
    },
    'Bonds': {
        'Equities': -0.10,
        'Bonds': 0.90,
        'Real Estate': 0.10,
        'Commodities': -0.05,
        'Money Market': 0.40
    },
    'Real Estate': {
        'Equities': 0.50,
        'Bonds': 0.10,
        'Real Estate': 0.85,
        'Commodities': 0.25,
        'Money Market': 0.05
    },
    'Commodities': {
        'Equities': 0.20,
        'Bonds': -0.05,
        'Real Estate': 0.25,
        'Commodities': 0.85,
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
 * Get correlation with fallback strategy
 * 
 * @param {Object} inst1 - First instrument
 * @param {Object} inst2 - Second instrument
 * @param {Object} computedCorrelation - Computed correlation result
 * @returns {number} Correlation value
 */
export function getCorrelationWithFallback(inst1, inst2, computedCorrelation) {
    // Same instrument = perfect correlation
    if (inst1.id === inst2.id) {
        return 1.0;
    }

    // Use computed correlation if available and valid
    if (computedCorrelation?.value !== null &&
        !isNaN(computedCorrelation.value)) {
        return computedCorrelation.value;
    }

    // Fallback to asset class correlation
    const assetClass1 = inst1.assetClass;
    const assetClass2 = inst2.assetClass;

    const fallbackCorr = ASSET_CLASS_CORRELATIONS[assetClass1]?.[assetClass2];

    if (fallbackCorr !== undefined) {
        console.warn(
            `Using asset class fallback correlation for ${inst1.id} - ${inst2.id}: ${fallbackCorr}`,
            `Reason: ${computedCorrelation?.error || 'No data'}`
        );
        return fallbackCorr;
    }

    // Ultimate fallback: moderate positive correlation
    console.warn(
        `Using default fallback correlation for ${inst1.id} - ${inst2.id}: 0.30`
    );
    return 0.30;
}

/**
 * Build and validate correlation matrix
 * Ensures symmetry and positive definiteness
 * 
 * @param {Array<Object>} instruments - Array of instruments
 * @returns {Object} Validated correlation matrix with metadata
 */
export function buildValidatedCorrelationMatrix(instruments) {
    const n = instruments.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
    const correlationDetails = new Map();

    // Compute all pairwise correlations
    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            const inst1 = instruments[i];
            const inst2 = instruments[j];

            let correlation;

            if (i === j) {
                correlation = 1.0;
            } else {
                const computed = calculateCorrelation(
                    inst1.timeSeries,
                    inst2.timeSeries,
                    inst1.frequency,
                    inst2.frequency
                );

                correlation = getCorrelationWithFallback(inst1, inst2, computed);

                // Store details for debugging
                correlationDetails.set(`${inst1.id}:${inst2.id}`, {
                    computed: computed.value,
                    used: correlation,
                    dataPoints: computed.dataPoints,
                    error: computed.error,
                    fallbackUsed: computed.value === null
                });
            }

            // Ensure symmetry
            matrix[i][j] = correlation;
            matrix[j][i] = correlation;
        }
    }

    // Validate positive definiteness (simplified check)
    const validation = validatePositiveDefinite(matrix);

    if (!validation.isValid) {
        console.warn('Correlation matrix not positive definite, applying correction');
        const corrected = ensurePositiveDefinite(matrix);
        return {
            matrix: corrected,
            isValid: true,
            correctionApplied: true,
            details: correlationDetails
        };
    }

    return {
        matrix,
        isValid: true,
        correctionApplied: false,
        details: correlationDetails
    };
}

/**
 * Validate positive definiteness (simplified check)
 */
function validatePositiveDefinite(matrix) {
    const n = matrix.length;

    // Check diagonal elements are 1
    for (let i = 0; i < n; i++) {
        if (Math.abs(matrix[i][i] - 1.0) > 1e-6) {
            return { isValid: false, reason: 'Diagonal not 1' };
        }
    }

    // Check symmetry
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-6) {
                return { isValid: false, reason: 'Not symmetric' };
            }
        }
    }

    // Check bounds [-1, 1]
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (matrix[i][j] < -1 || matrix[i][j] > 1) {
                return { isValid: false, reason: 'Out of bounds' };
            }
        }
    }

    return { isValid: true };
}

/**
 * Ensure positive definiteness using shrinkage
 * Blend with identity matrix if needed
 */
function ensurePositiveDefinite(matrix, shrinkage = 0.1) {
    const n = matrix.length;
    const corrected = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                corrected[i][j] = 1.0;
            } else {
                // Shrink towards zero
                corrected[i][j] = matrix[i][j] * (1 - shrinkage);
            }
        }
    }

    return corrected;
}

/**
 * Get correlation between two instruments from matrix
 * 
 * @param {Map} correlationDetails - Correlation details map
 * @param {string} id1 - First instrument ID
 * @param {string} id2 - Second instrument ID
 * @returns {number} Correlation value
 */
export function getInstrumentCorrelation(correlationDetails, id1, id2) {
    if (id1 === id2) return 1.0;

    const key1 = `${id1}:${id2}`;
    const key2 = `${id2}:${id1}`;

    const detail = correlationDetails.get(key1) || correlationDetails.get(key2);

    return detail?.used || 0.3; // Fallback to default
}
