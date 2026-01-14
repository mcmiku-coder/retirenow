import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { getIncomeData, getCostData, getUserData, getScenarioData, saveScenarioData, getRetirementData, getAssetsData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import WorkflowNavigation from '../components/WorkflowNavigation';
import { Calendar, Minus, Trash2, Split, Gift, Plus, TrendingUp } from 'lucide-react';

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

const Scenario = () => {
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
  const [transmissionAmount, setTransmissionAmount] = useState('');
  const [loading, setLoading] = useState(true);

  // Retirement option: 'choose' (manual) or 'calculate' (automatic earliest)
  const [retirementOption, setRetirementOption] = useState('choose');

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
        }

        // Load saved scenario data if available
        if (scenarioData) {
          setTransmissionAmount(scenarioData.transmissionAmount || '');

          // Use saved adjusted incomes if available, otherwise use original data
          if (scenarioData.adjustedIncomes && scenarioData.adjustedIncomes.length > 0) {
            setIncomes(scenarioData.adjustedIncomes);
          } else {
            setIncomes(incomeData.filter(i => i.amount).map(i => ({
              ...i,
              adjustedAmount: i.amount
            })));
          }

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
          // Set incomes with adjusted values
          setIncomes(incomeData.filter(i => i.amount).map(i => ({
            ...i,
            adjustedAmount: i.amount
          })));

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
        await saveScenarioData(user.email, password, {
          liquidAssets,
          nonLiquidAssets,
          transmissionAmount,
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
  }, [liquidAssets, nonLiquidAssets, transmissionAmount, futureInflows, wishedRetirementDate, incomes, costs, user, password, loading]);

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
    toast.success(t('scenario.costDeleted'));
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

    toast.success('Cost line split - adjust dates as needed');
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
      const transmission = parseFloat(transmissionAmount || 0);
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
          cumulativeBalance: isLastYear ? cumulativeAfterTransmission : cumulativeBalance,
          incomeBreakdown: year.incomeBreakdown,
          costBreakdown: year.costBreakdown,
          transmissionDeduction: isLastYear ? transmissionDeduction : 0
        };
      });

      // Final balance after transmission
      const finalBalanceAfterTransmission = cumulativeBalance - transmission;

      // Navigate to result with full simulation data
      navigate('/result', {
        state: {
          finalBalance: finalBalanceAfterTransmission,
          balanceBeforeTransmission: cumulativeBalance,
          transmissionAmount: transmission,
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
    const transmission = parseFloat(transmissionAmount || 0);
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
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">{t('scenario.title')}</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              {t('scenario.subtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Transmission Section */}
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-400" />
                {t('scenario.transmission')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('scenario.transmissionDesc')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <Label htmlFor="transmission">{t('scenario.amountToTransmit')}</Label>
                <Input
                  data-testid="transmission-input"
                  id="transmission"
                  type="number"
                  value={transmissionAmount}
                  onChange={(e) => setTransmissionAmount(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
                <p className="text-xs text-amber-400/80 mt-2">
                  ⚠️ {t('scenario.transmissionWarning')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Incomes Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('scenario.incomeSources')}</CardTitle>
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
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.map((income, index) => {
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
                        <tr key={income.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{getIncomeName(income.name)}</td>
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
                                onChange={(e) => updateIncomeDate(income.id, 'startDate', e.target.value)}
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
                                onChange={(e) => updateIncomeDate(income.id, 'endDate', e.target.value)}
                                className="max-w-[150px]"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Costs Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('scenario.costs')}</CardTitle>
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
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
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
            </CardContent>
          </Card>

          {/* Retirement Date Selector - Redesigned */}
          <Card className="bg-blue-600 border-blue-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5" />
                {language === 'fr' ? 'Date de retraite' : 'Retirement Date'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Option 1: Choose retirement date - with date selector directly below */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <input
                    type="checkbox"
                    checked={retirementOption === 'choose'}
                    onChange={() => setRetirementOption('choose')}
                    className="w-5 h-5 rounded border-2 border-white/50 text-blue-800 focus:ring-blue-500"
                  />
                  <span className="text-white font-medium">
                    {language === 'fr' ? 'Choisir votre date de retraite anticipée' : 'Choose your early retirement date'}
                  </span>
                </label>

                {/* Date selector - directly below the first option when selected */}
                {retirementOption === 'choose' && (
                  <div className="ml-8 pl-4 border-l-2 border-white/30">
                    <div className="flex flex-wrap items-center gap-4">
                      <Input
                        data-testid="wished-retirement-date"
                        type="date"
                        value={wishedRetirementDate}
                        onChange={(e) => setWishedRetirementDate(e.target.value)}
                        className="max-w-xs bg-white text-black"
                      />
                      <Button
                        data-testid="minus-1-month-btn"
                        onClick={() => adjustDate(-1)}
                        variant="secondary"
                        size="sm"
                      >
                        {language === 'fr' ? 'Avancer de 1 mois' : 'Move forward 1 month'}
                      </Button>
                      <Button
                        data-testid="minus-1-year-btn"
                        onClick={() => adjustDate(-12)}
                        variant="secondary"
                        size="sm"
                      >
                        {language === 'fr' ? 'Avancer de 1 an' : 'Move forward 1 year'}
                      </Button>
                    </div>
                    <p className="text-sm text-white/80 mt-3">
                      {t('scenario.legalRetirementDate')}: {new Date(retirementLegalDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Option 2: Calculate earliest date */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <input
                    type="checkbox"
                    checked={retirementOption === 'calculate'}
                    onChange={() => setRetirementOption('calculate')}
                    className="w-5 h-5 rounded border-2 border-white/50 text-blue-800 focus:ring-blue-500"
                  />
                  <span className="text-white font-medium">
                    {language === 'fr'
                      ? 'Calculer la date de retraite la plus précoce possible (solde au décès non négatif)'
                      : 'Calculate the earliest retirement date possible (balance at death not negative)'}
                  </span>
                </label>

                {/* Info for "calculate" option - directly below when selected */}
                {retirementOption === 'calculate' && (
                  <div className="ml-8 pl-4 border-l-2 border-white/30">
                    <p className="text-white/80 text-sm">
                      {language === 'fr'
                        ? '📊 Le simulateur calculera automatiquement la date de retraite la plus précoce qui maintient un solde positif à votre décès théorique.'
                        : '📊 The simulator will automatically calculate the earliest retirement date that maintains a positive balance at your theoretical death.'}
                    </p>
                    <p className="text-sm text-white/80 mt-2">
                      {t('scenario.legalRetirementDate')}: {new Date(retirementLegalDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            data-testid="can-i-quit-btn"
            onClick={runSimulation}
            className="w-full"
            size="lg"
          >
            {t('scenario.runSimulation')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Scenario;
