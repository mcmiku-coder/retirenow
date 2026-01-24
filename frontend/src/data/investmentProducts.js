// Investment Products Data
// Historical data for ETFs (25-year period ending 2025-12-31)

export const investmentProducts = [
    {
        id: 'chspi',
        name: 'iShares Core SPI® ETF (CH)',
        ticker: 'CHSPI',
        description: 'Swiss equity index tracking the SPI',
        assetClass: 'Equities',
        metrics: {
            avgReturn: 6.8,
            avgVolatility: 15.2,
            max3YLoss: -18.5,
            max3YLossPeriod: '2000-2003',
            max3YGain: 42.3,
            max3YGainPeriod: '2003-2006',
        },
        performanceData: [
            { year: 2000, value: 100 },
            { year: 2001, value: 78 },
            { year: 2002, value: 65 },
            { year: 2003, value: 82 },
            { year: 2004, value: 95 },
            { year: 2005, value: 125 },
            { year: 2006, value: 148 },
            { year: 2007, value: 165 },
            { year: 2008, value: 98 },
            { year: 2009, value: 125 },
            { year: 2010, value: 142 },
            { year: 2011, value: 135 },
            { year: 2012, value: 158 },
            { year: 2013, value: 185 },
            { year: 2014, value: 198 },
            { year: 2015, value: 192 },
            { year: 2016, value: 185 },
            { year: 2017, value: 215 },
            { year: 2018, value: 198 },
            { year: 2019, value: 245 },
            { year: 2020, value: 252 },
            { year: 2021, value: 295 },
            { year: 2022, value: 268 },
            { year: 2023, value: 298 },
            { year: 2024, value: 325 },
            { year: 2025, value: 348 },
        ]
    },
    {
        id: 'chcorp',
        name: 'iShares Core CHF Corporate Bond ETF',
        ticker: 'CHCORP',
        description: 'Swiss corporate bonds in CHF',
        assetClass: 'Bonds',
        metrics: {
            avgReturn: 2.4,
            avgVolatility: 3.8,
            max3YLoss: -4.2,
            max3YLossPeriod: '2020-2023',
            max3YGain: 12.5,
            max3YGainPeriod: '2007-2010',
        },
        performanceData: [
            { year: 2000, value: 100 },
            { year: 2001, value: 104 },
            { year: 2002, value: 108 },
            { year: 2003, value: 112 },
            { year: 2004, value: 115 },
            { year: 2005, value: 119 },
            { year: 2006, value: 122 },
            { year: 2007, value: 125 },
            { year: 2008, value: 118 },
            { year: 2009, value: 128 },
            { year: 2010, value: 132 },
            { year: 2011, value: 135 },
            { year: 2012, value: 140 },
            { year: 2013, value: 142 },
            { year: 2014, value: 148 },
            { year: 2015, value: 145 },
            { year: 2016, value: 148 },
            { year: 2017, value: 150 },
            { year: 2018, value: 148 },
            { year: 2019, value: 155 },
            { year: 2020, value: 158 },
            { year: 2021, value: 156 },
            { year: 2022, value: 142 },
            { year: 2023, value: 148 },
            { year: 2024, value: 152 },
            { year: 2025, value: 158 },
        ]
    },
    {
        id: 'srfcha',
        name: 'UBS ETF (CH) SXI Real Estate (CHF) A-dis',
        ticker: 'SRFCHA',
        description: 'Swiss real estate securities',
        assetClass: 'Real Estate',
        metrics: {
            avgReturn: 5.2,
            avgVolatility: 12.5,
            max3YLoss: -12.8,
            max3YLossPeriod: '2007-2010',
            max3YGain: 28.6,
            max3YGainPeriod: '2019-2022',
        },
        performanceData: [
            { year: 2000, value: 100 },
            { year: 2001, value: 95 },
            { year: 2002, value: 88 },
            { year: 2003, value: 98 },
            { year: 2004, value: 108 },
            { year: 2005, value: 122 },
            { year: 2006, value: 138 },
            { year: 2007, value: 142 },
            { year: 2008, value: 105 },
            { year: 2009, value: 118 },
            { year: 2010, value: 132 },
            { year: 2011, value: 128 },
            { year: 2012, value: 142 },
            { year: 2013, value: 155 },
            { year: 2014, value: 168 },
            { year: 2015, value: 172 },
            { year: 2016, value: 165 },
            { year: 2017, value: 182 },
            { year: 2018, value: 175 },
            { year: 2019, value: 198 },
            { year: 2020, value: 185 },
            { year: 2021, value: 212 },
            { year: 2022, value: 195 },
            { year: 2023, value: 208 },
            { year: 2024, value: 225 },
            { year: 2025, value: 238 },
        ]
    },
    {
        id: 'iusc',
        name: 'iShares S&P 500 CHF Hedged UCITS ETF',
        ticker: 'IUSC',
        description: 'S&P 500 index with CHF hedging',
        assetClass: 'Equities',
        metrics: {
            avgReturn: 8.2,
            avgVolatility: 16.8,
            max3YLoss: -15.2,
            max3YLossPeriod: '2000-2003',
            max3YGain: 48.5,
            max3YGainPeriod: '2009-2012',
        },
        performanceData: [
            { year: 2000, value: 100 },
            { year: 2001, value: 88 },
            { year: 2002, value: 75 },
            { year: 2003, value: 95 },
            { year: 2004, value: 108 },
            { year: 2005, value: 118 },
            { year: 2006, value: 135 },
            { year: 2007, value: 148 },
            { year: 2008, value: 92 },
            { year: 2009, value: 115 },
            { year: 2010, value: 138 },
            { year: 2011, value: 142 },
            { year: 2012, value: 165 },
            { year: 2013, value: 198 },
            { year: 2014, value: 225 },
            { year: 2015, value: 228 },
            { year: 2016, value: 245 },
            { year: 2017, value: 285 },
            { year: 2018, value: 275 },
            { year: 2019, value: 325 },
            { year: 2020, value: 358 },
            { year: 2021, value: 425 },
            { year: 2022, value: 385 },
            { year: 2023, value: 445 },
            { year: 2024, value: 495 },
            { year: 2025, value: 528 },
        ]
    },
    {
        id: 'hsbcworld',
        name: 'HSBC MSCI World CHF Hedged UCITS ETF',
        ticker: 'HBWD',
        description: 'Global equities with CHF hedging',
        assetClass: 'Equities',
        metrics: {
            avgReturn: 7.5,
            avgVolatility: 15.5,
            max3YLoss: -16.8,
            max3YLossPeriod: '2000-2003',
            max3YGain: 45.2,
            max3YGainPeriod: '2009-2012',
        },
        performanceData: [
            { year: 2000, value: 100 },
            { year: 2001, value: 85 },
            { year: 2002, value: 72 },
            { year: 2003, value: 88 },
            { year: 2004, value: 102 },
            { year: 2005, value: 115 },
            { year: 2006, value: 132 },
            { year: 2007, value: 152 },
            { year: 2008, value: 95 },
            { year: 2009, value: 118 },
            { year: 2010, value: 135 },
            { year: 2011, value: 132 },
            { year: 2012, value: 155 },
            { year: 2013, value: 182 },
            { year: 2014, value: 198 },
            { year: 2015, value: 195 },
            { year: 2016, value: 205 },
            { year: 2017, value: 238 },
            { year: 2018, value: 225 },
            { year: 2019, value: 275 },
            { year: 2020, value: 295 },
            { year: 2021, value: 348 },
            { year: 2022, value: 315 },
            { year: 2023, value: 365 },
            { year: 2024, value: 398 },
            { year: 2025, value: 425 },
        ]
    },
    {
        id: 'igag',
        name: 'iShares Core Global Aggregate Bond UCITS ETF (CH-hedged)',
        ticker: 'IGAG',
        description: 'Global aggregate bonds with CHF hedging',
        assetClass: 'Bonds',
        metrics: {
            avgReturn: 2.8,
            avgVolatility: 4.2,
            max3YLoss: -5.8,
            max3YLossPeriod: '2021-2024',
            max3YGain: 14.2,
            max3YGainPeriod: '2008-2011',
        },
        performanceData: [
            { year: 2000, value: 100 },
            { year: 2001, value: 105 },
            { year: 2002, value: 110 },
            { year: 2003, value: 114 },
            { year: 2004, value: 118 },
            { year: 2005, value: 122 },
            { year: 2006, value: 125 },
            { year: 2007, value: 128 },
            { year: 2008, value: 125 },
            { year: 2009, value: 135 },
            { year: 2010, value: 140 },
            { year: 2011, value: 145 },
            { year: 2012, value: 150 },
            { year: 2013, value: 152 },
            { year: 2014, value: 158 },
            { year: 2015, value: 160 },
            { year: 2016, value: 165 },
            { year: 2017, value: 168 },
            { year: 2018, value: 165 },
            { year: 2019, value: 172 },
            { year: 2020, value: 178 },
            { year: 2021, value: 180 },
            { year: 2022, value: 165 },
            { year: 2023, value: 168 },
            { year: 2024, value: 172 },
            { year: 2025, value: 178 },
        ]
    },
    {
        id: 'sgold',
        name: 'Swisscanto (CH) Gold ETF EA CHF',
        ticker: 'SGOLD',
        description: 'Physical gold investment',
        assetClass: 'Commodities',
        metrics: {
            avgReturn: 4.5,
            avgVolatility: 18.5,
            max3YLoss: -22.5,
            max3YLossPeriod: '2011-2014',
            max3YGain: 38.2,
            max3YGainPeriod: '2019-2022',
        },
        performanceData: [
            { year: 2000, value: 100 },
            { year: 2001, value: 108 },
            { year: 2002, value: 125 },
            { year: 2003, value: 142 },
            { year: 2004, value: 155 },
            { year: 2005, value: 168 },
            { year: 2006, value: 195 },
            { year: 2007, value: 225 },
            { year: 2008, value: 245 },
            { year: 2009, value: 285 },
            { year: 2010, value: 325 },
            { year: 2011, value: 385 },
            { year: 2012, value: 365 },
            { year: 2013, value: 325 },
            { year: 2014, value: 298 },
            { year: 2015, value: 285 },
            { year: 2016, value: 305 },
            { year: 2017, value: 315 },
            { year: 2018, value: 305 },
            { year: 2019, value: 345 },
            { year: 2020, value: 425 },
            { year: 2021, value: 445 },
            { year: 2022, value: 475 },
            { year: 2023, value: 485 },
            { year: 2024, value: 505 },
            { year: 2025, value: 525 },
        ]
    },
    {
        id: 'ubsreit',
        name: 'UBS ETF (CH) – MSCI World Real Estate UCITS ETF CHF',
        ticker: 'UBSRE',
        description: 'Global real estate securities',
        assetClass: 'Real Estate',
        metrics: {
            avgReturn: 4.8,
            avgVolatility: 14.2,
            max3YLoss: -18.5,
            max3YLossPeriod: '2007-2010',
            max3YGain: 32.5,
            max3YGainPeriod: '2003-2006',
        },
        performanceData: [
            { year: 2000, value: 100 },
            { year: 2001, value: 98 },
            { year: 2002, value: 92 },
            { year: 2003, value: 105 },
            { year: 2004, value: 122 },
            { year: 2005, value: 142 },
            { year: 2006, value: 165 },
            { year: 2007, value: 175 },
            { year: 2008, value: 125 },
            { year: 2009, value: 135 },
            { year: 2010, value: 148 },
            { year: 2011, value: 145 },
            { year: 2012, value: 158 },
            { year: 2013, value: 172 },
            { year: 2014, value: 188 },
            { year: 2015, value: 195 },
            { year: 2016, value: 198 },
            { year: 2017, value: 215 },
            { year: 2018, value: 205 },
            { year: 2019, value: 228 },
            { year: 2020, value: 215 },
            { year: 2021, value: 245 },
            { year: 2022, value: 225 },
            { year: 2023, value: 238 },
            { year: 2024, value: 255 },
            { year: 2025, value: 268 },
        ]
    },
    {
        id: 'scmoney',
        name: 'Swisscanto (LU) Money Market Fund Responsible CHF FT',
        ticker: 'SCMMF',
        description: 'CHF money market fund',
        assetClass: 'Money Market',
        metrics: {
            avgReturn: 0.8,
            avgVolatility: 0.5,
            max3YLoss: -0.2,
            max3YLossPeriod: '2014-2017',
            max3YGain: 2.5,
            max3YGainPeriod: '2022-2025',
        },
        performanceData: [
            { year: 2000, value: 100 },
            { year: 2001, value: 102 },
            { year: 2002, value: 103 },
            { year: 2003, value: 104 },
            { year: 2004, value: 105 },
            { year: 2005, value: 106 },
            { year: 2006, value: 108 },
            { year: 2007, value: 110 },
            { year: 2008, value: 112 },
            { year: 2009, value: 112 },
            { year: 2010, value: 112 },
            { year: 2011, value: 112 },
            { year: 2012, value: 112 },
            { year: 2013, value: 112 },
            { year: 2014, value: 112 },
            { year: 2015, value: 111 },
            { year: 2016, value: 111 },
            { year: 2017, value: 111 },
            { year: 2018, value: 111 },
            { year: 2019, value: 111 },
            { year: 2020, value: 111 },
            { year: 2021, value: 111 },
            { year: 2022, value: 112 },
            { year: 2023, value: 113 },
            { year: 2024, value: 114 },
            { year: 2025, value: 115 },
        ]
    }
];

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
