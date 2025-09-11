import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Tab } from '@headlessui/react';
import StoryPanel from './StoryPanel.jsx';
import Button from './Button.jsx';

/**
 * EpicTabs component displays dynamic tabs for each epic with their stories
 * Uses same Tailwind styling pattern as BMADView tabs
 */
const EpicTabs = ({ 
  epics = [], 
  verifications = {},
  onEditStory = null,
  onViewStory = null,
  onArchiveEpic = null
}) => {
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'

  // Validate epics data
  if (!Array.isArray(epics)) {
    console.warn('EpicTabs: epics prop is not an array:', epics);
    return <div>Error: Invalid epics data</div>;
  }
  
  if (epics.length === 0) {
    return (
      <div 
        data-testid="epic-tabs-no-epics"
        style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6c757d',
          fontSize: '16px'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
        <h3>No Epics Found</h3>
        <p>Create epics using the MadShrimp agent to see them organized here.</p>
      </div>
    );
  }

  const calculateEpicProgress = (epic) => {
    // Check if stories exist
    if (!epic.stories || !Array.isArray(epic.stories)) {
      return {
        total: 0,
        completed: 0,
        percentage: 0,
        averageScore: null,
        storiesNeedingAttention: []
      };
    }
    
    const total = epic.stories.length;
    const completed = epic.stories.filter(story => story.status === 'Done').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate average verification score
    const epicVerifications = epic.stories
      .map(story => verifications[story.id])
      .filter(Boolean);
    
    const averageScore = epicVerifications.length > 0 
      ? Math.round(epicVerifications.reduce((sum, v) => sum + v.score, 0) / epicVerifications.length)
      : null;

    return {
      total,
      completed,
      percentage,
      averageScore,
      storiesNeedingAttention: epic.stories.filter(story => {
        const verification = verifications[story.id];
        return verification && verification.score < 80;
      })
    };
  };

  
  return (
    <div data-testid="epic-tabs-container">
      <Tab.Group data-testid="epic-tabs-rendered">
        {/* Epic Tabs List - Using nested-tabs.css system */}
        <div className="inner-tabs-wrapper epic-tabs">
          <Tab.List className="inner-tabs-list project-inner-tabs">
            {epics.map((epic) => {
              const progress = calculateEpicProgress(epic);
              return (
                <Tab
                  key={epic.id}
                  data-testid={`epic-${epic.id}-tab-button`}
                  className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}
                  aria-label={`Epic ${epic.id}: ${epic.title}`}
                  role="tab"
                >
                  {epic.id && !isNaN(parseInt(epic.id)) ? `Epic ${epic.id}` : (epic.title || epic.id || 'Epic')}
              </Tab>
            );
          })}
          </Tab.List>
          
          <Tab.Panels className="inner-tab-panels">
            {epics.map((epic) => {
            const progress = calculateEpicProgress(epic);
            
            return (
              <Tab.Panel
                key={epic.id}
                className="rounded-xl p-6"
                style={{ backgroundColor: 'rgba(100, 149, 210, 0.1)', border: '1px solid rgba(100, 149, 210, 0.2)' }}
                data-testid={`epic-${epic.id}-panel`}
              >
                {/* Epic Description and Archive Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    {epic.description && (
                      <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
                        {epic.description}
                      </p>
                    )}
                  </div>
                  {onArchiveEpic && (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to archive Epic ${epic.id}? You can restore it later from the Archived EPICs tab.`)) {
                          onArchiveEpic(epic.id);
                        }
                      }}
                      icon="📦"
                      title={`Archive Epic ${epic.id}`}
                      style={{ marginLeft: '16px' }}
                    >
                      Archive
                    </Button>
                  )}
                </div>
                
                {/* Compact Progress Stats */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <div style={{ color: '#94a3b8' }}>
                    {progress.completed} of {progress.total} stories completed
                  </div>
                  {progress.storiesNeedingAttention.length > 0 && (
                    <div className="text-orange-400">
                      ⚠️ {progress.storiesNeedingAttention.length} stories need attention
                    </div>
                  )}
                </div>

                {/* View Mode Toggle */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '16px',
                  gap: '8px'
                }}>
                  <Button
                    variant={viewMode === 'cards' ? 'primary' : 'ghost'}
                    size="medium"
                    onClick={() => setViewMode('cards')}
                    icon="📋"
                    style={{
                      borderColor: viewMode === 'cards' ? '#3182ce' : '#2d3748'
                    }}
                  >
                    Card View
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'primary' : 'ghost'}
                    size="medium"
                    onClick={() => setViewMode('list')}
                    icon="📝"
                    style={{
                      borderColor: viewMode === 'list' ? '#3182ce' : '#2d3748'
                    }}
                  >
                    List View
                  </Button>
                </div>

                {/* Stories Display */}
                {epic.stories && epic.stories.length > 0 ? (
                  <>
                    {viewMode === 'cards' ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px',
                        padding: '16px 0'
                      }}>
                        {epic.stories.map((story) => (
                          <StoryPanel
                            key={story.id}
                            story={story}
                            verification={verifications[story.id]}
                            onEdit={onEditStory}
                            onView={onViewStory}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="table-container" style={{
                        backgroundColor: 'rgba(26, 32, 44, 0.5)',
                        borderRadius: '8px',
                        border: '1px solid #2d3748'
                      }}>
                        <table className="table-full-width">
                          <thead>
                            <tr style={{
                              backgroundColor: 'rgba(45, 55, 72, 0.3)',
                              borderBottom: '2px solid #2d3748'
                            }}>
                              <th style={{ padding: '12px', textAlign: 'left', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', width: '10%' }}>Story</th>
                              <th style={{ padding: '12px', textAlign: 'left', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', width: '40%' }}>Title</th>
                              <th style={{ padding: '12px', textAlign: 'center', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', width: '15%' }}>Status</th>
                              <th style={{ padding: '12px', textAlign: 'center', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', width: '10%' }}>Score</th>
                              <th style={{ padding: '12px', textAlign: 'center', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', width: '10%' }}>Parallel</th>
                              <th style={{ padding: '12px', textAlign: 'center', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', width: '15%' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {epic.stories.map((story, index) => {
                              const verification = verifications[story.id];
                              const statusColor = story.status === 'Done' || story.status === 'Completed' ? '#38a169' :
                                                 story.status === 'In Progress' ? '#3182ce' :
                                                 story.status === 'Ready for Review' ? '#d69e2e' :
                                                 story.status === 'Ready' ? '#00b5d8' : '#718096';
                              
                              return (
                                <tr 
                                  key={story.id}
                                  style={{
                                    borderBottom: '1px solid #2d3748',
                                    transition: 'background-color 0.2s ease',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(74, 85, 104, 0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                  onClick={() => onViewStory && onViewStory(story)}
                                >
                                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#cbd5e1' }}>
                                    {story.id}
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '13px', color: '#e2e8f0', wordWrap: 'break-word' }}>
                                    <div style={{ 
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: '1.4',
                                      maxHeight: '3.6em',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical'
                                    }}>
                                      {story.title}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '4px 12px',
                                      borderRadius: '12px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      backgroundColor: statusColor,
                                      color: 'white',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}>
                                      {story.status === 'Done' ? 'Completed' : story.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {verification ? (
                                      <span style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        backgroundColor: verification.score >= 80 ? '#38a169' :
                                                       verification.score >= 60 ? '#d69e2e' : '#e53e3e',
                                        color: 'white'
                                      }}>
                                        {verification.score}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '16px' }}>
                                      {story.parallelWork?.multiDevOK ? '👥' : '👤'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                      {onViewStory && (
                                        <Button
                                          variant="outline"
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onViewStory(story);
                                          }}
                                        >
                                          View
                                        </Button>
                                      )}
                                      {onEditStory && (
                                        <Button
                                          variant="primary"
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEditStory(story);
                                          }}
                                        >
                                          Edit
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📋</div>
                    <h3 className="text-lg font-medium mb-2" style={{ color: '#e2e8f0' }}>
                      No Stories Yet
                    </h3>
                    <p style={{ color: '#94a3b8' }}>
                      Create stories for this epic using the MadShrimp agent.
                    </p>
                  </div>
                )}
              </Tab.Panel>
            );
          })}
          </Tab.Panels>
        </div>
      </Tab.Group>
    </div>
  );
};

EpicTabs.propTypes = {
  epics: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      stories: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          title: PropTypes.string.isRequired,
          status: PropTypes.string.isRequired,
          description: PropTypes.string,
          acceptanceCriteria: PropTypes.arrayOf(PropTypes.string),
          filePath: PropTypes.string.isRequired,
          lastModified: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
          epicId: PropTypes.string,
          parallelWork: PropTypes.shape({
            multiDevOK: PropTypes.bool.isRequired,
            reason: PropTypes.string.isRequired
          })
        })
      ).isRequired
    })
  ),
  verifications: PropTypes.object,
  onEditStory: PropTypes.func,
  onViewStory: PropTypes.func,
  onArchiveEpic: PropTypes.func
};

export default EpicTabs;