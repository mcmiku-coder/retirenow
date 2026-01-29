/**
 * Retirement Data Migration Utilities
 * 
 * Handles migration between schema versions and ensures backward compatibility
 * for the retirement benefits questionnaire refactor.
 */

/**
 * Schema Version 1 (Legacy):
 * {
 *   rows: Array<{ id, name, startDate, amount, frequency, locked }>,
 *   hasPreRetirement: boolean,
 *   earlyRetirementAge: string,
 *   preRetirementRows: Array<{ id, yearOffset, type, name, startDate, amount, frequency }>
 * }
 * 
 * Schema Version 2 (New):
 * {
 *   version: 2,
 *   questionnaire: {
 *     hasLPP: boolean,
 *     lppEarliestAge: string | null,
 *     simulationAge: number,
 *     isWithinPreRetirement: 'yes' | 'no' | 'unknown',
 *     benefitType: 'pension' | 'capital' | 'mix' | 'unknown',
 *     hasAVS: boolean,
 *     librePassageCount: number,
 *     threeACount: number,
 *     hasSupplementaryPension: boolean
 *   },
 *   benefitsData: {
 *     avs: { amount: string, frequency: string, startDate: string },
 *     librePassages: Array<{ amount: string, startDate: string }>,
 *     threeA: Array<{ amount: string, startDate: string }>,
 *     lppSup: { amount: string, startDate: string } | null,
 *     lppByAge: {
 *       [age: number]: { pension: string, capital: string, rate: string }
 *     },
 *     lppCurrentCapital: string
 *   },
 *   // Legacy fields maintained for backward compatibility
 *   rows: Array,
 *   hasPreRetirement: boolean,
 *   earlyRetirementAge: string,
 *   preRetirementRows: Array
 * }
 */

/**
 * Migrate legacy data (v1) to new schema (v2)
 * Preserves all existing data while adding new structure
 */
export function migrateToV2(legacyData, userData) {
    if (!legacyData) {
        return createEmptyV2Schema(userData);
    }

    // If already v2, return as-is
    if (legacyData.version === 2) {
        return legacyData;
    }

    const { rows = [], hasPreRetirement = false, earlyRetirementAge = '', preRetirementRows = [] } = legacyData;

    // Extract data from legacy rows
    const avsRow = rows.find(r => r.id === 'avs');
    const threeARows = rows.filter(r => r.id === '3a' || r.id.startsWith('custom_'));

    // Determine LPP affiliation from preRetirementRows
    const hasLPP = preRetirementRows.length > 0 || hasPreRetirement;

    // Extract earliest retirement age from preRetirementRows
    const lppEarliestAge = hasLPP && preRetirementRows.length > 0
        ? String(65 - Math.max(...preRetirementRows.map(r => r.yearOffset || 0)))
        : null;

    // Build lppByAge from preRetirementRows
    const lppByAge = {};
    preRetirementRows.forEach(row => {
        const age = 65 - (row.yearOffset || 0);
        if (!lppByAge[age]) {
            lppByAge[age] = { pension: '', capital: '', rate: '' };
        }
        if (row.type === 'pension') {
            lppByAge[age].pension = row.amount || '';
        } else if (row.type === 'capital') {
            lppByAge[age].capital = row.amount || '';
        }
    });

    // Create v2 schema
    const v2Data = {
        version: 2,
        questionnaire: {
            hasLPP,
            lppEarliestAge,
            simulationAge: earlyRetirementAge ? parseInt(earlyRetirementAge) : 65,
            isWithinPreRetirement: hasLPP ? 'unknown' : 'no',
            benefitType: 'unknown',
            hasAVS: !!avsRow,
            librePassageCount: 0,
            threeACount: Math.max(1, threeARows.length),
            hasSupplementaryPension: false
        },
        benefitsData: {
            avs: avsRow ? {
                amount: avsRow.amount || '',
                frequency: avsRow.frequency || 'Yearly',
                startDate: avsRow.startDate || ''
            } : { amount: '', frequency: 'Yearly', startDate: '' },
            librePassages: [],
            threeA: threeARows.length > 0
                ? threeARows.map(row => ({
                    amount: row.amount || '',
                    startDate: row.startDate || ''
                }))
                : [{ amount: '', startDate: '' }],
            lppSup: null,
            lppByAge,
            lppCurrentCapital: ''
        },
        // Preserve legacy fields for backward compatibility
        rows,
        hasPreRetirement,
        earlyRetirementAge,
        preRetirementRows
    };

    return v2Data;
}

/**
 * Convert v2 data back to legacy format for backward compatibility
 * Used during dual-write period
 */
export function convertV2ToLegacy(v2Data) {
    if (!v2Data || v2Data.version !== 2) {
        return v2Data; // Already legacy or invalid
    }

    const { questionnaire, benefitsData } = v2Data;

    // Build legacy rows array
    const rows = [];

    // Add AVS if selected
    if (questionnaire.hasAVS && benefitsData.avs) {
        rows.push({
            id: 'avs',
            name: 'AVS',
            startDate: benefitsData.avs.startDate,
            amount: benefitsData.avs.amount,
            frequency: benefitsData.avs.frequency,
            locked: true
        });
    }

    // Add 3a accounts
    if (benefitsData.threeA && Array.isArray(benefitsData.threeA)) {
        benefitsData.threeA.forEach((account, index) => {
            rows.push({
                id: index === 0 ? '3a' : `custom_3a_${index}`,
                name: '3a',
                startDate: account.startDate,
                amount: account.amount,
                frequency: 'One-time',
                locked: true
            });
        });
    }

    // Build preRetirementRows from lppByAge
    const preRetirementRows = [];
    if (questionnaire.hasLPP && benefitsData.lppByAge) {
        Object.entries(benefitsData.lppByAge).forEach(([age, data]) => {
            const yearOffset = 65 - parseInt(age);

            if (data.pension) {
                preRetirementRows.push({
                    id: `lpp_pension_${yearOffset}y`,
                    yearOffset,
                    type: 'pension',
                    name: `LPP pension (${yearOffset}y earlier)`,
                    startDate: '', // Will be calculated
                    amount: data.pension,
                    frequency: 'Monthly'
                });
            }

            if (data.capital) {
                preRetirementRows.push({
                    id: `lpp_capital_${yearOffset}y`,
                    yearOffset,
                    type: 'capital',
                    name: `LPP capital (${yearOffset}y earlier)`,
                    startDate: '', // Will be calculated
                    amount: data.capital,
                    frequency: 'One-time'
                });
            }
        });
    }

    return {
        rows,
        hasPreRetirement: questionnaire.hasLPP,
        earlyRetirementAge: String(questionnaire.simulationAge),
        preRetirementRows
    };
}

/**
 * Create empty v2 schema for new users
 */
export function createEmptyV2Schema(userData) {
    const currentAge = userData ? calculateAge(userData.birthDate) : 30;

    return {
        version: 2,
        questionnaire: {
            hasLPP: false,
            lppEarliestAge: null,
            simulationAge: Math.max(currentAge, 58),
            isWithinPreRetirement: 'unknown',
            benefitType: 'unknown',
            hasAVS: true,
            librePassageCount: 0,
            threeACount: 0,
            hasSupplementaryPension: false
        },
        benefitsData: {
            avs: { amount: '', frequency: 'Yearly', startDate: '' },
            librePassages: [],
            threeA: [],
            lppSup: null,
            lppByAge: {},
            lppCurrentCapital: ''
        },
        // Empty legacy fields
        rows: [],
        hasPreRetirement: false,
        earlyRetirementAge: '',
        preRetirementRows: []
    };
}

/**
 * Validate v2 schema data
 */
export function validateV2Schema(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
        errors.push('Invalid data structure');
        return { valid: false, errors };
    }

    if (data.version !== 2) {
        errors.push('Invalid schema version');
    }

    const { questionnaire, benefitsData } = data;

    if (!questionnaire) {
        errors.push('Missing questionnaire data');
        return { valid: false, errors };
    }

    if (!benefitsData) {
        errors.push('Missing benefits data');
        return { valid: false, errors };
    }

    // Validate questionnaire fields
    if (typeof questionnaire.hasLPP !== 'boolean') {
        errors.push('Invalid hasLPP value');
    }

    if (questionnaire.hasLPP) {
        if (!questionnaire.lppEarliestAge && questionnaire.lppEarliestAge !== null) {
            errors.push('Missing lppEarliestAge for LPP member');
        }
    }

    if (!questionnaire.simulationAge || questionnaire.simulationAge < 18 || questionnaire.simulationAge > 100) {
        errors.push('Invalid simulation age');
    }

    // Validate benefits data structure
    if (!benefitsData.avs || typeof benefitsData.avs !== 'object') {
        errors.push('Invalid AVS data structure');
    }

    if (!Array.isArray(benefitsData.threeA)) {
        errors.push('Invalid 3a data structure');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Helper: Calculate age from birth date
 */
function calculateAge(birthDate) {
    if (!birthDate) return 30;

    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * Get data in appropriate format for downstream consumers
 * Checks version and returns compatible structure
 */
export function getCompatibleData(retirementData) {
    if (!retirementData) return null;

    // If v2, return as-is (consumers should handle both)
    if (retirementData.version === 2) {
        return retirementData;
    }

    // If v1, return as-is
    return retirementData;
}

/**
 * Extract simulation age from any version
 */
export function getSimulationAge(retirementData) {
    if (!retirementData) return 65;

    if (retirementData.version === 2) {
        return retirementData.questionnaire.simulationAge || 65;
    }

    // Legacy
    return parseInt(retirementData.earlyRetirementAge) || 65;
}

/**
 * Extract LPP pension/capital data for a specific age
 */
export function getLPPDataForAge(retirementData, age) {
    if (!retirementData) return { pension: '', capital: '', rate: '' };

    if (retirementData.version === 2) {
        return retirementData.benefitsData.lppByAge[age] || { pension: '', capital: '', rate: '' };
    }

    // Legacy: find in preRetirementRows
    const yearOffset = 65 - age;
    const pensionRow = retirementData.preRetirementRows?.find(
        r => r.yearOffset === yearOffset && r.type === 'pension'
    );
    const capitalRow = retirementData.preRetirementRows?.find(
        r => r.yearOffset === yearOffset && r.type === 'capital'
    );

    return {
        pension: pensionRow?.amount || '',
        capital: capitalRow?.amount || '',
        rate: ''
    };
}
