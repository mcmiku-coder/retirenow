import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';
import { validatePassword } from '../utils/encryption';
import { Lock, Mail } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Landing = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
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
      login(response.data.email, response.data.token, password);
      toast.success('Account created successfully!');
      navigate('/personal-info');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      login(response.data.email, response.data.token, password);
      toast.success('Welcome back!');
      navigate('/personal-info');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" data-testid="landing-page">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6" data-testid="app-title">
            quit?
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="tagline">
            this app will help you see if you can go to work tomorrow and tell your boss: <span className="font-semibold">hasta luego patron!</span>
          </p>
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
                Create Account
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
                Login
              </Button>
            </>
          )}
        </div>

        {(showRegister || showLogin) && (
          <div className="max-w-md mx-auto bg-card border rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-6" data-testid="auth-form-title">
              {showRegister ? 'Create Account' : 'Login'}
            </h2>
            
            {showRegister && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-md">
                <p className="text-sm text-yellow-200 font-semibold mb-2">Important Security Notice:</p>
                <p className="text-sm text-yellow-100">
                  Your password is your ONLY key to your data. If you lose it, your financial data cannot be recovered by anyone, including administrators.
                </p>
              </div>
            )}

            <form onSubmit={showRegister ? handleRegister : handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="email-input"
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="password-input"
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={showRegister ? "Min 12 chars, mixed case, number" : "Enter your password"}
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
                  {loading ? 'Processing...' : (showRegister ? 'Register' : 'Login')}
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
                  Cancel
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
