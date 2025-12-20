import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { getIncomeData, getCostData, getUserData } from '../utils/database';
import { TrendingUp, TrendingDown, DollarSign, ArrowLeft, Home } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const FinancialBalance = () => {
  const navigate = useNavigate();
  const { user, password } = useAuth();
  const [balance, setBalance] = useState(null);
  const [yearlyBreakdown, setYearlyBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    const calculateBalance = async () => {
      try {
        const incomeData = await getIncomeData(user.email, password) || [];
        const costData = await getCostData(user.email, password) || [];
        const userData = await getUserData(user.email, password);

        const currentYear = new Date().getFullYear();
        const birthDate = new Date(userData.birthDate);
        const approximateLifeExpectancy = userData.gender === 'male' ? 80 : 85;
        const deathYear = birthDate.getFullYear() + approximateLifeExpectancy;

        // Calculate year-by-year breakdown
        const breakdown = [];
        let cumulativeBalance = 0;

        for (let year = currentYear; year <= deathYear; year++) {
          // Calculate income for this year
          let yearIncome = 0;
          incomeData.filter(row => row.amount).forEach(row => {
            const startYear = new Date(row.startDate).getFullYear();
            const endYear = row.endDate ? new Date(row.endDate).getFullYear() : year;
            
            if (year >= startYear && year <= endYear) {
              const amount = parseFloat(row.amount) || 0;
              if (row.frequency === 'Monthly') {
                yearIncome += amount * 12;
              } else if (row.frequency === 'Yearly') {
                yearIncome += amount;
              } else if (row.frequency === 'One-time' && year === startYear) {
                yearIncome += amount;
              }
            }
          });

          // Calculate costs for this year
          let yearCosts = 0;
          costData.filter(row => row.amount).forEach(row => {
            const startYear = new Date(row.startDate).getFullYear();
            const endYear = row.endDate ? new Date(row.endDate).getFullYear() : year;
            
            if (year >= startYear && year <= endYear) {
              const amount = parseFloat(row.amount) || 0;
              if (row.frequency === 'Monthly') {
                yearCosts += amount * 12;
              } else if (row.frequency === 'Yearly') {
                yearCosts += amount;
              } else if (row.frequency === 'One-time' && year === startYear) {
                yearCosts += amount;
              }
            }
          });

          const annualBalance = yearIncome - yearCosts;
          cumulativeBalance += annualBalance;

          breakdown.push({
            year,
            income: yearIncome,
            costs: yearCosts,
            annualBalance,
            cumulativeBalance
          });
        }

        setYearlyBreakdown(breakdown);

        // Calculate total summary
        const totalIncome = incomeData
          .filter(row => row.amount)
          .reduce((sum, row) => {
            const amount = parseFloat(row.amount) || 0;
            if (row.frequency === 'Monthly') {
              return sum + (amount * 12);
            } else if (row.frequency === 'Yearly') {
              return sum + amount;
            } else {
              return sum + amount;
            }
          }, 0);

        const totalCosts = costData
          .filter(row => row.amount)
          .reduce((sum, row) => {
            const amount = parseFloat(row.amount) || 0;
            if (row.frequency === 'Monthly') {
              return sum + (amount * 12);
            } else if (row.frequency === 'Yearly') {
              return sum + amount;
            } else {
              return sum + amount;
            }
          }, 0);

        const yearlyBalance = totalIncome - totalCosts;
        const monthlyBalance = yearlyBalance / 12;

        setBalance({
          totalIncome,
          totalCosts,
          yearlyBalance,
          monthlyBalance,
          incomeCount: incomeData.filter(r => r.amount).length,
          costCount: costData.filter(r => r.amount).length
        });
      } catch (error) {
        toast.error('Failed to calculate balance');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    calculateBalance();
  }, [user, password, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Calculating your financial balance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" data-testid="financial-balance-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">Financial Balance Overview</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              Here's a comprehensive analysis of your financial situation over your lifetime.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              data-testid="back-btn"
              onClick={() => navigate('/costs')}
              variant="outline"
              size="icon"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              data-testid="home-btn"
              onClick={() => navigate('/')}
              variant="outline"
              size="icon"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {balance && yearlyBreakdown.length > 0 && (
          <div className="space-y-6 mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              <Card data-testid="death-balance-status-card" className={yearlyBreakdown[yearlyBreakdown.length - 1].cumulativeBalance >= 0 ? 'border-green-500' : 'border-red-500'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    Balance at Date of Death
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-4xl font-bold ${yearlyBreakdown[yearlyBreakdown.length - 1].cumulativeBalance >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="death-balance-status">
                    {yearlyBreakdown[yearlyBreakdown.length - 1].cumulativeBalance >= 0 ? 'POSITIVE' : 'NEGATIVE'}
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="death-balance-value-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    Balance Value at Date of Death
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${yearlyBreakdown[yearlyBreakdown.length - 1].cumulativeBalance >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="death-balance-value">
                    {yearlyBreakdown[yearlyBreakdown.length - 1].cumulativeBalance >= 0 ? '+' : ''}
                    CHF {yearlyBreakdown[yearlyBreakdown.length - 1].cumulativeBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Financial Projection Graph */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Projection Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={yearlyBreakdown}>
                    <defs>
                      <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
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
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#f3f4f6' }}
                      formatter={(value) => [`CHF ${value.toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="cumulativeBalance" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorCumulative)"
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
                            ${row.income.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-right p-3 text-red-500">
                            ${row.costs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className={`text-right p-3 font-semibold ${row.annualBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {row.annualBalance >= 0 ? '+' : ''}${row.annualBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className={`text-right p-3 font-bold ${row.cumulativeBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {row.cumulativeBalance >= 0 ? '+' : ''}${row.cumulativeBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Button
          data-testid="next-btn"
          onClick={() => navigate('/scenario')}
          className="w-full"
        >
          Next - Scenario Page
        </Button>
      </div>
    </div>
  );
};

export default FinancialBalance;
