import React from 'react';
import PropTypes from 'prop-types';
import { Badge, Tooltip, Icon } from '@chakra-ui/react';
import { FiUsers, FiUser } from 'react-icons/fi';

/**
 * ParallelTaskIndicator component shows whether a task can be worked on by multiple developers
 * Uses Chakra UI Badge and Tooltip for consistent styling
 */
const ParallelTaskIndicator = ({ 
  multiDevOK = false, 
  reason = '', 
  taskId = '',
  userCount = 1,
  size = 'md',
  isParallelizable = false 
}) => {
  // A task can have parallel work if either multiDevOK is true or it's parallelizable with other tasks
  const canParallel = multiDevOK || isParallelizable;
  const effectiveUserCount = canParallel ? Math.max(userCount, 2) : 1;
  
  const icon = canParallel ? FiUsers : FiUser;
  const title = canParallel ? 'Can Run in Parallel' : 'Sequential Task';
  const tooltipText = reason ? `${title}: ${reason}` : title;
  
  // Determine badge colors based on parallel capability
  const badgeColorScheme = canParallel ? 'green' : 'yellow';
  const badgeVariant = canParallel ? 'solid' : 'outline';

  const badgeContent = (
    <Badge
      colorScheme={badgeColorScheme}
      variant={badgeVariant}
      display="inline-flex"
      alignItems="center"
      gap={1}
      px={2}
      py={1}
      borderRadius="md"
      fontSize="xs"
      data-testid={`parallel-indicator-${taskId}`}
    >
      <Icon as={icon} boxSize={3} />
      {canParallel && effectiveUserCount > 1 && (
        <span>{effectiveUserCount}</span>
      )}
    </Badge>
  );

  // If no reason provided, return badge without tooltip
  if (!reason && !tooltipText) {
    return badgeContent;
  }

  return (
    <Tooltip
      label={tooltipText}
      placement="top"
      hasArrow
      bg="gray.700"
      color="white"
      fontSize="sm"
      px={3}
      py={2}
      borderRadius="md"
    >
      {badgeContent}
    </Tooltip>
  );
};

ParallelTaskIndicator.propTypes = {
  multiDevOK: PropTypes.bool,
  reason: PropTypes.string,
  taskId: PropTypes.string.isRequired,
  userCount: PropTypes.number,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  isParallelizable: PropTypes.bool
};

export default ParallelTaskIndicator;