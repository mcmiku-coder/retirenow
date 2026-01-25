import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { getIncomeData, getCostData, getUserData, getScenarioData, getRetirementData, saveScenarioData, getRealEstateData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import { toast } from 'sonner';
import { hasInvestedBook, getInvestedBookAssets, runInvestedBookSimulation } from '../utils/projectionCalculator';
import { extractPercentile, calculateBandwidth, getYearlyReturns } from '../utils/monteCarloSimulation';
import { Slider } from '../components/ui/slider';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, Bar, ReferenceLine } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { ChevronDown, ChevronUp, Download, RefreshCw, SlidersHorizontal, LineChart as LineChartIcon, FileText, Lock } from 'lucide-react';
import PageHeader from '../components/PageHeader';


const ScenarioResult = () => {
  console.log('Rendering ScenarioResult Component - Force Refresh');
  const navigate = useNavigate();

  const location = useLocation();
  const { user, masterKey } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Data State
  const [userData, setUserData] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [assets, setAssets] = useState([]); // from currentAssets
  const [debts, setDebts] = useState([]); // from desiredOutflows
  // Retirement data pillars are merged into incomes for unified processing usually, but kept separate here for filtering
  const [retirementData, setRetirementData] = useState(null);
  const [realEstateData, setRealEstateData] = useState(null);
  const [scenarioData, setScenarioData] = useState(null);

  // UI State
  const [isTableOpen, setIsTableOpen] = useState(false);

  // Filter State - Track which items are enabled for calculation
  const [activeFilters, setActiveFilters] = useState({});

  // Monte Carlo State
  const [showBaseline, setShowBaseline] = useState(true);
  const [show50thPercentile, setShow50thPercentile] = useState(false);
  const [show10thPercentile, setShow10thPercentile] = useState(true);
  const [show25thPercentile, setShow25thPercentile] = useState(false);
  const [monteCarloProjections, setMonteCarloProjections] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);

  // Retirement Age Slider State
  const [retirementAge, setRetirementAge] = useState(null); // Will be set from scenarioData
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [baselineProjection, setBaselineProjection] = useState(null);

  // Result State
  const [projection, setProjection] = useState({
    yearlyBreakdown: [],
    finalBalance: 0,
    canQuit: false,
    balanceBeforeTransmission: 0,
    transmissionAmount: 0
  });

  // Scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load Data
  useEffect(() => {
    if (!user || !masterKey) {
      navigate('/');
      return;
    }

    const loadAllData = async () => {
      try {
        const [uData, iData, cData, rData, sData, reData] = await Promise.all([
          getUserData(user.email, masterKey),
          getIncomeData(user.email, masterKey),
          getCostData(user.email, masterKey),
          getRetirementData(user.email, masterKey),
          getScenarioData(user.email, masterKey),
          getRealEstateData(user.email, masterKey)
        ]);

        // Use provided data from location state (simulation adjusted) or fallback to DB
        // Note: DataReview passes 'adjustedIncomes', 'adjustedCosts', 'adjustedAssets', 'adjustedDebts' if modified
        // However, standard flow might access /result directly.
        // We must be robust.

        let finalIncomes = location.state?.adjustedIncomes || sData?.adjustedIncomes || iData || [];

        // MERGE: Ensure all current profile incomes (iData) are present in the final list
        // This handles cases where sData is stale (e.g. user renamed Salary -> Net Salary in Profile but sData still has Salary)
        if (iData && iData.length > 0) {
          iData.forEach(profileInc => {
            // Check existence by ID or Name
            const exists = finalIncomes.find(fi =>
              (fi.id && profileInc.id && fi.id === profileInc.id) ||
              (fi.name === profileInc.name)
            );

            if (!exists) {
              // Add missing profile item (e.g. "Net Salary")
              finalIncomes.push({
                ...profileInc,
                adjustedAmount: profileInc.amount // Default adjusted to original
              });
            }
          });
        }

        // CRITICAL: Filter out "ghost" entries
        // 1. If "Net Salary" exists, remove "Salary" (migration artifact)
        const hasNetSalary = finalIncomes.some(i => i.name === 'Net Salary');
        if (hasNetSalary) {
          finalIncomes = finalIncomes.filter(i => i.name !== 'Salary');
        }

        // 2. Filter out 0-value items and generic Pension keywords that shouldn't be in Incomes
        finalIncomes = finalIncomes.filter(i =>
          (Math.abs(parseFloat(i.adjustedAmount || i.amount) || 0) > 0) &&
          !String(i.name || '').toLowerCase().includes('pension') &&
          !String(i.name || '').toLowerCase().includes('lpp') &&
          !String(i.id || '').toLowerCase().includes('pension') &&
          !String(i.id || '').toLowerCase().includes('lpp')
        );

        let finalCosts = location.state?.adjustedCosts || sData?.adjustedCosts || cData || [];
        finalCosts = finalCosts.filter(c => Math.abs(parseFloat(c.adjustedAmount || c.amount) || 0) > 0);

        // Scenario Data contains currentAssets and desiredOutflows arrays usually
        // But DataReview might have passed modified versions.
        let finalAssets = location.state?.adjustedAssets || sData?.currentAssets || [];
        finalAssets = finalAssets.filter(a => Math.abs(parseFloat(a.adjustedAmount || a.amount) || 0) > 0);

        let finalDebts = location.state?.adjustedDebts || sData?.desiredOutflows || [];
        finalDebts = finalDebts.filter(d => Math.abs(parseFloat(d.adjustedAmount || d.amount) || 0) > 0);

        // MERGE INVESTED BOOK: Override liquid invested assets if customizable book exists
        if (sData?.investedBook && Array.isArray(sData.investedBook)) {
          // 1. Remove original items that would be replaced (Liquid + Invested)
          // Note: We identify them by the same criteria used in CapitalManagementSetup
          finalAssets = finalAssets.filter(a => !(a.category === 'Liquid' && a.strategy === 'Invested'));

          // 2. Add the customized rows
          const bookAssets = sData.investedBook.map(row => ({
            ...row,
            category: 'Liquid', // Ensure category is preserved for logic downstream
            adjustedAmount: row.amount // Map amount to adjustedAmount for consistency
          }));
          finalAssets = [...finalAssets, ...bookAssets];
        }

        // Filter Retirement Pillars: Exclude 'One-time' items (3a, LPP Capital) handled in Assets
        if (rData?.rows) {
          rData.rows = rData.rows.filter(r =>
            r.frequency !== 'One-time' &&
            parseFloat(r.amount) > 0 &&
            // CRITICAL: Filter out "LPP Pension" from here because the simulation uses the "Projected" one from Final Incomes
            !String(r.name || '').toLowerCase().includes('lpp pension') &&
            !String(r.id || '').toLowerCase().includes('lpp_pension')
          );
        }

        setUserData(uData);
        setIncomes(finalIncomes);
        setCosts(finalCosts);
        setAssets(finalAssets);
        setDebts(finalDebts);
        setRetirementData(rData);
        setScenarioData(sData);
        setRealEstateData(reData);

        // Initialize filters with prefixed keys to avoid ID collisions
        // Restore from saved filters if available, otherwise default to true
        const savedFilters = sData?.activeFilters || {};
        const filters = {};

        const addToFilters = (list, prefix) => {
          list.forEach(item => {
            const id = item.id || item.name;
            const key = `${prefix}-${id}`;
            // If saved state exists, use it. Else default to true.
            if (savedFilters.hasOwnProperty(key)) {
              filters[key] = savedFilters[key];
            } else {
              filters[key] = true;
            }
          });
        };

        addToFilters(finalIncomes, 'income');
        addToFilters(finalCosts, 'cost');
        addToFilters(finalAssets, 'asset');
        addToFilters(finalDebts, 'debt');

        if (rData?.rows) {
          rData.rows.forEach(r => {
            const id = r.id || r.name;
            const key = `pillar-${id}`;
            if (savedFilters.hasOwnProperty(key)) {
              filters[key] = savedFilters[key];
            } else {
              filters[key] = true;
            }
          });
        }

        setActiveFilters(filters);

        // Initialize retirement age from scenarioData
        if (sData && sData.retirementOption === 'option2' && sData.earlyRetirementAge) {
          setRetirementAge(parseInt(sData.earlyRetirementAge));
        } else if (sData && sData.retirementOption === 'option0') {
          setRetirementAge(65); // Legal retirement age
        }

        setLoading(false);

      } catch (error) {
        console.error("Error loading data:", error);
        toast.error(t('common.error'));
        setLoading(false);
      }
    };

    loadAllData();
  }, [user, masterKey, navigate, location]);

  // --- CORE SIMULATION FUNCTION ---
  const runSimulation = React.useCallback((simRetirementDate, overrides = {}) => {
    if (!userData) return null;

    // Unpack overrides or use state defaults
    const effectiveAssets = overrides.assets || assets;
    const effectiveScenarioData = overrides.scenarioData || scenarioData;
    const effectiveIncomes = overrides.incomes || incomes;
    const effectiveCosts = overrides.costs || costs;
    const effectiveDebts = overrides.debts || debts;
    const effectiveRetirementData = overrides.retirementData || retirementData;
    const ignorePensionFilters = overrides.ignorePensionFilters || false;

    const simRetirementDateObj = new Date(simRetirementDate);
    const currentYear = new Date().getFullYear();
    const birthDate = new Date(userData.birthDate);

    // Calculate Retirement Age for this simulation run
    const ageAtRetirement = (simRetirementDateObj.getFullYear() - birthDate.getFullYear()) +
      ((simRetirementDateObj.getMonth() - birthDate.getMonth()) / 12);

    // Death date logic
    let deathYear;
    if (userData.theoreticalDeathDate) {
      deathYear = new Date(userData.theoreticalDeathDate).getFullYear();
    } else {
      const approximateLifeExpectancy = userData.gender === 'male' ? 80 : 85;
      deathYear = birthDate.getFullYear() + approximateLifeExpectancy;
    }

    // Determine LPP Parameters for this specific retirement date (Option 3 logic)
    let simLppPension = 0;
    let simLppCapital = 0;
    let lppStartDate = simRetirementDateObj;

    if (effectiveScenarioData?.retirementOption === 'option3' && effectiveScenarioData.preRetirementRows && effectiveScenarioData.preRetirementRows.length > 0) {
      // Robustly sort rows by age
      const sortedRows = [...effectiveScenarioData.preRetirementRows].sort((a, b) => parseInt(a.age) - parseInt(b.age));
      const minRowAge = parseInt(sortedRows[0].age);
      const maxRowAge = parseInt(sortedRows[sortedRows.length - 1].age);

      // Determine earliest feasible plan age (User pref vs Data availability)
      const userEarliest = parseInt(effectiveScenarioData.option3EarlyAge || '58');
      const effectiveEarliestAge = Math.max(userEarliest, minRowAge);

      const retirementAgeInt = Math.floor(ageAtRetirement);
      let planData = null;

      if (retirementAgeInt < effectiveEarliestAge) {
        // Gap Case: Retire now, pension starts at effectiveEarliestAge
        const yearsToWait = effectiveEarliestAge - retirementAgeInt;
        const deferredDate = new Date(birthDate);
        deferredDate.setFullYear(deferredDate.getFullYear() + effectiveEarliestAge);
        lppStartDate = deferredDate;

        planData = sortedRows.find(r => r.age == effectiveEarliestAge);
      } else {
        // Normal Case: Retire and take pension now (or at max available age)
        // Find exact match or closest downward? No, strictly match or cap at max.
        if (retirementAgeInt > maxRowAge) {
          planData = sortedRows[sortedRows.length - 1]; // Use max
        } else {
          planData = sortedRows.find(r => r.age == retirementAgeInt);
          // If gap in middle (e.g. 62 exists, 64 exists, 63 missing), what to do?
          // Fallback to previous available?
          if (!planData) {
            // Find closest lower age?
            planData = sortedRows.filter(r => parseInt(r.age) < retirementAgeInt).pop();
          }
        }
      }

      if (planData) {
        simLppPension = parseFloat(planData.pension || 0);
        simLppCapital = parseFloat(planData.capital || 0);

        // Check filter (Strict False check)
        // Use TRIMMED ID to bypass potential stale data with spaces
        const filterId = `income-pre_retirement_pension_${planData.age}`;
        if (!ignorePensionFilters && activeFilters[filterId] === false) {
          simLppPension = 0;
          simLppCapital = 0;
        }
      }
    } else {
      // Standard Options (0, 1, 2)
      // Use the fixed projected values from state
      simLppPension = parseFloat(effectiveScenarioData?.projectedLPPPension || effectiveScenarioData?.projectedLegalLPPPension || 0);
      simLppCapital = parseFloat(effectiveScenarioData?.projectedLPPCapital || effectiveScenarioData?.projectedLegalLPPCapital || 0);
    }


    // --- 3a Payout Date Logic ---
    // Rule: If retirement < 60, 3a available at 60. Else at retirement.
    // OVERRIDE: If the user explicitly set a date in the Unified Table (stored in retirementData.rows), use that.
    let payoutDate3a = simRetirementDateObj;

    // Find 3a row to check for manual date
    const p3aRow = effectiveRetirementData?.rows?.find(r => r.name.toLowerCase().includes('3a'));
    if (p3aRow && p3aRow.startDate) {
      payoutDate3a = new Date(p3aRow.startDate);
    } else if (effectiveScenarioData?.retirementOption === 'option3' && ageAtRetirement < 60) {
      const dateAt60 = new Date(birthDate);
      dateAt60.setFullYear(dateAt60.getFullYear() + 60);
      payoutDate3a = dateAt60;
    }
    const payoutYear3a = payoutDate3a.getFullYear();


    // --- SIMULATION LOOP ---
    const breakdown = [];
    let cumulativeBalance = 0;
    const transmissionAmt = location.state?.transmissionAmount || effectiveScenarioData?.transmissionAmount || 0;
    let balanceBeforeTransmission = 0;

    // Monte Carlo Integration: Track invested assets separately
    // Use effectiveAssets and effectiveScenarioData
    const investedAssetIds = getInvestedBookAssets(effectiveAssets, effectiveScenarioData).map(a => a.id);
    let investedBalance = 0;
    // BASELINE: Always assume flat 0% return for the main projection (Gray Line)
    // The Monte Carlo returns are handled separately in the Blue Line calculations.
    const yearlyReturns = [];

    // INITIALIZE Invested Balance (BUT ONLY FOR ASSETS AVAILABLE NOW)
    investedAssetIds.forEach(assetId => {
      const asset = effectiveAssets.find(a => a.id === assetId);
      if (asset && activeFilters[`asset-${asset.id || asset.name}`]) {
        const amount = parseFloat(asset.amount || 0);

        // Check availability. If it's "Already available" (no date/future logic), add it now.
        // If it has a date in the future (relative to currentYear), waiting for the loop.
        let isAvailableNow = true;

        if (asset.availabilityType === 'Period') {
          // Periods usually imply income stream over time, NOT a lump sum investment.
          // IF user marked a Period asset as Invested, that's complex. 
          // Assuming Invested Assets are usually Date/Lump Sum.
          // If Period, it flows into income year by year. 
          // We should probably NOT put Period assets into `investedBalance` lump sum.
          isAvailableNow = false;
        } else if (asset.availabilityDate) {
          const availYear = new Date(asset.availabilityDate).getFullYear();
          // FIX: If availability is this year (or future), handle it in the loop as a flow.
          // Only add to initial balance if it is STRICTLY in the past.
          if (availYear >= currentYear) {
            isAvailableNow = false;
          }
        }

        if (isAvailableNow) {
          investedBalance += amount;
        }
      }
    });

    console.log(`Simulation starting with invested balance (available now): ${investedBalance}`);

    for (let year = currentYear; year <= deathYear; year++) {
      let yearIncome = 0;
      let yearCosts = 0;
      const incomeBreakdown = {};
      const costBreakdown = {};
      let amountTransferredToInvested = 0; // Amount moved from 'Cash Flow' to 'Invested Pot'

      // Apply Monte Carlo returns to invested balance (if applicable)
      const yearIndex = year - currentYear;
      if (yearIndex > 0 && yearlyReturns.length > 0 && yearlyReturns[yearIndex - 1] !== undefined) {
        const yearReturn = yearlyReturns[yearIndex - 1];
        investedBalance *= (1 + yearReturn);
      }

      // 1. INCOMES (Salary etc)
      // Rule: They stop strictly at simRetirementDate
      effectiveIncomes.forEach(row => {
        const id = row.id || row.name;
        if (!activeFilters[`income-${id}`]) return;
        // Skip static Option 3 rows calculated by DataReview, as we handle them dynamically here
        if (row.id && row.id.toString().includes('pre_retirement_')) return;
        if (row.name && row.name.includes('Pre - retirement')) return;

        const amount = parseFloat(row.adjustedAmount || row.amount) || 0;
        // IMPORTANT: pass the simRetirementDate as the *End Date* for work-related income
        // But we must distinguish "Work Income" from "Annuities".
        // Assumption: 'Net Salary' and customized work incomes stop at retirement.
        // We can use the 'endDate' param of calculateYearlyAmount to force cut-off.
        // If the item already has an EndDate earlier than retirement, respect it.
        // If not, cap it at retirement.

        let effectiveEndDate = row.endDate;

        // Logic: Sync Salary with Retirement (Option 2) or Cap it (Standard)
        const nameLower = (row.name || '').toLowerCase();
        const isSalary = nameLower.includes('salary') || nameLower.includes('salaire') || nameLower.includes('lohn') || nameLower.includes('revenu') || nameLower.includes('income');

        if (effectiveScenarioData?.retirementOption === 'option2' && isSalary) {
          // STRICT RULE: If moving slider, Salary always ends exactly at Retirement Date.
          // This allows both extending (working longer) and capping (retiring earlier)
          // ignoring the static "End Date" saved in the database from the original plan.
          effectiveEndDate = simRetirementDateObj.toISOString().split('T')[0];

          // CRITICAL FAIL-SAFE: If we are completely past the retirement year, 
          // and this is work income, force skip. This fixes the persistent salary bug.
          if (year > simRetirementDateObj.getFullYear()) {
            return;
          }
        } else {
          // Standard: If no end date, or end date is AFTER retirement, cap it.
          // (Preserve fixed-term contracts that end BEFORE retirement)
          if (!effectiveEndDate || new Date(effectiveEndDate) > simRetirementDateObj) {
            effectiveEndDate = simRetirementDateObj.toISOString().split('T')[0];
          }
        }

        const val = calculateYearlyAmount(amount, row.frequency, row.startDate, effectiveEndDate, year);
        if (val > 0) {
          yearIncome += val;
          incomeBreakdown[row.name] = (incomeBreakdown[row.name] || 0) + val;
        }
      });

      // 2. RETIREMENT PILLARS (LPP, AVS, etc from RetirementData)
      // Note: For Option 3, LPP we calculated above overrides standard LPP rows from DB?
      // Or do we rely on DB rows?
      // "RetirementParameters" usually saves "preRetirementRows" but doesn't overwrite the `retirementData` table used by `getRetirementData`.
      // However, `ScenarioResult` uses `retirementData.rows`.
      // We must override the "LPP" entry in `retirementData.rows` with our dynamic `simLppPension`.

      let lppProcessed = false;

      if (effectiveRetirementData?.rows) {
        effectiveRetirementData.rows.forEach(row => {
          const id = row.id || row.name;
          if (!activeFilters[`pillar-${id}`]) return;

          let amount = parseFloat(row.amount) || 0;
          const nameLower = row.name.toLowerCase();
          let effectiveStartDate = row.startDate || simRetirementDateObj.toISOString().split('T')[0];
          let effectiveEndDate = row.endDate || `${deathYear}-12-31`;
          let frequency = row.frequency;

          // OVERRIDES for Option 3 & Dynamic Logic
          if (nameLower.includes('lpp') && !nameLower.includes('sup') && !nameLower.includes('capital')) { // Main LPP
            // Use our calculated dynamic variables
            amount = simLppPension;
            frequency = 'Yearly'; // Pension inputs are now Yearly
            effectiveStartDate = lppStartDate.toISOString().split('T')[0];
            lppProcessed = true;
            // If there is Capital, handle below as One-time
          } else if (nameLower.includes('avs')) {
            // AVS usually starts at legal age (65).
            // For Early Retirement option, AVS stays at 65? Or can be advanced (implied logic needed?)
            // Usually AVS is Age 65. If user entered data in Step 6, it has a start date.
            // We respect user input date from Step 6 for AVS.
            // If it was "Retirement Date", we might need to adjust it?
            // Let's assume AVS date in DB is correct (Legal Age).
            // If user manually linked it to "Retirement", we'd need to know. 
            // Default behavior: Keep DB start date.
          } else if (nameLower.includes('3a')) {
            // 3a Payout (Capital)
            // Handled specifically via the 3a Payout Date Rule
            // We suppress the standard row processing here and handle it as a One-Time Event below
            amount = 0;
          }

          if (amount > 0 && frequency !== 'One-time') {
            const val = calculateYearlyAmount(amount, frequency, effectiveStartDate, effectiveEndDate, year);
            if (val > 0) {
              yearIncome += val;
              incomeBreakdown[row.name] = (incomeBreakdown[row.name] || 0) + val;
            }
          }
        });
      }

      // Fallback: If no standard LPP row was found to override, but we have a simulated pension (Option 3), add it now.
      if (!lppProcessed && simLppPension > 0) {
        const effectiveStartDate = lppStartDate.toISOString().split('T')[0];
        const effectiveEndDate = `${deathYear}-12-31`;
        const val = calculateYearlyAmount(simLppPension, 'Yearly', effectiveStartDate, effectiveEndDate, year);
        if (val > 0) {
          yearIncome += val;
          incomeBreakdown['LPP Pension'] = (incomeBreakdown['LPP Pension'] || 0) + val;
        }
      }

      // Handle 3a Capital Payout (Special Rule)
      // We find the 3a amount from retirementData (or benefitsData state passed?)
      // Let's look in retirementData.rows
      const p3a = effectiveRetirementData?.rows?.find(r => r.name.toLowerCase().includes('3a'));
      if (p3a && activeFilters[`pillar-${p3a.id || p3a.name}`]) {
        // Check if year matches payoutYear3a
        if (year === payoutYear3a) {
          const val = parseFloat(p3a.amount || 0);
          if (val > 0) {
            yearIncome += val;
            incomeBreakdown[p3a.name] = (incomeBreakdown[p3a.name] || 0) + val;
          }
        }
      }

      // Handle LPP Capital Payout (if any)
      if (simLppCapital > 0) {
        const lppCapYear = lppStartDate.getFullYear();
        if (year === lppCapYear) {
          yearIncome += simLppCapital;
          incomeBreakdown['LPP Capital'] = (incomeBreakdown['LPP Capital'] || 0) + simLppCapital;
        }
      }

      // 3. ASSETS
      effectiveAssets.forEach(asset => {
        const id = asset.id || asset.name;
        if (!activeFilters[`asset-${id}`]) return;

        const amount = Math.abs(parseFloat(asset.adjustedAmount || asset.amount) || 0);
        const isInvested = investedAssetIds.includes(id);

        // Period Type
        if (asset.availabilityType === 'Period' || (!asset.availabilityDate && asset.availabilityTimeframe)) {
          // ... helper logic for periods needed here or copy-paste ...
          // Re-implementing helper here for closure access
          let startOffset = 0, endOffset = 0;
          switch (asset.availabilityTimeframe) {
            case 'within_5y': startOffset = 0; endOffset = 5; break;
            case 'within_5_10y': startOffset = 5; endOffset = 10; break;
            // ... assuming comprehensive list or safe default
            default: startOffset = 0; endOffset = 1;
          }
          if (asset.availabilityTimeframe === 'within_10_15y') { startOffset = 10; endOffset = 15; }
          if (asset.availabilityTimeframe === 'within_15_20y') { startOffset = 15; endOffset = 20; }
          if (asset.availabilityTimeframe === 'within_20_25y') { startOffset = 20; endOffset = 25; }
          if (asset.availabilityTimeframe === 'within_25_30y') { startOffset = 25; endOffset = 30; }

          const startYear = currentYear + startOffset;
          const endYear = currentYear + endOffset;

          // Note: Period assets are generally NOT invested lumpsums. We treat them as income here.
          // If we decide they CAN be invested, logic gets complex (drip feed into pot).
          // For now, treat as income flow even if "invested" strategy selected (unlikely for period).

          if (year >= startYear && year < endYear) {
            const val = amount / (endOffset - startOffset);
            yearIncome += val;
            incomeBreakdown[asset.name] = (incomeBreakdown[asset.name] || 0) + val;
          }
        }
        // Date or Instant
        else {
          const date = asset.availabilityDate ? new Date(asset.availabilityDate) : new Date();
          if (year === date.getFullYear()) {
            // IT BECOMES AVAILABLE THIS YEAR

            // Show it on the INCOME side for visual confirmation
            yearIncome += amount;
            incomeBreakdown[asset.name] = (incomeBreakdown[asset.name] || 0) + amount;

            if (isInvested) {
              // If it's invested, we move it to the Invested Pot immediately
              investedBalance += amount;
              amountTransferredToInvested += amount;
              console.log(`Year ${year}: Invested Asset "${asset.name}" (${amount}) added to pot. New Balance: ${investedBalance}`);
            }
          }
        }
      });

      // 4. COSTS
      effectiveCosts.forEach(row => {
        const id = row.id || row.name;
        if (!activeFilters[`cost-${id}`]) return;
        const amount = Math.abs(parseFloat(row.adjustedAmount || row.amount) || 0);
        const val = calculateYearlyAmount(amount, row.frequency, row.startDate, row.endDate, year);
        if (val > 0) {
          yearCosts += val;
          costBreakdown[row.name] = (costBreakdown[row.name] || 0) + val;
        }
      });

      // 5. DEBTS
      effectiveDebts.forEach(debt => {
        const id = debt.id || debt.name;
        if (!activeFilters[`debt-${id}`]) return;
        const amount = Math.abs(parseFloat(debt.adjustedAmount || debt.amount) || 0);
        // Simple debt handling (Year match)
        // If period logic needed, duplicate above or assume simple date
        const dateStr = debt.madeAvailableDate || debt.startDate;
        const debtYear = dateStr ? new Date(dateStr).getFullYear() : currentYear;
        // If specific logic needed for periods, add here. Currently assuming simple date for debts in this refactor.
        if (year === debtYear) {
          yearCosts += amount;
          costBreakdown[debt.name] = (costBreakdown[debt.name] || 0) + amount;
        }
      });


      // Transmission deduction
      if (year === deathYear && transmissionAmt > 0) {
        balanceBeforeTransmission = cumulativeBalance + (yearIncome - yearCosts);
        cumulativeBalance -= transmissionAmt;
      }

      const annualBalance = yearIncome - yearCosts;

      // Cumulative balance logic:
      // Regular flow: add annual balance.
      // But if an amount was just transferred to Invested Pot, we remove it from "Cash" cumulative.
      // Effectively: 
      //   Income increases by 200k (Green Bar shows 200k).
      //   Cash Balance increases by 200k.
      //   Then we move 200k to Invested Pot.
      //   Cash Balance decreases by 200k.
      //   Invested Pot increases by 200k.
      //   Total Balance (Cash + Invested) remains same net change (+200k).

      cumulativeBalance += (annualBalance - amountTransferredToInvested);

      // Total balance = cumulative from flows + current invested balance (which grows with Monte Carlo)
      const totalBalance = cumulativeBalance + investedBalance;

      breakdown.push({
        year,
        income: yearIncome,
        costs: yearCosts,
        negCosts: -Math.abs(yearCosts),
        annualBalance,
        cumulativeBalance: totalBalance,  // Show total including invested balance
        incomeBreakdown,
        costBreakdown
      });
    }

    // Final balance includes invested balance
    const finalBalance = cumulativeBalance + investedBalance;

    return {
      yearlyBreakdown: breakdown,
      finalBalance: finalBalance,
      canQuit: finalBalance >= 0,
      balanceBeforeTransmission,
      transmissionAmount: transmissionAmt,
      simRetirementDate // stored for ref
    };
  }, [userData, scenarioData, location.state, activeFilters, assets, debts, incomes, costs, retirementData]);

  // Calculate Projection using iterative approach for Option 3 or single run for others
  useEffect(() => {
    if (loading || !userData) return;

    // --- EXECUTION LOGIC ---

    if (scenarioData?.retirementOption === 'option3') {
      // Automatic Optimization
      // Iterate monthly from NOW until Legal Retirement Date
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1); // Start next month
      const endDate = userData?.retirementLegalDate ? new Date(userData.retirementLegalDate) : new Date(startDate.getFullYear() + 20, 0, 1);

      let bestResult = null;
      let found = false;

      // Safety break
      let iterations = 0;
      const maxIterations = 300; // ~25 years

      let testDate = new Date(startDate);
      while (testDate <= endDate && iterations < maxIterations) {
        // Optimization: Find earliest date assuming pension IS taken (ignore filters = true)
        const result = runSimulation(testDate, true);
        if (result && result.finalBalance >= 0) {
          found = true;
          bestResult = result;
          break; // Stop at first valid date
        }
        // Increment month
        testDate.setMonth(testDate.getMonth() + 1);
        iterations++;
      }

      if (found && bestResult) {
        // Once optimal date is found, run simulation AGAIN respecting actual filters (ignore filters = false)
        // This allows user to uncheck the box and see the NEGATIVE balance for that same date.
        const finalResult = runSimulation(bestResult.simRetirementDate, false);
        setProjection(finalResult);
      } else {
        // If no solution found, show the result for the latest possible date (Legal)
        const fallbackResult = runSimulation(endDate, false);
        setProjection(fallbackResult);
      }

    } else {
      // Standard Single Simulation
      const targetDate = location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate || new Date().toISOString();
      const result = runSimulation(targetDate);
      if (result) setProjection(result);
    }

  }, [loading, userData, runSimulation, scenarioData, location.state]);

  // Run Monte Carlo simulation for Invested Book
  useEffect(() => {
    const runMonteCarloIfNeeded = async () => {
      console.log('MC Debug: Checking if simulation needed', {
        hasScenario: !!scenarioData,
        assetsLen: assets?.length,
        investmentSelections: scenarioData?.investmentSelections
      });

      const hasInvestments = hasInvestedBook(scenarioData, assets);
      console.log('MC Debug: hasInvestedBook result', hasInvestments);

      if (!hasInvestments) {
        setMonteCarloProjections(null);
        return;
      }

      setSimulationLoading(true);
      try {
        console.log('Running Monte Carlo simulation for Invested Book...');
        const portfolioSimulation = await runInvestedBookSimulation(
          assets,
          scenarioData,
          userData
        );

        if (portfolioSimulation) {
          // Extract specific percentiles for conservative planning
          // 10th Percentile = 90% chance of success (Very Conservative)
          // 25th Percentile = 75% chance of success (Conservative)
          // 50th Percentile = Median

          const p50 = extractPercentile(portfolioSimulation, 50);
          const p25 = extractPercentile(portfolioSimulation, 25);
          const p10 = extractPercentile(portfolioSimulation, 10);

          setMonteCarloProjections({
            p50,
            p25,
            p10,
            details: portfolioSimulation
          });
          console.log('Monte Carlo simulation complete');
        }
      } catch (error) {
        console.error('Monte Carlo simulation failed:', error);
        toast.error(language === 'fr' ? 'Échec de la simulation d\'investissement' : 'Failed to run investment simulation');
      } finally {
        setSimulationLoading(false);
      }
    };

    runMonteCarloIfNeeded();
  }, [userData, scenarioData, assets, loading, language]);

  // Debounced recalculation when retirement age changes
  useEffect(() => {
    if (!retirementAge || !scenarioData || loading) return;

    const timer = setTimeout(() => {
      recalculateProjections(retirementAge);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [retirementAge]);

  // Recalculate projections for selected retirement age
  const recalculateProjections = async (age) => {
    if (!scenarioData || scenarioData.retirementOption !== 'option2') return;

    setIsRecalculating(true);

    try {
      // 1. Lookup pension/capital for selected age from preRetirementRows
      let pensionValue = '';
      let capitalValue = '';

      if (scenarioData.preRetirementRows && Array.isArray(scenarioData.preRetirementRows)) {
        const ageRow = scenarioData.preRetirementRows.find(row => row.age === Math.floor(age));
        if (ageRow) {
          pensionValue = ageRow.pension || '';
          capitalValue = ageRow.capital || '';
        }
      }

      // 2. Calculate retirement date for selected age
      const birthDate = new Date(userData.birthDate);
      const retirementDate = new Date(birthDate);
      const years = Math.floor(age);
      const months = Math.round((age - years) * 12);
      retirementDate.setFullYear(retirementDate.getFullYear() + years);
      retirementDate.setMonth(retirementDate.getMonth() + months + 1);
      retirementDate.setDate(1);
      const retirementDateStr = retirementDate.toISOString().split('T')[0];

      // 3. Create updated scenario object to use immediately (avoiding state lag)
      const updatedScenarioData = {
        ...scenarioData,
        projectedLPPPension: pensionValue,
        projectedLPPCapital: capitalValue,
        wishedRetirementDate: retirementDateStr
      };

      // Update actual state effectively
      setScenarioData(updatedScenarioData);

      // 4. Run regular simulation with FRESH scenario data
      // This is the single source of truth for the chart (Area + MC lines)
      const result = runSimulation(retirementDateStr, { scenarioData: updatedScenarioData });
      if (result) setProjection(result);

    } catch (error) {
      console.error('Error recalculating projections:', error);
      toast.error(language === 'fr' ? 'Erreur lors du recalcul' : 'Error recalculating');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleFilterChange = (key, checked) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  const toggleAll = (items, prefix, checked) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      items.forEach(item => {
        const id = item.id || item.name;
        newFilters[`${prefix}-${id}`] = checked;
      });
      return newFilters;
    });
  };

  // Autosave filters when they change
  useEffect(() => {
    if (!loading && user && masterKey && scenarioData && Object.keys(activeFilters).length > 0) {
      const saveFilters = async () => {
        try {
          // Debounce could be added here, but for now we save on change
          // to ensure persistence on navigation.
          await saveScenarioData(user.email, masterKey, {
            ...scenarioData,
            activeFilters: activeFilters
          });
        } catch (err) {
          console.error("Failed to save filters", err);
        }
      };
      // Short timeout to debounce slightly and avoid rapid writes
      const timeoutId = setTimeout(saveFilters, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [activeFilters, loading, user, masterKey, scenarioData]);

  // Generate Comprehensive PDF Report
  const generatePDF = async () => {
    try {
      setGeneratingPdf(true);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Helper function to format numbers without special characters
      const formatNumber = (num) => {
        // Handle NaN, null, undefined, or invalid numbers
        if (isNaN(num) || num === null || num === undefined) {
          return '0';
        }
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
      };

      // Helper to format dates
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString();
      };

      // ===== PAGE 1: HEADER, SIMULATION OPTION, GRAPH =====

      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Can I Quit? - Retirement Simulation Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Simulation Option - Full Explanation
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Chosen Simulation Option', 15, yPosition);
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      const option = scenarioData?.retirementOption || 'option1';
      const retireDate = new Date(location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate);
      const birthDate = new Date(userData.birthDate);
      const retireAge = retireDate.getFullYear() - birthDate.getFullYear();

      let optionText = '';
      if (option === 'option0') {
        optionText = `Option 0: Legal Retirement Date (Age 65)`;
      } else if (option === 'option1') {
        optionText = `Option 1: Early Retirement with LPP Pension at Age ${retireAge}`;
        if (scenarioData?.pensionCapital) {
          optionText += `\nCurrent Pension Capital: CHF ${formatNumber(scenarioData.pensionCapital)}`;
        }
      } else if (option === 'option2') {
        optionText = `Option 2: Early Retirement with LPP Capital at Age ${retireAge}`;
        if (scenarioData?.projectedLPPCapital) {
          optionText += `\nProjected LPP Capital: CHF ${formatNumber(scenarioData.projectedLPPCapital)}`;
        }
      } else if (option === 'option3') {
        optionText = `Option 3: Calculate earliest possible retirement (balance > 0)`;
      }

      const lines = pdf.splitTextToSize(optionText, pageWidth - 30);

      // Set blue color for the option text (RGB: 59, 130, 246 - blue-500)
      pdf.setTextColor(59, 130, 246);
      pdf.text(lines, 15, yPosition);
      pdf.setTextColor(0, 0, 0); // Reset to black

      yPosition += lines.length * 5 + 5;

      pdf.text(`Name: ${userData?.firstName || ''} ${userData?.lastName || ''}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`Birth Date: ${formatDate(userData?.birthDate)}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`Retirement Date: ${formatDate(retireDate)}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`Final Balance: CHF ${formatNumber(projection.finalBalance)}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`Status: ${projection.canQuit ? 'Positive' : 'Negative'}`, 15, yPosition);
      yPosition += 12;


      // Capture Graph
      try {
        const chartElement = document.querySelector('.recharts-wrapper');
        if (chartElement) {
          // Wait for state update to trigger re-render
          await new Promise(resolve => setTimeout(resolve, 500)); // Increased timeout for stability

          const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true, // Enable CORS for images
            allowTaint: true,
            logging: false,
            ignoreElements: (element) => element.tagName === 'IMG' || element.tagName === 'IMAGE' // Explicitly ignore external images to prevent crash
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 30;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (yPosition + imgHeight > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
        }
      } catch (chartError) {
        console.error('Failed to capture chart for PDF (continuing without it):', chartError);
        pdf.setFontSize(10);
        pdf.setTextColor(255, 0, 0);
        pdf.text('Chart could not be generated in PDF', 15, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 10;
      }


      // ===== PAGES 2-N: ALL DATA REVIEW TABLES WITH ALL COLUMNS =====

      pdf.addPage();
      yPosition = 20;

      // Periodic Inflows Table (ALL columns)
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Periodic Inflows - Can be adjusted for simulation', 15, yPosition);
      yPosition += 8;

      const activeIncomes = incomes.filter(i => activeFilters[`income-${i.id || i.name}`]);
      if (activeIncomes.length > 0) {
        autoTable(pdf, {
          startY: yPosition,
          head: [['Name', 'Original', 'Adjusted', 'Frequency', 'Start Date', 'End Date', 'Cluster']],
          body: activeIncomes.map(i => [
            i.name,
            formatNumber(parseFloat(i.amount)),
            formatNumber(parseFloat(i.adjustedAmount || i.amount)),
            i.frequency,
            formatDate(i.startDate),
            formatDate(i.endDate),
            i.clusterTag || ''
          ]),
          theme: 'grid',
          headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
          styles: { fontSize: 7 },
          columnStyles: {
            1: { halign: 'right' }, // Original
            2: { halign: 'right' }  // Adjusted
          },
          didParseCell: function (data) {
            // Adjusted column is index 2
            if (data.section === 'body' && data.column.index === 2) {
              const rowIndex = data.row.index;
              const income = activeIncomes[rowIndex];
              const original = parseFloat(income.amount) || 0;
              const adjusted = parseFloat(income.adjustedAmount || income.amount) || 0;

              if (adjusted < original) {
                data.cell.styles.textColor = [34, 197, 94]; // Green - reduction
              } else if (adjusted > original) {
                data.cell.styles.textColor = [239, 68, 68]; // Red - increase
              }
            }
          }
        });
        yPosition = pdf.lastAutoTable.finalY + 10;
      }

      // Current or Future Assets Table (ALL columns)
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Current or Future Assets', 15, yPosition);
      yPosition += 8;

      const activeAssets = assets.filter(a => activeFilters[`asset-${a.id || a.name}`]);

      if (activeAssets.length > 0) {
        autoTable(pdf, {
          startY: yPosition,
          head: [['Name', 'Original', 'Adjusted', 'Category', 'Preserve', 'Avail.Type', 'Avail.Details', 'Strategy', 'Cluster']],
          body: activeAssets.map(a => {
            // Use amount for both original and adjusted if adjustedAmount is missing
            const originalAmount = parseFloat(a.amount) || 0;
            const adjustedAmount = parseFloat(a.adjustedAmount || a.amount) || 0;

            // Infer availability type if not explicitly set
            let availType = a.availabilityType || '';
            if (!availType && a.availabilityTimeframe) availType = 'Period';
            if (!availType && a.availabilityDate) availType = 'Date';

            // Get availability details
            let availDetails = '';
            if (a.availabilityDate) {
              availDetails = formatDate(a.availabilityDate);
            } else if (a.availabilityTimeframe) {
              availDetails = a.availabilityTimeframe;
            }

            const row = [
              a.name || '',
              formatNumber(originalAmount),
              formatNumber(adjustedAmount),
              a.category || '',
              a.preserve || '',
              availType,
              availDetails,
              a.strategy || '',
              a.clusterTag || ''
            ];

            return row;
          }),
          theme: 'grid',
          headStyles: { fillColor: [60, 60, 60], fontSize: 7 },
          styles: { fontSize: 6 },
          columnStyles: {
            1: { halign: 'right' }, // Original
            2: { halign: 'right' }  // Adjusted
          },
          didParseCell: function (data) {
            // Adjusted column is index 2
            if (data.section === 'body' && data.column.index === 2) {
              const rowIndex = data.row.index;
              const asset = activeAssets[rowIndex];
              const original = parseFloat(asset.amount) || 0;
              const adjusted = parseFloat(asset.adjustedAmount || asset.amount) || 0;

              if (adjusted < original) {
                data.cell.styles.textColor = [34, 197, 94]; // Green - reduction
              } else if (adjusted > original) {
                data.cell.styles.textColor = [239, 68, 68]; // Red - increase
              }
            }
          }
        });
        yPosition = pdf.lastAutoTable.finalY + 10;
      }

      // Periodic Outflows Table (ALL columns)
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Periodic Outflows - Can be adjusted for simulation', 15, yPosition);
      yPosition += 8;

      const activeCosts = costs.filter(c => activeFilters[`cost-${c.id || c.name}`]);
      if (activeCosts.length > 0) {
        autoTable(pdf, {
          startY: yPosition,
          head: [['Name', 'Original', 'Adjusted', 'Frequency', 'Start Date', 'End Date', 'Cluster']],
          body: activeCosts.map(c => [
            c.name,
            formatNumber(parseFloat(c.amount)),
            formatNumber(parseFloat(c.adjustedAmount || c.amount)),
            c.frequency,
            formatDate(c.startDate),
            formatDate(c.endDate),
            c.clusterTag || ''
          ]),
          theme: 'grid',
          headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
          styles: { fontSize: 7 },
          columnStyles: {
            1: { halign: 'right' }, // Original
            2: { halign: 'right' }  // Adjusted
          },
          didParseCell: function (data) {
            // Adjusted column is index 2
            if (data.section === 'body' && data.column.index === 2) {
              const rowIndex = data.row.index;
              const cost = activeCosts[rowIndex];
              const original = parseFloat(cost.amount) || 0;
              const adjusted = parseFloat(cost.adjustedAmount || cost.amount) || 0;

              if (adjusted < original) {
                data.cell.styles.textColor = [34, 197, 94]; // Green - reduction
              } else if (adjusted > original) {
                data.cell.styles.textColor = [239, 68, 68]; // Red - increase
              }
            }
          }
        });
        yPosition = pdf.lastAutoTable.finalY + 10;
      }

      // Current or Future Debts Table (ALL columns)
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Current or Future Debts', 15, yPosition);
      yPosition += 8;

      const activeDebts = debts.filter(d => activeFilters[`debt-${d.id || d.name}`]);
      if (activeDebts.length > 0) {
        autoTable(pdf, {
          startY: yPosition,
          head: [['Name', 'Original', 'Adjusted', 'Avail.Type', 'Avail.Details', 'Cluster']],
          body: activeDebts.map(d => {
            // Infer availability type if not explicitly set
            let availType = d.madeAvailableType || '';
            if (!availType && d.madeAvailableTimeframe) availType = 'Period';
            if (!availType && d.madeAvailableDate) availType = 'Date';

            // Get availability details
            let availDetails = '';
            if (d.madeAvailableDate) {
              availDetails = formatDate(d.madeAvailableDate);
            } else if (d.madeAvailableTimeframe) {
              availDetails = d.madeAvailableTimeframe;
            }

            return [
              d.name,
              formatNumber(parseFloat(d.amount)),
              formatNumber(parseFloat(d.adjustedAmount || d.amount)),
              availType,
              availDetails,
              d.clusterTag || ''
            ];
          }),
          theme: 'grid',
          headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
          styles: { fontSize: 7 },
          columnStyles: {
            1: { halign: 'right' }, // Original
            2: { halign: 'right' }  // Adjusted
          },
          didParseCell: function (data) {
            // Adjusted column is index 2
            if (data.section === 'body' && data.column.index === 2) {
              const rowIndex = data.row.index;
              const debt = activeDebts[rowIndex];
              const original = parseFloat(debt.amount) || 0;
              const adjusted = parseFloat(debt.adjustedAmount || debt.amount) || 0;

              if (adjusted < original) {
                data.cell.styles.textColor = [34, 197, 94]; // Green - reduction
              } else if (adjusted > original) {
                data.cell.styles.textColor = [239, 68, 68]; // Red - increase
              }
            }
          }
        });
      }

      // ===== LAST PAGE: LANDSCAPE YEAR-BY-YEAR BREAKDOWN =====

      pdf.addPage('a4', 'landscape');
      const landscapeWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Year-by-Year Breakdown', 15, 15);

      // Build headers explicitly based on the active lists order to match Data Review
      const headers = ['Year'];

      // 1. Incomes
      let activeIncomeItems = incomes.filter(i => activeFilters[`income-${i.id || i.name}`]);

      // Apply Option 3 Pre-retirement filter for PDF (Same logic as UI)
      if (scenarioData?.retirementOption === 'option3' && projection?.simRetirementDate) {
        const birthDate = new Date(userData.birthDate);
        const simDate = new Date(projection.simRetirementDate);
        const ageAtRetirement = (simDate.getFullYear() - birthDate.getFullYear()) + ((simDate.getMonth() - birthDate.getMonth()) / 12);
        const earliestPlanAge = parseInt(scenarioData.option3EarlyAge || '58');

        // Determine which age bucket was used
        let usedAge = Math.floor(ageAtRetirement);
        if (usedAge < earliestPlanAge) usedAge = earliestPlanAge;

        activeIncomeItems = activeIncomeItems.filter(item => {
          if (item.id?.toString().includes('pre_retirement_')) {
            const match = item.id.toString().match(/_(\d+)\s+$/) || item.id.toString().match(/_(\d+)\s*$/);
            if (match) {
              const itemAge = parseInt(match[1]);
              if (itemAge !== usedAge) return false;
            }
          }
          return true;
        });
      }

      // Filter out items with 0 amount, BUT keep Pre-retirement items (as they are dynamic)
      activeIncomeItems = activeIncomeItems.filter(i =>
        i.id?.toString().includes('pre_retirement_') || Math.abs(parseFloat(i.adjustedAmount || i.amount || 0)) > 0
      );

      activeIncomeItems.forEach(i => headers.push(i.name.substring(0, 25))); // Increased limit to avoid truncation

      // 2. Assets (displayed as inflows)
      const activeAssetItems = assets.filter(a => activeFilters[`asset-${a.id || a.name}`] && Math.abs(parseFloat(a.adjustedAmount || a.amount || 0)) > 0);
      activeAssetItems.forEach(a => headers.push(a.name.substring(0, 25)));

      // 3. Costs
      const activeCostItems = costs.filter(c => activeFilters[`cost-${c.id || c.name}`] && Math.abs(parseFloat(c.adjustedAmount || c.amount || 0)) > 0);
      activeCostItems.forEach(c => headers.push(c.name.substring(0, 25)));

      // 4. Debts (displayed as outflows)
      const activeDebtItems = debts.filter(d => activeFilters[`debt-${d.id || d.name}`] && Math.abs(parseFloat(d.adjustedAmount || d.amount || 0)) > 0);
      activeDebtItems.forEach(d => headers.push(d.name.substring(0, 25)));

      headers.push('Annual Bal.');
      headers.push('Cumul. Bal.');

      // Build body data from projection
      const bodyData = projection.yearlyBreakdown.map(row => {
        const rowData = [row.year];

        // 1. Incomes
        activeIncomeItems.forEach(i => {
          let val = row.incomeBreakdown?.[i.name] || 0;

          // FIX for Option 3: Map Pre-retirement dummy items to actual LPP values calculated in simulation
          if (val === 0 && i.id?.toString().includes('pre_retirement_')) {
            if (i.name.toLowerCase().includes('pension')) {
              // Try to find the LPP Pension key used by calculateProjection
              // 1. Check for standard LPP row name from retirementData
              const lppRow = retirementData?.rows?.find(r => r.name.toLowerCase().includes('lpp') && !r.name.toLowerCase().includes('sup') && !r.name.toLowerCase().includes('capital'));
              const lppKey = lppRow ? lppRow.name : 'LPP Pension';
              val = row.incomeBreakdown?.[lppKey] || 0;
            } else if (i.name.toLowerCase().includes('capital')) {
              // Try to find LPP Capital key
              val = row.incomeBreakdown?.['LPP Capital'] || 0;
            }
          }

          rowData.push(val > 0 ? formatNumber(val) : '');
        });

        // 2. Assets (stored in incomeBreakdown in calculation logic)
        activeAssetItems.forEach(a => {
          const val = row.incomeBreakdown?.[a.name] || 0;
          rowData.push(val > 0 ? formatNumber(val) : '');
        });

        // 3. Costs (stored in costBreakdown)
        activeCostItems.forEach(c => {
          const val = row.costBreakdown?.[c.name] || 0;
          rowData.push(val > 0 ? formatNumber(val) : '');
        });

        // 4. Debts (stored in costBreakdown)
        activeDebtItems.forEach(d => {
          const val = row.costBreakdown?.[d.name] || 0;
          rowData.push(val > 0 ? formatNumber(val) : '');
        });

        // Balances
        rowData.push(formatNumber(row.annualBalance));
        rowData.push(formatNumber(row.cumulativeBalance));

        return rowData;
      });

      // Calculate boundaries for separators
      // Year is column 0
      const boundaryIncome = activeIncomeItems.length; // 0 (Year) + N incomes -> Last Income is at index N
      const boundaryAssets = boundaryIncome + activeAssetItems.length;
      const boundaryCosts = boundaryAssets + activeCostItems.length;
      const boundaryDebts = boundaryCosts + activeDebtItems.length;

      autoTable(pdf, {
        startY: 25,
        head: [headers],
        body: bodyData,
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], fontSize: 6, halign: 'right' },
        styles: { fontSize: 5, cellPadding: 1, halign: 'right' },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' }
        },
        didDrawCell: function (data) {
          // Add thick colored vertical lines to separate sections
          if (data.section === 'body' || data.section === 'head') {
            const idx = data.column.index;
            // Draw line on the right edge of the cell if it's a boundary column
            if (idx === boundaryIncome || idx === boundaryAssets || idx === boundaryCosts || idx === boundaryDebts) {
              const doc = data.doc;
              doc.setDrawColor(59, 130, 246); // Blue color
              doc.setLineWidth(0.5); // Thicker line

              const x = data.cell.x + data.cell.width;
              const y = data.cell.y;
              const h = data.cell.height;

              doc.line(x, y, x, y + h);
            }
          }
        },
        didParseCell: function (data) {
          // Apply conditional formatting to the last two columns (Annual Bal. and Cumul. Bal.)
          const numColumns = headers.length;
          const annualBalColIndex = numColumns - 2;
          const cumulBalColIndex = numColumns - 1;

          if (data.section === 'body') {
            // Add light grey background to Year (0) and Balance columns
            if (data.column.index === 0 || data.column.index === annualBalColIndex || data.column.index === cumulBalColIndex) {
              data.cell.styles.fillColor = [245, 245, 245];
            }

            if (data.column.index === annualBalColIndex || data.column.index === cumulBalColIndex) {
              const rowIndex = data.row.index;
              const yearData = projection.yearlyBreakdown[rowIndex];

              if (yearData) {
                const value = data.column.index === annualBalColIndex ? yearData.annualBalance : yearData.cumulativeBalance;

                // Set text color based on positive/negative
                if (value >= 0) {
                  data.cell.styles.textColor = [34, 197, 94]; // Green (green-500)
                } else {
                  data.cell.styles.textColor = [239, 68, 68]; // Red (red-500)
                }
              }
            }
          }
        }
      });


      // ===== ANNEX: HOUSING CALCULATOR =====
      // Always add the page to confirm it works
      pdf.addPage('a4', 'portrait');
      yPosition = 20;

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(language === 'fr' ? 'Annexe : Calculs immobiliers' : 'Annex : Housing asset and cost calculation used', 15, yPosition);
      yPosition += 15;

      if (!realEstateData) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'italic');
        pdf.text(language === 'fr' ? 'Aucune donnée immobilière enregistrée.' : 'No housing calculation data saved.', 15, yPosition);
      } else {
        // 1. Mortgage Details
        if (realEstateData.mortgageRows && realEstateData.mortgageRows.length > 0) {
          pdf.setFontSize(12);
          pdf.text(language === 'fr' ? 'Détails Hypothécaires' : 'Mortgage Details', 15, yPosition);
          yPosition += 5;

          autoTable(pdf, {
            startY: yPosition,
            head: [[
              language === 'fr' ? 'Nom' : 'Name',
              language === 'fr' ? 'Montant' : 'Amount',
              language === 'fr' ? 'Échéance' : 'Maturity Date',
              language === 'fr' ? 'Taux' : 'Rate',
              language === 'fr' ? 'Coût Annuel' : 'Yearly Cost'
            ]],
            body: realEstateData.mortgageRows.map(row => {
              const amount = parseFloat(row.amount) || 0;
              const rate = parseFloat(row.rate) || 0;
              const yearly = amount * (rate / 100);
              return [
                row.name,
                formatNumber(amount),
                formatDate(row.maturityDate),
                rate + '%',
                formatNumber(yearly)
              ];
            }),
            theme: 'grid',
            headStyles: { fillColor: [60, 60, 60] }
          });
          yPosition = pdf.lastAutoTable.finalY + 10;
        }

        // 2. Market Value
        if (realEstateData.assetRows && realEstateData.assetRows.length > 0) {
          pdf.setFontSize(12);
          pdf.text(language === 'fr' ? 'Valeur du Marché' : 'Market Value', 15, yPosition);
          yPosition += 5;

          autoTable(pdf, {
            startY: yPosition,
            head: [[
              language === 'fr' ? 'Nom' : 'Name',
              language === 'fr' ? 'Valeur Estimée' : 'Estimated Value'
            ]],
            body: realEstateData.assetRows.map(row => [
              row.name,
              formatNumber(parseFloat(row.amount) || 0)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [60, 60, 60] }
          });
          yPosition = pdf.lastAutoTable.finalY + 10;
        }

        // 3. Maintenance
        if (realEstateData.maintenanceRows && realEstateData.maintenanceRows.length > 0) {
          pdf.setFontSize(12);
          pdf.text(language === 'fr' ? 'Entretien & Charges' : 'Maintenance & Other Costs', 15, yPosition);
          yPosition += 5;

          autoTable(pdf, {
            startY: yPosition,
            head: [[
              language === 'fr' ? 'Nom' : 'Name',
              language === 'fr' ? 'Montant' : 'Amount',
              language === 'fr' ? 'Fréquence' : 'Frequency'
            ]],
            body: realEstateData.maintenanceRows.map(row => [
              row.name,
              formatNumber(parseFloat(row.amount) || 0),
              language === 'fr' && row.frequency === 'Yearly' ? 'Annuel' :
                language === 'fr' && row.frequency === 'Monthly' ? 'Mensuel' : row.frequency
            ]),
            theme: 'grid',
            headStyles: { fillColor: [60, 60, 60] }
          });
          yPosition = pdf.lastAutoTable.finalY + 15;
        }

        // 4. Totals Summary
        if (realEstateData.totals) {
          pdf.setFontSize(12);
          pdf.text(language === 'fr' ? 'Résumé' : 'Summary', 15, yPosition);
          yPosition += 8;

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');

          const totals = realEstateData.totals;

          const summaryData = [
            [language === 'fr' ? 'Coût Total Annuel' : 'Total Yearly Cost', `CHF ${formatNumber(totals.yearlyCost)}`],
            [language === 'fr' ? 'Coût Total Mensuel (Repris dans les Dépenses)' : 'Total Monthly Cost (Carried to Costs)', `CHF ${formatNumber(totals.monthlyCost)}`],
            [language === 'fr' ? 'Valeur Nette du Bien (Repris dans les Actifs)' : 'Net Asset Value (Carried to Assets)', `CHF ${formatNumber(totals.assetValue)}`]
          ];

          autoTable(pdf, {
            startY: yPosition,
            body: summaryData,
            theme: 'plain',
            columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 100 },
              1: { fontStyle: 'bold' }
            }
          });
        }
      }

      // Save PDF
      pdf.save(`retirement-simulation-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(language === 'fr' ? 'Rapport PDF généré' : 'PDF report generated');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la génération du PDF' : 'Error generating PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Export to Excel
  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['Can I Quit? - Retirement Simulation'],
        ['Generated:', new Date().toLocaleDateString()],
        [],
        ['Parameters'],
        ['Name:', `${userData?.firstName || ''} ${userData?.lastName || ''}`],
        ['Birth Date:', userData?.birthDate ? new Date(userData.birthDate).toLocaleDateString() : 'N/A'],
        ['Retirement Date:', new Date(location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate).toLocaleDateString()],
        ['Option:', scenarioData?.retirementOption || 'option1'],
        [],
        ['Results'],
        ['Final Balance (CHF):', Math.round(projection.finalBalance)],
        ['Status:', projection.canQuit ? 'Positive' : 'Negative']
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Projection Sheet
      const projectionData = projection.yearlyBreakdown.map(row => ({
        Year: row.year,
        Age: row.year - new Date(userData.birthDate).getFullYear(),
        'Total Income (CHF)': Math.round(row.income),
        'Total Costs (CHF)': Math.round(row.costs),
        'Net Result (CHF)': Math.round(row.annualBalance),
        'Cumulative Balance (CHF)': Math.round(row.cumulativeBalance)
      }));
      const wsProjection = XLSX.utils.json_to_sheet(projectionData);
      XLSX.utils.book_append_sheet(wb, wsProjection, 'Projection');

      // Incomes Sheet
      const activeIncomes = incomes.filter(i => activeFilters[`income-${i.id || i.name}`]);
      if (activeIncomes.length > 0) {
        const incomesData = activeIncomes.map(i => ({
          Name: i.name,
          'Amount (CHF)': Math.round(parseFloat(i.adjustedAmount || i.amount)),
          Frequency: i.frequency,
          'Start Date': i.startDate || '',
          'End Date': i.endDate || ''
        }));
        const wsIncomes = XLSX.utils.json_to_sheet(incomesData);
        XLSX.utils.book_append_sheet(wb, wsIncomes, 'Incomes');
      }

      // Costs Sheet
      const activeCosts = costs.filter(c => activeFilters[`cost-${c.id || c.name}`]);
      if (activeCosts.length > 0) {
        const costsData = activeCosts.map(c => ({
          Name: c.name,
          'Amount (CHF)': Math.round(parseFloat(c.adjustedAmount || c.amount)),
          Frequency: c.frequency,
          'Start Date': c.startDate || '',
          'End Date': c.endDate || ''
        }));
        const wsCosts = XLSX.utils.json_to_sheet(costsData);
        XLSX.utils.book_append_sheet(wb, wsCosts, 'Costs');
      }

      // Assets & Debts Sheet
      const activeAssets = assets.filter(a => activeFilters[`asset-${a.id || a.name}`]);
      const activeDebts = debts.filter(d => activeFilters[`debt-${d.id || d.name}`]);
      if (activeAssets.length > 0 || activeDebts.length > 0) {
        const assetsDebtsData = [
          ['Assets'],
          ['Name', 'Amount (CHF)', 'Category', 'Availability'],
          ...activeAssets.map(a => [
            a.name,
            Math.round(parseFloat(a.adjustedAmount || a.amount)),
            a.category || '',
            a.availabilityDate || a.availabilityTimeframe || ''
          ]),
          [],
          ['Debts'],
          ['Name', 'Amount (CHF)', 'Availability'],
          ...activeDebts.map(d => [
            d.name,
            Math.round(parseFloat(d.adjustedAmount || d.amount)),
            d.madeAvailableDate || d.madeAvailableTimeframe || ''
          ])
        ];
        const wsAssetsDebts = XLSX.utils.aoa_to_sheet(assetsDebtsData);
        XLSX.utils.book_append_sheet(wb, wsAssetsDebts, 'Assets & Debts');
      }

      // Write file
      XLSX.writeFile(wb, `retirement-simulation-${new Date().toISOString().split('T')[0]}.xlsx`);
      // toast.success(language === 'fr' ? 'Fichier Excel exporté' : 'Excel file exported'); // Assuming toast is defined elsewhere
    } catch (error) {
      console.error('Error exporting Excel:', error);
      // toast.error(language === 'fr' ? 'Erreur lors de l\'export Excel' : 'Error exporting Excel'); // Assuming toast is defined elsewhere
    }
  };

  // Helper to format item label with details
  const formatItemLabel = (item, type = 'standard') => {
    const amount = parseFloat(item.adjustedAmount || item.amount || 0).toLocaleString();
    const freq = item.frequency ? item.frequency.charAt(0) : (type === 'asset' || type === 'debt' ? '1x' : '?');

    let dateInfo = '';
    if (item.startDate) {
      dateInfo = `${new Date(item.startDate).toLocaleDateString()}`;
      if (item.endDate) dateInfo += ` -> ${new Date(item.endDate).toLocaleDateString()}`;
      else if (freq !== '1x') dateInfo += ' -> ...';
    } else if (item.availabilityDate) {
      dateInfo = `${new Date(item.availabilityDate).toLocaleDateString()}`;
    }

    return (
      <div className="flex flex-col leading-tight w-full">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.name}</span>
          {item.strategy === 'Invested' && <LineChartIcon className="w-4 h-4 text-blue-500 shrink-0" strokeWidth={2.5} />}
        </div>
        <span className="text-xs text-muted-foreground truncate">
          CHF {amount} ({freq}) • {dateInfo}
        </span>
      </div>
    );
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 text-white p-3 rounded shadow-lg border border-gray-700 text-xs min-w-[600px]">
          {/* Header Row: Year left, Balances right */}
          <div className="flex justify-between items-center bg-gray-900/50 p-2 -mx-3 -mt-3 mb-2 border-b border-gray-700 rounded-t">
            <p className="font-bold text-sm text-gray-100 pl-1">{language === 'fr' ? `Année ${label}` : `Year ${label}`}</p>

            <div className="flex gap-4">
              <div className={`flex items-center gap-2 font-bold ${data.annualBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <span className="text-gray-400 font-normal">{language === 'fr' ? 'Annuel:' : 'Annual:'}</span>
                <span>{Math.round(data.annualBalance || (data.income - data.costs)).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-blue-300">
                <span className="text-gray-400 font-normal">{language === 'fr' ? 'Cumulé:' : 'Cumul:'}</span>
                <span>{Math.round(data.cumulativeBalance).toLocaleString()}</span>
              </div>
              {data.monteCarloValue !== undefined && (
                <div className="flex items-center gap-2 font-bold text-blue-500 ml-2 border-l border-gray-600 pl-4">
                  <span className="text-gray-400 font-normal">MC 50%:</span>
                  <span>{Math.round(data.monteCarloValue).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-6 mb-2 mt-3">
            <div className="flex-1">
              <p className="font-semibold text-green-400 mb-1 border-b border-gray-600 pb-1">{language === 'fr' ? 'Revenus (CHF)' : 'Income (CHF)'}</p>
              {Object.entries(data.incomeBreakdown || {}).map(([name, val]) => (
                <div key={name} className="flex justify-between gap-4">
                  <span>{name}</span>
                  <span>{Math.round(val).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-600 mt-1 pt-1 flex justify-between font-bold">
                <span>Total</span>
                <span>{Math.round(data.income).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex-1">
              <p className="font-semibold text-red-400 mb-1 border-b border-gray-600 pb-1">{language === 'fr' ? 'Dépenses (CHF)' : 'Costs (CHF)'}</p>
              {Object.entries(data.costBreakdown || {}).map(([name, val]) => (
                <div key={name} className="flex justify-between gap-4">
                  <span>{name}</span>
                  <span>{Math.round(val).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-600 mt-1 pt-1 flex justify-between font-bold">
                <span>Total</span>
                <span>{Math.round(data.costs).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // UNIFIED CHART DATA LOGIC:
  // We want the Monte Carlo line (Blue) to represent "Total Wealth" just like the Baseline (Gray).
  // Current Baseline = Cash Flows + Constant Invested Amount (0% return).
  // Current MC Result (p50) = Just the Invested Amount (Growing).
  // New Blue Line = (Baseline - Constant Invested) + MC Invested.
  // This ensures the Blue Line inherits all cash flow dips, housing jumps, etc from the main simulation.
  // UNIFIED CHART DATA LOGIC:
  // We want the Monte Carlo lines (Blue/Amber/Red) to represent "Total Wealth" just like the Baseline (Gray).
  // Current Baseline = Cash Flows + Constant Invested Amount (0% return).
  // Current MC Result (pXX) = The Invested Amount (Growing).
  // New Line = (Baseline - Constant Invested) + MC Invested.
  // This ensures the lines inherit all cash flow dips, housing jumps, etc from the main simulation.
  const chartData = useMemo(() => {
    if (!projection?.yearlyBreakdown) return [];

    // If no MC, just return baseline data
    if (!monteCarloProjections?.p50) {
      return projection.yearlyBreakdown;
    }

    // Determine initial invested amount safely
    let initialInvested = 0;
    if (monteCarloProjections.details?.totalAmount) {
      initialInvested = parseFloat(monteCarloProjections.details.totalAmount);
    } else if (monteCarloProjections.investedBookDetails?.totalAmount) {
      initialInvested = parseFloat(monteCarloProjections.investedBookDetails.totalAmount);
    } else if (monteCarloProjections.p50?.[0]?.value) {
      initialInvested = parseFloat(monteCarloProjections.p50[0].value);
    }

    if (isNaN(initialInvested)) initialInvested = 0;

    return projection.yearlyBreakdown.map((row) => {
      // Total Wealth from Baseline
      const totalBase = parseFloat(row.cumulativeBalance) || 0;
      const rowYear = parseInt(row.year);

      // Calculate how much of the "Invested" capital is currently recognized in the Baseline (Liquid)
      // This is necessary because Baseline treats assets as "becoming available" at specific dates,
      // whereas Monte Carlo simulation (currently) assumes invested assets are held from the start (or aligned).
      // To correctly splice them, we must subtract ONLY the portion of invested capital that is currently sitting in the Baseline.
      let investedInBaseline = 0;

      if (monteCarloProjections.details?.portfolioAssets || monteCarloProjections.investedBookDetails?.assets) {
        const investedAssetsList = monteCarloProjections.details?.portfolioAssets || monteCarloProjections.investedBookDetails?.assets;

        investedAssetsList.forEach(asset => {
          // Find original asset to check dates
          // Note: portfolioAssets uses 'assetId', investedBookDetails might use 'id'. Check both.
          const lookupId = asset.assetId || asset.id;
          const originalAsset = assets.find(a => (a.id === lookupId || a.name === asset.productName));

          if (originalAsset) {
            const amount = parseFloat(originalAsset.adjustedAmount || originalAsset.amount || 0);

            // Logic mimics Baseline: When does it enter the equation?
            let isAvailable = true;
            if (originalAsset.availabilityDate) {
              const availYear = new Date(originalAsset.availabilityDate).getFullYear();
              if (availYear > rowYear) isAvailable = false;
            }
            // (Asset periods handled as flow, usually not invested lump sum, but if so, handle here? Assuming availabilityDate for now)

            if (isAvailable) {
              investedInBaseline += amount;
            }
          } else {
            // Fallback: assume available if we can't find specific logic
            investedInBaseline += parseFloat(asset.amount || 0);
          }
        });
      } else {
        // Fallback if no details
        investedInBaseline = initialInvested;
      }

      // Helper to calculate wealth for a percentile
      const calcWealth = (percentilePath) => {
        if (!percentilePath) return totalBase;

        let mcInvestedVal = initialInvested; // default (flat)
        // MC Simulation Value (Asset Value at Year X)
        const mcRow = percentilePath.find(m => parseInt(m.year) === rowYear);
        if (mcRow && !isNaN(parseFloat(mcRow.value))) {
          mcInvestedVal = parseFloat(mcRow.value);
        }

        // Logic:
        // TotalBase includes [Liquid Cash] + [available InvestedPrincipal].
        // We want to show [Liquid Cash] + [MC Market Value].
        // So: (TotalBase - available InvestedPrincipal) + MC Market Value.
        return (totalBase - investedInBaseline) + mcInvestedVal;
      };

      return {
        ...row,
        mc50: calcWealth(monteCarloProjections.p50),
        mc25: calcWealth(monteCarloProjections.p25),
        mc10: calcWealth(monteCarloProjections.p10)
      };
    });
  }, [projection, monteCarloProjections, assets]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-8 bg-background text-foreground" data-testid="scenario-result-page">
      <div className="w-full max-w-[95%] mx-auto mb-6 px-4">
      </div>

      <PageHeader
        title={language === 'fr' ? 'Résultats de la simulation' : 'Simulation results'}
        rightContent={
          <div className="flex gap-2">
            <Button
              onClick={generatePDF}
              variant="outline"
              size="sm"
              disabled={generatingPdf}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {language === 'fr' ? 'Générer rapport' : 'Generate report'}
            </Button>
            <Button
              onClick={exportExcel}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {language === 'fr' ? 'Exporter données' : 'Export data'}
            </Button>
          </div>
        }
      />

      <div className="max-w-[80%] w-full mx-auto px-4">

        {/* TOP ROW: 3 Boxes (Verdict | Info | Controls) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* 1. Verdict Box */}
          <Card className="overflow-hidden border-2 shadow-sm h-full flex flex-col">
            <div className={`h-3 w-full ${projection.canQuit ? 'bg-green-500' : 'bg-red-500'}`} />
            <CardContent className="flex-1 p-0 grid grid-cols-[1fr_2fr]">
              {/* Col 1: Image (Full Height) */}
              <div className="bg-muted/10 flex items-center justify-center p-4 border-r">
                <img
                  src={projection.canQuit ? '/yes_quit.png' : '/no_quit.png'}
                  alt="Verdict"
                  className="w-full h-full object-contain max-h-[140px]"
                />
              </div>

              {/* Col 2: Text & Balance */}
              <div className="p-4 flex flex-col justify-between">
                {/* Top: Description */}
                <div className="text-sm text-gray-300">
                  {(() => {
                    const option = scenarioData?.retirementOption || 'option1';
                    const defaultDate = location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate;

                    let retireDate;
                    if (option === 'option2' && retirementAge) {
                      // Option 2 (Slider): Calculate date dynamically from slider state
                      const birthDate = new Date(userData?.birthDate);
                      const years = Math.floor(retirementAge);
                      const months = Math.round((retirementAge - years) * 12);
                      retireDate = new Date(birthDate);
                      retireDate.setFullYear(retireDate.getFullYear() + years);
                      retireDate.setMonth(retireDate.getMonth() + months + 1);
                      retireDate.setDate(1);
                    } else if (option === 'option3' && projection?.simRetirementDate) {
                      // Option 3 (Auto): Use optimal calculated date
                      retireDate = new Date(projection.simRetirementDate);
                    } else {
                      // Default / Option 0 / Option 1
                      retireDate = new Date(defaultDate);
                    }

                    // Calculates age based on birthday and retirement date
                    let age = '';
                    if (userData?.birthDate && retireDate) {
                      const birth = new Date(userData.birthDate);
                      const ageDate = new Date(retireDate - birth);
                      age = Math.abs(ageDate.getUTCFullYear() - 1970);

                      // Better age precision if using slider? 
                      // For display consistency, let's show integer years or if it's option 2, maybe more detail?
                      // Use the passed retirementAge if available for cleaner match with slider
                      if (option === 'option2' && retirementAge) {
                        age = Math.floor(retirementAge);
                      }
                    }

                    const dateStr = retireDate.toLocaleDateString('de-CH');

                    if (option === 'option0') { // Legal
                      return language === 'fr'
                        ? `Simulation à l'âge légal de la retraite le ${dateStr} (${age} ans)`
                        : `Simulation at legal retirement date ${dateStr} (${age} years old)`;
                    } else if (option === 'option2') { // Early
                      return language === 'fr'
                        ? `Simulation à la date de pré-retraite choisie le ${dateStr} (${age} ans)`
                        : `Simulation at chosen pre-retirement date ${dateStr} (${age} years old)`;
                    } else if (option === 'option1') { // Pick date
                      return language === 'fr'
                        ? `Simulation à la date choisie le ${dateStr} (${age} ans)`
                        : `Simulation at chosen date ${dateStr} (${age} years old)`;
                    } else if (option === 'option3') { // Earliest possible
                      return language === 'fr'
                        ? `Calcul de la date de retraite la plus tôt possible: ${dateStr} (${age} ans)`
                        : `Calculation of earliest retirement date possible: ${dateStr} (${age} years old)`;
                    }
                    return '';
                  })()}
                </div>

                {/* Bottom: Balance */}
                <div className="text-right mt-4">
                  <p className={`text-2xl font-bold ${projection.canQuit ? 'text-green-500' : 'text-red-500'}`}>
                    CHF {Math.round(projection.finalBalance).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'fr' ? 'Solde final projeté' : 'Projected Final Balance'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. MIDDLE BOX: Status Info */}
          <Card className="h-full flex items-center justify-center border-dashed border-2 bg-muted/20">
            <CardContent className="text-center p-6">
              {hasInvestedBook(scenarioData, assets) ? (
                <div className="text-blue-400 font-semibold text-lg px-4">
                  {language === 'fr' ? 'Simulations avec rendements projetés (Monte Carlo)' : 'Simulations with projected returns using Monte-Carlo approach'}
                </div>
              ) : (
                <div className="text-green-400 font-semibold text-lg px-4">
                  {language === 'fr' ? 'Simulation sécurisée sans investissements' : 'Safe simulation without investments'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. RIGHT BOX: Monte Carlo Controls */}
          {hasInvestedBook(scenarioData, assets) ? (
            <Card className="h-full">
              <CardContent className="pt-6 h-full flex flex-col justify-center">
                <h4 className="font-semibold text-sm mb-4 text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
                  {language === 'fr' ? 'Contrôles de Projection' : 'Projection Controls'}
                  {simulationLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="show-baseline" checked={showBaseline} onCheckedChange={setShowBaseline} />
                    <Label htmlFor="show-baseline" className="text-sm cursor-pointer">{language === 'fr' ? 'Référence (Cash sans rendement)' : 'Baseline (Cash no return)'}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="show-50th" checked={show50thPercentile} onCheckedChange={setShow50thPercentile} />
                    <Label htmlFor="show-50th" className="text-sm cursor-pointer text-cyan-500">{language === 'fr' ? 'Projection 50%' : '50% Projection'}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="show-25th" checked={show25thPercentile} onCheckedChange={setShow25thPercentile} />
                    <Label htmlFor="show-25th" className="text-sm cursor-pointer text-amber-500">{language === 'fr' ? '25% (Conservateur)' : '25% (Conservative)'}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="show-10th" checked={show10thPercentile} onCheckedChange={setShow10thPercentile} />
                    <Label htmlFor="show-10th" className="text-sm cursor-pointer text-blue-500">{language === 'fr' ? '10% (Pessimiste)' : '10% (Pessimistic)'}</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center bg-muted/10">
              <span className="text-muted-foreground italic text-sm">
                {language === 'fr' ? 'Investissements inactifs' : 'Investments inactive'}
              </span>
            </Card>
          )}

        </div>

        {/* HIDDEN: Active Contributors Checkbox Section */}
        {/* TODO: [User Request] Remove this block if confirmed unnecessary in 3 weeks */}
        {false && (
          <Card className="max-h-[520px] overflow-y-auto mb-6 hidden">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                {language === 'fr' ? 'Contributeurs actifs' : 'Active Contributors'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Incomes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">{language === 'fr' ? 'Revenus' : 'Incomes'}</h4>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { toggleAll(incomes, 'income', true); toggleAll(retirementData?.rows || [], 'pillar', true); }} className="h-6 text-xs px-2">All</Button>
                    <Button variant="ghost" size="sm" onClick={() => { toggleAll(incomes, 'income', false); toggleAll(retirementData?.rows || [], 'pillar', false); }} className="h-6 text-xs px-2">None</Button>
                  </div>
                </div>
                <div className="space-y-3">

                  {incomes.map(item => {
                    // Option 3: Only show the pre-retirement row relevant to the simulation result
                    if (scenarioData?.retirementOption === 'option3' && projection?.simRetirementDate && item.id?.toString().includes('pre_retirement_')) {
                      const birthDate = new Date(userData.birthDate);
                      const simDate = new Date(projection.simRetirementDate);
                      const ageAtRetirement = (simDate.getFullYear() - birthDate.getFullYear()) + ((simDate.getMonth() - birthDate.getMonth()) / 12);
                      const earliestPlanAge = parseInt(scenarioData.option3EarlyAge || '58');

                      // Determine which age bucket was used
                      let usedAge = Math.floor(ageAtRetirement);
                      if (usedAge < earliestPlanAge) usedAge = earliestPlanAge;

                      // IDs are like "pre_retirement_pension_62 " or "pre_retirement_capital_62 "
                      // Extract age from ID
                      const match = item.id.toString().match(/_(\d+)\s+$/) || item.id.toString().match(/_(\d+)\s*$/);
                      if (match) {
                        const itemAge = parseInt(match[1]);
                        if (itemAge !== usedAge) return null;
                      }
                    }

                    const itemId = (item.id || item.name).toString().trim();
                    return (
                      <div key={item.id || item.name} className="flex items-start space-x-2">
                        <Checkbox
                          id={`filter-income-${itemId}`}
                          checked={activeFilters[`income-${itemId}`] !== false}
                          onCheckedChange={(checked) => handleFilterChange(`income-${itemId}`, checked)}
                          className="mt-1"
                        />
                        <Label htmlFor={`filter-income-${itemId}`} className="text-sm cursor-pointer whitespace-normal">
                          {formatItemLabel(item)}
                        </Label>
                      </div>
                    );
                  })}
                  {retirementData?.rows?.map(item => (
                    <div key={item.id || item.name} className="flex items-start space-x-2">
                      <Checkbox
                        id={`filter-pillar-${item.id || item.name}`}
                        checked={activeFilters[`pillar-${item.id || item.name}`] !== false}
                        onCheckedChange={(checked) => handleFilterChange(`pillar-${item.id || item.name}`, checked)}
                        className="mt-1"
                      />
                      <Label htmlFor={`filter-pillar-${item.id || item.name}`} className="text-sm cursor-pointer whitespace-normal">
                        {formatItemLabel(item)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assets */}
              {assets.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">{language === 'fr' ? 'Actifs' : 'Assets'}</h4>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(assets, 'asset', true)} className="h-6 text-xs px-2">All</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(assets, 'asset', false)} className="h-6 text-xs px-2">None</Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {assets.map(item => (
                      <div key={item.id || item.name} className="flex items-start space-x-2">
                        <Checkbox
                          id={`filter-asset-${item.id || item.name}`}
                          checked={!!activeFilters[`asset-${item.id || item.name}`]}
                          onCheckedChange={(checked) => handleFilterChange(`asset-${item.id || item.name}`, checked)}
                          className="mt-1"
                        />
                        <Label htmlFor={`filter-asset-${item.id || item.name}`} className="text-sm cursor-pointer whitespace-normal">
                          {formatItemLabel(item, 'asset')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Costs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">{language === 'fr' ? 'Dépenses' : 'Costs'}</h4>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleAll(costs, 'cost', true)} className="h-6 text-xs px-2">All</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleAll(costs, 'cost', false)} className="h-6 text-xs px-2">None</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {costs.map(item => (
                    <div key={item.id || item.name} className="flex items-start space-x-2">
                      <Checkbox
                        id={`filter-cost-${item.id || item.name}`}
                        checked={!!activeFilters[`cost-${item.id || item.name}`]}
                        onCheckedChange={(checked) => handleFilterChange(`cost-${item.id || item.name}`, checked)}
                        className="mt-1"
                      />
                      <Label htmlFor={`filter-cost-${item.id || item.name}`} className="text-sm cursor-pointer whitespace-normal">
                        {formatItemLabel(item)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Debts */}
              {debts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">{language === 'fr' ? 'Dettes / Sorties' : 'Debts / Outflows'}</h4>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(debts, 'debt', true)} className="h-6 text-xs px-2">All</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(debts, 'debt', false)} className="h-6 text-xs px-2">None</Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {debts.map(item => (
                      <div key={item.id || item.name} className="flex items-start space-x-2">
                        <Checkbox
                          id={`filter-debt-${item.id || item.name}`}
                          checked={!!activeFilters[`debt-${item.id || item.name}`]}
                          onCheckedChange={(checked) => handleFilterChange(`debt-${item.id || item.name}`, checked)}
                          className="mt-1"
                        />
                        <Label htmlFor={`filter-debt-${item.id || item.name}`} className="text-sm cursor-pointer whitespace-normal">
                          {formatItemLabel(item, 'debt')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* MAIN GRAPH & SLIDER AREA - Full Width */}
        <div className="space-y-6 mb-12">

          {/* Graph */}
          <Card className="h-[615px]">
            <CardHeader>
              <CardTitle>{language === 'fr' ? 'Projection Financière en CHF' : 'Financial Projection in CHF'}</CardTitle>
            </CardHeader>
            <CardContent className="h-[545px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 100, left: 20, bottom: 40 }} stackOffset="sign">
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" />
                  <YAxis
                    tick={({ x, y, payload }) => (
                      <text x={x} y={y} dy={4} textAnchor="end" fill={generatingPdf ? "#000000" : (payload.value === 0 ? "#ffffff" : "#888888")} fontSize={12}>
                        {payload.value === 0 ? "0k" : `${(payload.value / 1000).toFixed(0)}k`}
                      </text>
                    )}
                  />
                  <ReferenceLine y={0} stroke={generatingPdf ? "#000000" : "#FFFFFF"} strokeWidth={2} />
                  {!generatingPdf && <Tooltip content={<CustomTooltip />} />}
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />

                  {/* Baseline - Existing cumulative balance (dashed gray when Monte Carlo active) */}
                  {showBaseline && (
                    <Area
                      type="monotone"
                      dataKey="cumulativeBalance"
                      stroke={monteCarloProjections ? "#9ca3af" : (projection.finalBalance >= 0 ? "#10b981" : "#ef4444")}
                      strokeDasharray={monteCarloProjections ? "5 5" : "0"}
                      fill={monteCarloProjections ? "none" : (projection.finalBalance >= 0 ? "url(#colorBalance)" : "url(#colorNegative)")}
                      name={monteCarloProjections
                        ? (language === 'fr' ? 'Référence (sans investissement)' : 'Baseline (no investment)')
                        : (language === 'fr' ? 'Solde cumulé' : 'Cumulative Balance')
                      }
                      stackId={monteCarloProjections ? undefined : "area"}
                      strokeWidth={2}
                      label={(props) => {
                        const { x, y, value, index } = props;
                        // Only show label on the last point
                        if (chartData && index === chartData.length - 1) {
                          return (
                            <text x={x} y={y} dx={10} dy={0} fill={value >= 0 ? "#10b981" : "#ef4444"} fontSize={16} fontWeight="bold" textAnchor="start">
                              {Math.round(value).toLocaleString()}
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  )}



                  {/* Monte Carlo 50th Percentile - Median (now Cyan) */}
                  {show50thPercentile && monteCarloProjections && (
                    <Line
                      type="monotone"
                      dataKey="mc50"
                      stroke="#06b6d4" // Cyan
                      strokeWidth={2}
                      dot={false}
                      name={language === 'fr' ? 'Monte Carlo 50% (Médiane)' : 'Monte Carlo 50% (Median)'}
                      label={(props) => {
                        const { x, y, value, index } = props;
                        if (chartData && index === chartData.length - 1) {
                          return (
                            <text x={x} y={y} dx={10} dy={4} fill={value >= 0 ? "#10b981" : "#ef4444"} fontSize={16} fontWeight="bold" textAnchor="start">
                              {Math.round(value).toLocaleString()}
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  )}

                  {/* Monte Carlo 25th Percentile - Conservative */}
                  {show25thPercentile && monteCarloProjections && (
                    <Line
                      type="monotone"
                      dataKey="mc25"
                      stroke="#f59e0b" // Amber/Orange
                      strokeWidth={2}
                      dot={false}
                      name={language === 'fr' ? 'Monte Carlo 25% (Conservateur)' : 'Monte Carlo 25% (Conservative)'}
                      label={(props) => {
                        const { x, y, value, index } = props;
                        if (chartData && index === chartData.length - 1) {
                          return (
                            <text x={x} y={y} dx={10} dy={4} fill={value >= 0 ? "#10b981" : "#ef4444"} fontSize={16} fontWeight="bold" textAnchor="start">
                              {Math.round(value).toLocaleString()}
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  )}

                  {/* Monte Carlo 10th Percentile - Very Conservative (Now Blue default) */}
                  {show10thPercentile && monteCarloProjections && (
                    <Line
                      type="monotone"
                      dataKey="mc10"
                      stroke="#3B82F6" // Blue
                      strokeWidth={2}
                      dot={false}
                      name={language === 'fr' ? 'Monte Carlo 10% (Très Conservateur)' : 'Monte Carlo 10% (Very Conservative)'}
                      label={(props) => {
                        const { x, y, value, index } = props;
                        if (chartData && index === chartData.length - 1) {
                          return (
                            <text x={x} y={y} dx={10} dy={4} fill={value >= 0 ? "#10b981" : "#ef4444"} fontSize={16} fontWeight="bold" textAnchor="start">
                              {Math.round(value).toLocaleString()}
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  )}

                  <Bar dataKey="income" barSize={10} fill="#22c55e" name={language === 'fr' ? 'Revenus annuels' : 'Annual Income'} stackId="bars" />
                  <Bar dataKey="negCosts" barSize={10} fill="#ef4444" name={language === 'fr' ? 'Dépenses annuelles' : 'Annual Costs'} stackId="bars" />

                  {/* ReferenceLine with Dynamic Logic */}
                  {(() => {
                    // Determines the reference date/year to show.
                    // Priority 1: Slider active value (Option 2) - Immediate Feedback
                    // Priority 2: Simulation result date (e.g. Option 3 optimal)
                    // Priority 3: Default input date

                    let refDate = new Date();

                    if (scenarioData?.retirementOption === 'option2' && retirementAge) {
                      // Calculate date from Slider state immediately
                      const birthDate = new Date(userData?.birthDate);
                      const years = Math.floor(retirementAge);
                      const months = Math.round((retirementAge - years) * 12);
                      refDate = new Date(birthDate);
                      refDate.setFullYear(refDate.getFullYear() + years);
                      refDate.setMonth(refDate.getMonth() + months + 1); // +1 month logic
                      refDate.setDate(1);
                    } else {
                      const defaultDate = location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate;
                      const refDateSrc = projection?.simRetirementDate || defaultDate;
                      refDate = refDateSrc ? new Date(refDateSrc) : new Date();
                    }

                    const refYear = !isNaN(refDate.getTime()) ? refDate.getFullYear() : new Date().getFullYear();

                    // If using slider, we might be mid-year. XAxis is categorical (Year integers).
                    // We can try to approximate the position if the chart supports it, 
                    // or just snap to the year. For now, snapping to year is safer for categorical axes.
                    // If XAxis was type="number", we could pass `refYear + (refDate.getMonth()/12)`.

                    return (
                      <ReferenceLine
                        x={refYear}
                        stroke="#f59042"
                        label={{
                          position: 'insideTopLeft',
                          value: `${language === 'fr' ? 'Retraite' : 'Retirement'}: ${refDate.toLocaleDateString()}`,
                          fill: '#f59042',
                          fontSize: 12
                        }}
                        strokeDasharray="3 3"
                      />
                    );
                  })()}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Retirement Age Slider - Only for option2 */}
          {scenarioData?.retirementOption === 'option2' && retirementAge && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5" />
                  {language === 'fr' ? 'Ajuster l\'âge de retraite' : 'Adjust Retirement Age'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Age Display */}
                  <div className="flex items-center justify-between">
                    <Label className="text-base">
                      {language === 'fr' ? 'Âge de retraite:' : 'Retirement Age:'}
                    </Label>
                    <span className="text-2xl font-bold">
                      {(() => {
                        const years = Math.floor(retirementAge);
                        const months = Math.round((retirementAge - years) * 12);
                        if (months === 0) {
                          return language === 'fr' ? `${years} ans` : `${years} years`;
                        }
                        return language === 'fr'
                          ? `${years} ans ${months} mois`
                          : `${years} years ${months} months`;
                      })()}
                    </span>
                  </div>

                  {/* Slider with age labels, ticks and dates */}
                  <div className="pt-6 flex gap-4 items-start">
                    {/* Lock Icon */}
                    <div className="pt-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                        <Lock className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex-1 space-y-2">
                      {(() => {
                        const minAge = parseInt(scenarioData?.earlyRetirementAge || '58', 10);
                        const maxAge = 65;
                        const range = maxAge - minAge;

                        return (
                          <>
                            <Slider
                              value={[retirementAge]}
                              onValueChange={(value) => setRetirementAge(value[0])}
                              min={minAge}
                              max={maxAge}
                              step={1 / 12} // Monthly steps (1/12 of a year)
                              className="flex-1"
                            />

                            {/* Age markers with Ticks and Dates */}
                            <div className="relative h-12 text-xs text-gray-500 mt-2">
                              {Array.from({ length: range + 1 }, (_, i) => minAge + i).map(age => {
                                // Calculate date for this integer age tick
                                const tickDate = new Date(userData?.birthDate);
                                tickDate.setFullYear(tickDate.getFullYear() + age);
                                tickDate.setMonth(tickDate.getMonth() + 1); // +1 month logic consistent with retirement date
                                tickDate.setDate(1);

                                return (
                                  <div
                                    key={age}
                                    className="absolute transform -translate-x-1/2 flex flex-col items-center"
                                    style={{
                                      left: `${((age - minAge) / range) * 100}%`,
                                      top: '-6px' // Position relative to the container below slider
                                    }}
                                  >
                                    {/* Tick Mark */}
                                    <div className="h-2 w-px bg-gray-400 mb-1"></div>

                                    {/* Age Label */}
                                    <span className="font-semibold">{age}</span>

                                    {/* Date Label (Vertical or Small) */}
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                                      {tickDate.toLocaleDateString()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Retirement Date */}
                  <div className="text-sm text-gray-500">
                    {language === 'fr' ? 'Date de retraite:' : 'Retirement Date:'} {(() => {
                      const birthDate = new Date(userData?.birthDate);
                      const retDate = new Date(birthDate);
                      const years = Math.floor(retirementAge);
                      const months = Math.round((retirementAge - years) * 12);
                      retDate.setFullYear(retDate.getFullYear() + years);
                      retDate.setMonth(retDate.getMonth() + months + 1); // +1 for first of next month
                      retDate.setDate(1);
                      return retDate.toLocaleDateString();
                    })()}
                  </div>

                  {/* Loading indicator */}
                  {isRecalculating && (
                    <div className="text-sm text-blue-500 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {language === 'fr' ? 'Recalcul des projections...' : 'Recalculating projections...'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default ScenarioResult;
