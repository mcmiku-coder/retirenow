import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from '../utils/toast';
import { validatePassword } from '../utils/encryption';
import { Lock, Mail, Eye, EyeOff, Play, X, Server } from 'lucide-react';

// ─── Cold-Start Overlay ─────────────────────────────────────────────────────
// Shown only if the server takes more than 2s to respond (Render free plan).
const COLD_START_SHOW_DELAY = 2000; // ms before overlay appears
const COLD_START_FILL_DURATION = 45; // seconds to fill bar to 95%

const ColdStartOverlay = ({ language }) => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      // Asymptotic fill: reaches 95% around COLD_START_FILL_DURATION seconds
      const p = Math.min(95, (elapsed / COLD_START_FILL_DURATION) * 100);
      setProgress(p);
      if (p < 95) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const msg = language === 'fr'
    ? ['Réveil du serveur en cours…', 'Cela peut prendre jusqu\'à 30 secondes.', 'Merci de patienter, tout se passe bien !']
    : ['Waking up the server…', 'This can take up to 30 seconds.', 'Please wait — everything is fine!'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      animation: 'coldStartFadeIn 0.4s ease'
    }}>
      <style>{`
        @keyframes coldStartFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes serverPulse {
          0%,100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes barShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
      <div style={{
        background: 'linear-gradient(145deg, #0f172a, #1e293b)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 20, padding: '40px 48px',
        maxWidth: 420, width: '90%', textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)'
      }}>
        {/* Pulsing server icon */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
          border: '1px solid rgba(99,102,241,0.4)',
          marginBottom: 24,
          animation: 'serverPulse 1.8s ease-in-out infinite'
        }}>
          <Server size={32} color="#818cf8" />
        </div>

        {/* Messages */}
        <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 8, margin: '0 0 8px' }}>
          {msg[0]}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 6, margin: '0 0 6px' }}>{msg[1]}</p>
        <p style={{ color: '#4ade80', fontSize: 13, fontWeight: 600, marginBottom: 28, margin: '0 0 28px' }}>{msg[2]}</p>

        {/* Progress bar */}
        <div style={{
          background: 'rgba(255,255,255,0.08)', borderRadius: 99,
          height: 10, overflow: 'hidden', position: 'relative'
        }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4, #6366f1)',
            backgroundSize: '200% 100%',
            transition: 'width 0.3s ease',
            animation: 'barShimmer 2s linear infinite'
          }} />
        </div>
        <p style={{ color: '#475569', fontSize: 12, marginTop: 10 }}>
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
};

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
  const [showColdStart, setShowColdStart] = useState(false);
  const coldStartTimerRef = useRef(null);

  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Start / clear the cold-start timer around any auth call
  const startColdStartTimer = () => {
    coldStartTimerRef.current = setTimeout(() => setShowColdStart(true), COLD_START_SHOW_DELAY);
  };
  const clearColdStartTimer = () => {
    clearTimeout(coldStartTimerRef.current);
    setShowColdStart(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    console.log('Register clicked', { email, password });

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setLoading(true);
    startColdStartTimer();
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
      clearColdStartTimer();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    startColdStartTimer();
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const userEmail = response.data.email || email;
      const masterKey = response.data.master_key;

      if (!masterKey) {
        toast.error('Failed to retrieve encryption key. Please try again.');
        return;
      }

      login(userEmail, response.data.token, masterKey);
      navigate('/personal-info');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.loginFailed'));
    } finally {
      setLoading(false);
      clearColdStartTimer();
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center px-4" data-testid="landing-page">
      {/* Cold-start overlay — visible only after 2s of waiting */}
      {showColdStart && <ColdStartOverlay language={language} />}
      {/* VIDEO MODAL OVERLAY */}
      {showVideo && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative w-full max-w-7xl bg-black shadow-2xl overflow-hidden border border-zinc-800 rounded-lg"
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
              className="w-full h-auto block"
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
              src="/landing_quit.jpg"
              alt="Can I quit?"
              className="max-w-lg w-full h-auto"
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
