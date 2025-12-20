import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { NavigationButtons } from '../components/NavigationButtons';

const Scenario = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" data-testid="scenario-page">
      <div className="max-w-4xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">Scenario Analysis</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              We've analyzed your financial situation against your retirement timeline. Let's see if you're ready to quit!
            </p>
          </div>
          <NavigationButtons backPath="/financial-balance" />
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded-full p-3">
                  <span className="text-2xl">1</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Retirement Timeline</h3>
                  <p className="text-sm text-muted-foreground">
                    Your legal retirement date and life expectancy have been calculated based on statistical data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded-full p-3">
                  <span className="text-2xl">2</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Financial Assessment</h3>
                  <p className="text-sm text-muted-foreground">
                    We've compared your expected income sources with your planned expenses.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded-full p-3">
                  <span className="text-2xl">3</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Simple Balance Calculation</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on your current data, we can determine if your finances support early retirement.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          data-testid="next-btn"
          onClick={() => navigate('/result')}
          className="w-full"
        >
          Next - See Result
        </Button>
      </div>
    </div>
  );
};

export default Scenario;
