import React, { useState, useEffect, useMemo } from 'react';
import TaskTable from './components/TaskTable';
import ReleaseNotes from './components/ReleaseNotes';
import Help from './components/Help';
import TemplateManagement from './components/TemplateManagement';
import TemplateEditor from './components/TemplateEditor';
import TemplatePreview from './components/TemplatePreview';
import ActivationDialog from './components/ActivationDialog';
import DuplicateTemplateView from './components/DuplicateTemplateView';
import HistoryView from './components/HistoryView';
import HistoryTasksView from './components/HistoryTasksView';
import ToastContainer from './components/ToastContainer';
import LanguageSelector from './components/LanguageSelector';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';

function AppContent() {
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [draggedTabIndex, setDraggedTabIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [projectRoot, setProjectRoot] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isInDetailView, setIsInDetailView] = useState(false);
  const [forceResetDetailView, setForceResetDetailView] = useState(0);
  
  // Outer tab state (new)
  const [selectedOuterTab, setSelectedOuterTab] = useState('projects'); // 'projects', 'release-notes', 'readme', 'templates'
  
  // Template management states
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState('');
  const [templateView, setTemplateView] = useState('list'); // 'list', 'edit', 'preview', or 'duplicate'
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewingTemplate, setPreviewingTemplate] = useState(null);
  const [templateEditorLoading, setTemplateEditorLoading] = useState(false);
  const [activatingTemplate, setActivatingTemplate] = useState(false);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [templateToActivate, setTemplateToActivate] = useState(null);
  const [duplicatingTemplate, setDuplicatingTemplate] = useState(null);
  
  // History management states
  const [historyView, setHistoryView] = useState(''); // 'list' or 'details' or '' for normal view
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);
  const [selectedHistoryTasks, setSelectedHistoryTasks] = useState([]);
  
  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Toast helper functions
  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Auto-refresh interval
  useEffect(() => {
    let interval;
    if (autoRefresh && selectedProfile) {
      interval = setInterval(() => {
        console.log(`Auto-refreshing tasks every ${refreshInterval}s...`);
        loadTasks(selectedProfile);
      }, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedProfile, refreshInterval]);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  // Save selected profile and outer tab to localStorage when they change
  useEffect(() => {
    if (selectedProfile) {
      localStorage.setItem('selectedProfile', selectedProfile);
    }
    localStorage.setItem('selectedOuterTab', selectedOuterTab);
  }, [selectedProfile, selectedOuterTab]);

  const loadProfiles = async () => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to load profiles');
      const data = await response.json();
      setProfiles(data);
      
      // On initial load, restore saved state
      if (!selectedProfile && data.length > 0) {
        // Restore the last selected outer tab
        const savedOuterTab = localStorage.getItem('selectedOuterTab');
        if (savedOuterTab && ['projects', 'release-notes', 'readme', 'templates'].includes(savedOuterTab)) {
          setSelectedOuterTab(savedOuterTab);
          
          // If projects tab is selected, restore the last selected profile
          if (savedOuterTab === 'projects') {
            const savedProfile = localStorage.getItem('selectedProfile');
            if (savedProfile && data.some(p => p.id === savedProfile)) {
              handleProfileChange(savedProfile);
            } else {
              handleProfileChange(data[0].id);
            }
          } else if (savedOuterTab === 'templates') {
            loadTemplates();
          }
        } else {
          // Default to projects tab and first profile
          setSelectedOuterTab('projects');
          handleProfileChange(data[0].id);
        }
      }
    } catch (err) {
      setError('Failed to load profiles: ' + err.message);
    }
  };

  const loadTasks = async (profileId) => {
    if (!profileId) {
      setTasks([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/tasks/${profileId}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to load tasks: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received tasks data:', data.tasks?.length, 'tasks');
      const task880f = data.tasks?.find(t => t.id === '880f4dd8-a603-4bb9-8d4d-5033887d0e0f');
      if (task880f) {
        console.log('Task 880f4dd8 status from API:', task880f.status);
      }
      setTasks(data.tasks || []);
      setProjectRoot(data.projectRoot || null);
    } catch (err) {
      setError('❌ Error loading tasks: ' + err.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (profileId) => {
    console.log('handleProfileChange:', profileId, 'selectedProfile:', selectedProfile, 'isInDetailView:', isInDetailView);
    // If clicking the same tab and we're in detail view, just refresh to go back to list
    if (profileId === selectedProfile && isInDetailView) {
      console.log('Resetting detail view...');
      // Force reset the detail view
      setForceResetDetailView(prev => {
        console.log('Setting forceResetDetailView from', prev, 'to', prev + 1);
        return prev + 1;
      });
      setIsInDetailView(false);
      return;
    }
    
    // Reset history view when switching profiles
    if (historyView) {
      setHistoryView('');
      setHistoryData([]);
      setSelectedHistoryEntry(null);
      setSelectedHistoryTasks([]);
    }
    
    setSelectedProfile(profileId);
    setGlobalFilter(''); // Clear search when switching profiles
    loadTasks(profileId);
  };
  
  const handleOuterTabChange = (tab) => {
    setSelectedOuterTab(tab);
    
    // Reset states when switching outer tabs
    if (tab === 'templates') {
      loadTemplates();
      setTemplateView('list');
      setEditingTemplate(null);
    } else if (tab === 'projects' && profiles.length > 0) {
      // Reset history state when switching back to projects
      setHistoryView('');
      setHistoryData([]);
      setSelectedHistoryEntry(null);
      setSelectedHistoryTasks([]);
      
      // When switching back to projects, ensure a profile is selected
      if (!selectedProfile || selectedProfile === 'release-notes' || selectedProfile === 'help' || selectedProfile === 'templates') {
        const savedProfile = localStorage.getItem('selectedProfile');
        if (savedProfile && profiles.some(p => p.id === savedProfile)) {
          handleProfileChange(savedProfile);
        } else {
          handleProfileChange(profiles[0].id);
        }
      }
    }
  };

  const handleAddProfile = async (name, file, projectRoot, filePath) => {
    try {
      let body;
      
      if (filePath) {
        // Direct file path method
        body = JSON.stringify({ 
          name, 
          filePath,
          projectRoot: projectRoot || null
        });
      } else {
        // File upload method
        const taskFileContent = await file.text();
        body = JSON.stringify({ 
          name, 
          taskFile: taskFileContent,
          projectRoot: projectRoot || null
        });
      }

      const response = await fetch('/api/add-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body
      });

      if (!response.ok) {
        throw new Error('Failed to add profile');
      }

      const newProfile = await response.json();
      console.log('New profile created:', newProfile);
      
      // Show success toast
      showToast(t('profileAddedSuccess', { name }), 'success');
      
      setShowAddProfile(false);
      
      // Load profiles first, then select the new one
      await loadProfiles();
      
      // Use setTimeout to ensure state updates have propagated
      setTimeout(() => {
        if (newProfile && newProfile.id) {
          console.log('Auto-selecting profile:', newProfile.id);
          setSelectedProfile(newProfile.id);
          setGlobalFilter(''); // Clear search when switching profiles
          loadTasks(newProfile.id);
        }
      }, 100);
    } catch (err) {
      const errorMessage = 'Failed to add profile: ' + err.message;
      setError(errorMessage);
      showToast(errorMessage, 'error', 5000);
    }
  };

  const handleRemoveProfile = async (profileId) => {
    if (!confirm(t('confirmRemoveProfile'))) {
      return;
    }
    
    try {
      const response = await fetch(`/api/remove-profile/${profileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove profile');
      }

      // Find profile name for toast
      const profile = profiles.find(p => p.id === profileId);
      const profileName = profile ? profile.name : profileId;
      
      // Show success toast
      showToast(t('profileRemovedSuccess', { name: profileName }), 'success');
      
      // If we're removing the currently selected profile, clear selection
      if (selectedProfile === profileId) {
        setSelectedProfile('');
        setTasks([]);
      }

      await loadProfiles();
    } catch (err) {
      const errorMessage = 'Failed to remove profile: ' + err.message;
      setError(errorMessage);
      showToast(errorMessage, 'error', 5000);
    }
  };

  const handleUpdateProfile = async (profileId, updates) => {
    try {
      const response = await fetch(`/api/update-profile/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }

      const updatedProfile = await response.json();
      
      // Update profiles in state
      setProfiles(prev => prev.map(p => 
        p.id === profileId ? { ...p, ...updatedProfile } : p
      ));

      // Update projectRoot if it was changed
      if (updates.projectRoot !== undefined) {
        setProjectRoot(updates.projectRoot);
      }

      setShowEditProfile(false);
      setEditingProfile(null);

      // Reload tasks to reflect any changes (especially if task path was changed)
      loadTasks(profileId);
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
    }
  };

  // Template management functions
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError('');
    
    try {
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.status}`);
      }
      
      const data = await response.json();
      // Transform data to match TemplateManagement component expectations
      const templatesData = data.map(template => ({
        functionName: template.name,
        description: `${template.status} template from ${template.source}`,
        status: template.status,
        source: template.source,
        contentLength: template.contentLength,
        category: 'Task Management'
      }));
      
      setTemplates(templatesData);
    } catch (err) {
      setTemplatesError('❌ Error loading templates: ' + err.message);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleEditTemplate = async (template) => {
    if (!template) {
      setTemplatesError('No template provided for editing');
      return;
    }
    
    const functionName = template.functionName || template.name;
    if (!functionName) {
      setTemplatesError('Template is missing functionName');
      return;
    }
    
    try {
      setTemplateEditorLoading(true);
      const response = await fetch(`/api/templates/${functionName}`);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      
      const templateData = await response.json();
      setEditingTemplate({
        ...templateData,
        functionName
      });
      setTemplateView('edit');
    } catch (err) {
      setTemplatesError('Failed to load template for editing: ' + err.message);
      showToast('Failed to load template for editing', 'error');
    } finally {
      setTemplateEditorLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      setTemplateEditorLoading(true);
      setTemplatesError(''); // Clear any previous errors
      
      const response = await fetch(`/api/templates/${templateData.functionName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: templateData.content,
          mode: templateData.mode 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save template: ${response.status}`);
      }
      
      // Show success toast
      showToast(t('templateSavedSuccess', { name: templateData.functionName }), 'success');
      
      // Go back to list and reload templates
      setTemplateView('list');
      setEditingTemplate(null);
      loadTemplates();
    } catch (err) {
      const errorMessage = 'Failed to save template: ' + err.message;
      setTemplatesError(errorMessage);
      showToast(errorMessage, 'error', 5000);
    } finally {
      setTemplateEditorLoading(false);
    }
  };

  const handleCancelTemplateEdit = () => {
    setTemplateView('list');
    setEditingTemplate(null);
  };

  const handleResetTemplate = async (template) => {
    const functionName = template.functionName;
    if (!confirm(t('confirmResetTemplate', { name: functionName }))) {
      return;
    }
    
    try {
      const response = await fetch(`/api/templates/${functionName}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reset template: ${response.status}`);
      }
      
      // Show success toast
      showToast(t('templateResetSuccess', { name: functionName }), 'success');
      
      // Reload templates to reflect changes
      loadTemplates();
    } catch (err) {
      const errorMessage = 'Failed to reset template: ' + err.message;
      setTemplatesError(errorMessage);
      showToast(errorMessage, 'error', 5000);
    }
  };

  const handleDuplicateTemplate = async (template) => {
    setDuplicatingTemplate(template);
    setTemplateView('duplicate');
  };

  const confirmDuplicateTemplate = async (newName) => {
    if (!duplicatingTemplate) return;
    
    const functionName = duplicatingTemplate.functionName;
    
    try {
      const response = await fetch(`/api/templates/${functionName}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to duplicate template: ${response.status}`);
      }
      
      // Show success toast
      showToast(t('templateDuplicatedSuccess', { name: newName }), 'success');
      
      // Return to template list
      setTemplateView('list');
      setDuplicatingTemplate(null);
      
      // Reload templates to reflect changes
      loadTemplates();
    } catch (err) {
      const errorMessage = 'Failed to duplicate template: ' + err.message;
      setTemplatesError(errorMessage);
      showToast(errorMessage, 'error', 5000);
      throw err; // Re-throw to handle in the view
    }
  };

  const handlePreviewTemplate = async (template) => {
    const functionName = template.functionName;
    try {
      const response = await fetch(`/api/templates/${functionName}`);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      
      const templateData = await response.json();
      // Ensure functionName is preserved in the previewing template
      setPreviewingTemplate({
        ...templateData,
        functionName: functionName,
        status: template.status // Also preserve status
      });
      setTemplateView('preview');
      setTemplatesError('');
    } catch (err) {
      setTemplatesError('Failed to load template for preview: ' + err.message);
      showToast('Failed to load template for preview', 'error');
    }
  };

  const handleActivateTemplate = async (template) => {
    // Ensure we have the full template data
    if (!template.content && template.functionName) {
      // Fetch the full template if we only have basic info
      try {
        const response = await fetch(`/api/templates/${template.functionName}`);
        if (response.ok) {
          const fullTemplate = await response.json();
          setTemplateToActivate(fullTemplate);
          setShowActivationDialog(true);
        } else {
          showToast('Failed to load template for activation', 'error');
        }
      } catch (err) {
        showToast('Error loading template: ' + err.message, 'error');
      }
    } else {
      // Show the activation dialog with the template we have
      setTemplateToActivate(template);
      setShowActivationDialog(true);
    }
  };


  // History management functions
  const loadHistory = async (profileId) => {
    if (!profileId) {
      setHistoryData([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError('');

    try {
      const response = await fetch(`/api/history/${profileId}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to load history: ${response.status}`);
      }
      
      const data = await response.json();
      setHistoryData(data.history || []);
    } catch (err) {
      setHistoryError('❌ Error loading history: ' + err.message);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadHistoryTasks = async (historyEntry) => {
    if (!selectedProfile || !historyEntry) return;
    
    setHistoryLoading(true);
    setHistoryError('');

    try {
      const response = await fetch(`/api/history/${selectedProfile}/${historyEntry.filename}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to load history tasks: ${response.status}`);
      }
      
      const data = await response.json();
      setSelectedHistoryTasks(data.tasks || []);
      setSelectedHistoryEntry(historyEntry);
      setHistoryView('details');
    } catch (err) {
      setHistoryError('❌ Error loading history tasks: ' + err.message);
      setSelectedHistoryTasks([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Drag and drop handlers for tab reordering
  const handleDragStart = (e, index) => {
    setDraggedTabIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ''); // Required for Firefox compatibility
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); // Required to allow drop
    setDragOverIndex(index); // Visual feedback for drop target
  };

  const handleDragEnd = () => {
    // Clean up drag state regardless of drop success
    setDraggedTabIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    // Ignore invalid drops (same position or invalid state)
    if (draggedTabIndex === null || draggedTabIndex === dropIndex) {
      return;
    }

    // Reorder profiles array using splice operations
    const newProfiles = [...profiles];
    const draggedProfile = newProfiles[draggedTabIndex];
    
    // Remove dragged item from original position
    newProfiles.splice(draggedTabIndex, 1);
    // Insert at new position
    newProfiles.splice(dropIndex, 0, draggedProfile);
    
    // Update state and clear drag indicators
    setProfiles(newProfiles);
    setDraggedTabIndex(null);
    setDragOverIndex(null);
  };

  // Memoized task statistics to avoid recalculation on every render
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    
    return { total, completed, inProgress, pending };
  }, [tasks]);

  return (
    <div className="app">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {showActivationDialog && (
        <ActivationDialog 
          template={templateToActivate}
          onClose={() => {
            setShowActivationDialog(false);
            setTemplateToActivate(null);
            showToast(t('rememberToRestartClaude'), 'info', 5000);
          }}
        />
      )}
      
      <header className="header">
        <h1>{t('appTitle')}</h1>
        <div className="header-content">
          <div className="version-info">
            <span>{t('version')} 2.1.0</span> • 
            <a href="#" onClick={(e) => {
              e.preventDefault();
              handleOuterTabChange('release-notes');
            }}>
              {t('releaseNotes')}
            </a> • 
            <a href="#" onClick={(e) => {
              e.preventDefault();
              handleOuterTabChange('readme');
            }}>
              {t('help')}
            </a> • 
            <a href="#" onClick={(e) => {
              e.preventDefault();
              handleOuterTabChange('templates');
            }}>
              {t('templates')}
            </a>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <div className="controls" name="main-controls-section">
        <div className="tab-border-line" name="tab-border-separator"></div>
        <div className="profile-controls" name="profile-selection-controls">
          {/* Outer tabs */}
          <div className="outer-tabs" name="outer-tabs-container">
            <div className="tabs-list" name="outer-tabs-list" style={{ display: 'flex', width: '100%' }}>
              <div 
                className={`tab ${selectedOuterTab === 'projects' ? 'active' : ''}`}
                name="projects-tab"
                onClick={() => handleOuterTabChange('projects')}
                title="View project profiles"
              >
                <span className="tab-name">📁 {t('projects')}</span>
              </div>
              <div 
                className={`tab ${selectedOuterTab === 'release-notes' ? 'active' : ''}`}
                name="release-notes-tab"
                onClick={() => handleOuterTabChange('release-notes')}
                title="View release notes"
              >
                <span className="tab-name">📋 {t('releaseNotes')}</span>
              </div>
              <div 
                className={`tab ${selectedOuterTab === 'readme' ? 'active' : ''}`}
                name="readme-tab"
                onClick={() => handleOuterTabChange('readme')}
                title="View README documentation"
              >
                <span className="tab-name">ℹ️ {t('readme')}</span>
              </div>
              <div 
                className={`tab ${selectedOuterTab === 'templates' ? 'active' : ''}`}
                name="templates-tab"
                onClick={() => handleOuterTabChange('templates')}
                title="Manage prompt templates"
              >
                <span className="tab-name">🎨 {t('templates')}</span>
              </div>
            </div>
          </div>
          
          {/* Inner profile tabs - only visible when projects tab is selected */}
          {selectedOuterTab === 'projects' && (
            <div className="profile-tabs" name="profile-tabs-container">
              <div className="tabs-list inner-tabs" name="profile-tabs-list" style={{ display: 'flex', width: '100%' }}>
                {profiles.map((profile, index) => (
                  <div 
                    key={profile.id} 
                    className={`tab ${selectedProfile === profile.id ? 'active' : ''} ${draggedTabIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                    name={`profile-tab-${profile.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => handleProfileChange(profile.id)}
                    title={`Switch to ${profile.name} profile - Drag to reorder tabs`}
                  >
                    <span className="tab-name">{profile.name}</span>
                    <button 
                      className="tab-close-btn"
                      name={`close-tab-${profile.id}-button`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveProfile(profile.id);
                      }}
                      title={`Close ${profile.name} tab and remove profile`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button 
                  className="add-tab-btn"
                  name="add-new-tab-button"
                  onClick={() => setShowAddProfile(true)}
                  title="Add a new profile tab"
                >
                  + {t('addTab')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedOuterTab === 'release-notes' ? (
        <div className="content-container" name="release-notes-content-area">
          <ReleaseNotes />
        </div>
      ) : selectedOuterTab === 'readme' ? (
        <div className="content-container" name="help-content-area">
          <Help />
        </div>
      ) : selectedOuterTab === 'templates' ? (
        <div className="content-container" name="templates-content-area">
          {templateView === 'list' ? (
            <>
              <div className="stats-and-search-container" name="templates-stats-and-search-row">
                <div className="search-container" name="template-search-controls">
                  <input
                    type="text"
                    name="template-search-input"
                    className="search-input"
                    placeholder={t('searchTemplatesPlaceholder')}
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    title="Search and filter templates by function name or description"
                  />
                </div>

                <div className="stats-grid" name="template-statistics-display">
                  <div className="stat-card" name="total-templates-counter" title="Total number of templates">
                    <h3>Total Templates</h3>
                    <div className="value">{templates.length}</div>
                  </div>
                  <div className="stat-card" name="default-templates-counter" title="Number of default templates">
                    <h3>Default</h3>
                    <div className="value">{templates.filter(t => t.status === 'default').length}</div>
                  </div>
                  <div className="stat-card" name="custom-templates-counter" title="Number of custom templates">
                    <h3>Custom</h3>
                    <div className="value">{templates.filter(t => t.status === 'custom').length}</div>
                  </div>
                  <div className="stat-card" name="env-override-templates-counter" title="Number of environment overridden templates">
                    <h3>Env Override</h3>
                    <div className="value">{templates.filter(t => t.status.includes('env')).length}</div>
                  </div>
                </div>

                <div className="controls-right" name="template-controls-right">
                  <button 
                    name="refresh-templates-button"
                    className="refresh-button template-refresh"
                    onClick={() => loadTemplates()}
                    disabled={templatesLoading}
                    title="Refresh template data"
                  >
                    {templatesLoading ? '⏳' : '🔄'}
                  </button>
                </div>
              </div>

              <TemplateManagement 
                data={templates}
                globalFilter={globalFilter}
                onGlobalFilterChange={setGlobalFilter}
                loading={templatesLoading}
                error={templatesError}
                onEditTemplate={handleEditTemplate}
                onResetTemplate={handleResetTemplate}
                onDuplicateTemplate={handleDuplicateTemplate}
                onPreviewTemplate={handlePreviewTemplate}
                onActivateTemplate={handleActivateTemplate}
              />
              
              {templatesError && (
                <div className="error" name="templates-error-message" title="Template error information">{templatesError}</div>
              )}
            </>
          ) : templateView === 'edit' ? (
            // Template Editor View
            <TemplateEditor
              template={editingTemplate}
              onSave={handleSaveTemplate}
              onCancel={handleCancelTemplateEdit}
              loading={templateEditorLoading}
              error={templatesError}
              onActivate={handleActivateTemplate}
            />
          ) : templateView === 'preview' ? (
            // Template Preview View
            <TemplatePreview
              template={previewingTemplate}
              onBack={() => {
                setTemplateView('list');
                setPreviewingTemplate(null);
              }}
              onActivate={handleActivateTemplate}
              onEdit={handleEditTemplate}
              activating={activatingTemplate}
            />
          ) : templateView === 'duplicate' ? (
            // Template Duplicate View
            <DuplicateTemplateView
              template={duplicatingTemplate}
              onBack={() => {
                setTemplateView('list');
                setDuplicatingTemplate(null);
              }}
              onConfirm={confirmDuplicateTemplate}
            />
          ) : null}
        </div>
      ) : selectedOuterTab === 'projects' && selectedProfile && !historyView && (
        <>
          <div className="content-container" name="main-content-area">
            <div className="stats-and-search-container" name="stats-and-search-row">
              <div className="search-container" name="task-search-controls">
                <input
                  type="text"
                  name="task-search-input"
                  className="search-input"
                  placeholder={t('searchTasksPlaceholder')}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  title="Search and filter tasks by any text content"
                />
              </div>

              <div className="stats-grid" name="task-statistics-display">
                <div className="stat-card" name="total-tasks-counter" title="Total number of tasks in this profile">
                  <h3>{t('totalTasks')}</h3>
                  <div className="value">{stats.total}</div>
                </div>
                <div className="stat-card" name="completed-tasks-counter" title="Number of completed tasks">
                  <h3>{t('completed')}</h3>
                  <div className="value">{stats.completed}</div>
                </div>
                <div className="stat-card" name="in-progress-tasks-counter" title="Number of tasks currently in progress">
                  <h3>{t('inProgress')}</h3>
                  <div className="value">{stats.inProgress}</div>
                </div>
                <div className="stat-card" name="pending-tasks-counter" title="Number of pending tasks">
                  <h3>{t('pending')}</h3>
                  <div className="value">{stats.pending}</div>
                </div>
              </div>

              <div className="controls-right" name="right-side-controls">
                <button 
                  name="history-button"
                  className="history-button"
                  onClick={() => {
                    if (selectedProfile) {
                      setHistoryView('list');
                      loadHistory(selectedProfile);
                    }
                  }}
                  disabled={!selectedProfile || selectedProfile === 'release-notes'}
                  title={t('viewProjectHistory')}
                >
                  📚 {t('history')}
                </button>
                <button 
                  name="edit-profile-button"
                  className="edit-profile-button"
                  onClick={() => {
                    const currentProfile = profiles.find(p => p.id === selectedProfile);
                    if (currentProfile) {
                      setShowEditProfile(true);
                      setEditingProfile(currentProfile);
                    }
                  }}
                  disabled={!selectedProfile || selectedProfile === 'release-notes'}
                  title={t('editProjectSettings')}
                >
                  ⚙️
                </button>
                <button 
                  name="refresh-profile-button"
                  className="refresh-button profile-refresh"
                  onClick={() => loadTasks(selectedProfile)}
                  disabled={loading || !selectedProfile}
                  title="Refresh current profile data - reload tasks from file"
                >
                  {loading ? '⏳' : '🔄'}
                </button>

                <div className="auto-refresh-controls" name="auto-refresh-controls" title="Configure automatic task refresh">
                  <label className="auto-refresh" name="auto-refresh-toggle">
                    <input 
                      type="checkbox"
                      name="auto-refresh-checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      title={`Enable automatic refresh every ${refreshInterval} seconds`}
                    />
                    {t('autoRefresh')}
                  </label>
                  
                  <select 
                    className="refresh-interval-select"
                    name="refresh-interval-selector"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    disabled={!autoRefresh}
                    title="Set how often to automatically refresh task data"
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={120}>2m</option>
                    <option value={300}>5m</option>
                  </select>
                </div>
              </div>
            </div>

            <TaskTable 
              data={tasks} 
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              projectRoot={projectRoot}
              onDetailViewChange={setIsInDetailView}
              resetDetailView={forceResetDetailView}
            />
          </div>
        </>
      )}

      {selectedOuterTab === 'projects' && historyView && (
        <div className="content-container" name="history-content-area">
          {historyView === 'list' ? (
            <HistoryView
              data={historyData}
              loading={historyLoading}
              error={historyError}
              onViewTasks={loadHistoryTasks}
              onBack={() => {
                setHistoryView('');
                setHistoryData([]);
              }}
            />
          ) : historyView === 'details' ? (
            <HistoryTasksView
              tasks={selectedHistoryTasks}
              historyEntry={selectedHistoryEntry}
              loading={historyLoading}
              error={historyError}
              onBack={() => {
                setHistoryView('list');
                setSelectedHistoryEntry(null);
                setSelectedHistoryTasks([]);
              }}
            />
          ) : null}
        </div>
      )}

      {error && selectedOuterTab === 'projects' && (
        <div className="error" name="error-message-display" title="Error information">{error}</div>
      )}

      {selectedOuterTab === 'projects' && !selectedProfile && profiles.length > 0 && (
        <div className="content-container" name="no-profile-container">
          <div className="loading" name="no-profile-message" title="Choose a profile from the dropdown above">Select a profile to view tasks</div>
        </div>
      )}
      
      {selectedOuterTab === 'projects' && profiles.length === 0 && (
        <div className="content-container" name="no-profile-container">
          <div className="loading" name="no-profile-message" title={t('noProfilesAvailable')}>{t('noProfilesClickAddTab')}</div>
        </div>
      )}

      {loading && selectedOuterTab === 'projects' && selectedProfile && (
        <div className="content-container" name="loading-container">
          <div className="loading" name="loading-indicator" title="Loading tasks from file">Loading tasks... ⏳</div>
        </div>
      )}

      {showAddProfile && (
        <div className="modal-overlay" name="add-profile-modal-overlay" onClick={() => setShowAddProfile(false)} title="Click outside to close">
          <div className="modal-content" name="add-profile-modal" onClick={(e) => e.stopPropagation()} title="Add new profile form">
            <h3>{t('addNewProfile')}</h3>
            <form name="add-profile-form" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const name = formData.get('name');
              const folderPath = formData.get('folderPath');
              const projectRoot = formData.get('projectRoot');
              
              if (name && folderPath) {
                // Auto-append tasks.json to the folder path
                const filePath = folderPath.endsWith('/') 
                  ? folderPath + 'tasks.json' 
                  : folderPath + '/tasks.json';
                handleAddProfile(name, null, projectRoot, filePath);
              }
            }}>
              <div className="form-group" name="profile-name-group">
                <label htmlFor="profileName">{t('profileName')}:</label>
                <input 
                  type="text" 
                  id="profileName"
                  name="name"
                  placeholder="e.g., Team Alpha Tasks"
                  title="Enter a descriptive name for this profile"
                  required
                />
              </div>
              <div className="form-group" name="task-folder-group">
                <label htmlFor="folderPath">{t('taskFolderPath')}:</label>
                <input 
                  type="text" 
                  id="folderPath"
                  name="folderPath"
                  placeholder="/path/to/shrimp_data_folder"
                  title="Enter the path to your shrimp data folder containing tasks.json"
                  required
                />
                <span className="form-hint">
                  <strong>Tip:</strong> Navigate to your shrimp data folder in terminal and <strong style={{ color: '#f59e0b' }}>type <code>pwd</code> to get the full path</strong><br />
                  Example: /home/user/project/shrimp_data_team
                </span>
              </div>
              <div className="form-group" name="project-root-group">
                <label htmlFor="projectRoot">{t('projectRootPath')} ({t('optional')}):</label>
                <input 
                  type="text" 
                  id="projectRoot"
                  name="projectRoot"
                  placeholder="e.g., /home/user/my-project"
                  title="Enter the absolute path to the project root directory"
                />
                <small className="form-hint">This enables clickable file links that open in VS Code</small>
              </div>
              <div className="form-actions" name="modal-form-buttons">
                <button 
                  type="submit" 
                  name="submit-add-profile"
                  className="primary-btn"
                  title="Create the new profile with the provided information"
                >
                  Add Profile
                </button>
                <button 
                  type="button" 
                  name="cancel-add-profile"
                  className="secondary-btn" 
                  onClick={() => setShowAddProfile(false)}
                  title={t('cancelAndCloseDialog')}
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{showEditProfile && editingProfile && (
        <div className="modal-overlay" name="edit-profile-modal-overlay" onClick={() => {
          setShowEditProfile(false);
          setEditingProfile(null);
        }} title="Click outside to close">
          <div className="modal-content" name="edit-profile-modal" onClick={(e) => e.stopPropagation()} title="Edit profile settings">
            <h3>{t('editProjectSettings')}</h3>
            <form name="edit-profile-form" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const name = formData.get('name');
              const taskPath = formData.get('taskPath');
              const projectRoot = formData.get('projectRoot');
              
              // Validate task path format
              if (taskPath && !taskPath.trim().endsWith('.json')) {
                setError('Task path must point to a .json file');
                return;
              }
              
              handleUpdateProfile(editingProfile.id, { 
                name: name.trim(),
                taskPath: taskPath?.trim() || null,
                projectRoot: projectRoot || null 
              });
            }}>
              <div className="form-group" name="profile-name-group">
                <label htmlFor="editProfileName">{t('profileName')}:</label>
                <input 
                  type="text" 
                  id="editProfileName"
                  name="name"
                  defaultValue={editingProfile.name}
                  placeholder="e.g., Team Alpha Tasks"
                  title="Edit the profile name"
                  required
                />
              </div>
              <div className="form-group" name="task-path-group">
                <label htmlFor="editTaskPath">{t('taskPath')}:</label>
                <input 
                  type="text" 
                  id="editTaskPath"
                  name="taskPath"
                  defaultValue={editingProfile.taskPath || editingProfile.filePath || editingProfile.path || ''}
                  placeholder={t('taskPathPlaceholder')}
                  title={t('taskPathTitle')}
                  required
                />
                <span className="form-hint">
                  {t('taskPathHint')}
                </span>
              </div>
              <div className="form-group" name="project-root-group">
                <label htmlFor="editProjectRoot">{t('projectRoot')} ({t('optional')}):</label>
                <input 
                  type="text" 
                  id="editProjectRoot"
                  name="projectRoot"
                  defaultValue={editingProfile.projectRoot || ''}
                  placeholder={t('projectRootEditPlaceholder')}
                  title={t('projectRootEditTitle')}
                />
                <span className="form-hint">
                  {t('projectRootEditHint')}
                </span>
              </div>
              <div className="form-actions" name="modal-form-buttons">
                <button 
                  type="submit" 
                  name="submit-edit-profile"
                  className="primary-btn"
                  title="Save profile settings"
                >
                  {t('saveChanges')}
                </button>
                <button 
                  type="button" 
                  name="cancel-edit-profile"
                  className="secondary-btn"
                  onClick={() => {
                    setShowEditProfile(false);
                    setEditingProfile(null);
                  }}
                  title={t('cancelAndCloseDialog')}
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;