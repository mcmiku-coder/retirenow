import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

export const NavigationButtons = ({ backPath, showHome = true }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  return (
    <div className="flex gap-2">
      {backPath && (
        <Button
          data-testid="back-btn"
          onClick={() => navigate(backPath)}
          variant="outline"
          size="icon"
          title={t('nav.back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      {showHome && (
        <Button
          data-testid="home-btn"
          onClick={() => navigate('/')}
          variant="outline"
          size="icon"
          title={t('nav.home')}
        >
          <Home className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
