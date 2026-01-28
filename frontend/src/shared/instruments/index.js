/**
 * Instrument Catalog Module
 * 
 * Central export point for code-owned instrument catalog.
 * Import from this file in both frontend and backend.
 */

export { CATALOG_VERSION, INSTRUMENT_CATALOG } from './instrumentCatalog.js';
export {
    getInstrumentById,
    getActiveInstruments,
    getAllInstruments,
    validateInstrument,
    calculateMetrics,
    calculateCorrelation,
    generateCorrelationMatrix
} from './catalogHelpers.js';
