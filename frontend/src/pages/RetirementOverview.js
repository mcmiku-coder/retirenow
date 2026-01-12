import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { getUserData, saveUserData } from '../utils/database';
import { calculateLifeExpectancy } from '../utils/lifeExpectancy';
import { Calendar, Heart, TrendingUp } from 'lucide-react';
import WorkflowNavigation from '../components/WorkflowNavigation';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL;

const RetirementOverview = () => {
  const navigate = useNavigate();
  const { user, password } = useAuth();
  const { t, language } = useLanguage();
  const [retirementData, setRetirementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get email safely
  const userEmail = user?.email;

  useEffect(() => {
    // Check for valid session
    if (!user || !userEmail) {
      console.warn('No user or email, redirecting to login');
      navigate('/');
      return;
    }

    if (!password) {
      console.warn('No password available, redirecting to login');
      navigate('/');
      return;
    }

    const loadRetirementData = async () => {
      try {
        console.log('Loading user data for:', userEmail);
        const userData = await getUserData(userEmail, password);

        if (!userData || !userData.birthDate) {
          console.warn('No user data or birth date found, redirecting to personal-info');
          navigate('/personal-info');
          return;
        }

        console.log('User data loaded:', { birthDate: userData.birthDate, gender: userData.gender });

        // Calculate life expectancy locally using embedded Swiss statistics
        console.log('Calculating life expectancy locally...');
        const retirementResult = calculateLifeExpectancy(userData.birthDate, userData.gender);
        console.log('Life expectancy calculation result:', retirementResult);

        setRetirementData(retirementResult);

        // Save the calculated dates back to user data for use in other pages
        const updatedUserData = {
          ...userData,
          retirementLegalDate: retirementResult.retirement_legal_date,
          theoreticalDeathDate: retirementResult.theoretical_death_date,
          lifeExpectancyYears: retirementResult.life_expectancy_years
        };
        await saveUserData(userEmail, password, updatedUserData);
        console.log('Updated user data saved');
      } catch (error) {
        console.error('Error in loadRetirementData:', error);
        setError(error.message || 'Failed to load data');
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    loadRetirementData();
  }, [user, userEmail, password, navigate, t]);

  // Format date based on language
  const formatDate = (dateString) => {
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, { year: 'numeric', month: 'short' });
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

  if (error && !retirementData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Unable to Load Data</h2>
          <p className="text-muted-foreground mb-4">
            Could not connect to the server to calculate your retirement data.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Error: {error}
          </p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
            <Button onClick={() => navigate('/personal-info')} variant="outline" className="w-full">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" data-testid="retirement-overview-page">
      <div className="max-w-4xl w-full mx-auto">
        <WorkflowNavigation />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">{t('retirementOverview.title')}</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              {t('retirementOverview.subtitle')}
            </p>
          </div>
        </div>

        {retirementData && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card data-testid="retirement-date-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  {t('retirementOverview.legalRetirement')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="retirement-date">
                  {formatDate(retirementData.retirement_legal_date)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t('retirementOverview.legalRetirementDesc')}</p>
              </CardContent>
            </Card>

            <Card data-testid="life-expectancy-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5" />
                  {t('retirementOverview.lifeExpectancy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="life-expectancy">
                  {Math.round(retirementData.life_expectancy_years)} {t('retirementOverview.years')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t('retirementOverview.lifeExpectancyDesc')}</p>
              </CardContent>
            </Card>

            <Card data-testid="death-date-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  {t('retirementOverview.theoreticalDeath')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="death-date">
                  {formatDate(retirementData.theoretical_death_date)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t('retirementOverview.theoreticalDeathDesc')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Button
          data-testid="next-btn"
          onClick={() => navigate('/income')}
          className="w-full"
        >
          {t('retirementOverview.continue')}
        </Button>
      </div>
    </div>
  );
};

export default RetirementOverview;
