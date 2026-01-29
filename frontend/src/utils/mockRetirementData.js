/**
 * Mock Test Data for Retirement Benefits Questionnaire
 * 
 * Provides realistic test scenarios for development and testing
 */

import { getLegalRetirementDate } from './calculations';

/**
 * Mock user data for testing
 */
export const mockUserData = {
    email: 'test@example.com',
    birthDate: '1980-05-15',
    gender: 'male',
    theoreticalDeathDate: '2055-05-15'
};

/**
 * Scenario 1: Legacy user with full LPP data
 * Has pre-retirement options configured
 */
export const mockLegacyDataWithLPP = {
    rows: [
        {
            id: 'avs',
            name: 'AVS',
            startDate: '2045-05-15',
            amount: '28000',
            frequency: 'Yearly',
            locked: true
        },
        {
            id: '3a',
            name: '3a',
            startDate: '2045-05-15',
            amount: '100000',
            frequency: 'One-time',
            locked: true
        }
    ],
    hasPreRetirement: true,
    earlyRetirementAge: '62',
    preRetirementRows: [
        {
            id: 'lpp_pension_1y',
            yearOffset: 1,
            type: 'pension',
            name: 'LPP pension (1y earlier)',
            startDate: '2044-05-15',
            amount: '45000',
            frequency: 'Yearly'
        },
        {
            id: 'lpp_capital_1y',
            yearOffset: 1,
            type: 'capital',
            name: 'LPP capital (1y earlier)',
            startDate: '2044-05-15',
            amount: '800000',
            frequency: 'One-time'
        },
        {
            id: 'lpp_pension_2y',
            yearOffset: 2,
            type: 'pension',
            name: 'LPP pension (2y earlier)',
            startDate: '2043-05-15',
            amount: '42000',
            frequency: 'Yearly'
        },
        {
            id: 'lpp_capital_2y',
            yearOffset: 2,
            type: 'capital',
            name: 'LPP capital (2y earlier)',
            startDate: '2043-05-15',
            amount: '750000',
            frequency: 'One-time'
        },
        {
            id: 'lpp_pension_3y',
            yearOffset: 3,
            type: 'pension',
            name: 'LPP pension (3y earlier)',
            startDate: '2042-05-15',
            amount: '39000',
            frequency: 'Yearly'
        },
        {
            id: 'lpp_capital_3y',
            yearOffset: 3,
            type: 'capital',
            name: 'LPP capital (3y earlier)',
            startDate: '2042-05-15',
            amount: '700000',
            frequency: 'One-time'
        }
    ]
};

/**
 * Scenario 2: Legacy user without LPP
 * Simple AVS + 3a only
 */
export const mockLegacyDataWithoutLPP = {
    rows: [
        {
            id: 'avs',
            name: 'AVS',
            startDate: '2045-05-15',
            amount: '28000',
            frequency: 'Yearly',
            locked: true
        },
        {
            id: '3a',
            name: '3a',
            startDate: '2045-05-15',
            amount: '150000',
            frequency: 'One-time',
            locked: true
        }
    ],
    hasPreRetirement: false,
    earlyRetirementAge: '65',
    preRetirementRows: []
};

/**
 * Scenario 3: New user - empty v2 schema
 */
export const mockNewUserV2Data = {
    version: 2,
    questionnaire: {
        hasLPP: false,
        lppEarliestAge: null,
        simulationAge: 65,
        isWithinPreRetirement: 'unknown',
        benefitType: 'unknown',
        hasAVS: false,
        librePassageCount: 0,
        threeACount: 1,
        hasSupplementaryPension: false
    },
    benefitsData: {
        avs: { amount: '', frequency: 'Yearly', startDate: '' },
        librePassages: [],
        threeA: [{ amount: '', startDate: '' }],
        lppSup: null,
        lppByAge: {},
        lppCurrentCapital: ''
    },
    rows: [],
    hasPreRetirement: false,
    earlyRetirementAge: '',
    preRetirementRows: []
};

/**
 * Scenario 4: V2 user with LPP - Situation 2, Sub-situation I (Q3 = Yes)
 * Has LPP, wants to retire at 62, earliest age is 58, benefit type is "mix"
 */
export const mockV2DataWithLPPEligible = {
    version: 2,
    questionnaire: {
        hasLPP: true,
        lppEarliestAge: '58',
        simulationAge: 62,
        isWithinPreRetirement: 'yes',
        benefitType: 'mix',
        hasAVS: true,
        librePassageCount: 1,
        threeACount: 2,
        hasSupplementaryPension: true
    },
    benefitsData: {
        avs: {
            amount: '28000',
            frequency: 'Yearly',
            startDate: '2042-05-15'
        },
        librePassages: [
            { amount: '50000', startDate: '2042-05-15' }
        ],
        threeA: [
            { amount: '100000', startDate: '2042-05-15' },
            { amount: '75000', startDate: '2042-05-15' }
        ],
        lppSup: {
            amount: '120000',
            startDate: '2042-05-15'
        },
        lppByAge: {
            58: { pension: '35000', capital: '650000', rate: '5.38' },
            59: { pension: '37000', capital: '680000', rate: '5.44' },
            60: { pension: '39000', capital: '710000', rate: '5.49' },
            61: { pension: '41000', capital: '740000', rate: '5.54' },
            62: { pension: '43000', capital: '770000', rate: '5.58' },
            63: { pension: '45000', capital: '800000', rate: '5.63' },
            64: { pension: '47000', capital: '830000', rate: '5.66' },
            65: { pension: '50000', capital: '860000', rate: '5.81' }
        },
        lppCurrentCapital: ''
    },
    // Legacy fields for backward compatibility
    rows: [
        { id: 'avs', name: 'AVS', startDate: '2042-05-15', amount: '28000', frequency: 'Yearly', locked: true }
    ],
    hasPreRetirement: true,
    earlyRetirementAge: '62',
    preRetirementRows: []
};

/**
 * Scenario 5: V2 user with LPP - Situation 2, Sub-situation II (Q3 = No)
 * Has LPP, wants to retire at 57, earliest age is 60 (not eligible)
 */
export const mockV2DataWithLPPNotEligible = {
    version: 2,
    questionnaire: {
        hasLPP: true,
        lppEarliestAge: '60',
        simulationAge: 57,
        isWithinPreRetirement: 'no',
        benefitType: 'unknown',
        hasAVS: true,
        librePassageCount: 0,
        threeACount: 1,
        hasSupplementaryPension: false
    },
    benefitsData: {
        avs: {
            amount: '28000',
            frequency: 'Yearly',
            startDate: '2037-05-15'
        },
        librePassages: [],
        threeA: [
            { amount: '120000', startDate: '2037-05-15' }
        ],
        lppSup: null,
        lppByAge: {},
        lppCurrentCapital: '450000'
    },
    rows: [
        { id: 'avs', name: 'AVS', startDate: '2037-05-15', amount: '28000', frequency: 'Yearly', locked: true }
    ],
    hasPreRetirement: false,
    earlyRetirementAge: '57',
    preRetirementRows: []
};

/**
 * Scenario 6: V2 user without LPP - Situation 1
 * No LPP, multiple 3a accounts and libre passages
 */
export const mockV2DataWithoutLPP = {
    version: 2,
    questionnaire: {
        hasLPP: false,
        lppEarliestAge: null,
        simulationAge: 63,
        isWithinPreRetirement: 'no',
        benefitType: 'unknown',
        hasAVS: true,
        librePassageCount: 2,
        threeACount: 3,
        hasSupplementaryPension: false
    },
    benefitsData: {
        avs: {
            amount: '28000',
            frequency: 'Yearly',
            startDate: '2043-05-15'
        },
        librePassages: [
            { amount: '80000', startDate: '2043-05-15' },
            { amount: '60000', startDate: '2043-05-15' }
        ],
        threeA: [
            { amount: '100000', startDate: '2043-05-15' },
            { amount: '95000', startDate: '2043-05-15' },
            { amount: '110000', startDate: '2043-05-15' }
        ],
        lppSup: null,
        lppByAge: {},
        lppCurrentCapital: ''
    },
    rows: [
        { id: 'avs', name: 'AVS', startDate: '2043-05-15', amount: '28000', frequency: 'Yearly', locked: true }
    ],
    hasPreRetirement: false,
    earlyRetirementAge: '63',
    preRetirementRows: []
};

/**
 * Get all test scenarios
 */
export function getAllTestScenarios() {
    return {
        legacyWithLPP: mockLegacyDataWithLPP,
        legacyWithoutLPP: mockLegacyDataWithoutLPP,
        newUser: mockNewUserV2Data,
        v2WithLPPEligible: mockV2DataWithLPPEligible,
        v2WithLPPNotEligible: mockV2DataWithLPPNotEligible,
        v2WithoutLPP: mockV2DataWithoutLPP
    };
}

/**
 * Get test scenario by name
 */
export function getTestScenario(scenarioName) {
    const scenarios = getAllTestScenarios();
    return scenarios[scenarioName] || null;
}
