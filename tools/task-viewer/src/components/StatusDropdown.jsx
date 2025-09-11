import React from 'react';
import PropTypes from 'prop-types';

/**
 * StatusDropdown component for selecting story status with validation
 */
const StatusDropdown = ({ 
  value = 'Draft', 
  onChange, 
  storyId = '',
  disabled = false 
}) => {
  const statuses = [
    { value: 'Draft', label: 'Draft', color: '#6c757d', icon: '📝' },
    { value: 'Ready', label: 'Ready', color: '#17a2b8', icon: '📋' },
    { value: 'In Progress', label: 'In Progress', color: '#007bff', icon: '🔄' },
    { value: 'Ready for Review', label: 'Ready for Review', color: '#ffc107', icon: '👀' },
    { value: 'Done', label: 'Done', color: '#28a745', icon: '✅' }
  ];

  const getValidTransitions = (currentStatus) => {
    const transitions = {
      'Draft': ['Ready', 'In Progress'],
      'Ready': ['In Progress', 'Draft'],
      'In Progress': ['Ready for Review', 'Ready', 'Draft'],
      'Ready for Review': ['Done', 'In Progress'],
      'Done': ['Ready for Review'] // Allow rollback from Done if needed
    };
    
    return transitions[currentStatus] || [];
  };

  const isValidTransition = (fromStatus, toStatus) => {
    if (fromStatus === toStatus) return true;
    const validTransitions = getValidTransitions(fromStatus);
    return validTransitions.includes(toStatus);
  };

  const currentStatus = statuses.find(s => s.value === value);
  const validTransitions = getValidTransitions(value);

  return (
    <div className="status-dropdown-container">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="status-dropdown w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        data-testid={`story-${storyId}-status-dropdown`}
        style={{
          background: `linear-gradient(90deg, ${currentStatus?.color}15 0%, ${currentStatus?.color}08 100%)`,
          borderColor: `${currentStatus?.color}40`
        }}
      >
        {statuses.map((status) => {
          const isValid = isValidTransition(value, status.value);
          
          return (
            <option 
              key={status.value} 
              value={status.value}
              disabled={!isValid}
              style={{
                color: isValid ? 'inherit' : '#ccc',
                fontWeight: status.value === value ? 'bold' : 'normal'
              }}
            >
              {status.icon} {status.label}
              {!isValid && status.value !== value ? ' (Invalid transition)' : ''}
            </option>
          );
        })}
      </select>

      {/* Status transition help */}
      <div className="mt-2 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <span>{currentStatus?.icon}</span>
          <span className="font-medium">{currentStatus?.label}</span>
          {validTransitions.length > 0 && (
            <>
              <span className="mx-2">→</span>
              <span>Can transition to: {validTransitions.join(', ')}</span>
            </>
          )}
        </div>
      </div>

      {/* Status explanation */}
      <div className="mt-2 text-xs text-gray-500">
        {getStatusExplanation(value)}
      </div>
    </div>
  );
};

function getStatusExplanation(status) {
  const explanations = {
    'Draft': 'Story is being written and refined',
    'Ready': 'Story is complete and ready for development',
    'In Progress': 'Story is currently being implemented',
    'Ready for Review': 'Implementation is complete, awaiting review',
    'Done': 'Story has been implemented and verified'
  };
  
  return explanations[status] || '';
}

StatusDropdown.propTypes = {
  value: PropTypes.oneOf(['Draft', 'Ready', 'In Progress', 'Ready for Review', 'Done']),
  onChange: PropTypes.func,
  storyId: PropTypes.string,
  disabled: PropTypes.bool
};

export default StatusDropdown;