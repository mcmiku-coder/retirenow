import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';
import { validatePassword } from '../utils/encryption';
import { Lock, Mail, Globe } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
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
    console.log('Register clicked', { email, password });

    const passwordError = validatePassword(password);
    console.log('Password validation result:', passwordError);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setLoading(true);
    console.log('Sending request to:', `${API}/auth/register`);
    try {
      // 1. Register with backend
      const response = await axios.post(`${API}/auth/register`, { email, password });
      console.log('Response:', response);

      const userEmail = response.data.email || email;
      const token = response.data.token;

      // 2. Log in locally (sets context)
      login(userEmail, token, password);

      // 3. Initialize local encrypted storage immediately
      // This verifies that encryption keys can be derived and data can be written
      try {
        // Dynamic import to avoid circular dependencies if any, or just direct import usage
        // But since we are inside formatting, we'll assume the import is added at top
        const { initializeUserDB } = await import('../utils/database');
        await initializeUserDB(userEmail, password);

        navigate('/personal-info');
      } catch (dbError) {
        console.error('Local DB Init Error:', dbError);
        toast.error('Account created, but local storage failed. Please try logging in again.');
        // We still navigate because the account exists, they might just need to retry or check browser settings
        navigate('/personal-info');
      }

    } catch (error) {
      console.error('Registration error:', error);
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
      <div className="absolute top-6 right-6 z-50">
        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800 w-[100px] justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => switchLanguage('en')}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${language === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            EN
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => switchLanguage('fr')}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${language === 'fr' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            FR
          </Button>
        </div>
      </div>

      <div className="max-w-4xl w-full">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-6" data-testid="app-title">
            <img
              src="https://customer-assets.emergentagent.com/job_retire-compass/artifacts/ltntsblz_quit.png"
              alt="Can I quit?"
              className="max-w-md w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>

        {/* Subtitle and Info Link - Only shown when not in auth mode */}
        {!showRegister && !showLogin && (
          <div className="text-center mb-6">
            <p className="text-xl text-muted-foreground mb-4">
              {t('landing.subtitle')}
            </p>
            <Link
              to="/information"
              className="text-green-500 hover:underline text-sm"
            >
              {t('landing.learnMore')}
            </Link>
          </div>
        )}

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
