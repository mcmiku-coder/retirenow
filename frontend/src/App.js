import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import Landing from './pages/Landing';
import PersonalInfo from './pages/PersonalInfo';
import RetirementOverview from './pages/RetirementOverview';
import Income from './pages/Income';
import Costs from './pages/Costs';
import FinancialBalance from './pages/FinancialBalance';
import Scenario from './pages/Scenario';
import ScenarioResult from './pages/ScenarioResult';
import './App.css';

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
    <Routes>
      <Route path="/" element={<Landing />} />
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
      <Route path="/financial-balance" element={
        <ProtectedRoute>
          <FinancialBalance />
        </ProtectedRoute>
      } />
      <Route path="/scenario" element={
        <ProtectedRoute>
          <Scenario />
        </ProtectedRoute>
      } />
      <Route path="/result" element={
        <ProtectedRoute>
          <ScenarioResult />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App dark min-h-screen bg-background text-foreground">
          <AppRoutes />
          <Toaster position="top-center" />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
