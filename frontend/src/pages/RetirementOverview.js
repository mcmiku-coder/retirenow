import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { getUserData, saveUserData } from '../utils/database';
import { calculateLifeExpectancy } from '../utils/lifeExpectancy';
import { Calendar, Heart, TrendingUp } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL;

const RetirementOverview = () => {
  const navigate = useNavigate();
  const { user, masterKey } = useAuth();
  const { t, language } = useLanguage();
  const [retirementData, setRetirementData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userEmail = user?.email;

  useEffect(() => {
    if (!user || !userEmail) { navigate('/'); return; }
    if (!masterKey) { navigate('/'); return; }

    const loadRetirementData = async () => {
      try {
        const data = await getUserData(userEmail, masterKey);
        if (!data || !data.birthDate) { navigate('/personal-info'); return; }

        setUserData(data);

        const retirementResult = calculateLifeExpectancy(data.birthDate, data.gender);
        setRetirementData(retirementResult);

        await saveUserData(userEmail, masterKey, {
          ...data,
          retirementLegalDate: retirementResult.retirement_legal_date,
          theoreticalDeathDate: retirementResult.theoretical_death_date,
          lifeExpectancyYears: retirementResult.life_expectancy_years
        });
      } catch (error) {
        console.error('Error in loadRetirementData:', error);
        setError(error.message || 'Failed to load data');
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    loadRetirementData();
  }, [user, userEmail, masterKey, navigate, t]);

  const formatDate = (dateString) => {
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, { year: 'numeric', month: 'short' });
  };

  // Avatar — same convention as PersonalInfo: /avatar_{M|F}_{40|50|60}_{blue|red}.png
  const getAvatarSrc = () => {
    if (!userData?.gender || !userData?.birthDate) return null;
    const age = new Date().getFullYear() - new Date(userData.birthDate).getFullYear();
    const bracket = age < 50 ? '40' : age <= 60 ? '50' : '60';
    const gCode = userData.gender === 'female' ? 'F' : 'M';
    return `/avatar_${gCode}_${bracket}_blue.png`;
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
          <p className="text-muted-foreground mb-4">Could not connect to the server to calculate your retirement data.</p>
          <p className="text-sm text-muted-foreground mb-6">Error: {error}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full">Try Again</Button>
            <Button onClick={() => navigate('/personal-info')} variant="outline" className="w-full">Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const avatarSrc = getAvatarSrc();

  return (
    <div className="flex-grow py-6 px-4" data-testid="retirement-overview-page">
      <PageHeader
        title={t('retirementOverview.title')}
        subtitle={t('retirementOverview.subtitle')}
      />

      <div className="max-w-[900px] w-full mx-auto px-4">

        {retirementData && (
          <div
            className="bg-card border rounded-xl overflow-hidden flex items-stretch mb-8"
            data-testid="retirement-date-card"
          >
            {/* 3 stats — left */}
            <div className="flex-1 flex items-center divide-x divide-border">

              {/* Legal Retirement Date */}
              <div className="flex-1 px-6 py-5" data-testid="retirement-date">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {t('retirementOverview.legalRetirement')}
                </div>
                <p className="text-2xl font-bold">{formatDate(retirementData.retirement_legal_date)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('retirementOverview.legalRetirementDesc')}</p>
              </div>

              {/* Life Expectancy */}
              <div className="flex-1 px-6 py-5" data-testid="life-expectancy">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  <Heart className="h-3.5 w-3.5 shrink-0" />
                  {t('retirementOverview.lifeExpectancy')}
                </div>
                <p className="text-2xl font-bold">
                  {Math.round(retirementData.life_expectancy_years)} {t('retirementOverview.years')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('retirementOverview.lifeExpectancyDesc')}</p>
              </div>

              {/* Theoretical Death Date */}
              <div className="flex-1 px-6 py-5" data-testid="death-date">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  {t('retirementOverview.theoreticalDeath')}
                </div>
                <p className="text-2xl font-bold">{formatDate(retirementData.theoretical_death_date)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('retirementOverview.theoreticalDeathDesc')}</p>
              </div>

            </div>

            {/* Avatar panel — right */}
            <div className="w-[100px] shrink-0 bg-muted/30 flex items-center justify-center border-l border-border">
              {avatarSrc ? (
                <div className="w-[100px] h-[100px] overflow-hidden">
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="w-[calc(100%+20px)] h-[calc(100%+20px)] -ml-[10px] -mt-[10px] object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted border-2 border-dashed border-border/60 opacity-40" />
              )}
            </div>

          </div>
        )}

        <div className="flex justify-center mt-6">
          <Button
            data-testid="next-btn"
            onClick={() => navigate('/income')}
            size="lg"
            className="px-12 text-lg"
          >
            {t('retirementOverview.continue')}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default RetirementOverview;
