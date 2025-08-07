import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation, translations } from './translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Get initial language from URL, localStorage or default to 'en'
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Check URL first
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang && ['en', 'zh', 'es'].includes(urlLang)) {
      return urlLang;
    }
    
    // Fall back to localStorage
    const saved = localStorage.getItem('shrimpTaskViewerLanguage');
    return saved || 'en';
  });

  // Save language preference when it changes
  useEffect(() => {
    console.log('Saving language to localStorage:', currentLanguage);
    localStorage.setItem('shrimpTaskViewerLanguage', currentLanguage);
    
    // Update URL when language changes
    const params = new URLSearchParams(window.location.search);
    if (currentLanguage === 'en') {
      params.delete('lang'); // Don't include default language in URL
    } else {
      params.set('lang', currentLanguage);
    }
    
    const hash = window.location.hash || '#projects';
    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${hash}`;
    window.history.replaceState({}, '', newUrl);
  }, [currentLanguage]);

  const t = (key, params) => {
    return getTranslation(currentLanguage, key, params);
  };

  const changeLanguage = (lang) => {
    console.log('changeLanguage called with:', lang);
    console.log('Available translations:', Object.keys(translations));
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