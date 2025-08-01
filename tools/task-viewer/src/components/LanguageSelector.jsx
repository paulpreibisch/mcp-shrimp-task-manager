import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

function LanguageSelector() {
  const { currentLanguage, changeLanguage, availableLanguages, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);

  // Debug logging
  console.log('Available languages:', availableLanguages);
  console.log('Current language:', currentLanguage);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="language-selector" ref={dropdownRef}>
      <button 
        className="language-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        title={t('language')}
      >
        <span className="language-flag">{currentLang?.flag}</span>
        <span className="language-name">{currentLang?.name}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="language-dropdown">
          {availableLanguages.map(lang => {
            console.log('Rendering language option:', lang);
            return (
              <button
                key={lang.code}
                className={`language-option ${lang.code === currentLanguage ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Clicked language:', lang.code);
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
              >
                <span className="language-flag">{lang.flag}</span>
                <span className="language-name">{lang.name}</span>
                {lang.code === currentLanguage && <span className="checkmark">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;