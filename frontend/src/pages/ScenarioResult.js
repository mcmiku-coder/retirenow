import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { getIncomeData, getCostData } from '../utils/database';
import { toast } from 'sonner';
import { NavigationButtons } from '../components/NavigationButtons';

const ScenarioResult = () => {
  const navigate = useNavigate();
  const { user, password, logout } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    const determineResult = async () => {
      try {
        const incomeData = await getIncomeData(user.email, password) || [];
        const costData = await getCostData(user.email, password) || [];

        // Calculate yearly balance
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
        
        setResult({
          canQuit: yearlyBalance >= 0,
          balance: yearlyBalance
        });
      } catch (error) {
        toast.error('Failed to determine result');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    determineResult();
  }, [user, password, navigate]);

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
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">Your Retirement Verdict</h1>
          <p className="text-muted-foreground" data-testid="page-subtitle">
            Based on your financial data and retirement timeline, here's our assessment:
          </p>
        </div>

        {result && (
          <Card className="mb-8 overflow-hidden">
            <div className="aspect-square max-w-2xl mx-auto">
              <img
                src={result.canQuit ? '/yes_quit.png' : '/no_quit.png'}
                alt={result.canQuit ? 'Yes you can quit!' : 'No you cannot quit yet!'}
                className="w-full h-full object-cover"
                data-testid="result-image"
              />
            </div>
            <div className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-4" data-testid="result-message">
                {result.canQuit ? 'YES YOU CAN! QUIT!' : 'NO YOU CANNOT QUIT YET!'}
              </h2>
              <p className="text-xl text-muted-foreground mb-2">
                Your annual balance: 
                <span className={`font-bold ml-2 ${result.balance >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="result-balance">
                  {result.balance >= 0 ? '+' : ''}
                  ${result.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-6">
                {result.canQuit 
                  ? 'Your income exceeds your expenses! You have the financial foundation to consider retirement.'
                  : 'Your expenses exceed your income. Consider adjusting your financial plan before making the leap.'}
              </p>
            </div>
          </Card>
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
