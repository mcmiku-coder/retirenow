
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';

import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import DateInputWithShortcuts from '../components/DateInputWithShortcuts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { getIncomeData, getCostData, getUserData, getScenarioData, saveScenarioData, getRetirementData, getAssetsData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import { migrateToV2 } from '../utils/retirementDataMigration';
import { Calendar, Minus, Trash2, Split, Plus, TrendingUp, Lightbulb, Copy } from 'lucide-react';

// Income name translation keys
const INCOME_KEYS = {
  'Salary': 'salary',
  'Net Salary': 'salary',
  'AVS': 'avs',
  'LPP': 'lpp',
  'Projected LPP Pension': 'lpp',
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



// Helper to convert birthdate + age to YYYY-MM-DD
const calculateWishedDate = (bDateStr, age) => {
  if (!bDateStr || !age) return '';
  const bDate = new Date(bDateStr);
  const wishedDate = new Date(Date.UTC(
    bDate.getUTCFullYear() + parseInt(age),
    bDate.getUTCMonth() + 1,
    1, 0, 0, 0, 0
  ));
  return wishedDate.toISOString().split('T')[0];
};

const DataReview = () => {

  const navigate = useNavigate();
  const { user, masterKey } = useAuth();
  const { t, language } = useLanguage();
  const location = useLocation();

  const [wishedRetirementDate, setWishedRetirementDate] = useState('');
  const [retirementLegalDate, setRetirementLegalDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [wishedRetirementDate2, setWishedRetirementDate2] = useState('');
  const [retirementLegalDate2, setRetirementLegalDate2] = useState('');
  const [deathDate2, setDeathDate2] = useState('');
  const [birthDate2, setBirthDate2] = useState('');

  const [incomes, setIncomes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [retirementData, setRetirementData] = useState(null);
  const [liquidAssets, setLiquidAssets] = useState('');
  const [nonLiquidAssets, setNonLiquidAssets] = useState('');
  const [futureInflows, setFutureInflows] = useState([]);
  const [currentAssets, setCurrentAssets] = useState([]);
  const [projectedOutflows, setProjectedOutflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isCouple, setIsCouple] = useState(false);

  // AUTOMATION FIX: Auto-run simulation if flag is present
  useEffect(() => {
    if (location.state?.autoAutomateFullSequence && !loading) {
      console.log('Automated Sequence: DataReview -> Result');
      toast.info(language === 'fr' ? 'Finalisation du calcul...' : 'Finalizing calculation...');

      // Wait for data load + small delay
      setTimeout(() => {
        const runBtn = document.querySelector('button[data-testid="can-i-quit-btn"]');
        if (runBtn) {
          runBtn.click();
        } else {
          // Fallback if testid missing
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent.includes('Lancer') || b.textContent.includes('Run'));
          if (btn) btn.click();
        }
      }, 500);
    }
  }, [location.state, loading]);

  // Adjustment button handler
  const handleSuggestionClick = () => {
    navigate('/adjustment-advice');
  };

  // Retirement option: 'option1', 'option2', or 'option3'
  const [retirementOption, setRetirementOption] = useState('option1');

  // Option 1 fields
  const [pensionCapital, setPensionCapital] = useState('');
  const [yearlyReturn, setYearlyReturn] = useState('0');

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
        const userDataFetched = await getUserData(user.email, masterKey);
        setUserData(userDataFetched);
        const userData = userDataFetched;
        const incomeData = await getIncomeData(user.email, masterKey) || [];
        const costData = await getCostData(user.email, masterKey) || [];
        let scenarioData = await getScenarioData(user.email, masterKey);
        let assetsData = await getAssetsData(user.email, masterKey) || {};

        if (location.state?.scenarioData) {
          console.log('Using scenarioData from navigation state');
          scenarioData = { ...(scenarioData || {}), ...location.state.scenarioData };
          if (location.state.overrideEarlyRetirementAge) {
            scenarioData.earlyRetirementAge = location.state.overrideEarlyRetirementAge.toString();
          }
        }

        const rDataRaw = await getRetirementData(user.email, masterKey);
        console.log('DEBUG: rDataRaw fetched:', rDataRaw);
        // [V2 REFACTOR] Detect if it's old structure (v1) or new (v2 with p1/p2)
        let rData = null;
        if (rDataRaw) {
          if (rDataRaw.p1 || rDataRaw.p2) {
            console.log('DEBUG: Detected nested V2 structure');
            rData = {
              p1: migrateToV2(rDataRaw.p1, userData),
              p2: userData.analysisType === 'couple' ? migrateToV2(rDataRaw.p2, { ...userData, birthDate: userData.birthDate2, gender: userData.gender2 }) : null
            };
          } else {
            console.log('DEBUG: Detected legacy single-person structure');
            // Legacy single-person structure
            rData = {
              p1: migrateToV2(rDataRaw, userData),
              p2: null
            };
          }
        }
        console.log('DEBUG: final migrated rData:', rData);
        setRetirementData(rData);

        if (!userData) {
          navigate('/personal-info');
          return;
        }

        setIsCouple(userData.analysisType === 'couple');

        const birthDate1 = new Date(userData.birthDate);
        setBirthDate(userData.birthDate);
        const retirementDate1 = new Date(Date.UTC(birthDate1.getUTCFullYear() + 65, birthDate1.getUTCMonth() + 1, 1, 0, 0, 0, 0));
        const retirementDateStr1 = retirementDate1.toISOString().split('T')[0];
        setRetirementLegalDate(retirementDateStr1);

        let deathDateStr1;
        if (userData.theoreticalDeathDate) {
          deathDateStr1 = userData.theoreticalDeathDate;
        } else {
          const approximateLifeExpectancy = userData.gender === 'male' ? 80 : 85;
          const dDate = new Date(birthDate1);
          dDate.setUTCFullYear(dDate.getUTCFullYear() + approximateLifeExpectancy);
          deathDateStr1 = dDate.toISOString().split('T')[0];
        }
        setDeathDate(deathDateStr1);

        let retirementDateStr2 = '';
        let deathDateStr2 = '';
        if (userData.analysisType === 'couple' && userData.birthDate2) {
          const birthDate2Parsed = new Date(userData.birthDate2);
          setBirthDate2(userData.birthDate2);
          const retirementDate2 = new Date(Date.UTC(birthDate2Parsed.getUTCFullYear() + 65, birthDate2Parsed.getUTCMonth() + 1, 1, 0, 0, 0, 0));
          retirementDateStr2 = retirementDate2.toISOString().split('T')[0];
          setRetirementLegalDate2(retirementDateStr2);

          if (userData.theoreticalDeathDate2) {
            deathDateStr2 = userData.theoreticalDeathDate2;
          } else {
            const approximateLifeExpectancy = userData.gender2 === 'male' ? 80 : 85;
            const dDate = new Date(birthDate2Parsed);
            dDate.setUTCFullYear(dDate.getUTCFullYear() + approximateLifeExpectancy);
            deathDateStr2 = dDate.toISOString().split('T')[0];
          }
          setDeathDate2(deathDateStr2);
        }

        // Synchronize retirement dates with questionnaire simulationAge
        let syncWishedDate1 = scenarioData?.wishedRetirementDate || retirementDateStr1;
        let syncWishedDate2 = scenarioData?.wishedRetirementDate2 || retirementDateStr2;

        if (!scenarioData?.wishedRetirementDate && rData?.p1?.questionnaire?.simulationAge) {
          syncWishedDate1 = calculateWishedDate(userData.birthDate, rData.p1.questionnaire.simulationAge);
        }
        if (!scenarioData?.wishedRetirementDate2 && rData?.p2?.questionnaire?.simulationAge) {
          syncWishedDate2 = calculateWishedDate(userData.birthDate2, rData.p2.questionnaire.simulationAge);
        }

        setWishedRetirementDate(syncWishedDate1);
        setWishedRetirementDate2(syncWishedDate2);
        setRetirementOption(scenarioData?.retirementOption || 'option1');

        if (scenarioData) {
          console.log('DEBUG: scenarioData loaded:', scenarioData);
          setPensionCapital(scenarioData.pensionCapital || '');
          setYearlyReturn(scenarioData.yearlyReturn || '0');
          if (scenarioData.incomeDateOverrides) setIncomeDateOverrides(scenarioData.incomeDateOverrides);
        }

        // Consolidate Assets Loading
        const sourceAssets = (scenarioData?.currentAssets?.length > 0) ? scenarioData.currentAssets : (assetsData?.currentAssets || []);
        let finalAssets = sourceAssets.filter(a => a.amount && a.amount !== '' && a.amount !== '0');

        const liquidTotal = finalAssets.filter(a => a.category === 'Liquid').reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
        const illiquidTotal = finalAssets.filter(a => a.category === 'Illiquid').reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
        setLiquidAssets(liquidTotal.toString());
        setNonLiquidAssets(illiquidTotal.toString());
        setFutureInflows(assetsData.futureInflows || []);
        const loadedProjectedOutflows = (scenarioData?.projectedOutflows || scenarioData?.desiredOutflows || assetsData?.projectedOutflows || assetsData?.desiredOutflows || []).filter(o => o.amount && o.amount !== '0');
        setProjectedOutflows(loadedProjectedOutflows);

        const processedRetirementIncome = [];
        const processRetirementForPerson = (pData, pBirthDate, pLegalDate, pDeathDate, personId, personLabel) => {
          if (!pData) return;
          const { questionnaire, benefitsData } = pData;
          const simWishedDate = (personId === 'p1') ? syncWishedDate1 : syncWishedDate2;
          const simAge = questionnaire.simulationAge;
          const option = scenarioData.retirementOption || 'option1';

          // 1. AVS
          console.log(`DEBUG [${personId}]: Checking AVS data:`, benefitsData.avs);
          // Always push AVS row if it's couple or if amount > 0, to ensure it shows up in Data Review
          if ((benefitsData.avs && benefitsData.avs.amount) || userData.analysisType === 'couple' || personId === 'p1') {
            let avsAmount = benefitsData.avs?.amount || '0';

            console.log(`DEBUG [${personId}]: Pushing AVS row with amount: "${avsAmount}"`);
            processedRetirementIncome.push({
              id: `avs_${personId}`, name: `AVS`, person: personId === 'p2' ? 'Person 2' : 'Person 1',
              amount: avsAmount, adjustedAmount: avsAmount,
              frequency: 'Yearly', startDate: benefitsData.avs?.startDate || pLegalDate,
              endDate: pDeathDate, isRetirement: true
            });
          }

          // 2. LPP Pension
          let targetAge = parseInt(simAge) || 65;
          // [FIX] Option 2 uses the simulation age from the questionnaire, which is already independent for P1 and P2
          console.log(`DEBUG [${personId}]: Checking LPP Pension flow. Option: ${option}, targetAge: ${targetAge}`);
          let lppPensionAmount = null;
          let lppCapitalAmount = null;

          const lppData = benefitsData.lppByAge?.[targetAge] || benefitsData.lppByAge?.[targetAge.toString()];
          console.log(`DEBUG [${personId}]: lppData for targetAge ${targetAge}:`, lppData);
          if (lppData) {
            lppPensionAmount = lppData.pension;
            lppCapitalAmount = lppData.capital;
          }


          console.log(`DEBUG [${personId}]: Final determined LPP Pension: ${lppPensionAmount}`);
          if (lppPensionAmount && lppPensionAmount !== '0') {
            const startDate = (targetAge === 65) ? pLegalDate : calculateWishedDate(pBirthDate, targetAge);
            processedRetirementIncome.push({
              id: `lpp_pension_${personId}`,
              name: language === 'fr' ? `Rente LPP à ${targetAge} ans` : `LPP pension at ${targetAge}y`,
              person: personId === 'p2' ? 'Person 2' : 'Person 1',
              amount: lppPensionAmount, adjustedAmount: lppPensionAmount,
              frequency: 'Yearly', startDate, endDate: pDeathDate, isRetirement: true
            });
          }

          // 3. Retirement Assets
          const upsertRetirementAsset = (asset) => {
            const existingIdx = finalAssets.findIndex(a => a.id === asset.id);
            if (existingIdx >= 0) {
              const existingAdjusted = finalAssets[existingIdx].adjustedAmount;
              finalAssets[existingIdx] = { ...asset, adjustedAmount: existingAdjusted || asset.amount };
            } else {
              finalAssets.unshift(asset);
            }
          };

          if (lppCapitalAmount && lppCapitalAmount !== '0') {
            upsertRetirementAsset({
              id: `lpp_capital_${personId}`, name: `Projected LPP Capital`, person: personId === 'p2' ? 'Person 2' : 'Person 1',
              amount: lppCapitalAmount, category: 'Liquid', availabilityType: 'Date',
              availabilityDate: calculateWishedDate(pBirthDate, targetAge), strategy: 'Cash', isRetirement: true
            });
          }

          if (benefitsData.threeA) {
            benefitsData.threeA.forEach((item, idx) => {
              if (item.amount) upsertRetirementAsset({
                id: `threeA_${personId}_${idx}`, name: `3a (${idx + 1})`, person: personId === 'p2' ? 'Person 2' : 'Person 1',
                amount: item.amount, category: 'Liquid', availabilityType: 'Date',
                availabilityDate: item.startDate || simWishedDate, strategy: 'Cash', isRetirement: true
              });
            });
          }

          if (benefitsData.librePassages) {
            benefitsData.librePassages.forEach((item, idx) => {
              if (item.amount) upsertRetirementAsset({
                id: `libre_${personId}_${idx}`, name: item.name || `Libre-Passage (${idx + 1})`, person: personId === 'p2' ? 'Person 2' : 'Person 1',
                amount: item.amount, category: 'Liquid', availabilityType: 'Date',
                availabilityDate: item.startDate || simWishedDate, strategy: 'Cash', isRetirement: true
              });
            });
          }

          if (benefitsData.lppCurrentCapital) {
            upsertRetirementAsset({
              id: `lpp_current_${personId}`, name: `LPP Current Capital`, person: personId === 'p2' ? 'Person 2' : 'Person 1',
              amount: benefitsData.lppCurrentCapital, category: 'Liquid', availabilityType: 'Date',
              availabilityDate: benefitsData.lppCurrentCapitalDate || simWishedDate, strategy: 'Cash', isRetirement: true
            });
          }
        };

        if (rData) {
          console.log('DEBUG: rData found', rData);
          processRetirementForPerson(rData.p1, userData.birthDate, retirementDateStr1, deathDateStr1, 'p1', userData.analysisType === 'couple' ? (userData.firstName || 'Person 1') : '');
          if (userData.analysisType === 'couple' && rData.p2) {
            console.log('DEBUG: Processing p2 rData');
            processRetirementForPerson(rData.p2, userData.birthDate2, retirementDateStr2, deathDateStr2, 'p2', userData.firstName2 || 'Person 2');
          }
        } else {
          console.warn('DEBUG: rData is NULL or UNDEFINED');
        }

        // Final Merge for Incomes
        const injectedIds = processedRetirementIncome.map(i => i.id);
        const originalRegularIncomes = incomeData.filter(i =>
          i.amount && i.amount !== '0' &&
          !i.location &&
          // Only filter out retirement items that we successfully re-injected
          !(i.isRetirement && injectedIds.includes(i.id))
        ).map(i => {
          let endDate = i.endDate;
          if (i.name === 'Net Salary' || i.name === 'Salary') {
            const isP2 = (i.person === 'Person 2' || i.owner === 'p2' || (userData?.firstName2 && i.person === userData.firstName2));
            endDate = isP2 ? syncWishedDate2 : syncWishedDate1;
          }
          return { ...i, endDate, adjustedAmount: i.amount };
        });

        console.log('DEBUG: processedRetirementIncome length:', processedRetirementIncome.length);
        console.log('DEBUG: processedRetirementIncome content:', processedRetirementIncome);

        const allOriginalIncomes = [...originalRegularIncomes, ...processedRetirementIncome];
        let finalIncomes = allOriginalIncomes;

        // [SORT] Apply custom sorting for Data Review table (Type first, then Person)
        finalIncomes.sort((a, b) => {
          const getTypePriority = (name) => {
            if (name.includes('Salary') || name.includes('Salaire')) return 1;
            if (name.includes('LPP')) return 2;
            if (name.includes('AVS')) return 3;
            return 4;
          };
          const aPriority = getTypePriority(a.name);
          const bPriority = getTypePriority(b.name);
          if (aPriority !== bPriority) return aPriority - bPriority;

          // If same type, order by person (P1 then P2)
          const aIsP2 = isPerson2(a);
          const bIsP2 = isPerson2(b);
          if (aIsP2 && !bIsP2) return 1;
          if (!aIsP2 && bIsP2) return -1;
          return 0;
        });

        if (scenarioData.adjustedIncomes?.length > 0) {
          finalIncomes = finalIncomes.map(freshInc => {
            const savedInc = scenarioData.adjustedIncomes.find(si => si.id === freshInc.id);
            return savedInc ? { ...freshInc, adjustedAmount: savedInc.adjustedAmount } : freshInc;
          });
        }

        setIncomes(finalIncomes);
        setCurrentAssets(finalAssets);

        const originalCosts = costData.filter(c => c.amount && c.amount !== '0').map(c => ({ ...c, adjustedAmount: c.amount }));
        let finalCosts = originalCosts;

        // 1. Merge with any saved adjustments from the scenario
        if (scenarioData.adjustedCosts?.length > 0) {
          finalCosts = finalCosts.map(freshC => {
            const savedC = scenarioData.adjustedCosts.find(sc => sc.id === freshC.id);
            return savedC ? { ...freshC, adjustedAmount: savedC.adjustedAmount, startDate: savedC.startDate, endDate: savedC.endDate } : freshC;
          });
        }

        // 2. [CONSOLIDATED LOGIC] Handle auto-splitting and date enforcement for 'consolidated' rows
        if (userData.analysisType === 'couple') {
          const firstDeath = deathDateStr1 < deathDateStr2 ? deathDateStr1 : deathDateStr2;
          const secondDeath = deathDateStr1 > deathDateStr2 ? deathDateStr1 : deathDateStr2;
          const survivor = deathDateStr1 < deathDateStr2 ? 'p2' : 'p1';
          const nextDayDate = new Date(firstDeath);
          nextDayDate.setDate(nextDayDate.getDate() + 1);
          const nextDay = nextDayDate.toISOString().split('T')[0];

          const expandedCosts = [];
          finalCosts.forEach(cost => {
            if (cost.owner === 'consolidated' && !cost.groupId) {
              const groupId = cost.id;
              // Part 1: Start -> First Death (Full Amount)
              expandedCosts.push({
                ...cost,
                groupId,
                endDate: firstDeath
              });
              // Part 2: First Death + 1 -> Second Death (Half Amount)
              expandedCosts.push({
                ...cost,
                id: cost.id + '_split',
                parentId: cost.id,
                groupId,
                owner: survivor,
                amount: (parseFloat(cost.amount) / 2).toString(),
                adjustedAmount: (parseFloat(cost.adjustedAmount || cost.amount) / 2).toString(),
                startDate: nextDay,
                endDate: secondDeath
              });
            } else if (cost.groupId) {
              // Row already split but let's enforce dates if they drifted (e.g. from adjustedCosts)
              const isChild = cost.id.toString().includes('_split') || cost.parentId;
              if (isChild) {
                expandedCosts.push({
                  ...cost,
                  startDate: nextDay,
                  endDate: secondDeath
                });
              } else if (cost.owner === 'consolidated') {
                expandedCosts.push({
                  ...cost,
                  endDate: firstDeath
                });
              } else {
                expandedCosts.push(cost);
              }
            } else {
              expandedCosts.push(cost);
            }
          });
          finalCosts = expandedCosts;
        }

        setCosts(finalCosts);

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
          projectedOutflows: projectedOutflows,
          incomeDateOverrides
        });
      } catch (error) {
        console.error('Failed to auto-save scenario data:', error);
      }
    };

    // Debounce the save
    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [liquidAssets, nonLiquidAssets, futureInflows, wishedRetirementDate, incomes, costs, currentAssets, projectedOutflows, incomeDateOverrides, user, masterKey, loading]);

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
  const updateIncomeDateOverride = (incomeName, personLabel, field, value) => {
    const key = personLabel ? `${incomeName}_${personLabel}` : incomeName;
    setIncomeDateOverrides(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // Helpers for consistent Person detection
  const isPerson1 = (income) => {
    const rawPerson = income.person || income.owner;
    return rawPerson === 'p1' ||
      rawPerson === 'Person 1' ||
      rawPerson === 'Personne 1' ||
      (userData?.firstName && rawPerson === userData.firstName);
  };

  const isPerson2 = (income) => {
    const rawPerson = income.person || income.owner;
    return rawPerson === 'p2' ||
      rawPerson === 'Person 2' ||
      rawPerson === 'Personne 2' ||
      (userData?.firstName2 && rawPerson === userData.firstName2);
  };

  // Get effective date for income (override or calculated)
  const getEffectiveIncomeDate = (income, field) => {
    const isP2 = isPerson2(income);

    const personLabel = getPersonDisplay(income);
    const key = personLabel ? `${income.name}_${personLabel}` : income.name;
    const override = incomeDateOverrides[key]?.[field];
    if (override) return override;

    // Fix Timezone Drift: Use local time
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Person-specific fallbacks
    const effWishedRetDate = isP2 ? wishedRetirementDate2 : wishedRetirementDate;
    const effLegalRetDate = isP2 ? retirementLegalDate2 : retirementLegalDate;
    const effDeathDate = isP2 ? deathDate2 : deathDate;

    if (income.name === 'Salary' || income.name === 'Net Salary') {
      return field === 'startDate' ? today : effWishedRetDate;
    } else if (income.name.includes('LPP')) {
      return field === 'startDate' ? effWishedRetDate : effDeathDate;
    } else if (income.name === 'AVS') {
      return field === 'startDate' ? effLegalRetDate : effDeathDate;
    } else if (income.name === '3a') {
      return field === 'startDate' ? (income.startDate || effWishedRetDate) : null;
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
      const rDataRaw = await getRetirementData(user.email, masterKey);
      // [V2 REFACTOR] Detect if it's old structure (v1) or new (v2 with p1/p2)
      let retirementData = null;
      if (rDataRaw) {
        if (rDataRaw.p1 || rDataRaw.p2) {
          retirementData = {
            p1: migrateToV2(rDataRaw.p1, userData),
            p2: userData.analysisType === 'couple' ? migrateToV2(rDataRaw.p2, { ...userData, birthDate: userData.birthDate2, gender: userData.gender2 }) : null
          };
        } else {
          // Legacy single-person structure
          retirementData = {
            p1: migrateToV2(rDataRaw, userData),
            p2: null
          };
        }
      }

      // Process regular incomes
      const processedIncomes = incomeData.filter(inc =>
        inc.amount && inc.amount !== '0' &&
        !String(inc.name || '').toLowerCase().includes('pension') &&
        !String(inc.name || '').toLowerCase().includes('lpp') &&
        !String(inc.name || '').toLowerCase().includes('avs') &&
        !inc.location
      ).map(inc => {
        const { groupId, parentId, ...cleanIncome } = inc;
        let endDate = inc.endDate;
        if (inc.name === 'Net Salary' || inc.name === 'Salary') {
          const isP2 = (inc.person === 'Person 2' || inc.owner === 'p2' || (userData?.firstName2 && inc.person === userData.firstName2));
          endDate = isP2 ? wishedRetirementDate2 : wishedRetirementDate;
        }
        return {
          ...cleanIncome,
          endDate,
          adjustedAmount: inc.amount
        };
      });

      // Reprocess retirement income using unified logic
      const resetRetirementIncome = [];
      const processRetirementReset = (pData, pBirthDate, pLegalDate, pDeathDate, personId, personLabel) => {
        if (!pData) return;
        const { questionnaire, benefitsData } = pData;
        const simAge = questionnaire.simulationAge;
        const option = scenarioData.retirementOption || 'option1';

        // 1. AVS
        let avsAmount = benefitsData.avs?.amount || '0';
        if (avsAmount !== '0' || userData.analysisType === 'couple' || personId === 'p1') {
          resetRetirementIncome.push({
            id: `avs_${personId}`, name: `AVS`, person: personId === 'p2' ? 'Person 2' : 'Person 1',
            amount: avsAmount, adjustedAmount: avsAmount,
            frequency: 'Yearly', startDate: benefitsData.avs?.startDate || pLegalDate,
            endDate: pDeathDate, isRetirement: true
          });
        }

        // LPP Simulation Age is taken directly from the person's questionnaire
        let targetAge = parseInt(simAge) || 65;
        let lppPensionAmount = null;

        const lppData = benefitsData.lppByAge?.[targetAge] || benefitsData.lppByAge?.[targetAge.toString()];
        if (lppData) lppPensionAmount = lppData.pension;


        if (lppPensionAmount && lppPensionAmount !== '0') {
          const startDate = (targetAge === 65) ? pLegalDate : calculateWishedDate(pBirthDate, targetAge);
          resetRetirementIncome.push({
            id: `lpp_pension_${personId}`,
            name: language === 'fr' ? `Rente LPP à ${targetAge} ans` : `LPP pension at ${targetAge}y`,
            person: personId === 'p2' ? 'Person 2' : 'Person 1',
            amount: lppPensionAmount, adjustedAmount: lppPensionAmount,
            frequency: 'Yearly', startDate, endDate: pDeathDate, isRetirement: true
          });
        }
      };

      if (retirementData) {
        processRetirementReset(retirementData.p1, birthDate, retirementLegalDate, deathDate, 'p1', userData.analysisType === 'couple' ? (userData.firstName || 'Person 1') : '');
        if (userData.analysisType === 'couple' && retirementData.p2) {
          processRetirementReset(retirementData.p2, birthDate2, retirementLegalDate2, deathDate2, 'p2', userData.firstName2 || 'Person 2');
        }
      }

      setIncomes([...processedIncomes, ...resetRetirementIncome]);

      // Clear overrides for standard incomes that were reset
      const newOverrides = { ...incomeDateOverrides };
      const resettableNames = ['Salary', 'AVS', 'LPP', '3a', 'Projected LPP Pension'];
      Object.keys(newOverrides).forEach(key => {
        if (resettableNames.some(name => key.startsWith(name))) {
          delete newOverrides[key];
        }
      });
      setIncomeDateOverrides(newOverrides);

      toast.success(t('scenario.resetSuccess'));
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
      console.log('Resetting assets to defaults...');
      const assetsData = await getAssetsData(user.email, masterKey);
      const scenarioData = await getScenarioData(user.email, masterKey);
      const rDataRaw = await getRetirementData(user.email, masterKey);
      // [V2 REFACTOR] Detect if it's old structure (v1) or new (v2 with p1/p2)
      let retirementData = null;
      if (rDataRaw) {
        if (rDataRaw.p1 || rDataRaw.p2) {
          retirementData = {
            p1: migrateToV2(rDataRaw.p1, userData),
            p2: (userData?.analysisType === 'couple') ? migrateToV2(rDataRaw.p2, { ...userData, birthDate: userData.birthDate2, gender: userData.gender2 }) : null
          };
        } else {
          // Legacy single-person structure
          retirementData = {
            p1: migrateToV2(rDataRaw, userData),
            p2: null
          };
        }
      }

      let loadedCurrentAssets = (assetsData?.currentAssets || []).map(a => ({ ...a, adjustedAmount: a.amount }));

      if (retirementData && scenarioData) {
        const processRetirementAssetsReset = (pData, pBirthDate, pLegalDate, personId, personLabel) => {
          if (!pData) return;
          const { questionnaire, benefitsData } = pData;
          const simWishedDate = (personId === 'p1') ? wishedRetirementDate : wishedRetirementDate2;
          const simAge = questionnaire.simulationAge;
          const option = scenarioData.retirementOption || 'option1';

          // 1. LPP Capital Mapping
          let targetAge = parseInt(simAge) || 65;

          const lppData = benefitsData.lppByAge?.[targetAge] || benefitsData.lppByAge?.[targetAge.toString()];

          const upsertResetAsset = (asset) => {
            const idx = loadedCurrentAssets.findIndex(a => a.id === asset.id);
            if (idx >= 0) loadedCurrentAssets[idx] = asset;
            else loadedCurrentAssets.unshift(asset);
          };

          if (lppData && lppData.capital && lppData.capital !== '0') {
            upsertResetAsset({
              id: `lpp_capital_${personId}`, name: `Projected LPP Capital`, person: personId === 'p2' ? 'Person 2' : 'Person 1',
              amount: lppData.capital, adjustedAmount: lppData.capital,
              category: 'Liquid', availabilityType: 'Date',
              availabilityDate: calculateWishedDate(pBirthDate, targetAge),
              strategy: 'Cash', isRetirement: true
            });
          }

          if (benefitsData.threeA) {
            benefitsData.threeA.forEach((item, idx) => {
              if (item.amount) upsertResetAsset({
                id: `threeA_${personId}_${idx}`, name: `3a (${idx + 1})`, person: personId === 'p2' ? 'Person 2' : 'Person 1',
                amount: item.amount, adjustedAmount: item.amount,
                category: 'Liquid', availabilityType: 'Date',
                availabilityDate: item.startDate || simWishedDate,
                strategy: 'Cash', isRetirement: true
              });
            });
          }

          if (benefitsData.librePassages) {
            benefitsData.librePassages.forEach((item, idx) => {
              if (item.amount) upsertResetAsset({
                id: `libre_${personId}_${idx}`, name: item.name || `Libre-Passage (${idx + 1})`, person: personId === 'p2' ? 'Person 2' : 'Person 1',
                amount: item.amount, adjustedAmount: item.amount,
                category: 'Liquid', availabilityType: 'Date',
                availabilityDate: item.startDate || simWishedDate,
                strategy: 'Cash', isRetirement: true
              });
            });
          }

          if (benefitsData.lppCurrentCapital) {
            upsertResetAsset({
              id: `lpp_current_${personId}`, name: `LPP Current Capital`, person: personLabel,
              amount: benefitsData.lppCurrentCapital, adjustedAmount: benefitsData.lppCurrentCapital,
              category: 'Liquid', availabilityType: 'Date',
              availabilityDate: benefitsData.lppCurrentCapitalDate || simWishedDate,
              strategy: 'Cash', isRetirement: true
            });
          }
        };

        processRetirementAssetsReset(retirementData.p1, birthDate, retirementLegalDate, 'p1', userData.analysisType === 'couple' ? (userData.firstName || 'Person 1') : '');
        if (userData.analysisType === 'couple' && retirementData.p2) {
          processRetirementAssetsReset(retirementData.p2, birthDate2, retirementLegalDate2, 'p2', userData.firstName2 || 'Person 2');
        }
      }

      const filteredAssets = loadedCurrentAssets.filter(asset => parseFloat(asset.amount) > 0);
      setCurrentAssets(filteredAssets);

      // Autosave the reset state
      await saveScenarioData(user.email, masterKey, {
        ...scenarioData,
        currentAssets: filteredAssets,
        investedBook: [] // CLEAR GHOSTS: Reset investment customizations when assets are reset
      });

      toast.success(t('scenario.resetSuccess'));
    } catch (error) {
      console.error('Error resetting assets:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting data');
    }
  };

  const resetOutflowsToDefaults = async () => {
    try {
      const assetsData = await getAssetsData(user.email, masterKey);
      if (assetsData) {
        let defaultOutflows = assetsData.projectedOutflows || assetsData.desiredOutflows || [];

        // Filter out outflows with no amount (empty/undefined/null or '0')
        defaultOutflows = defaultOutflows.filter(outflow =>
          outflow.amount && outflow.amount !== '' && outflow.amount !== '0'
        );

        setProjectedOutflows(defaultOutflows);
        toast.success(language === 'fr' ? 'Sorties projetées réinitialisées' : 'Projected outflows reset to default values');
      }
    } catch (error) {
      console.error('Error resetting outflows:', error);
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

  // Outflow update and delete functions
  const updateOutflow = (id, field, value) => {
    setProjectedOutflows(projectedOutflows.map(outflow =>
      outflow.id === id ? { ...outflow, [field]: value } : outflow
    ));
  };

  const deleteOutflow = (id) => {
    setProjectedOutflows(projectedOutflows.filter(outflow => outflow.id !== id));
  };

  const addOutflow = () => {
    const newId = Date.now();
    const newOutflow = {
      id: newId,
      name: language === 'fr' ? 'Nouvelle sortie' : 'New outflow',
      amount: '',
      adjustedAmount: '',
      madeAvailableDate: new Date().toISOString().split('T')[0],
      madeAvailableTimeframe: '',
      locked: false
    };
    setProjectedOutflows([...projectedOutflows, newOutflow]);
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

  // Person display helper
  const getPersonDisplay = (item) => {
    if (!item) return '';
    const p = item.person || item.owner;
    if (p === 'p1' || p === 'Person 1' || p === 'Personne 1' || (userData?.firstName && p === userData.firstName)) {
      return userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1');
    }
    if (p === 'p2' || p === 'Person 2' || p === 'Personne 2' || (userData?.firstName2 && p === userData.firstName2)) {
      return userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2');
    }
    if (p === 'consolidated' || p === 'Consolidated' || p === 'Consolidé') {
      return language === 'fr' ? 'Consolidé' : 'Consolidated';
    }
    return language === 'fr' ? 'Commun' : 'Shared';
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
      // Fix Timezone Drift: Use local time
      startDate: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
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

      // Fix Timezone Drift: Use local time, not UTC (toISOString)
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
          // Fix Timezone: Local YYYY-MM-DD
          const year = checkDate.getFullYear();
          const month = String(checkDate.getMonth() + 1).padStart(2, '0');
          const day = String(checkDate.getDate()).padStart(2, '0');
          const testRetirementDate = `${year}-${month}-${day}`;

          const testBalance = calculateBalanceForRetirementDate(testRetirementDate);

          if (testBalance >= 0) {
            foundDate = testRetirementDate;
            break;
          }

          // Move to next month
          // [Phase 9b] UTC increments
          checkDate.setUTCMonth(checkDate.getUTCMonth() + 1);
        }

        if (foundDate) {
          simulationRetirementDate = foundDate;
          calculatedEarliestDate = foundDate;
        } else {
          // No valid date found - use legal retirement date and show "no" verdict
          simulationRetirementDate = retirementLegalDate;
          calculatedEarliestDate = null; // Signal that no early retirement is possible
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
          const pLabel = getPersonDisplay(income);
          const rawPerson = income.person || income.owner;
          const isP2 = isPerson2(income);
          const effWishedRetDate = isP2 ? wishedRetirementDate2 : wishedRetirementDate;
          const effLegalRetDate = isP2 ? retirementLegalDate2 : retirementLegalDate;
          const effDeathDate = isP2 ? deathDate2 : deathDate;
          const overrideKey = pLabel ? `${income.name}_${pLabel}` : income.name;

          if (income.name === 'Salary') {
            startDate = incomeDateOverrides[overrideKey]?.startDate || today;
            endDate = incomeDateOverrides[overrideKey]?.endDate || effWishedRetDate;
          } else if (income.name === 'LPP') {
            startDate = incomeDateOverrides[overrideKey]?.startDate || effWishedRetDate;
            endDate = incomeDateOverrides[overrideKey]?.endDate || effDeathDate;
          } else if (income.name === 'AVS') {
            startDate = incomeDateOverrides[overrideKey]?.startDate || effLegalRetDate;
            endDate = incomeDateOverrides[overrideKey]?.endDate || effDeathDate;
          } else if (income.name === '3a') {
            // 3a is one-time at retirement - use override date or person-specific simulation retirement
            const threADate = incomeDateOverrides[overrideKey]?.startDate || effWishedRetDate;
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
      });

      // Navigate to result with full simulation data
      navigate('/result', {
        state: {
          ...location.state, // Pass through automation flags (autoAutomateFullSequence, earlyRetirementAge)
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
          adjustedOutflows: projectedOutflows,
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

        if (income.name === 'Salary' || income.name === 'Net Salary') {
          startDate = today;
          endDate = (income.person === 'Person 2') ? wishedRetirementDate2 : testRetirementDate;
        } else if (income.name === 'LPP' || income.name === 'AVS') {
          startDate = (income.person === 'Person 2') ? wishedRetirementDate2 : testRetirementDate;
          endDate = (income.person === 'Person 2') ? deathDate2 : deathDate;
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
    // For this implementation, we will apply multipliers to existing COST list.

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
    <div className="flex-grow flex flex-col pt-20 pb-12 bg-background text-foreground" data-testid="data-review-page">


      <PageHeader
        title={language === 'fr' ? 'Revue des données avant simulation' : 'Data Review Before Simulation'}
        description={language === 'fr' ? 'Vérifiez et ajustez les revenus et coûts avant de lancer la simulation' : 'Review and adjust incomes and costs before running the simulation'}
        rightContent={
          <Button
            onClick={handleSuggestionClick}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <Lightbulb className="h-4 w-4" />
            {language === 'fr' ? 'Suggère moi des ajustements pertinents' : 'Suggest relevant adjustments'}
          </Button>
        }
      />

      <div className="w-[65%] mx-auto">
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
              ...projectedOutflows.map(d => d.clusterTag)
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
                      {isCouple && <th className="text-left p-3 font-semibold w-[10%]">{language === 'fr' ? 'Personne' : 'Person'}</th>}
                      <th className="text-left p-3 font-semibold w-[18%]">{t('scenario.name')}</th>
                      <th className="text-right p-3 font-semibold w-[11%]">{t('scenario.originalValue')}</th>
                      <th className="text-right p-3 font-semibold w-[11%]">{t('scenario.adjustedValue')}</th>
                      <th className="text-left p-3 font-semibold w-[12%]">{t('scenario.frequency')}</th>
                      <th className="text-left p-3 font-semibold w-[14%]">{t('scenario.startDate')}</th>
                      <th className="text-left p-3 font-semibold w-[14%]">{t('scenario.endDate')}</th>

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

                      // Get effective dates (override or default)
                      const currentStartDate = getEffectiveIncomeDate(income, 'startDate');
                      const currentEndDate = getEffectiveIncomeDate(income, 'endDate');

                      const isLPPPension = income.name.includes('LPP Pension');
                      const personLabel = getPersonDisplay(income);
                      const isP2 = isPerson2(income);
                      const effWishedRetDate = isP2 ? wishedRetirementDate2 : wishedRetirementDate;
                      const effLegalRetDate = isP2 ? retirementLegalDate2 : retirementLegalDate;
                      const effDeathDate = isP2 ? deathDate2 : deathDate;

                      return (
                        <tr key={income.id} className={`border-b hover:bg-muted/30 ${groupStyles} ${childStyles}`}>
                          {isCouple && (
                            <td className="p-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${isPerson2(income) ? 'bg-purple-500/20 text-purple-400' : isPerson1(income) ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {getPersonDisplay(income)}
                              </span>
                            </td>
                          )}
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
                            {income.name === 'AVS' ? (
                              <Input
                                type="text"
                                value={effLegalRetDate.split('-').reverse().join('.')}
                                readOnly
                                className="w-[120px] bg-transparent border-none shadow-none focus-visible:ring-0 cursor-default p-0"
                              />
                            ) : isStandardIncome ? (
                              <DateInputWithShortcuts
                                data-testid={`income - start - date - ${index} `}
                                value={currentStartDate || ''}
                                onChange={(e) => updateIncomeDateOverride(income.name, personLabel, 'startDate', e.target.value)}
                                className="w-fit"
                                retirementDate={effWishedRetDate}
                                legalDate={effLegalRetDate}
                                mode="start"
                              />
                            ) : (
                              <DateInputWithShortcuts
                                value={income.startDate || ''}
                                onChange={(e) => updateIncomeDateWithSync(income.id, 'startDate', e.target.value)}
                                className="w-fit"
                                retirementDate={effWishedRetDate}
                                legalDate={effLegalRetDate}
                                mode="start"
                              />
                            )}
                          </td>
                          <td className="p-3">
                            {income.name === 'AVS' ? (
                              <Input
                                type="text"
                                value={effDeathDate.split('-').reverse().join('.')}
                                readOnly
                                className="w-[120px] bg-transparent border-none shadow-none focus-visible:ring-0 cursor-default p-0"
                              />
                            ) : income.name === '3a' ? (
                              null
                            ) : isStandardIncome ? (
                              <DateInputWithShortcuts
                                data-testid={`income - end - date - ${index} `}
                                value={currentEndDate || ''}
                                onChange={(e) => updateIncomeDateOverride(income.name, personLabel, 'endDate', e.target.value)}
                                className="w-fit"
                                retirementDate={effWishedRetDate}
                                legalDate={effLegalRetDate}
                                deathDate={effDeathDate}
                                mode="end"
                              />
                            ) : (
                              (income.frequency === "One-time" || income.frequency === "Ponctuel") ? null :
                                <DateInputWithShortcuts
                                  value={income.endDate || ""}
                                  onChange={(e) => updateIncomeDateWithSync(income.id, "endDate", e.target.value)}
                                  className="w-fit"
                                  retirementDate={effWishedRetDate}
                                  legalDate={effLegalRetDate}
                                  deathDate={effDeathDate}
                                  mode="end"
                                />
                            )}
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
                      {isCouple && <th className="text-left p-3 font-semibold w-[10%]">{language === 'fr' ? 'Personne' : 'Person'}</th>}
                      <th className="text-left p-3 font-semibold w-[18%]">{language === 'fr' ? 'Nom' : 'Name'}</th>
                      <th className="text-right p-3 font-semibold w-[11%]">{language === 'fr' ? 'Valeur originale' : 'Original Value'}</th>
                      <th className="text-right p-3 font-semibold w-[11%]">{language === 'fr' ? 'Valeur ajustée' : 'Adjusted Value'}</th>
                      <th className="text-left p-3 font-semibold w-[12%]">{language === 'fr' ? 'Catégorie' : 'Category'}</th>
                      <th className="text-left p-3 font-semibold w-[14%]">{language === 'fr' ? 'Type de dispo.' : 'Availability Type'}</th>
                      <th className="text-left p-3 font-semibold w-[14%]">{language === 'fr' ? 'Valeur de dispo.' : 'Availability Value'}</th>
                      <th className="text-center p-3 font-semibold w-[10%]">{language === 'fr' ? 'Investir ?' : 'Invest?'}</th>

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
                          {isCouple && (
                            <td className="p-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${isPerson2(asset) ? 'bg-purple-500/20 text-purple-400' : isPerson1(asset) ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {getPersonDisplay(asset)}
                              </span>
                            </td>
                          )}
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
                              <DateInputWithShortcuts
                                value={asset.availabilityDate || ''}
                                onChange={(e) => updateAsset(asset.id, 'availabilityDate', e.target.value)}
                                className="w-fit"
                                retirementDate={wishedRetirementDate}
                                legalDate={retirementLegalDate}
                                mode="start"
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

              {currentAssets.some(asset => asset.strategy === 'Invested') && (
                <div className="mt-8 flex justify-center border-t pt-6">
                  <Button
                    onClick={() => navigate('/capital-setup')}
                    className="px-8 bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {language === 'fr' ? 'Aller à la configuration de la gestion du capital' : 'Go to Capital management setup'}
                  </Button>
                </div>
              )}
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
                      {isCouple && <th className="text-left p-3 font-semibold w-[10%]">{language === 'fr' ? 'Personne' : 'Person'}</th>}
                      <th className="text-left p-3 font-semibold w-[18%]">{t('scenario.name')}</th>
                      <th className="text-right p-3 font-semibold w-[11%]">{t('scenario.originalValue')}</th>
                      <th className="text-right p-3 font-semibold w-[11%]">{t('scenario.adjustedValue')}</th>
                      <th className="text-left p-3 font-semibold w-[12%]">{t('scenario.frequency')}</th>
                      <th className="text-left p-3 font-semibold w-[14%]">{t('scenario.startDate')}</th>
                      <th className="text-left p-3 font-semibold w-[14%]">{t('scenario.endDate')}</th>

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
                          className={`border-b hover:bg-muted/30 ${groupStyles} ${childStyles} `}
                        >
                          {isCouple && (
                            <td className="p-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${isPerson2(cost) ? 'bg-purple-500/20 text-purple-400' : (cost.owner === 'consolidated' || cost.person === 'Consolidated') ? 'bg-amber-500/20 text-amber-400' : (!cost.person || cost.person === 'Shared' || cost.person === 'Commun' || cost.owner === 'Shared') ? 'bg-gray-500/20 text-gray-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {getPersonDisplay(cost)}
                              </span>
                            </td>
                          )}
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
                            <DateInputWithShortcuts
                              data-testid={`cost - start - date - ${index} `}
                              value={cost.startDate || ''}
                              onChange={(e) => updateCostDateWithSync(cost.id, 'startDate', e.target.value)}
                              className="w-fit"
                              retirementDate={wishedRetirementDate}
                              legalDate={retirementLegalDate}
                              mode="start"
                            />
                          </td>
                          <td className="p-3">
                            {(cost.frequency === "One-time" || cost.frequency === "Ponctuel") ? null :
                              <DateInputWithShortcuts
                                data-testid={`cost - end - date - ${index} `}
                                value={cost.endDate || ""}
                                onChange={(e) => updateCostDateWithSync(cost.id, "endDate", e.target.value)}
                                className="w-fit"
                                retirementDate={wishedRetirementDate}
                                legalDate={retirementLegalDate}
                                deathDate={deathDate}
                                mode="end"
                              />}
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





          {/* Projected Outflows Table */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'fr' ? 'Sorties projetées actuelles ou futures' : 'Current or future Projected Outflows'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold w-[22%]">{language === 'fr' ? 'Nom' : 'Name'}</th>
                      <th className="text-right p-3 font-semibold w-[15%]">{language === 'fr' ? 'Valeur originale' : 'Original Value'}</th>
                      <th className="text-right p-3 font-semibold w-[15%]">{language === 'fr' ? 'Valeur ajustée' : 'Adjusted Value'}</th>
                      <th className="text-left p-3 font-semibold w-[14%]">{language === 'fr' ? 'Type de disponibilité' : 'Availability Type'}</th>
                      <th className="text-left p-3 font-semibold w-[14%]">{language === 'fr' ? 'Détails de disponibilité' : 'Availability Details'}</th>
                      <th className="text-center p-3 font-semibold w-[80px]">{language === 'fr' ? 'Actions' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectedOutflows.map((outflow) => {
                      const originalAmount = parseFloat(outflow.amount) || 0;
                      const adjustedAmount = parseFloat(outflow.adjustedAmount || outflow.amount) || 0;
                      const isDecreased = adjustedAmount < originalAmount;
                      const isIncreased = adjustedAmount > originalAmount;

                      return (
                        <tr key={outflow.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium text-white">{outflow.name}</td>
                          <td className="text-right p-3 text-muted-foreground">
                            CHF {originalAmount.toLocaleString()}
                          </td>
                          <td className="text-right p-3">
                            <Input
                              type="text"
                              value={(outflow.adjustedAmount !== undefined ? outflow.adjustedAmount : outflow.amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/'/g, '');
                                if (!isNaN(rawValue)) {
                                  updateOutflow(outflow.id, 'adjustedAmount', rawValue);
                                }
                              }}
                              className={`max-w-[150px] ml-auto text-right ${isDecreased ? 'bg-green-500/10' : isIncreased ? 'bg-red-500/10' : ''}`}
                            />
                          </td>
                          <td className="p-3">
                            <Select
                              value={outflow.madeAvailableType || (outflow.madeAvailableTimeframe ? 'Period' : 'Date')}
                              onValueChange={(value) => updateOutflow(outflow.id, 'madeAvailableType', value)}
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
                            {(outflow.madeAvailableType === 'Period' || (!outflow.madeAvailableType && outflow.madeAvailableTimeframe)) ? (
                              <Select
                                value={outflow.madeAvailableTimeframe || 'Select'}
                                onValueChange={(value) => updateOutflow(outflow.id, 'madeAvailableTimeframe', value === 'Select' ? '' : value)}
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
                              <DateInputWithShortcuts
                                value={outflow.madeAvailableDate || ''}
                                onChange={(e) => updateOutflow(outflow.id, 'madeAvailableDate', e.target.value)}
                                className="w-fit"
                                retirementDate={wishedRetirementDate}
                                legalDate={retirementLegalDate}
                                mode="start"
                              />
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2 justify-center">
                              <Button
                                onClick={() => deleteOutflow(outflow.id)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                title="Delete this outflow"
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
                  onClick={addOutflow}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {language === 'fr' ? '+ ajouter une sortie' : '+ add outflow'}
                </Button>
                <Button
                  onClick={resetOutflowsToDefaults}
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
  );
};

export default DataReview;
