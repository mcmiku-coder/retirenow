
// Verification Script for Strict Date Utils (Standalone)

// --- Logic Duplication START (To ensure standalone execution) ---
const toUtcMonthStart = (input) => {
    if (!input) return new Date(0);
    const createUtc = (y, m) => new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

    if (input instanceof Date) {
        return createUtc(input.getUTCFullYear(), input.getUTCMonth());
    }
    if (typeof input === 'string') {
        const isoMatch = input.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
        if (isoMatch) {
            const y = parseInt(isoMatch[1], 10);
            const m = parseInt(isoMatch[2], 10) - 1;
            return createUtc(y, m);
        }
        const d = new Date(input);
        if (!isNaN(d.getTime())) {
            return createUtc(d.getUTCFullYear(), d.getUTCMonth());
        }
    }
    return new Date(0);
};

const getSimulationStartDate = (inputDate) => toUtcMonthStart(inputDate);

const dateToMonthIndex = (simulationStartDate, targetDateStr) => {
    if (!simulationStartDate || !targetDateStr) return -1;
    const start = toUtcMonthStart(simulationStartDate);
    const target = toUtcMonthStart(targetDateStr);
    const yearDiff = target.getUTCFullYear() - start.getUTCFullYear();
    const monthDiff = target.getUTCMonth() - start.getUTCMonth();
    return (yearDiff * 12) + monthDiff;
};

const monthIndexToYearMonth = (simulationStartDate, monthIndex) => {
    if (!simulationStartDate) return "ERR";
    const start = toUtcMonthStart(simulationStartDate);
    const current = new Date(start);
    current.setUTCMonth(start.getUTCMonth() + monthIndex);
    const y = current.getUTCFullYear();
    const m = current.getUTCMonth() + 1;
    return `${y}-${m.toString().padStart(2, '0')}`;
};

const getYearEndMonthIndex = (simulationStartDate, year) => {
    return dateToMonthIndex(simulationStartDate, `${year + 1}-01-01`);
};
// --- Logic Duplication END ---

console.log("Running Strict UTC Date Tests...\n");

// Setup
const startStr = "2026-01-01";
const simStart = getSimulationStartDate(startStr);
console.log(`Simulation Start: ${simStart.toISOString()}`);

// Test Helper
const assert = (desc, actual, expected) => {
    const passed = (actual === expected);
    console.log(`${passed ? 'PASS' : 'FAIL'} | ${desc}: ${actual} (Expected: ${expected})`);
    if (!passed) process.exit(1);
};

// 1. Basic Month Indexing
assert('Jan 2026 (Start)', dateToMonthIndex(simStart, "2026-01-01"), 0);
assert('Feb 2026', dateToMonthIndex(simStart, "2026-02-01"), 1);
assert('Jan 2027 (1 Year)', dateToMonthIndex(simStart, "2027-01-01"), 12);

// 2. 2050 Injection Target
// 2050 - 2026 = 24 Years. 24 * 12 = 288.
const idx2050 = dateToMonthIndex(simStart, "2050-01-01");
assert('Jan 2050 (24 years out)', idx2050, 24 * 12); // 288

// 3. Year End 2050
// Dec 2050 -> 2051-01-01
// 25 Years from start. 25 * 12 = 300.
const idxEnd2050 = getYearEndMonthIndex(simStart, 2050);
assert('End of Year 2050 (Jan 2051)', idxEnd2050, 25 * 12); // 300
assert('Resolved YM for End 2050', monthIndexToYearMonth(simStart, idxEnd2050), "2051-01");

// 4. Input Parser Robustness
// Test string vs Date
const dObj = new Date(Date.UTC(2026, 1, 15)); // Feb 15 2026
assert('Date Object (Feb 2026)', dateToMonthIndex(simStart, dObj), 1);

// Test ISO partial
assert('Partial ISO (2026-03)', dateToMonthIndex(simStart, "2026-03"), 2);

console.log("\nAll Strict UTC Tests Passed.");
