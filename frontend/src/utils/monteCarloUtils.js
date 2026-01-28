/**
 * Monte Carlo Simulation - Seeded PRNG and Distribution Utilities
 * 
 * Provides deterministic random number generation and advanced distributions
 * for robust Monte Carlo simulations.
 */

/**
 * Mulberry32 PRNG - Fast, high-quality seeded random number generator
 * 
 * @param {number} seed - 32-bit integer seed
 * @returns {function} Function that returns random numbers in [0, 1)
 */
function createSeededRandom(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Global PRNG state
 */
let seededRandom = null;
let currentSeed = null;

/**
 * Initialize PRNG with seed
 * 
 * @param {number|null} seed - Seed value (null = use timestamp)
 * @returns {number} Actual seed used
 */
export function initializeRandomSeed(seed = null) {
    const actualSeed = seed !== null ? seed : Date.now();
    seededRandom = createSeededRandom(actualSeed);
    currentSeed = actualSeed;

    console.log(`Monte Carlo PRNG initialized with seed: ${actualSeed}`);

    return actualSeed;
}

/**
 * Get current seed (for debugging/caching)
 */
export function getCurrentSeed() {
    return currentSeed;
}

/**
 * Get random number from seeded PRNG
 * Falls back to Math.random() if not initialized (backward compatible)
 */
function getRandomUniform() {
    if (seededRandom) {
        return seededRandom();
    }
    // Silently fall back to Math.random() for backward compatibility
    return Math.random();
}

/**
 * Generate standard normal using seeded PRNG
 * Uses Box-Muller transform
 */
export function generateNormalRandom() {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = getRandomUniform();
    while (u2 === 0) u2 = getRandomUniform();

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0;
}

/**
 * Generate random number from Student-t distribution
 * Uses ratio-of-uniforms method
 * 
 * @param {number} degreesOfFreedom - ν parameter (recommended: 5 for conservative)
 * @returns {number} Random value from t-distribution
 */
export function generateStudentT(degreesOfFreedom = 5) {
    // Generate chi-squared with ν degrees of freedom
    // Using sum of squared normals
    let chiSquared = 0;
    for (let i = 0; i < degreesOfFreedom; i++) {
        const z = generateNormalRandom();
        chiSquared += z * z;
    }

    // Generate independent standard normal
    const z = generateNormalRandom();

    // Student-t = Z / sqrt(χ²/ν)
    const t = z / Math.sqrt(chiSquared / degreesOfFreedom);

    return t;
}

/**
 * Distribution configuration
 */
export const DISTRIBUTION_CONFIG = {
    type: 'student-t',  // 'normal' or 'student-t'
    degreesOfFreedom: 5,  // For Student-t only
    rationale: 'Conservative tail risk modeling for retirement planning'
};

/**
 * Generate random return with configurable distribution
 * 
 * @param {number} mu - Mean return
 * @param {number} sigma - Volatility
 * @param {Object} config - Distribution configuration
 * @returns {number} Random return
 */
export function generateRandomReturn(mu, sigma, config = DISTRIBUTION_CONFIG) {
    let z;

    if (config.type === 'student-t') {
        z = generateStudentT(config.degreesOfFreedom);
    } else {
        z = generateNormalRandom();
    }

    return mu + sigma * z;
}

/**
 * Correlation stress configuration
 */
export const CORRELATION_STRESS_CONFIG = {
    enabled: true,
    stressFactor: 0.3,  // Linear factor: 0.3 = 30% move toward +1.0
    applyTo: ['p5', 'p10'],  // Only stress lower percentiles
    rationale: 'Models correlation breakdown during market crises'
};

/**
 * Stress correlation matrix for tail scenarios
 * Linearly increases correlations toward +1.0 (perfect positive correlation)
 * 
 * @param {Array<Array<number>>} corrMatrix - Base correlation matrix
 * @param {number} stressFactor - Linear stress factor in [0, 1]
 *                                0.0 = no stress (base correlations)
 *                                1.0 = full stress (all correlations → +1.0)
 *                                Recommended: 0.3 for moderate stress
 * @returns {Array<Array<number>>} Stressed correlation matrix
 */
export function stressCorrelationMatrix(corrMatrix, stressFactor = 0.3) {
    if (stressFactor < 0 || stressFactor > 1) {
        throw new Error(`stressFactor must be in [0, 1], got ${stressFactor}`);
    }

    const n = corrMatrix.length;
    const stressed = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                // Diagonal always 1.0
                stressed[i][j] = 1.0;
            } else {
                // Linear move toward +1.0
                // Formula: ρ_stressed = ρ_base + (1.0 - ρ_base) × stressFactor
                const baseCorr = corrMatrix[i][j];
                const stressedCorr = baseCorr + (1.0 - baseCorr) * stressFactor;

                // Clamp to [-1, 1] for safety (should not be needed with valid inputs)
                stressed[i][j] = Math.max(-1, Math.min(1, stressedCorr));
            }
        }
    }

    return stressed;
}

/**
 * Generate user-specific encrypted salt for seed derivation
 * Stored encrypted in IndexedDB, unique per user
 * 
 * @param {string} email - User email
 * @param {string} masterKey - User's master encryption key
 * @param {Object} db - Database instance with getSimulationConfig/saveSimulationConfig
 * @returns {Promise<string>} User's simulation salt
 */
export async function getUserSimulationSalt(email, masterKey, db) {
    // Try to load existing salt
    let saltData = await db.getSimulationConfig(email, masterKey);

    if (!saltData) {
        // Generate new salt (32 bytes = 256 bits)
        const saltBytes = window.crypto.getRandomValues(new Uint8Array(32));
        const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');

        // Encrypt and store
        await db.saveSimulationConfig(email, masterKey, { salt });

        console.log('Generated new user simulation salt');
        return salt;
    }

    return saltData.salt;
}

/**
 * Generate portfolio seed with user-specific salt
 * Ensures reproducibility per user but not globally identical
 * 
 * @param {Array<Object>} portfolioAssets - Portfolio composition
 * @param {string} userSalt - User's encrypted simulation salt
 * @returns {number} Deterministic seed
 */
export function generatePortfolioSeed(portfolioAssets, userSalt) {
    // Create portfolio key
    const portfolioKey = portfolioAssets
        .map(asset => `${asset.assetId}:${asset.product.id}:${asset.amount}`)
        .sort()
        .join('|');

    // Combine with user salt: seed = hash(portfolioKey + userSalt)
    const combined = portfolioKey + '::' + userSalt;

    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(i);
        hash |= 0; // Convert to 32-bit integer
    }

    return Math.abs(hash);
}

/**
 * Global simulation configuration
 */
export const SIMULATION_CONFIG = {
    // Distribution
    distribution: DISTRIBUTION_CONFIG,

    // Randomness
    randomSeed: {
        mode: 'deterministic',  // 'deterministic' or 'random'
        baseSeed: null  // null = auto-generate from portfolio
    },

    // Correlation stress
    correlationStress: CORRELATION_STRESS_CONFIG,

    // Simulation parameters
    iterations: 10000,
    percentiles: [5, 10, 25, 50, 75, 90, 95],

    // Cache
    cacheEnabled: true,
    cacheMaxSize: 10,
    cacheExpiration: 3600000  // 1 hour in ms
};
