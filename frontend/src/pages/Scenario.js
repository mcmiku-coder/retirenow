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
import { Calendar, Minus } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

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
        
        const approximateLifeExpectancy = userData.gender === 'male' ? 80 : 85;
        const deathDate = new Date(birthDate);
        deathDate.setFullYear(deathDate.getFullYear() + approximateLifeExpectancy);
        const deathDateStr = deathDate.toISOString().split('T')[0];

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

  const runSimulation = () => {
    try {
      const currentYear = new Date().getFullYear();
      const wishedRetirementYear = new Date(wishedRetirementDate).getFullYear();
      const retirementLegalYear = new Date(retirementLegalDate).getFullYear();
      const deathYear = new Date(deathDate).getFullYear();
      
      let initialSavings = parseFloat(liquidAssets || 0) + parseFloat(nonLiquidAssets || 0);
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
          let shouldInclude = false;
          
          // Salary: current date to wished retirement date
          if (income.name === 'Salary' && year < wishedRetirementYear) {
            shouldInclude = true;
          }
          // LPP: wished retirement date to death
          else if (income.name === 'LPP' && year >= wishedRetirementYear) {
            shouldInclude = true;
          }
          // AVS: legal retirement date to death
          else if (income.name === 'AVS' && year >= retirementLegalYear) {
            shouldInclude = true;
          }
          // 3a: starts at wished retirement date
          else if (income.name === '3a' && year === wishedRetirementYear) {
            shouldInclude = true;
          }

          if (shouldInclude) {
            let yearlyAmount = 0;
            if (income.frequency === 'Monthly') {
              yearlyAmount = amount * 12;
            } else if (income.frequency === 'Yearly') {
              yearlyAmount = amount;
            } else {
              yearlyAmount = amount;
            }
            
            yearData.income += yearlyAmount;
            yearData.incomeBreakdown[income.name] = yearlyAmount;
          }
        });

        costs.forEach(cost => {
          const startYear = new Date(cost.startDate).getFullYear();
          const endYear = cost.endDate ? new Date(cost.endDate).getFullYear() : year;
          
          if (year >= startYear && year <= endYear) {
            const amount = parseFloat(cost.adjustedAmount) || 0;
            let yearlyAmount = 0;
            
            if (cost.frequency === 'Monthly') {
              yearlyAmount = amount * 12;
            } else if (cost.frequency === 'Yearly') {
              yearlyAmount = amount;
            } else if (cost.frequency === 'One-time' && year === startYear) {
              yearlyAmount = amount;
            }
            
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
                <Calendar className="h-5 w-5" />
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
                          <td className="p-3">{startDate}</td>
                          <td className="p-3">{endDate}</td>
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
                        <td className="p-3">{cost.startDate ? new Date(cost.startDate).toLocaleDateString() : '-'}</td>
                        <td className="p-3">{cost.endDate ? new Date(cost.endDate).toLocaleDateString() : '-'}</td>
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
