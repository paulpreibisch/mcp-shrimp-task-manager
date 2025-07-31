import { zhDocumentation } from './zh.js';
import { esDocumentation } from './es.js';

// English documentation will be loaded dynamically from the actual files
const enDocumentation = {
  releaseNotes: {
    header: '📋 Release Notes',
    versions: 'Versions',
    loading: 'Loading release notes...',
    notFound: 'Release notes not found.',
    error: 'Error loading release notes.',
    copy: 'Copy',
    copied: 'Copied!'
  },
  help: {
    header: 'ℹ️ Help & Documentation',
    loading: 'Loading documentation...',
    notFound: 'README not found.',
    error: 'Error loading README.',
    copy: 'Copy',
    copied: 'Copied!'
  }
};

export const documentation = {
  en: enDocumentation,
  zh: zhDocumentation,
  es: esDocumentation
};

export const getUIStrings = (component, language = 'en') => {
  return documentation[language]?.[component] || documentation.en[component];
};

export const getReleaseContent = (version, language = 'en') => {
  if (language === 'en') {
    // English content is loaded dynamically from markdown files
    return null;
  }
  return documentation[language]?.releases?.[version] || null;
};

export const getReadmeContent = (language = 'en') => {
  if (language === 'en') {
    // English content is loaded dynamically from README.md
    return null;
  }
  return documentation[language]?.readme || null;
};