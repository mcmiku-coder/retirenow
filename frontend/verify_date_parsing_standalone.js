
// Paste functions from simulationDateUtils.js to avoid import issues
const toUtcMonthStart = (input) => {
    if (!input) return new Date(0); // Fallback to Epoch if null

    // Helper to create UTC date from Y, M
    const createUtc = (y, m) => new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

    if (input instanceof Date) {
        // Use UTC components of the given Date
        // Strict adherence: We trust the UTC components of the passed object.
        return createUtc(input.getUTCFullYear(), input.getUTCMonth());
    }

    if (typeof input === 'string') {
        // Check for ISO YYYY-MM-DD format manually to avoid timezone parsing
        // Matches "2025-01-01" or "2025-01"
        const isoMatch = input.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
        if (isoMatch) {
            const y = parseInt(isoMatch[1], 10);
            const m = parseInt(isoMatch[2], 10) - 1; // 0-based
            // Ignore day, force 1st
            return createUtc(y, m);
        }

        // [FIX] Support Swiss/German format DD.MM.YYYY (which V8 might parse as MM/DD/YYYY or fail)
        const dmyMatch = input.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
        if (dmyMatch) {
            const d = parseInt(dmyMatch[1], 10);
            const m = parseInt(dmyMatch[2], 10) - 1; // 0-based
            const y = parseInt(dmyMatch[3], 10);
            // Ignore day, force 1st
            return createUtc(y, m);
        }

        // Fallback for other strings (e.g. ISO DateTime)
        const d = new Date(input);
        if (!isNaN(d.getTime())) {
            return createUtc(d.getUTCFullYear(), d.getUTCMonth());
        }
    }

    return new Date(0); // Should not happen
};

function test(input) {
    try {
        const d = toUtcMonthStart(input);
        console.log(`Input: "${input}" -> UTCMidnight: ${d.toISOString()} (Timestamp: ${d.getTime()})`);
    } catch (e) {
        console.error(`Input: "${input}" -> Error: ${e.message}`);
    }
}

console.log("Testing standard parsing:");
test("2026-02-16");
test("2026-02-16T00:00:00.000Z");

console.log("Testing potential 'broken' format seen in screenshot:");
test("16.02.2026"); // DD.MM.YYYY
test("01.01.2032"); // DD.MM.YYYY from "3a (1)"

console.log("Testing fallback:");
test(null);
test("invalid");
