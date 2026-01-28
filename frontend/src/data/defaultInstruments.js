/**
 * Default Instrument Data
 * 
 * Historical time series for financial instruments.
 * This data is used to initialize new users' encrypted instrument storage.
 * 
 * Structure: Each instrument has:
 * - id: Unique identifier
 * - name: Display name
 * - assetClass: Asset classification (for correlation fallbacks)
 * - timeSeries: Array of {date, value} points
 * - frequency: Data frequency ('annual', 'monthly', 'daily')
 * - active: Whether instrument is available for selection
 * 
 * Note: All parameters (avgReturn, avgVolatility, correlations) are computed
 * dynamically from timeSeries at runtime. No pre-computed values are stored.
 */

export const defaultInstruments = [
    {
        id: 'chspi',
        name: 'iShares Core SPI® ETF (CH)',
        assetClass: 'Equities',
        timeSeries: [
            { date: '2000-12-31', value: 100 },
            { date: '2001-12-31', value: 78 },
            { date: '2002-12-31', value: 65 },
            { date: '2003-12-31', value: 82 },
            { date: '2004-12-31', value: 95 },
            { date: '2005-12-31', value: 125 },
            { date: '2006-12-31', value: 148 },
            { date: '2007-12-31', value: 165 },
            { date: '2008-12-31', value: 98 },
            { date: '2009-12-31', value: 125 },
            { date: '2010-12-31', value: 142 },
            { date: '2011-12-31', value: 135 },
            { date: '2012-12-31', value: 158 },
            { date: '2013-12-31', value: 185 },
            { date: '2014-12-31', value: 198 },
            { date: '2015-12-31', value: 192 },
            { date: '2016-12-31', value: 185 },
            { date: '2017-12-31', value: 215 },
            { date: '2018-12-31', value: 198 },
            { date: '2019-12-31', value: 245 },
            { date: '2020-12-31', value: 252 },
            { date: '2021-12-31', value: 295 },
            { date: '2022-12-31', value: 268 },
            { date: '2023-12-31', value: 298 },
            { date: '2024-12-31', value: 325 },
            { date: '2025-12-31', value: 348 },
        ],
        frequency: 'annual',
        active: true
    },
    {
        id: 'chcorp',
        name: 'iShares Core CHF Corporate Bond ETF',
        assetClass: 'Bonds',
        timeSeries: [
            { date: '2000-12-31', value: 100 },
            { date: '2001-12-31', value: 104 },
            { date: '2002-12-31', value: 108 },
            { date: '2003-12-31', value: 112 },
            { date: '2004-12-31', value: 115 },
            { date: '2005-12-31', value: 119 },
            { date: '2006-12-31', value: 122 },
            { date: '2007-12-31', value: 125 },
            { date: '2008-12-31', value: 118 },
            { date: '2009-12-31', value: 128 },
            { date: '2010-12-31', value: 132 },
            { date: '2011-12-31', value: 135 },
            { date: '2012-12-31', value: 140 },
            { date: '2013-12-31', value: 142 },
            { date: '2014-12-31', value: 148 },
            { date: '2015-12-31', value: 145 },
            { date: '2016-12-31', value: 148 },
            { date: '2017-12-31', value: 150 },
            { date: '2018-12-31', value: 148 },
            { date: '2019-12-31', value: 155 },
            { date: '2020-12-31', value: 158 },
            { date: '2021-12-31', value: 156 },
            { date: '2022-12-31', value: 142 },
            { date: '2023-12-31', value: 148 },
            { date: '2024-12-31', value: 152 },
            { date: '2025-12-31', value: 158 },
        ],
        frequency: 'annual',
        active: true
    },
    {
        id: 'srfcha',
        name: 'UBS ETF (CH) SXI Real Estate (CHF) A-dis',
        assetClass: 'Real Estate',
        timeSeries: [
            { date: '2000-12-31', value: 100 },
            { date: '2001-12-31', value: 105 },
            { date: '2002-12-31', value: 112 },
            { date: '2003-12-31', value: 125 },
            { date: '2004-12-31', value: 138 },
            { date: '2005-12-31', value: 152 },
            { date: '2006-12-31', value: 168 },
            { date: '2007-12-31', value: 175 },
            { date: '2008-12-31', value: 142 },
            { date: '2009-12-31', value: 155 },
            { date: '2010-12-31', value: 172 },
            { date: '2011-12-31', value: 168 },
            { date: '2012-12-31', value: 185 },
            { date: '2013-12-31', value: 198 },
            { date: '2014-12-31', value: 212 },
            { date: '2015-12-31', value: 225 },
            { date: '2016-12-31', value: 218 },
            { date: '2017-12-31', value: 235 },
            { date: '2018-12-31', value: 228 },
            { date: '2019-12-31', value: 252 },
            { date: '2020-12-31', value: 242 },
            { date: '2021-12-31', value: 268 },
            { date: '2022-12-31', value: 255 },
            { date: '2023-12-31', value: 272 },
            { date: '2024-12-31', value: 285 },
            { date: '2025-12-31', value: 298 },
        ],
        frequency: 'annual',
        active: true
    },
    {
        id: 'chmoney',
        name: 'Swiss Money Market Fund',
        assetClass: 'Money Market',
        timeSeries: [
            { date: '2000-12-31', value: 100 },
            { date: '2001-12-31', value: 102 },
            { date: '2002-12-31', value: 104 },
            { date: '2003-12-31', value: 106 },
            { date: '2004-12-31', value: 108 },
            { date: '2005-12-31', value: 110 },
            { date: '2006-12-31', value: 113 },
            { date: '2007-12-31', value: 116 },
            { date: '2008-12-31', value: 118 },
            { date: '2009-12-31', value: 119 },
            { date: '2010-12-31', value: 120 },
            { date: '2011-12-31', value: 121 },
            { date: '2012-12-31', value: 121 },
            { date: '2013-12-31', value: 121 },
            { date: '2014-12-31', value: 121 },
            { date: '2015-12-31', value: 120 },
            { date: '2016-12-31', value: 119 },
            { date: '2017-12-31', value: 118 },
            { date: '2018-12-31', value: 117 },
            { date: '2019-12-31', value: 116 },
            { date: '2020-12-31', value: 115 },
            { date: '2021-12-31', value: 114 },
            { date: '2022-12-31', value: 114 },
            { date: '2023-12-31', value: 115 },
            { date: '2024-12-31', value: 117 },
            { date: '2025-12-31', value: 119 },
        ],
        frequency: 'annual',
        active: true
    },
    {
        id: 'msciworld',
        name: 'iShares Core MSCI World UCITS ETF',
        assetClass: 'Equities',
        timeSeries: [
            { date: '2000-12-31', value: 100 },
            { date: '2001-12-31', value: 85 },
            { date: '2002-12-31', value: 72 },
            { date: '2003-12-31', value: 92 },
            { date: '2004-12-31', value: 105 },
            { date: '2005-12-31', value: 118 },
            { date: '2006-12-31', value: 135 },
            { date: '2007-12-31', value: 148 },
            { date: '2008-12-31', value: 92 },
            { date: '2009-12-31', value: 118 },
            { date: '2010-12-31', value: 132 },
            { date: '2011-12-31', value: 125 },
            { date: '2012-12-31', value: 145 },
            { date: '2013-12-31', value: 172 },
            { date: '2014-12-31', value: 185 },
            { date: '2015-12-31', value: 182 },
            { date: '2016-12-31', value: 195 },
            { date: '2017-12-31', value: 228 },
            { date: '2018-12-31', value: 215 },
            { date: '2019-12-31', value: 268 },
            { date: '2020-12-31', value: 285 },
            { date: '2021-12-31', value: 335 },
            { date: '2022-12-31', value: 298 },
            { date: '2023-12-31', value: 352 },
            { date: '2024-12-31', value: 395 },
            { date: '2025-12-31', value: 425 },
        ],
        frequency: 'annual',
        active: true
    },
    {
        id: 'emergmkt',
        name: 'iShares MSCI Emerging Markets UCITS ETF',
        assetClass: 'Equities',
        timeSeries: [
            { date: '2000-12-31', value: 100 },
            { date: '2001-12-31', value: 92 },
            { date: '2002-12-31', value: 88 },
            { date: '2003-12-31', value: 125 },
            { date: '2004-12-31', value: 152 },
            { date: '2005-12-31', value: 185 },
            { date: '2006-12-31', value: 228 },
            { date: '2007-12-31', value: 285 },
            { date: '2008-12-31', value: 168 },
            { date: '2009-12-31', value: 242 },
            { date: '2010-12-31', value: 275 },
            { date: '2011-12-31', value: 242 },
            { date: '2012-12-31', value: 278 },
            { date: '2013-12-31', value: 272 },
            { date: '2014-12-31', value: 285 },
            { date: '2015-12-31', value: 252 },
            { date: '2016-12-31', value: 285 },
            { date: '2017-12-31', value: 335 },
            { date: '2018-12-31', value: 285 },
            { date: '2019-12-31', value: 325 },
            { date: '2020-12-31', value: 345 },
            { date: '2021-12-31', value: 352 },
            { date: '2022-12-31', value: 298 },
            { date: '2023-12-31', value: 318 },
            { date: '2024-12-31', value: 342 },
            { date: '2025-12-31', value: 365 },
        ],
        frequency: 'annual',
        active: true
    },
    {
        id: 'usgov',
        name: 'iShares $ Treasury Bond 7-10yr UCITS ETF',
        assetClass: 'Bonds',
        timeSeries: [
            { date: '2000-12-31', value: 100 },
            { date: '2001-12-31', value: 105 },
            { date: '2002-12-31', value: 112 },
            { date: '2003-12-31', value: 115 },
            { date: '2004-12-31', value: 118 },
            { date: '2005-12-31', value: 120 },
            { date: '2006-12-31', value: 122 },
            { date: '2007-12-31', value: 128 },
            { date: '2008-12-31', value: 135 },
            { date: '2009-12-31', value: 132 },
            { date: '2010-12-31', value: 142 },
            { date: '2011-12-31', value: 152 },
            { date: '2012-12-31', value: 158 },
            { date: '2013-12-31', value: 152 },
            { date: '2014-12-31', value: 165 },
            { date: '2015-12-31', value: 162 },
            { date: '2016-12-31', value: 165 },
            { date: '2017-12-31', value: 168 },
            { date: '2018-12-31', value: 165 },
            { date: '2019-12-31', value: 178 },
            { date: '2020-12-31', value: 188 },
            { date: '2021-12-31', value: 182 },
            { date: '2022-12-31', value: 158 },
            { date: '2023-12-31', value: 165 },
            { date: '2024-12-31', value: 172 },
            { date: '2025-12-31', value: 178 },
        ],
        frequency: 'annual',
        active: true
    },
    {
        id: 'gold',
        name: 'iShares Physical Gold ETC',
        assetClass: 'Commodities',
        timeSeries: [
            { date: '2000-12-31', value: 100 },
            { date: '2001-12-31', value: 110 },
            { date: '2002-12-31', value: 125 },
            { date: '2003-12-31', value: 145 },
            { date: '2004-12-31', value: 155 },
            { date: '2005-12-31', value: 185 },
            { date: '2006-12-31', value: 225 },
            { date: '2007-12-31', value: 285 },
            { date: '2008-12-31', value: 305 },
            { date: '2009-12-31', value: 375 },
            { date: '2010-12-31', value: 445 },
            { date: '2011-12-31', value: 525 },
            { date: '2012-12-31', value: 535 },
            { date: '2013-12-31', value: 425 },
            { date: '2014-12-31', value: 395 },
            { date: '2015-12-31', value: 365 },
            { date: '2016-12-31', value: 385 },
            { date: '2017-12-31', value: 405 },
            { date: '2018-12-31', value: 395 },
            { date: '2019-12-31', value: 465 },
            { date: '2020-12-31', value: 585 },
            { date: '2021-12-31', value: 565 },
            { date: '2022-12-31', value: 575 },
            { date: '2023-12-31', value: 625 },
            { date: '2024-12-31', value: 685 },
            { date: '2025-12-31', value: 725 },
        ],
        frequency: 'annual',
        active: true
    }
];

/**
 * Get default instruments for initialization
 */
export function getDefaultInstruments() {
    return JSON.parse(JSON.stringify(defaultInstruments)); // Deep copy
}

/**
 * Validate instrument data structure
 */
export function validateInstrumentData(instrument) {
    const errors = [];

    if (!instrument.id || typeof instrument.id !== 'string') {
        errors.push('Missing or invalid id');
    }

    if (!instrument.name || typeof instrument.name !== 'string') {
        errors.push('Missing or invalid name');
    }

    if (!instrument.assetClass || typeof instrument.assetClass !== 'string') {
        errors.push('Missing or invalid assetClass');
    }

    if (!Array.isArray(instrument.timeSeries) || instrument.timeSeries.length < 2) {
        errors.push('timeSeries must be an array with at least 2 points');
    } else {
        // Validate time series structure
        for (let i = 0; i < instrument.timeSeries.length; i++) {
            const point = instrument.timeSeries[i];
            if (!point.date || !point.value) {
                errors.push(`Invalid time series point at index ${i}`);
                break;
            }
            if (typeof point.value !== 'number' || point.value <= 0) {
                errors.push(`Non-positive value at index ${i}: ${point.value}`);
                break;
            }
        }
    }

    if (!instrument.frequency || !['daily', 'monthly', 'annual'].includes(instrument.frequency)) {
        errors.push('frequency must be one of: daily, monthly, annual');
    }

    if (typeof instrument.active !== 'boolean') {
        errors.push('active must be a boolean');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
