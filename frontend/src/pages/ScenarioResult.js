import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { getIncomeData, getCostData, getUserData, getScenarioData, getRetirementData, saveScenarioData, getRealEstateData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import { toast } from 'sonner';
import { hasInvestedBook, getInvestedBookAssets, runInvestedBookSimulation, calculateInvestedProjection } from '../utils/projectionCalculator';
import { extractPercentile, calculateBandwidth } from '../utils/monteCarloSimulation';
import { getProductById, getAssetClassStyle } from '../data/investmentProducts';
import { Slider } from '../components/ui/slider';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, Bar, ReferenceLine } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { ChevronDown, ChevronUp, Download, RefreshCw, SlidersHorizontal, LineChart as LineChartIcon, FileText, Lock, LockKeyhole, AlertTriangle } from 'lucide-react';
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
  const [show10thPercentile, setShow10thPercentile] = useState(false);
  const [show5thPercentile, setShow5thPercentile] = useState(true); // Default Very Pessimistic
  const [show25thPercentile, setShow25thPercentile] = useState(false);
  const [monteCarloProjections, setMonteCarloProjections] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);

  // Retirement Age Slider State
  const [retirementAge, setRetirementAge] = useState(null); // Will be set from scenarioData
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [baselineProjection, setBaselineProjection] = useState(null);
  const [missingPages, setMissingPages] = useState([]);

  // Result State
  const [projection, setProjection] = useState({
    yearlyBreakdown: [],
    finalBalance: 0,
    canQuit: false,
    balanceBeforeTransmission: 0,
    transmissionAmount: 0
  });

  // Activate All Ownings State
  const [activateAllOwnings, setActivateAllOwnings] = useState(false);
  const [owningsActivationDate, setOwningsActivationDate] = useState(new Date().toISOString().split('T')[0]);

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
          // PROACTIVE SYNC: Only use the book if at least one current asset is still marked as 'Invested'
          // This prevents "ghost" items after a user unchecks "Invest?" but skips the setup screen.
          const hasAnyInvestedMarkers = finalAssets.some(a => a.category === 'Liquid' && a.strategy === 'Invested');

          if (hasAnyInvestedMarkers) {
            // 1. Remove original items that would be replaced (Liquid + Invested)
            finalAssets = finalAssets.filter(a => !(a.category === 'Liquid' && a.strategy === 'Invested'));

            // 2. Add the customized rows
            const bookAssets = sData.investedBook.map(row => ({
              ...row,
              category: 'Liquid',
              adjustedAmount: row.amount
            }));
            finalAssets = [...finalAssets, ...bookAssets];
          } else if (sData.investedBook.length > 0) {
            console.log('[Simulation] Ignoring stale investedBook because no assets are marked for investment.');
          }
        }

        // REMOVED AUTO-CORRECT: The aggressive correction was overriding valid staggered payouts (e.g. 3a in 2026).
        // If a user sets a date, we should respect it.

        // CRITICAL FIX: Deduplicate Assets to prevent "Ghost" items (Same ID/Name but different dates)
        // Logs showed both a 2026 version and 2035 version of the same asset.
        // We prioritize the one with a FUTURE date if duplicates exist.
        const uniqueAssetsMap = new Map();

        finalAssets.forEach(asset => {
          const key = asset.name; // Use Name as key because ID might be generated/unstable for splits
          const existing = uniqueAssetsMap.get(key);

          if (!existing) {
            uniqueAssetsMap.set(key, asset);
          } else {
            // Conflict! Choose the "better" one.
            // 1. Prefer one with a real Future Date over Today
            const existingDate = existing.availabilityDate ? new Date(existing.availabilityDate) : new Date(0);
            const newDate = asset.availabilityDate ? new Date(asset.availabilityDate) : new Date(0);
            const today = new Date();

            // If new one is in future and existing is today/past, take new one
            if (newDate > today && existingDate <= today) {
              uniqueAssetsMap.set(key, asset);
            }
            // Else keep existing (or add other tie-breaking logic)
          }
        });

        // Convert back to array
        finalAssets = Array.from(uniqueAssetsMap.values());

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

        // CRITICAL: Re-apply "Ghost Filter" to finalIncomes to ensure no retirement items leaked via adjustedIncomes
        // This handles the case where "Supplementary Pension" was previously saved into adjustedIncomes loop
        finalIncomes = finalIncomes.filter(i =>
          !String(i.name || '').toLowerCase().includes('pension') &&
          !String(i.name || '').toLowerCase().includes('lpp') &&
          !String(i.name || '').toLowerCase().includes('solde') && // legacy
          !String(i.name || '').toLowerCase().includes('3a') && // CRITICAL: Filter 3a ghosts too
          !String(i.id || '').toLowerCase().includes('pension') &&
          !String(i.id || '').toLowerCase().includes('lpp')
        );

        // Detect missing pages
        const missing = [];
        if (finalIncomes.length === 0) missing.push(language === 'fr' ? 'Revenus' : 'Income');
        if (finalCosts.length === 0) missing.push(language === 'fr' ? 'Dépenses' : 'Expenses');

        // Robust check for Retirement Parameters: covers both Option 0/2 (preRetirementRows, legal) 
        // and Benefits (AVS, 3a, LPP Sup) in scenarioData, with fallback to legacy rData.
        const hasRetirementInScenario = sData && (
          (sData.preRetirementRows && sData.preRetirementRows.some(row => (parseFloat(row.pension) || 0) > 0 || (parseFloat(row.capital) || 0) > 0)) ||
          (parseFloat(sData.projectedLegalLPPPension) || 0) > 0 ||
          (parseFloat(sData.projectedLegalLPPCapital) || 0) > 0 ||
          (sData.benefitsData && (
            (sData.benefitsData.avs && (parseFloat(sData.benefitsData.avs.amount) || 0) > 0) ||
            (Array.isArray(sData.benefitsData.threeA) && sData.benefitsData.threeA.some(a => (parseFloat(a.amount) || 0) > 0)) ||
            (sData.benefitsData.lppSup && (parseFloat(sData.benefitsData.lppSup.amount) || 0) > 0)
          ))
        );

        if (!hasRetirementInScenario && (!rData || !rData.rows || rData.rows.length === 0)) {
          missing.push(language === 'fr' ? 'Paramètres de retraite' : 'Retirement Parameters');
        }
        setMissingPages(missing);

        setUserData(uData);
        setIncomes(finalIncomes);
        setCosts(finalCosts);
        setAssets(finalAssets);
        setDebts(finalDebts);
        setRetirementData(rData);
        setScenarioData(sData);
        setRealEstateData(reData);

        // Initialize activateAllOwnings and owningsActivationDate from scenarioData
        if (sData?.activateAllOwnings !== undefined) {
          setActivateAllOwnings(sData.activateAllOwnings);
        }
        if (sData?.owningsActivationDate) {
          setOwningsActivationDate(sData.owningsActivationDate);
        }

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
    const simActivateOwnings = overrides.hasOwnProperty('activateAllOwnings') ? overrides.activateAllOwnings : activateAllOwnings;
    const simOwningsDate = overrides.hasOwnProperty('owningsActivationDate') ? overrides.owningsActivationDate : owningsActivationDate;

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

        // Check availability. 
        // Logic: 
        // 1. If "availabilityDate" exists, compare year.
        // 2. If NO availabilityDate, it is NOT available (unless we define a default, but user said "no availability date...so should not appear").
        // 3. Exception: If we have an "Already available" flag or similar? The code used "Date" type mostly.

        let isAvailableNow = false;

        if (asset.availabilityType === 'Period') {
          // Periods are flows, not initial lumps
          isAvailableNow = false;
        } else if (asset.availabilityDate) {
          const availDate = new Date(asset.availabilityDate);
          const availYear = availDate.getFullYear();

          // Available now only if date is strictly in the past (before current simulation start year)
          // If it's this year (currentYear), it will be added in the loop below as an "Inflow"
          if (availYear < currentYear) {
            isAvailableNow = true;
          }
        }
        // If availabilityDate is missing/empty, it is NEVER available (per user request for Net Housing)

        if (isAvailableNow) {
          investedBalance += amount;
        }
      }
    });

    console.log(`Simulation starting with invested balance (available now): ${investedBalance}`);

    for (let year = currentYear; year <= deathYear; year++) {
      let yearIncome = 0;
      let yearActivatedOwnings = 0;
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

        if (row.isRetirement) {
          // Rule: Retirement-related incomes (Annuities, AVS) should be used exactly as provided (start/end)
          // DataReview already set their start date to either (RetirementDate) or (LegalAge)
        } else if (effectiveScenarioData?.retirementOption === 'option2' && isSalary) {
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

        const val = calculateYearlyAmount(
          amount,
          (row.isRetirement && nameLower.includes('avs')) ? 'Yearly' : row.frequency,
          row.startDate,
          effectiveEndDate,
          year
        );
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
            // SKIP AVS here as it is processed in the incomes loop above (isRetirement: true)
            return;
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
          // ACTIVATE ALL OWNINGS LOGIC
          let effectiveDateStr = asset.availabilityDate;
          let isActivatedOwning = false;

          if (!effectiveDateStr && !asset.availabilityTimeframe && simActivateOwnings) {
            effectiveDateStr = simOwningsDate;
            isActivatedOwning = true;
          }

          // STRICT RULE: Asset must have a valid availability date to be processed here
          if (!effectiveDateStr) return;

          const date = new Date(effectiveDateStr);

          if (year === date.getFullYear()) {
            // IT BECOMES AVAILABLE THIS YEAR

            if (isActivatedOwning) {
              // Track separately for pink bar
              yearActivatedOwnings += amount;
              // Also add to income breakdown for tooltip detail
              incomeBreakdown[`${asset.name} (Activated)`] = (incomeBreakdown[`${asset.name} (Activated)`] || 0) + amount;
            } else {
              // Show it on the INCOME side for visual confirmation
              yearIncome += amount;
              incomeBreakdown[asset.name] = (incomeBreakdown[asset.name] || 0) + amount;
            }

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

      const annualBalance = (yearIncome + yearActivatedOwnings) - yearCosts;

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
        activatedOwnings: yearActivatedOwnings,
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
  }, [userData, scenarioData, location.state, activeFilters, assets, debts, incomes, costs, retirementData, activateAllOwnings, owningsActivationDate]);

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
        const result = runSimulation(testDate, { ignorePensionFilters: true });
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
        const finalResult = runSimulation(bestResult.simRetirementDate, { ignorePensionFilters: false });
        setProjection(finalResult);
      } else {
        // If no solution found, show the result for the latest possible date (Legal)
        const fallbackResult = runSimulation(endDate, { ignorePensionFilters: false });
        setProjection(fallbackResult);
      }

    } else {
      // Standard Single Simulation
      const targetDate = location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate || new Date().toISOString();
      const result = runSimulation(targetDate);
      if (result) setProjection(result);
    }
  }, [loading, userData, runSimulation, scenarioData, location.state, activateAllOwnings, owningsActivationDate]);

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
          // Extract specific percentiles using Flow-Aware projection
          // This allows assets (like 2035 Pension) to be added dynamically + Returns applied correctly
          const params = { assets, activeFilters };

          const p50 = calculateInvestedProjection(params, portfolioSimulation, 50);
          const p25 = calculateInvestedProjection(params, portfolioSimulation, 25);
          const p10 = calculateInvestedProjection(params, portfolioSimulation, 10);
          const p5 = calculateInvestedProjection(params, portfolioSimulation, 5);

          setMonteCarloProjections({
            p50,
            p25,
            p10,
            p5,
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

  // Autosave filters and activation settings when they change
  useEffect(() => {
    if (!loading && user && masterKey && scenarioData && Object.keys(activeFilters).length > 0) {
      const saveData = async () => {
        try {
          await saveScenarioData(user.email, masterKey, {
            ...scenarioData,
            activeFilters: activeFilters,
            activateAllOwnings: activateAllOwnings,
            owningsActivationDate: owningsActivationDate
          });
        } catch (err) {
          console.error("Failed to save settings", err);
        }
      };
      const timeoutId = setTimeout(saveData, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [activeFilters, activateAllOwnings, owningsActivationDate, loading, user, masterKey, scenarioData]);

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
              {data.activatedOwnings > 0 && (
                <div className="flex justify-between gap-4 text-pink-400 font-medium">
                  <span>{language === 'fr' ? 'Avoirs activés' : 'Activated Ownings'}</span>
                  <span>{Math.round(data.activatedOwnings).toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-600 mt-1 pt-1 flex justify-between font-bold">
                <span>Total</span>
                <span>{Math.round(data.income + (data.activatedOwnings || 0)).toLocaleString()}</span>
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
        mc10: calcWealth(monteCarloProjections.p10),
        mc5: calcWealth(monteCarloProjections.p5)
      };
    });
  }, [projection, monteCarloProjections, assets]);

  const isInvested = useMemo(() => hasInvestedBook(scenarioData, assets), [scenarioData, assets]);
  const finalChartRow = chartData && chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const finalBaselineBalance = projection.finalBalance;
  const final5Balance = (isInvested && finalChartRow) ? finalChartRow.mc5 : null;

  // Verdict calculation
  const canQuitVerdict = isInvested ? (final5Balance >= 0) : (finalBaselineBalance >= 0);

  // Retirement Info Helpers
  const retirementInfo = useMemo(() => {
    const option = scenarioData?.retirementOption || 'option1';
    const defaultDateStr = location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate;

    let retireDate;
    if (option === 'option2' && retirementAge) {
      const birthDate = new Date(userData?.birthDate);
      const years = Math.floor(retirementAge);
      const months = Math.round((retirementAge - years) * 12);
      retireDate = new Date(birthDate);
      retireDate.setFullYear(retireDate.getFullYear() + years);
      retireDate.setMonth(retireDate.getMonth() + months + 1);
      retireDate.setDate(1);
    } else if (option === 'option3' && projection?.simRetirementDate) {
      retireDate = new Date(projection.simRetirementDate);
    } else {
      retireDate = new Date(defaultDateStr);
    }

    let ageYears = 0;
    let ageMonths = 0;
    if (userData?.birthDate && retireDate) {
      const birth = new Date(userData.birthDate);
      const diffTime = Math.abs(retireDate - birth);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      ageYears = Math.floor(diffDays / 365.25);
      ageMonths = Math.floor((diffDays % 365.25) / 30.44);
    }

    return {
      date: retireDate,
      dateStr: !isNaN(retireDate.getTime()) ? retireDate.toLocaleDateString('de-CH') : '',
      ageYears,
      ageMonths,
      option
    };
  }, [scenarioData, userData, retirementAge, projection.simRetirementDate, location.state]);

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
        {/* Missing Data Warning Banner */}
        {missingPages.length > 0 && (
          <div className="mb-8 bg-amber-500/10 border border-amber-500/20 rounded-xl p-10 flex items-center gap-10 text-amber-500 animate-in fade-in slide-in-from-top-1">
            <AlertTriangle className="h-20 w-20 shrink-0" />
            <div className="text-2xl leading-relaxed">
              <span className="font-bold uppercase block mb-3 text-3xl">
                {language === 'fr' ? 'Données manquantes' : 'Missing Data'}
              </span>
              {t('result.missingDataWarning').replace('{pages}', missingPages.join(', '))}
            </div>
          </div>
        )}

        {/* TOP LAYOUT: Boxes 1, 4, 2, 3, 5 */}
        <div className="grid grid-cols-12 gap-6 mb-6">

          {/* Box 1: Verdict Image */}
          <div className="col-span-1">
            <Card className="overflow-hidden border-2 shadow-sm h-full flex flex-col min-h-[180px]">
              <div className={`h-2 w-full ${canQuitVerdict ? 'bg-green-500' : 'bg-red-500'}`} />
              <CardContent className="flex-1 p-0 flex items-center justify-center bg-muted/5">
                <img
                  src={canQuitVerdict ? '/yes_quit.png' : '/no_quit.png'}
                  alt="Verdict"
                  className="w-full h-full object-contain p-2 max-h-[170px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Box 4 (Title) and Boxes 2 & 3 (Balances) */}
          <div className="col-span-7 flex flex-col gap-4">
            {/* Box 4: Title */}
            <Card className="flex items-center justify-center p-3 h-[46px]">
              <span className="text-sm font-semibold text-white">
                {language === 'fr'
                  ? `Simulation à la date de retraite choisie le ${retirementInfo.dateStr} (${retirementInfo.ageYears} ans)`
                  : `Simulation at chosen retirement date ${retirementInfo.dateStr} (${retirementInfo.ageYears} years old)`}
              </span>
            </Card>

            <div className="grid grid-cols-2 gap-4 flex-1">
              {/* Box 2: Monte Carlo (Situation 1 only) */}
              {isInvested ? (
                <Card className="bg-blue-900/10 border-blue-500/20 flex flex-col items-center justify-center p-4">
                  <h4 className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-2 text-center">
                    {language === 'fr' ? 'Simulation Monte-carlo sur investissements' : 'Monte-carlo simulation on investments'}
                  </h4>
                  <p className="text-xl font-bold text-blue-400">
                    CHF {Math.round(final5Balance).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">
                    {language === 'fr' ? 'Solde final projeté (5%)' : 'Projected Final Balance (5%)'}
                  </p>
                  <button
                    onClick={() => navigate('/monte-carlo-help')}
                    className="text-[10px] text-blue-400 hover:text-blue-300 underline mt-2 transition-colors self-end"
                  >
                    {t('result.helpMonteCarloLink')}
                  </button>
                </Card>
              ) : (
                <div className="hidden" /> // Box 2 not displayed in Situation 2
              )}

              {/* Box 3: Baseline */}
              <Card className={`${isInvested ? '' : 'col-span-2'} bg-green-900/10 border-green-500/20 flex flex-col items-center justify-center p-4`}>
                <h4 className="text-xs uppercase tracking-wider text-green-400 font-bold mb-2 text-center">
                  {language === 'fr' ? 'Simulation avec cash seulement (sans investissement)' : 'Simulation with only cash (no investment)'}
                </h4>
                <p className="text-xl font-bold text-green-400">
                  CHF {Math.round(finalBaselineBalance).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  {language === 'fr' ? 'Solde final projeté' : 'Projected Final Balance'}
                </p>
              </Card>
            </div>
          </div>

          {/* Box 5: Slider (Compact) */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardHeader className="py-3">
                <CardTitle className="text-xs uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    {language === 'fr' ? 'Ajuster l\'âge de retraite' : 'Adjust Retirement Age'}
                  </span>
                  <span className="text-primary font-bold text-xl">
                    {retirementInfo.ageYears} {language === 'fr' ? 'ans' : 'years'} {retirementInfo.ageMonths > 0 && `${retirementInfo.ageMonths} ${language === 'fr' ? 'mois' : 'months'}`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center pt-10 pb-8">
                <div className="flex gap-4 items-center px-2">
                  <div className="h-10 w-10 bg-muted/10 border border-muted/20 rounded-lg flex items-center justify-center p-1 text-muted-foreground">
                    <LockKeyhole className="h-full w-full" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    {(() => {
                      const minAge = parseInt(scenarioData?.earlyRetirementAge || '58', 10);
                      const maxAge = 65;
                      const range = maxAge - minAge;
                      return (
                        <div className="relative pt-2 pb-6">
                          <Slider
                            value={[retirementAge || retirementInfo.ageYears + (retirementInfo.ageMonths / 12)]}
                            onValueChange={(value) => setRetirementAge(value[0])}
                            min={minAge}
                            max={maxAge}
                            step={1 / 12}
                            className="w-full"
                            thumbClassName="bg-primary border-primary"
                            disabled={scenarioData?.retirementOption !== 'option2'}
                          />
                          <div className="absolute w-full flex justify-between text-xl font-bold text-muted-foreground mt-4 px-1">
                            {Array.from({ length: range + 1 }, (_, i) => minAge + i).map(age => (
                              <div key={age} className="flex flex-col items-center">
                                <div className="h-2 w-px bg-muted-foreground/30 mb-1" />
                                <span>{age}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* MIDDLE SECTION: Box 8 (Graph) */}
        <div className="mb-6">
          <Card className="h-[600px]">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold">{language === 'fr' ? 'Projection Financière en CHF' : 'Financial Projection in CHF'}</CardTitle>
            </CardHeader>
            <CardContent className="h-[550px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 100, left: 0, bottom: 20 }} stackOffset="sign">
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
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis dataKey="year" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                  <YAxis
                    hide={false}
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => val === 0 ? "0" : `${(val / 1000).toFixed(0)}k`}
                  />
                  <ReferenceLine y={0} stroke="#FFFFFF" strokeWidth={1} opacity={0.3} />
                  {!generatingPdf && <Tooltip content={<CustomTooltip />} />}

                  {showBaseline && (
                    <Area
                      type="monotone"
                      dataKey="cumulativeBalance"
                      stroke={isInvested ? "#9ca3af" : (projection.finalBalance >= 0 ? "#10b981" : "#ef4444")}
                      strokeDasharray={isInvested ? "5 5" : "0"}
                      fill={isInvested ? "none" : (projection.finalBalance >= 0 ? "url(#colorBalance)" : "url(#colorNegative)")}
                      name={isInvested ? (language === 'fr' ? 'Référence (Cash)' : 'Baseline (Cash)') : (language === 'fr' ? 'Solde cumulé' : 'Cumulative Balance')}
                      strokeWidth={2}
                      dot={false}
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

                  {/* MC Lines */}
                  {show25thPercentile && isInvested && monteCarloProjections && (
                    <Line type="monotone" dataKey="mc25" stroke="#f59e0b" strokeWidth={2} dot={false} name={language === 'fr' ? 'Monte Carlo 25%' : '25% (Conservative)'}
                      label={(props) => {
                        const { x, y, value, index } = props;
                        if (chartData && index === chartData.length - 1) {
                          return <text x={x} y={y} dx={10} dy={4} fill={value >= 0 ? "#10b981" : "#ef4444"} fontSize={16} fontWeight="bold" textAnchor="start">{Math.round(value).toLocaleString()}</text>;
                        }
                        return null;
                      }}
                    />
                  )}
                  {show10thPercentile && isInvested && monteCarloProjections && (
                    <Line type="monotone" dataKey="mc10" stroke="#9333ea" strokeWidth={2} dot={false} name={language === 'fr' ? 'Monte Carlo 10% (Pessimiste)' : '10% (Pessimistic)'}
                      label={(props) => {
                        const { x, y, value, index } = props;
                        if (chartData && index === chartData.length - 1) {
                          return <text x={x} y={y} dx={10} dy={4} fill={value >= 0 ? "#10b981" : "#ef4444"} fontSize={16} fontWeight="bold" textAnchor="start">{Math.round(value).toLocaleString()}</text>;
                        }
                        return null;
                      }}
                    />
                  )}
                  {show5thPercentile && isInvested && monteCarloProjections && (
                    <Line type="monotone" dataKey="mc5" stroke="#60a5fa" strokeWidth={2} dot={false} name={language === 'fr' ? 'Monte Carlo 5% (Très Pessimiste)' : '5% (Very Pessimistic)'}
                      label={(props) => {
                        const { x, y, value, index } = props;
                        if (chartData && index === chartData.length - 1) {
                          return <text x={x} y={y} dx={10} dy={4} fill={value >= 0 ? "#10b981" : "#ef4444"} fontSize={16} fontWeight="bold" textAnchor="start">{Math.round(value).toLocaleString()}</text>;
                        }
                        return null;
                      }}
                    />
                  )}

                  <Bar dataKey="income" barSize={11} fill="#22c55e" name={language === 'fr' ? 'Revenus annuels' : 'Annual Income'} stackId="bars" />
                  <Bar dataKey="activatedOwnings" barSize={11} fill="#ec4899" name={language === 'fr' ? 'Avoirs activés' : 'Activated Ownings'} stackId="bars" />
                  <Bar dataKey="negCosts" barSize={11} fill="#ef4444" name={language === 'fr' ? 'Dépenses annuelles' : 'Annual Costs'} stackId="bars" />

                  <ReferenceLine
                    x={retirementInfo.date.getFullYear()}
                    stroke="#f59042"
                    strokeDasharray="3 3"
                    label={{
                      position: 'insideTopRight',
                      dy: 20,
                      value: `${language === 'fr' ? 'Retraite' : 'Retirement'}: ${retirementInfo.dateStr}`,
                      fill: '#f59042',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM SECTION: Boxes 6 & 7 */}
        <div className="grid grid-cols-12 gap-6 mb-12">

          {/* Box 6: Controls */}
          <div className={isInvested ? "col-span-4" : "col-span-12"}>
            <Card className="h-full">
              <CardHeader className="py-2">
                <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground"></CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bar Indicators (Static Legend) - Aligned to left */}
                <div className="space-y-2 mb-6 px-1">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    {language === 'fr' ? 'Légende des Flux' : 'Cash Flow Legend'}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                      <span>{language === 'fr' ? 'Revenus annuels' : 'Annual Income'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                      <span>{language === 'fr' ? 'Dépenses annuelles' : 'Annual Costs'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#ec4899]" />
                      <span>{language === 'fr' ? 'Avoirs non encore disponibles dans la projection' : 'Assets not yet made available in the projection'}</span>
                    </div>
                  </div>
                </div>

                {isInvested && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                      {language === 'fr' ? 'Contrôles de Projection' : 'Projection Controls'}
                    </h4>
                    {/* Line Toggles */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="show-baseline" checked={showBaseline} onCheckedChange={setShowBaseline} />
                        <Label htmlFor="show-baseline" className="text-xs cursor-pointer flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full border border-white/50" />
                          {language === 'fr' ? 'Référence (Cash sans rendement)' : 'Baseline (Cash no return)'}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="show-25th" checked={show25thPercentile} onCheckedChange={setShow25thPercentile} />
                        <Label htmlFor="show-25th" className="text-xs cursor-pointer flex items-center gap-2 text-amber-500">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          {language === 'fr' ? '25% (Conservateur)' : '25% (Conservative)'}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="show-10th" checked={show10thPercentile} onCheckedChange={setShow10thPercentile} />
                        <Label htmlFor="show-10th" className="text-xs cursor-pointer flex items-center gap-2 text-purple-600">
                          <div className="w-2 h-2 rounded-full bg-purple-600" />
                          {language === 'fr' ? '10% (Pessimiste)' : '10% (Pessimistic)'}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="show-5th" checked={show5thPercentile} onCheckedChange={setShow5thPercentile} />
                        <Label htmlFor="show-5th" className="text-xs cursor-pointer flex items-center gap-2 text-blue-400">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          {language === 'fr' ? '5% (Très Pessimiste)' : '5% (Very Pessimistic)'}
                        </Label>
                      </div>
                    </div>
                  </div>
                )}


                <div className={isInvested ? "pt-4 border-t border-muted/20" : ""}>
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">{language === 'fr' ? 'Avoirs non-activés' : 'Non-activated ownings'}</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="activate-ownings"
                        checked={activateAllOwnings}
                        onCheckedChange={(checked) => setActivateAllOwnings(!!checked)}
                      />
                      <Label htmlFor="activate-ownings" className="text-xs cursor-pointer font-medium text-pink-500 whitespace-nowrap">
                        {language === 'fr' ? 'Afficher tous les avoirs, y compris non assignés' : 'Show all assets incl. non made available'}
                      </Label>
                    </div>

                    {activateAllOwnings && (
                      <div className="animate-in fade-in slide-in-from-left-1 duration-200">
                        <Input
                          id="activation-date"
                          type="date"
                          value={owningsActivationDate}
                          onChange={(e) => setOwningsActivationDate(e.target.value)}
                          className="h-8 w-[160px] text-xs bg-background/50 border-pink-500/30 focus-visible:ring-pink-500 text-white py-0 px-3"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Box 7: Investment Summary */}
          {isInvested && (
            <div className="col-span-8">
              <Card className="h-full relative overflow-hidden">
                <CardHeader className="py-4">
                  <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {language === 'fr' ? 'Investissements utilisés dans la simulation' : 'Investments used in the simulation'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 pr-2">
                    {(() => {
                      const investedAssets = getInvestedBookAssets(assets, scenarioData);
                      const currentYearStr = new Date().toISOString().split('T')[0];
                      const deathDateStr = userData?.theoreticalDeathDate
                        ? userData.theoreticalDeathDate
                        : new Date(new Date().getFullYear() + 30, 11, 31).toISOString().split('T')[0];

                      const formatSwissDate = (dateStr) => {
                        if (!dateStr) return '';
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return dateStr;
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}.${month}.${year}`;
                      };

                      return investedAssets.map(asset => {
                        const productId = scenarioData.investmentSelections[asset.id];
                        const product = getProductById(productId);
                        const style = product ? getAssetClassStyle(product.assetClass) : { color: 'text-gray-400', bgColor: 'bg-gray-400/10' };

                        const startDate = asset.availabilityDate || currentYearStr;
                        const endDate = deathDateStr;

                        return (
                          <div key={asset.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/5 border border-muted/10">
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg ${style.bgColor} ${style.color}`}>
                                <LineChartIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold leading-tight">{product?.name || asset.name}</p>
                                <div className="flex gap-2 text-[9px] text-muted-foreground">
                                  <span className="font-mono">{product?.ticker}</span>
                                  <span className={style.color}>{product?.assetClass}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold">CHF {Math.round(asset.adjustedAmount || asset.amount).toLocaleString()}</p>
                              <p className="text-[11px] text-muted-foreground font-medium">
                                {formatSwissDate(startDate)} - {formatSwissDate(endDate)}
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
                <div className="absolute bottom-4 right-4">
                  <Button variant="link" size="sm" onClick={() => navigate('/capital-management')} className="text-primary text-xs flex items-center gap-2">
                    {language === 'fr' ? 'Accéder à la configuration du capital' : 'Go to Capital management setup'}
                    <ChevronUp className="h-4 w-4 rotate-90" />
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioResult;
