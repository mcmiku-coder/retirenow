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
import { Trash2, Plus, HelpCircle, User, Calendar, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const PersonalInfo = () => {
  const navigate = useNavigate();
  const { user, masterKey } = useAuth();
  const { t, language } = useLanguage();
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthDate2, setBirthDate2] = useState('');
  const [gender2, setGender2] = useState('');
  const [firstName2, setFirstName2] = useState('');
  const [analysisType, setAnalysisType] = useState('individual'); // 'individual' or 'couple'
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
            setBirthDate2(data.birthDate2 || '');
            setGender2(data.gender2 || '');
            setFirstName2(data.firstName2 || '');
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

    if (analysisType === 'couple' && (!birthDate2 || !gender2)) {
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
        birthDate2,
        gender2,
        firstName2,
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
        <div className="max-w-[900px] mx-auto">

          {/* Analysis Type Selection — outside the box */}
          <div className="mb-4 flex items-center gap-4">
            <span className="text-sm font-semibold text-foreground">{t('personalInfo.analysisType')}</span>
            <RadioGroup
              value={analysisType}
              onValueChange={setAnalysisType}
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

          <form id="personal-info-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Person 1 Card */}
            <div className="space-y-3">
              {analysisType === 'couple' && (
                <div className="flex items-center gap-2 px-1">
                  <div className="h-4 w-1 bg-primary rounded-full" />
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {firstName || (language === 'fr' ? 'Personne 1' : 'Person 1')}
                  </span>
                </div>
              )}
              <div className="bg-card border rounded-xl overflow-hidden flex items-stretch">
                {/* Fields — left */}
                <div className="flex-1 flex items-center divide-x divide-border">
                  {/* First Name */}
                  <div className="flex-1 px-6 py-5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <Label htmlFor="firstName" className="cursor-pointer">{t('personalInfo.firstName')}</Label>
                    </div>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t('personalInfo.firstNamePlaceholder')}
                      className="border-0 bg-transparent p-0 h-8 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{language === 'fr' ? 'Utilisé dans toutes les simulations' : 'Used across all simulations'}</p>
                  </div>

                  {/* Date of Birth */}
                  <div className="flex-1 px-6 py-5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <Label htmlFor="birthDate" className="cursor-pointer">{t('personalInfo.birthDate')}</Label>
                    </div>
                    <Input
                      data-testid="birth-date-input"
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      required
                      className="border-0 bg-transparent p-0 h-8 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{language === 'fr' ? 'Calcul de votre date de retraite' : 'Used to calculate retirement date'}</p>
                  </div>

                  {/* Gender */}
                  <div className="flex-1 px-6 py-5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <Label htmlFor="gender" className="cursor-pointer">{t('personalInfo.gender')}</Label>
                    </div>
                    <Select value={gender} onValueChange={setGender} required>
                      <SelectTrigger data-testid="gender-select" className="border-0 bg-transparent p-0 h-8 text-base font-bold focus:ring-0 shadow-none">
                        <SelectValue placeholder={t('personalInfo.gender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male" data-testid="gender-male">{t('personalInfo.male')}</SelectItem>
                        <SelectItem value="female" data-testid="gender-female">{t('personalInfo.female')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">{language === 'fr' ? 'Pour les statistiques longévité' : 'For life expectancy statistics'}</p>
                  </div>
                </div>

                {/* Avatar panel — right */}
                <div className="w-[100px] shrink-0 bg-muted/30 flex items-center justify-center border-l border-border">
                  {gender && birthDate ? (() => {
                    const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
                    const bracket = age < 50 ? '40' : age <= 60 ? '50' : '60';
                    const gCode = gender === 'female' ? 'F' : 'M';
                    const color = 'blue';
                    return (
                      <div className="w-[100px] h-[100px] overflow-hidden">
                        <img
                          key={`${gCode}_${bracket}_${color}`}
                          src={`/avatar_${gCode}_${bracket}_${color}.png`}
                          alt="avatar"
                          className="w-[calc(100%+20px)] h-[calc(100%+20px)] -ml-[10px] -mt-[10px] object-cover animate-in fade-in zoom-in duration-300"
                        />
                      </div>
                    );
                  })() : (
                    <div className="w-12 h-12 rounded-full bg-muted border-2 border-dashed border-border/60 opacity-40" />
                  )}
                </div>
              </div>
            </div>

            {/* Person 2 Card (Conditional) */}
            {analysisType === 'couple' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-4 w-1 bg-primary rounded-full" />
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2')}
                  </span>
                </div>
                <div className="bg-card border rounded-xl overflow-hidden flex items-stretch">
                  {/* Fields — left */}
                  <div className="flex-1 flex items-center divide-x divide-border">
                    {/* First Name */}
                    <div className="flex-1 px-6 py-5">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <Label htmlFor="firstName2" className="cursor-pointer">{t('personalInfo.firstName')}</Label>
                      </div>
                      <Input
                        id="firstName2"
                        value={firstName2}
                        onChange={(e) => setFirstName2(e.target.value)}
                        placeholder={t('personalInfo.firstNamePlaceholder')}
                        className="border-0 bg-transparent p-0 h-8 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{language === 'fr' ? 'Utilisé dans toutes les simulations' : 'Used across all simulations'}</p>
                    </div>

                    {/* Date of Birth */}
                    <div className="flex-1 px-6 py-5">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <Label htmlFor="birthDate2" className="cursor-pointer">{t('personalInfo.birthDate')}</Label>
                      </div>
                      <Input
                        id="birthDate2"
                        type="date"
                        value={birthDate2}
                        onChange={(e) => setBirthDate2(e.target.value)}
                        required
                        className="border-0 bg-transparent p-0 h-8 text-base font-bold focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{language === 'fr' ? 'Calcul de votre date de retraite' : 'Used to calculate retirement date'}</p>
                    </div>

                    {/* Gender */}
                    <div className="flex-1 px-6 py-5">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <Label htmlFor="gender2" className="cursor-pointer">{t('personalInfo.gender')}</Label>
                      </div>
                      <Select value={gender2} onValueChange={setGender2} required={analysisType === 'couple'}>
                        <SelectTrigger className="border-0 bg-transparent p-0 h-8 text-base font-bold focus:ring-0 shadow-none">
                          <SelectValue placeholder={t('personalInfo.gender')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{t('personalInfo.male')}</SelectItem>
                          <SelectItem value="female">{t('personalInfo.female')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">{language === 'fr' ? 'Pour les statistiques longévité' : 'For life expectancy statistics'}</p>
                    </div>
                  </div>

                  {/* Avatar panel — right */}
                  <div className="w-[100px] shrink-0 bg-muted/30 flex items-center justify-center border-l border-border">
                    {gender2 && birthDate2 ? (() => {
                      const age = new Date().getFullYear() - new Date(birthDate2).getFullYear();
                      const bracket = age < 50 ? '40' : age <= 60 ? '50' : '60';
                      const gCode = gender2 === 'female' ? 'F' : 'M';
                      const color = 'blue';
                      return (
                        <div className="w-[100px] h-[100px] overflow-hidden">
                          <img
                            key={`${gCode}_${bracket}_${color}_2`}
                            src={`/avatar_${gCode}_${bracket}_${color}.png`}
                            alt="avatar"
                            className="w-[calc(100%+20px)] h-[calc(100%+20px)] -ml-[10px] -mt-[10px] object-cover animate-in fade-in zoom-in duration-300"
                          />
                        </div>
                      );
                    })() : (
                      <div className="w-12 h-12 rounded-full bg-muted border-2 border-dashed border-border/60 opacity-40" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>


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


    </div>
  );
};

export default PersonalInfo;

