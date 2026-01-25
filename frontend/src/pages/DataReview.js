
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';

import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Slider } from '../components/ui/slider';
import { Checkbox } from '../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { getIncomeData, getCostData, getUserData, getScenarioData, saveScenarioData, getRetirementData, getAssetsData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import { Calendar, Minus, Trash2, Split, Plus, TrendingUp, Lightbulb, Copy } from 'lucide-react';

// Income name translation keys
const INCOME_KEYS = {
  'Salary': 'salary',
  'Net Salary': 'salary',
  'AVS': 'avs',
  'LPP': 'lpp',
  '3a': '3a'
};

// Cost name translation keys
const COST_KEYS = {
  'Rent/Mortgage': 'rentMortgage',
  'Taxes': 'taxes',
  'Health insurance': 'healthInsurance',
  'Food': 'food',
  'Clothing': 'clothing',
  'Private transportation': 'privateTransport',
  'Public transportation': 'publicTransport',
  'TV/Internet/Phone': 'tvInternetPhone',
  'Restaurants': 'restaurants',
  'Vacation': 'vacation'
};

// Frequency translation helper
const getTranslatedFrequency = (frequency, t) => {
  switch (frequency) {
    case 'Monthly':
      return t('scenario.frequencyMonthly');
    case 'Yearly':
      return t('scenario.frequencyYearly');
    case 'One-time':
      return t('scenario.frequencyOneTime');
    default:
      return frequency;
  }
};

const DataReview = () => {
  const navigate = useNavigate();
  const { user, masterKey } = useAuth();
  const { t, language } = useLanguage();
  const [wishedRetirementDate, setWishedRetirementDate] = useState('');
  const [retirementLegalDate, setRetirementLegalDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [incomes, setIncomes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [retirementData, setRetirementData] = useState(null);
  const [liquidAssets, setLiquidAssets] = useState('');
  const [nonLiquidAssets, setNonLiquidAssets] = useState('');
  const [futureInflows, setFutureInflows] = useState([]);
  const [currentAssets, setCurrentAssets] = useState([]);
  const [desiredOutflows, setDesiredOutflows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustRows, setAdjustRows] = useState([]);

  // Initialize modal data
  const openAdjustModal = () => {
    const targetCostKeys = ['Vacation', 'Private transportation']; // English keys from COST_KEYS

    const newRows = targetCostKeys.map(englishKey => {
      const translationKey = COST_KEYS[englishKey];
      const translatedName = t(`costs.costNames.${translationKey}`);

      // Find cost by its original English name or its translated name
      const cost = costs.find(c =>
        c.name === englishKey ||
        c.name === translatedName ||
        (c.name && c.name.startsWith('costs.costNames.') && t(c.name) === translatedName)
      );

      if (cost) {
        const currentAmount = parseFloat(cost.amount || 0);
        const adjustedAmount = parseFloat(cost.adjustedAmount || cost.amount || 0);
        return {
          id: cost.id, // Assuming costs have unique IDs
          name: getCostName(cost.name), // Display translated name
          originalAmount: currentAmount,
          frequency: cost.frequency,
          adjustedAmount: adjustedAmount,
          changeAtAge: parseFloat(cost.changeAtAge || 75), // Default age
          checked: false
        };
      }
      return null;
    }).filter(Boolean);

    setAdjustRows(newRows);
    setShowAdjustModal(true);
  };

  const handleAdjustRowChange = (id, field, value) => {
    setAdjustRows(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // Apply changes to actual costs
  const applyTableAdjustments = () => {
    let updatedCosts = [...costs];
    const bDateObj = new Date(birthDate);

    adjustRows.forEach(row => {
      const originalIndex = updatedCosts.findIndex(c => c.id === row.id);
      if (originalIndex === -1) return;
      const originalCost = updatedCosts[originalIndex];

      if (row.checked) {
        // SPLIT LOGIC
        const splitAge = row.changeAtAge;
        const splitYear = bDateObj.getFullYear() + splitAge;

        // Construct date object
        const splitDateObj = new Date(splitYear, bDateObj.getMonth(), bDateObj.getDate());

        // Format as YYYY-MM-DD (ISO) for state consistency and Input[type="date"]
        const day = String(splitDateObj.getDate()).padStart(2, '0');
        const month = String(splitDateObj.getMonth() + 1).padStart(2, '0');
        const year = splitDateObj.getFullYear();
        const splitDateStr = `${year}-${month}-${day}`;

        // Define Group ID for Split Visualization on BOTH parent and child
        const groupId = originalCost.groupId || originalCost.id;

        // 1. Update End Date of Original Item AND Assign Group ID
        const modifiedOriginal = {
          ...originalCost,
          endDate: splitDateStr,
          groupId: groupId
        };

        // 2. Create New Cost Item for the Split Period
        const newSplitCost = {
          ...originalCost,
          id: `${originalCost.id}-split-${Date.now()}`,
          parentId: originalCost.id, // Link to parent to trigger "split" icon/logic
          groupId: groupId, // Group with parent for visual grouping
          name: originalCost.name,
          startDate: splitDateStr,
          endDate: originalCost.endDate,
          amount: originalCost.amount, // Inherit usage of original amount as base
          adjustedAmount: row.adjustedAmount, // New adjusted amount
          isSplit: true
        };

        updatedCosts[originalIndex] = modifiedOriginal;
        // Insert right after original for visual continuity
        updatedCosts.splice(originalIndex + 1, 0, newSplitCost);

      } else {
        // GLOBAL UPDATE LOGIC
        updatedCosts[originalIndex] = {
          ...originalCost,
          adjustedAmount: row.adjustedAmount
        };
      }
    });

    setCosts(updatedCosts);
    setShowAdjustModal(false);
    toast.success(language === 'fr' ? 'Ajustements appliqués' : 'Adjustments applied');
  };

  // Retirement option: 'option1', 'option2', or 'option3'
  const [retirementOption, setRetirementOption] = useState('option1');

  // Option 1 fields
  const [pensionCapital, setPensionCapital] = useState('');
  const [yearlyReturn, setYearlyReturn] = useState('0');

  // Option 2 fields
  const [earlyRetirementAge, setEarlyRetirementAge] = useState('62');
  const [projectedLPPPension, setProjectedLPPPension] = useState('');
  const [projectedLPPCapital, setProjectedLPPCapital] = useState('');

  // Track date overrides for standard income sources
  const [incomeDateOverrides, setIncomeDateOverrides] = useState({});

  // Get translated income name
  const getIncomeName = (englishName) => {
    // Check if it's a known key in our mapping
    const key = INCOME_KEYS[englishName];
    if (key) {
      return t(`income.${key}`);
    }

    // Check if it's already a translation key
    if (englishName && typeof englishName === 'string' && englishName.startsWith('income.')) {
      return t(englishName);
    }

    return englishName;
  };

  // Get translated cost name
  const getCostName = (englishName) => {
    // Check if it's a known key in our mapping
    const key = COST_KEYS[englishName];
    if (key) {
      return t(`costs.costNames.${key}`);
    }

    // Check if it's already a translation key (which seems to be how data is stored now)
    if (englishName && typeof englishName === 'string' && englishName.startsWith('costs.costNames.')) {
      return t(englishName);
    }

    return englishName;
  };

  useEffect(() => {
    if (!user || !masterKey) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        const userData = await getUserData(user.email, masterKey);
        const incomeData = await getIncomeData(user.email, masterKey) || [];
        const costData = await getCostData(user.email, masterKey) || [];
        const scenarioData = await getScenarioData(user.email, masterKey);
        const rData = await getRetirementData(user.email, masterKey);
        setRetirementData(rData);

        if (!userData) {
          navigate('/personal-info');
          return;
        }

        // Calculate dates
        const birthDate = new Date(userData.birthDate);
        setBirthDate(userData.birthDate);
        const retirementDate = new Date(birthDate);
        retirementDate.setFullYear(retirementDate.getFullYear() + 65);
        retirementDate.setMonth(retirementDate.getMonth() + 1);
        const retirementDateStr = retirementDate.toISOString().split('T')[0];

        // Use the theoretical death date from API
        let deathDateStr;
        if (userData.theoreticalDeathDate) {
          deathDateStr = userData.theoreticalDeathDate;
        } else {
          // Fallback to approximation if not available
          const approximateLifeExpectancy = userData.gender === 'male' ? 80 : 85;
          const deathDate = new Date(birthDate);
          deathDate.setFullYear(deathDate.getFullYear() + approximateLifeExpectancy);
          deathDateStr = deathDate.toISOString().split('T')[0];
        }

        setRetirementLegalDate(retirementDateStr);
        setWishedRetirementDate(scenarioData?.wishedRetirementDate || retirementDateStr);
        setRetirementOption(scenarioData?.retirementOption || 'option1');
        setDeathDate(deathDateStr);

        // Load assets data from assetsData store

        const assetsData = await getAssetsData(user.email, masterKey);
        if (assetsData) {
          // Calculate liquid and non-liquid assets from currentAssets (New Structure)
          const sourceAssets = assetsData.currentAssets || [];

          const liquidTotal = sourceAssets
            .filter(row => row.category === 'Liquid')
            .reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

          const illiquidTotal = sourceAssets
            .filter(row => row.category === 'Illiquid')
            .reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

          setLiquidAssets(liquidTotal.toString());
          setNonLiquidAssets(illiquidTotal.toString());

          setFutureInflows(assetsData.futureInflows || []);

          // Load current assets and desired outflows for display
          // Load current assets and desired outflows for display
          // Prioritize scenarioData overrides if they exist
          let loadedCurrentAssets = (scenarioData && scenarioData.currentAssets && scenarioData.currentAssets.length > 0)
            ? scenarioData.currentAssets
            : (assetsData.currentAssets || []);


          const option = scenarioData.retirementOption || 'option1';

          // Option 0: Inject Legal LPP Capital as an asset (One-time) if selected
          if (option === 'option0' && scenarioData.projectedLegalLPPCapital) {
            const existingIndex = loadedCurrentAssets.findIndex(a => a.id === 'projected_legal_lpp_capital');

            const legalAsset = {
              id: 'projected_legal_lpp_capital',
              name: 'Projected LPP Capital at 65y',
              amount: scenarioData.projectedLegalLPPCapital,
              adjustedAmount: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].adjustedAmount : scenarioData.projectedLegalLPPCapital,
              category: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].category : 'Illiquid',
              preserve: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].preserve : 'No',
              availabilityType: 'Date',
              availabilityDate: retirementDateStr,
              strategy: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].strategy : 'Cash',
              isOption0: true
            };

            if (existingIndex >= 0) {
              const newAssets = [...loadedCurrentAssets];
              newAssets.splice(existingIndex, 1);
              loadedCurrentAssets = [legalAsset, ...newAssets];
            } else {
              loadedCurrentAssets = [legalAsset, ...loadedCurrentAssets];
            }
          }

          // Option 2: Inject Projected Early LPP Capital as an asset if selected
          if (option === 'option2' && scenarioData.projectedLPPCapital) {
            const existingIndex = loadedCurrentAssets.findIndex(a => a.id === 'projected_lpp_capital');

            // Recalculate date for asset as well
            let earlyRetirementDateStr = retirementDateStr;
            if (scenarioData.earlyRetirementAge && userData.birthDate) {
              const bDate = new Date(userData.birthDate);
              const earlyRetDate = new Date(bDate);
              earlyRetDate.setFullYear(earlyRetDate.getFullYear() + parseInt(scenarioData.earlyRetirementAge));
              earlyRetDate.setDate(1);
              earlyRetDate.setMonth(earlyRetDate.getMonth() + 1);
              earlyRetirementDateStr = earlyRetDate.toISOString().split('T')[0];
            }

            const option2Asset = {
              id: 'projected_lpp_capital',
              name: `Projected LPP Capital at ${scenarioData.earlyRetirementAge} y`,
              amount: scenarioData.projectedLPPCapital,
              adjustedAmount: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].adjustedAmount : scenarioData.projectedLPPCapital,
              category: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].category : 'Illiquid',
              preserve: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].preserve : 'No',
              availabilityType: 'Date',
              availabilityDate: earlyRetirementDateStr, // Use Calculated Early Date
              strategy: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].strategy : 'Cash',
              isOption2: true
            };

            if (existingIndex >= 0) {
              const newAssets = [...loadedCurrentAssets];
              newAssets.splice(existingIndex, 1);
              loadedCurrentAssets = [option2Asset, ...newAssets];
            } else {
              loadedCurrentAssets = [option2Asset, ...loadedCurrentAssets];
            }
          }

          // Move 3a and Supplementary Pension capital from scenarioData.benefitsData to Assets
          if (scenarioData && scenarioData.benefitsData) {
            const oneTimeItems = [];

            // 1. Check for 3a from benefitsData
            if (scenarioData.benefitsData.threeA) {
              if (Array.isArray(scenarioData.benefitsData.threeA)) {
                scenarioData.benefitsData.threeA.forEach((item, index) => {
                  if (item.amount) {
                    oneTimeItems.push({
                      id: `3a_account_${index}`,
                      name: `3a (${index + 1})`,
                      amount: item.amount,
                      startDate: item.startDate || wishedRetirementDate,
                      frequency: 'One-time'
                    });
                  }
                });
              } else if (scenarioData.benefitsData.threeA.amount) {
                // Fallback for legacy single object
                oneTimeItems.push({
                  id: '3a',
                  name: '3a',
                  amount: scenarioData.benefitsData.threeA.amount,
                  startDate: scenarioData.benefitsData.threeA.startDate || wishedRetirementDate,
                  frequency: 'One-time'
                });
              }
            }

            // 2. Check for Supplementary Pension capital from benefitsData
            if (scenarioData.benefitsData.lppSup && scenarioData.benefitsData.lppSup.amount) {
              oneTimeItems.push({
                id: 'lppSup',
                name: 'Supplementary Pension capital',
                amount: scenarioData.benefitsData.lppSup.amount,
                startDate: scenarioData.benefitsData.lppSup.startDate || wishedRetirementDate,
                frequency: 'One-time'
              });
            }

            // Process and inject them
            oneTimeItems.forEach(item => {
              const existingIndex = loadedCurrentAssets.findIndex(a => a.id === item.id);

              const assetItem = {
                id: item.id,
                name: item.name,
                amount: item.amount,
                // If it exists, preserve user's adjusted amount, otherwise default to original
                adjustedAmount: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].adjustedAmount : item.amount,
                // CRITICAL FIX: 3a and Supplementary Pension should be Liquid by default as they are cash payouts at retirement
                category: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].category : 'Liquid',
                preserve: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].preserve : 'No',
                availabilityType: 'Date',
                availabilityDate: item.startDate || wishedRetirementDate, // Default to start date (usually retirement date)
                ownType: 'Date',
                ownDate: item.startDate || wishedRetirementDate,
                strategy: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].strategy : 'Cash',
                isRetirement: true // Mark as coming from retirement inputs
              };

              if (existingIndex >= 0) {
                // Remove existing and add to top 
                const newAssets = [...loadedCurrentAssets];
                newAssets.splice(existingIndex, 1);
                loadedCurrentAssets = [assetItem, ...newAssets];
              } else {
                // Add to top
                loadedCurrentAssets = [assetItem, ...loadedCurrentAssets];
              }
            });
          }

          // Option 1: Inject LPP Pension Capital as an asset if selected (Moved to end to ensure it is first in list via unshift)
          if (option === 'option1' && scenarioData.pensionCapital) {
            // Check if already exists
            const existingIndex = loadedCurrentAssets.findIndex(a => a.id === 'lpp_pension_capital');

            const lppAsset = {
              id: 'lpp_pension_capital',
              name: language === 'fr' ? 'Statut actuel du capital de prévoyance' : 'Current pension plan capital status',
              amount: scenarioData.pensionCapital,
              // If it exists, preserve user's adjusted amount, otherwise default to original
              adjustedAmount: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].adjustedAmount : scenarioData.pensionCapital,
              category: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].category : 'Illiquid',
              preserve: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].preserve : 'No',
              availabilityType: 'Date',
              availabilityDate: retirementDateStr,
              strategy: existingIndex >= 0 ? loadedCurrentAssets[existingIndex].strategy : 'Cash',
              isOption1: true
            };

            if (existingIndex >= 0) {
              // Update existing item (keep position or move to top? user said "added at the top")
              // Let's remove it and unshift it to ensure top position
              const newAssets = [...loadedCurrentAssets];
              newAssets.splice(existingIndex, 1);
              loadedCurrentAssets = [lppAsset, ...newAssets];
            } else {
              // Add to top
              loadedCurrentAssets = [lppAsset, ...loadedCurrentAssets];
            }
          }

          const loadedDesiredOutflows = (scenarioData && scenarioData.desiredOutflows && scenarioData.desiredOutflows.length > 0)
            ? scenarioData.desiredOutflows
            : (assetsData.desiredOutflows || []);

          setCurrentAssets(loadedCurrentAssets);
          setDesiredOutflows(loadedDesiredOutflows);
        }

        // Process retirement income from scenarioData.benefitsData
        const processedRetirementIncome = [];
        if (scenarioData) {
          // Add AVS from benefitsData if it exists
          if (scenarioData.benefitsData && scenarioData.benefitsData.avs && scenarioData.benefitsData.avs.amount) {
            processedRetirementIncome.push({
              id: 'avs',
              name: 'AVS',
              amount: scenarioData.benefitsData.avs.amount,
              adjustedAmount: scenarioData.benefitsData.avs.amount,
              frequency: scenarioData.benefitsData.avs.frequency || 'Monthly',
              startDate: scenarioData.benefitsData.avs.startDate || retirementDateStr,
              endDate: deathDateStr,
              isRetirement: true
            });
          }

          // Handle LPP based on selected option
          const option = scenarioData.retirementOption || 'option1';
          // Read data from scenarioData, no need to set state here

          if (option === 'option1') {
            // Option 1: Pension capital investment

            if (scenarioData.pensionCapital) {
              // Now handled as an asset in loadedCurrentAssets
            }
          } else if (option === 'option0') {
            // Option 0: Legal Retirement (65y)
            // Read data from scenarioData, no need to set state here

            if (scenarioData.projectedLegalLPPPension !== undefined && scenarioData.projectedLegalLPPPension !== null && scenarioData.projectedLegalLPPPension !== '') {
              processedRetirementIncome.push({
                id: 'projected_legal_lpp_pension',
                name: 'Projected LPP Pension at 65y',
                amount: scenarioData.projectedLegalLPPPension,
                adjustedAmount: scenarioData.projectedLegalLPPPension,
                frequency: 'Yearly',
                startDate: retirementDateStr,
                endDate: deathDateStr,
                isRetirement: true
              });
            }
            // Capital handled in Assets above
          } else if (option === 'option2') {
            // Option 2: Early retirement with projected values

            // Calculate correct start date based on early retirement age
            let earlyRetirementDateStr = retirementDateStr;
            if (scenarioData.earlyRetirementAge && userData.birthDate) {
              const bDate = new Date(userData.birthDate);
              const earlyRetDate = new Date(bDate);
              earlyRetDate.setFullYear(earlyRetDate.getFullYear() + parseInt(scenarioData.earlyRetirementAge));
              earlyRetDate.setDate(1);
              earlyRetDate.setMonth(earlyRetDate.getMonth() + 1);
              earlyRetirementDateStr = earlyRetDate.toISOString().split('T')[0];
            }

            // Get pension value from preRetirementRows for the selected age
            let pensionValue = scenarioData.projectedLPPPension; // Fallback to old single value
            if (scenarioData.preRetirementRows && scenarioData.earlyRetirementAge) {
              const ageRow = scenarioData.preRetirementRows.find(row => row.age === parseInt(scenarioData.earlyRetirementAge));
              if (ageRow && ageRow.pension) {
                pensionValue = ageRow.pension;
              }
            }

            // Check if pension value exists
            if (pensionValue !== undefined && pensionValue !== null && pensionValue !== '') {
              processedRetirementIncome.push({
                id: 'projected_lpp_pension',
                name: `Projected LPP Pension at ${scenarioData.earlyRetirementAge}y`,
                amount: pensionValue,
                adjustedAmount: pensionValue,
                frequency: 'Yearly',
                startDate: earlyRetirementDateStr,
                endDate: deathDateStr,
                isRetirement: true
              });
            }
            // Capital has been moved to Assets section

          } else if (option === 'option3') {
            // Option 3: Flexible pre-retirement
            const preRetirementRows = scenarioData.preRetirementRows || [];
            console.log('Processing Option 3 preRetirementRows:', preRetirementRows);

            preRetirementRows.forEach(row => {
              // Create pension row if pension value exists
              if (row.pension && row.pension !== '' && row.pension !== '0') {
                processedRetirementIncome.push({
                  id: `pre_retirement_pension_${row.age} `,
                  name: `Pre - retirement LPP Pension at ${row.age} y`,
                  amount: row.pension,
                  adjustedAmount: row.pension,
                  frequency: row.frequency || 'Monthly',
                  startDate: retirementDateStr,
                  endDate: deathDateStr,
                  isRetirement: true
                });
              }

              // Create capital row if capital value exists
              if (row.capital && row.capital !== '' && row.capital !== '0') {
                processedRetirementIncome.push({
                  id: `pre_retirement_capital_${row.age} `,
                  name: `Pre - retirement LPP Capital at ${row.age} y`,
                  amount: row.capital,
                  adjustedAmount: row.capital,
                  frequency: 'One-time',
                  startDate: retirementDateStr,
                  endDate: retirementDateStr,
                  isRetirement: true
                });
              }
            });
            console.log('Processed retirement income for Option 3:', processedRetirementIncome);
          }
        }

        // Calculate Option 2 Date for Salary override
        let opt2EarlyDateStr = null;
        const opt = scenarioData.retirementOption || 'option1';
        if (opt === 'option2' && scenarioData.earlyRetirementAge && userData.birthDate) {
          const bDate = new Date(userData.birthDate);
          const earlyRetDate = new Date(bDate);
          earlyRetDate.setFullYear(earlyRetDate.getFullYear() + parseInt(scenarioData.earlyRetirementAge));
          earlyRetDate.setDate(1);
          earlyRetDate.setMonth(earlyRetDate.getMonth() + 1);
          opt2EarlyDateStr = earlyRetDate.toISOString().split('T')[0];
        }

        // STEP 1: Always load ORIGINAL income data from incomeData
        // CRITICAL: Filter out any "ghost" retirement items that might have been saved as regular income
        const originalRegularIncomes = incomeData.filter(i =>
          i.amount &&
          !i.location && // Regular incomes typically don't have location/isRetirement flags in this app version, checking ID/Name safely
          !String(i.id || '').toLowerCase().includes('pension') &&
          !String(i.id || '').toLowerCase().includes('lpp') &&
          !String(i.name || '').toLowerCase().includes('pension')
        ).map(i => {
          let endDate = i.endDate;
          if (opt2EarlyDateStr && (i.name === 'Net Salary' || i.name === 'Salary')) {
            endDate = opt2EarlyDateStr;
          }
          return {
            ...i,
            endDate,
            adjustedAmount: i.amount  // Default adjusted = original
          };
        });

        // STEP 2: Merge with ORIGINAL retirement income from scenarioData
        const allOriginalIncomes = [...originalRegularIncomes, ...processedRetirementIncome];

        // STEP 3: Apply adjusted versions if they exist
        let finalIncomes;
        if (scenarioData.adjustedIncomes && scenarioData.adjustedIncomes.length > 0) {
          // Use adjusted versions, but ensure retirement income is current
          // Remove old retirement income from adjusted, add fresh retirement income
          const adjustedRegularIncomes = scenarioData.adjustedIncomes.filter(inc => !inc.isRetirement);
          finalIncomes = [...adjustedRegularIncomes, ...processedRetirementIncome];
        } else {
          // No adjustments yet, use original data
          finalIncomes = allOriginalIncomes;
        }

        // FORCE OVERRIDE: If Option 2 is selected, ensure dates are aligned
        if (opt2EarlyDateStr) {
          // 1. Update the global Wished Retirement Date specific for this session
          setWishedRetirementDate(opt2EarlyDateStr);

          // 2. Force override the Salary End Date using the Overrides mechanism 
          // (which takes precedence over render defaults)
          setIncomeDateOverrides(prev => ({
            ...prev,
            'Salary': { ...prev['Salary'], endDate: opt2EarlyDateStr },
            'Net Salary': { ...prev['Net Salary'], endDate: opt2EarlyDateStr }
          }));

          // 3. Also update the specific items in finalIncomes as a fallback
          finalIncomes = finalIncomes.map(item => {
            if (item.name === 'Net Salary' || item.name === 'Salary') {
              return { ...item, endDate: opt2EarlyDateStr };
            }
            return item;
          });
        }

        // SAFETY CHECK: If for any reason Salary/Net Salary is missing from finalIncomes (e.g. corrupted adjustments/ghost filtering gone wrong),
        // but it existed in original data, RESTORE IT!
        const hasSalary = finalIncomes.some(i => i.name === 'Salary' || i.name === 'Net Salary');
        if (!hasSalary) {
          const originalSalary = originalRegularIncomes.find(i => i.name === 'Salary' || i.name === 'Net Salary');
          if (originalSalary) {
            console.log('Restoring missing Salary from original data');
            // Ensure it is not marked as retirement
            finalIncomes.push({ ...originalSalary, isRetirement: false });
          }
        }

        console.log('Final incomes:', finalIncomes.length, '(original:', allOriginalIncomes.length, ')');
        setIncomes(finalIncomes);

        // STEP 4: Load costs - same pattern
        const originalCosts = costData.filter(c => c.amount).map(c => ({
          ...c,
          adjustedAmount: c.amount
        }));

        if (scenarioData.adjustedCosts && scenarioData.adjustedCosts.length > 0) {
          setCosts(scenarioData.adjustedCosts);
        } else {
          setCosts(originalCosts);
        }

      } catch (error) {
        toast.error('Failed to load data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, masterKey, navigate]);

  // Auto-save scenario data when values change
  useEffect(() => {
    if (loading || !user?.email || !masterKey) return;

    const saveData = async () => {
      try {
        // Load existing scenario data to preserve all fields
        const existingData = await getScenarioData(user.email, masterKey) || {};

        // Merge with updates, preserving retirement option fields
        await saveScenarioData(user.email, masterKey, {
          ...existingData,  // Preserve all existing fields including retirement options
          liquidAssets,
          nonLiquidAssets,
          futureInflows,
          wishedRetirementDate,
          adjustedIncomes: incomes,
          adjustedCosts: costs,
          currentAssets: currentAssets,
          desiredOutflows: desiredOutflows
        });
      } catch (error) {
        console.error('Failed to auto-save scenario data:', error);
      }
    };

    // Debounce the save
    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [liquidAssets, nonLiquidAssets, futureInflows, wishedRetirementDate, incomes, costs, currentAssets, desiredOutflows, user, masterKey, loading]);

  // Recalculate totals when currentAssets changes
  useEffect(() => {
    const liquidTotal = currentAssets
      .filter(row => row.category === 'Liquid')
      .reduce((sum, row) => sum + (parseFloat(row.adjustedAmount || row.amount) || 0), 0);

    const illiquidTotal = currentAssets
      .filter(row => row.category === 'Illiquid')
      .reduce((sum, row) => sum + (parseFloat(row.adjustedAmount || row.amount) || 0), 0);

    setLiquidAssets(liquidTotal.toString());
    setNonLiquidAssets(illiquidTotal.toString());
  }, [currentAssets]);

  const adjustDate = (months) => {
    const currentDate = new Date(wishedRetirementDate);
    currentDate.setMonth(currentDate.getMonth() + months);
    setWishedRetirementDate(currentDate.toISOString().split('T')[0]);
  };

  const updateIncomeAdjusted = (id, value) => {
    setIncomes(incomes.map(inc =>
      inc.id === id ? { ...inc, adjustedAmount: value } : inc
    ));
  };

  const updateIncomeField = (id, field, value) => {
    setIncomes(incomes.map(inc =>
      inc.id === id ? { ...inc, [field]: value } : inc
    ));
  };

  const updateCostAdjusted = (id, value) => {
    setCosts(costs.map(cost =>
      cost.id === id ? { ...cost, adjustedAmount: value } : cost
    ));
  };

  const updateCostDate = (id, field, value) => {
    setCosts(costs.map(cost =>
      cost.id === id ? { ...cost, [field]: value } : cost
    ));
  };

  const updateIncomeDate = (id, field, value) => {
    setIncomes(incomes.map(income =>
      income.id === id ? { ...income, [field]: value } : income
    ));
  };

  const updateCostField = (id, field, value) => {
    setCosts(costs.map(cost =>
      cost.id === id ? { ...cost, [field]: value } : cost
    ));
  };

  // Update date overrides for standard income sources (Salary, AVS, LPP, 3a)
  const updateIncomeDateOverride = (incomeName, field, value) => {
    setIncomeDateOverrides(prev => ({
      ...prev,
      [incomeName]: {
        ...prev[incomeName],
        [field]: value
      }
    }));
  };

  // Get effective date for income (override or calculated)
  const getEffectiveIncomeDate = (income, field) => {
    const override = incomeDateOverrides[income.name]?.[field];
    if (override) return override;

    const today = new Date().toISOString().split('T')[0];

    if (income.name === 'Salary') {
      return field === 'startDate' ? today : wishedRetirementDate;
    } else if (income.name === 'LPP') {
      return field === 'startDate' ? wishedRetirementDate : deathDate;
    } else if (income.name === 'AVS') {
      return field === 'startDate' ? retirementLegalDate : deathDate;
    } else if (income.name === '3a') {
      return field === 'startDate' ? wishedRetirementDate : null;
    }
    return income[field];
  };


  const deleteIncome = (id) => {
    // Find the income to delete
    const incomeToDelete = incomes.find(i => i.id === id);

    // If it has children (split items), also delete them or unlink them
    const updatedIncomes = incomes.filter(income => {
      if (income.id === id) return false;
      // If this income was linked to the deleted one, unlink it
      if (income.parentId === id) {
        income.parentId = null;
        income.groupId = null;
      }
      return true;
    });

    setIncomes(updatedIncomes);
  };

  const resetIncomesToDefaults = async () => {
    try {
      console.log('Resetting incomes to defaults...');
      // Reload income data from database
      const incomeData = await getIncomeData(user.email, masterKey) || [];
      const scenarioData = await getScenarioData(user.email, masterKey);

      // Process regular incomes
      const processedIncomes = incomeData.map(inc => {
        const { groupId, parentId, ...cleanIncome } = inc;
        return {
          ...cleanIncome,
          adjustedAmount: inc.amount
        };
      });

      // Reprocess retirement income from scenarioData.benefitsData
      const processedRetirementIncome = [];
      if (scenarioData) {
        // Add AVS from benefitsData
        if (scenarioData.benefitsData && scenarioData.benefitsData.avs && scenarioData.benefitsData.avs.amount) {
          processedRetirementIncome.push({
            id: 'avs',
            name: 'AVS',
            amount: scenarioData.benefitsData.avs.amount,
            adjustedAmount: scenarioData.benefitsData.avs.amount,
            frequency: scenarioData.benefitsData.avs.frequency || 'Monthly',
            startDate: scenarioData.benefitsData.avs.startDate || retirementLegalDate,
            endDate: deathDate,
            isRetirement: true
          });
        }

        const option = scenarioData.retirementOption || 'option1';
        if (option === 'option1' && scenarioData.pensionCapital) {
          processedRetirementIncome.push({
            id: 'pension_capital_investment',
            name: 'Pension Capital Investment',
            amount: scenarioData.pensionCapital,
            adjustedAmount: scenarioData.pensionCapital,
            pensionCapital: scenarioData.pensionCapital,
            yearlyReturn: scenarioData.yearlyReturn || '0',
            frequency: 'Investment',
            startDate: retirementLegalDate,
            endDate: deathDate,
            isRetirement: true,
            isOption1: true
          });
        } else if (option === 'option0') {
          // Option 0: Legal Retirement (65y)
          if (scenarioData.projectedLegalLPPPension) {
            processedRetirementIncome.push({
              id: 'projected_legal_lpp_pension',
              name: 'Projected LPP Pension at 65y',
              amount: scenarioData.projectedLegalLPPPension,
              adjustedAmount: scenarioData.projectedLegalLPPPension,
              frequency: 'Yearly', // Forced Yearly as per input label
              startDate: retirementLegalDate,
              endDate: deathDate,
              isRetirement: true
            });
          }
        } else if (option === 'option2') {
          if (scenarioData.projectedLPPPension) {
            processedRetirementIncome.push({
              id: 'projected_lpp_pension',
              name: `Projected LPP Pension at ${scenarioData.earlyRetirementAge} y`,
              amount: scenarioData.projectedLPPPension,
              adjustedAmount: scenarioData.projectedLPPPension,
              frequency: 'Yearly', // Always Yearly for option2
              startDate: retirementLegalDate,
              endDate: deathDate,
              isRetirement: true
            });
          }
        } else if (option === 'option3') {
          // Option 3: Process preRetirementData
          if (scenarioData.preRetirementData) {
            Object.keys(scenarioData.preRetirementData).forEach(age => {
              const ageData = scenarioData.preRetirementData[age];
              if (ageData.pension) {
                processedRetirementIncome.push({
                  id: `pre_retirement_pension_${age} `,
                  name: `Projected LPP Pension at ${age} y`,
                  amount: ageData.pension,
                  adjustedAmount: ageData.pension,
                  frequency: ageData.frequency || 'Monthly',
                  startDate: retirementLegalDate,
                  endDate: deathDate,
                  isRetirement: true
                });
              }
            });
          }
        }
      }

      const allIncomes = [...processedIncomes, ...processedRetirementIncome];
      setIncomes(allIncomes);

      // IMPORTANT: Spread scenarioData to preserve ALL fields (retirementOption, benefitsData, etc.)
      await saveScenarioData(user.email, masterKey, {
        ...scenarioData,  // Preserve all existing fields
        liquidAssets,
        nonLiquidAssets,
        futureInflows,
        wishedRetirementDate,
        adjustedIncomes: [],  // Clear adjusted versions to reset to originals
        adjustedCosts: costs
      });

      toast.success(language === 'fr' ? 'Revenus réinitialisés aux valeurs par défaut' : 'Income reset to default values');
    } catch (error) {
      console.error('Error resetting incomes:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting data');
    }
  };

  const resetCostsToDefaults = async () => {
    try {
      console.log('Resetting costs to defaults...');
      const costData = await getCostData(user.email, masterKey) || [];

      const processedCosts = costData.map(cost => {
        const { groupId, parentId, ...cleanCost } = cost;
        return {
          ...cleanCost,
          adjustedAmount: cost.amount
        };
      });

      setCosts(processedCosts);

      const scenarioData = await getScenarioData(user.email, masterKey);
      // IMPORTANT: Spread scenarioData to preserve ALL fields
      await saveScenarioData(user.email, masterKey, {
        ...scenarioData,  // Preserve all existing fields
        liquidAssets,
        nonLiquidAssets,
        futureInflows,
        wishedRetirementDate,
        adjustedIncomes: incomes,
        adjustedCosts: []  // Clear adjusted versions to reset to originals
      });

      toast.success(language === 'fr' ? 'Coûts réinitialisés aux valeurs par défaut' : 'Costs reset to default values');
    } catch (error) {
      console.error('Error resetting costs:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting data');
    }
  };

  const resetAssetsToDefaults = async () => {
    try {
      const assetsData = await getAssetsData(user.email, masterKey);
      const scenarioData = await getScenarioData(user.email, masterKey);

      let loadedCurrentAssets = [];
      if (assetsData) {
        loadedCurrentAssets = assetsData.currentAssets || [];

        // Use the same logic as loadData to inject retirement assets, but reset their values
        if (scenarioData) {
          const retirementDateStr = scenarioData.wishedRetirementDate || retirementLegalDate;
          const option = scenarioData.retirementOption || 'option1';



          // Option 0: Inject Legal LPP Capital
          if (option === 'option0' && scenarioData.projectedLegalLPPCapital) {
            const legalAsset = {
              id: 'projected_legal_lpp_capital',
              name: 'Projected LPP Capital at 65y',
              amount: scenarioData.projectedLegalLPPCapital,
              adjustedAmount: scenarioData.projectedLegalLPPCapital, // Reset adjusted to original
              category: 'Illiquid', // Default
              preserve: 'No', // Default
              availabilityType: 'Date',
              availabilityDate: retirementDateStr,
              strategy: 'Cash', // Default
              isOption0: true
            };
            loadedCurrentAssets = [legalAsset, ...loadedCurrentAssets];
          }

          // Move 3a and Supplementary Pension capital from scenarioData.benefitsData to Assets
          if (scenarioData.benefitsData) {
            const oneTimeItems = [];

            // 1. Check for 3a (Handle Array or Single Object)
            if (scenarioData.benefitsData.threeA) {
              if (Array.isArray(scenarioData.benefitsData.threeA)) {
                scenarioData.benefitsData.threeA.forEach((item, index) => {
                  if (item.amount) {
                    oneTimeItems.push({
                      id: `3a_account_${index}`,
                      name: `3a (${index + 1})`,
                      amount: item.amount,
                      startDate: item.startDate || wishedRetirementDate,
                      frequency: 'One-time'
                    });
                  }
                });
              } else if (scenarioData.benefitsData.threeA.amount) {
                oneTimeItems.push({
                  id: '3a',
                  name: '3a',
                  amount: scenarioData.benefitsData.threeA.amount,
                  startDate: scenarioData.benefitsData.threeA.startDate || wishedRetirementDate,
                  frequency: 'One-time'
                });
              }
            }

            // 2. Check for Supplementary Pension capital
            if (scenarioData.benefitsData.lppSup && scenarioData.benefitsData.lppSup.amount) {
              oneTimeItems.push({
                id: 'lppSup',
                name: 'Supplementary Pension capital',
                amount: scenarioData.benefitsData.lppSup.amount,
                startDate: scenarioData.benefitsData.lppSup.startDate || wishedRetirementDate,
                frequency: 'One-time'
              });
            }

            // Process and inject them
            oneTimeItems.forEach(item => {
              const assetItem = {
                id: item.id,
                name: item.name,
                amount: item.amount,
                adjustedAmount: item.amount, // Reset adjusted to original
                category: 'Liquid', // 3a/Supplementary default to Liquid
                preserve: 'No', // Default
                availabilityType: 'Date',
                availabilityDate: item.startDate || wishedRetirementDate,
                strategy: 'Cash', // Default
                isRetirement: true
              };
              loadedCurrentAssets = [assetItem, ...loadedCurrentAssets];
            });
          }

          // Option 2: Inject Projected LPP Capital (New Logic)
          if (option === 'option2' && scenarioData.projectedLPPCapital) {
            const lppAsset = {
              id: 'projected_lpp_capital_option2',
              name: `Projected LPP Capital at ${scenarioData.earlyRetirementAge}y`,
              amount: scenarioData.projectedLPPCapital,
              adjustedAmount: scenarioData.projectedLPPCapital, // Reset adjusted to original
              category: 'Illiquid', // Default
              preserve: 'No', // Default
              availabilityType: 'Date',
              availabilityDate: retirementDateStr,
              strategy: 'Cash', // Default
              isOption2: true
            };
            loadedCurrentAssets = [lppAsset, ...loadedCurrentAssets];
          }

          // Option 3: Inject Pre-retirement Capital Rows
          if (option === 'option3' && scenarioData.preRetirementRows) {
            scenarioData.preRetirementRows.forEach(row => {
              if (row.capital && row.capital !== '' && row.capital !== '0') {
                const assetItem = {
                  id: `pre_retirement_capital_${row.age} `,
                  name: `Pre - retirement LPP Capital at ${row.age} y`,
                  amount: row.capital,
                  adjustedAmount: row.capital, // Reset adjusted to original
                  category: 'Illiquid', // Default
                  preserve: 'No', // Default
                  availabilityType: 'Date',
                  availabilityDate: retirementDateStr, // Or specific date if available? Usually retirement date.
                  strategy: 'Cash', // Default
                  isOption3: true
                };
                loadedCurrentAssets = [assetItem, ...loadedCurrentAssets];
              }
            });
          }

          // Option 1: Inject LPP Pension Capital (New Logic - Unshift to top)
          if (option === 'option1' && scenarioData.pensionCapital) {
            const lppAsset = {
              id: 'lpp_pension_capital',
              name: language === 'fr' ? 'Statut actuel du capital de prévoyance' : 'Current pension plan capital status',
              amount: scenarioData.pensionCapital,
              adjustedAmount: scenarioData.pensionCapital, // Reset adjusted to original
              category: 'Illiquid', // Default
              preserve: 'No', // Default
              availabilityType: 'Date',
              availabilityDate: retirementDateStr,
              strategy: 'Cash', // Default
              isOption1: true
            };
            loadedCurrentAssets = [lppAsset, ...loadedCurrentAssets];
          }
        }
      }

      setCurrentAssets(loadedCurrentAssets);

      // Autosave the reset state
      await saveScenarioData(user.email, masterKey, {
        ...scenarioData,
        currentAssets: loadedCurrentAssets, // Save the reset assets list
        liquidAssets, // These will update via useEffect but good to keep consistency if possible, though state update might lag slightly
        nonLiquidAssets
      });

      toast.success(language === 'fr' ? 'Actifs réinitialisés aux valeurs par défaut' : 'Assets reset to default values');
    } catch (error) {
      console.error('Error resetting assets:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting data');
    }
  };

  const resetDebtsToDefaults = async () => {
    try {
      const assetsData = await getAssetsData(user.email, masterKey);
      if (assetsData) {
        setDesiredOutflows(assetsData.desiredOutflows || []);
        toast.success(language === 'fr' ? 'Dettes réinitialisées aux valeurs par défaut' : 'Debts reset to default values');
      }
    } catch (error) {
      console.error('Error resetting debts:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting data');
    }
  };

  // Asset update and delete functions
  const updateAsset = (id, field, value) => {
    setCurrentAssets(currentAssets.map(asset =>
      asset.id === id ? { ...asset, [field]: value } : asset
    ));
  };

  const deleteAsset = (id) => {
    setCurrentAssets(currentAssets.filter(asset => asset.id !== id));
  };

  const addAsset = () => {
    const newId = Date.now();
    const newAsset = {
      id: newId,
      name: language === 'fr' ? 'Nouvel actif' : 'New asset',
      amount: '',
      adjustedAmount: '',
      category: 'Liquid',
      preserve: 'No',
      availabilityDate: new Date().toISOString().split('T')[0],
      availabilityTimeframe: '',
      locked: false
    };
    setCurrentAssets([...currentAssets, newAsset]);
  };

  const duplicateAsset = (id) => {
    const assetIndex = currentAssets.findIndex(asset => asset.id === id);
    if (assetIndex === -1) return;

    const originalAsset = currentAssets[assetIndex];
    const newAsset = {
      ...originalAsset,
      id: Date.now(),
      name: `${originalAsset.name} (dupl.)`,
      amount: 0,
      adjustedAmount: originalAsset.adjustedAmount || originalAsset.amount
    };

    const updatedAssets = [...currentAssets];
    updatedAssets.splice(assetIndex + 1, 0, newAsset);
    setCurrentAssets(updatedAssets);
  };

  // Debt update and delete functions
  const updateDebt = (id, field, value) => {
    setDesiredOutflows(desiredOutflows.map(debt =>
      debt.id === id ? { ...debt, [field]: value } : debt
    ));
  };

  const deleteDebt = (id) => {
    setDesiredOutflows(desiredOutflows.filter(debt => debt.id !== id));
  };

  const addDebt = () => {
    const newId = Date.now();
    const newDebt = {
      id: newId,
      name: language === 'fr' ? 'Nouvelle dette' : 'New debt',
      amount: '',
      adjustedAmount: '',
      madeAvailableDate: new Date().toISOString().split('T')[0],
      madeAvailableTimeframe: '',
      locked: false
    };
    setDesiredOutflows([...desiredOutflows, newDebt]);
  };


  const splitIncome = (id) => {
    const incomeIndex = incomes.findIndex(income => income.id === id);
    if (incomeIndex === -1) return;

    const originalIncome = incomes[incomeIndex];
    const newId = Date.now();
    const groupId = originalIncome.groupId || originalIncome.id; // Use existing groupId or create new

    // Update original income to have groupId
    const updatedOriginal = {
      ...originalIncome,
      groupId: groupId
    };

    // Create new income with the same values but starting where the original ends
    const newIncome = {
      ...originalIncome,
      id: newId,
      parentId: originalIncome.id, // Link to parent for auto-update
      groupId: groupId, // Same group for visual grouping
      startDate: originalIncome.endDate // New line starts where original ends
    };

    // Insert the new income right after the original
    const updatedIncomes = [...incomes];
    updatedIncomes[incomeIndex] = updatedOriginal;
    updatedIncomes.splice(incomeIndex + 1, 0, newIncome);
    setIncomes(updatedIncomes);
  };

  const updateIncomeDateWithSync = (id, field, value) => {
    const updatedIncomes = incomes.map(income => {
      if (income.id === id) {
        return { ...income, [field]: value };
      }
      // Auto-sync linked incomes (children)
      if (income.parentId === id && field === 'endDate') {
        return { ...income, startDate: value };
      }
      return income;
    });
    setIncomes(updatedIncomes);
  };

  const deleteCost = (id) => {

    // Find the cost to delete
    const costToDelete = costs.find(c => c.id === id);

    // If it has children (split items), also delete them or unlink them
    const updatedCosts = costs.filter(cost => {
      if (cost.id === id) return false;
      // If this cost was linked to the deleted one, unlink it
      if (cost.parentId === id) {
        cost.parentId = null;
        cost.groupId = null;
      }
      return true;
    });

    setCosts(updatedCosts);
  };

  // Future inflows management
  const addFutureInflow = () => {
    setFutureInflows([...futureInflows, {
      id: Date.now(),
      type: 'Inheritance',
      amount: '',
      date: ''
    }]);
  };

  const updateFutureInflow = (id, field, value) => {
    setFutureInflows(futureInflows.map(inflow =>
      inflow.id === id ? { ...inflow, [field]: value } : inflow
    ));
  };

  const deleteFutureInflow = (id) => {
    setFutureInflows(futureInflows.filter(inflow => inflow.id !== id));
  };


  const addCost = () => {
    const newId = Date.now();
    const newCost = {
      id: newId,
      name: language === 'fr' ? 'Nouvelle sortie' : 'New outflow',
      amount: '',
      adjustedAmount: '',
      frequency: 'Monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: deathDate || '',
      locked: false
    };
    setCosts([...costs, newCost]);
  };
  const addIncome = () => {
    const newId = Date.now();
    const newIncome = {
      id: newId,
      name: language === 'fr' ? 'Nouveau revenu' : 'New income',
      amount: '',
      adjustedAmount: '',
      frequency: 'Monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: deathDate || '',
      locked: false
    };
    setIncomes([...incomes, newIncome]);
  };


  const splitCost = (id) => {
    const costIndex = costs.findIndex(cost => cost.id === id);
    if (costIndex === -1) return;

    const originalCost = costs[costIndex];
    const newId = Date.now();
    const groupId = originalCost.groupId || originalCost.id; // Use existing groupId or create new

    // Update original cost to have groupId
    const updatedOriginal = {
      ...originalCost,
      groupId: groupId
    };

    // Create new cost with the same values but starting where the original ends
    const newCost = {
      ...originalCost,
      id: newId,
      parentId: originalCost.id, // Link to parent for auto-update
      groupId: groupId, // Same group for visual grouping
      startDate: originalCost.endDate // New line starts where original ends
    };

    // Insert the new cost right after the original
    const updatedCosts = [...costs];
    updatedCosts[costIndex] = updatedOriginal;
    updatedCosts.splice(costIndex + 1, 0, newCost);
    setCosts(updatedCosts);
  };

  // Update cost date with auto-sync for linked costs
  const updateCostDateWithSync = (id, field, value) => {
    setCosts(prevCosts => {
      return prevCosts.map(cost => {
        if (cost.id === id) {
          // Update the target cost
          return { ...cost, [field]: value };
        }
        // If this is a child cost and we're updating the parent's endDate
        if (field === 'endDate' && cost.parentId === id) {
          // Auto-update the child's startDate to match parent's endDate
          return { ...cost, startDate: value };
        }
        return cost;
      });
    });
  };

  const runSimulation = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const retirementLegalYear = new Date(retirementLegalDate).getFullYear();
      const deathYear = new Date(deathDate).getFullYear();
      const today = new Date().toISOString().split('T')[0];

      let simulationRetirementDate = wishedRetirementDate;
      let calculatedEarliestDate = null;

      // If user chose "calculate earliest", find the earliest retirement date with non-negative balance
      if (retirementOption === 'calculate') {
        // Start from today and iterate month by month until legal retirement
        const startDate = new Date();
        const legalDate = new Date(retirementLegalDate);
        let foundDate = null;

        // Check each month from now until legal retirement
        let checkDate = new Date(startDate);
        while (checkDate <= legalDate) {
          const testRetirementDate = checkDate.toISOString().split('T')[0];
          const testBalance = calculateBalanceForRetirementDate(testRetirementDate);

          if (testBalance >= 0) {
            foundDate = testRetirementDate;
            break;
          }

          // Move to next month
          checkDate.setMonth(checkDate.getMonth() + 1);
        }

        if (foundDate) {
          simulationRetirementDate = foundDate;
          calculatedEarliestDate = foundDate;
        } else {
          // No valid date found - use legal retirement date and show "no" verdict
          simulationRetirementDate = retirementLegalDate;
          calculatedEarliestDate = null; // Signal that no early retirement is possible
        }
      } else if (retirementOption === 'option2') {
        // Option 2: Calculate date based on specific early retirement age
        if (earlyRetirementAge && birthDate) {
          const bDate = new Date(birthDate);
          const earlyRetDate = new Date(bDate);
          earlyRetDate.setFullYear(earlyRetDate.getFullYear() + parseInt(earlyRetirementAge));
          earlyRetDate.setDate(1);
          earlyRetDate.setMonth(earlyRetDate.getMonth() + 1);
          simulationRetirementDate = earlyRetDate.toISOString().split('T')[0];
        }
      }

      const wishedRetirementYear = new Date(simulationRetirementDate).getFullYear();

      let initialSavings = parseFloat(liquidAssets || 0) + parseFloat(nonLiquidAssets || 0);
      const transmission = 0; // Transmission removed - set to 0 for backward compatibility
      const yearlyData = [];

      // Calculate year by year with detailed breakdown
      for (let year = currentYear; year <= deathYear; year++) {
        const yearData = {
          year,
          income: 0,
          costs: 0,
          incomeBreakdown: {},
          costBreakdown: {}
        };

        incomes.forEach(income => {
          const amount = parseFloat(income.adjustedAmount) || 0;
          let startDate, endDate;

          // Use date overrides if available, otherwise use calculated defaults
          if (income.name === 'Salary') {
            startDate = incomeDateOverrides['Salary']?.startDate || today;
            endDate = incomeDateOverrides['Salary']?.endDate || simulationRetirementDate;
          } else if (income.name === 'LPP') {
            startDate = incomeDateOverrides['LPP']?.startDate || simulationRetirementDate;
            endDate = incomeDateOverrides['LPP']?.endDate || deathDate;
          } else if (income.name === 'AVS') {
            startDate = incomeDateOverrides['AVS']?.startDate || retirementLegalDate;
            endDate = incomeDateOverrides['AVS']?.endDate || deathDate;
          } else if (income.name === '3a') {
            // 3a is one-time at retirement - use override date or simulation retirement
            const threADate = incomeDateOverrides['3a']?.startDate || simulationRetirementDate;
            const threAYear = new Date(threADate).getFullYear();
            if (year === threAYear) {
              yearData.income += amount;
              yearData.incomeBreakdown[income.name] = amount;
            }
            return; // Skip further processing for 3a
          } else {
            // Custom income - use stored dates
            startDate = income.startDate;
            endDate = income.endDate;
          }

          const yearlyAmount = calculateYearlyAmount(
            amount,
            income.frequency,
            startDate,
            endDate,
            year
          );

          if (yearlyAmount > 0) {
            yearData.income += yearlyAmount;
            yearData.incomeBreakdown[income.name] = yearlyAmount;
          }
        });

        // Add Retirement Data (AVS, LPP, 3a from RetirementInputs)
        if (retirementData && retirementData.rows) {
          retirementData.rows.forEach(row => {
            const amount = parseFloat(row.amount) || 0;
            if (amount > 0) {
              const frequency = row.frequency;
              let startDate = row.startDate;
              // AVS/LPP start at legal retirement usually, but user can edit start date in RetirementInputs.
              // We trust the startDate from RetirementInputs (green block).

              // Special case: If 3a is One-time, it happens once.
              // If AVS is monthly, it continues until death.
              let endDate = deathDate;
              if (frequency === 'One-time') {
                endDate = startDate; // Handled by calculateYearlyAmount or manual check
              }

              // Use calculateYearlyAmount
              const yearlyAmount = calculateYearlyAmount(
                amount,
                frequency,
                startDate,
                endDate,
                year
              );

              if (yearlyAmount > 0) {
                yearData.income += yearlyAmount;
                yearData.incomeBreakdown[row.name] = (yearData.incomeBreakdown[row.name] || 0) + yearlyAmount;
              }
            }
          });
        }

        costs.forEach(cost => {
          const amount = parseFloat(cost.adjustedAmount) || 0;
          const yearlyAmount = calculateYearlyAmount(
            amount,
            cost.frequency,
            cost.startDate,
            cost.endDate,
            year
          );

          if (yearlyAmount > 0) {
            yearData.costs += yearlyAmount;
            const category = cost.category || cost.name || 'Other';
            yearData.costBreakdown[category] = (yearData.costBreakdown[category] || 0) + yearlyAmount;
          }
        });

        // Add future inflows for this year
        futureInflows.forEach(inflow => {
          const inflowAmount = parseFloat(inflow.amount) || 0;
          if (inflowAmount > 0 && inflow.date) {
            const inflowYear = new Date(inflow.date).getFullYear();
            if (inflowYear === year) {
              yearData.income += inflowAmount;
              const inflowLabel = inflow.type || 'Other Inflow';
              yearData.incomeBreakdown[inflowLabel] = (yearData.incomeBreakdown[inflowLabel] || 0) + inflowAmount;
            }
          }
        });

        yearlyData.push(yearData);
      }

      // Calculate cumulative with initial savings
      let cumulativeBalance = initialSavings;
      const breakdown = yearlyData.map((year, index) => {
        const annualBalance = year.income - year.costs;
        cumulativeBalance += annualBalance;

        // Apply transmission deduction in the final year (death year)
        const isLastYear = index === yearlyData.length - 1;
        const transmissionDeduction = isLastYear ? transmission : 0;
        const cumulativeAfterTransmission = cumulativeBalance - transmissionDeduction;

        return {
          year: year.year,
          income: year.income,
          costs: year.costs,
          annualBalance,
          cumulativeBalance,
          incomeBreakdown: year.incomeBreakdown,
          costBreakdown: year.costBreakdown
        };
      });

      // Final balance
      const finalBalance = cumulativeBalance;

      // Save the simulation inputs to DB to ensure persistence (fixes "Ghost Data" on return)
      const existingData = await getScenarioData(user.email, masterKey) || {};

      await saveScenarioData(user.email, masterKey, {
        ...existingData,
        retirementOption,
        wishedRetirementDate: simulationRetirementDate,
        liquidAssets,
        nonLiquidAssets,
        futureInflows, // Ensure future inflows are saved if they are part of state
        adjustedIncomes: incomes,
        adjustedCosts: costs,
        incomeDateOverrides,
        // Note: activeFilters are preserved via existingData

        // Option specific data
        ...(retirementOption === 'option1' ? { pensionCapital, yearlyReturn } : {}),
        ...(retirementOption === 'option2' ? { earlyRetirementAge, projectedLPPPension, projectedLPPCapital } : {})
      });

      // Navigate to result with full simulation data
      navigate('/result', {
        state: {
          finalBalance,
          balanceBeforeTransmission: cumulativeBalance,
          transmissionAmount: 0,
          wishedRetirementDate: simulationRetirementDate,
          retirementLegalDate,
          calculatedEarliestDate,
          retirementOption,
          liquidAssets,
          nonLiquidAssets,
          yearlyBreakdown: breakdown,
          adjustedIncomes: incomes,
          adjustedCosts: costs,
          adjustedAssets: currentAssets,
          adjustedDebts: desiredOutflows,
          incomeDateOverrides
        }
      });

    } catch (error) {
      toast.error(t('common.error'));
      console.error(error);
    }
  };

  // Helper function to calculate final balance for a given retirement date
  const calculateBalanceForRetirementDate = (testRetirementDate) => {
    const currentYear = new Date().getFullYear();
    const deathYear = new Date(deathDate).getFullYear();
    const today = new Date().toISOString().split('T')[0];

    let initialSavings = parseFloat(liquidAssets || 0) + parseFloat(nonLiquidAssets || 0);
    const transmission = 0; // Transmission removed
    let cumulativeBalance = initialSavings;

    for (let year = currentYear; year <= deathYear; year++) {
      let yearIncome = 0;
      let yearCosts = 0;

      incomes.forEach(income => {
        const amount = parseFloat(income.adjustedAmount) || 0;
        let startDate, endDate;

        if (income.name === 'Salary') {
          startDate = today;
          endDate = testRetirementDate;
        } else if (income.name === 'LPP') {
          startDate = testRetirementDate;
          endDate = deathDate;
        } else if (income.name === 'AVS') {
          startDate = retirementLegalDate;
          endDate = deathDate;
        } else if (income.name === '3a') {
          const threAYear = new Date(testRetirementDate).getFullYear();
          if (year === threAYear) {
            yearIncome += amount;
          }
          return;
        } else {
          startDate = income.startDate;
          endDate = income.endDate;
        }

        const yearlyAmount = calculateYearlyAmount(amount, income.frequency, startDate, endDate, year);
        yearIncome += yearlyAmount;
      });

      // Add Retirement Data for Balance Calculation
      if (retirementData && retirementData.rows) {
        retirementData.rows.forEach(row => {
          const amount = parseFloat(row.amount) || 0;
          if (amount > 0) {
            let endDate = deathDate;
            if (row.frequency === 'One-time') {
              endDate = row.startDate;
            }

            const yearlyAmount = calculateYearlyAmount(
              amount,
              row.frequency,
              row.startDate,
              endDate,
              year
            );
            yearIncome += yearlyAmount;
          }
        });
      }

      costs.forEach(cost => {
        const amount = parseFloat(cost.adjustedAmount) || 0;
        const yearlyAmount = calculateYearlyAmount(amount, cost.frequency, cost.startDate, cost.endDate, year);
        yearCosts += yearlyAmount;
      });

      futureInflows.forEach(inflow => {
        const inflowAmount = parseFloat(inflow.amount) || 0;
        if (inflowAmount > 0 && inflow.date) {
          const inflowYear = new Date(inflow.date).getFullYear();
          if (inflowYear === year) {
            yearIncome += inflowAmount;
          }
        }
      });

      cumulativeBalance += (yearIncome - yearCosts);
    }

    return cumulativeBalance - transmission;
  };

  const handleAdjustAnswer = (key, value) => {
    setAdjustAnswers(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyAdjustments = () => {
    // Logic to update costs based on answers
    // This is a heuristic approach based on typical Swiss values or simply modifying existing values
    // For this implementation, we will apply multipliers to existing costs if they match categories,
    // or add them if missing? The request says "adjust automatically", implying modifying the existing COST list.

    // We map answers to multipliers or fixed values.
    // NOTE: This modifies 'adjustedAmount' in the 'costs' state.

    let newCosts = [...costs];

    const modifyCost = (keyword, multiplier) => {
      newCosts = newCosts.map(c => {
        if (c.name.toLowerCase().includes(keyword.toLowerCase())) {
          const original = parseFloat(c.amount || 0);
          if (original > 0) {
            return { ...c, adjustedAmount: Math.round(original * multiplier) };
          }
        }
        return c;
      });
    };

    // Example logic (can be refined):
    // Car: Yes -> 100% (no change if existing), No -> 0% (remove cost)
    if (adjustAnswers.car === 'no') modifyCost('transport', 0.2); // Reduce transport if no car, but maybe keeping public?
    // Actually, distinct question for public transport.
    if (adjustAnswers.car === 'yes') modifyCost('Private transportation', 1.0); // Keep
    if (adjustAnswers.car === 'no') modifyCost('Private transportation', 0); // Remove

    // Public Transport
    if (adjustAnswers.publicTransport === 'never') modifyCost('Public', 0);
    if (adjustAnswers.publicTransport === 'sometimes') modifyCost('Public', 0.5); // Reduce

    // Vacation
    if (adjustAnswers.vacation === 'high') modifyCost('Vacation', 1.2);
    if (adjustAnswers.vacation === 'low') modifyCost('Vacation', 0.5);

    // Restaurants
    if (adjustAnswers.restaurant === 'yes') modifyCost('Restaurant', 1.2);
    if (adjustAnswers.restaurant === 'no') modifyCost('Restaurant', 0.5);

    // Food (Groceries)
    if (adjustAnswers.food === 'high') modifyCost('Food', 1.2);
    if (adjustAnswers.food === 'low') modifyCost('Food', 0.8);

    // Clothing
    if (adjustAnswers.clothing === 'very often') modifyCost('Clothing', 1.3);
    if (adjustAnswers.clothing === 'rarely') modifyCost('Clothing', 0.5);

    // Utilities
    if (adjustAnswers.utilities === 'high') modifyCost('TV', 1.2); // Matches TV/Internet/Phone
    if (adjustAnswers.utilities === 'low') modifyCost('TV', 0.8);

    // Health is tricky, usually fixed, but maybe supplementary?
    // "Do you have private health insurance?"
    if (adjustAnswers.health === 'no') modifyCost('Health', 0.8); // Assume base only

    setCosts(newCosts);
    setShowAdjustModal(false);
    toast.success(language === 'fr' ? 'Ajustements appliqués' : 'Adjustments applied');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-20 pb-12 bg-background text-foreground" data-testid="data-review-page">
      <div className="w-full max-w-[95%] mx-auto mb-6 px-4">

        <PageHeader
          title={language === 'fr' ? 'Revue des données avant simulation' : 'Data Review Before Simulation'}
          description={language === 'fr' ? 'Vérifiez et ajustez les revenus et coûts avant de lancer la simulation' : 'Review and adjust incomes and costs before running the simulation'}
          rightContent={
            <Button
              onClick={openAdjustModal}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              {language === 'fr' ? 'Suggère moi des ajustements pertinents' : 'Suggest relevant adjustments'}
            </Button>
          }
        />

        {/* Adjust Modal */}
        <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
          <DialogContent className="max-w-7xl bg-card text-card-foreground border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                {language === 'fr' ? 'Donnez-moi des conseils d\'ajustement' : 'Give me some adjustment advice'}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-6">

              {/* Header Row */}
              <div className="grid grid-cols-[40px,1.5fr,1fr,1fr,1fr,1.5fr,1fr] gap-4 mb-4 text-base font-medium text-white px-2">
                <div></div>
                <div>{language === 'fr' ? 'Nom' : 'Name'}</div>
                <div>{language === 'fr' ? 'Montant actuel' : 'Current Amount'}</div>
                <div>{language === 'fr' ? 'Fréquence' : 'Frequency'}</div>
                <div>{language === 'fr' ? 'Montant ajusté' : 'Adjusted Amount'}</div>
                <div>{/* Slider */}</div>
                <div className="text-right">{language === 'fr' ? 'Changement à' : 'Change at'}</div>
              </div>

              <div className="space-y-3">
                {adjustRows.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    {language === 'fr' ? 'Aucun coût pertinent trouvé.' : 'No relevant costs found to adjust.'}
                  </div>
                )}

                {adjustRows.map(row => {
                  const birthYear = new Date(birthDate).getFullYear();
                  const deathYear = new Date(deathDate).getFullYear();
                  const currentYear = new Date().getFullYear();
                  const currentAge = currentYear - birthYear;
                  const deathAge = deathYear - birthYear;
                  const maxAge = deathAge - 1;
                  const startAge = currentAge + 1;
                  const ageOptions = [];
                  if (startAge < maxAge) {
                    for (let y = startAge; y <= maxAge; y++) {
                      ageOptions.push(y);
                    }
                  } else {
                    ageOptions.push(startAge);
                  }

                  return (
                    <div key={row.id} className="mb-4">
                      <p className="text-green-500 mb-2 text-sm font-medium">
                        {language === 'fr'
                          ? 'Vos dépenses de vacances diminuent dans les dernières années de votre vie, fixez un nouveau montant à partir d\'un âge choisi'
                          : 'Your vacation expenses decrease in the later years of your life, set a new amount starting from a chosen age'}
                      </p>
                      <div className="grid grid-cols-[40px,1.5fr,1fr,1fr,1fr,1.5fr,1fr] gap-4 items-center bg-muted/40 p-3 rounded-lg border border-border">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={row.checked}
                            onCheckedChange={(checked) => handleAdjustRowChange(row.id, 'checked', checked)}
                          />
                        </div>
                        <div className="font-medium text-foreground truncate" title={row.name}>{row.name}</div>
                        <div className="text-muted-foreground">CHF {parseFloat(row.originalAmount).toLocaleString()}</div>
                        <div className="text-muted-foreground">{getTranslatedFrequency(row.frequency, t)}</div>
                        <div>
                          <Input
                            type="text"
                            value={row.adjustedAmount ? row.adjustedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/'/g, '');
                              if (!isNaN(rawValue)) {
                                handleAdjustRowChange(row.id, 'adjustedAmount', rawValue);
                              }
                            }}
                            className="h-9 text-right"
                            style={{
                              backgroundColor: parseFloat(row.adjustedAmount) < parseFloat(row.originalAmount) ? 'rgba(34, 197, 94, 0.25)' : parseFloat(row.adjustedAmount) > parseFloat(row.originalAmount) ? 'rgba(239, 68, 68, 0.25)' : 'transparent'
                            }}
                          />
                        </div>
                        <div className="px-2">
                          <Slider
                            value={[row.adjustedAmount]}
                            min={0}
                            max={(row.originalAmount || 1000) * 1.5}
                            step={100}
                            onValueChange={(val) => handleAdjustRowChange(row.id, 'adjustedAmount', val[0])}
                            className="py-2"
                          />
                        </div>
                        <div>
                          <Select
                            value={row.changeAtAge?.toString()}
                            onValueChange={(val) => handleAdjustRowChange(row.id, 'changeAtAge', parseInt(val))}
                            disabled={!row.checked}
                          >
                            <SelectTrigger className={`h-8 bg-background border-input text-foreground ${!row.checked ? 'opacity-50' : ''}`}>
                              <SelectValue placeholder={language === 'fr' ? 'Age' : 'Age'} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">
                              {ageOptions.map(age => (
                                <SelectItem key={age} value={age.toString()}>
                                  {age} {language === 'fr' ? 'ans' : 'years'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                className="bg-transparent border-input text-muted-foreground hover:bg-muted"
                onClick={() => setShowAdjustModal(false)}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button
                className="bg-[#EF5343] hover:bg-[#d94334] text-white px-8"
                onClick={applyTableAdjustments}
              >
                {language === 'fr' ? 'Appliquer' : 'Apply'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="w-[80%] mx-auto">
          {/* Dynamic Datalist for Cluster Tags */}

          {/* Dynamic Datalist for Cluster Tags */}
          <datalist id="cluster-options">
            <option value="Cluster A" />
            <option value="Cluster B" />
            <option value="Cluster C" />
            {/* Dynamically add unique tags from all data sources */}
            {[
              ...new Set([
                ...incomes.map(i => i.clusterTag),
                ...costs.map(c => c.clusterTag),
                ...currentAssets.map(a => a.clusterTag),
                ...desiredOutflows.map(d => d.clusterTag)
              ])
            ].filter(tag => tag && !['Cluster A', 'Cluster B', 'Cluster C'].includes(tag)).map(tag => (
              <option key={tag} value={tag} />
            ))}
          </datalist>

          <div className="space-y-6">

            {/* Incomes Table */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'fr' ? 'Flux périodiques entrants - peuvent être ajustés pour la simulation' : 'Periodic inflows - can be adjusted for simulation'}</CardTitle>

              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold w-[15%]">{t('scenario.name')}</th>
                        <th className="text-right p-3 font-semibold w-[10%]">{t('scenario.originalValue')}</th>
                        <th className="text-right p-3 font-semibold w-[10%]">{t('scenario.adjustedValue')}</th>
                        <th className="text-left p-3 font-semibold">{t('scenario.frequency')}</th>
                        <th className="text-left p-3 font-semibold">{t('scenario.startDate')}</th>
                        <th className="text-left p-3 font-semibold">{t('scenario.endDate')}</th>
                        <th className="text-left p-3 font-semibold w-[15%]">{language === 'fr' ? 'Tag Cluster' : 'Cluster Tag'}</th>
                        <th className="text-center p-3 font-semibold w-[80px]">{t('scenario.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomes.map((income, index) => {
                        // Check if this income is part of a split group
                        const isInGroup = income.groupId !== undefined && income.groupId !== null;
                        const isChildIncome = income.parentId !== undefined && income.parentId !== null;

                        // Visual grouping - lighter background for grouped incomes, slightly indented for children
                        const groupStyles = isInGroup
                          ? 'bg-muted/20 border-l-2 border-l-blue-500/50'
                          : '';
                        const childStyles = isChildIncome
                          ? 'bg-muted/10'
                          : '';

                        // Get effective dates (override or default)
                        const today = new Date().toISOString().split('T')[0];
                        const isStandardIncome = ['Salary', 'LPP', 'AVS', '3a'].includes(income.name);

                        // Calculate default dates for standard income types
                        let defaultStartDate = '';
                        let defaultEndDate = '';

                        if (income.name === 'Salary') {
                          defaultStartDate = today;
                          defaultEndDate = wishedRetirementDate;
                        } else if (income.name === 'LPP') {
                          defaultStartDate = wishedRetirementDate;
                          defaultEndDate = deathDate;
                        } else if (income.name === 'AVS') {
                          defaultStartDate = retirementLegalDate;
                          defaultEndDate = deathDate;
                        } else if (income.name === '3a') {
                          defaultStartDate = wishedRetirementDate;
                          defaultEndDate = '';
                        }

                        // Get current values (override or default)
                        const currentStartDate = isStandardIncome
                          ? (incomeDateOverrides[income.name]?.startDate || defaultStartDate)
                          : income.startDate;
                        const currentEndDate = isStandardIncome
                          ? (incomeDateOverrides[income.name]?.endDate || defaultEndDate)
                          : income.endDate;

                        const isLPPPension = income.name.includes('LPP Pension');

                        return (
                          <tr key={income.id} className={`border-b hover:bg-muted/30 ${groupStyles} ${childStyles}`}>
                            <td className={`p-3 font-medium ${isLPPPension ? 'text-blue-600 font-bold' : 'text-white'}`}>
                              <div className="flex items-center gap-2">
                                {isChildIncome && <span className="text-blue-400 text-xs">↳</span>}
                                {getIncomeName(income.name)}
                                {isInGroup && !isChildIncome && (
                                  <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">{t('scenario.split')}</span>
                                )}
                              </div>
                            </td>
                            <td className="text-right p-3 text-muted-foreground">
                              CHF {parseFloat(income.amount).toLocaleString()}
                            </td>
                            <td className="text-right p-3">
                              <Input
                                data-testid={`income - adjusted - ${index} `}
                                type="text"
                                value={income.adjustedAmount ? income.adjustedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(/'/g, '');
                                  if (!isNaN(rawValue)) {
                                    updateIncomeAdjusted(income.id, rawValue);
                                  }
                                }}
                                className="max-w-[150px] ml-auto text-right"
                                style={{
                                  backgroundColor: parseFloat(income.adjustedAmount) < parseFloat(income.amount) ? 'rgba(34, 197, 94, 0.25)' : parseFloat(income.adjustedAmount) > parseFloat(income.amount) ? 'rgba(239, 68, 68, 0.25)' : 'transparent'
                                }}
                              />
                            </td>
                            <td className="p-3">{getTranslatedFrequency(income.frequency, t)}</td>
                            <td className="p-3">
                              {isStandardIncome ? (
                                <Input
                                  data-testid={`income - start - date - ${index} `}
                                  type="date"
                                  value={currentStartDate || ''}
                                  onChange={(e) => updateIncomeDateOverride(income.name, 'startDate', e.target.value)}
                                  className="max-w-[150px]"
                                />
                              ) : (
                                <Input
                                  type="date"
                                  value={income.startDate || ''}
                                  onChange={(e) => updateIncomeDateWithSync(income.id, 'startDate', e.target.value)}
                                  className="max-w-[150px]"
                                />
                              )}
                            </td>
                            <td className="p-3">
                              {income.name === '3a' ? (
                                null
                              ) : isStandardIncome ? (
                                <Input
                                  data-testid={`income - end - date - ${index} `}
                                  type="date"
                                  value={currentEndDate || ''}
                                  onChange={(e) => updateIncomeDateOverride(income.name, 'endDate', e.target.value)}
                                  className="max-w-[150px]"
                                />
                              ) : (
                                (income.frequency === "One-time" || income.frequency === "Ponctuel") ? null : <Input type="date" value={income.endDate || ""} onChange={(e) => updateIncomeDateWithSync(income.id, "endDate", e.target.value)} className="max-w-[150px]" />
                              )}
                            </td>

                            <td className="p-3">
                              <Input
                                type="text"
                                list="cluster-options"
                                placeholder={language === 'fr' ? 'Sélectionner ou taper...' : 'Select or type...'}
                                value={income.clusterTag || ''}
                                onChange={(e) => updateIncomeField(income.id, 'clusterTag', e.target.value)}
                                className="max-w-[150px]"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  onClick={() => splitIncome(income.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Split this income into two periods"
                                  disabled={income.isRetirement}
                                >
                                  <Split className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => deleteIncome(income.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  title="Delete this income line"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={addIncome}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {language === 'fr' ? '+ ajouter un revenu périodique' : '+ add periodic inflow'}
                  </Button>
                  <Button
                    onClick={resetIncomesToDefaults}
                    variant="outline"
                    size="sm"
                  >
                    {language === 'fr' ? 'Réinitialiser aux valeurs par défaut' : 'Reset to defaults'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Assets Table */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'fr' ? 'Actifs actuels ou futurs' : 'Current or future Assets'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold w-[15%]">{language === 'fr' ? 'Nom' : 'Name'}</th>
                        <th className="text-right p-3 font-semibold w-[10%]">{language === 'fr' ? 'Valeur originale' : 'Original Value'}</th>
                        <th className="text-right p-3 font-semibold w-[10%]">{language === 'fr' ? 'Valeur ajustée' : 'Adjusted Value'}</th>
                        <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Catégorie' : 'Category'}</th>
                        {/* Own Type Column Moved */}
                        <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Propre Type' : 'Own Type'}</th>
                        <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Propre Valeur' : 'Own Value'}</th>
                        {/* Preserve Column Removed */}
                        <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Type de dispo.' : 'Availability Type'}</th>
                        <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Valeur de dispo.' : 'Availability Value'}</th>
                        <th className="text-center p-3 font-semibold">{language === 'fr' ? 'Investir ?' : 'Invest?'}</th>
                        <th className="text-right p-3 font-semibold w-[15%]">{language === 'fr' ? 'Tag Cluster' : 'Cluster Tag'}</th>
                        <th className="text-center p-3 font-semibold w-[80px]">{language === 'fr' ? 'Actions' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAssets.map((asset) => {
                        const originalAmount = parseFloat(asset.amount) || 0;
                        const adjustedAmount = parseFloat(asset.adjustedAmount || asset.amount) || 0;
                        const isDecreased = adjustedAmount < originalAmount;
                        const isIncreased = adjustedAmount > originalAmount;

                        const isLPPCapital = asset.name.includes('LPP Capital');

                        return (
                          <tr key={asset.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                              <Input
                                type="text"
                                value={asset.name}
                                onChange={(e) => updateAsset(asset.id, 'name', e.target.value)}
                                className={`font-medium ${isLPPCapital ? 'text-blue-600 font-bold' : ''}`}
                              />
                            </td>
                            <td className="text-right p-3 text-muted-foreground">
                              CHF {originalAmount.toLocaleString()}
                            </td>
                            <td className="text-right p-3">
                              <Input
                                type="text"
                                value={(asset.adjustedAmount !== undefined ? asset.adjustedAmount : asset.amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(/'/g, '');
                                  if (!isNaN(rawValue)) {
                                    updateAsset(asset.id, 'adjustedAmount', rawValue);
                                  }
                                }}
                                className={`max-w-[150px] ml-auto text-right ${isDecreased ? 'bg-green-500/10' : isIncreased ? 'bg-red-500/10' : ''}`}
                              />
                            </td>
                            <td className="p-3">
                              <Select
                                value={asset.category}
                                onValueChange={(value) => updateAsset(asset.id, 'category', value)}
                              >
                                <SelectTrigger className="max-w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Liquid">{language === 'fr' ? 'Liquide' : 'Liquid'}</SelectItem>
                                  <SelectItem value="Illiquid">{language === 'fr' ? 'Illiquide' : 'Illiquid'}</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            {/* Preserve Cell Removed */}
                            {/* Own Type Column Moved */}
                            <td className="p-3">
                              <Select
                                value={asset.ownType || 'Date'}
                                onValueChange={(value) => updateAsset(asset.id, 'ownType', value)}
                              >
                                <SelectTrigger className="max-w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Date">{language === 'fr' ? 'Date' : 'Date'}</SelectItem>
                                  <SelectItem value="Period">{language === 'fr' ? 'Période' : 'Period'}</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            {/* Own Value Column Moved */}
                            <td className="p-3">
                              {asset.ownType === 'Period' ? (
                                <Select
                                  value={asset.ownTimeframe || 'Select'}
                                  onValueChange={(value) => updateAsset(asset.id, 'ownTimeframe', value === 'Select' ? '' : value)}
                                >
                                  <SelectTrigger className="max-w-[150px]">
                                    <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Select'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Select">{language === 'fr' ? 'Sélectionner' : 'Select'}</SelectItem>
                                    <SelectItem value="within_5y">{language === 'fr' ? 'dans les 5 prochaines années' : 'within next 5 years'}</SelectItem>
                                    <SelectItem value="within_5_10y">{language === 'fr' ? 'dans 5 à 10 ans' : 'within 5 to 10y'}</SelectItem>
                                    <SelectItem value="within_10_15y">{language === 'fr' ? 'dans 10 à 15 ans' : 'within 10 to 15y'}</SelectItem>
                                    <SelectItem value="within_15_20y">{language === 'fr' ? 'dans 15 à 20 ans' : 'within 15 to 20y'}</SelectItem>
                                    <SelectItem value="within_20_25y">{language === 'fr' ? 'dans 20 à 25 ans' : 'within 20 to 25y'}</SelectItem>
                                    <SelectItem value="within_25_30y">{language === 'fr' ? 'dans 25 à 30 ans' : 'within 25 to 30y'}</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type="date"
                                  value={asset.ownDate || ''}
                                  onChange={(e) => updateAsset(asset.id, 'ownDate', e.target.value)}
                                  className="max-w-[140px]"
                                />
                              )}
                            </td>
                            <td className="p-3">
                              <Select
                                value={asset.availabilityType || (asset.availabilityTimeframe ? 'Period' : 'Date')}
                                onValueChange={(value) => updateAsset(asset.id, 'availabilityType', value)}
                              >
                                <SelectTrigger className="max-w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Date">{language === 'fr' ? 'Date' : 'Date'}</SelectItem>
                                  <SelectItem value="Period">{language === 'fr' ? 'Période' : 'Period'}</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              {(asset.availabilityType === 'Period' || (!asset.availabilityType && asset.availabilityTimeframe)) ? (
                                <Select
                                  value={asset.availabilityTimeframe || 'Select'}
                                  onValueChange={(value) => updateAsset(asset.id, 'availabilityTimeframe', value === 'Select' ? '' : value)}
                                >
                                  <SelectTrigger className="max-w-[150px]">
                                    <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Select'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Select">{language === 'fr' ? 'Sélectionner' : 'Select'}</SelectItem>
                                    <SelectItem value="within_5y">{language === 'fr' ? 'dans les 5 prochaines années' : 'within next 5 years'}</SelectItem>
                                    <SelectItem value="within_5_10y">{language === 'fr' ? 'dans 5 à 10 ans' : 'within 5 to 10y'}</SelectItem>
                                    <SelectItem value="within_10_15y">{language === 'fr' ? 'dans 10 à 15 ans' : 'within 10 to 15y'}</SelectItem>
                                    <SelectItem value="within_15_20y">{language === 'fr' ? 'dans 15 à 20 ans' : 'within 15 to 20y'}</SelectItem>
                                    <SelectItem value="within_20_25y">{language === 'fr' ? 'dans 20 à 25 ans' : 'within 20 to 25y'}</SelectItem>
                                    <SelectItem value="within_25_30y">{language === 'fr' ? 'dans 25 à 30 ans' : 'within 25 to 30y'}</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type="date"
                                  value={asset.availabilityDate || ''}
                                  onChange={(e) => updateAsset(asset.id, 'availabilityDate', e.target.value)}
                                  className="max-w-[140px]"
                                />
                              )}
                            </td>
                            <td className="p-3">
                              {asset.category === 'Liquid' ? (
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    checked={asset.strategy === 'Invested'}
                                    onCheckedChange={(checked) => updateAsset(asset.id, 'strategy', checked ? 'Invested' : 'Not invested')}
                                  />
                                  <span className="text-sm">{language === 'fr' ? 'Oui' : 'Yes'}</span>
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground">-</div>
                              )}
                            </td>
                            <td className="p-3">
                              <Input
                                type="text"
                                list="cluster-options"
                                placeholder={language === 'fr' ? 'Sélectionner ou taper...' : 'Select or type...'}
                                value={asset.clusterTag || ''}
                                onChange={(e) => updateAsset(asset.id, 'clusterTag', e.target.value)}
                                className="max-w-[150px] ml-auto" // Added ml-auto to align right content similar to text-right header
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  onClick={() => duplicateAsset(asset.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Duplicate this asset"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => deleteAsset(asset.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  title="Delete this asset"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={addAsset}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {language === 'fr' ? '+ ajouter un actif' : '+ add asset'}
                  </Button>
                  <Button
                    onClick={resetAssetsToDefaults}
                    variant="outline"
                    size="sm"
                  >
                    {language === 'fr' ? 'Réinitialiser aux valeurs par défaut' : 'Reset to defaults'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Costs Table */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'fr' ? 'Flux périodiques sortants - peuvent être ajustés pour la simulation' : 'Periodic outflows - can be adjusted for simulation'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold w-[15%]">{t('scenario.name')}</th>
                        <th className="text-right p-3 font-semibold w-[10%]">{t('scenario.originalValue')}</th>
                        <th className="text-right p-3 font-semibold w-[10%]">{t('scenario.adjustedValue')}</th>
                        <th className="text-left p-3 font-semibold">{t('scenario.frequency')}</th>
                        <th className="text-left p-3 font-semibold">{t('scenario.startDate')}</th>
                        <th className="text-left p-3 font-semibold">{t('scenario.endDate')}</th>
                        <th className="text-left p-3 font-semibold w-[15%]">{language === 'fr' ? 'Tag Cluster' : 'Cluster Tag'}</th>
                        <th className="text-center p-3 font-semibold w-[80px]">{t('scenario.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costs.map((cost, index) => {
                        // Check if this cost is part of a split group
                        const isInGroup = cost.groupId !== undefined && cost.groupId !== null;
                        const isChildCost = cost.parentId !== undefined && cost.parentId !== null;

                        // Visual grouping - lighter background for grouped costs, slightly indented for children
                        const groupStyles = isInGroup
                          ? 'bg-muted/20 border-l-2 border-l-blue-500/50'
                          : '';
                        const childStyles = isChildCost
                          ? 'bg-muted/10'
                          : '';

                        return (
                          <tr
                            key={cost.id}
                            className={`border - b hover: bg - muted / 30 ${groupStyles} ${childStyles} `}
                          >
                            <td className="p-3 font-medium text-white">
                              <div className="flex items-center gap-2">
                                {isChildCost && <span className="text-blue-400 text-xs">↳</span>}
                                {getCostName(cost.name)}
                                {isInGroup && !isChildCost && (
                                  <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">{t('scenario.split')}</span>
                                )}
                              </div>
                            </td>
                            <td className="text-right p-3 text-muted-foreground">
                              CHF {parseFloat(cost.amount).toLocaleString()}
                            </td>
                            <td className="text-right p-3">
                              <Input
                                data-testid={`cost - adjusted - ${index} `}
                                type="text"
                                value={cost.adjustedAmount ? cost.adjustedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(/'/g, '');
                                  if (!isNaN(rawValue)) {
                                    updateCostAdjusted(cost.id, rawValue);
                                  }
                                }}
                                className="max-w-[150px] ml-auto text-right"
                                style={{
                                  backgroundColor: parseFloat(cost.adjustedAmount) < parseFloat(cost.amount) ? 'rgba(34, 197, 94, 0.25)' : parseFloat(cost.adjustedAmount) > parseFloat(cost.amount) ? 'rgba(239, 68, 68, 0.25)' : 'transparent'
                                }}
                              />
                            </td>
                            <td className="p-3">{getTranslatedFrequency(cost.frequency, t)}</td>
                            <td className="p-3">
                              <Input
                                data-testid={`cost - start - date - ${index} `}
                                type="date"
                                value={cost.startDate || ''}
                                onChange={(e) => updateCostDateWithSync(cost.id, 'startDate', e.target.value)}
                                className="max-w-[150px]"
                              />
                            </td>
                            <td className="p-3">
                              {(cost.frequency === "One-time" || cost.frequency === "Ponctuel") ? null : <Input data-testid={`cost - end - date - ${index} `} type="date" value={cost.endDate || ""} onChange={(e) => updateCostDateWithSync(cost.id, "endDate", e.target.value)} className="max-w-[150px]" />}
                            </td>
                            <td className="p-3">
                              <Input
                                type="text"
                                list="cluster-options"
                                placeholder={language === 'fr' ? 'Sélectionner ou taper...' : 'Select or type...'}
                                value={cost.clusterTag || ''}
                                onChange={(e) => updateCostField(cost.id, 'clusterTag', e.target.value)}
                                className="max-w-[150px]"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  onClick={() => splitCost(cost.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Split this cost into two periods"
                                >
                                  <Split className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => deleteCost(cost.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  title="Delete this cost line"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={addCost}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {language === 'fr' ? '+ ajouter une sortie périodique' : '+ add periodic outflow'}
                  </Button>
                  <Button
                    onClick={resetCostsToDefaults}
                    variant="outline"
                    size="sm"
                  >
                    {language === 'fr' ? 'Réinitialiser aux valeurs par défaut' : 'Reset to defaults'}
                  </Button>
                </div>
              </CardContent>
            </Card>





            {/* Debts Table */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'fr' ? 'Dettes actuelles ou futures' : 'Current or future Debts'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold w-[15%]">{language === 'fr' ? 'Nom' : 'Name'}</th>
                        <th className="text-right p-3 font-semibold w-[10%]">{language === 'fr' ? 'Valeur originale' : 'Original Value'}</th>
                        <th className="text-right p-3 font-semibold w-[10%]">{language === 'fr' ? 'Valeur ajustée' : 'Adjusted Value'}</th>
                        <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Type de disponibilité' : 'Availability Type'}</th>
                        <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Détails de disponibilité' : 'Availability Details'}</th>
                        <th className="text-left p-3 font-semibold w-[15%]">{language === 'fr' ? 'Tag Cluster' : 'Cluster Tag'}</th>
                        <th className="text-center p-3 font-semibold w-[80px]">{language === 'fr' ? 'Actions' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desiredOutflows.map((debt) => {
                        const originalAmount = parseFloat(debt.amount) || 0;
                        const adjustedAmount = parseFloat(debt.adjustedAmount || debt.amount) || 0;
                        const isDecreased = adjustedAmount < originalAmount;
                        const isIncreased = adjustedAmount > originalAmount;

                        return (
                          <tr key={debt.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-medium text-white">{debt.name}</td>
                            <td className="text-right p-3 text-muted-foreground">
                              CHF {originalAmount.toLocaleString()}
                            </td>
                            <td className="text-right p-3">
                              <Input
                                type="text"
                                value={(debt.adjustedAmount !== undefined ? debt.adjustedAmount : debt.amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(/'/g, '');
                                  if (!isNaN(rawValue)) {
                                    updateDebt(debt.id, 'adjustedAmount', rawValue);
                                  }
                                }}
                                className={`max-w-[150px] ml-auto text-right ${isDecreased ? 'bg-green-500/10' : isIncreased ? 'bg-red-500/10' : ''}`}
                              />
                            </td>
                            <td className="p-3">
                              <Select
                                value={debt.madeAvailableType || (debt.madeAvailableTimeframe ? 'Period' : 'Date')}
                                onValueChange={(value) => updateDebt(debt.id, 'madeAvailableType', value)}
                              >
                                <SelectTrigger className="max-w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Date">{language === 'fr' ? 'Date' : 'Date'}</SelectItem>
                                  <SelectItem value="Period">{language === 'fr' ? 'Période' : 'Period'}</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              {(debt.madeAvailableType === 'Period' || (!debt.madeAvailableType && debt.madeAvailableTimeframe)) ? (
                                <Select
                                  value={debt.madeAvailableTimeframe || 'Select'}
                                  onValueChange={(value) => updateDebt(debt.id, 'madeAvailableTimeframe', value === 'Select' ? '' : value)}
                                >
                                  <SelectTrigger className="max-w-[150px]">
                                    <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Select'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Select">{language === 'fr' ? 'Sélectionner' : 'Select'}</SelectItem>
                                    <SelectItem value="within_5y">{language === 'fr' ? 'dans les 5 prochaines années' : 'within next 5 years'}</SelectItem>
                                    <SelectItem value="within_5_10y">{language === 'fr' ? 'dans 5 à 10 ans' : 'within 5 to 10y'}</SelectItem>
                                    <SelectItem value="within_10_15y">{language === 'fr' ? 'dans 10 à 15 ans' : 'within 10 to 15y'}</SelectItem>
                                    <SelectItem value="within_15_20y">{language === 'fr' ? 'dans 15 à 20 ans' : 'within 15 to 20y'}</SelectItem>
                                    <SelectItem value="within_20_25y">{language === 'fr' ? 'dans 20 à 25 ans' : 'within 20 to 25y'}</SelectItem>
                                    <SelectItem value="within_25_30y">{language === 'fr' ? 'dans 25 à 30 ans' : 'within 25 to 30y'}</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type="date"
                                  value={debt.madeAvailableDate || ''}
                                  onChange={(e) => updateDebt(debt.id, 'madeAvailableDate', e.target.value)}
                                  className="max-w-[140px]"
                                />
                              )}
                            </td>
                            <td className="p-3">
                              <Input
                                type="text"
                                list="cluster-options"
                                placeholder={language === 'fr' ? 'Sélectionner ou taper...' : 'Select or type...'}
                                value={debt.clusterTag || ''}
                                onChange={(e) => updateDebt(debt.id, 'clusterTag', e.target.value)}
                                className="max-w-[150px]"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  onClick={() => deleteDebt(debt.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  title="Delete this debt"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={addDebt}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {language === 'fr' ? '+ ajouter une dette' : '+ add debt'}
                  </Button>
                  <Button
                    onClick={resetDebtsToDefaults}
                    variant="outline"
                    size="sm"
                  >
                    {language === 'fr' ? 'Réinitialiser aux valeurs par défaut' : 'Reset to defaults'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4 mt-6">
              <Button
                onClick={() => navigate('/capital-setup')}
                className="px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {language === 'fr' ? 'Aller à la configuration de la gestion du capital' : 'Go to Capital management setup'}
              </Button>
              <Button
                data-testid="can-i-quit-btn"
                onClick={runSimulation}
                className="px-12 text-lg"
                size="lg"
              >
                {language === 'fr' ? 'Lancer la simulation' : 'Run simulation'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default DataReview;
