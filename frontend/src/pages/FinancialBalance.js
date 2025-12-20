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

        // Simple calculation: sum all income and costs
        const totalIncome = incomeData
          .filter(row => row.amount)
          .reduce((sum, row) => {
            const amount = parseFloat(row.amount) || 0;
            // Convert to yearly
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
            // Convert to yearly
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4" data-testid="financial-balance-page">
      <div className="max-w-4xl w-full">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">Financial Balance Overview</h1>
          <p className="text-muted-foreground" data-testid="page-subtitle">
            Here's a summary of your financial situation based on your income and expenses.
          </p>
        </div>

        {balance && (
          <div className="space-y-6 mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              <Card data-testid="income-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Total Annual Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold" data-testid="total-income">
                    ${balance.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {balance.incomeCount} income sources
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="costs-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    Total Annual Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold" data-testid="total-costs">
                    ${balance.totalCosts.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {balance.costCount} expense items
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className={balance.yearlyBalance >= 0 ? 'border-green-500' : 'border-red-500'} data-testid="balance-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <DollarSign className="h-6 w-6" />
                  Net Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Yearly Balance</p>
                    <p className={`text-3xl font-bold ${balance.yearlyBalance >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="yearly-balance">
                      {balance.yearlyBalance >= 0 ? '+' : ''}
                      ${balance.yearlyBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Monthly Balance</p>
                    <p className={`text-3xl font-bold ${balance.monthlyBalance >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="monthly-balance">
                      {balance.monthlyBalance >= 0 ? '+' : ''}
                      ${balance.monthlyBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
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
