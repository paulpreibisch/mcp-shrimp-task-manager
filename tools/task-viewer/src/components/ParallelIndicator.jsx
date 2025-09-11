import React from 'react';
import PropTypes from 'prop-types';

/**
 * ParallelIndicator component shows whether a story can be worked on by multiple developers
 * 👥 = Multi-Dev OK, 👤 = Single Dev Only
 */
const ParallelIndicator = ({ 
  multiDevOK = false, 
  reason = '', 
  storyId = '',
  size = 'normal' 
}) => {
  const icon = multiDevOK ? '👥' : '👤';
  const title = multiDevOK ? 'Multi-Dev OK' : 'Single Dev Only';
  const tooltipText = reason ? `${title}: ${reason}` : title;
  
  const sizeStyles = {
    small: { fontSize: '16px' },
    normal: { fontSize: '20px' },
    large: { fontSize: '24px' }
  };

  return (
    <div
      data-testid={`story-${storyId}-parallel-indicator`}
      className={`parallel-indicator parallel-indicator--${multiDevOK ? 'multi' : 'single'}`}
      aria-label={tooltipText}
      title={tooltipText}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'help',
        ...sizeStyles[size]
      }}
    >
      <span role="img" aria-label={title}>
        {icon}
      </span>
      {reason && (
        <div 
          className="parallel-indicator__tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#333',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            opacity: 0,
            visibility: 'hidden',
            transition: 'opacity 0.2s, visibility 0.2s',
            marginBottom: '5px',
            maxWidth: '200px',
            textAlign: 'center',
            lineHeight: '1.4'
          }}
        >
          {tooltipText}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #333'
            }}
          />
        </div>
      )}
    </div>
  );
};

ParallelIndicator.propTypes = {
  multiDevOK: PropTypes.bool,
  reason: PropTypes.string,
  storyId: PropTypes.string,
  size: PropTypes.oneOf(['small', 'normal', 'large'])
};

// CSS-in-JS styles for hover effects
const styles = `
.parallel-indicator {
  position: relative;
}

.parallel-indicator:hover .parallel-indicator__tooltip {
  opacity: 1;
  visibility: visible;
}

.parallel-indicator--multi {
  color: #28a745;
}

.parallel-indicator--single {
  color: #ffc107;
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('parallel-indicator-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'parallel-indicator-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default ParallelIndicator;