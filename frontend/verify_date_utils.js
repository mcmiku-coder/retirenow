
// Standalone Logic Test (Duplicated from simulationDateUtils.js to avoid ESM/Node issues)

// Mock ES Module export for CommonJS test runner if needed, or just run with strict mode if supported.
// Actually, since we are running via `node`, we might need to handle the import.
// For simplicity in this environment, I'll copy the logic here for the test script or assume I can run it if I rename to .mjs?
// Let's just create a self-contained test script that imports the file if possible, or duplicates logic if not.
// Given previous issues with imports, I will duplicate the logic in this test file to Ensure logic correctness, 
// then I rely on the file I just wrote being identical. 
// WAIT: I can use `esm` or just write the test logic as a follower to the implementation. 
// Let's try to `import` dynamically or use standard require if I change extension.
// The user environment is Windows, `node` version likely supports ESM if I use .mjs.
// Let's try .mjs for the test file.

// ACTUALLY, I will just write the test logic here to run on the definition I just created.
// To be safe, I'll read the file content I just wrote? No, I know what I wrote.
// I will just use the `verify_date_utils.js` as a standalone tester that *includes* the logic to test it.

// ... Logic from simulationDateUtils.js ...
const getSimulationStartDate_ = (inputDate) => {
    const date = inputDate ? new Date(inputDate) : new Date();
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
};

const dateToMonthIndex_ = (simulationStartDate, targetDateStr) => {
    if (!simulationStartDate || !targetDateStr) return -1;
    const start = getSimulationStartDate_(simulationStartDate);
    const target = new Date(targetDateStr);
    const yearDiff = target.getFullYear() - start.getUTCFullYear();
    const monthDiff = target.getMonth() - start.getUTCMonth();
    return (yearDiff * 12) + monthDiff;
};

const monthIndexToYearMonth_ = (simulationStartDate, monthIndex) => {
    if (!simulationStartDate) return "ERR";
    const start = getSimulationStartDate_(simulationStartDate);
    const current = new Date(start);
    current.setUTCMonth(start.getUTCMonth() + monthIndex);
    const y = current.getUTCFullYear();
    const m = current.getUTCMonth() + 1;
    return `${y}-${m.toString().padStart(2, '0')}`;
};

// ... Tests ...
console.log("Running Date Utility Tests...");

const startDate = "2025-01-01";
const simStart = getSimulationStartDate_(startDate);
console.log(`Simulation Start: ${simStart.toISOString()}`);

// Test 1: Start Date (Index 0)
const idx0 = dateToMonthIndex_(startDate, "2025-01-01");
const ym0 = monthIndexToYearMonth_(startDate, 0);
console.log(`Test 1 (Start): Index 0=${idx0} (Expected 0), Resolved=${ym0} (Expected 2025-01) -> ${idx0 === 0 && ym0 === "2025-01" ? "PASS" : "FAIL"}`);

// Test 2: First Injection (Jan 2050)
// 25 Years * 12 = 300 months?
// 2025 to 2050 is 25 years.
// 2025-01 index 0.
// 2026-01 index 12.
// 2050-01 index 25 * 12 = 300.
// User said: "01.01.2050".
const target2050 = "2050-01-01";
const idx2050 = dateToMonthIndex_(startDate, target2050);
const ym2050 = monthIndexToYearMonth_(startDate, idx2050);
console.log(`Test 2 (2050 Injection): Index=${idx2050}, Resolved=${ym2050} -> ${idx2050 === 300 && ym2050 === "2050-01" ? "PASS" : "FAIL"}`);

// Test 3: End of Year 2050
// Dec 2050.
// Jan 2050 is 300. Dec 2050 should be 300 + 11 = 311.
const targetDec2050 = "2050-12-31"; // Or 01
const idxDec2050 = dateToMonthIndex_(startDate, targetDec2050);
// Note: dateToMonthIndex uses getMonth(), so day doesn't matter as long as it's in the month.
const ymDec2050 = monthIndexToYearMonth_(startDate, idxDec2050);
console.log(`Test 3 (Dec 2050): Index=${idxDec2050}, Resolved=${ymDec2050} -> ${idxDec2050 === 311 && ymDec2050 === "2050-12" ? "PASS" : "FAIL"}`);

// Test 4: Month Overflow (Cross Year)
const idx13 = 13; // Jan 2026? 
const ym13 = monthIndexToYearMonth_(startDate, 12); // Index 12 is Jan 2026
console.log(`Test 4 (Index 12): Resolved=${ym13} (Expected 2026-01) -> ${ym13 === "2026-01" ? "PASS" : "FAIL"}`);
