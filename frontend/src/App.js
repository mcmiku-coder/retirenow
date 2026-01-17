import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Toaster } from './components/ui/sonner';
import PageHeader from './components/PageHeader';
import Landing from './pages/Landing';
import Information from './pages/Information';
import Admin from './pages/Admin';
import PersonalInfo from './pages/PersonalInfo';
import RetirementOverview from './pages/RetirementOverview';
import Income from './pages/Income';
import Costs from './pages/Costs';

// RetirementInputs page removed - data now collected in RetirementParameters
import AssetsAndSavings from './pages/AssetsAndSavings';
import RetirementParameters from './pages/RetirementParameters';
import DataReview from './pages/DataReview';
import CapitalManagementSetup from './pages/CapitalManagementSetup';
import ScenarioResult from './pages/ScenarioResult';

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
  const hiddenPaths = ['/', '/admin', '/information'];

  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  return <PageHeader showLanguageSelector={true} />;
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
        <Route path="/admin" element={<Admin />} />
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
        <Route path="/retirement-parameters" element={
          <ProtectedRoute>
            <RetirementParameters />
          </ProtectedRoute>
        } />
        <Route path="/data-review" element={
          <ProtectedRoute>
            <DataReview />
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
      </Routes>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App dark min-h-screen bg-background text-foreground">
            <AppRoutes />
            <Toaster position="top-center" />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
