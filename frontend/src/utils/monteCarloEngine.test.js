
import { MonteCarloEngine } from './monteCarloEngine';
import { assetClassCorrelations } from '../data/investmentProducts';

// Mock getCorrelation since we might not want to depend on the real file in a unit test?
// Actually, in integration test we use real files.
// But Jest might complain about imports outside src? No, data is in src.
// Let's rely on the real import if possible.

describe('MonteCarloEngine', () => {

    // Mock Assets
    const assetA = {
        id: 'A',
        assetClass: 'Equities',
        initialValue: 1000,
        performanceData: [
            { date: '2020-01-01', value: 100 },
            { date: '2020-02-01', value: 105 }, // + ~5%
            { date: '2020-03-01', value: 110 }, // + ~4.7%
            { date: '2020-04-01', value: 100 }, // - ~9%
        ]
    };

    const assetB = {
        id: 'B',
        assetClass: 'Bonds',
        initialValue: 1000,
        performanceData: [
            { date: '2020-01-01', value: 100 },
            { date: '2020-02-01', value: 101 },
            { date: '2020-03-01', value: 102 },
            { date: '2020-04-01', value: 103 },
        ]
    };

    const assetNoOverlap = {
        id: 'C',
        assetClass: 'Real Estate',
        initialValue: 1000,
        performanceData: [
            { date: '2019-01-01', value: 100 },
            { date: '2019-02-01', value: 105 }
        ]
    };

    let engine;

    beforeEach(() => {
        engine = new MonteCarloEngine(12345); // Fixed seed
    });

    test('initializes correctly', () => {
        expect(engine).toBeDefined();
        expect(engine.seed).toBe(12345);
    });

    test('computeStatistics: Empirical Method (Sufficient Overlap)', () => {
        // Need >= 24 months for empirical.
        // Let's mock a longer history.
        const longAssetA = { ...assetA, performanceData: [] };
        const longAssetB = { ...assetB, performanceData: [] };

        for (let i = 0; i < 30; i++) {
            const date = new Date(2020, i, 1).toISOString().split('T')[0];
            longAssetA.performanceData.push({ date, value: 100 * Math.pow(1.01, i) });
            longAssetB.performanceData.push({ date, value: 200 * Math.pow(1.005, i) });
        }

        const stats = engine.computeStatistics([longAssetA, longAssetB]);

        expect(stats.warning).toBeNull();
        expect(stats.sampleSize).toBe(29);
        expect(stats.means).toHaveLength(2);
        expect(stats.chol).toBeDefined();
    });

    test('computeStatistics: Fallback Method (Insufficient Overlap)', () => {
        // Overlap is only 4 months (from assetA/B definitions)
        const stats = engine.computeStatistics([assetA, assetB]);

        expect(stats.warning).toContain("Insufficient history");
        expect(stats.sampleSize).toBe(0);
        expect(stats.means).toHaveLength(2);
        // Fallback computes marginals from full history
        expect(stats.means[0]).not.toBeNaN();
    });

    test('computeStatistics: Fallback with No Overlap', () => {
        const stats = engine.computeStatistics([assetA, assetNoOverlap]);
        expect(stats.warning).toContain("Insufficient history");
    });

    test('run: Simulation Execution', () => {
        const config = {
            initialCash: 0,
            assets: [assetA, assetB], // Short history -> Fallback
            cashflows: [],
            horizonMonths: 12,
            iterations: 100,
            seed: 123
        };

        const result = engine.run(config);

        expect(result.percentiles).toBeDefined();
        expect(result.percentiles.p50).toHaveLength(13); // 0 to 12
        expect(result.stats).toBeDefined();
        expect(result.stats.warning).toBeTruthy(); // Should trigger fallback
    });

});
