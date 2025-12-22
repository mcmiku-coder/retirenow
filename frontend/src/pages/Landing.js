import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import axios from 'axios';
import { toast } from 'sonner';
import { validatePassword } from '../utils/encryption';
import { Lock, Mail, Globe, Info } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Landing = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { language, switchLanguage, t } = useLanguage();
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, { email, password });
      // Use local email variable as fallback in case response.data.email is undefined
      const userEmail = response.data.email || email;
      login(userEmail, response.data.token, password);
      toast.success(t('auth.registrationSuccess'));
      navigate('/personal-info');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      // Use local email variable as fallback in case response.data.email is undefined
      const userEmail = response.data.email || email;
      login(userEmail, response.data.token, password);
      toast.success(t('auth.loginSuccess'));
      navigate('/personal-info');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" data-testid="landing-page">
      {/* Language Selector - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-card border rounded-lg p-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <select
            data-testid="language-selector"
            value={language}
            onChange={(e) => switchLanguage(e.target.value)}
            className="bg-transparent border-none text-sm font-medium cursor-pointer focus:outline-none"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </div>

      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6" data-testid="app-title">
            {t('landing.title')}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4" data-testid="tagline">
            {t('landing.subtitle')}
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            {t('landing.description')}
          </p>
        </div>

        {/* Data Privacy Info */}
        <div className="flex justify-center mb-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-primary flex items-center gap-1 cursor-pointer hover:underline">
                  <Info className="h-4 w-4" />
                  {t('dataPrivacy.title')}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm p-4 bg-card border">
                <p className="text-sm font-semibold mb-2 text-black dark:text-white">{t('dataPrivacy.popupTitle')}</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t('dataPrivacy.line1')}</li>
                  <li>• {t('dataPrivacy.line2')}</li>
                  <li>• {t('dataPrivacy.line3')}</li>
                  <li>• {t('dataPrivacy.line4')}</li>
                  <li>• {t('dataPrivacy.line5')}</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          {!showRegister && !showLogin && (
            <>
              <Button
                data-testid="create-account-btn"
                onClick={() => {
                  setShowRegister(true);
                  setShowLogin(false);
                  setEmail('');
                  setPassword('');
                }}
                size="lg"
                className="min-w-[200px]"
              >
                {t('landing.createAccount')}
              </Button>
              <Button
                data-testid="login-btn"
                onClick={() => {
                  setShowLogin(true);
                  setShowRegister(false);
                  setEmail('');
                  setPassword('');
                }}
                variant="outline"
                size="lg"
                className="min-w-[200px]"
              >
                {t('landing.login')}
              </Button>
            </>
          )}
        </div>

        {(showRegister || showLogin) && (
          <div className="max-w-md mx-auto bg-card border rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-6" data-testid="auth-form-title">
              {showRegister ? t('auth.createAccount') : t('auth.login')}
            </h2>
            
            {showRegister && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-md">
                <p className="text-sm text-yellow-200 font-semibold mb-2">⚠️ {t('landing.securityWarning').split(':')[0]}:</p>
                <p className="text-sm text-yellow-100">
                  {t('landing.securityWarning').split(':').slice(1).join(':')}
                </p>
              </div>
            )}

            <form onSubmit={showRegister ? handleRegister : handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="email-input"
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="password-input"
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  data-testid="submit-btn"
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? t('common.loading') : (showRegister ? t('auth.createBtn') : t('auth.loginBtn'))}
                </Button>
                <Button
                  data-testid="cancel-btn"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRegister(false);
                    setShowLogin(false);
                    setEmail('');
                    setPassword('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing;
