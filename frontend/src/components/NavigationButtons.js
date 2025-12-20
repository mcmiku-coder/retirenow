import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

export const NavigationButtons = ({ backPath, showHome = true }) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex gap-2">
      {backPath && (
        <Button
          data-testid="back-btn"
          onClick={() => navigate(backPath)}
          variant="outline"
          size="icon"
          title="Go back"
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
          title="Go to start"
        >
          <Home className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
