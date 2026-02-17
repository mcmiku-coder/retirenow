import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { saveUserData, getUserData } from '../utils/database';
import { Trash2, Plus, HelpCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const PersonalInfo = () => {
  const navigate = useNavigate();
  const { user, masterKey } = useAuth();
  const { t } = useLanguage();
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [firstName, setFirstName] = useState('');
  const [analysisType, setAnalysisType] = useState('individual'); // 'individual' or 'couple'
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [residence] = useState('Switzerland'); // Default to Switzerland, field removed from UI
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Get email safely
  const userEmail = user?.email;

  useEffect(() => {
    // Redirect to login if no user or no password (password is lost on page refresh)
    if (!user || !userEmail) {
      console.warn('No user or email available, redirecting to login');
      navigate('/');
      return;
    }

    // If user exists but password is null (page was refreshed), redirect to login
    if (!masterKey) {
      console.warn('Password not available - session may have been refreshed. Redirecting to login.');
      navigate('/');
      return;
    }

    // Load existing data if any
    const loadData = async () => {
      setDataLoading(true);
      try {
        // Only try to load if we have valid email and password
        if (userEmail && masterKey) {
          const data = await getUserData(userEmail, masterKey);
          if (data) {
            setBirthDate(data.birthDate || '');
            setGender(data.gender || '');
            setFirstName(data.firstName || '');
            setAnalysisType(data.analysisType || 'individual');
            // residence is now hardcoded to Switzerland
          }
          // If data is null, that's fine - it's a new user with empty form
        }
      } catch (error) {
        // Log but don't block - new users won't have data yet
        console.error('Error loading data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, [user, userEmail, masterKey, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!birthDate || !gender) {
      toast.error(t('common.error'));
      return;
    }

    // Double-check email and password are available before trying to save
    if (!userEmail) {
      console.error('No email available for save');
      toast.error('Session expired. Please log in again.');
      navigate('/');
      return;
    }

    if (!masterKey) {
      console.error('No password available for save');
      toast.error('Session expired. Please log in again.');
      navigate('/');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        birthDate,
        gender,
        firstName,
        analysisType,
        residence
      };

      console.log('Saving user data for:', userEmail);
      await saveUserData(userEmail, masterKey, userData);
      navigate('/retirement-overview');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('personalInfo.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while data is being loaded
  if (dataLoading) {
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
    <div className="flex-grow py-6" data-testid="personal-info-page">
      <div className="max-w-6xl mx-auto mb-6 px-4">
      </div>

      <PageHeader
        title={t('personalInfo.title')}
        subtitle={t('personalInfo.subtitle')}
      />

      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-[800px] mx-auto">

          <form id="personal-info-form" onSubmit={handleSubmit} className="bg-card border rounded-lg p-8 space-y-6">
            {/* Analysis Type Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">{t('personalInfo.analysisType')}</Label>
              <RadioGroup
                value={analysisType}
                onValueChange={(value) => {
                  if (value === 'couple') {
                    setShowComingSoonModal(true);
                    // Keep it on individual
                    setAnalysisType('individual');
                  } else {
                    setAnalysisType(value);
                  }
                }}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="text-sm cursor-pointer">
                    {t('personalInfo.individualSituation')}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="couple" id="couple" />
                  <Label htmlFor="couple" className="text-sm cursor-pointer">
                    {t('personalInfo.coupleSituation')}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="birthDate">{t('personalInfo.birthDate')}</Label>
                <div className="relative">
                  <HelpCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="birth-date-input"
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="gender">{t('personalInfo.gender')}</Label>
                <Select value={gender} onValueChange={setGender} required>
                  <SelectTrigger data-testid="gender-select">
                    <SelectValue placeholder={t('personalInfo.gender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male" data-testid="gender-male">{t('personalInfo.male')}</SelectItem>
                    <SelectItem value="female" data-testid="gender-female">{t('personalInfo.female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="firstName">{t('personalInfo.firstName')}</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('personalInfo.firstNamePlaceholder')}
                  className="w-full"
                />
              </div>
            </div>
          </form>

          {/* Gender-based Illustration */}
          {gender && (
            <div className="mt-8 flex justify-center animate-in fade-in zoom-in duration-500">
              <img
                src={gender === 'female' ? '/gender_F.png' : '/gender_M.png'}
                alt="Retirement path illustration"
                className="w-full h-auto rounded-lg shadow-xl border border-border/50"
              />
            </div>
          )}

          <div className="flex justify-center mt-8">
            <Button
              data-testid="next-btn"
              type="submit"
              form="personal-info-form"
              size="lg"
              className="px-12 text-lg shadow-lg hover:shadow-xl transition-all"
              disabled={loading}
            >
              {loading ? t('personalInfo.saving') : t('personalInfo.continue')}
            </Button>
          </div>
        </div>
      </div>

      {/* Coming Soon Modal */}
      <AlertDialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('personalInfo.comingSoonTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('personalInfo.comingSoonMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowComingSoonModal(false)}>
              {t('common.close')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PersonalInfo;

