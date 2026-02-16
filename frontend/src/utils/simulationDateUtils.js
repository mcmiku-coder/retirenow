/**
 * Simulation Date Utilities - Single Source of Truth for Calendar Mapping
 * 
 * Purpose: Ensure consistent mapping between Date objects, Simulation Month Indices, and Year-Month strings
 * across the Engine, UI, and PDF reports.
 * 
 * STRICT UTC IMPLEMENTATION to avoid timezone off-by-one errors.
 */

// 1. Precise Date Handling (UTC Midnight Month Start)

/**
 * Converts any input to a strict UTC Date Object representing the 1st of that month at 00:00:00 UTC.
 * @param {Date|string} input - Date object, ISO string "YYYY-MM-DD", or other date string.
 * @returns {Date} Date object at UTC Midnight on 1st of the month.
 */
export const toUtcMonthStart = (input) => {
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

export const getSimulationStartDate = (inputDate) => {
    return toUtcMonthStart(inputDate);
};

// 2. Date -> Month Index (0-based from Start Date)
export const dateToMonthIndex = (simulationStartDate, targetDateStr) => {
    if (!simulationStartDate || !targetDateStr) return -1;

    const start = toUtcMonthStart(simulationStartDate);
    const target = toUtcMonthStart(targetDateStr);

    // Calculate difference in months using UTC components
    const yearDiff = target.getUTCFullYear() - start.getUTCFullYear();
    const monthDiff = target.getUTCMonth() - start.getUTCMonth();

    return (yearDiff * 12) + monthDiff;
};

// 3. Month Index -> Year-Month "YYYY-MM"
export const monthIndexToYearMonth = (simulationStartDate, monthIndex) => {
    if (!simulationStartDate) return "ERR";
    const start = toUtcMonthStart(simulationStartDate);

    // Add months to start date
    // setUTCMonth handles overflow correctly (e.g. Month 12 -> Jan next year)
    const current = new Date(start);
    current.setUTCMonth(start.getUTCMonth() + monthIndex);

    const y = current.getUTCFullYear();
    const m = current.getUTCMonth() + 1; // 1-based for string

    return `${y}-${m.toString().padStart(2, '0')}`;
};

// 4. Month Index -> ISO Date "YYYY-MM-01"
export const monthIndexToIsoDate = (simulationStartDate, monthIndex) => {
    const ym = monthIndexToYearMonth(simulationStartDate, monthIndex);
    if (ym === "ERR") return "";
    return `${ym}-01`;
};

// 5. Special Helpers
export const getYearStartMonthIndex = (simulationStartDate, year) => {
    // Start of year Y is Jan 1 Y
    // Pass string to force Parse logic
    return dateToMonthIndex(simulationStartDate, `${year}-01-01`);
};

export const getYearEndMonthIndex = (simulationStartDate, year) => {
    // End of year Y is technically Jan 1 Y+1
    // This represents the state AFTER the last month of Year Y (December).
    return dateToMonthIndex(simulationStartDate, `${year + 1}-01-01`);
};

export const formatDebugDate = (idx, dateStr, resolvedYm, notes = "") => {
    return `Index ${idx}: "${dateStr}" -> Resolved: "${resolvedYm}" ${notes}`;
};
