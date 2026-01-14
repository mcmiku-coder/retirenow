import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { saveUserData, getUserData } from '../utils/database';
import { Trash2, Plus, HelpCircle } from 'lucide-react';
import WorkflowNavigation from '../components/WorkflowNavigation';

const PersonalInfo = () => {
  const navigate = useNavigate();
  const { user, password } = useAuth();
  const { t } = useLanguage();
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [residence, setResidence] = useState('');
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
    if (!password) {
      console.warn('Password not available - session may have been refreshed. Redirecting to login.');
      navigate('/');
      return;
    }

    // Load existing data if any
    const loadData = async () => {
      setDataLoading(true);
      try {
        // Only try to load if we have valid email and password
        if (userEmail && password) {
          const data = await getUserData(userEmail, password);
          if (data) {
            setBirthDate(data.birthDate || '');
            setGender(data.gender || '');
            setResidence(data.residence || '');
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
  }, [user, userEmail, password, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!birthDate || !gender || !residence) {
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

    if (!password) {
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
        residence
      };

      console.log('Saving user data for:', userEmail);
      await saveUserData(userEmail, password, userData);
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
    <div className="min-h-screen py-12 px-4" data-testid="personal-info-page">
      <div className="max-w-6xl mx-auto">
        <WorkflowNavigation />

        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">{t('personalInfo.title')}</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              {t('personalInfo.subtitle')}
            </p>
          </div>

          <form id="personal-info-form" onSubmit={handleSubmit} className="bg-card border rounded-lg p-8 space-y-6">
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
                  className="pl-10"
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
              <Label htmlFor="residence">{t('personalInfo.country')}</Label>
              <Select value={residence} onValueChange={setResidence} required>
                <SelectTrigger data-testid="residence-select">
                  <SelectValue placeholder={t('personalInfo.country')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Switzerland" data-testid="residence-switzerland">{t('personalInfo.switzerland')}</SelectItem>
                  <SelectItem value="France" data-testid="residence-france">{t('personalInfo.france')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>

          <div className="flex justify-center mt-6">
            <Button
              data-testid="next-btn"
              type="submit"
              form="personal-info-form"
              size="lg"
              className="px-12 text-lg"
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

