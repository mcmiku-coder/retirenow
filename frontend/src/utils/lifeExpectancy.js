/**
 * Life Expectancy Data - Swiss Statistics
 * Data for years 2025, 2026, 2027
 * 
 * Structure: lifeExpectancyData[gender][year][age] = years remaining
 * Ages available: 0, 20, 30, 40, 50, 60, 65, 70, 75, 80, 85, 90, 95
 */

export const lifeExpectancyData = {
  male: {
    2025: {
      0: 90.3, 20: 69.4, 30: 58.9, 40: 48.3, 50: 37.7, 60: 27.5,
      65: 22.8, 70: 18.2, 75: 14.1, 80: 10.4, 85: 7.3, 90: 5.1, 95: 3.5
    },
    2026: {
      0: 90.3, 20: 69.5, 30: 59.0, 40: 48.4, 50: 37.8, 60: 27.7,
      65: 22.9, 70: 18.3, 75: 14.1, 80: 10.5, 85: 7.4, 90: 5.2, 95: 3.6
    },
    2027: {
      0: 90.4, 20: 69.6, 30: 59.0, 40: 48.5, 50: 37.9, 60: 27.8,
      65: 23.0, 70: 18.4, 75: 14.2, 80: 10.5, 85: 7.5, 90: 5.2, 95: 3.6
    }
  },
  female: {
    2025: {
      0: 92.9, 20: 72.4, 30: 61.9, 40: 51.4, 50: 40.8, 60: 30.5,
      65: 25.5, 70: 20.6, 75: 16.0, 80: 11.9, 85: 8.3, 90: 5.6, 95: 3.8
    },
    2026: {
      0: 93.0, 20: 72.4, 30: 62.0, 40: 51.4, 50: 40.9, 60: 30.6,
      65: 25.6, 70: 20.7, 75: 16.1, 80: 11.9, 85: 8.4, 90: 5.7, 95: 3.9
    },
    2027: {
      0: 93.1, 20: 72.5, 30: 62.0, 40: 51.5, 50: 41.0, 60: 30.7,
      65: 25.7, 70: 20.8, 75: 16.2, 80: 12.0, 85: 8.5, 90: 5.8, 95: 3.9
    }
  }
};

// Available age brackets for interpolation
const AGE_BRACKETS = [0, 20, 30, 40, 50, 60, 65, 70, 75, 80, 85, 90, 95];

/**
 * Calculate life expectancy based on birth date and gender
 * @param {string} birthDate - Birth date in YYYY-MM-DD format
 * @param {string} gender - 'male' or 'female'
 * @returns {object} - { life_expectancy_years, retirement_legal_date, theoretical_death_date }
 */
export function calculateLifeExpectancy(birthDate, gender) {
  const birth = new Date(birthDate);
  const today = new Date();

  // Calculate current age
  let currentAge = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    currentAge--;
  }

  // Get the appropriate year's data (use 2025 as reference, or closest available)
  const currentYear = today.getFullYear();
  let referenceYear = 2025;
  if (currentYear >= 2027) {
    referenceYear = 2027;
  } else if (currentYear >= 2026) {
    referenceYear = 2026;
  }

  // Get gender data
  const genderKey = gender.toLowerCase();
  const genderData = lifeExpectancyData[genderKey];
  if (!genderData) {
    throw new Error(`Invalid gender: ${gender}`);
  }

  const ageData = genderData[referenceYear];

  // Interpolate years remaining based on current age
  let yearsRemaining;

  if (currentAge <= AGE_BRACKETS[0]) {
    // Younger than minimum age in data
    yearsRemaining = ageData[AGE_BRACKETS[0]];
  } else if (currentAge >= AGE_BRACKETS[AGE_BRACKETS.length - 1]) {
    // Older than maximum age in data
    yearsRemaining = ageData[AGE_BRACKETS[AGE_BRACKETS.length - 1]];
  } else {
    // Find the two closest age brackets for interpolation
    let lowerAge = AGE_BRACKETS[0];
    let upperAge = AGE_BRACKETS[AGE_BRACKETS.length - 1];

    for (let i = 0; i < AGE_BRACKETS.length - 1; i++) {
      if (AGE_BRACKETS[i] <= currentAge && AGE_BRACKETS[i + 1] > currentAge) {
        lowerAge = AGE_BRACKETS[i];
        upperAge = AGE_BRACKETS[i + 1];
        break;
      }
    }

    // Linear interpolation
    const lowerYears = ageData[lowerAge];
    const upperYears = ageData[upperAge];
    const ageFraction = (currentAge - lowerAge) / (upperAge - lowerAge);
    yearsRemaining = lowerYears + (upperYears - lowerYears) * ageFraction;
  }

  // Calculate retirement legal date (birth date + 65 years + 1 month)
  const retirementDate = new Date(birth);
  retirementDate.setUTCFullYear(retirementDate.getUTCFullYear() + 65);
  retirementDate.setUTCMonth(retirementDate.getUTCMonth() + 1);

  // Calculate theoretical death date (today + years remaining)
  const deathDate = new Date(today);
  deathDate.setTime(deathDate.getTime() + (yearsRemaining * 365.25 * 24 * 60 * 60 * 1000));

  return {
    life_expectancy_years: Math.round(yearsRemaining * 10) / 10, // Round to 1 decimal
    retirement_legal_date: retirementDate.toISOString().split('T')[0],
    theoretical_death_date: deathDate.toISOString().split('T')[0]
  };
}

export default calculateLifeExpectancy;
