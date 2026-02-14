import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from './components/ui/sonner';
import PageHeader from './components/PageHeader';
import AppHeader from './components/AppHeader';
import Landing from './pages/Landing';
import Information from './pages/Information';
import MonteCarloHelp from './pages/MonteCarloHelp';
import MonteCarloAudit from './pages/MonteCarloAudit';
import MonteCarloDetails from './pages/MonteCarloDetails';
import AdminApp from './pages/admin/AdminApp';
import PersonalInfo from './pages/PersonalInfo';
import RetirementOverview from './pages/RetirementOverview';
import Income from './pages/Income';
import Costs from './pages/Costs';
import RealEstate from './pages/RealEstate';
import VerifyEmail from './pages/VerifyEmail';



import RetirementBenefitsQuestionnaire from './pages/RetirementBenefitsQuestionnaire';
import RetirementBenefitsHelp from './pages/RetirementBenefitsHelp';
import AssetsAndSavings from './pages/AssetsAndSavings';

import DataReview from './pages/DataReview';
import AdjustmentAdvice from './pages/AdjustmentAdvice';
import CapitalManagementSetup from './pages/CapitalManagementSetup';
import ScenarioResult from './pages/ScenarioResult';
import Settings from './pages/Settings';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ExpenseWizard from './pages/ExpenseWizard';
import SecurityDetails from './pages/SecurityDetails';
import TermsOfService from './pages/legal/TermsOfService';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import Disclaimer from './pages/legal/Disclaimer';
import Contact from './pages/legal/Contact';
import DetailedGraph from './pages/DetailedGraph';
import PromoClip from './pages/PromoClip';
import SimulationDataTable from './pages/SimulationDataTable';
import Footer from './components/Footer';

import { trackPageVisit } from './utils/analytics';
import './App.css';

// Page tracking component
const PageTracker = () => {
  const location = useLocation();
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      trackPageVisit(location.pathname, token);
    }
  }, [location.pathname, token]);

  return null;
};

// Global header component that shows on appropriate pages
const GlobalHeader = () => {
  const location = useLocation();
  const hiddenPaths = ['/', '/information', '/security', '/detailed-graph'];

  // Hide on admin routes
  if (hiddenPaths.includes(location.pathname) || location.pathname.startsWith('/admin')) {
    return null;
  }

  return <AppHeader />;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/" />;
};

function AppRoutes() {
  return (
    <>
      <PageTracker />
      <GlobalHeader />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/information" element={<Information />} />
        <Route path="/security" element={<SecurityDetails />} />
        <Route path="/monte-carlo-help" element={<MonteCarloHelp />} />
        <Route path="/monte-carlo-audit" element={<MonteCarloAudit />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/personal-info" element={
          <ProtectedRoute>
            <PersonalInfo />
          </ProtectedRoute>
        } />
        <Route path="/retirement-overview" element={
          <ProtectedRoute>
            <RetirementOverview />
          </ProtectedRoute>
        } />
        <Route path="/income" element={
          <ProtectedRoute>
            <Income />
          </ProtectedRoute>
        } />
        <Route path="/costs" element={
          <ProtectedRoute>
            <Costs />
          </ProtectedRoute>
        } />
        <Route path="/expense-wizard" element={
          <ProtectedRoute>
            <ExpenseWizard />
          </ProtectedRoute>
        } />
        <Route path="/real-estate" element={
          <ProtectedRoute>
            <RealEstate />
          </ProtectedRoute>
        } />
        {/* Current Financial Balance page hidden as requested */}
        {/* <Route path="/financial-balance" element={
          <ProtectedRoute>
            <FinancialBalance />
          </ProtectedRoute>
        } /> */}
        <Route path="/assets-savings" element={
          <ProtectedRoute>
            <AssetsAndSavings />
          </ProtectedRoute>
        } />
        <Route path="/retirement-inputs" element={
          <ProtectedRoute>
            <RetirementBenefitsQuestionnaire />
          </ProtectedRoute>
        } />
        <Route path="/retirement-benefits-help" element={
          <ProtectedRoute>
            <RetirementBenefitsHelp />
          </ProtectedRoute>
        } />

        <Route path="/data-review" element={
          <ProtectedRoute>
            <DataReview />
          </ProtectedRoute>
        } />
        <Route path="/adjustment-advice" element={
          <ProtectedRoute>
            <AdjustmentAdvice />
          </ProtectedRoute>
        } />
        <Route path="/capital-setup" element={
          <ProtectedRoute>
            <CapitalManagementSetup />
          </ProtectedRoute>
        } />
        <Route path="/result" element={
          <ProtectedRoute>
            <ScenarioResult />
          </ProtectedRoute>
        } />
        <Route path="/monte-carlo-details" element={
          <ProtectedRoute>
            <MonteCarloDetails />
          </ProtectedRoute>
        } />
        <Route path="/detailed-graph" element={
          <ProtectedRoute>
            <DetailedGraph />
          </ProtectedRoute>
        } />
        <Route path="/simulation-data" element={
          <ProtectedRoute>
            <SimulationDataTable />
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/contact" element={<Contact />} />

      </Routes>
      <Footer />
    </>
  );
}

// Helper component to handle theme scoping
const ThemeScope = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className={`App dark min-h-screen flex flex-col bg-background text-foreground ${!isAdmin ? 'public-theme' : ''}`}>
      {children}
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <ThemeScope>
              <AppRoutes />
              <Toaster position="top-center" />
            </ThemeScope>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
// Force re-compile to clear HMR error
