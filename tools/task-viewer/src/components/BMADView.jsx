import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab } from '@headlessui/react';
import EpicTabs from './EpicTabs.jsx';
import StoryGrid from './StoryGrid.jsx';
import StoryEditor from './StoryEditor.jsx';
import DocumentEditor from './DocumentEditor.jsx';
import ArchivedEpicsTab from './ArchivedEpicsTab.jsx';
import Button from './Button.jsx';
import { getStories, getEpics, getAllVerifications } from '../utils/bmad-api.js';

const BMADView = ({ 
  profileId, 
  projectRoot, 
  showToast,
  bmadStatus 
}) => {
  const { t } = useTranslation();
  const [stories, setStories] = useState([]);
  const [epics, setEpics] = useState([]);
  const [verifications, setVerifications] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStory, setSelectedStory] = useState(null);
  const [storyContent, setStoryContent] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [editingStory, setEditingStory] = useState(null);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [prdContent, setPrdContent] = useState('');
  const [codingStandardsContent, setCodingStandardsContent] = useState('');
  const [sourceTreeContent, setSourceTreeContent] = useState('');
  const [techStackContent, setTechStackContent] = useState('');
  const [archivedEpics, setArchivedEpics] = useState([]);
  const [showArchivedTab, setShowArchivedTab] = useState(false);

  useEffect(() => {
    if (bmadStatus.detected && profileId) {
      loadBMADContent();
      loadArchivedEpics();
      loadDocuments();
    }
  }, [bmadStatus.detected, profileId]);

  const loadDocuments = async () => {
    try {
      // Load PRD
      const prdResponse = await fetch(`/api/bmad-document/${profileId}/prd`);
      if (prdResponse.ok) {
        const prdData = await prdResponse.text();
        setPrdContent(prdData);
      }
      
      // Load Coding Standards
      const codingResponse = await fetch(`/api/bmad-document/${profileId}/coding-standards`);
      if (codingResponse.ok) {
        const codingData = await codingResponse.text();
        setCodingStandardsContent(codingData);
      }
      
      // Load Source Tree
      const sourceResponse = await fetch(`/api/bmad-document/${profileId}/source-tree`);
      if (sourceResponse.ok) {
        const sourceData = await sourceResponse.text();
        setSourceTreeContent(sourceData);
      }
      
      // Load Tech Stack
      const techResponse = await fetch(`/api/bmad-document/${profileId}/tech-stack`);
      if (techResponse.ok) {
        const techData = await techResponse.text();
        setTechStackContent(techData);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const saveDocument = async (docType, content) => {
    try {
      const response = await fetch(`/api/bmad-document/${profileId}/${docType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: content
      });
      
      if (response.ok) {
        // Update local state
        switch(docType) {
          case 'prd':
            setPrdContent(content);
            break;
          case 'coding-standards':
            setCodingStandardsContent(content);
            break;
          case 'source-tree':
            setSourceTreeContent(content);
            break;
          case 'tech-stack':
            setTechStackContent(content);
            break;
        }
        return true;
      }
      throw new Error('Failed to save document');
    } catch (error) {
      console.error(`Error saving ${docType}:`, error);
      throw error;
    }
  };

  const loadArchivedEpics = async () => {
    try {
      // Load archived epics from localStorage first (for quick access)
      const localArchived = localStorage.getItem(`archivedEpics_${profileId}`);
      if (localArchived) {
        const parsed = JSON.parse(localArchived);
        setArchivedEpics(parsed);
        setShowArchivedTab(parsed.length > 0);
      }
      
      // Then sync with backend
      const response = await fetch(`/api/bmad-archived-epics/${profileId}`);
      if (response.ok) {
        const data = await response.json();
        setArchivedEpics(data.archivedEpics || []);
        setShowArchivedTab((data.archivedEpics || []).length > 0);
        // Update localStorage
        localStorage.setItem(`archivedEpics_${profileId}`, JSON.stringify(data.archivedEpics || []));
      }
    } catch (error) {
      console.error('Error loading archived epics:', error);
      // Fall back to localStorage if backend fails
    }
  };

  const archiveEpic = async (epicId) => {
    try {
      const epicToArchive = epics.find(e => e.id === epicId);
      if (!epicToArchive) return;
      
      // Optimistic update
      const newEpics = epics.filter(e => e.id !== epicId);
      const newArchivedEpics = [...archivedEpics, { ...epicToArchive, archivedAt: new Date().toISOString() }];
      
      setEpics(newEpics);
      setArchivedEpics(newArchivedEpics);
      setShowArchivedTab(true);
      
      // Save to localStorage immediately
      localStorage.setItem(`archivedEpics_${profileId}`, JSON.stringify(newArchivedEpics));
      
      // Sync with backend
      await fetch(`/api/bmad-archive-epic/${profileId}/${epicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epic: epicToArchive })
      });
      
      showToast?.(`Epic ${epicId} archived successfully`, 'success');
    } catch (error) {
      console.error('Error archiving epic:', error);
      showToast?.('Failed to archive epic', 'error');
      // Reload to restore state
      loadBMADContent();
      loadArchivedEpics();
    }
  };

  const unarchiveEpic = async (epicId) => {
    try {
      const epicToRestore = archivedEpics.find(e => e.id === epicId);
      if (!epicToRestore) return;
      
      // Remove archive metadata
      const { archivedAt, ...restoredEpic } = epicToRestore;
      
      // Optimistic update
      const newArchivedEpics = archivedEpics.filter(e => e.id !== epicId);
      const newEpics = [...epics, restoredEpic].sort((a, b) => {
        const aNum = parseInt(a.id);
        const bNum = parseInt(b.id);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.id.localeCompare(b.id);
      });
      
      setArchivedEpics(newArchivedEpics);
      setEpics(newEpics);
      setShowArchivedTab(newArchivedEpics.length > 0);
      
      // Save to localStorage immediately
      localStorage.setItem(`archivedEpics_${profileId}`, JSON.stringify(newArchivedEpics));
      
      // Sync with backend
      await fetch(`/api/bmad-unarchive-epic/${profileId}/${epicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epic: restoredEpic })
      });
      
      showToast?.(`Epic ${epicId} restored successfully`, 'success');
    } catch (error) {
      console.error('Error unarchiving epic:', error);
      showToast?.('Failed to restore epic', 'error');
      // Reload to restore state
      loadBMADContent();
      loadArchivedEpics();
    }
  };

  const loadBMADContent = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [storiesData, epicsData, verificationsData] = await Promise.all([
        getStories(profileId),
        getEpics(profileId),
        getAllVerifications(profileId)
      ]);
      
      // Filter out archived epics
      const archivedIds = archivedEpics.map(e => e.id);
      const activeEpics = (epicsData || []).filter(e => !archivedIds.includes(e.id));
      
      setStories(storiesData || []);
      setEpics(activeEpics);
      
      // DEBUG: Log epic data structure
      console.log('🔍 DEBUG - Epic Data Flow in BMADView:');
      console.log('  - Epics count:', epicsData?.length || 0);
      console.log('  - Raw epics data:', epicsData);
      if (epicsData && epicsData.length > 0) {
        console.log('  - First epic structure:', {
          id: epicsData[0].id,
          title: epicsData[0].title,
          storiesCount: epicsData[0].stories?.length || 0,
          hasStories: !!epicsData[0].stories,
          epicKeys: Object.keys(epicsData[0])
        });
        if (epicsData[0].stories && epicsData[0].stories.length > 0) {
          console.log('  - First story in epic:', epicsData[0].stories[0]);
        }
      }
      
      // Convert verifications array to object keyed by storyId
      const verificationMap = {};
      if (verificationsData && Array.isArray(verificationsData)) {
        verificationsData.forEach(verification => {
          verificationMap[verification.storyId] = verification;
        });
      }
      setVerifications(verificationMap);
      
    } catch (err) {
      setError('❌ Error loading BMAD content: ' + err.message);
      setStories([]);
      setEpics([]);
      setVerifications({});
    } finally {
      setLoading(false);
    }
  };

  const viewStory = async (story) => {
    try {
      // Use the relative path (directory + filename) for fetching
      const storyPath = story.directory ? `${story.directory}/${story.filename}` : story.filename;
      const response = await fetch(`/api/bmad-story/${profileId}/${encodeURIComponent(storyPath)}`);
      if (response.ok) {
        const content = await response.text();
        setStoryContent(content);
        setSelectedStory(story);
      } else {
        showToast?.('Error loading story content', 'error');
      }
    } catch (err) {
      showToast?.('Error loading story content', 'error');
    }
  };

  const renderBMADNotDetected = () => (
    <div className="template-management-view">
      <div className="template-management-header">
        <div className="header-content">
          <div className="header-text">
            <h2>🤖 BMAD Integration</h2>
            <p>BMAD system not detected in this project</p>
          </div>
        </div>
      </div>
      
      <div className="bmad-setup-container" style={{ 
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        margin: '20px',
        border: '2px dashed #dee2e6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🤖</div>
        <h3 style={{ marginBottom: '20px', color: '#495057' }}>Initialize BMAD for this project</h3>
        
        <p style={{ 
          marginBottom: '30px', 
          color: '#6c757d',
          fontSize: '16px',
          lineHeight: '1.6',
          maxWidth: '600px',
          margin: '0 auto 30px'
        }}>
          The Business-Minded Agent Development (BMAD) method provides specialized agents for 
          product management, development, QA, and architecture tasks. Set up BMAD to unlock 
          powerful workflow automation.
        </p>
        
        <div className="setup-steps" style={{
          textAlign: 'left',
          maxWidth: '500px',
          margin: '0 auto 30px',
          backgroundColor: 'rgba(100, 149, 210, 0.1)',
          padding: '25px',
          borderRadius: '8px',
          border: '1px solid rgba(100, 149, 210, 0.2)'
        }}>
          <h4 style={{ marginBottom: '15px', color: '#495057' }}>Setup Steps:</h4>
          <ol style={{ paddingLeft: '20px', color: '#6c757d' }}>
            <li style={{ marginBottom: '8px' }}>Clone the BMAD repository</li>
            <li style={{ marginBottom: '8px' }}>Initialize BMAD in your project</li>
            <li style={{ marginBottom: '8px' }}>Configure your preferred agents</li>
            <li>Start using specialized workflows</li>
          </ol>
        </div>

        <div className="bmad-links" style={{ marginBottom: '20px' }}>
          <a 
            href="https://github.com/cline/bmad" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              marginRight: '15px',
              fontWeight: '500'
            }}
          >
            📂 BMAD Repository
          </a>
          <a 
            href="https://github.com/cline/bmad/blob/main/user-guide.md" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '500'
            }}
          >
            📖 User Guide
          </a>
        </div>

        <div style={{ 
          fontSize: '14px', 
          color: '#6c757d',
          fontStyle: 'italic'
        }}>
          After setting up BMAD, refresh this page to see your stories and epics
        </div>
      </div>
    </div>
  );

  const renderStoryViewer = () => (
    <div className="story-viewer">
      <div className="story-header">
        <Button
          variant="secondary"
          size="medium"
          onClick={() => setSelectedStory(null)}
          icon="←"
          style={{ marginBottom: '20px' }}
        >
          Back to Stories
        </Button>
        <h3>{selectedStory.name}</h3>
      </div>
      
      <DocumentEditor
        title=""
        content={storyContent}
        readOnly={true}
        hideTitle={true}
        height={600}
        documentType="Story"
        showToast={showToast}
      />
    </div>
  );

  const handleEditStory = async (story) => {
    console.log('Edit story:', story);
    try {
      // Load the story content first
      const storyPath = story.directory ? `${story.directory}/${story.filename}` : story.filename;
      const response = await fetch(`/api/bmad-story/${profileId}/${encodeURIComponent(storyPath)}`);
      if (response.ok) {
        const content = await response.text();
        // Add content to the story object
        setEditingStory({ ...story, content });
        setIsEditingStory(true);
      } else {
        showToast?.('Error loading story content for editing', 'error');
      }
    } catch (err) {
      showToast?.('Error loading story content for editing', 'error');
    }
  };

  const handleSaveStory = async (updatedStory) => {
    try {
      // Save to backend
      const storyPath = editingStory.directory ? 
        `${editingStory.directory}/${editingStory.filename}` : 
        editingStory.filename;
      
      const response = await fetch(`/api/bmad-story/${profileId}/${encodeURIComponent(storyPath)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: updatedStory.content
      });
      
      if (!response.ok) {
        throw new Error('Failed to save story');
      }
      
      showToast?.('Story saved successfully!', 'success');
      
      // Update local state
      const updatedStories = stories.map(s => 
        s.id === editingStory.id ? { ...s, ...updatedStory } : s
      );
      setStories(updatedStories);
      
      // Update epics if needed
      const updatedEpics = epics.map(epic => ({
        ...epic,
        stories: epic.stories.map(s => 
          s.id === editingStory.id ? { ...s, ...updatedStory } : s
        )
      }));
      setEpics(updatedEpics);
      
      setIsEditingStory(false);
      setEditingStory(null);
    } catch (error) {
      console.error('Error saving story:', error);
      showToast?.('Failed to save story', 'error');
      throw error;
    }
  };

  const handleCancelEdit = () => {
    setIsEditingStory(false);
    setEditingStory(null);
  };

  const renderOverviewTab = () => (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card rounded-lg border" style={{ backgroundColor: 'rgba(100, 149, 210, 0.1)', padding: '16px', borderColor: 'rgba(100, 149, 210, 0.2)' }}>
          <h3 className="text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Total Epics</h3>
          <div className="text-2xl font-bold text-blue-400">{epics.length}</div>
        </div>
        <div className="stat-card rounded-lg border" style={{ backgroundColor: 'rgba(100, 149, 210, 0.1)', padding: '16px', borderColor: 'rgba(100, 149, 210, 0.2)' }}>
          <h3 className="text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Total Stories</h3>
          <div className="text-2xl font-bold text-green-400">{stories.length}</div>
        </div>
        <div className="stat-card rounded-lg border" style={{ backgroundColor: 'rgba(100, 149, 210, 0.1)', padding: '16px', borderColor: 'rgba(100, 149, 210, 0.2)' }}>
          <h3 className="text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Verified Stories</h3>
          <div className="text-2xl font-bold text-purple-400">{Object.keys(verifications).length}</div>
        </div>
        <div className="stat-card rounded-lg border" style={{ backgroundColor: 'rgba(100, 149, 210, 0.1)', padding: '16px', borderColor: 'rgba(100, 149, 210, 0.2)' }}>
          <h3 className="text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Avg Score</h3>
          <div className="text-2xl font-bold text-orange-400">
            {Object.keys(verifications).length > 0 
              ? Math.round(Object.values(verifications).reduce((sum, v) => sum + v.score, 0) / Object.keys(verifications).length)
              : '-'
            }
          </div>
        </div>
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: 'rgba(100, 149, 210, 0.1)', padding: '20px', borderColor: 'rgba(100, 149, 210, 0.2)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#e2e8f0' }}>Recent Activity</h3>
        {Object.keys(verifications).length > 0 ? (
          <div className="space-y-3">
            {Object.values(verifications)
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .slice(0, 5)
              .map((verification) => (
                <div key={verification.storyId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">Story {verification.storyId}</span>
                    <span className="text-sm text-gray-500 ml-2">verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      verification.score >= 80 ? 'text-green-600' :
                      verification.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {verification.score}/100
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(verification.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500">No verification activity yet</p>
        )}
      </div>
    </div>
  );

  const renderPRDTab = () => (
    <DocumentEditor
      title=""
      content={prdContent}
      onSave={(content) => saveDocument('prd', content)}
      documentType="PRD"
      placeholder="Enter your Product Requirements Document in markdown..."
      height={500}
      showToast={showToast}
      hideTitle={true}
    />
  );

  const renderCodingStandardsTab = () => (
    <DocumentEditor
      title=""
      content={codingStandardsContent}
      onSave={(content) => saveDocument('coding-standards', content)}
      documentType="Coding Standards"
      placeholder="Enter your coding standards documentation in markdown..."
      height={500}
      showToast={showToast}
      hideTitle={true}
    />
  );

  const renderSourceTreeTab = () => (
    <DocumentEditor
      title=""
      content={sourceTreeContent}
      onSave={(content) => saveDocument('source-tree', content)}
      documentType="Source Tree"
      placeholder="Enter your source tree documentation in markdown..."
      height={500}
      showToast={showToast}
      hideTitle={true}
    />
  );

  const renderTechStackTab = () => (
    <DocumentEditor
      title=""
      content={techStackContent}
      onSave={(content) => saveDocument('tech-stack', content)}
      documentType="Tech Stack"
      placeholder="Enter your tech stack documentation in markdown..."
      height={500}
      showToast={showToast}
      hideTitle={true}
    />
  );

  const renderBMADContent = () => (
    <div className="template-management-view">
      {isEditingStory && editingStory ? (
        <div>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', padding: '5px' }}>
            <Button
              variant="secondary"
              size="medium"
              onClick={handleCancelEdit}
              icon="←"
              data-testid="back-to-stories-button"
            >
              Back to Stories
            </Button>
          </div>
          <DocumentEditor
            title={editingStory.name || editingStory.title || 'Edit Story'}
            content={editingStory.content}
            onSave={async (content) => {
              // Save the updated content
              await handleSaveStory({ ...editingStory, content });
            }}
            height={700}
            documentType="Story"
            showToast={showToast}
          />
        </div>
      ) : selectedStory && !isEditingStory ? renderStoryViewer() : (
        <div className="bmad-content">
          <div className="inner-tabs-wrapper">
            <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
            <Tab.List className="inner-tabs-list project-inner-tabs" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
                Overview
              </Tab>
              <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
                Stories
              </Tab>
              <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
                Epics
              </Tab>
              <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
                PRD
              </Tab>
              <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
                Coding Standards
              </Tab>
              <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
                Source Tree
              </Tab>
              <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
                Tech Stack
              </Tab>
              {showArchivedTab && (
                <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
                  📦 Archived EPICs
                </Tab>
              )}
              <Button
                variant="primary"
                size="small"
                onClick={() => {
                  loadBMADContent();
                  loadDocuments();
                }}
                disabled={loading}
                title="Refresh BMAD content"
                icon={loading ? '⏳' : '🔄'}
                style={{
                  marginLeft: 'auto',
                  marginRight: '10px'
                }}
              >
                Refresh
              </Button>
            </Tab.List>
            <Tab.Panels className="inner-tab-panels">
              <Tab.Panel>
                {renderOverviewTab()}
              </Tab.Panel>
              <Tab.Panel>
                <div className="p-6">
                  <StoryGrid
                    stories={stories}
                    verifications={verifications}
                    onEditStory={handleEditStory}
                    onViewStory={viewStory}
                  />
                </div>
              </Tab.Panel>
              <Tab.Panel>
                <div className="p-6">
                  {epics && epics.length > 0 ? (
                    <EpicTabs 
                      epics={epics}
                      verifications={verifications}
                      onEditStory={handleEditStory}
                      onViewStory={viewStory}
                      onArchiveEpic={archiveEpic}
                    />
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px',
                      color: '#6c757d',
                      fontSize: '16px'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
                      <h3>No Epics Found</h3>
                      <p>Create epics using the MadShrimp agent to see them here.</p>
                    </div>
                  )}
                </div>
              </Tab.Panel>
              <Tab.Panel>
                {renderPRDTab()}
              </Tab.Panel>
              <Tab.Panel>
                {renderCodingStandardsTab()}
              </Tab.Panel>
              <Tab.Panel>
                {renderSourceTreeTab()}
              </Tab.Panel>
              <Tab.Panel>
                {renderTechStackTab()}
              </Tab.Panel>
              {showArchivedTab && (
                <Tab.Panel>
                  <ArchivedEpicsTab
                    archivedEpics={archivedEpics}
                    onRestoreEpic={unarchiveEpic}
                    onViewEpic={(epic) => {
                      // For now, just show an alert with epic details
                      alert(`Epic ${epic.id}: ${epic.title}\n\n${epic.description || 'No description'}\n\nStories: ${(epic.stories || []).length}`);
                    }}
                  />
                </Tab.Panel>
              )}
            </Tab.Panels>
          </Tab.Group>
          </div>

          {stories.length === 0 && epics.length === 0 && !loading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#6c757d',
              fontSize: '16px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
              <h3>No BMAD Content Found</h3>
              <p>Create stories and epics using the MadShrimp agent to see them here.</p>
              <div style={{ fontSize: '14px', marginTop: '10px', color: '#adb5bd' }}>
                Stories should be in the /docs/stories directory
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!bmadStatus.detected) {
    return renderBMADNotDetected();
  }

  if (loading) {
    return (
      <div className="template-management-view">
        <div className="template-management-header">
          <div className="header-content">
            <div className="header-text">
              <h2>🤖 BMAD Content</h2>
              <p>Loading BMAD content...</p>
            </div>
          </div>
        </div>
        <div className="loading">
          Loading BMAD stories and epics... ⏳
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="template-management-view">
        <div className="template-management-header">
          <div className="header-content">
            <div className="header-text">
              <h2>🤖 BMAD Content</h2>
              <p>Error loading BMAD content</p>
            </div>
          </div>
        </div>
        <div className="error">
          {error}
        </div>
      </div>
    );
  }

  return renderBMADContent();
};

export default BMADView;