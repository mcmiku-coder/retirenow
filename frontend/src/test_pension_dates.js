
const { calculateYearlyAmount, parseToUtc } = require('./utils/calculations');

// Mock data to match user's LPP case
const annualAmount = 57000;
const monthlyAmount = annualAmount / 12; // 4750

// Retirement on 01.11.2033 (Expected 2 months in 2033: Nov, Dec)
const retirementDate = "2033-11-01";
const deathDate = "2065-12-31";

console.log("--- LPP Pension Calculation Test ---");
const amt2033 = calculateYearlyAmount(annualAmount, 'Yearly', retirementDate, deathDate, 2033);
console.log(`2033 Amount: ${amt2033} (Expected: ${monthlyAmount * 2} = 9500)`);

if (amt2033 === 14250) {
    console.log("FAIL: Counting 3 months (Oct, Nov, Dec)");
} else if (amt2033 === 9500) {
    console.log("SUCCESS: Counting 2 months correctly");
}

// Retirement on 01.01.2033 (Expected 12 months)
const amtStartYear = calculateYearlyAmount(annualAmount, 'Yearly', "2033-01-01", deathDate, 2033);
console.log(`2033 Full Year: ${amtStartYear} (Expected: 57000)`);

// Test with simStartRef drift
console.log("\n--- Simulation Start Drift Test ---");
// If simulation starts on 01.10.2033 but retirement is 01.11.2033
// calculateYearlyAmount always uses item's startDate.
// BUT calculateMonthlyAmount uses Math.max(startDate, simStart)
// Let's verify this.

const { calculateMonthlyAmount } = require('./utils/calculations');
const simStart = "2033-10-01";
const octAmt = calculateMonthlyAmount(annualAmount, 'Yearly', retirementDate, deathDate, new Date(Date.UTC(2033, 9, 1)), simStart);
console.log(`Oct 2033 Amount (Retire Nov 1st): ${octAmt} (Expected: 0)`);

const novAmt = calculateMonthlyAmount(annualAmount, 'Yearly', retirementDate, deathDate, new Date(Date.UTC(2033, 10, 1)), simStart);
console.log(`Nov 2033 Amount (Retire Nov 1st): ${novAmt} (Expected: 4750)`);
