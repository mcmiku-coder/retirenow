
function parseToUtc(dateInput) {
    if (!dateInput) return null;
    let year, month, day;
    if (dateInput.includes('-')) {
        [year, month, day] = dateInput.split('-').map(Number);
    } else {
        return new Date(dateInput);
    }
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function calculateMonthlyAmount(amount, frequency, startDate, endDate, targetMonthDate, simStartRef) {
    const startRaw = parseToUtc(startDate);
    const endRaw = endDate ? parseToUtc(endDate) : new Date(Date.UTC(2100, 0, 1));
    const simStart = parseToUtc(simStartRef);

    if (!startRaw || !simStart) return 0;

    const itemActiveStart = new Date(Math.max(startRaw.getTime(), simStart.getTime()));
    const itemActiveEnd = endRaw;

    const targetMonthStart = new Date(Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth(), 1));
    const targetMonthEnd = new Date(Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    if (endDate && itemActiveEnd.getUTCDate() === 1 && itemActiveEnd.getUTCHours() === 0) {
        if (itemActiveEnd.getTime() === targetMonthStart.getTime()) {
            return 0;
        }
    }

    if (itemActiveEnd < targetMonthStart || itemActiveStart > targetMonthEnd) {
        return 0;
    }

    let divisor = 1;
    if (frequency === 'Yearly') divisor = 12;
    const monthlyAmt = amount / divisor;

    const startYear = itemActiveStart.getUTCFullYear();
    const startMonth = itemActiveStart.getUTCMonth();

    if (targetMonthDate.getUTCFullYear() === startYear && targetMonthDate.getUTCMonth() === startMonth) {
        const daysInMonth = targetMonthEnd.getUTCDate();
        const overlapStart = itemActiveStart > targetMonthStart ? itemActiveStart : targetMonthStart;
        const overlapEnd = itemActiveEnd < targetMonthEnd ? itemActiveEnd : targetMonthEnd;

        const overlapMillis = overlapEnd.getTime() - overlapStart.getTime();
        const overlapDays = Math.max(0, Math.floor(overlapMillis / (1000 * 60 * 60 * 24)) + 1);

        if (overlapDays >= daysInMonth) return monthlyAmt;
        return (monthlyAmt * overlapDays) / daysInMonth;
    }

    return monthlyAmt;
}

function calculateYearlyAmount(amount, frequency, startDate, endDate, targetYear) {
    let yearlyTotal = 0;
    for (let m = 0; m < 12; m++) {
        const targetMonthDate = new Date(Date.UTC(targetYear, m, 1));
        yearlyTotal += calculateMonthlyAmount(amount, frequency, startDate, endDate, targetMonthDate, startDate);
    }
    return yearlyTotal;
}

// TEST CASES
const annualAmount = 57000;
const monthlyAmount = annualAmount / 12; // 4750

// CASE A: Retire on 01.11.2033
console.log("CASE A: Retire on 01.11.2033");
const resA = calculateYearlyAmount(annualAmount, 'Yearly', "2033-11-01", "2065-12-31", 2033);
console.log(`2033 Total: ${resA} (Expected 9500)`);

// CASE B: Retire on 31.10.2033 (Wait! what if user sets last day?)
console.log("\nCASE B: Retire on 31.10.2033");
const resB = calculateYearlyAmount(annualAmount, 'Yearly', "2033-10-31", "2065-12-31", 2033);
console.log(`2033 Total: ${resB} (Expected 4750 + roughly 1/31 of a month? No, expected ~4750 + small)`);

// CASE C: Retirement Date Drift (Salary vs Pension)
// Salary ends on retireDate. Pension starts on retireDate.
// If retireDate is 01.11.2033.
console.log("\nCASE C: Salary End vs Pension Start on 01.11.2033");
const salaryEnd = calculateYearlyAmount(120000, 'Yearly', "2026-01-01", "2033-11-01", 2033);
console.log(`Salary 2033: ${salaryEnd} (Expected 10 months: 100,000)`);
// Wait! If Salary ends on 01.11.Midnight.
// Nov 2033: targetMonthStart = 01.11. 
// itemActiveEnd = 01.11.
// Line 115: itemActiveEnd.getTime() === targetMonthStart.getTime() -> returns 0.
// Correct! Jan-Oct = 10 months.

const pensionStart = calculateYearlyAmount(57000, 'Yearly', "2033-11-01", "2065-12-31", 2033);
console.log(`Pension 2033: ${pensionStart} (Expected 2 months: 9,500)`);
// Nov 2033: targetMonthStart = 01.11.
// itemActiveStart = 01.11.
// itemActiveStart > targetMonthEnd is False.
// returns 4750.
// Correct! Nov-Dec = 2 months.

console.log("\n--- DISCREPANCY REPRODUCTION ---");
// The user said they have 13,500 instead of 9,000.
// 13,500 is 3 months.
// This means they are counting October.
// October counts if itemActiveStart <= 31.10.2033.
// If retirement is 01.11.2033, why would it count October?
// Maybe because of TIMEZONE DRIFT?
// If "2033-11-01" is parsed in local time as 31.10.2033 23:00?
// BUT my parseToUtc uses Date.UTC.

// Let's test "2033-11-01" without parseToUtc (regular Date)
console.log("Testing regular Date('2033-11-01') on a system that might be UTC-1");
const localDate = new Date("2033-11-01");
console.log(`Local Date: ${localDate.toISOString()}`); // Might be 2033-10-31T23:00:00Z
