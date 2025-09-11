import React from 'react';
import PropTypes from 'prop-types';

/**
 * VerificationView component displays verification results for a story
 */
const VerificationView = ({ 
  verification, 
  storyId = '',
  isLoading = false,
  error = null 
}) => {
  if (isLoading) {
    return (
      <div 
        data-testid={`story-${storyId}-verification-view`}
        className="verification-view verification-view--loading"
        aria-label={`Verification results for Story ${storyId} (loading)`}
        style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '14px', color: '#6c757d' }}>
          Loading verification data... ⏳
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        data-testid={`story-${storyId}-verification-view`}
        className="verification-view verification-view--error"
        aria-label={`Verification results for Story ${storyId} (error)`}
        style={{
          padding: '16px',
          backgroundColor: '#f8d7da',
          borderRadius: '8px',
          border: '1px solid #f5c6cb',
          color: '#721c24'
        }}
      >
        <div style={{ fontWeight: '500', marginBottom: '8px' }}>
          ❌ Verification Error
        </div>
        <div style={{ fontSize: '14px' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!verification) {
    return (
      <div 
        data-testid={`story-${storyId}-verification-view`}
        className="verification-view verification-view--empty"
        aria-label={`Verification results for Story ${storyId} (not available)`}
        style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '14px', color: '#6c757d' }}>
          No verification data available
        </div>
        <div style={{ fontSize: '12px', color: '#adb5bd', marginTop: '4px' }}>
          Story needs to be completed for verification
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return '#28a745'; // Green
    if (score >= 60) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return '✅';
    if (score >= 60) return '⚠️';
    return '❌';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div 
      data-testid={`story-${storyId}-verification-view`}
      className="verification-view"
      aria-label={`Verification results for Story ${storyId}`}
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        overflow: 'hidden'
      }}
    >
      {/* Header with score */}
      <div 
        className="verification-header"
        style={{
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>
            {getScoreIcon(verification.score)}
          </span>
          <div>
            <div style={{ fontWeight: '500', color: '#495057' }}>
              Verification Results
            </div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              {formatTimestamp(verification.timestamp)}
            </div>
          </div>
        </div>
        <div 
          data-testid={`story-${storyId}-verification-score`}
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: getScoreColor(verification.score)
          }}
        >
          {verification.score}
          <span style={{ fontSize: '16px', color: '#6c757d' }}>/100</span>
        </div>
      </div>

      {/* Content */}
      <div className="verification-content" style={{ padding: '16px' }}>
        {/* Summary */}
        {verification.summary && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#495057',
              marginBottom: '8px' 
            }}>
              Summary
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#6c757d',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {verification.summary}
            </div>
          </div>
        )}

        {/* Key Accomplishments */}
        {verification.keyAccomplishments && verification.keyAccomplishments.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#495057',
              marginBottom: '8px' 
            }}>
              Key Accomplishments
            </div>
            <ul style={{ 
              fontSize: '14px', 
              color: '#6c757d',
              paddingLeft: '16px',
              margin: 0
            }}>
              {verification.keyAccomplishments.map((accomplishment, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  {accomplishment}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Implementation Details */}
        {verification.implementationDetails && verification.implementationDetails.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#495057',
              marginBottom: '8px' 
            }}>
              Implementation Details
            </div>
            <ul style={{ 
              fontSize: '14px', 
              color: '#6c757d',
              paddingLeft: '16px',
              margin: 0
            }}>
              {verification.implementationDetails.map((detail, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Technical Challenges */}
        {verification.technicalChallenges && verification.technicalChallenges.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#495057',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🔧</span>
              Technical Challenges
            </div>
            <ul style={{ 
              fontSize: '14px', 
              color: '#6c757d',
              paddingLeft: '16px',
              margin: 0
            }}>
              {verification.technicalChallenges.map((challenge, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  {challenge}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Performance Metrics (if available) */}
        {verification.performanceMetrics && Object.keys(verification.performanceMetrics).length > 0 && (
          <div>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#495057',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>📊</span>
              Performance Metrics
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#6c757d',
              backgroundColor: '#f8f9fa',
              padding: '8px',
              borderRadius: '4px',
              fontFamily: 'Monaco, monospace'
            }}>
              {JSON.stringify(verification.performanceMetrics, null, 2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

VerificationView.propTypes = {
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
  storyId: PropTypes.string,
  isLoading: PropTypes.bool,
  error: PropTypes.string
};

export default VerificationView;