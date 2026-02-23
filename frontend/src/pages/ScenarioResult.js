import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { calculateYearlyAmount, calculateMonthlyAmount, parseToUtc, getLegalRetirementDate } from '../utils/calculations';
import { toast } from 'sonner';
import { hasInvestedBook, getInvestedBookAssets, runInvestedBookSimulation, calculateRecomposedBaselineAtIndex, calculateRecomposedTotalAtIndex, calculateInvestedProjection, calculateMonthlyDeterministicSeries } from '../utils/projectionCalculator';
import { toUtcMonthStart, getSimulationStartDate, getYearEndMonthIndex, monthIndexToYearMonth, dateToMonthIndex } from '../utils/simulationDateUtils';

import { getProductById, getAssetClassStyle } from '../data/investmentProducts';
import { Slider } from '../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, Bar, ReferenceLine } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ChevronDown, ChevronUp, RefreshCw, SlidersHorizontal, LineChart as LineChartIcon, FileText, Lock, LockKeyhole, AlertTriangle, Activity, User } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DetailedChart from '../components/DetailedChart';
import DetailedTooltipContent from '../components/DetailedTooltipContent';

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

import {
  generateConservativeOutcomes
} from '../utils/pdfMonteCarloGenerators';


const ScenarioResult = () => {
  // [HOTFIX V2] FORCE REFRESH TO CLEAR CACHE
  console.log('Rendering ScenarioResult Component - Hotfix V2 Active');
  const lastRunKeyRef = useRef(null);
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
  const isCouple = userData?.analysisType === 'couple';

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
  const [retirementAge2, setRetirementAge2] = useState(null);
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
    age: null,
    personId: 'p1'
  });
  const [missingDataValue, setMissingDataValue] = useState('');

  // Activate All Ownings State
  const [activateAllOwnings, setActivateAllOwnings] = useState(false);
  const [owningsActivationDate, setOwningsActivationDate] = useState(() => {
    const d = new Date();
    // [Phase 9b] Use UTC for consistency in internal state strings
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
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
                ...freshInc, // Start with Profile Defaults
                ...saved,    // Apply Scenario Overrides (startDate, endDate, frequency, adjustedAmount, etc.)
                amount: freshInc.amount, // Force fresh original amount for reference
                // If the user modified the amount specifically in this scenario, use it
                // Otherwise use fresh from profile
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
        // Start with savedCosts to ensure we don't lose split rows or adjustments
        let finalCosts = location.state?.adjustedCosts || sData?.adjustedCosts || [];

        if (cData && cData.length > 0) {
          // Sync with fresh DB data
          cData.forEach(freshCost => {
            const idx = finalCosts.findIndex(fc => (fc.id && freshCost.id && fc.id === freshCost.id) || (fc.name === freshCost.name && !fc.parentId));

            if (idx >= 0) {
              const saved = finalCosts[idx];
              const isDirty = parseFloat(saved.amount) !== parseFloat(saved.adjustedAmount);
              finalCosts[idx] = {
                ...freshCost,
                ...saved,
                amount: freshCost.amount,
                adjustedAmount: isDirty ? saved.adjustedAmount : freshCost.amount
              };
            } else {
              finalCosts.push({
                ...freshCost,
                adjustedAmount: freshCost.amount,
                isActive: true
              });
            }
          });
        } else if (!finalCosts.length) {
          finalCosts = cData || [];
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

        // Initialize retirement ages for both
        // RULE: Source of truth = Retirement Data (Questionnaire)
        const age1 = rData?.p1?.questionnaire?.simulationAge || sData?.earlyRetirementAge || 65;
        setRetirementAge(Number(age1));

        let age2 = 65;
        if (uData?.analysisType === 'couple') {
          age2 = rData?.p2?.questionnaire?.simulationAge || sData?.earlyRetirementAge2 || 65;
          setRetirementAge2(Number(age2));
        }

        // AUTO-SYNC markers/labels to ensure graph perfectly matches questionnaire
        // Use a slight delay to ensure all other data (incomes/costs) reached state
        setTimeout(() => {
          console.log('[ScenarioResult] Performing initial state sync for ages:', { age1, age2 });
          synchronizeSimulationState('p1', Number(age1), sData);
          if (uData?.analysisType === 'couple') {
            synchronizeSimulationState('p2', Number(age2), sData);
          }
        }, 500);

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error(t('common.error'));
        setLoading(false);
      }
    };

    loadAllData();
  }, [user, masterKey, navigate, location]);

  // INITIALIZATION FIX: Set retirementAge state from source of truth on load
  useEffect(() => {
    if (retirementAge === null) {
      const explicitAge = Number(retirementData?.p1?.questionnaire?.simulationAge || scenarioData?.earlyRetirementAge);
      if (!isNaN(explicitAge) && explicitAge > 0) setRetirementAge(explicitAge);
    }
    if (retirementAge2 === null && (userData?.analysisType === 'couple' || scenarioData?.analysisType === 'couple')) {
      const explicitAge2 = Number(retirementData?.p2?.questionnaire?.simulationAge || scenarioData?.earlyRetirementAge2);
      if (!isNaN(explicitAge2) && explicitAge2 > 0) setRetirementAge2(explicitAge2);
    }
  }, [scenarioData, retirementData, retirementAge, retirementAge2, userData]);

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
    const incomeDateOverrides = effectiveScenarioData?.incomeDateOverrides || {};

    // [Phase 18c] Reserved Item Identification Helpers
    // These must be identical across all blocks to ensure consistent deduplication
    const isSalary = (name = '') => {
      const n = name.toLowerCase();
      return n.includes('salary') || n.includes('salaire') || n.includes('lohn') || n.includes('revenu');
    };
    const isLPP = (name = '') => {
      const n = name.toLowerCase();
      // Skip capital to only target pension/rent flows
      if (n.includes('capital')) return false;
      return n.includes('lpp') || n.includes('bvg') || n.includes('pension') || n.includes('rente');
    };
    const isAVS = (name = '') => {
      const n = name.toLowerCase();
      return n.includes('avs') || n.includes('ahv') || n.includes('1. säule') || n.includes('1er pilier') || n.includes('pension de vieillesse');
    };

    // Helpers for consistent Person detection (Sync with DataReview.js)
    const isPerson1 = (item) => {
      const rawPerson = item.person || item.owner;
      return rawPerson === 'p1' ||
        rawPerson === 'Person 1' ||
        rawPerson === 'Personne 1' ||
        (userData?.firstName && rawPerson === userData.firstName);
    };

    const isPerson2 = (item) => {
      const rawPerson = item.person || item.owner;
      return rawPerson === 'p2' ||
        rawPerson === 'Person 2' ||
        rawPerson === 'Personne 2' ||
        (userData?.firstName2 && rawPerson === userData.firstName2);
    };

    // Safety check for birthDate
    if (!userData.birthDate) return null;

    const simRetirementDateObj = (() => {
      // Robust Parser for "DD.MM.YYYY" (Swiss format) as seen in user data
      if (typeof simRetirementDate === 'string' && simRetirementDate.includes('.')) {
        const parts = simRetirementDate.split('.');
        // [Phase 9b] Use Date.UTC for robust parsing
        if (parts.length === 3) return new Date(Date.UTC(parts[2], parseInt(parts[1]) - 1, parseInt(parts[0]), 0, 0, 0, 0));
      }
      return new Date(simRetirementDate);
    })();
    const firstProjYear = projection?.yearlyBreakdown?.[0]?.year;
    const startYear = firstProjYear ? parseInt(firstProjYear) : new Date().getUTCFullYear();
    const simStartRef = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0, 0)); // Simulation activation date (Timeline Start)
    const currentYear = simStartRef.getUTCFullYear();
    const birthDate = new Date(userData.birthDate);
    const retirementLegalDate = getLegalRetirementDate(userData.birthDate, userData.gender);

    // [Phase 9b] Strict UTC age calculation
    const ageAtRetirement = (simRetirementDateObj.getUTCFullYear() - birthDate.getUTCFullYear()) +
      ((simRetirementDateObj.getUTCMonth() - birthDate.getUTCMonth()) / 12);

    // Death date logic
    const deathDate1 = userData.theoreticalDeathDate || (userData.birthDate ? `${new Date(userData.birthDate).getUTCFullYear() + (userData.gender === 'male' ? 80 : 85)}-12-31` : '2080-12-31');
    const deathDate2 = userData.analysisType === 'couple' && userData.theoreticalDeathDate2 ? userData.theoreticalDeathDate2 : (userData.analysisType === 'couple' && userData.birthDate2 ? `${new Date(userData.birthDate2).getUTCFullYear() + (userData.gender2 === 'male' ? 80 : 85)}-12-31` : null);

    const maxDeathDate = (deathDate2 && new Date(deathDate2) > new Date(deathDate1)) ? deathDate2 : deathDate1;
    const deathYear = new Date(maxDeathDate).getUTCFullYear();

    const simRetirementDate2 = effectiveScenarioData?.wishedRetirementDate2 || location.state?.wishedRetirementDate2 || simRetirementDate;
    const simRetirementDateObj2 = new Date(simRetirementDate2);
    const birthDate2 = userData.birthDate2 ? new Date(userData.birthDate2) : null;
    const retirementLegalDate2 = birthDate2 ? getLegalRetirementDate(userData.birthDate2, userData.gender2) : null;

    const ageAtRetirement2 = birthDate2 ? (simRetirementDateObj2.getUTCFullYear() - birthDate2.getUTCFullYear()) +
      ((simRetirementDateObj2.getUTCMonth() - birthDate2.getUTCMonth()) / 12) : null;

    // Determine LPP Parameters for P1 (Option 3 logic)
    let simLppPension = 0;
    let simLppCapital = 0;
    let lppStartDate = simRetirementDateObj;

    // Determine LPP Parameters for P2 (Option 3 logic)
    let simLppPension2 = 0;
    let simLppCapital2 = 0;
    let lppStartDate2 = simRetirementDateObj2;

    const isOption3 = effectiveScenarioData?.retirementOption === 'option3';

    if (isOption3) {
      // Logic for P1
      if (effectiveScenarioData.preRetirementRows && effectiveScenarioData.preRetirementRows.length > 0) {
        const sortedRows = [...effectiveScenarioData.preRetirementRows].sort((a, b) => parseInt(a.age) - parseInt(b.age));
        const retirementAgeInt = Math.floor(ageAtRetirement);
        let planData = sortedRows.find(r => parseInt(r.age) === retirementAgeInt) || sortedRows.filter(r => parseInt(r.age) < retirementAgeInt).pop();
        if (planData) {
          simLppPension = parseFloat(planData.pension || 0);
          simLppCapital = parseFloat(planData.capital || 0);
        }
      }
      // Logic for P2
      if (effectiveScenarioData.preRetirementRows2 && effectiveScenarioData.preRetirementRows2.length > 0) {
        const sortedRows2 = [...effectiveScenarioData.preRetirementRows2].sort((a, b) => parseInt(a.age) - parseInt(b.age));
        const retirementAgeInt2 = Math.floor(ageAtRetirement2);
        let planData2 = sortedRows2.find(r => parseInt(r.age) === retirementAgeInt2) || sortedRows2.filter(r => parseInt(r.age) < retirementAgeInt2).pop();
        if (planData2) {
          simLppPension2 = parseFloat(planData2.pension || 0);
          simLppCapital2 = parseFloat(planData2.capital || 0);
        }
      }
    } else {
      // Standard Options (0, 1, 2)
      simLppPension = parseFloat(effectiveScenarioData?.projectedLPPPension || effectiveScenarioData?.projectedLegalLPPPension || 0);
      simLppCapital = parseFloat(effectiveScenarioData?.projectedLPPCapital || effectiveScenarioData?.projectedLegalLPPCapital || 0);

      // Fallback for P2 if couple
      simLppPension2 = parseFloat(effectiveScenarioData?.projectedLPPPension2 || effectiveScenarioData?.projectedLegalLPPPension2 || 0);
      simLppCapital2 = parseFloat(effectiveScenarioData?.projectedLPPCapital2 || effectiveScenarioData?.projectedLegalLPPCapital2 || 0);
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
      // [Phase 9b] UTC accessors
      dateAt60.setUTCFullYear(dateAt60.getUTCFullYear() + 60);
      payoutDate3a = dateAt60;
    }
    const payoutYear3a = payoutDate3a.getUTCFullYear();


    // --- SIMULATION LOOP ---
    const breakdown = [];
    const transmissionAmt = location.state?.transmissionAmount || effectiveScenarioData?.transmissionAmount || 0;
    let balanceBeforeTransmission = 0;
    // Monte Carlo Integration: Track invested assets separately
    // Use effectiveAssets and effectiveScenarioData
    const investedAssetIds = getInvestedBookAssets(effectiveAssets, effectiveScenarioData).map(a => a.id);

    // INITIALIZE Cash Balance (Initial Liquid Wealth)
    let initialCashWealth = 0;
    effectiveAssets.forEach(asset => {
      const id = asset.id || asset.name;
      if (!activeFilters[`asset-${id}`]) return;

      const isLiquid = asset.category === 'Liquid';
      const isInvested = investedAssetIds.includes(id) || asset.strategy === 'Invested';

      if (isLiquid && !isInvested) {
        if (asset.availabilityDate) {
          const availDate = parseToUtc(asset.availabilityDate);

          // [STOCK CHECK] Assets available on or before activation date are OPENING BALANCE
          if (availDate <= simStartRef) {
            initialCashWealth += parseFloat(asset.adjustedAmount || asset.amount || 0);
          }
        }
      }
    });

    let cumulativeBalance = initialCashWealth;

    // INITIALIZE Invested Balance (BUT ONLY FOR ASSETS AVAILABLE NOW)
    let investedBalance = 0;
    // BASELINE: Always assume flat 0% return for the main projection (Gray Line)
    // The Monte Carlo returns are handled separately in the Blue Line calculations.
    const yearlyReturns = [];

    investedAssetIds.forEach(assetId => {
      const asset = effectiveAssets.find(a => a.id === assetId);
      if (asset && activeFilters[`asset-${asset.id || asset.name}`]) {
        const amount = parseFloat(asset.amount || 0);

        if (asset.availabilityDate) {
          const availDate = parseToUtc(asset.availabilityDate);
          if (availDate <= simStartRef) {
            investedBalance += amount;
          }
        }
      }
    });

    console.log(`[STOCK CHECK] Simulation starting with Cash: ${cumulativeBalance}, Invested: ${investedBalance}`);

    for (let year = currentYear; year <= deathYear; year++) {
      let yearIncome = 0;
      let yearActivatedOwnings = 0;
      let yearCosts = 0;
      const incomeBreakdown = {};
      const activatedOwingsBreakdown = {};
      const costBreakdown = {};
      let amountTransferredToInvested = 0; // Amount moved from 'Cash Flow' to 'Invested Pot'

      // [Phase 18d] Handle Reserveds with strict overrides (Salary, AVS, LPP)
      // This matches DataReview.js logic for 100% agreement

      // SALARY
      effectiveIncomes.filter(r => isSalary(r.name)).forEach(row => {
        if (!activeFilters[`income-${row.id || row.name}`]) return;
        const amount = parseFloat(row.adjustedAmount || row.amount) || 0;

        const isP2 = row.owner === 'p2' || row.person === 'Person 2';
        const pLabel = isP2 ? (userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2')) : (userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1'));
        const overrideKey = `${row.name}_${pLabel}`;

        // MASTER SCREEN SYNC: Salary ends EXACTLY on retirement date to avoid 1-month overlap
        const start = incomeDateOverrides[overrideKey]?.startDate || row.startDate || new Date().toISOString().split('T')[0];
        const end = incomeDateOverrides[overrideKey]?.endDate || (isP2 ? simRetirementDate2 : simRetirementDate);

        const val = calculateYearlyAmount(amount, row.frequency, start, end, year);
        if (val > 0) {
          yearIncome += val;
          const key = `${row.name}@@${isP2 ? 'p2' : 'p1'}`;
          incomeBreakdown[key] = (incomeBreakdown[key] || 0) + val;
        }
      });

      // AVS
      [...effectiveIncomes, ...(effectiveRetirementData?.rows || [])].filter(r => isAVS(r.name)).forEach(row => {
        const filterId = row.id && !isNaN(row.id) ? `pillar-${row.id}` : `pillar-${row.name}`;
        if (activeFilters[filterId] === false || activeFilters[`income-${row.id || row.name}`] === false) return;

        const amount = parseFloat(row.adjustedAmount || row.amount) || 0;

        const isP2 = row.owner === 'p2' || row.person === 'Person 2';
        const pLabel = isP2 ? (userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2')) : (userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1'));
        const overrideKey = `${row.name}_${pLabel}`;

        const start = incomeDateOverrides[overrideKey]?.startDate || row.startDate || (isP2 ? retirementLegalDate2 : retirementLegalDate);
        const end = incomeDateOverrides[overrideKey]?.endDate || row.endDate || (isP2 ? deathDate2 : deathDate1);

        const val = calculateYearlyAmount(amount, row.frequency, start, end, year);
        if (val > 0) {
          const key = `${row.name}@@${isP2 ? 'p2' : 'p1'}`;
          if (!incomeBreakdown[key]) {
            yearIncome += val;
            incomeBreakdown[key] = val;
          }
        }
      });

      // LPP PENSION (Dynamic Source of Truth)
      const lppRows = [...effectiveIncomes, ...(effectiveRetirementData?.rows || [])].filter(r => isLPP(r.name));
      if (lppRows.length > 0) {
        lppRows.forEach(row => {
          const isP2 = row.owner === 'p2' || row.person === 'Person 2';
          if (activeFilters[`pillar-${row.id || row.name}`] === false || activeFilters[`income-${row.id || row.name}`] === false) return;

          const pLabel = isP2 ? (userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2')) : (userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1'));
          const overrideKey = `${row.name}_${pLabel}`;

          // If it's a dynamic row from simLppPension (Option 3), we use simLppPension. 
          // Otherwise use row amount.
          const amount = (row.isRetirement) ? (isP2 ? simLppPension2 : simLppPension) : (parseFloat(row.adjustedAmount || row.amount) || 0);
          if (amount <= 0) return;

          const start = incomeDateOverrides[overrideKey]?.startDate || row.startDate || (isP2 ? simRetirementDate2 : simRetirementDate);
          const end = incomeDateOverrides[overrideKey]?.endDate || row.endDate || (isP2 ? deathDate2 : deathDate1);

          const val = calculateYearlyAmount(amount, 'Yearly', start, end, year);
          if (val > 0) {
            yearIncome += val;
            incomeBreakdown[`${row.name}@@${isP2 ? 'p2' : 'p1'}`] = val;
          }
        });
      }

      // 1. INCOMES (Salary etc)
      effectiveIncomes.forEach(row => {
        const id = row.id || row.name;
        if (!activeFilters[`income-${id}`]) return;
        // Skip static Option 3 rows calculated by DataReview, as we handle them dynamically here
        if (row.id && row.id.toString().includes('pre_retirement_')) return;
        if (row.name && (row.name.includes('Pre - retirement') || row.name.includes('Pre-retirement'))) return;

        const amount = parseFloat(row.adjustedAmount || row.amount) || 0;
        const nameLower = (row.name || '').toLowerCase();

        // UNIFY LOGIC: Dedicated blocks for Salary, AVS, LPP to avoid overcounting and start-date drift
        if (isSalary(row.name) || isAVS(row.name) || isLPP(row.name)) {
          // These are skipped here - they are handled either by injection logic or by Loop 2 (Pillars)
          // to ensure we use the dynamic simulation values (simLppPension, etc) and correct overrides.
          return;
        }

        let effectiveStartDate = row.startDate;
        let effectiveEndDate = row.endDate;


        const val = calculateYearlyAmount(
          amount,
          row.frequency,
          effectiveStartDate,
          effectiveEndDate,
          year
        );
        if (val > 0) {
          yearIncome += val;
          const person = isPerson2(row) ? 'p2' : (isPerson1(row) ? 'p1' : 'shared');
          const key = `${row.name}@@${person}`;
          incomeBreakdown[key] = (incomeBreakdown[key] || 0) + val;
        }
      });

      // 2. OTHER RETIREMENT PILLARS & FALLBACKS
      // (AVS and LPP processed above in unified reserveds block)

      // Fallback Logic Removed (Lines 669-681) to prevent "LPP Pension" duplicates.
      // Injection Logic (lines 604+) handles this correctly.

      // Handle LPP Capital Payouts (Dynamic)
      if (simLppCapital > 0 && year === lppStartDate.getUTCFullYear()) {
        yearIncome += simLppCapital;
        incomeBreakdown['LPP Capital@@p1'] = (incomeBreakdown['LPP Capital@@p1'] || 0) + simLppCapital;
      }
      if (simLppCapital2 > 0 && year === lppStartDate2.getUTCFullYear()) {
        yearIncome += simLppCapital2;
        incomeBreakdown['LPP Capital@@p2'] = (incomeBreakdown['LPP Capital@@p2'] || 0) + simLppCapital2;
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

          const date = parseToUtc(effectiveDateStr);

          if (year === date.getUTCFullYear()) {
            // Check if this was already added as "Initial State"
            if (date <= simStartRef) {
              // ALREADY INJECTED - Skip flow adding
              return;
            }

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
              const person = isPerson2(asset) ? 'p2' : (isPerson1(asset) ? 'p1' : 'shared');
              incomeBreakdown[`${asset.name}@@${person}`] = (incomeBreakdown[`${asset.name}@@${person}`] || 0) + amount;
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
          const person = isPerson2(row) ? 'p2' : (isPerson1(row) ? 'p1' : (row.owner === 'consolidated' ? 'consolidated' : 'shared'));
          costBreakdown[`${row.name}@@${person}`] = (costBreakdown[`${row.name}@@${person}`] || 0) + val;
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
        const debtYear = dateStr ? parseToUtc(dateStr).getUTCFullYear() : currentYear;
        // If specific logic needed for periods, add here. Currently assuming simple date for debts in this refactor.
        if (year === debtYear) {
          yearCosts += amount;
          const person = isPerson2(debt) ? 'p2' : (isPerson1(debt) ? 'p1' : 'shared');
          costBreakdown[`${debt.name}@@${person}`] = (costBreakdown[`${debt.name}@@${person}`] || 0) + amount;
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

  // Navigation to Invest Flow Graph


  // Calculate Projection using iterative approach for Option 3 or single run for others
  useEffect(() => {
    if (loading || !userData) return;

    // --- EXECUTION LOGIC ---

    if (scenarioData?.retirementOption === 'option3') {
      // Automatic Optimization
      // Iterate monthly from NOW until Legal Retirement Date
      const startDate = new Date();
      // [Phase 9b] UTC increments
      startDate.setUTCMonth(startDate.getUTCMonth() + 1); // Start next month
      const endDate = userData?.retirementLegalDate ? new Date(userData.retirementLegalDate) : new Date(Date.UTC(startDate.getUTCFullYear() + 20, 0, 1));

      let bestResult = null;
      let found = false;

      // Safety break
      let iterations = 0;
      const maxIterations = 300; // ~25 years

      let testDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
      while (testDate <= endDate && iterations < maxIterations) {
        // Optimization: Find earliest date assuming pension IS taken (ignore filters = true)
        const result = runSimulation(testDate, { ignorePensionFilters: true });
        if (result && result.finalBalance >= 0) {
          found = true;
          bestResult = result;
          break; // Stop at first valid date
        }
        // Increment month strictly in UTC
        testDate.setUTCMonth(testDate.getUTCMonth() + 1);
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

  // Run Monte Carlo simulation for Invested Book (Phase 12)
  const mcReady =
    !!projection?.yearlyBreakdown?.length &&
    !!scenarioData &&
    Array.isArray(assets) && assets.length > 0 &&
    !!scenarioData.investmentSelections;

  const runKey = JSON.stringify({
    startYear: projection?.yearlyBreakdown?.[0]?.year,
    selections: scenarioData?.investmentSelections,
    assetsLen: assets?.length
  });

  useEffect(() => {
    if (!mcReady) {
      console.log("[MC GATE] not ready", {
        mcReady,
        hasProjection: !!projection?.yearlyBreakdown?.length,
        assetsLen: assets?.length,
        hasSelections: !!scenarioData?.investmentSelections
      });
      return;
    }

    if (lastRunKeyRef.current === runKey) {
      console.log("[MC GATE] already ran for this key");
      return;
    }

    lastRunKeyRef.current = runKey;

    const runMonteCarlo = async () => {
      setSimulationLoading(true);
      try {
        console.log("[MC START]", { runKey });
        const portfolioSimulation = await runInvestedBookSimulation({
          assets,
          scenarioData,
          userData,
          projection
        });

        if (portfolioSimulation) {
          // [Phase 11/12] ATTACH detSeries BEFORE SETTING STATE
          // [ALIGNMENT FIX] Pass incomes and costs for Bottom-Up Accumulation
          const combinedCosts = [...costs, ...debts];
          const detSeries = calculateMonthlyDeterministicSeries(
            projection,
            portfolioSimulation.simulationStartDate,
            portfolioSimulation.horizonMonths,
            assets,
            activeFilters,
            scenarioData,
            incomes,
            combinedCosts,
            userData
          );

          console.log("[MC SUCCESS]", {
            simStart: portfolioSimulation.simulationStartDate,
            p5Len: portfolioSimulation.percentiles?.p5?.length,
            principalLen: portfolioSimulation.principalPath?.length,
            detLen: detSeries?.length
          });

          // Extract legacy series for standard chart rendering
          const p50 = calculateInvestedProjection({ assets }, portfolioSimulation, 50);
          const p10 = calculateInvestedProjection({ assets }, portfolioSimulation, 10);
          const p5 = calculateInvestedProjection({ assets }, portfolioSimulation, 5);

          setMonteCarloProjections({
            p50,
            p10,
            p5,
            details: {
              ...portfolioSimulation,
              detSeries
            }
          });

          console.log("[MC STATE SET]");
        }
      } catch (error) {
        console.error("[MC FAIL]", error);
        setMonteCarloProjections(null); // only on failure
        toast.error(language === 'fr' ? 'Échec de la simulation d\'investissement' : 'Failed to run investment simulation');
      } finally {
        setSimulationLoading(false);
      }
    };

    runMonteCarlo();
  }, [mcReady, runKey, assets, scenarioData, userData, projection, language, incomes, costs, debts, activeFilters]);

  // Debounced recalculation when retirement age changes
  // MODIFIED: We now use onValueCommit for "heavy" updates (State Sync).
  // This effect is kept for pure visual feedback if needed, but let's stick to the robust commited change.
  useEffect(() => {
    // Disabled in favor of onValueCommit -> synchronizeSimulationState
    // If we want instant visual feedback, we can keep a lightweight recalc, but let's stick to the robust commited change.
  }, [retirementAge]);
  // NEW SYNC LOGIC (DUAL COMPATIBLE)
  const synchronizeSimulationState = async (personId, newAge, overrideScenarioData = null) => {
    // START: Fix Stale State
    const effectiveScenarioData = overrideScenarioData || scenarioData;
    if (!effectiveScenarioData || !userData) return;
    // END: Fix Stale State

    // 0. Ensure Types
    const numericAge = Number(newAge);
    const isP2 = personId === 'p2';

    // 1. Calculate Date
    const birthDate = new Date(isP2 ? userData.birthDate2 : userData.birthDate);
    const retirementDate = new Date(birthDate);
    const years = Math.floor(numericAge);
    const months = Math.round((numericAge - years) * 12);
    // [Phase 9b] UTC accessors
    retirementDate.setUTCFullYear(retirementDate.getUTCFullYear() + years);
    retirementDate.setUTCMonth(retirementDate.getUTCMonth() + months + 1);
    retirementDate.setDate(1);
    const newRetirementDateStr = retirementDate.toISOString().split('T')[0];

    // 2. Check LPP Logic
    // Fix: strict numeric comparison
    const earliestPreRetirementAge = parseInt(effectiveScenarioData.questionnaire?.lppEarliestAge || 58);
    const isPreRetirement = numericAge >= earliestPreRetirementAge;

    // 3. Check for Missing Data (Blocking)
    if (isPreRetirement) {
      const ageKey = Math.floor(numericAge).toString();
      const bData = isP2 ? effectiveScenarioData.benefitsData2 : effectiveScenarioData.benefitsData;
      const entry = bData?.lppByAge?.[ageKey];
      if (!entry || (!entry.pension && !entry.capital)) {
        setMissingDataDialog({
          isOpen: true,
          type: 'pension',
          age: Math.floor(numericAge),
          personId: personId
        });
        return;
      }
    } else {
      const bData = isP2 ? effectiveScenarioData.benefitsData2 : effectiveScenarioData.benefitsData;
      const currentCapital = bData?.lppCurrentCapital;
      if (!currentCapital || parseFloat(currentCapital) <= 0) {
        setMissingDataDialog({
          isOpen: true,
          type: 'capital',
          age: numericAge,
          personId: personId
        });
        return;
      }
    }

    // 4. Update Questionnaire State
    const updatedQuestionnaire = {
      ...(isP2 ? effectiveScenarioData.questionnaire2 : effectiveScenarioData.questionnaire),
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
        const itemIsP2 = item.person === 'Person 2' || item.owner === 'p2';

        // Only update end date if the person matches
        if (isSalary && !item.isRetirement && (isP2 === itemIsP2)) {
          return {
            ...item,
            endDate: newRetirementDateStr,
            adjustedAmount: item.adjustedAmount
          };
        }

        // CRITICAL FIX: Update "Projected LPP Pension" Row
        const isLppPension = (item.id && String(item.id).toLowerCase().includes('lpp') && String(item.id).toLowerCase().includes('pension')) ||
          (item.name && String(item.name).toLowerCase().includes('lpp') && String(item.name).toLowerCase().includes('pension'));

        if (isLppPension && (isP2 === itemIsP2)) {
          let dynamicPension = 0;
          let dynamicAge = Math.floor(numericAge);
          const bData = isP2 ? effectiveScenarioData.benefitsData2 : effectiveScenarioData.benefitsData;

          if (numericAge >= (earliestPreRetirementAge)) {
            const ageKey = dynamicAge.toString();
            const entry = bData?.lppByAge?.[ageKey];
            dynamicPension = entry?.pension || 0;
          }

          if (dynamicPension > 0) {
            return {
              ...item,
              name: language === 'fr' ? `Rente LPP projetée à ${dynamicAge} ans` : `Projected LPP Pension at ${dynamicAge}y`,
              amount: dynamicPension,
              adjustedAmount: dynamicPension,
              startDate: newRetirementDateStr,
              isRetirement: true
            };
          }
        }

        return item;
      });

      // Determine correct projected LPP values based on path
      let newPension = '';
      let newCapital = '';
      const bData = isP2 ? effectiveScenarioData.benefitsData2 : effectiveScenarioData.benefitsData;

      if (isPreRetirement) {
        const ageKey = Math.floor(numericAge).toString();
        const entry = bData?.lppByAge?.[ageKey];
        newPension = entry?.pension || '';
        newCapital = entry?.capital || '';
      } else {
        newCapital = bData?.lppCurrentCapital || '';
      }

      // Determine Retirement Option & Legal Age
      const gender = isP2 ? (userData.gender2 || 'male') : (userData.gender || 'male');
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
        [isP2 ? 'questionnaire2' : 'questionnaire']: updatedQuestionnaire,
        [isP2 ? 'projectedLPPPension2' : 'projectedLPPPension']: newPension,
        [isP2 ? 'projectedLPPCapital2' : 'projectedLPPCapital']: newCapital,
        [isP2 ? 'wishedRetirementDate2' : 'wishedRetirementDate']: newRetirementDateStr,
        retirementOption: newOption, // Option reflects the overall scenario strategy
        [isP2 ? 'earlyRetirementAge2' : 'earlyRetirementAge']: newOption === 'option2' ? numericAge.toString() : (effectiveScenarioData[isP2 ? 'earlyRetirementAge2' : 'earlyRetirementAge'] || ''),
        adjustedIncomes: updatedIncomes
      };

      // 6. Save & Set Scenario Data (Intermediate Step)
      await saveScenarioData(user.email, masterKey, updatedScenarioData);

      // 7. CRITICAL: GLOBAL SYNC & REDIRECT (User Request)
      // We must update the core 'retirementData' so that the "Retirement Inputs" page reflects this change.
      // Then we redirect to DataReview to ensure a clean slate simulation (Option 0/Standard).

      const rData = (await getRetirementData(user.email, masterKey)) || {};

      // Ensure V2 structure exists
      if (!isP2) {
        if (!rData.p1) rData.p1 = {};
        rData.p1.questionnaire = {
          ...(rData.p1.questionnaire || {}),
          simulationAge: newAge,
          isWithinPreRetirement: isPreRetirement ? 'yes' : 'no'
        };
      } else {
        if (!rData.p2) rData.p2 = {};
        rData.p2.questionnaire = {
          ...(rData.p2.questionnaire || {}),
          simulationAge: newAge,
          isWithinPreRetirement: isPreRetirement ? 'yes' : 'no'
        };
      }

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
      setIncomes(updatedIncomes);
      setScenarioData(updatedScenarioData);
      if (isP2) setRetirementAge2(newAge);
      else setRetirementAge(newAge);

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
    const personId = missingDataDialog.personId || 'p1';
    const isP2 = personId === 'p2';
    const val = parseFloat(missingDataValue);
    if (isNaN(val) || val < 0) return;

    // 1. Update Scenario Data (for immediate simulation)
    const bDataKey = isP2 ? 'benefitsData2' : 'benefitsData';
    const updatedBenefitsData = { ...(scenarioData[bDataKey] || {}) };

    if (missingDataDialog.type === 'pension') {
      const ageKey = dialogAge.toString();
      if (!updatedBenefitsData.lppByAge) updatedBenefitsData.lppByAge = {};
      updatedBenefitsData.lppByAge = {
        ...updatedBenefitsData.lppByAge,
        [ageKey]: {
          ...updatedBenefitsData.lppByAge?.[ageKey],
          pension: val,
          capital: updatedBenefitsData.lppByAge?.[ageKey]?.capital || ''
        }
      };
    } else {
      updatedBenefitsData.lppCurrentCapital = val;
    }

    const updatedScenarioData = {
      ...scenarioData,
      [bDataKey]: updatedBenefitsData,
      // Update top-level fields for display/legacy compat
      ...(isP2
        ? (missingDataDialog.type === 'pension' ? { projectedLPPPension2: val } : { projectedLPPCapital2: val })
        : (missingDataDialog.type === 'pension' ? { projectedLPPPension: val } : { projectedLPPCapital: val })
      )
    };

    try {
      // Update Scenario Data First
      await saveScenarioData(user.email, masterKey, updatedScenarioData);
      setScenarioData(updatedScenarioData); // Update Local State immediately

      // 2. Sync to Global Retirement Data (V2 Schema Persistence)
      const rData = (await getRetirementData(user.email, masterKey)) || {};
      const personKey = isP2 ? 'p2' : 'p1';

      // Ensure V2 structure
      if (!rData[personKey]) rData[personKey] = { questionnaire: {}, benefitsData: {} };
      if (!rData[personKey].benefitsData) rData[personKey].benefitsData = {};

      const targetBData = rData[personKey].benefitsData;

      if (missingDataDialog.type === 'pension') {
        const ageKey = dialogAge.toString();
        if (!targetBData.lppByAge) targetBData.lppByAge = {};
        targetBData.lppByAge[ageKey] = updatedBenefitsData.lppByAge[ageKey];
      } else {
        targetBData.lppCurrentCapital = val;
      }

      await saveRetirementData(user.email, masterKey, rData);

      const resumeAge = dialogAge || (isP2 ? retirementAge2 : retirementAge);

      console.log('DEBUG: handleMissingDataSubmit - Resuming Simulation', {
        personId,
        dialogAge,
        resumeAge,
        type: missingDataDialog.type,
        val
      });

      // 3. Automation Flow & Redirection
      // We ALWAYS redirect to force a clean data refresh as requested by user
      toast.success(language === 'fr' ? 'Redirection pour recalcul...' : 'Redirecting for recalculation...');

      setMissingDataDialog({ isOpen: false, type: null, age: null, personId: 'p1' });
      setMissingDataValue('');

      setTimeout(() => {
        navigate('/retirement-inputs', {
          state: {
            autoAutomateFullSequence: true,
            personId: personId, // Pass which person triggered it
            wishedRetirementDate: isP2 ? updatedScenarioData.wishedRetirementDate2 : updatedScenarioData.wishedRetirementDate,
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

  // Prepare Monthly Data for Table
  const prepareMonthlyDataForTable = () => {
    console.log('[DATA EXPORT ENTER]', {
      isInvested,
      hasMC: !!monteCarloProjections?.details,
      projectionYears: projection?.yearlyBreakdown?.length,
    });

    if (!projection?.yearlyBreakdown) {
      console.warn('[DATA EXPORT] No projection.yearlyBreakdown, returning empty');
      return [];
    }

    const mcDetails = monteCarloProjections?.details;
    const hasMC = !!mcDetails;
    const investedAssetIds = getInvestedBookAssets(assets, scenarioData).map(a => a.id);

    // Determine source of monthly data
    let detSeries;
    let simStartDate;
    let horizonMonths;
    let injections = [];
    let injectionMap = new Map();

    if (hasMC) {
      // Invested mode: use MC series
      detSeries = mcDetails.detSeries;
      simStartDate = toUtcMonthStart(mcDetails.simulationStartDate);
      horizonMonths = mcDetails.horizonMonths;
      injections = mcDetails.injections || [];
      // Full injection trace for tooltips
      injectionMap = new Map(injections.map(inj => [inj.monthIndex, inj]));
    } else {
      // Non-invested mode: build deterministic baseline series
      // [ALIGNMENT FIX] Use canonical simulation start year from projection if available
      const firstProjYear = parseInt(projection.yearlyBreakdown[0]?.year);
      const startYear = Number.isFinite(firstProjYear) ? firstProjYear : new Date().getUTCFullYear();
      simStartDate = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0, 0));

      // Calculate horizon from projection - must match the yearly breakdown
      const lastYear = parseInt(projection.yearlyBreakdown[projection.yearlyBreakdown.length - 1]?.year || startYear);

      // Horizon is from start of first year to the theoretical death date if available
      const deathDate = userData?.theoreticalDeathDate ? new Date(userData.theoreticalDeathDate) : null;
      if (deathDate) {
        const firstYearNum = parseInt(startYear);
        horizonMonths = Math.max(1, (deathDate.getUTCFullYear() - firstYearNum) * 12 + deathDate.getUTCMonth());
      } else {
        horizonMonths = (lastYear - startYear) * 12 + 11;
      }

      // Build deterministic monthly series (reuse existing function)
      const combinedCosts = [...costs, ...debts];
      detSeries = calculateMonthlyDeterministicSeries(projection, simStartDate, horizonMonths, assets, activeFilters, scenarioData, incomes, combinedCosts, userData);
    }

    // [SIM START ALIGN] Verify matching origins across modes
    console.log('[SIM START ALIGN]', {
      mode: hasMC ? 'Invested/MC' : 'Non-Invested/Baseline',
      simStartDate: simStartDate.toISOString(),
      startYearRunKey: projection?.yearlyBreakdown?.[0]?.year
    });
    // [PARTICLE ARITHMETIC] Initialize running balances for exact table audit
    // 3 categories of running balances
    let runningLiquidNonInvested = 0;
    let runningInvestedPrincipal = 0; // Net Principal (decreases on exit)
    let runningInvestedBasis = 0;     // Cumulative Cost Basis (stays constant on exit)
    let runningIlliquidWealth = 0;

    assets.forEach(asset => {
      const id = asset.id || asset.name;
      if (!activeFilters[`asset-${id}`]) return;

      const isLiquid = asset.category === 'Liquid' || !asset.category; // Default to liquid
      const isInvested = investedAssetIds.includes(id) || asset.strategy === 'Invested';
      const isIlliquid = asset.category === 'Illiquid' || asset.category === 'Real Estate' || asset.category === 'Immobilier';

      const amount = parseFloat(asset.adjustedAmount || asset.amount || 0);
      const availDate = asset.availabilityDate ? toUtcMonthStart(asset.availabilityDate) : null;

      if (availDate && availDate <= simStartDate) {
        if (isInvested) {
          runningInvestedPrincipal += amount;
          runningInvestedBasis += amount;
        } else if (isIlliquid) {
          runningIlliquidWealth += amount;
        } else {
          runningLiquidNonInvested += amount;
        }
      }
    });

    const monthlyData = [];
    let previousTotalP5 = null;

    for (let m = 0; m <= horizonMonths; m++) {
      const date = new Date(simStartDate);
      date.setUTCMonth(date.getUTCMonth() + m);

      // Format date as dd.mm.yyyy (end of month)
      const lastDayOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
      const dateStr = `${String(lastDayOfMonth.getUTCDate()).padStart(2, '0')}.${String(lastDayOfMonth.getUTCMonth() + 1).padStart(2, '0')}.${lastDayOfMonth.getUTCFullYear()}`;


      // Calculate flows by summing individual items (Strict Spec)
      let IncomeFlow = 0;
      let CostFlow = 0;
      let LiquidNonInvestedFlow = 0;
      let InvestContributionFlow = 0;
      let externalInvestmentInflow = 0;
      let IlliquidFlow = 0;

      const simStartRef_Stable = new Date(simStartDate); // Consistent with timeline start

      // 1. Income Flows
      incomes.forEach(inc => {
        if (!activeFilters[`income-${inc.id || inc.name}`]) return;
        IncomeFlow += calculateMonthlyAmount(parseFloat(inc.amount || 0), inc.frequency || 'Monthly', inc.startDate, inc.endDate, date, simStartRef_Stable);
      });

      // 2. Cost Flows
      const allCostItems = [...costs, ...debts];
      allCostItems.forEach(c => {
        const prefix = costs.includes(c) ? 'cost-' : 'debt-';
        if (!activeFilters[`${prefix}${c.id || c.name}`]) return;
        CostFlow += calculateMonthlyAmount(parseFloat(c.amount || 0), c.frequency || 'Monthly', c.startDate, c.endDate, date, simStartRef_Stable);
      });

      // 3. Asset Flows
      assets.forEach(a => {
        if (!activeFilters[`asset-${a.id || a.name}`]) return;
        const amount = parseFloat(a.adjustedAmount || a.amount || 0);
        const isInvested = investedAssetIds.includes(a.id || a.name) || a.strategy === 'Invested';
        const isIlliquid = a.category === 'Illiquid' || a.category === 'Real Estate' || a.category === 'Immobilier';

        if (a.availabilityType === 'Period') {
          const flow = calculateMonthlyAmount(amount, 'Monthly', a.startDate, a.endDate, date, simStartRef_Stable);
          if (isInvested) {
            if (!hasMC) {
              InvestContributionFlow += flow;
              externalInvestmentInflow += flow;
            }
          } else if (isIlliquid) {
            IlliquidFlow += flow;
          } else {
            LiquidNonInvestedFlow += flow;
          }
        } else if (a.availabilityDate) {
          const availDate = toUtcMonthStart(a.availabilityDate);
          if (availDate > simStartRef_Stable && availDate.getUTCFullYear() === date.getUTCFullYear() && availDate.getUTCMonth() === date.getUTCMonth()) {
            if (isInvested) {
              if (!hasMC) {
                InvestContributionFlow += amount;
                externalInvestmentInflow += amount;
              }
            } else if (isIlliquid) {
              IlliquidFlow += amount;
            } else {
              LiquidNonInvestedFlow += amount;
            }
          }
        }
      });

      // 4. Handle Portfolio Injections & Exits (Principal changes)
      // Accumulate all injections/exits for this specific month index
      const monthInjections = injections.filter(inj => inj.monthIndex === m);
      monthInjections.forEach(inj => {
        // principal flows: contributions(+) or exits(-)
        InvestContributionFlow += (inj.amount || 0);

        // Yield Calculation Flow: ONLY external new money injections
        // Exits (isExit: true) are internal reallocation to 'Realized', not new money.
        if (!inj.isExit) {
          externalInvestmentInflow += (inj.amount || 0);
        }
      });
      const injection = monthInjections[0] || null; // For tooltip metadata (primary event)

      // Always update running balances for every month (including m=0)
      runningLiquidNonInvested += (IncomeFlow - CostFlow + LiquidNonInvestedFlow);
      runningInvestedPrincipal += InvestContributionFlow;
      runningInvestedBasis += externalInvestmentInflow;
      runningIlliquidWealth += IlliquidFlow;

      const engineIdx = Math.min(m + 1, horizonMonths);
      const getComponentVal = (componentKey, pKey) => (hasMC && mcDetails[componentKey]?.[pKey]) ? (mcDetails[componentKey][pKey][engineIdx] || 0) : null;

      // Extract Target P-Levels
      const Invested_P5 = getComponentVal('investedPercentiles', 'p5');
      const Invested_P10 = getComponentVal('investedPercentiles', 'p10');
      const Invested_P25 = getComponentVal('investedPercentiles', 'p25');
      const Invested_P50 = getComponentVal('investedPercentiles', 'p50');
      const Invested_P75 = getComponentVal('investedPercentiles', 'p75');
      const Invested_P90 = getComponentVal('investedPercentiles', 'p90');
      const Invested_P95 = getComponentVal('investedPercentiles', 'p95');

      const Realized_P5 = getComponentVal('realizedPercentiles', 'p5');
      const Realized_P10 = getComponentVal('realizedPercentiles', 'p10');
      const Realized_P25 = getComponentVal('realizedPercentiles', 'p25');
      const Realized_P50 = getComponentVal('realizedPercentiles', 'p50');
      const Realized_P75 = getComponentVal('realizedPercentiles', 'p75');
      const Realized_P90 = getComponentVal('realizedPercentiles', 'p90');
      const Realized_P95 = getComponentVal('realizedPercentiles', 'p95');

      const EngineTotal_P5 = getComponentVal('percentiles', 'p5');
      const EngineTotal_P10 = getComponentVal('percentiles', 'p10');
      const EngineTotal_P25 = getComponentVal('percentiles', 'p25');
      const EngineTotal_P50 = getComponentVal('percentiles', 'p50');
      const EngineTotal_P75 = getComponentVal('percentiles', 'p75');
      const EngineTotal_P90 = getComponentVal('percentiles', 'p90');
      const EngineTotal_P95 = getComponentVal('percentiles', 'p95');

      // Total Wealth = Non-Invested + Illiquid + Engine Total
      const activeBase = runningLiquidNonInvested + runningIlliquidWealth;
      const finalTotalP5 = activeBase + (EngineTotal_P5 || Math.round(runningInvestedPrincipal));
      const finalTotalP10 = activeBase + (EngineTotal_P10 || Math.round(runningInvestedPrincipal));
      const finalTotalP25 = activeBase + (EngineTotal_P25 || Math.round(runningInvestedPrincipal));
      const finalTotalP50 = activeBase + (EngineTotal_P50 || Math.round(runningInvestedPrincipal));
      const finalTotalP75 = activeBase + (EngineTotal_P75 || Math.round(runningInvestedPrincipal));
      const finalTotalP90 = activeBase + (EngineTotal_P90 || Math.round(runningInvestedPrincipal));
      const finalTotalP95 = activeBase + (EngineTotal_P95 || Math.round(runningInvestedPrincipal));

      // Calculate Wealth Delta (Monthly Change in Total P5)
      let wealthDelta = 0;
      if (previousTotalP5 !== null) {
        wealthDelta = finalTotalP5 - previousTotalP5;
      }
      previousTotalP5 = finalTotalP5;

      // Calculate Investment Yield (Market Gains/Losses in P5)
      // Cumulative Gain = (Portfolio + Realized) - Total Principal Basis
      let cumulativeGainP5 = 0;
      let cumulativeGainP10 = 0;
      let cumulativeGainP25 = 0;
      if (hasMC) {
        cumulativeGainP5 = (EngineTotal_P5 || 0) - runningInvestedBasis;
        cumulativeGainP10 = (EngineTotal_P10 || 0) - runningInvestedBasis;
        cumulativeGainP25 = (EngineTotal_P25 || 0) - runningInvestedBasis;
      }

      // Debug columns
      const year = lastDayOfMonth.getUTCFullYear();
      const isYearEnd = (lastDayOfMonth.getUTCMonth() === 11);

      monthlyData.push({
        Date_EOM: dateStr,
        MonthIndex: m,
        IncomeFlow: Math.round(IncomeFlow),
        CostFlow: Math.round(CostFlow),
        NetFlow: Math.round(IncomeFlow - CostFlow),
        InvestContributionFlow: Math.round(InvestContributionFlow),
        LiquidNonInvestedFlow: Math.round(LiquidNonInvestedFlow),
        IlliquidFlow: Math.round(IlliquidFlow),
        WealthDelta: Math.round(wealthDelta),
        InvestedYield_P5: Math.round(cumulativeGainP5),
        InvestedYield_P10: Math.round(cumulativeGainP10),
        InvestedYield_P25: Math.round(cumulativeGainP25),

        // 3 Categories
        LiquidNonInvested_EOM: Math.round(runningLiquidNonInvested),
        InvestedPrincipal_EOM: Math.round(runningInvestedPrincipal),
        IlliquidWealth_EOM: Math.round(runningIlliquidWealth),

        // Portfolio Detail (Investor View)
        InvestedMarketValue_P5: Invested_P5 !== null ? Math.round(Invested_P5) : Math.round(runningInvestedPrincipal),
        InvestedMarketValue_P10: Invested_P10 !== null ? Math.round(Invested_P10) : null,
        InvestedMarketValue_P25: Invested_P25 !== null ? Math.round(Invested_P25) : null,
        InvestedMarketValue_P50: Invested_P50 !== null ? Math.round(Invested_P50) : null,
        InvestedMarketValue_P75: Invested_P75 !== null ? Math.round(Invested_P75) : null,
        InvestedMarketValue_P90: Invested_P90 !== null ? Math.round(Invested_P90) : null,
        InvestedMarketValue_P95: Invested_P95 !== null ? Math.round(Invested_P95) : null,

        RealizedCapital_P5: Realized_P5 !== null ? Math.round(Realized_P5) : 0,
        RealizedCapital_P10: Realized_P10 !== null ? Math.round(Realized_P10) : null,
        RealizedCapital_P25: Realized_P25 !== null ? Math.round(Realized_P25) : null,
        RealizedCapital_P50: Realized_P50 !== null ? Math.round(Realized_P50) : null,
        RealizedCapital_P75: Realized_P75 !== null ? Math.round(Realized_P75) : null,
        RealizedCapital_P90: Realized_P90 !== null ? Math.round(Realized_P90) : null,
        RealizedCapital_P95: Realized_P95 !== null ? Math.round(Realized_P95) : null,

        // Totals
        Total_P5_EOM: Math.round(finalTotalP5),
        Total_P10_EOM: finalTotalP10 !== null ? Math.round(finalTotalP10) : null,
        Total_P25_EOM: finalTotalP25 !== null ? Math.round(finalTotalP25) : null,
        Total_P50_EOM: finalTotalP50 !== null ? Math.round(finalTotalP50) : null,
        Total_P75_EOM: finalTotalP75 !== null ? Math.round(finalTotalP75) : null,
        Total_P90_EOM: finalTotalP90 !== null ? Math.round(finalTotalP90) : null,
        Total_P95_EOM: finalTotalP95 !== null ? Math.round(finalTotalP95) : null,

        // Metadata for Tooltips
        InjectionEvent: injection ? {
          amount: Math.round(injection.amount),
          name: injection.name,
          isExit: injection.isExit,
          realizedInP5: Realized_P5
        } : null,

        // Debug/Meta
        Year: year,
        IsYearEnd: (lastDayOfMonth.getUTCMonth() === 11),
      });
    }

    console.log('[DATA EXPORT MODE]', {
      isInvested,
      hasMC,
      rowsExported: monthlyData.length
    });

    return monthlyData;
  };

  // Navigate to data table
  const handleShowData = () => {
    console.log('[MONTHLY DATA CLICK]', {
      isInvested,
      hasMC: !!monteCarloProjections?.details,
      hasProjection: !!projection,
      projectionYears: projection?.yearlyBreakdown?.length,
      assetsLen: assets?.length,
    });

    try {
      const monthlyData = prepareMonthlyDataForTable();
      console.log('[MONTHLY DATA PREPARED]', {
        rows: monthlyData?.length,
        first: monthlyData?.[0],
        last: monthlyData?.[monthlyData.length - 1]
      });

      const metadata = {
        simulationStartDate: monteCarloProjections?.details?.simulationStartDate || (projection?.yearlyBreakdown?.[0]?.year ? `${projection.yearlyBreakdown[0].year}-01-01` : null),
        horizonMonths: monteCarloProjections?.details?.horizonMonths || (monthlyData?.length ? monthlyData.length - 1 : 0),
        retirementDate: scenarioData?.wishedRetirementDate
      };

      navigate('/simulation-data', { state: { monthlyData, metadata } });
    } catch (e) {
      console.error('[MONTHLY DATA ERROR]', e);
      alert('Monthly data failed: ' + (e?.message ?? e));
    }
  };

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

      // [FIX] Define missing balances for PDF summary
      const final5Balance = monteCarloProjections?.p5 && monteCarloProjections.p5.length > 0
        ? monteCarloProjections.p5[monteCarloProjections.p5.length - 1].cumulativeBalance
        : finalBalance;

      const finalBaselineBalance = finalBalance;

      const summaryData = {
        finalBalance,
        retirementAge: `${retirementInfo.ageYears}y ${retirementInfo.ageMonths}m`,
        yearsInRetirement: yearlyData.filter(d => d.year >= retirementInfo.date.getFullYear()).length,
        deathDate: userData?.theoreticalDeathDate,
        peakWealth: Math.max(...(yearlyData.map(p => p.cumulativeBalance) || [0])),
        totalPages: 14, // Will be updated
        isInvested: isInvested,
        final5Balance: final5Balance,
        finalBaselineBalance: finalBaselineBalance,
        isCouple: userData.analysisType === 'couple'
      };

      if (userData.analysisType === 'couple') {
        summaryData.retirementAge2 = `${retirementInfo.ageYears2}y ${retirementInfo.ageMonths2}m`;
        summaryData.deathDate2 = userData?.theoreticalDeathDate2;
        summaryData.yearsInRetirement2 = yearlyData.filter(d => d.year >= retirementInfo.date2.getFullYear()).length;
      }

      await generateSimulationSummary(pdf, summaryData, language, currentPage);
      currentPage++;



      // ===== PAGE 4: PERSONAL INFO =====
      pageNumbers.personal = currentPage;
      // ===== PAGE 4: PERSONAL INFO =====
      pageNumbers.personal = currentPage;

      // [Phase 9c] Calculate missing PDF fields on the fly
      const birthDateObj = new Date(userData.birthDate);
      const currentAge = new Date().getFullYear() - birthDateObj.getFullYear();
      const legalRetireDate = getLegalRetirementDate(userData.birthDate, userData.gender);

      // Corrected Life Expectancy Calculation
      let calcLifeExpectancy = userData.gender === 'female' ? '85' : '81';
      if (userData.theoreticalDeathDate) {
        const dParts = userData.theoreticalDeathDate.includes('.') ? userData.theoreticalDeathDate.split('.') : null;
        const deathDateObj = dParts
          ? new Date(dParts[2], dParts[1] - 1, dParts[0])
          : new Date(userData.theoreticalDeathDate);

        if (!isNaN(deathDateObj.getTime())) {
          // Calculate based on year diff
          calcLifeExpectancy = (deathDateObj.getFullYear() - birthDateObj.getFullYear()).toString();
        }
      }

      const enrichedUserData = {
        ...userData,
        currentAge: currentAge
      };

      const enrichedScenarioData = {
        ...scenarioData,
        legalRetirementDate: legalRetireDate,
        legalRetirementAge: userData.gender === 'female' ? '64' : '65', // Standard Swiss Legal Ages
        lifeExpectancy: calcLifeExpectancy
      };

      generatePersonalInfo(pdf, enrichedUserData, enrichedScenarioData, language, currentPage, summaryData.totalPages);
      currentPage++;

      // ===== PAGE 5: INCOME & ASSETS =====
      pageNumbers.incomeAssets = currentPage;
      generateIncomeAssets(pdf, incomes, assets, language, currentPage, summaryData.totalPages, isCouple);
      currentPage++;

      // ===== PAGE 6: COSTS & DEBTS =====
      pageNumbers.costDebts = currentPage;
      generateCostDebts(pdf, costs, debts, language, currentPage, summaryData.totalPages, isCouple);
      currentPage++;

      // ===== PAGE 7: SIMULATION CHOICE (merged into Personal Info, see page 4) =====
      // generateSimulationChoice is no longer called as a separate page

      // ===== PAGE 8: RETIREMENT BENEFITS =====
      pageNumbers.benefits = currentPage;
      generateRetirementBenefits(pdf, scenarioData, enrichedUserData, language, currentPage, summaryData.totalPages);
      currentPage++;

      // ===== PAGE 9: DATA REVIEW =====
      pageNumbers.dataReview = currentPage;
      const allData = {
        income: incomes.filter(i => activeFilters[`income-${i.id || i.name}`]),
        assets: assets.filter(a => activeFilters[`asset-${a.id || a.name}`]),
        costs: costs.filter(c => activeFilters[`cost-${c.id || c.name}`]),
        debts: debts.filter(d => activeFilters[`debt-${d.id || d.name}`])
      };
      generateDataReview(pdf, allData, enrichedUserData, language, currentPage, summaryData.totalPages);
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
        <DetailedTooltipContent
          data={data}
          language={language}
          isPdf={false}
          p1Name={userData?.firstName}
          p2Name={userData?.firstName2}
        />
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
  // Use centralized helpers to recompose Total Wealth = (Baseline - NominalInvested) + MCInvested
  // The dashed baseline also uses the recomposed (Cash-Only) baseline.

  // Calculate isInvested BEFORE chartData useMemo (needed inside the useMemo)
  const isInvested = useMemo(() => hasInvestedBook(scenarioData, assets), [scenarioData, assets]);

  const chartData = useMemo(() => {
    if (!projection?.yearlyBreakdown) return [];

    // If no MC projections, just return raw baseline data
    if (!monteCarloProjections?.details) {
      return projection.yearlyBreakdown;
    }

    // Golden Recomposition Logic

    // [Phase 9b] Strict Timing Reference - Normalise via UTC context to avoid drift
    const simStartDate = toUtcMonthStart(monteCarloProjections.details.simulationStartDate);

    // [SIM START UTC CHECK] Hard validation for zero drift
    console.log("[SIM START UTC CHECK]", {
      raw: monteCarloProjections?.details?.simulationStartDate,
      normalizedISO: simStartDate.toISOString(),
      utcYear: simStartDate.getUTCFullYear(),
      utcMonth: simStartDate.getUTCMonth()
    });
    if (simStartDate.getUTCMonth() !== 0) {
      console.error("[UTC DRIFT DETECTED] simulationStartDate drifted from Jan to month", simStartDate.getUTCMonth(), {
        raw: monteCarloProjections?.details?.simulationStartDate,
        iso: simStartDate.toISOString()
      });
    }

    // [UI RECOMP META]
    const mcDetails = monteCarloProjections.details;
    const detSeries = mcDetails.detSeries;
    console.log("[UI RECOMP META]", {
      simStartDate: simStartDate.toISOString(),
      detSeriesLen: detSeries?.length,
      principalLen: mcDetails?.principalPath?.length,
      p5Len: mcDetails?.percentiles?.p5?.length
    });

    // [INDEX SAFETY] Calculate safe bounds with hardening
    const detLen = detSeries?.length ?? 0;
    const pLen = mcDetails?.principalPath?.length ?? detLen;
    const p5Len = mcDetails?.percentiles?.p5?.length ?? detLen;
    const p10Len = mcDetails?.percentiles?.p10?.length ?? detLen;

    // Early return if no data
    if (detLen === 0) {
      console.warn('[CHART DATA] No detSeries data, returning empty');
      return [];
    }

    // Prevent -1 by using Math.max(0, ...)
    const lastMonthlyIdx = Math.max(0, Math.min(detLen, pLen, p5Len, p10Len) - 1);

    // 2. Map Yearly Breakdown to these series
    return projection.yearlyBreakdown.map((row, index) => {
      const rowYear = parseInt(row.year);

      // Compute year-end index
      const computedYearEndIdx = getYearEndMonthIndex(simStartDate, rowYear);

      // Clamp to safe bounds (prevent negative and overflow)
      const safeIdx = Math.min(Math.max(0, computedYearEndIdx), lastMonthlyIdx);

      // GOLDEN DEFINITIONS EVALUATED AT safeIdx using pre-computed detSeries
      const mcDetails = monteCarloProjections.details;
      const detSeries = mcDetails.detSeries;

      const baseVal = calculateRecomposedBaselineAtIndex(mcDetails, detSeries, safeIdx);
      const rawMc50Val = calculateRecomposedTotalAtIndex(mcDetails, detSeries, safeIdx, 'p50');
      const rawMc25Val = calculateRecomposedTotalAtIndex(mcDetails, detSeries, safeIdx, 'p25');
      const rawMc10Val = calculateRecomposedTotalAtIndex(mcDetails, detSeries, safeIdx, 'p10');
      const rawMc5Val = calculateRecomposedTotalAtIndex(mcDetails, detSeries, safeIdx, 'p5');

      // [Phase 11] Force Numeric fallback (No more domain trimming)
      const mc50Val = Number.isFinite(rawMc50Val) ? rawMc50Val : baseVal;
      const mc25Val = Number.isFinite(rawMc25Val) ? rawMc25Val : baseVal;
      const mc10Val = Number.isFinite(rawMc10Val) ? rawMc10Val : baseVal;
      const mc5Val = Number.isFinite(rawMc5Val) ? rawMc5Val : baseVal;

      // [FINAL IDENTITY CHECK] + [YEAR-END CLAMP LOG]
      if (index === projection.yearlyBreakdown.length - 1) {
        const lastYear = rowYear;
        const P_end = mcDetails.principalPath ? mcDetails.principalPath[safeIdx] : 0;
        const expected_B_end = parseFloat(row.cumulativeBalance || 0) - P_end;

        console.log("[YEAR-END CLAMP]", {
          detLen,
          lastMonthlyIdx,
          computedYearEndIdx,
          safeIdx,
          baselineNonInv: Math.round(baseVal),
          investedP0: Math.round(P_end),
          baselineTotal: Math.round(baseVal + P_end)
        });

        console.log("[FINAL IDENTITY CHECK]", {
          lastYear,
          safeIdx,
          D_end: detSeries[safeIdx],
          P_end,
          B_end: baseVal,
          expected_B_end,
          projTotal_end: row.cumulativeBalance,
          pass: Math.abs(baseVal - expected_B_end) < 1
        });
      }

      // Trend & Color Logic (Preserved)
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

      // [YEAR-END SAMPLING PROBE] - Phase 8: Fixed arithmetic (total5 = mc5Val)
      if ([2048, 2049, 2050, 2051, 2052].includes(rowYear)) {
        const yearEndIdx = getYearEndMonthIndex(simStartDate, rowYear);
        const yearEndYM = monthIndexToYearMonth(simStartDate, yearEndIdx);
        const yearStartIdx = dateToMonthIndex(simStartDate, `${rowYear}-01-01`);
        const yearStartYM = monthIndexToYearMonth(simStartDate, yearStartIdx);

        const reportedInjections = mcDetails.reportedInjections || [];
        const injMonthIndex = reportedInjections[0]?.monthIndex;

        console.log("[YEAR-END SAMPLING PROBE]", {
          rowYear,
          yearEndIdx,
          yearEndYM,
          yearStartIdx,
          yearStartYM,
          injMonthIndex,
          P: Math.round(mcDetails.principalPath?.[safeIdx] || 0),
          D: Math.round(baseVal + (mcDetails.principalPath?.[safeIdx] || 0)),
          B: Math.round(baseVal),
          mc5Total: Math.round(mc5Val), // [Phase 8] mc5Val is already TOTAL wealth
          isPreInjection: (injMonthIndex !== undefined && safeIdx <= injMonthIndex)
        });
      }

      return {
        ...row,
        // OVERWRITE cumulativeBalance for the dashed line
        // In invested mode: Total Baseline (NonInvWealth + InvestedP0)
        // In non-invested mode: Cash-Only Baseline (NonInvWealth)
        cumulativeBalance: isInvested
          ? baseVal + (mcDetails.principalPath?.[safeIdx] || 0)
          : baseVal,
        incomeColors: getColors(row.incomeBreakdown || {}, prevRow?.incomeBreakdown || {}, 'income', '#22c55e'),
        activatedOwingsColors: getColors(row.activatedOwingsBreakdown || {}, prevRow?.activatedOwingsBreakdown || {}, 'activatedOwnings', '#ec4899'),
        costColors: getColors(row.costBreakdown || {}, prevRow?.costBreakdown || {}, 'negCosts', '#ef4444'),
        mc50: mc50Val,
        mc25: mc25Val,
        mc10: mc10Val,
        mc5: mc5Val,
        mc5_realized: mcDetails.realizedPercentiles?.p5?.[safeIdx] || 0,
        mc5_invested: mcDetails.investedPercentiles?.p5?.[safeIdx] || 0
      };
    });

    // [BASELINE SERIES SELECTED] Log once to verify correct mapping
    if (mapped.length > 0) {
      const lastIdx = projection.yearlyBreakdown.length - 1;
      const lastComputedIdx = getYearEndMonthIndex(simStartDate, parseInt(projection.yearlyBreakdown[lastIdx].year));
      const lastSafeIdx = Math.min(Math.max(0, lastComputedIdx), lastMonthlyIdx);
      const lastBaseVal = calculateRecomposedBaselineAtIndex(mcDetails, detSeries, lastSafeIdx);
      const lastPrincipal = mcDetails.principalPath?.[lastSafeIdx] || 0;
      const lastBaselineTotal = lastBaseVal + lastPrincipal;

      console.log('[BASELINE SERIES SELECTED]', {
        mode: isInvested ? 'invested' : 'nonInvested',
        baselineKey: isInvested ? 'baselineTotal (NonInvWealth + InvestedP0)' : 'baseVal (NonInvWealth)',
        lastBaselineValue: isInvested ? Math.round(lastBaselineTotal) : Math.round(lastBaseVal),
        lastNonInvWealth: Math.round(lastBaseVal),
        lastInvestedP0: Math.round(lastPrincipal)
      });
    }

    // [MC SERIES AUDIT]
    const auditData = mapped;
    const firstYear = auditData[0]?.year;
    const lastYear = auditData.at(-1)?.year;
    const count = auditData.length;
    const earliestFiniteMC5Year = auditData.find(r => Number.isFinite(r.mc5))?.year;
    const earliestDivergenceYear = auditData.find(r => Number.isFinite(r.mc5) && Math.abs(r.mc5 - r.cumulativeBalance) > 1)?.year;
    const holes = auditData.filter(r => r.mc5 === undefined || r.mc5 === null || isNaN(r.mc5)).length;

    console.log("[MC SERIES AUDIT]", {
      firstYear, lastYear, count,
      earliestFiniteMC5Year,
      earliestDivergenceYear,
      holes,
      sampleFirst3: auditData.slice(0, 3).map(r => ({ year: r.year, base: r.cumulativeBalance, mc5: r.mc5, mc10: r.mc10, mc25: r.mc25 })),
      sampleAround2049: auditData.filter(r => [2047, 2048, 2049, 2050].includes(r.year)).map(r => ({ year: r.year, base: r.cumulativeBalance, mc5: r.mc5, mc10: r.mc10, mc25: r.mc25 }))
    });

    return auditData;
  }, [projection, monteCarloProjections, showTrendHighlight, scenarioData, assets]);

  const finalChartRow = chartData && chartData.length > 0 ? chartData[chartData.length - 1] : null;

  // RULE 3: Baseline Consistency
  // finalBaselineBalance MUST match the chart's recomposed baseline B(t) when investments exist.
  const finalBaselineBalance = (isInvested && finalChartRow) ? finalChartRow.cumulativeBalance : projection.finalBalance;

  // POLISH: Ensure undefined mc5 becomes null, not undefined, to avoid Math.round(undefined) -> NaN
  const final5Balance = (isInvested && finalChartRow && finalChartRow.mc5 !== undefined) ? finalChartRow.mc5 : null;

  // [UI Baseline Consistency] dev-only probe
  if (chartData && chartData.length > 0) {
    console.log("[UI Baseline Consistency]", {
      isInvested,
      chartBaselineFinal: chartData.at(-1)?.cumulativeBalance,
      projectionFinalBalance: projection?.finalBalance,
      baselineCardValue: finalBaselineBalance
    });
  }

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
    const isCouple = userData?.analysisType === 'couple';
    const option = scenarioData?.retirementOption || 'option1';

    // Person 1
    const defaultDateStr = location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate;
    let retireDate1;
    if (option === 'option2' && retirementAge) {
      const birthDate = new Date(userData?.birthDate);
      const years = Math.floor(retirementAge);
      const months = Math.round((retirementAge - years) * 12);
      retireDate1 = new Date(Date.UTC(birthDate.getUTCFullYear() + years, birthDate.getUTCMonth() + months + 1, 1, 0, 0, 0, 0));
    } else if (option === 'option3' && projection?.simRetirementDate) {
      retireDate1 = new Date(projection.simRetirementDate);
    } else {
      retireDate1 = new Date(defaultDateStr);
    }

    let ageYears1 = 0, ageMonths1 = 0;
    if (option === 'option2' && retirementAge) {
      ageYears1 = Math.floor(retirementAge);
      ageMonths1 = Math.round((retirementAge - ageYears1) * 12);
    } else if (userData?.birthDate && retireDate1) {
      const birth = new Date(userData.birthDate);
      const diffTime = Math.abs(retireDate1 - birth);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      ageYears1 = Math.floor(diffDays / 365.25);
      ageMonths1 = Math.floor((diffDays % 365.25) / 30.44);
    }

    // Person 2
    let retireDate2 = null, ageYears2 = 0, ageMonths2 = 0;
    if (isCouple) {
      const defaultDateStr2 = location.state?.wishedRetirementDate2 || scenarioData?.wishedRetirementDate2;

      if (option === 'option2' && retirementAge2) {
        const birthDate2 = new Date(userData?.birthDate2);
        const years = Math.floor(retirementAge2);
        const months = Math.round((retirementAge2 - years) * 12);
        retireDate2 = new Date(Date.UTC(birthDate2.getUTCFullYear() + years, birthDate2.getUTCMonth() + months + 1, 1, 0, 0, 0, 0));
      } else {
        retireDate2 = new Date(defaultDateStr2);
      }

      if (userData?.birthDate2 && retireDate2) {
        const birth2 = new Date(userData.birthDate2);
        const diffTime = Math.abs(retireDate2 - birth2);
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        ageYears2 = Math.floor(diffDays / 365.25);
        ageMonths2 = Math.floor((diffDays % 365.25) / 30.44);
      }
    }

    return {
      date: retireDate1,
      dateStr: !isNaN(retireDate1.getTime()) ? retireDate1.toLocaleDateString('de-CH') : '',
      ageYears: ageYears1,
      ageMonths: ageMonths1,
      date2: retireDate2,
      dateStr2: (retireDate2 && !isNaN(retireDate2.getTime())) ? retireDate2.toLocaleDateString('de-CH') : '',
      ageYears2,
      ageMonths2,
      option,
      isCouple
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
      const displayName = name.split('@@')[0];
      const segmentFill = (colorMap && colorMap[displayName]) ? colorMap[displayName] : baseFill;

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

  const handleNavigateToInvestFlow = () => {
    if (!monteCarloProjections || !monteCarloProjections.details) {
      toast.error(language === 'fr' ? 'Veuillez lancer la simulation Monte Carlo d\'abord' : 'Please run Monte Carlo simulation first');
      return;
    }

    // Prepare data for serialization
    const deepArrayFrom = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (obj instanceof Float64Array || obj instanceof Float32Array) return Array.from(obj);
      if (Array.isArray(obj)) return obj.map(deepArrayFrom);
      const res = {};
      for (let k in obj) res[k] = deepArrayFrom(obj[k]);
      return res;
    };

    const serializableDetails = deepArrayFrom(monteCarloProjections.details);

    // Re-calculate simulation start date logic to pass correct context
    const firstProjYear = projection?.yearlyBreakdown?.[0]?.year;
    const startYear = firstProjYear ? parseInt(firstProjYear) : new Date().getUTCFullYear();
    const simStartDate = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0, 0)).toISOString();

    navigate('/invest-flow-graph', {
      state: {
        // Pass context for "Back" button to work smoothly
        // We reuse the current location state to preserve previous context
        ...location.state,
        monteCarloDetails: serializableDetails,
        simulationStartDate: simStartDate,
      }
    });
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
              onClick={() => {
                const isCouple = userData.analysisType === 'couple';
                const summaryData = {
                  finalBalance: finalBaselineBalance,
                  peakWealth: Math.max(...chartData.map(d => d.cumulativeBalance || 0)),
                  retirementAge: `${retirementInfo.ageYears}y ${retirementInfo.ageMonths}m`,
                  yearsInRetirement: chartData.filter(d => d.year >= retirementInfo.date.getFullYear()).length,
                  deathDate: userData.theoreticalDeathDate,
                  firstName: userData.firstName,
                  firstName2: userData.firstName2,
                  isCouple,
                  totalPages: 14 // Initial guess
                };

                if (isCouple) {
                  summaryData.retirementAge2 = `${retirementInfo.ageYears2}y ${retirementInfo.ageMonths2}m`;
                  summaryData.yearsInRetirement2 = chartData.filter(d => d.year >= retirementInfo.date2.getFullYear()).length;
                  summaryData.deathDate2 = userData.theoreticalDeathDate2;
                }
                navigate('/detailed-graph', {
                  state: {
                    yearlyData: chartData,
                    summaryData: summaryData,
                    retirementDate: retirementInfo.date,
                    retirementAge: retirementInfo.ageYears,
                    retirementDate2: retirementInfo.date2,
                    retirementAge2: retirementInfo.ageYears2,
                    focusYears: pdfFocusYears
                  }
                });
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <LineChartIcon className="h-4 w-4" />
              {language === 'fr' ? 'Graphique détaillé' : 'Detailed graph'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNavigateToInvestFlow}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              {language === 'fr' ? 'Graph Flux invest' : 'Invest Flow graph'}
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
              onClick={() => {
                // Ensure typed arrays are converted for serialization (fixes NaN issues in Details page)
                const deepArrayFrom = (obj) => {
                  if (!obj || typeof obj !== 'object') return obj;
                  if (obj instanceof Float64Array || obj instanceof Float32Array) return Array.from(obj);
                  if (Array.isArray(obj)) return obj.map(deepArrayFrom);
                  const res = {};
                  for (let k in obj) res[k] = deepArrayFrom(obj[k]);
                  return res;
                };
                const serializableProjections = deepArrayFrom(monteCarloProjections);
                navigate('/monte-carlo-details', { state: { mcProjections: serializableProjections } });
              }}
              variant="outline"
              size="sm"
              disabled={!isInvested || !monteCarloProjections}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              {language === 'fr' ? 'Détails MC' : 'MC Details'}
            </Button>
            <Button
              onClick={handleShowData}
              variant="outline"
              size="sm"
              disabled={isInvested ? !monteCarloProjections?.details : !projection?.yearlyBreakdown}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {language === 'fr' ? 'Données mensuelles' : 'Monthly Data'}
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
                {retirementInfo.isCouple ? (
                  language === 'fr'
                    ? `Retraite: ${userData.firstName || 'P1'} (${retirementInfo.dateStr}, ${retirementInfo.ageYears} ans) & ${userData.firstName2 || 'P2'} (${retirementInfo.dateStr2}, ${retirementInfo.ageYears2} ans)`
                    : `Retirement: ${userData.firstName || 'P1'} (${retirementInfo.dateStr}, ${retirementInfo.ageYears}y) & ${userData.firstName2 || 'P2'} (${retirementInfo.dateStr2}, ${retirementInfo.ageYears2}y)`
                ) : (
                  language === 'fr'
                    ? `Simulation à la date de retraite choisie le ${retirementInfo.dateStr} (${retirementInfo.ageYears} ans)`
                    : `Simulation at chosen retirement date ${retirementInfo.dateStr} (${retirementInfo.ageYears} years old)`
                )}
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

          {/* Box 5: Dual Retirement Age Selectors */}
          <div className="col-span-4">
            <Card className="h-full border-b-4 border-b-primary/10">
              <CardHeader className="py-3">
                <CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  {language === 'fr' ? 'Âges de retraite' : 'Retirement Ages'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex flex-col gap-4">
                  {/* P1 Selector */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-muted transition-all hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full border-2 border-blue-500/50 bg-blue-500/10 text-blue-600">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1')}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{language === 'fr' ? 'Âge actuel' : 'Current Age'}: {retirementInfo.ageYears}y</span>
                      </div>
                    </div>
                    <Select
                      value={String(Math.floor(retirementAge || 65))}
                      onValueChange={(val) => synchronizeSimulationState('p1', Number(val))}
                      disabled={isRecalculating}
                    >
                      <SelectTrigger className="w-24 h-9 font-bold bg-background border-blue-500/20 focus:ring-blue-500">
                        <SelectValue placeholder="Age" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => 58 + i).map(age => (
                          <SelectItem key={age} value={String(age)}>{age} {language === 'fr' ? 'ans' : 'y'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* P2 Selector (Only if couple) */}
                  {(userData?.analysisType === 'couple' || userData?.analysisType === 'couple_standard') && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-muted transition-all hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full border-2 border-purple-500/50 bg-purple-500/10 text-purple-600">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2')}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{language === 'fr' ? 'Âge actuel' : 'Current Age'}: {retirementInfo.ageYears2}y</span>
                        </div>
                      </div>
                      <Select
                        value={String(Math.floor(retirementAge2 || 65))}
                        onValueChange={(val) => synchronizeSimulationState('p2', Number(val))}
                        disabled={isRecalculating}
                      >
                        <SelectTrigger className="w-24 h-9 font-bold bg-background border-purple-500/20 focus:ring-purple-500">
                          <SelectValue placeholder="Age" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 13 }, (_, i) => 58 + i).map(age => (
                            <SelectItem key={age} value={String(age)}>{age} {language === 'fr' ? 'ans' : 'y'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* MIDDLE SECTION: Box 8 (Graph) */}
        <div className="mb-6">
          <Card className="h-[600px]">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold">
                {language === 'fr' ? 'Projection Financière en CHF' : 'Financial Projection in CHF'}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {language === 'fr' ? '(Valeurs de fin d\'année)' : '(Year-End Values)'}*
                </span>
              </CardTitle>
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

                  {/* Retirement Date Markers & Death Date Marker */}
                  {(() => {
                    const d1 = retirementInfo.date;
                    const d2 = retirementInfo.date2;
                    const isCouple = userData?.analysisType === 'couple';

                    // Determine positioning for retirement labels
                    const p1IsEarlier = !isCouple || !d2 || d1 <= d2;

                    // Calculate earliest death date
                    const death1 = userData?.theoreticalDeathDate ? new Date(userData.theoreticalDeathDate) : null;
                    const death2 = (isCouple && userData?.theoreticalDeathDate2) ? new Date(userData.theoreticalDeathDate2) : null;

                    let firstDeathDate = null;
                    let firstDeathPerson = null;

                    if (death1 && !isNaN(death1.getTime())) {
                      firstDeathDate = death1;
                      firstDeathPerson = 'p1';
                    }

                    if (death2 && !isNaN(death2.getTime())) {
                      if (!firstDeathDate || death2 < firstDeathDate) {
                        firstDeathDate = death2;
                        firstDeathPerson = 'p2';
                      }
                    }

                    return (
                      <>
                        {d1 && (
                          <ReferenceLine
                            x={d1.getUTCFullYear()}
                            stroke="#3b82f6"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            label={{
                              value: `${language === 'fr' ? 'Retraite' : 'Retirement'} ${userData?.firstName || 'Max'} (${retirementInfo.ageYears}${language === 'fr' ? ' ans' : 'y'})`,
                              position: p1IsEarlier ? 'insideTopLeft' : 'insideTopRight',
                              fill: '#3b82f6',
                              fontSize: 12,
                              fontWeight: 'bold',
                              dy: 10,
                              dx: p1IsEarlier ? -5 : 5,
                              textAnchor: p1IsEarlier ? 'end' : 'start'
                            }}
                          />
                        )}
                        {isCouple && d2 && (
                          <ReferenceLine
                            x={d2.getUTCFullYear()}
                            stroke="#a855f7"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            label={{
                              value: `${language === 'fr' ? 'Retraite' : 'Retirement'} ${userData?.firstName2 || 'Mary'} (${retirementInfo.ageYears2}${language === 'fr' ? ' ans' : 'y'})`,
                              position: !p1IsEarlier ? 'insideTopLeft' : 'insideTopRight',
                              fill: '#a855f7',
                              fontSize: 12,
                              fontWeight: 'bold',
                              dy: 10,
                              dx: !p1IsEarlier ? -5 : 5,
                              textAnchor: !p1IsEarlier ? 'end' : 'start'
                            }}
                          />
                        )}
                        {/* Death Date Reference Line - ONLY for Couples */}
                        {isCouple && firstDeathDate && (
                          <ReferenceLine
                            x={firstDeathDate.getUTCFullYear()}
                            stroke={firstDeathPerson === 'p1' ? '#3b82f6' : '#a855f7'}
                            strokeWidth={3}
                            label={{
                              value: `${language === 'fr' ? 'espérance de vie de' : 'life expectancy of'} ${firstDeathPerson === 'p1' ? (userData?.firstName || 'Max') : (userData?.firstName2 || 'Mary')}`,
                              position: 'insideBottomRight',
                              fill: firstDeathPerson === 'p1' ? '#3b82f6' : '#a855f7',
                              fontSize: 13,
                              fontWeight: '900',
                              dy: -20,
                              dx: 5,
                              textAnchor: 'start'
                            }}
                          />
                        )}
                      </>
                    );
                  })()}
                  <XAxis
                    dataKey="year"
                    interval={0}
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#FFFFFF' }}
                    dy={10}
                  />
                  <YAxis
                    hide={false}
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#FFFFFF' }}
                    tickFormatter={(val) => val === 0 ? "0" : `${(val / 1000).toFixed(0)}k`}
                  />
                  <ReferenceLine y={0} stroke="#FFFFFF" strokeWidth={2} />
                  {!generatingPdf && <Tooltip content={<CustomTooltip />} />}

                  {showBaseline && (
                    <Area
                      type="linear"
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

                  {/* [Phase 8] MC Lines - Simplified gating and explicit Total Wealth semantics */}
                  {isInvested && monteCarloProjections?.details && (
                    <>
                      {show25thPercentile && (
                        <Line type="linear" dataKey="mc25" stroke="#f59e0b" strokeWidth={2} dot={false} name={language === 'fr' ? 'Monte Carlo 25%' : '25% (Conservative)'}
                          label={(props) => {
                            const { x, y, value, index } = props;
                            if (chartData && index === chartData.length - 1) {
                              return <text x={x} y={y} dx={10} dy={4} fill="#f59e0b" fontSize={16} fontWeight="bold" textAnchor="start">{Math.round(value).toLocaleString('de-CH')}</text>;
                            }
                            return null;
                          }}
                        />
                      )}
                      {show10thPercentile && (
                        <Line type="linear" dataKey="mc10" stroke="#9333ea" strokeWidth={2} dot={false} name={language === 'fr' ? 'Monte Carlo 10% (Pessimiste)' : '10% (Pessimistic)'}
                          label={(props) => {
                            const { x, y, value, index } = props;
                            if (chartData && index === chartData.length - 1) {
                              return <text x={x} y={y} dx={10} dy={4} fill="#9333ea" fontSize={16} fontWeight="bold" textAnchor="start">{Math.round(value).toLocaleString('de-CH')}</text>;
                            }
                            return null;
                          }}
                        />
                      )}
                      {show5thPercentile && (
                        <Line type="linear" dataKey="mc5" stroke="url(#splitColorMC5)" strokeWidth={2} dot={false} name={language === 'fr' ? 'Monte Carlo 5% (Très Pessimiste)' : '5% (Very Pessimistic)'}
                          label={(props) => {
                            const { x, y, value, index } = props;
                            if (chartData && index === chartData.length - 1) {
                              return <text x={x} y={y} dx={10} dy={4} fill={value >= 0 ? "#10b981" : "#ef4444"} fontSize={16} fontWeight="bold" textAnchor="start">{Math.round(value).toLocaleString('de-CH')}</text>;
                            }
                            return null;
                          }}
                        />
                      )}
                    </>
                  )}

                  <Bar dataKey="income" barSize={11} fill="#22c55e" name={language === 'fr' ? 'Revenus annuels' : 'Annual Income'} stackId="bars" shape={<CustomBarShape />} />
                  <Bar dataKey="activatedOwnings" barSize={11} fill="#ec4899" name={language === 'fr' ? 'Avoirs activés' : 'Activated Ownings'} stackId="bars" shape={<CustomBarShape />} />
                  <Bar dataKey="negCosts" barSize={11} fill="#ef4444" name={language === 'fr' ? 'Dépenses annuelles' : 'Annual Costs'} stackId="bars" shape={<CustomBarShape />} />

                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
            <div className="px-6 pb-4 text-[10px] text-muted-foreground italic">
              {language === 'fr'
                ? "* Les valeurs P5/P10 investies sont des valeurs de fin d'année (après évolution du marché)."
                : "* Invested P5/P10 shown as end-of-year values after market evolution."}
            </div>
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
                        const endDate = asset.endDate || deathDateStr;

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
                  <Button variant="link" size="sm" onClick={() => navigate('/capital-setup')} className="text-primary text-xs flex items-center gap-2">
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
            <DialogTitle>
              {language === 'fr' ? 'Données Manquantes' : 'Missing Data'} - {missingDataDialog.personId === 'p2' ? (language === 'fr' ? 'Mary' : 'Mary') : (language === 'fr' ? 'Max' : 'Max')}
            </DialogTitle>
            <DialogDescription>
              {missingDataDialog.type === 'pension'
                ? (language === 'fr'
                  ? `Pour simuler une retraite à ${missingDataDialog.age} ans pour ${missingDataDialog.personId === 'p2' ? 'Mary' : 'Max'}, nous avons besoin de la rente LPP projetée.`
                  : `To simulate retirement at ${missingDataDialog.age} for ${missingDataDialog.personId === 'p2' ? 'Mary' : 'Max'}, we need the Projected LPP Pension.`)
                : (language === 'fr'
                  ? `Pour une retraite anticipée de ${missingDataDialog.personId === 'p2' ? 'Mary' : 'Max'}, nous avons besoin du capital LPP actuel.`
                  : `To simulate early retirement for ${missingDataDialog.personId === 'p2' ? 'Mary' : 'Max'}, we need the LPP Current Capital.`)
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
            retirementDate={retirementInfo.date}
            retirementAge={retirementInfo.ageYears}
            retirementDate2={retirementInfo.date2}
            retirementAge2={retirementInfo.ageYears2}
            language={language}
            isPdf={true}
            focusYears={pdfFocusYears}
            showMC50={pdfGraphOptions.showMC50}
            showMC25={pdfGraphOptions.showMC25}
            showMC10={pdfGraphOptions.showMC10}
            showMC5={pdfGraphOptions.showMC5}
            showActivatedOwnings={pdfGraphOptions.showActivatedOwnings}
            p1Name={userData?.firstName}
            p2Name={userData?.firstName2}
            deathDate={userData?.theoreticalDeathDate}
            deathDate2={userData?.theoreticalDeathDate2}
            isCouple={userData?.analysisType === 'couple'}
          />
        )}
      </div>
    </div >
  );
};

export default ScenarioResult;
