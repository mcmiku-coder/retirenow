import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getIncomeData, getCostData, getUserData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import { toast } from 'sonner';
import { NavigationButtons } from '../components/NavigationButtons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const ScenarioResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, password, logout } = useAuth();
  const [result, setResult] = useState(null);
  const [yearlyBreakdown, setYearlyBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    const determineResult = async () => {
      try {
        // Check if we have simulation data from Scenario page
        if (location.state && location.state.yearlyBreakdown) {
          // Use the breakdown data directly from simulation
          setYearlyBreakdown(location.state.yearlyBreakdown);
          setResult({
            canQuit: location.state.finalBalance >= 0,
            balance: location.state.finalBalance,
            wishedRetirementDate: location.state.wishedRetirementDate,
            fromSimulation: true
          });
        } else {
          // Fallback: calculate from original data if accessed directly
          const userData = await getUserData(user.email, password);
          const incomeData = await getIncomeData(user.email, password) || [];
          const costData = await getCostData(user.email, password) || [];

          if (!userData) {
            navigate('/personal-info');
            return;
          }

          const currentYear = new Date().getFullYear();
          const birthDate = new Date(userData.birthDate);
          const approximateLifeExpectancy = userData.gender === 'male' ? 80 : 85;
          const deathYear = birthDate.getFullYear() + approximateLifeExpectancy;

          const breakdown = [];
          let cumulativeBalance = 0;

          for (let year = currentYear; year <= deathYear; year++) {
            let yearIncome = 0;
            let yearCosts = 0;
            const incomeBreakdown = {};
            const costBreakdown = {};

            incomeData.filter(row => row.amount).forEach(row => {
              const startYear = new Date(row.startDate).getFullYear();
              const endYear = row.endDate ? new Date(row.endDate).getFullYear() : year;
              
              if (year >= startYear && year <= endYear) {
                const amount = parseFloat(row.amount) || 0;
                let yearlyAmount = 0;
                if (row.frequency === 'Monthly') {
                  yearlyAmount = amount * 12;
                } else if (row.frequency === 'Yearly') {
                  yearlyAmount = amount;
                } else if (row.frequency === 'One-time' && year === startYear) {
                  yearlyAmount = amount;
                }
                yearIncome += yearlyAmount;
                incomeBreakdown[row.name] = yearlyAmount;
              }
            });

            costData.filter(row => row.amount).forEach(row => {
              const startYear = new Date(row.startDate).getFullYear();
              const endYear = row.endDate ? new Date(row.endDate).getFullYear() : year;
              
              if (year >= startYear && year <= endYear) {
                const amount = parseFloat(row.amount) || 0;
                let yearlyAmount = 0;
                if (row.frequency === 'Monthly') {
                  yearlyAmount = amount * 12;
                } else if (row.frequency === 'Yearly') {
                  yearlyAmount = amount;
                } else if (row.frequency === 'One-time' && year === startYear) {
                  yearlyAmount = amount;
                }
                yearCosts += yearlyAmount;
                const category = row.category || row.name || 'Other';
                costBreakdown[category] = (costBreakdown[category] || 0) + yearlyAmount;
              }
            });

            const annualBalance = yearIncome - yearCosts;
            cumulativeBalance += annualBalance;

            breakdown.push({
              year,
              income: yearIncome,
              costs: yearCosts,
              annualBalance,
              cumulativeBalance,
              incomeBreakdown,
              costBreakdown
            });
          }

          setYearlyBreakdown(breakdown);
          
          setResult({
            canQuit: cumulativeBalance >= 0,
            balance: cumulativeBalance,
            fromSimulation: false
          });
        }
      } catch (error) {
        toast.error('Failed to determine result');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    determineResult();
  }, [user, password, navigate, location]);

  const handleReset = () => {
    logout();
    navigate('/');
    toast.success('Session cleared');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Determining your retirement readiness...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" data-testid="scenario-result-page">
      <div className="max-w-4xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">Your Retirement Verdict</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              Based on your financial data and retirement timeline, here's our assessment:
            </p>
          </div>
          <NavigationButtons backPath="/scenario" />
        </div>

        {result && (
          <div className="space-y-6">
            <Card className="mb-8 overflow-hidden">
              <div className="max-w-md mx-auto p-4">
                <img
                  src={result.canQuit ? '/yes_quit.png' : '/no_quit.png'}
                  alt={result.canQuit ? 'Yes you can quit!' : 'No you cannot quit yet!'}
                  className="w-full h-auto object-cover rounded-lg"
                  data-testid="result-image"
                />
              </div>
              <div className="p-8 text-center">
                <h2 className="text-3xl font-bold mb-4" data-testid="result-message">
                  {result.canQuit ? 'YES YOU CAN! QUIT!' : 'NO YOU CANNOT QUIT YET!'}
                </h2>
                <p className="text-xl text-muted-foreground mb-2">
                  {result.fromSimulation ? 'Projected balance at end of life:' : 'Your annual balance:'}
                  <span className={`font-bold ml-2 ${result.balance >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="result-balance">
                    {result.balance >= 0 ? '+' : ''}
                    CHF {result.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </p>
                {result.wishedRetirementDate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on retirement date: {new Date(result.wishedRetirementDate).toLocaleDateString()}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-6">
                  {result.canQuit 
                    ? 'Your projected balance is positive! You have the financial foundation to consider retirement.'
                    : 'Your projected balance is negative. Consider adjusting your financial plan or retirement date before making the leap.'}
                </p>
              </div>
            </Card>

            {yearlyBreakdown.length > 0 && (
              <>
                {/* Financial Projection Graph */}
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Projection Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={yearlyBreakdown}>
                        <defs>
                          <linearGradient id="colorCumulativeResult" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="year" 
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af' }}
                        />
                        <YAxis 
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af' }}
                          tickFormatter={(value) => `CHF ${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px' }}
                          labelStyle={{ color: '#f3f4f6', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length > 0) {
                              const data = payload[0].payload;
                              return (
                                <div style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px' }}>
                                  <div style={{ color: '#f3f4f6', fontWeight: 'bold', marginBottom: '8px' }}>Year {data.year}</div>
                                  
                                  <div style={{ marginBottom: '8px' }}>
                                    <div style={{ color: '#3b82f6', fontWeight: '600', marginBottom: '4px' }}>
                                      Annual Balance: CHF {data.annualBalance.toLocaleString()}
                                    </div>
                                    <div style={{ color: '#10b981', fontWeight: '600' }}>
                                      Cumulative Balance: CHF {data.cumulativeBalance.toLocaleString()}
                                    </div>
                                  </div>
                                  
                                  <div style={{ marginBottom: '6px', paddingTop: '8px', borderTop: '1px solid #374151' }}>
                                    <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '4px' }}>
                                      Income: CHF {data.income.toLocaleString()}
                                    </div>
                                    {data.incomeBreakdown && Object.entries(data.incomeBreakdown).map(([name, value]) => (
                                      <div key={name} style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '8px' }}>
                                        • {name}: CHF {value.toLocaleString()}
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div style={{ paddingTop: '6px', borderTop: '1px solid #374151' }}>
                                    <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '4px' }}>
                                      Costs: CHF {data.costs.toLocaleString()}
                                    </div>
                                    {data.costBreakdown && Object.entries(data.costBreakdown).map(([name, value]) => (
                                      <div key={name} style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '8px' }}>
                                        • {name}: CHF {value.toLocaleString()}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="cumulativeBalance" 
                          stroke="#10b981" 
                          fillOpacity={1} 
                          fill="url(#colorCumulativeResult)"
                          name="Cumulative Balance"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="annualBalance" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Annual Balance"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Year-by-Year Breakdown Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Year-by-Year Financial Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-semibold">Year</th>
                            <th className="text-right p-3 font-semibold">Income</th>
                            <th className="text-right p-3 font-semibold">Costs</th>
                            <th className="text-right p-3 font-semibold">Annual Balance</th>
                            <th className="text-right p-3 font-semibold">Cumulative Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearlyBreakdown.map((row, index) => (
                            <tr key={row.year} className={`border-b ${row.annualBalance < 0 ? 'bg-red-500/5' : ''}`}>
                              <td className="p-3 font-medium">{row.year}</td>
                              <td className="text-right p-3 text-green-500">
                                CHF {row.income.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className="text-right p-3 text-red-500">
                                CHF {row.costs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className={`text-right p-3 font-semibold ${row.annualBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {row.annualBalance >= 0 ? '+' : ''}CHF {row.annualBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className={`text-right p-3 font-bold ${row.cumulativeBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {row.cumulativeBalance >= 0 ? '+' : ''}CHF {row.cumulativeBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        <div className="flex gap-4">
          <Button
            data-testid="review-btn"
            onClick={() => navigate('/financial-balance')}
            variant="outline"
            className="flex-1"
          >
            Review My Data
          </Button>
          <Button
            data-testid="start-over-btn"
            onClick={handleReset}
            className="flex-1"
          >
            Start Over
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScenarioResult;
