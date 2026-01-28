/**
 * Instrument Service - Singleton for Instrument Data Management
 * 
 * Centralized service for:
 * - Loading and caching encrypted instrument data
 * - Computing parameters dynamically from time series
 * - Building and caching correlation matrices
 * - Managing simulation inputs and caching
 * 
 * Performance Model:
 * Phase 1 (Initialization): Decrypt all, compute params, build correlation matrix
 * Phase 2 (Simulation): Extract sub-matrix for selected instruments
 * Phase 3 (UI): Read from cache, no re-computation
 */

import {
    getInstrumentData,
    saveInstrumentData,
    getSimulationConfig,
    saveSimulationConfig
} from './database';
import {
    computeInstrumentParameters,
    buildValidatedCorrelationMatrix
} from './instrumentCalculations';
import { getDefaultInstruments } from '../data/defaultInstruments';
import { getUserSimulationSalt, generatePortfolioSeed } from './monteCarloUtils';

class InstrumentService {
    constructor() {
        // Cache layers
        this.instrumentsCache = null;  // Raw instruments with time series
        this.parametersCache = new Map();  // id -> computed parameters
        this.correlationMatrixCache = null;  // Full correlation matrix
        this.simulationCache = new Map();  // cache key -> simulation results

        // User context
        this.currentEmail = null;
        this.currentMasterKey = null;
        this.userSalt = null;

        // State
        this.initialized = false;
        this.initializationPromise = null;
    }

    /**
     * Initialize service for a user
     * Loads instruments, computes parameters, builds correlation matrix
     * 
     * @param {string} email - User email
     * @param {string} masterKey - User's master encryption key
     * @returns {Promise<void>}
     */
    async initialize(email, masterKey) {
        // If already initialized for this user, return
        if (this.initialized && this.currentEmail === email) {
            return;
        }

        // If initialization is in progress, wait for it
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // Start initialization
        this.initializationPromise = this._performInitialization(email, masterKey);

        try {
            await this.initializationPromise;
        } finally {
            this.initializationPromise = null;
        }
    }

    async _performInitialization(email, masterKey) {
        console.log('[InstrumentService] Initializing for user:', email);
        const startTime = performance.now();

        // Clear caches
        this.clearCaches();

        // Set user context
        this.currentEmail = email;
        this.currentMasterKey = masterKey;

        // Load user simulation salt
        this.userSalt = await getUserSimulationSalt(email, masterKey, {
            getSimulationConfig,
            saveSimulationConfig
        });

        // Load instruments from encrypted storage
        let instrumentsData = await getInstrumentData(email, masterKey);

        // If no data, initialize with defaults
        if (!instrumentsData || !instrumentsData.instruments) {
            console.log('[InstrumentService] No instrument data found, initializing with defaults');
            const defaultInstruments = getDefaultInstruments();
            instrumentsData = {
                instruments: defaultInstruments,
                version: 1,
                lastModified: new Date().toISOString()
            };
            await saveInstrumentData(email, masterKey, instrumentsData);
        }

        // Cache instruments
        this.instrumentsCache = instrumentsData.instruments;

        // Compute parameters for all active instruments
        const activeInstruments = this.instrumentsCache.filter(inst => inst.active !== false);
        console.log(`[InstrumentService] Computing parameters for ${activeInstruments.length} instruments`);

        for (const instrument of activeInstruments) {
            const params = computeInstrumentParameters(instrument);
            this.parametersCache.set(instrument.id, params);
        }

        // Build full correlation matrix
        console.log('[InstrumentService] Building correlation matrix');
        const matrixResult = buildValidatedCorrelationMatrix(activeInstruments);
        this.correlationMatrixCache = {
            matrix: matrixResult.matrix,
            instruments: activeInstruments.map(inst => inst.id),
            details: matrixResult.details,
            correctionApplied: matrixResult.correctionApplied
        };

        this.initialized = true;

        const duration = performance.now() - startTime;
        console.log(`[InstrumentService] Initialization complete in ${duration.toFixed(0)}ms`);
    }

    /**
     * Get all instruments
     */
    getInstruments() {
        if (!this.initialized) {
            throw new Error('InstrumentService not initialized');
        }
        return this.instrumentsCache;
    }

    /**
     * Get active instruments only
     */
    getActiveInstruments() {
        if (!this.initialized) {
            throw new Error('InstrumentService not initialized');
        }
        return this.instrumentsCache.filter(inst => inst.active !== false);
    }

    /**
     * Get instrument by ID
     */
    getInstrument(id) {
        if (!this.initialized) {
            throw new Error('InstrumentService not initialized');
        }
        return this.instrumentsCache.find(inst => inst.id === id);
    }

    /**
     * Get computed parameters for an instrument
     */
    getParameters(id) {
        if (!this.initialized) {
            throw new Error('InstrumentService not initialized');
        }
        return this.parametersCache.get(id);
    }

    /**
     * Get correlation matrix
     */
    getCorrelationMatrix() {
        if (!this.initialized) {
            throw new Error('InstrumentService not initialized');
        }
        return this.correlationMatrixCache;
    }

    /**
     * Get correlation between two instruments
     */
    getCorrelation(id1, id2) {
        if (!this.initialized) {
            throw new Error('InstrumentService not initialized');
        }

        const { matrix, instruments } = this.correlationMatrixCache;
        const idx1 = instruments.indexOf(id1);
        const idx2 = instruments.indexOf(id2);

        if (idx1 === -1 || idx2 === -1) {
            console.warn(`Correlation not found for ${id1} - ${id2}`);
            return 0.3; // Default fallback
        }

        return matrix[idx1][idx2];
    }

    /**
     * Add or update an instrument
     * Triggers re-computation of parameters and correlation matrix
     */
    async saveInstrument(instrument) {
        if (!this.initialized) {
            throw new Error('InstrumentService not initialized');
        }

        const existingIndex = this.instrumentsCache.findIndex(inst => inst.id === instrument.id);

        if (existingIndex >= 0) {
            // Update existing
            this.instrumentsCache[existingIndex] = instrument;
        } else {
            // Add new
            this.instrumentsCache.push(instrument);
        }

        // Save to encrypted storage
        const instrumentsData = {
            instruments: this.instrumentsCache,
            version: 1,
            lastModified: new Date().toISOString()
        };
        await saveInstrumentData(this.currentEmail, this.currentMasterKey, instrumentsData);

        // Invalidate caches and re-initialize
        await this.initialize(this.currentEmail, this.currentMasterKey);
    }

    /**
     * Delete an instrument
     */
    async deleteInstrument(id) {
        if (!this.initialized) {
            throw new Error('InstrumentService not initialized');
        }

        this.instrumentsCache = this.instrumentsCache.filter(inst => inst.id !== id);

        // Save to encrypted storage
        const instrumentsData = {
            instruments: this.instrumentsCache,
            version: 1,
            lastModified: new Date().toISOString()
        };
        await saveInstrumentData(this.currentEmail, this.currentMasterKey, instrumentsData);

        // Invalidate caches and re-initialize
        await this.initialize(this.currentEmail, this.currentMasterKey);
    }

    /**
     * Get simulation inputs for selected instruments
     * Extracts sub-matrix from full correlation matrix
     * 
     * @param {Array<string>} instrumentIds - Selected instrument IDs
     * @returns {Object} Simulation inputs
     */
    getSimulationInputs(instrumentIds) {
        if (!this.initialized) {
            throw new Error('InstrumentService not initialized');
        }

        const { matrix, instruments } = this.correlationMatrixCache;

        // Get indices of selected instruments
        const indices = instrumentIds.map(id => instruments.indexOf(id));

        // Check all instruments found
        if (indices.includes(-1)) {
            const missing = instrumentIds.filter((id, i) => indices[i] === -1);
            throw new Error(`Instruments not found: ${missing.join(', ')}`);
        }

        // Extract sub-matrix
        const n = indices.length;
        const subMatrix = Array(n).fill(0).map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                subMatrix[i][j] = matrix[indices[i]][indices[j]];
            }
        }

        // Get instruments with parameters
        const selectedInstruments = instrumentIds.map(id => ({
            ...this.getInstrument(id),
            parameters: this.getParameters(id)
        }));

        return {
            instruments: selectedInstruments,
            correlationMatrix: subMatrix,
            userSalt: this.userSalt
        };
    }

    /**
     * Generate cache key for simulation
     */
    generateSimulationCacheKey(portfolioAssets, config) {
        const components = [];

        // Portfolio composition (sorted for consistency)
        const portfolioKey = portfolioAssets
            .map(asset => ({
                id: asset.assetId || asset.id,
                productId: asset.product?.id || asset.productId,
                amount: Math.round(asset.amount || 0),
                availabilityDate: asset.availabilityDate || 'immediate'
            }))
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(a => `${a.id}:${a.productId}:${a.amount}:${a.availabilityDate}`)
            .join('|');

        components.push(`portfolio=${portfolioKey}`);

        // Simulation parameters
        components.push(`years=${config.years || 30}`);
        components.push(`iterations=${config.iterations || 10000}`);

        // Distribution config
        const distConfig = config.distribution || { type: 'student-t', degreesOfFreedom: 5 };
        components.push(`dist=${distConfig.type}`);
        if (distConfig.type === 'student-t') {
            components.push(`df=${distConfig.degreesOfFreedom}`);
        }

        // Correlation stress
        const stressConfig = config.correlationStress || { enabled: true, stressFactor: 0.3 };
        components.push(`stress=${stressConfig.enabled ? stressConfig.stressFactor : 'none'}`);

        // Seed (user-local)
        const seed = config.seed || generatePortfolioSeed(portfolioAssets, this.userSalt);
        components.push(`seed=${seed}`);

        // Combine and hash
        const cacheKey = components.join('&');
        return this._hashString(cacheKey);
    }

    /**
     * Simple string hash (DJB2)
     */
    _hashString(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        return (hash >>> 0).toString(36);
    }

    /**
     * Cache simulation results
     */
    cacheSimulationResults(cacheKey, results) {
        this.simulationCache.set(cacheKey, {
            results,
            timestamp: Date.now()
        });

        // Limit cache size (keep last 10)
        if (this.simulationCache.size > 10) {
            const firstKey = this.simulationCache.keys().next().value;
            this.simulationCache.delete(firstKey);
        }
    }

    /**
     * Get cached simulation results
     */
    getCachedSimulation(cacheKey) {
        const cached = this.simulationCache.get(cacheKey);

        if (!cached) {
            return null;
        }

        // Check expiration (1 hour)
        if (Date.now() - cached.timestamp > 3600000) {
            this.simulationCache.delete(cacheKey);
            return null;
        }

        return cached.results;
    }

    /**
     * Clear all caches
     */
    clearCaches() {
        this.instrumentsCache = null;
        this.parametersCache.clear();
        this.correlationMatrixCache = null;
        this.simulationCache.clear();
        this.initialized = false;
    }

    /**
     * Invalidate simulation cache only
     * Use when user changes portfolio but instruments unchanged
     */
    invalidateSimulationCache() {
        this.simulationCache.clear();
        console.log('[InstrumentService] Simulation cache cleared');
    }
}

// Export singleton instance
const instrumentService = new InstrumentService();
export default instrumentService;
