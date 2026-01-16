import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { getIncomeData, getCostData, getUserData, getScenarioData, saveScenarioData, getRetirementData, getAssetsData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import WorkflowNavigation from '../components/WorkflowNavigation';
import { Calendar, Minus, Trash2, Split, Plus, TrendingUp } from 'lucide-react';

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
  const { user, password } = useAuth();
  const { t, language } = useLanguage();
  const [wishedRetirementDate, setWishedRetirementDate] = useState('');
  const [retirementLegalDate, setRetirementLegalDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [incomes, setIncomes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [retirementData, setRetirementData] = useState(null);
  const [liquidAssets, setLiquidAssets] = useState('');
  const [nonLiquidAssets, setNonLiquidAssets] = useState('');
  const [futureInflows, setFutureInflows] = useState([]);
  const [currentAssets, setCurrentAssets] = useState([]);
  const [desiredOutflows, setDesiredOutflows] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const key = INCOME_KEYS[englishName];
    if (key) {
      return t(`income.${key}`);
    }
    return englishName;
  };

  // Get translated cost name
  const getCostName = (englishName) => {
    const key = COST_KEYS[englishName];
    if (key) {
      return t(`costs.costNames.${key}`);
    }
    return englishName;
  };

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        const userData = await getUserData(user.email, password);
        const incomeData = await getIncomeData(user.email, password) || [];
        const costData = await getCostData(user.email, password) || [];
        const scenarioData = await getScenarioData(user.email, password);
        const rData = await getRetirementData(user.email, password);
        setRetirementData(rData);

        if (!userData) {
          navigate('/personal-info');
          return;
        }

        // Calculate dates
        const birthDate = new Date(userData.birthDate);
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
        setDeathDate(deathDateStr);

        // Load assets data from assetsData store
        const assetsData = await getAssetsData(user.email, password);
        if (assetsData) {
          // Calculate liquid and non-liquid assets from savingsRows
          if (assetsData.savingsRows && assetsData.savingsRows.length > 0) {
            const liquidTotal = assetsData.savingsRows
              .filter(row => row.category === 'Liquid')
              .reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
            const illiquidTotal = assetsData.savingsRows
              .filter(row => row.category === 'Illiquid')
              .reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
            setLiquidAssets(liquidTotal.toString());
            setNonLiquidAssets(illiquidTotal.toString());
          } else {
            setLiquidAssets('');
            setNonLiquidAssets('');
          }
          setFutureInflows(assetsData.futureInflows || []);

          // Load current assets and desired outflows for display
          setCurrentAssets(assetsData.currentAssets || []);
          setDesiredOutflows(assetsData.desiredOutflows || []);
        }

        // Process retirement income based on selected option
        const processedRetirementIncome = [];
        if (rData && scenarioData) {
          // Always include AVS and 3a
          const avsRow = rData.rows?.find(r => r.id === 'avs');
          const threeARow = rData.rows?.find(r => r.id === '3a');
          if (avsRow) processedRetirementIncome.push({ ...avsRow, adjustedAmount: avsRow.amount, isRetirement: true });
          if (threeARow) processedRetirementIncome.push({ ...threeARow, adjustedAmount: threeARow.amount, isRetirement: true });

          // Add custom retirement incomes
          const customRows = rData.rows?.filter(r => r.id.startsWith('custom_')) || [];
          customRows.forEach(row => {
            processedRetirementIncome.push({ ...row, adjustedAmount: row.amount, isRetirement: true });
          });

          // Handle LPP based on selected option
          const option = scenarioData.retirementOption || 'option1';
          setRetirementOption(option);

          if (option === 'option1') {
            // Option 1: Pension capital investment
            setPensionCapital(scenarioData.pensionCapital || '');
            setYearlyReturn(scenarioData.yearlyReturn || '0');

            if (scenarioData.pensionCapital) {
              processedRetirementIncome.push({
                id: 'pension_capital_investment',
                name: 'Pension Capital Investment',
                amount: scenarioData.pensionCapital,
                adjustedAmount: scenarioData.pensionCapital,
                pensionCapital: scenarioData.pensionCapital,
                yearlyReturn: scenarioData.yearlyReturn || '0',
                frequency: 'Investment',
                startDate: retirementDateStr,
                endDate: deathDateStr,
                isRetirement: true,
                isOption1: true
              });
            }
          } else if (option === 'option2') {
            // Option 2: Early retirement with projected values
            console.log('Option 2 detected, scenarioData:', scenarioData);
            console.log('projectedLPPPension:', scenarioData.projectedLPPPension);
            console.log('projectedLPPCapital:', scenarioData.projectedLPPCapital);
            console.log('earlyRetirementAge:', scenarioData.earlyRetirementAge);

            setEarlyRetirementAge(scenarioData.earlyRetirementAge || '62');
            setProjectedLPPPension(scenarioData.projectedLPPPension || '');
            setProjectedLPPCapital(scenarioData.projectedLPPCapital || '');

            // Check if fields exist (not just truthy) to handle zero values
            if (scenarioData.projectedLPPPension !== undefined && scenarioData.projectedLPPPension !== null && scenarioData.projectedLPPPension !== '') {
              console.log('Adding projected LPP Pension row');
              processedRetirementIncome.push({
                id: 'projected_lpp_pension',
                name: `Projected LPP Pension at ${scenarioData.earlyRetirementAge}y`,
                amount: scenarioData.projectedLPPPension,
                adjustedAmount: scenarioData.projectedLPPPension,
                frequency: 'Monthly',
                startDate: retirementDateStr,
                endDate: deathDateStr,
                isRetirement: true
              });
            }
            if (scenarioData.projectedLPPCapital !== undefined && scenarioData.projectedLPPCapital !== null && scenarioData.projectedLPPCapital !== '') {
              console.log('Adding projected LPP Capital row');
              processedRetirementIncome.push({
                id: 'projected_lpp_capital',
                name: `Projected LPP Capital at ${scenarioData.earlyRetirementAge}y`,
                amount: scenarioData.projectedLPPCapital,
                adjustedAmount: scenarioData.projectedLPPCapital,
                frequency: 'One-time',
                startDate: retirementDateStr,
                endDate: retirementDateStr,
                isRetirement: true
              });
            }
            console.log('Processed retirement income for Option 2:', processedRetirementIncome);
          } else if (option === 'option3') {
            // Option 3: Flexible pre-retirement
            const preRetirementRows = scenarioData.preRetirementRows || [];
            console.log('Processing Option 3 preRetirementRows:', preRetirementRows);

            preRetirementRows.forEach(row => {
              // Create pension row if pension value exists
              if (row.pension && row.pension !== '' && row.pension !== '0') {
                processedRetirementIncome.push({
                  id: `pre_retirement_pension_${row.age}`,
                  name: `Pre-retirement LPP Pension at ${row.age}y`,
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
                  id: `pre_retirement_capital_${row.age}`,
                  name: `Pre-retirement LPP Capital at ${row.age}y`,
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

        // Load saved scenario data if available
        if (scenarioData) {

          // Always merge retirement income with regular income
          // Filter out any old retirement income from saved adjustedIncomes
          let regularIncomes = [];
          if (scenarioData.adjustedIncomes && scenarioData.adjustedIncomes.length > 0) {
            // Use saved adjusted incomes but remove old retirement income rows
            regularIncomes = scenarioData.adjustedIncomes.filter(inc => !inc.isRetirement);
          } else {
            // Use fresh income data
            regularIncomes = incomeData.filter(i => i.amount).map(i => ({
              ...i,
              adjustedAmount: i.amount
            }));
          }

          // Always merge with fresh retirement income
          console.log('Merging regular incomes:', regularIncomes.length, 'with retirement incomes:', processedRetirementIncome.length);
          setIncomes([...regularIncomes, ...processedRetirementIncome]);

          // Use saved adjusted costs if available, otherwise use original data
          if (scenarioData.adjustedCosts && scenarioData.adjustedCosts.length > 0) {
            setCosts(scenarioData.adjustedCosts);
          } else {
            setCosts(costData.filter(c => c.amount).map(c => ({
              ...c,
              adjustedAmount: c.amount
            })));
          }
        } else {
          // Set incomes with adjusted values + retirement
          const regularIncomes = incomeData.filter(i => i.amount).map(i => ({
            ...i,
            adjustedAmount: i.amount
          }));
          setIncomes([...regularIncomes, ...processedRetirementIncome]);

          // Set costs with adjusted values
          setCosts(costData.filter(c => c.amount).map(c => ({
            ...c,
            adjustedAmount: c.amount
          })));
        }

      } catch (error) {
        toast.error('Failed to load data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, password, navigate]);

  // Auto-save scenario data when values change
  useEffect(() => {
    if (loading || !user?.email || !password) return;

    const saveData = async () => {
      try {
        // Load existing scenario data to preserve all fields
        const existingData = await getScenarioData(user.email, password) || {};

        // Merge with updates, preserving retirement option fields
        await saveScenarioData(user.email, password, {
          ...existingData,  // Preserve all existing fields including retirement options
          liquidAssets,
          nonLiquidAssets,
          futureInflows,
          wishedRetirementDate,
          adjustedIncomes: incomes,
          adjustedCosts: costs
        });
      } catch (error) {
        console.error('Failed to auto-save scenario data:', error);
      }
    };

    // Debounce the save
    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [liquidAssets, nonLiquidAssets, futureInflows, wishedRetirementDate, incomes, costs, user, password, loading]);

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
      const incomeData = await getIncomeData(user.email, password) || [];
      const scenarioData = await getScenarioData(user.email, password);
      const rData = await getRetirementData(user.email, password);

      // Process regular incomes
      const processedIncomes = incomeData.map(inc => {
        const { groupId, parentId, ...cleanIncome } = inc;
        return {
          ...cleanIncome,
          adjustedAmount: inc.amount
        };
      });

      // Reprocess retirement income based on current option
      const processedRetirementIncome = [];
      if (rData && scenarioData) {
        const avsRow = rData.rows?.find(r => r.id === 'avs');
        const threeARow = rData.rows?.find(r => r.id === '3a');
        if (avsRow) processedRetirementIncome.push({ ...avsRow, adjustedAmount: avsRow.amount, isRetirement: true });
        if (threeARow) processedRetirementIncome.push({ ...threeARow, adjustedAmount: threeARow.amount, isRetirement: true });

        const customRows = rData.rows?.filter(r => r.id.startsWith('custom_')) || [];
        customRows.forEach(row => {
          processedRetirementIncome.push({ ...row, adjustedAmount: row.amount, isRetirement: true });
        });

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
        } else if (option === 'option2') {
          if (scenarioData.projectedLPPPension) {
            processedRetirementIncome.push({
              id: 'projected_lpp_pension',
              name: `Projected LPP Pension at ${scenarioData.earlyRetirementAge}y`,
              amount: scenarioData.projectedLPPPension,
              adjustedAmount: scenarioData.projectedLPPPension,
              frequency: 'Monthly',
              startDate: retirementLegalDate,
              endDate: deathDate,
              isRetirement: true
            });
          }
          if (scenarioData.projectedLPPCapital) {
            processedRetirementIncome.push({
              id: 'projected_lpp_capital',
              name: `Projected LPP Capital at ${scenarioData.earlyRetirementAge}y`,
              amount: scenarioData.projectedLPPCapital,
              adjustedAmount: scenarioData.projectedLPPCapital,
              frequency: 'One-time',
              startDate: retirementLegalDate,
              endDate: retirementLegalDate,
              isRetirement: true
            });
          }
        } else if (option === 'option3') {
          const preRetirementRows = scenarioData.preRetirementRows || [];
          preRetirementRows.forEach(row => {
            processedRetirementIncome.push({
              ...row,
              adjustedAmount: row.amount,
              isRetirement: true
            });
          });
        }
      }

      const allIncomes = [...processedIncomes, ...processedRetirementIncome];
      setIncomes(allIncomes);

      await saveScenarioData(user.email, password, {
        liquidAssets,
        nonLiquidAssets,
        futureInflows,
        wishedRetirementDate,
        adjustedIncomes: allIncomes,
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
      const costData = await getCostData(user.email, password) || [];

      const processedCosts = costData.map(cost => {
        const { groupId, parentId, ...cleanCost } = cost;
        return {
          ...cleanCost,
          adjustedAmount: cost.amount
        };
      });

      setCosts(processedCosts);

      await saveScenarioData(user.email, password, {
        liquidAssets,
        nonLiquidAssets,
        futureInflows,
        wishedRetirementDate,
        adjustedIncomes: incomes,
        adjustedCosts: processedCosts
      });

      toast.success(language === 'fr' ? 'Coûts réinitialisés aux valeurs par défaut' : 'Costs reset to default values');
    } catch (error) {
      console.error('Error resetting costs:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting data');
    }
  };

  const resetAssetsToDefaults = async () => {
    try {
      const assetsData = await getAssetsData(user.email, password);
      if (assetsData) {
        setCurrentAssets(assetsData.currentAssets || []);
        toast.success(language === 'fr' ? 'Actifs réinitialisés aux valeurs par défaut' : 'Assets reset to default values');
      }
    } catch (error) {
      console.error('Error resetting assets:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting data');
    }
  };

  const resetDebtsToDefaults = async () => {
    try {
      const assetsData = await getAssetsData(user.email, password);
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

  // Debt update and delete functions
  const updateDebt = (id, field, value) => {
    setDesiredOutflows(desiredOutflows.map(debt =>
      debt.id === id ? { ...debt, [field]: value } : debt
    ));
  };

  const deleteDebt = (id) => {
    setDesiredOutflows(desiredOutflows.filter(debt => debt.id !== id));
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

  const runSimulation = () => {
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
    <div className="min-h-screen py-12 px-4" data-testid="scenario-page">
      <div className="max-w-7xl mx-auto">
        <WorkflowNavigation />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">
              {language === 'fr' ? 'Revue des données avant simulation' : 'Data review before simulation'}
            </h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              {language === 'fr'
                ? 'Vérifiez et ajustez les revenus et coûts avant de lancer la simulation'
                : 'Review and adjust income and costs before running the simulation'}
            </p>
          </div>
        </div>

        <div className="space-y-6">

          {/* Incomes Table */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'fr' ? 'Flux périodiques entrants - peuvent être ajustés pour la simulation' : 'Periodic inflows - can be adjusted for simulation'}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('scenario.allDatesEditable')}</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">{t('scenario.name')}</th>
                      <th className="text-right p-3 font-semibold">{t('scenario.originalValue')}</th>
                      <th className="text-right p-3 font-semibold">{t('scenario.adjustedValue')}</th>
                      <th className="text-left p-3 font-semibold">{t('scenario.frequency')}</th>
                      <th className="text-left p-3 font-semibold">{t('scenario.startDate')}</th>
                      <th className="text-left p-3 font-semibold">{t('scenario.endDate')}</th>
                      <th className="text-center p-3 font-semibold w-[120px]">{t('scenario.actions')}</th>
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

                      return (
                        <tr key={income.id} className={`border-b hover:bg-muted/30 ${groupStyles} ${childStyles}`}>
                          <td className="p-3 font-medium">
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
                              data-testid={`income-adjusted-${index}`}
                              type="number"
                              value={income.adjustedAmount}
                              onChange={(e) => updateIncomeAdjusted(income.id, e.target.value)}
                              className="max-w-[150px] ml-auto"
                            />
                          </td>
                          <td className="p-3">{getTranslatedFrequency(income.frequency, t)}</td>
                          <td className="p-3">
                            {isStandardIncome ? (
                              <Input
                                data-testid={`income-start-date-${index}`}
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
                              <span className="text-muted-foreground">{t('scenario.oneTime')}</span>
                            ) : isStandardIncome ? (
                              <Input
                                data-testid={`income-end-date-${index}`}
                                type="date"
                                value={currentEndDate || ''}
                                onChange={(e) => updateIncomeDateOverride(income.name, 'endDate', e.target.value)}
                                className="max-w-[150px]"
                              />
                            ) : (
                              <Input
                                type="date"
                                value={income.endDate || ''}
                                onChange={(e) => updateIncomeDateWithSync(income.id, 'endDate', e.target.value)}
                                className="max-w-[150px]"
                              />
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2 justify-center">
                              <Button
                                onClick={() => splitIncome(income.id)}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
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
              <div className="mt-4">
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

          {/* Costs Table */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'fr' ? 'Flux périodiques sortants - peuvent être ajustés pour la simulation' : 'Periodic outflows - can be adjusted for simulation'}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('scenario.costsDescription')}</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">{t('scenario.name')}</th>
                      <th className="text-right p-3 font-semibold">{t('scenario.originalValue')}</th>
                      <th className="text-right p-3 font-semibold">{t('scenario.adjustedValue')}</th>
                      <th className="text-left p-3 font-semibold">{t('scenario.frequency')}</th>
                      <th className="text-left p-3 font-semibold">{t('scenario.startDate')}</th>
                      <th className="text-left p-3 font-semibold">{t('scenario.endDate')}</th>
                      <th className="text-center p-3 font-semibold w-[120px]">{t('scenario.actions')}</th>
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
                          className={`border-b hover:bg-muted/30 ${groupStyles} ${childStyles}`}
                        >
                          <td className="p-3 font-medium">
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
                              data-testid={`cost-adjusted-${index}`}
                              type="number"
                              value={cost.adjustedAmount}
                              onChange={(e) => updateCostAdjusted(cost.id, e.target.value)}
                              className="max-w-[150px] ml-auto"
                            />
                          </td>
                          <td className="p-3">{getTranslatedFrequency(cost.frequency, t)}</td>
                          <td className="p-3">
                            <Input
                              data-testid={`cost-start-date-${index}`}
                              type="date"
                              value={cost.startDate || ''}
                              onChange={(e) => updateCostDateWithSync(cost.id, 'startDate', e.target.value)}
                              className="max-w-[150px]"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              data-testid={`cost-end-date-${index}`}
                              type="date"
                              value={cost.endDate || ''}
                              onChange={(e) => updateCostDateWithSync(cost.id, 'endDate', e.target.value)}
                              className="max-w-[150px]"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2 justify-center">
                              <Button
                                onClick={() => splitCost(cost.id)}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
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
              <div className="mt-4">
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
                      <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Nom' : 'Name'}</th>
                      <th className="text-right p-3 font-semibold">{language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}</th>
                      <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Catégorie' : 'Category'}</th>
                      <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Préserver' : 'Preserve'}</th>
                      <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Date de disponibilité (ponctuelle) ou période (distribution linéaire)' : 'Availability date (one-shot) or period (linear distribution)'}</th>
                      <th className="text-center p-3 font-semibold w-[80px]">{language === 'fr' ? 'Actions' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAssets.map((asset) => (
                      <tr key={asset.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">{asset.name}</td>
                        <td className="p-3 text-right">
                          <Input
                            type="number"
                            value={asset.amount}
                            onChange={(e) => updateAsset(asset.id, 'amount', e.target.value)}
                            className="max-w-[120px] ml-auto"
                          />
                        </td>
                        <td className="p-3">{asset.category}</td>
                        <td className="p-3">{asset.preserve === 'Yes' ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No')}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={asset.availabilityDate || ''}
                              onChange={(e) => updateAsset(asset.id, 'availabilityDate', e.target.value)}
                              className="max-w-[140px]"
                            />
                            <span className="text-muted-foreground">{asset.availabilityTimeframe}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-center">
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
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
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
                      <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Nom' : 'Name'}</th>
                      <th className="text-right p-3 font-semibold">{language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}</th>
                      <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Date de disponibilité (ponctuelle) ou période (distribution linéaire)' : 'Availability date (one-shot) or period (linear distribution)'}</th>
                      <th className="text-center p-3 font-semibold w-[80px]">{language === 'fr' ? 'Actions' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desiredOutflows.map((debt) => (
                      <tr key={debt.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">{debt.name}</td>
                        <td className="p-3 text-right">
                          <Input
                            type="number"
                            value={debt.amount}
                            onChange={(e) => updateDebt(debt.id, 'amount', e.target.value)}
                            className="max-w-[120px] ml-auto"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={debt.madeAvailableDate || ''}
                              onChange={(e) => updateDebt(debt.id, 'madeAvailableDate', e.target.value)}
                              className="max-w-[140px]"
                            />
                            <span className="text-muted-foreground">{debt.madeAvailableTimeframe}</span>
                          </div>
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
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
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

          <div className="flex justify-center mt-6">
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
    </div >
  );
};

export default DataReview;
