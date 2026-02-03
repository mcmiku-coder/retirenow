import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Initialize from localStorage or default to French
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app_language') || 'fr';
    }
    return 'fr';
  });

  const [overrides, setOverrides] = useState({});

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  // Get translation function
  const t = (path) => {
    // 1. Check for overrides (Language specific)
    if (overrides[language] && overrides[language][path]) {
      return overrides[language][path];
    }
    // 2. Check for overrides (Global - legacy)
    if (overrides[path]) {
      return overrides[path];
    }

    // 3. Standard Translation Lookup
    const keys = path.split('.');
    let value = translations[language];

    for (const key of keys) {
      if (value && value[key] !== undefined) {
        value = value[key];
      } else {
        // Fallback to English if translation not found
        value = translations['en'];
        for (const k of keys) {
          if (value && value[k] !== undefined) {
            value = value[k];
          } else {
            return path; // Return the path if not found
          }
        }
        break;
      }
    }

    return value;
  };

  const switchLanguage = (lang) => {
    if (lang === 'en' || lang === 'fr') {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t, setOverrides }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
