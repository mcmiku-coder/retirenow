/**
 * Calculate the number of days in a specific month
 */
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Calculate the actual amount for a given year using month-based logic
 */
export function calculateYearlyAmount(amount, frequency, startDate, endDate, targetYear) {
  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear, 11, 31);

  const actualStart = new Date(startDate);
  const actualEnd = endDate ? new Date(endDate) : new Date(2100, 11, 31); // Far future if no end

  // If the period doesn't overlap with target year, return 0
  if (actualEnd < yearStart || actualStart > yearEnd) {
    return 0;
  }

  // Find the overlap period within the target year
  const overlapStart = actualStart > yearStart ? actualStart : yearStart;
  const overlapEnd = actualEnd < yearEnd ? actualEnd : yearEnd;

  if (frequency === 'One-time') {
    // One-time payment only in the start year
    const startYear = actualStart.getFullYear();
    return targetYear === startYear ? amount : 0;
  }

  if (frequency === 'Monthly') {
    // Robust Month-based pro-rating
    let totalFraction = 0;

    let curr = new Date(overlapStart.getFullYear(), overlapStart.getMonth(), 1);
    const endMonthStart = new Date(overlapEnd.getFullYear(), overlapEnd.getMonth(), 1);

    while (curr <= endMonthStart) {
      const year = curr.getFullYear();
      const month = curr.getMonth();
      const daysInMonth = getDaysInMonth(year, month);

      // Determine effective start/end days for this specific month
      let mStartDay = 1;
      let mEndDay = daysInMonth;

      // If this is the start month period
      if (year === overlapStart.getFullYear() && month === overlapStart.getMonth()) {
        mStartDay = overlapStart.getDate();
      }

      // If this is the end month period
      if (year === overlapEnd.getFullYear() && month === overlapEnd.getMonth()) {
        mEndDay = overlapEnd.getDate();
      }

      const activeDays = mEndDay - mStartDay + 1;
      // Safety clamp
      const validDays = Math.max(0, Math.min(activeDays, daysInMonth));

      totalFraction += (validDays / daysInMonth);

      // Next month
      curr.setMonth(curr.getMonth() + 1);
    }

    return totalFraction * amount;
  }

  if (frequency === 'Yearly') {
    // Yearly amount pro-rated by days in year
    const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
    const daysInYear = isLeapYear(targetYear) ? 366 : 365;
    return (overlapDays / daysInYear) * amount;
  }

  return 0;
}

/**
 * Check if a year is a leap year
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// Remove old functions
export function calculateYearFraction(startDate, endDate, targetYear) {
  // Deprecated - kept for backwards compatibility
  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59);

  const actualStart = new Date(startDate);
  const actualEnd = endDate ? new Date(endDate) : yearEnd;

  if (actualEnd < yearStart || actualStart > yearEnd) {
    return 0;
  }

  const overlapStart = actualStart > yearStart ? actualStart : yearStart;
  const overlapEnd = actualEnd < yearEnd ? actualEnd : yearEnd;

  const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
  const daysInYear = isLeapYear(targetYear) ? 366 : 365;

  return overlapDays / daysInYear;
}

/**
 * Calculate legal retirement date based on birth date and gender
 * Male: 65 years + 1 month
 * Female: 64 years + 1 month
 */
export function getLegalRetirementDate(birthDate, gender) {
  if (!birthDate || !gender) return new Date();

  const date = new Date(birthDate);
  const yearsToAdd = gender === 'female' ? 64 : 65;

  date.setFullYear(date.getFullYear() + yearsToAdd);
  date.setMonth(date.getMonth() + 1);

  return date;
}
