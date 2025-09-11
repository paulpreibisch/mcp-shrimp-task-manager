import React from 'react';
import PropTypes from 'prop-types';
import Button from './Button';

/**
 * EmptyState Component
 * Shows a user-friendly empty state with call-to-action for document creation
 */
const EmptyState = ({ 
  documentType = 'Document',
  onCreateClick,
  icon = '📄',
  description
}) => {
  const defaultDescription = description || `Get started by creating your ${documentType.toLowerCase()}`;

  return (
    <div 
      className="empty-state-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '60px 20px',
        minHeight: '300px',
        backgroundColor: '#1a202c',
        borderRadius: '8px',
        border: '1px solid #2d3748'
      }}
    >
      {/* Icon */}
      <div 
        style={{
          fontSize: '3rem',
          marginBottom: '16px',
          opacity: 0.8
        }}
        role="img"
        aria-label={`${documentType} icon`}
      >
        {icon}
      </div>

      {/* Title */}
      <h3 
        style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#e5e5e5',
          margin: '0 0 8px 0'
        }}
      >
        No {documentType} Found
      </h3>

      {/* Description */}
      <p 
        style={{
          color: '#9ca3af',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          marginBottom: '24px',
          maxWidth: '300px'
        }}
      >
        {defaultDescription}
      </p>

      {/* Create Button */}
      <Button
        variant="primary"
        size="medium"
        onClick={onCreateClick}
        icon="✏️"
        iconPosition="left"
        aria-label={`Create new ${documentType.toLowerCase()}`}
        style={{
          fontSize: '14px',
          padding: '10px 20px'
        }}
      >
        Create {documentType}
      </Button>
    </div>
  );
};

EmptyState.propTypes = {
  documentType: PropTypes.string,
  onCreateClick: PropTypes.func.isRequired,
  icon: PropTypes.string,
  description: PropTypes.string
};

export default EmptyState;