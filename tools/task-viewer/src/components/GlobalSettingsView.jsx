import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

function GlobalSettingsView({ showToast }) {
  const { t } = useLanguage();
  const [claudeFolderPath, setClaudeFolderPath] = useState(
    localStorage.getItem('claudeFolderPath') || ''
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Save to localStorage
    localStorage.setItem('claudeFolderPath', claudeFolderPath);
    
    // Show success toast
    if (showToast) {
      showToast(t('settingsSaved'), 'success');
    }
  };

  return (
    <div className="content-container">
      <div className="settings-panel">
        <h2>{t('globalSettings')}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="claudeFolderPath">{t('claudeFolderPath')}:</label>
            <input
              type="text"
              id="claudeFolderPath"
              value={claudeFolderPath}
              onChange={(e) => setClaudeFolderPath(e.target.value)}
              placeholder={t('claudeFolderPathPlaceholder')}
              title={t('claudeFolderPath')}
            />
            <span className="form-hint">
              {t('claudeFolderPathDesc')}
            </span>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="primary-button">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GlobalSettingsView;