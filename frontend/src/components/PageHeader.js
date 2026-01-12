import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { LogOut, Globe } from 'lucide-react';

const PageHeader = ({ showLanguageSelector = false }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, switchLanguage } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {showLanguageSelector && (
        <select
          value={language}
          onChange={(e) => switchLanguage(e.target.value)}
          className="bg-muted border rounded-md px-2 py-1 text-sm outline-none"
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      )}
      {user && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          {language === 'fr' ? 'Déconnexion' : 'Logout'}
        </Button>
      )}
    </div>
  );
};

export default PageHeader;
