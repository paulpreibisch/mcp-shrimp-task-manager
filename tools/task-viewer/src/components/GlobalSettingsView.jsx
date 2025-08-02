import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

function GlobalSettingsView({ showToast }) {
  const { t } = useLanguage();
  const [claudeFolderPath, setClaudeFolderPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [envVarStatus, setEnvVarStatus] = useState({ isSet: false, checking: true });

  // Load settings from server on mount
  useEffect(() => {
    loadGlobalSettings();
    checkEnvVar();
  }, []);

  const checkEnvVar = async () => {
    try {
      const response = await fetch('/api/check-env');
      if (response.ok) {
        const data = await response.json();
        setEnvVarStatus({ isSet: data.isSet, checking: false });
      }
    } catch (err) {
      console.error('Error checking environment variable:', err);
      setEnvVarStatus({ isSet: false, checking: false });
    }
  };

  const loadGlobalSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/global-settings');
      if (response.ok) {
        const settings = await response.json();
        setClaudeFolderPath(settings.claudeFolderPath || '');
      } else {
        console.error('Failed to load global settings');
        if (showToast) {
          showToast('Failed to load settings', 'error');
        }
      }
    } catch (err) {
      console.error('Error loading global settings:', err);
      if (showToast) {
        showToast('Error loading settings', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('/api/global-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claudeFolderPath: claudeFolderPath,
        }),
      });

      if (response.ok) {
        if (showToast) {
          showToast(t('settingsSaved'), 'success');
        }
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving global settings:', err);
      if (showToast) {
        showToast('Error saving settings', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="content-container">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

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
              disabled={saving}
            />
            <span className="form-hint">
              {t('claudeFolderPathDesc')}
            </span>
          </div>

          <div className="form-group">
            <label>OpenAI API Key Environment Variable:</label>
            <div className="env-var-status">
              <code>OPEN_AI_KEY_SHRIMP_TASK_VIEWER</code>
              <span 
                className={`env-status-badge ${envVarStatus.isSet ? 'env-set' : 'env-not-set'}`}
                style={{
                  marginLeft: '10px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: envVarStatus.checking ? '#94a3b8' : (envVarStatus.isSet ? '#22c55e' : '#ef4444'),
                  color: 'white'
                }}
              >
                {envVarStatus.checking ? 'Checking...' : (envVarStatus.isSet ? '✓ Environment variable detected' : '✗ Not set')}
              </span>
            </div>
            {!envVarStatus.isSet && !envVarStatus.checking && (
              <div className="form-hint" style={{ marginTop: '10px' }}>
                <p><strong>To set this environment variable:</strong></p>
                <p>For bash:</p>
                <code style={{ display: 'block', padding: '8px', backgroundColor: '#1e293b', color: '#e2e8f0', borderRadius: '4px', marginBottom: '8px', fontFamily: 'monospace' }}>
                  {`echo 'export OPEN_AI_KEY_SHRIMP_TASK_VIEWER="your-api-key-here"' >> ~/.bashrc && source ~/.bashrc`}
                </code>
                <p>For zsh:</p>
                <code style={{ display: 'block', padding: '8px', backgroundColor: '#1e293b', color: '#e2e8f0', borderRadius: '4px', fontFamily: 'monospace' }}>
                  {`echo 'export OPEN_AI_KEY_SHRIMP_TASK_VIEWER="your-api-key-here"' >> ~/.zshrc && source ~/.zshrc`}
                </code>
                <p style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                  After setting the variable, restart your terminal application completely (not just the server) or run:<br/>
                  <code style={{ backgroundColor: '#334155', padding: '2px 4px', borderRadius: '2px' }}>source ~/.zshrc && npm start</code>
                </p>
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving...' : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GlobalSettingsView;