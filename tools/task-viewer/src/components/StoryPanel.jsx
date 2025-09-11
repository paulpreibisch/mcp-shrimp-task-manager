import React, { useState } from 'react';
import PropTypes from 'prop-types';
import VerificationView from './VerificationView.jsx';
import ParallelIndicator from './ParallelIndicator.jsx';
import Button from './Button.jsx';

/**
 * StoryPanel component displays a story card with verification details
 */
const StoryPanel = ({ 
  story,
  verification = null,
  isLoading = false,
  error = null,
  onEdit = null,
  onView = null,
  onCreateTasks = null
}) => {
  const [showVerification, setShowVerification] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done':
      case 'Completed': return '#38a169';
      case 'In Progress': return '#3182ce';
      case 'Ready for Review': return '#d69e2e';
      case 'Ready': return '#00b5d8';
      case 'Draft': 
      default: return '#718096';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Done':
      case 'Completed': return '✅';
      case 'In Progress': return '🔄';
      case 'Ready for Review': return '👀';
      case 'Ready': return '📋';
      case 'Draft': 
      default: return '📝';
    }
  };

  const getStatusDisplayName = (status) => {
    if (status === 'Done') return 'Completed';
    return status;
  };

  const formatStoryId = (storyId) => {
    return `Story ${storyId}`;
  };


  return (
    <div
      data-testid={`story-${story.id}-panel`}
      className={`story-panel story-panel--epic-${story.epicId || '1'}`}
      aria-label={`${formatStoryId(story.id)}: ${story.title}`}
      style={{
        backgroundColor: '#1e2536',
        borderRadius: '12px',
        border: '1px solid rgba(100, 149, 237, 0.2)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        position: 'relative',
        height: '100%',
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.borderColor = 'rgba(100, 149, 237, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
        e.currentTarget.style.borderColor = 'rgba(100, 149, 237, 0.2)';
      }}
    >
      {/* Header Section */}
      <div 
        className="story-panel__header"
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(100, 149, 237, 0.1) 0%, rgba(100, 149, 237, 0.05) 100%)',
          borderBottom: '1px solid rgba(100, 149, 237, 0.1)',
          flex: '0 0 auto'
        }}
      >
        {/* Story ID and Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>
              {getStatusIcon(story.status)}
            </span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '700',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {formatStoryId(story.id)}
            </span>
          </div>
          <span 
            data-testid={`story-${story.id}-status-badge`}
            aria-label={`Status: ${getStatusDisplayName(story.status)}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '10px',
              fontWeight: '700',
              color: 'white',
              backgroundColor: getStatusColor(story.status),
              padding: '3px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {getStatusDisplayName(story.status)}
          </span>
        </div>
        
        {/* Story Title */}
        <h4 
          data-testid={`story-${story.id}-title`}
          style={{ 
            margin: '0 0 8px 0',
            fontSize: '15px',
            fontWeight: '600',
            color: '#f1f5f9',
            lineHeight: '1.4',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {story.title}
        </h4>

      </div>

      {/* Card Body */}
      <div 
        style={{ 
          padding: '16px',
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Description */}
        <p 
          data-testid={`story-${story.id}-description`}
          style={{ 
            margin: '0 0 12px 0',
            fontSize: '13px',
            color: '#94a3b8',
            lineHeight: '1.5',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            flex: '1 1 auto'
          }}
        >
          {story.description || 'No description available'}
        </p>

        {/* Footer Actions */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: '1px solid rgba(100, 149, 237, 0.1)'
        }}>
          {/* Parallel Indicator */}
          <div 
            data-testid={`story-${story.id}-parallel-indicator`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ParallelIndicator
              multiDevOK={story.parallelWork?.multiDevOK || false}
              reason={story.parallelWork?.reason || ''}
              storyId={story.id}
              size="small"
            />
            
            {/* Acceptance Criteria Count */}
            {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
              <span 
                data-testid={`story-${story.id}-acceptance-criteria-count`}
                aria-label={`${story.acceptanceCriteria.length} acceptance criteria`}
                style={{ 
                  fontSize: '11px', 
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                📋 {story.acceptanceCriteria.length}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Verification Score */}
            {verification && (
              <div
                data-testid={`story-${story.id}-verification-score`}
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: verification.score >= 80 ? '#38a169' : 
                         verification.score >= 60 ? '#d69e2e' : '#e53e3e',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  minWidth: '32px',
                  textAlign: 'center'
                }}
                title={`Verification score: ${verification.score}/100`}
              >
                {verification.score}
              </div>
            )}

            {/* View Button */}
            {onView && (
              <Button
                data-testid={`story-${story.id}-view-button`}
                variant="outline"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(story);
                }}
                aria-label={`View details for story ${story.id}`}
              >
                View
              </Button>
            )}

            {/* Edit Button */}
            {onEdit && (
              <Button
                variant="primary"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(story);
                }}
                data-testid={`story-${story.id}-edit-button`}
              >
                Edit
              </Button>
            )}

          </div>
        </div>
      </div>

    </div>
  );
};

StoryPanel.propTypes = {
  story: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    status: PropTypes.oneOf(['Draft', 'Ready', 'In Progress', 'Done', 'Completed', 'Ready for Review']).isRequired,
    description: PropTypes.string,
    acceptanceCriteria: PropTypes.arrayOf(PropTypes.string),
    filePath: PropTypes.string.isRequired,
    lastModified: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    epicId: PropTypes.string,
    parallelWork: PropTypes.shape({
      multiDevOK: PropTypes.bool.isRequired,
      reason: PropTypes.string.isRequired
    })
  }).isRequired,
  verification: PropTypes.shape({
    storyId: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
    summary: PropTypes.string.isRequired,
    implementationDetails: PropTypes.arrayOf(PropTypes.string).isRequired,
    keyAccomplishments: PropTypes.arrayOf(PropTypes.string).isRequired,
    technicalChallenges: PropTypes.arrayOf(PropTypes.string).isRequired,
    performanceMetrics: PropTypes.object,
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired
  }),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onEdit: PropTypes.func,
  onView: PropTypes.func,
  onCreateTasks: PropTypes.func
};

export default StoryPanel;