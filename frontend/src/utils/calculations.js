/**
 * NEW: Reliably parse a string into a UTC midnight date object.
 * Prevents local timezone "month-drifting" (where 01.11.2033 Local becomes 31.10.2033 UTC).
 */
export function parseToUtc(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;

  // Handle YYYY-MM-DD or DD.MM.YYYY
  let year, month, day;
  if (dateInput.includes('-')) {
    [year, month, day] = dateInput.split('-').map(Number);
  } else if (dateInput.includes('.')) {
    [day, month, year] = dateInput.split('.').map(Number);
  } else {
    return new Date(dateInput);
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Calculate the number of days in a specific month
 */
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Calculate the actual amount for a given year using month-based logic.
 * Aligned with calculateMonthlyAmount to ensure Sum(Jan-Dec) === YearlyAmount.
 */
export function calculateYearlyAmount(amount, frequency, startDate, endDate, targetYear) {
  const itemActiveStart = parseToUtc(startDate);
  const itemActiveEnd = endDate ? parseToUtc(endDate) : new Date(Date.UTC(2100, 0, 1));

  // Safety Check
  if (!itemActiveStart || !itemActiveEnd) return 0;

  const yearStart = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

  // If the period doesn't overlap with target year, return 0
  if (itemActiveEnd < yearStart || itemActiveStart > yearEnd) {
    return 0;
  }

  if (frequency === 'One-time') {
    return targetYear === itemActiveStart.getUTCFullYear() ? amount : 0;
  }

  // Handle periodic items (Monthly, Yearly, etc.)
  // We iterate through 12 months of the target year and sum the monthly amounts.
  let yearlyTotal = 0;

  for (let m = 0; m < 12; m++) {
    const targetMonthDate = new Date(Date.UTC(targetYear, m, 1));
    yearlyTotal += calculateMonthlyAmount(amount, frequency, startDate, endDate, targetMonthDate, startDate);
  }

  return yearlyTotal;
}

/**
 * Check if a year is a leap year
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// Keep for backwards compatibility but align logic
export function calculateYearFraction(startDate, endDate, targetYear) {
  const amount = 1;
  return calculateYearlyAmount(amount, 'Yearly', startDate, endDate, targetYear);
}

/**
 * Calculate legal retirement date based on birth date and gender
 */
export function getLegalRetirementDate(birthDate, gender) {
  if (!birthDate || !gender) return new Date();

  const date = parseToUtc(birthDate);
  const yearsToAdd = gender === 'female' ? 64 : 65;

  date.setUTCFullYear(date.getUTCFullYear() + yearsToAdd);
  date.setUTCMonth(date.getUTCMonth() + 1);

  return date;
}

/**
 * NEW: Calculate the amount for a specific month based on unambiguous spec.
 * - Proration applies ONLY to the first partial month.
 * - All subsequent months use the full monthly amount exactly.
 */
export function calculateMonthlyAmount(amount, frequency, startDate, endDate, targetMonthDate, simStartRef) {
  const startRaw = parseToUtc(startDate);
  const endRaw = endDate ? parseToUtc(endDate) : new Date(Date.UTC(2100, 0, 1));
  const simStart = parseToUtc(simStartRef);

  // Safety Check
  if (!startRaw || !simStart) return 0;

  const itemActiveStart = new Date(Math.max(startRaw.getTime(), simStart.getTime()));
  const itemActiveEnd = endRaw;

  const targetMonthStart = new Date(Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth(), 1));
  const targetMonthEnd = new Date(Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  // 1) No overlap check
  // Safety rule: if an item ends on the 1st of a month at midnight, we exclude it from that month.
  // This aligns with user expectation that "End 01.11" means it doesn't run in November.
  if (endDate && itemActiveEnd.getUTCDate() === 1 && itemActiveEnd.getUTCHours() === 0) {
    if (itemActiveEnd.getTime() === targetMonthStart.getTime()) {
      return 0;
    }
  }

  if (itemActiveEnd < targetMonthStart || itemActiveStart > targetMonthEnd) {
    return 0;
  }

  if (frequency === 'One-time') {
    if (targetMonthDate.getUTCFullYear() === itemActiveStart.getUTCFullYear() &&
      targetMonthDate.getUTCMonth() === itemActiveStart.getUTCMonth()) {
      return amount;
    }
    return 0;
  }

  // Handle periodic items
  let divisor = 1;
  if (frequency === 'Yearly') divisor = 12;
  else if (frequency === 'Semi-annually') divisor = 6;
  else if (frequency === 'Quarterly') divisor = 3;

  const monthlyAmt = amount / divisor;

  // PRORATION: Check if this IS the first partial month
  const startYear = itemActiveStart.getUTCFullYear();
  const startMonth = itemActiveStart.getUTCMonth();

  if (targetMonthDate.getUTCFullYear() === startYear && targetMonthDate.getUTCMonth() === startMonth) {
    const daysInMonth = targetMonthEnd.getUTCDate();
    const overlapStart = itemActiveStart > targetMonthStart ? itemActiveStart : targetMonthStart;
    const overlapEnd = itemActiveEnd < targetMonthEnd ? itemActiveEnd : targetMonthEnd;

    const overlapMillis = overlapEnd.getTime() - overlapStart.getTime();
    const overlapDays = Math.max(0, Math.floor(overlapMillis / (1000 * 60 * 60 * 24)) + 1);

    // If it's a full month, don't pro-rate
    if (overlapDays >= daysInMonth) return monthlyAmt;

    return (monthlyAmt * overlapDays) / daysInMonth;
  }

  return monthlyAmt;
}
