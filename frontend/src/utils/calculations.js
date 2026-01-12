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
    // Month-based calculation
    let totalAmount = 0;

    // Start with the first month
    const startMonth = overlapStart.getMonth();
    const startDay = overlapStart.getDate();
    const endMonth = overlapEnd.getMonth();
    const endDay = overlapEnd.getDate();

    // If within same month
    if (overlapStart.getFullYear() === overlapEnd.getFullYear() && startMonth === endMonth) {
      const daysInMonth = getDaysInMonth(targetYear, startMonth);
      const activeDays = endDay - startDay + 1;
      return (activeDays / daysInMonth) * amount;
    }

    // First partial month (if not starting on day 1)
    if (startDay > 1) {
      const daysInStartMonth = getDaysInMonth(overlapStart.getFullYear(), startMonth);
      const daysActive = daysInStartMonth - startDay + 1;
      totalAmount += (daysActive / daysInStartMonth) * amount;
    } else {
      // Full first month
      totalAmount += amount;
    }

    // Full months in between
    let currentDate = new Date(overlapStart);
    currentDate.setDate(1);
    currentDate.setMonth(currentDate.getMonth() + 1);

    while (currentDate < overlapEnd) {
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Check if this is the last month
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      if (nextMonth > overlapEnd) {
        // Partial last month
        const daysInLastMonth = getDaysInMonth(currentYear, currentMonth);
        totalAmount += (endDay / daysInLastMonth) * amount;
        break;
      } else {
        // Full month
        totalAmount += amount;
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    return totalAmount;
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
