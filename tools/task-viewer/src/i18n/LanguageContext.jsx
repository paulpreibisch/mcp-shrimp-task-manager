import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation } from './translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Get initial language from localStorage or default to 'en'
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const saved = localStorage.getItem('shrimpTaskViewerLanguage');
    return saved || 'en';
  });

  // Save language preference when it changes
  useEffect(() => {
    localStorage.setItem('shrimpTaskViewerLanguage', currentLanguage);
  }, [currentLanguage]);

  const t = (key, params) => {
    return getTranslation(currentLanguage, key, params);
  };

  const changeLanguage = (lang) => {
    setCurrentLanguage(lang);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    availableLanguages: [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'zh', name: '中文', flag: '🇨🇳' },
      { code: 'es', name: 'Español', flag: '🇪🇸' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};