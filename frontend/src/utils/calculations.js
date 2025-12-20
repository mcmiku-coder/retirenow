/**
 * Calculate the portion of a year between two dates
 * Returns a value between 0 and 1 representing the fraction of the year
 */
export function calculateYearFraction(startDate, endDate, targetYear) {
  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59);
  
  const actualStart = new Date(startDate);
  const actualEnd = endDate ? new Date(endDate) : yearEnd;
  
  // If the period doesn't overlap with target year, return 0
  if (actualEnd < yearStart || actualStart > yearEnd) {
    return 0;
  }
  
  // Find the overlap period
  const overlapStart = actualStart > yearStart ? actualStart : yearStart;
  const overlapEnd = actualEnd < yearEnd ? actualEnd : yearEnd;
  
  // Calculate days in overlap
  const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calculate total days in year (accounting for leap years)
  const daysInYear = isLeapYear(targetYear) ? 366 : 365;
  
  return overlapDays / daysInYear;
}

/**
 * Check if a year is a leap year
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Calculate the actual amount for a given year considering start and end dates
 */
export function calculateYearlyAmount(amount, frequency, startDate, endDate, targetYear) {
  const yearFraction = calculateYearFraction(startDate, endDate, targetYear);
  
  if (yearFraction === 0) {
    return 0;
  }
  
  let yearlyAmount = 0;
  
  if (frequency === 'Monthly') {
    // Monthly amount * 12 months * fraction of year
    yearlyAmount = amount * 12 * yearFraction;
  } else if (frequency === 'Yearly') {
    // Yearly amount * fraction of year
    yearlyAmount = amount * yearFraction;
  } else if (frequency === 'One-time') {
    // One-time payment only in the start year
    const startYear = new Date(startDate).getFullYear();
    yearlyAmount = targetYear === startYear ? amount : 0;
  }
  
  return yearlyAmount;
}
