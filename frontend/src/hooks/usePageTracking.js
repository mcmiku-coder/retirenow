import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trackPageVisit } from '../utils/analytics';

/**
 * Hook to track page visits automatically
 * Place this in components/layouts that should track navigation
 */
export const usePageTracking = () => {
  const location = useLocation();
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      trackPageVisit(location.pathname, token);
    }
  }, [location.pathname, token]);
};

export default usePageTracking;
