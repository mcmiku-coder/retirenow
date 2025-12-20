import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { getIncomeData, getCostData, getUserData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import { NavigationButtons } from '../components/NavigationButtons';
import { Calendar, Minus, Trash2, Split, Gift } from 'lucide-react';

const Scenario = () => {
  const navigate = useNavigate();
  const { user, password } = useAuth();
  const [wishedRetirementDate, setWishedRetirementDate] = useState('');
  const [retirementLegalDate, setRetirementLegalDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [incomes, setIncomes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [liquidAssets, setLiquidAssets] = useState('');
  const [nonLiquidAssets, setNonLiquidAssets] = useState('');
  const [transmissionAmount, setTransmissionAmount] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Track date overrides for standard income sources
  const [incomeDateOverrides, setIncomeDateOverrides] = useState({});

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
        setWishedRetirementDate(retirementDateStr);
        setDeathDate(deathDateStr);

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

      } catch (error) {
        toast.error('Failed to load data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, password, navigate]);

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
    toast.success('Cost line deleted');
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
      const wishedRetirementYear = new Date(wishedRetirementDate).getFullYear();
      const retirementLegalYear = new Date(retirementLegalDate).getFullYear();
      const deathYear = new Date(deathDate).getFullYear();
      
      let initialSavings = parseFloat(liquidAssets || 0) + parseFloat(nonLiquidAssets || 0);
      const yearlyData = [];
      const today = new Date().toISOString().split('T')[0];

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
          
          // Determine dates based on income type
          if (income.name === 'Salary') {
            startDate = today;
            endDate = wishedRetirementDate;
          } else if (income.name === 'LPP') {
            startDate = wishedRetirementDate;
            endDate = deathDate;
          } else if (income.name === 'AVS') {
            startDate = retirementLegalDate;
            endDate = deathDate;
          } else if (income.name === '3a') {
            // 3a is one-time at retirement
            if (year === wishedRetirementYear) {
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

        yearlyData.push(yearData);
      }

      // Calculate cumulative with initial savings
      let cumulativeBalance = initialSavings;
      const breakdown = yearlyData.map(year => {
        const annualBalance = year.income - year.costs;
        cumulativeBalance += annualBalance;
        
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

      // Navigate to result with full simulation data
      navigate('/result', {
        state: {
          finalBalance: cumulativeBalance,
          wishedRetirementDate,
          liquidAssets,
          nonLiquidAssets,
          yearlyBreakdown: breakdown,
          adjustedIncomes: incomes,
          adjustedCosts: costs
        }
      });

    } catch (error) {
      toast.error('Simulation failed');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading scenario data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" data-testid="scenario-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">Retirement Scenario Simulator</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              Adjust your retirement date and values to see if you can quit early!
            </p>
          </div>
          <NavigationButtons backPath="/financial-balance" />
        </div>

        <div className="space-y-6">
          {/* Wished Retirement Date Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                My Wished Retirement Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  data-testid="wished-retirement-date"
                  type="date"
                  value={wishedRetirementDate}
                  onChange={(e) => setWishedRetirementDate(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  data-testid="minus-1-month-btn"
                  onClick={() => adjustDate(-1)}
                  variant="outline"
                  size="sm"
                >
                  <Minus className="h-4 w-4 mr-1" />
                  1 Month
                </Button>
                <Button
                  data-testid="minus-1-year-btn"
                  onClick={() => adjustDate(-12)}
                  variant="outline"
                  size="sm"
                >
                  <Minus className="h-4 w-4 mr-1" />
                  1 Year
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Legal retirement date: {new Date(retirementLegalDate).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          {/* Incomes Table */}
          <Card>
            <CardHeader>
              <CardTitle>Income Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Name</th>
                      <th className="text-right p-3 font-semibold">Original Value</th>
                      <th className="text-right p-3 font-semibold">Adjusted Value</th>
                      <th className="text-left p-3 font-semibold">Frequency</th>
                      <th className="text-left p-3 font-semibold">Start Date</th>
                      <th className="text-left p-3 font-semibold">End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.map((income, index) => {
                      // Calculate start and end dates based on income type
                      let startDate = '';
                      let endDate = '';
                      const today = new Date().toLocaleDateString();
                      const wishedRetirement = new Date(wishedRetirementDate).toLocaleDateString();
                      const legalRetirement = new Date(retirementLegalDate).toLocaleDateString();
                      const death = new Date(deathDate).toLocaleDateString();
                      
                      if (income.name === 'Salary') {
                        startDate = today;
                        endDate = wishedRetirement;
                      } else if (income.name === 'LPP') {
                        startDate = wishedRetirement;
                        endDate = death;
                      } else if (income.name === 'AVS') {
                        startDate = legalRetirement;
                        endDate = death;
                      } else if (income.name === '3a') {
                        startDate = wishedRetirement;
                        endDate = '-';
                      } else {
                        startDate = income.startDate ? new Date(income.startDate).toLocaleDateString() : '-';
                        endDate = income.endDate ? new Date(income.endDate).toLocaleDateString() : '-';
                      }
                      
                      return (
                        <tr key={income.id} className="border-b">
                          <td className="p-3 font-medium">{income.name}</td>
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
                          <td className="p-3">{income.frequency}</td>
                          <td className="p-3">
                            {(income.name === 'Salary' || income.name === 'LPP' || income.name === 'AVS' || income.name === '3a') ? (
                              <span className="text-muted-foreground">{startDate}</span>
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
                            {(income.name === 'Salary' || income.name === 'LPP' || income.name === 'AVS' || income.name === '3a') ? (
                              <span className="text-muted-foreground">{endDate}</span>
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
              <CardTitle>Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Name</th>
                      <th className="text-right p-3 font-semibold">Original Value</th>
                      <th className="text-right p-3 font-semibold">Adjusted Value</th>
                      <th className="text-left p-3 font-semibold">Frequency</th>
                      <th className="text-left p-3 font-semibold">Start Date</th>
                      <th className="text-left p-3 font-semibold">End Date</th>
                      <th className="text-center p-3 font-semibold w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costs.map((cost, index) => (
                      <tr key={cost.id} className="border-b">
                        <td className="p-3 font-medium">{cost.name}</td>
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
                        <td className="p-3">{cost.frequency}</td>
                        <td className="p-3">
                          <Input
                            type="date"
                            value={cost.startDate || ''}
                            onChange={(e) => updateCostDate(cost.id, 'startDate', e.target.value)}
                            className="max-w-[150px]"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="date"
                            value={cost.endDate || ''}
                            onChange={(e) => updateCostDate(cost.id, 'endDate', e.target.value)}
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
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Savings Section */}
          <Card>
            <CardHeader>
              <CardTitle>Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="liquid-assets">Liquid Assets (CHF)</Label>
                  <Input
                    data-testid="liquid-assets-input"
                    id="liquid-assets"
                    type="number"
                    value={liquidAssets}
                    onChange={(e) => setLiquidAssets(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="non-liquid-assets">Non-Liquid Assets (CHF)</Label>
                  <Input
                    data-testid="non-liquid-assets-input"
                    id="non-liquid-assets"
                    type="number"
                    value={nonLiquidAssets}
                    onChange={(e) => setNonLiquidAssets(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            data-testid="can-i-quit-btn"
            onClick={runSimulation}
            className="w-full"
            size="lg"
          >
            Can I Quit? - Run Simulation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Scenario;
