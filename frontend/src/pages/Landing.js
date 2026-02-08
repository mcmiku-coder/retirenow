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
import { Lock, Mail, Globe, Eye, EyeOff, Play, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const Landing = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { language, switchLanguage, t } = useLanguage();
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showVideo, setShowVideo] = useState(false); // New State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [registerSuccess, setRegisterSuccess] = useState(false);

  // ... (handlers remain the same) ...

  const handleRegister = async (e) => {
    e.preventDefault();
    console.log('Register clicked', { email, password });

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setLoading(true);
    try {
      // 1. Register with backend
      await axios.post(`${API}/auth/register`, { email, password });

      // 2. Show Success Message
      setRegisterSuccess(true);
      toast.success(t('auth.checkEmail'));

    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || t('auth.registrationFailed'));
      setRegisterSuccess(false);
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
      const masterKey = response.data.master_key; // Get master key from server

      if (!masterKey) {
        toast.error('Failed to retrieve encryption key. Please try again.');
        return;
      }

      login(userEmail, response.data.token, masterKey); // Pass master key instead of password
      navigate('/personal-info');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center px-4" data-testid="landing-page">
      {/* VIDEO MODAL OVERLAY */}
      {showVideo && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative w-full max-w-5xl aspect-video bg-black shadow-2xl overflow-hidden border border-zinc-800"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <video
              src={language === 'fr' ? '/videos/promo_fr.mp4' : '/videos/promo_en.mp4'}
              className="w-full h-full"
              controls
              autoPlay
              onEnded={() => {
                setTimeout(() => setShowVideo(false), 1500);
              }}
            />
          </div>
        </div>
      )}

      {/* Language Selector & Admin Access - Top Right */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
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

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="h-9 w-9 p-0 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all"
          title={language === 'en' ? 'Admin Access' : 'Accès administrateur'}
        >
          <Lock className="h-4 w-4" />
        </Button>
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
            <div className="flex gap-4 justify-center items-center">
              <Link
                to="/information"
                className="text-green-500 hover:underline text-sm"
              >
                {t('landing.learnMore')}
              </Link>

            </div>
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

              <Button
                onClick={() => setShowVideo(true)}
                variant="ghost"
                size="lg"
                className="min-w-[200px] border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
              >
                <Play className="mr-2 h-5 w-5" /> {language === 'fr' ? 'Démo' : 'Demo'}
              </Button>
            </>
          )}
        </div>

        {(showRegister || showLogin) && (
          <div className="max-w-xl mx-auto bg-card border rounded-lg p-8">
            <h2 className="text-3xl font-semibold font-sans mb-6 text-center" data-testid="auth-form-title">
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

            {registerSuccess ? (
              <div className="text-center">
                <div className="mb-4 bg-green-500/10 text-green-500 p-4 rounded-full inline-block">
                  <Mail className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t('auth.registrationSuccess')}</h3>
                <p className="text-muted-foreground mb-6">
                  {t('auth.checkEmail')}
                </p>
                <Button onClick={() => {
                  setRegisterSuccess(false);
                  setShowLogin(true);
                  setShowRegister(false);
                }} className="w-full">
                  {t('auth.loginBtn')}
                </Button>
              </div>
            ) : (
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
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-500 hover:text-blue-400"
                  >
                    {t('auth.forgotPassword') || 'Forgot Password?'}
                  </Link>
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing;
