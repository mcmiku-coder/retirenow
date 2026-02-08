import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { getIncomeData, getCostData, getUserData, getScenarioData, getRetirementData, saveScenarioData, saveRetirementData, getRealEstateData } from '../utils/database';
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
import DetailedChart from '../components/DetailedChart';

// PDF Generation Imports
import {
  generateCoverPage,
  generateTableOfContents,
  generateSimulationSummary
} from '../utils/pdfPageGenerators';

import {
  generatePersonalInfo,
  generateIncomeAssets,
  generateCostDebts
} from '../utils/pdfPageGenerators2';

import {
  generateSimulationChoice,
  generateRetirementBenefits,
  generateDataReview
} from '../utils/pdfPageGenerators3';

import {
  generateLandscapeGraph,
  generateYearByYearBreakdown,
  generateFocusPage,
  generateLodgingAnnex,
  generateInvestmentInfo,
  generateLegalWarnings
} from '../utils/pdfPageGenerators4';


const ScenarioResult = () => {
  console.log('Rendering ScenarioResult Component - Force Refresh');
  const navigate = useNavigate();

  const location = useLocation();
  console.log('ScenarioResult Render Debug:', {
    hasState: !!location.state,
    stateKeys: location.state ? Object.keys(location.state) : [],
    focusYears: location.state?.focusYears
  });
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
  const [showTrendHighlight, setShowTrendHighlight] = useState(false);

  // Result State
  const [projection, setProjection] = useState({
    yearlyBreakdown: [],
    finalBalance: 0,
    canQuit: false,
    balanceBeforeTransmission: 0,
    transmissionAmount: 0
  });

  // MISSING DATA MODAL STATE
  const [missingDataDialog, setMissingDataDialog] = useState({
    isOpen: false,
    type: null, // 'pension' | 'capital'
    age: null
  });
  const [missingDataValue, setMissingDataValue] = useState('');

  // Activate All Ownings State
  const [activateAllOwnings, setActivateAllOwnings] = useState(false);
  const [owningsActivationDate, setOwningsActivationDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Graph Options for PDF (From DetailedGraph or Defaults)
  const [pdfGraphOptions, setPdfGraphOptions] = useState({
    showMC50: false,
    showMC25: false,
    showMC10: false,
    showMC5: true, // Default to true (User requirement: 5% + Baseline must appear)
    showActivatedOwnings: false
  });

  // Scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
    // Sync graph options from location state if available
    if (location.state?.graphOptions) {
      setPdfGraphOptions(location.state.graphOptions);
    }
  }, [location.state]);

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

        // SMART MERGE: Incomes
        // 1. Start with saved state (contains adjustments + retirement rows)
        let finalIncomes = location.state?.adjustedIncomes || sData?.adjustedIncomes || [];

        // 2. Sync with iData (Fresh DB Incomes)
        if (iData && iData.length > 0) {
          // A. Update existing or Add new
          iData.forEach(freshInc => {
            const idx = finalIncomes.findIndex(fi => (fi.id && freshInc.id && fi.id === freshInc.id) || (fi.name === freshInc.name));

            if (idx >= 0) {
              // Update existing
              const saved = finalIncomes[idx];
              const isDirty = parseFloat(saved.amount) !== parseFloat(saved.adjustedAmount);
              finalIncomes[idx] = {
                ...saved,
                ...freshInc, // Update name/freq/dates from fresh
                amount: freshInc.amount, // FORCE FRESH Original
                // If not dirty (not manually adjusted), auto-update adjusted value. Else preserve override.
                adjustedAmount: isDirty ? saved.adjustedAmount : freshInc.amount
              };
            } else {
              // Add new
              finalIncomes.push({
                ...freshInc,
                adjustedAmount: freshInc.amount,
                isActive: true
              });
            }
          });

          // B. Remove deleted? (Optional but good for sync)
          // If an item in finalIncomes looks like a "profile income" (has ID in iData format? or just check if it was supposed to be there)
          // Risky to delete without clear differentiation from "Retirement" items.
          // Retirement items usually have special IDs.
          // Let's rely on the fact that we push iData items.
          // If user Deleted "Salary" in DB, it won't be in iData.
          // It WILL be in finalIncomes (stale).
          // We should probably filter finalIncomes to remove items that match "Regular ID pattern" but are not in iData.
          // Simplify: Just ensuring FRESH items are updated is huge improvement. Deletion sync is secondary.
        } else if (!finalIncomes.length) {
          finalIncomes = iData || [];
        }

        // 3. Filter 0-values and ghosts
        finalIncomes = finalIncomes.filter(i =>
          (Math.abs(parseFloat(i.adjustedAmount || i.amount) || 0) > 0) &&
          !String(i.name || '').toLowerCase().includes('solde') &&
          !String(i.id || '').toLowerCase().includes('solde')
        );

        // SMART MERGE: Costs
        // Start with cData (Fresh) to ensure structure matches DB
        let finalCosts = cData || [];
        const savedCosts = location.state?.adjustedCosts || sData?.adjustedCosts || [];

        if (savedCosts.length > 0) {
          finalCosts = finalCosts.map(fresh => {
            const saved = savedCosts.find(s => s.id === fresh.id);
            if (saved) {
              const isDirty = parseFloat(saved.amount) !== parseFloat(saved.adjustedAmount);
              return {
                ...fresh,
                amount: fresh.amount,
                adjustedAmount: isDirty ? saved.adjustedAmount : fresh.amount
              };
            }
            return { ...fresh, adjustedAmount: fresh.amount };
          });
          // Note: We deliberately drop "Simulation Only" costs that are not in cData,
          // to enforce "DB is Truth" sync behavior requested by user.
        }

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

        // 2026-01-31: REMOVED GHOST FILTER on finalIncomes.
        // This was removing valid "LPP" and "Pension" items that users entered in DataReview.
        // We now rely on specific logic (like Option 3 rows) to filter themselves if needed,
        // but generally if it's in `finalIncomes` (which comes from `adjustedIncomes`), it should stay.

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

        // Initialize showTrendHighlight from scenarioData
        if (sData?.showTrendHighlight !== undefined) {
          setShowTrendHighlight(sData.showTrendHighlight);
        } else {
          // DEFAULT TO TRUE so users see the segments immediately
          setShowTrendHighlight(true);
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

  // INITIALIZATION FIX: Set retirementAge state from scenarioData on load
  useEffect(() => {
    if (retirementAge === null && scenarioData?.retirementOption === 'option2') {
      const explicitAge = parseInt(scenarioData.lppSimulationAge);
      if (!isNaN(explicitAge) && explicitAge > 0) {
        setRetirementAge(explicitAge);
      }
    }
  }, [scenarioData, retirementAge]);

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

    const simRetirementDateObj = (() => {
      // Robust Parser for "DD.MM.YYYY" (Swiss format) as seen in user data
      if (typeof simRetirementDate === 'string' && simRetirementDate.includes('.')) {
        const parts = simRetirementDate.split('.');
        // Presume DD.MM.YYYY
        if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
      }
      return new Date(simRetirementDate);
    })();
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
      const activatedOwingsBreakdown = {};
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

        if (row.isRetirement && !isSalary) {
          // Rule: Retirement-related incomes (Annuities, AVS) should be used exactly as provided (start/end)
          // DataReview already set their start date to either (RetirementDate) or (LegalAge)
        } else if (isSalary) {
          // STRICT RULE: Work-related income ("Salary") ALWAYS ends exactly at Retirement Date.
          // This allows both extending (working longer) and capping (retiring earlier)
          // ignoring the static "End Date" saved in the database from the original plan.
          // This applies to Option 2 (Slider) AND ANY OTHER OPTION where Salary is expected to stop at retirement.

          const y = simRetirementDateObj.getFullYear();
          const m = String(simRetirementDateObj.getMonth() + 1).padStart(2, '0');
          const d = String(simRetirementDateObj.getDate()).padStart(2, '0');
          effectiveEndDate = `${y}-${m}-${d}`;

          // CRITICAL FAIL-SAFE: If we are completely past the retirement year, 
          // and this is work income, force skip. This fixes the persistent salary bug.
          if (year > simRetirementDateObj.getFullYear()) {
            // For safety, let's verify it's not a tiny overlap year
            // If effectiveEndDate is fully in the past relative to THIS year's start (Jan 1), skip.
            // simRetirementDateObj is exact end date.
            // If year=2032, and retirement=2027. Skip.
            return;
          }
        } else {
          // Standard: Other Incomes (Rental, etc)
          // If no end date, or end date is AFTER retirement, DO NOT CAP (Passive income continues).
          // BUT: If user explicitly set an end date earlier, respect it.
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

      // CRITICIAL FIX: Option 2 (Slider) must explicitly add the "Projected LPP" if not already covered.
      if (effectiveScenarioData?.retirementOption === 'option2' || effectiveScenarioData?.retirementOption === 'option1') {
        // If we have projected values from the slider logic (simLppPension, simLppCapital)
        // We need to inject them as cash flows if they aren't already in effectiveIncomes.
        // BUT: synchroniseSimulationState ADDS them to adjustedIncomes.
        // So they *should* be in effectiveIncomes.
        // IF they are missing (filtered out?), we force add them here.

        if (simLppPension > 0) {
          const pStart = simRetirementDateObj;
          // Check if we already processed a "Projected LPP Pension" in the income loop above
          // The income loop uses "effectiveIncomes" which comes from "incomes" state.
          // If "Projected LPP Pension" was in DataReview, it is in "incomes".
          // But if it was filtered out by "ghost filter", we need to add it here.
          // To avoid double counting, let's check if we saw it in incomeBreakdown.
          const alreadyCounted = Object.keys(incomeBreakdown).some(k => k.toLowerCase().includes('lpp') && k.toLowerCase().includes('pension'));

          if (!alreadyCounted) {
            const val = calculateYearlyAmount(simLppPension, 'Yearly', pStart, null, year);
            if (val > 0) {
              yearIncome += val;
              incomeBreakdown['Projected LPP Pension (Sim)'] = val;
            }
          }
        }
      }
      // We must override the "LPP" entry in `retirementData.rows` with our dynamic `simLppPension`.

      let lppProcessed = false;

      if (effectiveRetirementData?.rows) {
        effectiveRetirementData.rows.forEach(row => {
          const id = row.id || row.name;
          if (!activeFilters[`pillar-${id}`]) return;

          let amount = parseFloat(row.amount) || 0;
          const nameLower = row.name.toLowerCase();

          // CRITICAL FIX: Kill Ghost Salaries in Retirement Data (they belong in Loop 1)
          if (nameLower.includes('salary') || nameLower.includes('salaire')) return;

          // CRITICAL FIX: Deduplicate LPP (If already added in Loop 1 or Injection Logic)
          if (nameLower.includes('lpp') && nameLower.includes('pension')) {
            const alreadyCounted = Object.keys(incomeBreakdown).some(k => k.toLowerCase().includes('lpp') && k.toLowerCase().includes('pension'));
            if (alreadyCounted) return;
          }

          const simDateStr = `${simRetirementDateObj.getFullYear()}-${String(simRetirementDateObj.getMonth() + 1).padStart(2, '0')}-${String(simRetirementDateObj.getDate()).padStart(2, '0')}`;
          let effectiveStartDate = row.startDate || simDateStr;
          let effectiveEndDate = row.endDate || `${deathYear}-12-31`;
          let frequency = row.frequency;

          // OVERRIDES for Option 3 & Dynamic Logic
          if (nameLower.includes('lpp') && !nameLower.includes('sup') && !nameLower.includes('capital')) { // Main LPP
            // Use our calculated dynamic variables
            amount = simLppPension;
            frequency = 'Yearly'; // Pension inputs are now Yearly
            const lppY = lppStartDate.getFullYear();
            const lppM = String(lppStartDate.getMonth() + 1).padStart(2, '0');
            const lppD = String(lppStartDate.getDate()).padStart(2, '0');
            effectiveStartDate = `${lppY}-${lppM}-${lppD}`;
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

      // Fallback Logic Removed (Lines 669-681) to prevent "LPP Pension" duplicates.
      // Injection Logic (lines 604+) handles this correctly.

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

        // CRITICAL FIX: Kill Ghost Salary/Pension items misclassified as Assets
        const nameLower = (asset.name || '').toLowerCase();
        if (nameLower.includes('salary') || (nameLower.includes('lpp') && nameLower.includes('pension'))) {
          // These belong in Incomes or Retirement loops, not here as assets (unless specifically invested LPP Capital?)
          // But "LPP Pension" is definitely not an investable asset.
          // And "Salary" is definitely not an asset.
          return;
        }

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
              // Separate breakdown for bar shapes
              activatedOwingsBreakdown[asset.name] = (activatedOwingsBreakdown[asset.name] || 0) + amount;
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
        activatedOwingsBreakdown,
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
      // FIX: Prioritize scenarioData (dynamic slider) over location.state (static initial)
      const targetDate = scenarioData?.wishedRetirementDate || location.state?.wishedRetirementDate || new Date().toISOString();
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
  // MODIFIED: We now use onValueCommit for "heavy" updates (State Sync).
  // This effect is kept for pure visual feedback if needed, but we disable the heavy recalculation here to avoid double-firing.
  useEffect(() => {
    // Disabled in favor of onValueCommit -> synchronizeSimulationState
    // If we want instant visual feedback, we can keep a lightweight recalc, but let's stick to the robust commited change.
  }, [retirementAge]);

  // NEW SLIDER SYNC LOGIC
  const synchronizeSimulationState = async (newAge, overrideScenarioData = null) => {
    // START: Fix Stale State
    const effectiveScenarioData = overrideScenarioData || scenarioData;
    if (!effectiveScenarioData || !userData) return;
    // END: Fix Stale State

    // 0. Ensure Types
    const numericAge = Number(newAge);

    // 1. Calculate Date
    const birthDate = new Date(userData.birthDate);
    const retirementDate = new Date(birthDate);
    const years = Math.floor(numericAge);
    const months = Math.round((numericAge - years) * 12);
    retirementDate.setFullYear(retirementDate.getFullYear() + years);
    retirementDate.setMonth(retirementDate.getMonth() + months + 1);
    retirementDate.setDate(1);
    const newRetirementDateStr = retirementDate.toISOString().split('T')[0];

    // 2. Check LPP Logic
    // Fix: strict numeric comparison
    const earliestPreRetirementAge = parseInt(effectiveScenarioData.questionnaire?.lppEarliestAge || 58);
    const isPreRetirement = numericAge >= earliestPreRetirementAge;

    // 3. Check for Missing Data (Blocking)
    if (isPreRetirement) {
      // Pension Path: Check lppByAge for this specific age floor
      const ageKey = Math.floor(numericAge).toString();
      const lppByAge = effectiveScenarioData.benefitsData?.lppByAge || {};
      const entry = lppByAge[ageKey];

      // If missing or zero pension
      if (!entry || (!entry.pension && !entry.capital)) {
        setMissingDataDialog({
          isOpen: true,
          type: 'pension',
          age: Math.floor(numericAge)
        });
        return; // STOP HERE
      }
    } else {
      // Capital Path: Check lppCurrentCapital
      const currentCapital = effectiveScenarioData.benefitsData?.lppCurrentCapital;
      // Check if missing or 0
      if (!currentCapital || parseFloat(currentCapital) <= 0) {
        setMissingDataDialog({
          isOpen: true,
          type: 'capital',
          age: numericAge
        });
        return; // STOP HERE
      }
    }

    // 4. Update Questionnaire State
    const updatedQuestionnaire = {
      ...effectiveScenarioData.questionnaire,
      simulationAge: numericAge,
      isWithinPreRetirement: isPreRetirement ? 'yes' : 'no'
    };

    setIsRecalculating(true);

    try {
      // 5. Update Scenario Data (Sync Salary End Dates + LPP Values)

      // Update Work Incomes End Date
      const updatedIncomes = incomes.map(item => {
        const nameLower = (item.name || '').toLowerCase();
        const isSalary = nameLower.includes('salary') || nameLower.includes('salaire') || nameLower.includes('lohn') || nameLower.includes('revenu') || nameLower.includes('income');

        if (isSalary && !item.isRetirement) {
          return {
            ...item,
            endDate: newRetirementDateStr,
            adjustedAmount: item.adjustedAmount
          };
        }

        // CRITICAL FIX: Update "Projected LPP Pension" Row
        // Identifying marks: ID includes 'lpp' and 'pension', or Name includes 'Projected LPP'
        const isLppPension = (item.id && String(item.id).toLowerCase().includes('lpp') && String(item.id).toLowerCase().includes('pension')) ||
          (item.name && String(item.name).toLowerCase().includes('lpp') && String(item.name).toLowerCase().includes('pension'));

        if (isLppPension) {
          // Recalculate pension for this age if we have data
          // We use the 'newPension' calculated below? 
          // WAIT: We calculate newPension AFTER this map loop in the original code. 
          // We need to move the pension lookup BEFORE this map loop or access it here.

          // Accessing effectiveScenarioData here is safe.
          let dynamicPension = 0;
          let dynamicAge = Math.floor(numericAge);

          if (numericAge >= (effectiveScenarioData.questionnaire?.lppEarliestAge || 58)) {
            const ageKey = dynamicAge.toString();
            const entry = effectiveScenarioData.benefitsData?.lppByAge?.[ageKey];
            dynamicPension = entry?.pension || 0;
          }

          if (dynamicPension > 0) {
            return {
              ...item,
              name: language === 'fr' ? `Rente LPP projetée à ${dynamicAge} ans` : `Projected LPP Pension at ${dynamicAge}y`,
              amount: dynamicPension,
              adjustedAmount: dynamicPension,
              startDate: newRetirementDateStr,
              // Ensure it is treated as a retirement income
              isRetirement: true
            };
          }
        }

        return item;
      });

      // Determine correct projected LPP values based on path
      let newPension = '';
      let newCapital = '';

      if (isPreRetirement) {
        const ageKey = Math.floor(numericAge).toString();
        const entry = effectiveScenarioData.benefitsData?.lppByAge?.[ageKey];
        newPension = entry?.pension || '';
        newCapital = entry?.capital || '';
      } else {
        newCapital = effectiveScenarioData.benefitsData?.lppCurrentCapital || '';
      }

      // Determine Retirement Option & Legal Age
      const gender = userData.gender || 'male';
      const legalAge = gender === 'female' ? 64 : 65;
      let newOption = effectiveScenarioData.retirementOption || 'option1';

      if (numericAge < legalAge) {
        newOption = 'option2';
      } else if (numericAge === legalAge) {
        if (newOption !== 'option1') newOption = 'option0';
      }

      console.log('DEBUG: Sync Logic', { numericAge, legalAge, newOption });

      const updatedScenarioData = {
        ...effectiveScenarioData,
        questionnaire: updatedQuestionnaire,
        projectedLPPPension: newPension,
        projectedLPPCapital: newCapital,
        wishedRetirementDate: newRetirementDateStr,
        retirementOption: newOption,
        // CRITICAL FIX: Ensure Early Retirement Age is synced to numericAge if Option 2
        earlyRetirementAge: newOption === 'option2' ? numericAge.toString() : (effectiveScenarioData.earlyRetirementAge || ''),
        adjustedIncomes: updatedIncomes
      };

      // 6. Save & Set Scenario Data (Intermediate Step)
      await saveScenarioData(user.email, masterKey, updatedScenarioData);

      // 7. CRITICAL: GLOBAL SYNC & REDIRECT (User Request)
      // We must update the core 'retirementData' so that the "Retirement Inputs" page reflects this change.
      // Then we redirect to DataReview to ensure a clean slate simulation (Option 0/Standard).

      const rData = (await getRetirementData(user.email, masterKey)) || {};

      // Ensure V2 structure exists
      if (!rData.questionnaire) rData.questionnaire = {};

      // Update Core Plan
      rData.questionnaire = {
        ...rData.questionnaire,
        simulationAge: newAge,
        isWithinPreRetirement: isPreRetirement ? 'yes' : 'no'
      };

      // Also ensure Benefits Data (LPP) is synced if provided via ScenarioData (e.g. from handleMissingDataSubmit)
      // Note: handleMissingDataSubmit updates effectiveScenarioData.benefitsData first.
      if (effectiveScenarioData.benefitsData) {
        rData.benefitsData = {
          ...(rData.benefitsData || {}),
          ...effectiveScenarioData.benefitsData
        };
      }

      await saveRetirementData(user.email, masterKey, rData);



      console.log('DEBUG: Dynamic Update - In-place refresh', { newAge });

      // Dynamic Update: Update local state to trigger re-render
      // CRITICAL: We must update the 'incomes' state because the chart relies on it for salary end-dates.
      setIncomes(updatedIncomes);
      setScenarioData(updatedScenarioData);
      setRetirementAge(newAge); // Ensure slider reflects it visually if driven by this state

      // Update other states if needed for consistency (though chart mainly depends on incomes/assets/costs)
      // setCosts(finalCosts??) - costs usually don't change endDate dynamically in this logic yet, but safe to keep existing.

      // Trigger a force refresh of the simulation calculation if needed
      // (The useEffect dependencies should handle this if 'incomes' or 'scenarioData' changes)

      // Visual feedback
      toast.success(language === 'fr' ? 'Simulation mise à jour' : 'Simulation updated');

      // NO REDIRECT - Keep user on page for dynamic experience

    } catch (error) {
      console.error('Error synchronizing simulation:', error);
      toast.error(language === 'fr' ? 'Erreur de mise à jour' : 'Update failed');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleMissingDataSubmit = async () => {
    // CAPTURE AGE EARLY to prevent state staleness issues
    const dialogAge = missingDataDialog.age;
    const val = parseFloat(missingDataValue);
    if (isNaN(val) || val < 0) return;

    const updatedBenefitsData = { ...scenarioData.benefitsData };

    if (missingDataDialog.type === 'pension') {
      const ageKey = missingDataDialog.age.toString();
      updatedBenefitsData.lppByAge = {
        ...updatedBenefitsData.lppByAge,
        [ageKey]: {
          ...updatedBenefitsData.lppByAge?.[ageKey],
          pension: val,
          // Heuristic: if capital missing, estimate or leave blank? User asked for pension.
          capital: updatedBenefitsData.lppByAge?.[ageKey]?.capital || ''
        }
      };
    } else {
      updatedBenefitsData.lppCurrentCapital = val;
    }

    const updatedScenarioData = {
      ...scenarioData,
      benefitsData: updatedBenefitsData,
      // CRITICAL FIX: Explicitly update top-level fields immediately to prevent stale data in DataReview
      ...(missingDataDialog.type === 'pension' ? { projectedLPPPension: val } : { projectedLPPCapital: val })
    };

    try {
      // Update Scenario Data First
      await saveScenarioData(user.email, masterKey, updatedScenarioData);
      setScenarioData(updatedScenarioData); // Update Local State immediately

      // SYNC TO GLOBAL RETIREMENT DATA (Persist the new LPP value)
      const rData = (await getRetirementData(user.email, masterKey)) || {};
      if (!rData.benefitsData) rData.benefitsData = {};

      // Merge LPP By Age
      if (missingDataDialog.type === 'pension') {
        const ageKey = missingDataDialog.age.toString();
        rData.benefitsData.lppByAge = {
          ...(rData.benefitsData.lppByAge || {}),
          [ageKey]: updatedBenefitsData.lppByAge[ageKey]
        };
      } else {
        rData.benefitsData.lppCurrentCapital = updatedBenefitsData.lppCurrentCapital;
      }

      await saveRetirementData(user.email, masterKey, rData);

      // Cleanup moved to end to prevent state staleness

      // Resume Sync (which will now Redirect)
      // PASS THE UPDATED SCENARIO DATA explicitly to avoid stale state check
      // CRITICAL FIX: Use the age from the dialog (which captured the slider value correctly) 
      // instead of potentially stale retirementAge state
      const resumeAge = missingDataDialog.age || retirementAge;

      console.log('DEBUG: handleMissingDataSubmit - Resuming Simulation', {
        dialogAge: missingDataDialog.age,
        stateAge: retirementAge,
        resumeAge: resumeAge,
        projectedLPPPension: updatedScenarioData.projectedLPPPension
      });

      // AUTOMATION FIX LOOP PREVENTION:
      if (location.state?.autoAutomateFullSequence) {
        console.log('DEBUG: Already in Automation Sequence - Resuming locally to prevent loop.');
        setMissingDataDialog({ isOpen: false, type: null, age: null });
        setMissingDataValue('');
        await synchronizeSimulationState(resumeAge, updatedScenarioData);
        toast.success(language === 'fr' ? 'Données mises à jour.' : 'Data updated.');
        return;
      }

      // AUTOMATION FIX: Redirect to Inputs -> Parameters -> DataReview -> Result
      toast.success(language === 'fr' ? 'Redirection pour recalcul...' : 'Redirecting for recalculation...');

      setMissingDataDialog({ isOpen: false, type: null, age: null });
      setMissingDataValue('');

      setTimeout(() => {
        navigate('/retirement-inputs', {
          state: {
            autoAutomateFullSequence: true,
            // Pass all critical data
            wishedRetirementDate: updatedScenarioData.wishedRetirementDate,
            retirementOption: updatedScenarioData.retirementOption,
            earlyRetirementAge: resumeAge
          }
        });
      }, 500);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save data');
    }
  };

  // Keep old function for reference or delete? 
  // We can leave it but it is unused now.
  const recalculateProjections = async (age) => { };

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
            owningsActivationDate: owningsActivationDate,
            showTrendHighlight: showTrendHighlight
          });
        } catch (err) {
          console.error("Failed to save settings", err);
        }
      };
      const timeoutId = setTimeout(saveData, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [activeFilters, activateAllOwnings, owningsActivationDate, showTrendHighlight, loading, user, masterKey, scenarioData]);

  // PDF Focus Years State
  // PDF Focus Years State
  const [pdfFocusYears, setPdfFocusYears] = useState(() => {
    // Try to load from localStorage first for persistence across sessions
    const saved = localStorage.getItem('retirenow_focusYears');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved focus years:", e);
      }
    }
    return [];
  });

  useEffect(() => {
    if (location.state?.focusYears && Array.isArray(location.state.focusYears) && location.state.focusYears.length > 0) {
      setPdfFocusYears(location.state.focusYears);
    }
  }, [location.state]);

  // Generate PDF Report
  const generatePDF = async () => {
    try {
      setGeneratingPdf(true);

      const pdf = new jsPDF('p', 'mm', 'a4');

      // Page tracking object
      const pageNumbers = {};
      let currentPage = 1;

      // ===== PAGE 1: COVER PAGE =====
      await generateCoverPage(pdf, language);
      currentPage++;

      // ===== PAGE 2: TABLE OF CONTENTS (blank for now, will populate at end) =====
      pdf.addPage(); // Add blank page 2
      currentPage++;

      // ===== PAGE 3: SIMULATION SUMMARY =====
      pageNumbers.summary = currentPage;
      const yearlyData = projection?.yearlyBreakdown || [];
      const finalBalance = yearlyData.length > 0
        ? yearlyData[yearlyData.length - 1].cumulativeBalance
        : projection?.finalBalance || 0;

      const summaryData = {
        finalBalance,
        retirementAge: scenarioData?.retirementAge || 65,
        yearsInRetirement: yearlyData.length || 0,
        deathDate: userData?.theoreticalDeathDate,
        peakWealth: Math.max(...(yearlyData.map(p => p.cumulativeBalance) || [0])),
        totalPages: 14, // Will be updated
        isInvested: isInvested,
        final5Balance: final5Balance,
        finalBaselineBalance: finalBaselineBalance
      };

      await generateSimulationSummary(pdf, summaryData, language, currentPage);
      currentPage++;

      // ===== PAGE 4: PERSONAL INFO =====
      pageNumbers.personal = currentPage;
      generatePersonalInfo(pdf, userData, scenarioData, language, currentPage, summaryData.totalPages);
      currentPage++;

      // ===== PAGE 5: INCOME & ASSETS =====
      pageNumbers.incomeAssets = currentPage;
      generateIncomeAssets(pdf, incomes, assets, language, currentPage, summaryData.totalPages);
      currentPage++;

      // ===== PAGE 6: COSTS & DEBTS =====
      pageNumbers.costDebts = currentPage;
      generateCostDebts(pdf, costs, debts, language, currentPage, summaryData.totalPages);
      currentPage++;

      // ===== PAGE 7: SIMULATION CHOICE =====
      pageNumbers.simChoice = currentPage;
      generateSimulationChoice(pdf, scenarioData, userData, language, currentPage, summaryData.totalPages);
      currentPage++;

      // ===== PAGE 8: RETIREMENT BENEFITS =====
      pageNumbers.benefits = currentPage;
      generateRetirementBenefits(pdf, scenarioData, language, currentPage, summaryData.totalPages);
      currentPage++;

      // ===== PAGE 9: DATA REVIEW =====
      pageNumbers.dataReview = currentPage;
      const allData = {
        income: incomes.filter(i => activeFilters[`income-${i.id || i.name}`]),
        assets: assets.filter(a => activeFilters[`asset-${a.id || a.name}`]),
        costs: costs.filter(c => activeFilters[`cost-${c.id || c.name}`]),
        debts: debts.filter(d => activeFilters[`debt-${d.id || d.name}`])
      };
      generateDataReview(pdf, allData, language, currentPage, summaryData.totalPages);
      currentPage++;

      // ===== PAGE 10: LANDSCAPE GRAPH =====
      pageNumbers.graph = currentPage;

      // Use the hidden detailed graph for specific high-res capture
      const graphElement = document.querySelector('#pdf-detailed-graph .recharts-wrapper') || document.querySelector('#pdf-detailed-graph');

      // Fallback to minimal wait to ensure render
      await new Promise(resolve => setTimeout(resolve, 500));

      await generateLandscapeGraph(pdf, graphElement, summaryData, language, currentPage, summaryData.totalPages);
      currentPage++;

      // ===== PAGE 10.5 (OPTIONAL): FOCUS YEARS DETAILS =====
      if (pdfFocusYears && pdfFocusYears.some(f => f.active && f.year)) {
        pageNumbers.focus = currentPage;
        generateFocusPage(pdf, pdfFocusYears, yearlyData, language, currentPage, summaryData.totalPages);
        currentPage++;
      }

      // ===== PAGE 11: YEAR-BY-YEAR BREAKDOWN =====
      pageNumbers.breakdown = currentPage;
      generateYearByYearBreakdown(pdf, yearlyData, language, currentPage, summaryData.totalPages);
      currentPage++;

      // ===== PAGE 12: LODGING ANNEX =====
      pageNumbers.lodging = currentPage;
      generateLodgingAnnex(pdf, realEstateData, language, currentPage, summaryData.totalPages);

      // Lodging annex may add multiple pages for owners with multiple properties
      const propertiesCount = realEstateData?.lodgingSituation === 'owner'
        ? (realEstateData?.properties?.length || 1)
        : 1;
      currentPage += propertiesCount;

      // ===== PAGE 13: INVESTMENT INFO (CONDITIONAL) =====
      // Get investment data from assets or a separate state if available
      const investmentAssets = assets.filter(a => a.category === 'investment' || a.strategy);
      if (investmentAssets && investmentAssets.length > 0) {
        pageNumbers.investments = currentPage;
        generateInvestmentInfo(pdf, investmentAssets, language, currentPage, summaryData.totalPages);
        currentPage++;
      }

      // ===== PAGE 14: LEGAL WARNINGS =====
      pageNumbers.warnings = currentPage;
      generateLegalWarnings(pdf, language, currentPage, summaryData.totalPages);
      currentPage++;

      // Update total pages
      pageNumbers.total = currentPage - 1;
      summaryData.totalPages = pageNumbers.total;

      // ===== GENERATE TABLE OF CONTENTS =====
      // We need to draw TOC on page 2, but setPage() doesn't reorder pages in the output
      // Solution: Draw TOC on page 2, then manually reorder the internal pages array

      console.log('Total pages before TOC:', pdf.internal.getNumberOfPages());

      // Navigate to page 2 (the blank page we created earlier)
      pdf.setPage(2);

      // Draw TOC content on page 2
      generateTableOfContents(pdf, pageNumbers, language);

      console.log('Total pages after TOC:', pdf.internal.getNumberOfPages());
      console.log('TOC drawn on page 2');

      // The TOC is now on page 2, but we need to ensure page 2 is in portrait mode
      // Check if any landscape pages affected page 2's orientation
      const pages = pdf.internal.pages;
      console.log('Pages array length:', pages.length);

      // Verify page 2 exists and is properly formatted
      if (pages[2]) {
        console.log('Page 2 exists in pages array');
      }

      // Save PDF
      pdf.save(`retirement-simulation-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(language === 'fr' ? 'Rapport PDF généré avec succès' : 'PDF report generated successfully');

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

  // Helper to get trend color for bar segments
  const getTrendColor = (origFill, trend, type) => {
    if (!showTrendHighlight || !trend || trend === 'stable') return origFill;

    if (type === 'income') {
      return trend === 'up' ? '#166534' : '#bbf7d0'; // Emerald 800 (Darker) vs Emerald 200 (Lighter)
    } else if (type === 'negCosts') {
      // For negative costs: up (-8k > -10k) = Decrease -> Light Red. down (-12k < -10k) = Increase -> Dark Red.
      return trend === 'up' ? '#fee2e2' : '#991b1b';
    } else if (type === 'activatedOwnings') {
      return trend === 'up' ? '#9d174d' : '#fbcfe8'; // Pink 800 vs Pink 200
    }
    return origFill;
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

    return projection.yearlyBreakdown.map((row, index) => {
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

      // Trend & Color Logic
      const prevRow = index > 0 ? projection.yearlyBreakdown[index - 1] : null;
      const getColors = (current, previous, type, baseFill) => {
        const colors = {};
        Object.keys(current).forEach(key => {
          if (!showTrendHighlight || !previous) {
            colors[key] = baseFill;
            return;
          }
          const curVal = Math.round(current[key] || 0);
          const prevVal = Math.round(previous[key] || 0);

          if (curVal > prevVal) {
            if (type === 'income') colors[key] = '#15803d'; // Dark Green
            else if (type === 'negCosts') colors[key] = '#dc2626'; // Dark Red (Increase)
            else if (type === 'activatedOwnings') colors[key] = '#be185d'; // Dark Pink
          } else if (curVal < prevVal) {
            if (type === 'income') colors[key] = '#dcfce7'; // Light Green
            else if (type === 'negCosts') colors[key] = '#fee2e2'; // Light Red (Decrease)
            else if (type === 'activatedOwnings') colors[key] = '#fce7f3'; // Light Pink
          } else {
            colors[key] = baseFill;
          }
        });
        return colors;
      };

      return {
        ...row,
        incomeColors: getColors(row.incomeBreakdown || {}, prevRow?.incomeBreakdown || {}, 'income', '#22c55e'),
        activatedOwingsColors: getColors(row.activatedOwingsBreakdown || {}, prevRow?.activatedOwingsBreakdown || {}, 'activatedOwnings', '#ec4899'),
        costColors: getColors(row.costBreakdown || {}, prevRow?.costBreakdown || {}, 'negCosts', '#ef4444'),
        mc50: calcWealth(monteCarloProjections.p50),
        mc25: calcWealth(monteCarloProjections.p25),
        mc10: calcWealth(monteCarloProjections.p10),
        mc5: calcWealth(monteCarloProjections.p5)
      };
    });
  }, [projection, monteCarloProjections, assets, showTrendHighlight]);

  const isInvested = useMemo(() => hasInvestedBook(scenarioData, assets), [scenarioData, assets]);
  const finalChartRow = chartData && chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const finalBaselineBalance = projection.finalBalance;
  const final5Balance = (isInvested && finalChartRow) ? finalChartRow.mc5 : null;

  // Calculate the offset for the zero line in the gradient
  const getGradientOffset = (dataKeys) => {
    if (!chartData || chartData.length === 0) return 0.5;

    const series = chartData.map(i => dataKeys.map(k => i[k] || 0)).flat();

    const dataMax = Math.max(...series);
    const dataMin = Math.min(...series);

    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;

    return dataMax / (dataMax - dataMin);
  };

  const mc5Off = getGradientOffset(['mc5']);
  const baselineOff = getGradientOffset(['cumulativeBalance']);

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

    // Use explicit retirementAge if available (Option 2 slider) to ensure precision and avoid round-trip drift
    if (option === 'option2' && retirementAge) {
      ageYears = Math.floor(retirementAge);
      ageMonths = Math.round((retirementAge - ageYears) * 12);
    }
    else if (userData?.birthDate && retireDate) {
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

  // Custom Bar Shape for conditional coloring
  const CustomBarShape = (props) => {
    const { x, y, width, height, payload, dataKey } = props;

    // Safety check - if no payload or tiny height, return null to avoid render issues
    const absHeight = Math.abs(height);
    if (!payload || !absHeight || absHeight < 1) return null;

    const baseFill = props.fill;
    let breakdown = [];
    let colorMap = null;

    // 1. Identify Data Source based on Key
    if (dataKey === 'income') {
      breakdown = Object.entries(payload.incomeBreakdown || {}).filter(([name]) => !name.includes('(Activated)'));
      colorMap = payload.incomeColors;
    } else if (dataKey === 'activatedOwnings') {
      breakdown = Object.entries(payload.activatedOwingsBreakdown || {});
      colorMap = payload.activatedOwingsColors;
    } else if (dataKey === 'negCosts') {
      breakdown = Object.entries(payload.costBreakdown || {});
      colorMap = payload.costColors;
    }

    // 2. Normalize Coordinate System
    // In Recharts Bar:
    // - Positive Value: y is the TOP. height is POSITIVE (downwards).
    // - Negative Value: y is the TOP (near 0 axis). height is NEGATIVE (upwards??). 
    //   WAIT. Recharts usually standardizes to:
    //   x,y is top-left corner of the RECT. height is always positive in the shape props if simplified?
    //   NO. Recharts often passes negative height for negative values.
    //   Let's standardise: 
    //   If height < 0: The rect starts at y+height (visually top) and has height abs(height).
    //   If height > 0: The rect starts at y and has height abs(height).

    const rectY = height < 0 ? y + height : y;

    // 3. Filter Active Items (ignore 0s)
    const activeItems = breakdown.filter(([_, v]) => Math.abs(parseFloat(v) || 0) > 0);

    // If no breakdown, render solid block
    if (activeItems.length === 0) {
      return <rect x={x} y={rectY} width={width} height={absHeight} fill={baseFill} />;
    }

    // 4. Calculate Total for Proportions
    const totalValue = activeItems.reduce((sum, [_, v]) => sum + Math.abs(parseFloat(v) || 0), 0);

    // Safety for divide by zero
    if (totalValue === 0) {
      return <rect x={x} y={rectY} width={width} height={absHeight} fill={baseFill} />;
    }

    // 5. Render Segments (Stacked Top-Down)
    // Sort logic: Largest items first? Or consistent order? Descending size is usually visually best.
    const sortedItems = [...activeItems].sort((a, b) => Math.abs(parseFloat(b[1] || 0)) - Math.abs(parseFloat(a[1] || 0)));

    const elements = [];
    let accumulatedHeight = 0;

    sortedItems.forEach(([name, value], index) => {
      const valAbs = Math.abs(parseFloat(value) || 0);
      const segmentHeight = (valAbs / totalValue) * absHeight;

      // Skip microscopic segments to prevent rendering artifacts
      if (segmentHeight < 0.5) return;

      // Determine Color
      const segmentFill = (colorMap && colorMap[name]) ? colorMap[name] : baseFill;

      elements.push(
        <rect
          key={`rect-${dataKey}-${index}`}
          x={x}
          y={rectY + accumulatedHeight}
          width={width}
          height={segmentHeight}
          fill={segmentFill}
        />
      );

      // Add Separator Line (if not last)
      if (index < sortedItems.length - 1) {
        elements.push(
          <line
            key={`line-${dataKey}-${index}`}
            x1={x}
            y1={rectY + accumulatedHeight + segmentHeight}
            x2={x + width}
            y2={rectY + accumulatedHeight + segmentHeight} // Draw at bottom of this segment
            stroke="#ffffff"
            strokeWidth={1}
            opacity={0.8}
          />
        );
      }

      accumulatedHeight += segmentHeight;
    });

    return <g>{elements}</g>;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex-grow flex flex-col pt-6 pb-8 bg-background text-foreground" data-testid="scenario-result-page" >
      <div className="w-full max-w-[95%] mx-auto mb-6 px-4">
      </div>

      <PageHeader
        containerClassName="max-w-[80%]"
        title={language === 'fr' ? 'Résultats de la simulation' : 'Simulation results'}
        rightContent={
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/detailed-graph', { state: { yearlyData: chartData, summaryData: { finalBalance: finalBaselineBalance, peakWealth: Math.max(...chartData.map(d => d.cumulativeBalance || 0)), yearsInRetirement: chartData.filter(d => d.year >= retirementInfo.date.getFullYear()).length }, retirementDate: retirementInfo.date, focusYears: pdfFocusYears } })}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <LineChartIcon className="h-4 w-4" />
              {language === 'fr' ? 'Graphique détaillé' : 'Detailed graph'}
            </Button>
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
              <div className={`h-2 w-full ${canQuitVerdict ? 'bg-green-500' : 'bg-primary'}`} />
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
              <span className="text-[17px] font-semibold text-white">
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
                  <p className={`text-xl font-bold ${final5Balance >= 0 ? 'text-green-400' : 'text-primary'}`}>
                    CHF {Math.round(final5Balance).toLocaleString('de-CH')}
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
              <Card className={`${isInvested ? '' : 'col-span-2'} flex flex-col items-center justify-center p-4`}>
                <h4 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2 text-center">
                  {language === 'fr' ? 'Simulation avec cash seulement (sans investissement)' : 'Simulation with only cash (no investment)'}
                </h4>
                <p className={`text-xl font-bold ${finalBaselineBalance >= 0 ? 'text-green-400' : 'text-primary'}`}>
                  CHF {Math.round(finalBaselineBalance).toLocaleString('de-CH')}
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
                    {retirementInfo.ageYears} {language === 'fr' ? 'ans' : 'years'} {retirementInfo.ageMonths > 0 && `${retirementInfo.ageMonths} ${language === 'fr' ? 'mois' : (retirementInfo.ageMonths > 1 ? 'months' : 'month')}`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center pt-10 pb-8">
                <div className="flex gap-4 items-center px-2">

                  <div className="flex-1">
                    {(() => {
                      // Calculate real current age for slider lower bound
                      const birthObj = new Date(userData?.birthDate || new Date());
                      const nowObj = new Date();
                      const diffMs = nowObj - birthObj;
                      const realCurrentAge = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));

                      const minAge = Math.min(64, realCurrentAge + 1);
                      const maxAge = 65;
                      const range = maxAge - minAge;

                      const calculatedCurrentAge = retirementInfo.ageYears + (retirementInfo.ageMonths / 12);
                      const effectiveCurrentAge = retirementAge || calculatedCurrentAge;
                      // FORCE CONSTRAINT: Value cannot be less than minAge
                      const safeValue = Math.max(minAge, effectiveCurrentAge);

                      console.log('Slider Debug:', {
                        minAge,
                        retirementAgeState: retirementAge,
                        calculatedCurrentAge,
                        safeValue
                      });

                      return (
                        <div className="relative pt-2 pb-6 w-full">
                          <Slider
                            value={[safeValue]}
                            onValueChange={(value) => {
                              const newVal = Math.max(minAge, value[0]);
                              setRetirementAge(newVal); // Visual update only
                            }}
                            onValueCommit={(value) => {
                              const newVal = Math.max(minAge, value[0]);
                              synchronizeSimulationState(newVal); // Heavy Update
                            }}
                            min={minAge}
                            max={maxAge}
                            step={1}
                            className="w-full relative z-20"
                            thumbClassName="bg-primary border-primary cursor-grab active:cursor-grabbing"
                            disabled={scenarioData?.retirementOption !== 'option2' && scenarioData?.retirementOption !== 'option0'}
                          />

                          {/* Labels Container - Full width to match slider context exactly */}
                          <div className="absolute top-2 left-0 w-full h-6 z-10 pointer-events-none">
                            {Array.from({ length: range + 1 }, (_, i) => minAge + i).map(age => {
                              const percent = ((age - minAge) / range) * 100;
                              // Check if this age roughly matches current value (within 0.5 range)
                              const currentValue = retirementAge || (retirementInfo.ageYears + retirementInfo.ageMonths / 12);
                              const isSelected = Math.abs(currentValue - age) < 0.5;

                              return (
                                <div
                                  key={age}
                                  className="absolute top-0 flex flex-col items-center transform -translate-x-1/2 transition-all duration-300"
                                  style={{ left: `${percent}%` }}
                                >
                                  {/* Tick mark - aligned with center of thumb */}
                                  <div className={`w-0.5 mt-1.5 transition-all duration-300 ${isSelected ? 'bg-primary h-2.5' : 'bg-muted-foreground/30 h-1.5'}`} />

                                  {/* Label number */}
                                  <span className={`text-sm mt-1 select-none transition-colors duration-300 ${isSelected ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                    {age}
                                  </span>
                                </div>
                              );
                            })}
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
                    <linearGradient id="splitColorBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={baselineOff} stopColor="#10b981" stopOpacity={1} />
                      <stop offset={baselineOff} stopColor="#ef4444" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="splitColorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={baselineOff} stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset={baselineOff} stopColor="#ef4444" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="splitColorMC5" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={mc5Off} stopColor="#10b981" stopOpacity={1} />
                      <stop offset={mc5Off} stopColor="#ef4444" stopOpacity={1} />
                    </linearGradient>
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
                  <ReferenceLine y={0} stroke="#FFFFFF" strokeWidth={2} />
                  {!generatingPdf && <Tooltip content={<CustomTooltip />} />}

                  {showBaseline && (
                    <Area
                      type="monotone"
                      dataKey="cumulativeBalance"
                      stroke={isInvested ? "#9ca3af" : "url(#splitColorBaseline)"}
                      strokeDasharray={isInvested ? "5 5" : "0"}
                      fill={isInvested ? "none" : "url(#splitColorArea)"}
                      name={isInvested ? (language === 'fr' ? 'Référence (Cash)' : 'Baseline (Cash)') : (language === 'fr' ? 'Solde cumulé' : 'Cumulative Balance')}
                      strokeWidth={2}
                      dot={false}
                      label={(props) => {
                        const { x, y, value, index } = props;
                        if (chartData && index === chartData.length - 1) {
                          return (
                            <text x={x} y={y} dx={10} dy={4} fill={isInvested ? "#9ca3af" : (value >= 0 ? "#10b981" : "#ef4444")} fontSize={16} fontWeight="bold" textAnchor="start">
                              {Math.round(value).toLocaleString('de-CH')}
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
                          return <text x={x} y={y} dx={10} dy={4} fill="#f59e0b" fontSize={16} fontWeight="bold" textAnchor="start">{Math.round(value).toLocaleString('de-CH')}</text>;
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
                          return <text x={x} y={y} dx={10} dy={4} fill="#9333ea" fontSize={16} fontWeight="bold" textAnchor="start">{Math.round(value).toLocaleString('de-CH')}</text>;
                        }
                        return null;
                      }}
                    />
                  )}
                  {show5thPercentile && isInvested && monteCarloProjections && (
                    <Line type="monotone" dataKey="mc5" stroke="url(#splitColorMC5)" strokeWidth={2} dot={false} name={language === 'fr' ? 'Monte Carlo 5% (Très Pessimiste)' : '5% (Very Pessimistic)'}
                      label={(props) => {
                        const { x, y, value, index } = props;
                        if (chartData && index === chartData.length - 1) {
                          return <text x={x} y={y} dx={10} dy={4} fill={value >= 0 ? "#10b981" : "#ef4444"} fontSize={16} fontWeight="bold" textAnchor="start">{Math.round(value).toLocaleString('de-CH')}</text>;
                        }
                        return null;
                      }}
                    />
                  )}

                  <Bar dataKey="income" barSize={11} fill="#22c55e" name={language === 'fr' ? 'Revenus annuels' : 'Annual Income'} stackId="bars" shape={<CustomBarShape />} />
                  <Bar dataKey="activatedOwnings" barSize={11} fill="#ec4899" name={language === 'fr' ? 'Avoirs activés' : 'Activated Ownings'} stackId="bars" shape={<CustomBarShape />} />
                  <Bar dataKey="negCosts" barSize={11} fill="#ef4444" name={language === 'fr' ? 'Dépenses annuelles' : 'Annual Costs'} stackId="bars" shape={<CustomBarShape />} />

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

                  <div className="flex items-center space-x-2 pt-4 mt-4 border-t border-muted/20">
                    <Checkbox
                      id="show-trends"
                      checked={showTrendHighlight}
                      onCheckedChange={(checked) => setShowTrendHighlight(!!checked)}
                    />
                    <Label htmlFor="show-trends" className="text-xs cursor-pointer flex flex-col gap-0.5">
                      <span className="font-semibold text-white">
                        {language === 'fr' ? 'Mettre en évidence les tendances (an-sur-an)' : 'Highlight year-over-year trends'}
                      </span>
                      <span className="text-[10px] text-muted-foreground italic">
                        {language === 'fr'
                          ? 'Colore les segments selon leur augmentation ou diminution par rapport à l\'année précédente.'
                          : 'Colors segments based on their increase or decrease compared to the previous year.'}
                      </span>
                    </Label>
                  </div>

                  {showTrendHighlight && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground bg-black/20 px-2 py-0.5 rounded border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-sm bg-[#15803d]" />
                        <span>{language === 'fr' ? 'Revenu ↑' : 'Inc. ↑'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground bg-black/20 px-2 py-0.5 rounded border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-sm bg-[#dcfce7]" />
                        <span>{language === 'fr' ? 'Revenu ↓' : 'Inc. ↓'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground bg-black/20 px-2 py-0.5 rounded border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-sm bg-[#dc2626]" />
                        <span>{language === 'fr' ? 'Dépense ↑' : 'Cost ↑'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground bg-black/20 px-2 py-0.5 rounded border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-sm bg-[#fee2e2]" />
                        <span>{language === 'fr' ? 'Dépense ↓' : 'Cost ↓'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {isInvested && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                      {language === 'fr' ? 'Contrôles de Projection' : 'Projection Controls'}
                    </h4>
                    {/* Line Toggles */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="show-5th" checked={true} disabled />
                        <Label htmlFor="show-5th" className="text-xs flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          <span className="text-blue-400 font-medium">Monte-Carlo Simulation (5% Very Pessimistic)</span>
                          <span className="text-white"> - Dynamic color line </span>
                          <span className="text-green-500 font-bold">Green</span>
                          <span className="text-white"> - </span>
                          <span className="text-primary font-bold">Red</span>
                        </Label>
                      </div>
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
                      const d = new Date();
                      const currentYearStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                      let deathDateStr;
                      if (userData?.theoreticalDeathDate) {
                        deathDateStr = userData.theoreticalDeathDate;
                      } else {
                        const dd = new Date(new Date().getFullYear() + 30, 11, 31);
                        deathDateStr = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
                      }

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
      <Dialog open={missingDataDialog.isOpen} onOpenChange={(open) => !open && setMissingDataDialog(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'fr' ? 'Données Manquantes' : 'Missing Data'}</DialogTitle>
            <DialogDescription>
              {missingDataDialog.type === 'pension'
                ? (language === 'fr' ? `Pour simuler une retraite à ${missingDataDialog.age} ans, nous avons besoin de votre rente LPP projetée.` : `To simulate retirement at ${missingDataDialog.age}, we need your Projected LPP Pension.`)
                : (language === 'fr' ? `Pour une retraite anticipée, nous avons besoin de votre capital LPP actuel.` : `To simulate early retirement, we need your LPP Current Capital.`)
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="missing-data-amount">{language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}</Label>
            <Input
              id="missing-data-amount"
              type="number"
              value={missingDataValue}
              onChange={(e) => setMissingDataValue(e.target.value)}
              placeholder="ex: 50000"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMissingDataDialog({ isOpen: false, type: null, age: null })}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={handleMissingDataSubmit}>
              {language === 'fr' ? 'Sauvegarder et Continuer' : 'Save & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Detailed Graph for PDF Capture */}
      <div id="pdf-detailed-graph" style={{ position: 'absolute', left: '-9999px', top: 0, width: '1600px', height: '800px', visibility: 'visible', zIndex: -1 }}>
        {projection?.yearlyBreakdown && (
          <DetailedChart
            chartData={chartData.map(year => ({
              ...year,
              negCosts: -(Math.abs(year.costs || 0))
            }))}
            retirementDate={scenarioData?.wishedRetirementDate}
            language={language}
            isPdf={true}
            focusYears={pdfFocusYears}
            showMC50={pdfGraphOptions.showMC50}
            showMC25={pdfGraphOptions.showMC25}
            showMC10={pdfGraphOptions.showMC10}
            showMC5={pdfGraphOptions.showMC5}
            showActivatedOwnings={pdfGraphOptions.showActivatedOwnings}
          />
        )}
      </div>
    </div >
  );
};

export default ScenarioResult;
