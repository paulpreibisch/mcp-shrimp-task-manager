import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Collapse,
  IconButton,
  Tooltip,
  Skeleton,
  SkeletonText,
  useColorModeValue,
  ScaleFade,
} from '@chakra-ui/react';
import { MdExpandMore, MdChevronRight, MdInfo } from 'react-icons/md';
import VerificationView from './VerificationView.jsx';
import ParallelIndicator from './ParallelIndicator.jsx';
import Button from './Button.jsx';

/**
 * StoryPanel component displays a story card with progressive disclosure for details
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
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Chakra UI color mode values
  const bgColor = useColorModeValue('white', '#1e2536');
  const borderColor = useColorModeValue('rgba(100, 149, 237, 0.2)', 'rgba(100, 149, 237, 0.2)');
  const textColor = useColorModeValue('gray.800', '#f1f5f9');
  const mutedColor = useColorModeValue('gray.600', '#94a3b8');
  const headerBg = useColorModeValue('rgba(100, 149, 237, 0.05)', 'rgba(100, 149, 237, 0.1)');

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

  // Handle expand/collapse with lazy loading
  const toggleExpansion = () => {
    if (!isExpanded && !detailsLoaded) {
      setLoadingDetails(true);
      // Simulate lazy loading of detailed content
      setTimeout(() => {
        setDetailsLoaded(true);
        setLoadingDetails(false);
      }, 300);
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <Box
      data-testid={`story-${story.id}-panel`}
      className={`story-panel story-panel--epic-${story.epicId || '1'}`}
      aria-label={`${formatStoryId(story.id)}: ${story.title}`}
      bg={bgColor}
      borderRadius="12px"
      border="1px solid"
      borderColor={borderColor}
      boxShadow="0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      overflow="hidden"
      transition="all 0.3s ease"
      position="relative"
      height="100%"
      minHeight="320px"
      display="flex"
      flexDirection="column"
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        borderColor: 'rgba(100, 149, 237, 0.4)'
      }}
    >
      {/* Header Section */}
      <Box 
        className="story-panel__header"
        data-testid={`story-${story.id}-header`}
        p={4}
        bg={headerBg}
        borderBottom="1px solid"
        borderBottomColor={borderColor}
        flex="0 0 auto"
      >
        {/* Story ID and Status */}
        <HStack 
          data-testid={`story-${story.id}-header-row`}
          justify="space-between"
          mb={3}
        >
          <HStack data-testid={`story-${story.id}-id-container`} spacing={2}>
            <Text data-testid={`story-${story.id}-status-icon`} fontSize="lg">
              {getStatusIcon(story.status)}
            </Text>
            <Text 
              data-testid={`story-${story.id}-id-label`}
              fontSize="sm"
              fontWeight="700"
              color={mutedColor}
              textTransform="uppercase"
              letterSpacing="0.5px"
            >
              {formatStoryId(story.id)}
            </Text>
          </HStack>
          <Badge 
            data-testid={`story-${story.id}-status-badge`}
            aria-label={`Status: ${getStatusDisplayName(story.status)}`}
            colorScheme={getStatusColor(story.status) === '#38a169' ? 'green' : 
                        getStatusColor(story.status) === '#3182ce' ? 'blue' : 
                        getStatusColor(story.status) === '#d69e2e' ? 'yellow' : 
                        getStatusColor(story.status) === '#00b5d8' ? 'cyan' : 'gray'}
            size="sm"
            textTransform="uppercase"
            letterSpacing="0.5px"
          >
            {getStatusDisplayName(story.status)}
          </Badge>
        </HStack>
        
        {/* Story Title */}
        <Text 
          data-testid={`story-${story.id}-title`}
          fontSize="md"
          fontWeight="600"
          color={textColor}
          lineHeight="1.4"
          noOfLines={2}
          mb={2}
        >
          {story.title}
        </Text>
        
        {/* Progressive Disclosure Toggle */}
        <HStack justify="space-between" align="center">
          <Text fontSize="xs" color={mutedColor}>
            {isExpanded ? 'Hide details' : 'Show more details'}
          </Text>
          <Tooltip label={isExpanded ? 'Collapse story details' : 'Expand story details'} placement="top">
            <IconButton
              data-testid={`story-${story.id}-expand-toggle-button`}
              size="xs"
              variant="ghost"
              icon={isExpanded ? <MdExpandMore /> : <MdChevronRight />}
              onClick={toggleExpansion}
              aria-label={isExpanded ? 'Collapse story details' : 'Expand story details'}
              color={mutedColor}
              _hover={{ color: textColor }}
            />
          </Tooltip>
        </HStack>

      </Box>

      {/* Card Body */}
      <VStack 
        data-testid={`story-${story.id}-body`}
        p={4}
        flex="1 1 auto"
        align="stretch"
        spacing={4}
      >
        {/* Summary Description (Always Visible) */}
        <Text 
          data-testid={`story-${story.id}-description`}
          fontSize="sm"
          color={mutedColor}
          lineHeight="1.5"
          noOfLines={isExpanded ? undefined : 3}
          flex="1 1 auto"
        >
          {story.description || 'No description available'}
        </Text>
        
        {/* Progressive Disclosure Content */}
        <Collapse in={isExpanded} animateOpacity>
          <ScaleFade in={isExpanded && !loadingDetails} initialScale={0.95}>
            {loadingDetails ? (
              <VStack spacing={3} align="start">
                <Skeleton height="16px" width="70%" />
                <SkeletonText noOfLines={2} spacing={2} skeletonHeight={2} />
                <HStack spacing={2}>
                  <Skeleton height="20px" width="80px" />
                  <Skeleton height="20px" width="60px" />
                </HStack>
              </VStack>
            ) : (
              <VStack spacing={4} align="start">
                {/* Detailed Information */}
                {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                  <Box data-testid={`story-${story.id}-acceptance-criteria-section`}>
                    <HStack mb={2}>
                      <MdInfo color={mutedColor} />
                      <Text fontWeight="semibold" fontSize="sm" color={textColor}>
                        Acceptance Criteria
                      </Text>
                    </HStack>
                    <VStack data-testid={`story-${story.id}-acceptance-criteria-list`} align="start" spacing={1} pl={6}>
                      {story.acceptanceCriteria.slice(0, 3).map((criteria, index) => (
                        <Text key={index} fontSize="xs" color={mutedColor} lineHeight="1.4">
                          • {criteria}
                        </Text>
                      ))}
                      {story.acceptanceCriteria.length > 3 && (
                        <Text fontSize="xs" color={mutedColor} fontStyle="italic">
                          +{story.acceptanceCriteria.length - 3} more criteria
                        </Text>
                      )}
                    </VStack>
                  </Box>
                )}
                
                {/* Verification Details */}
                {verification && (
                  <Box data-testid={`story-${story.id}-verification-details-section`}>
                    <Text fontWeight="semibold" fontSize="sm" color={textColor} mb={2}>
                      Verification Status
                    </Text>
                    <HStack spacing={3}>
                      <Badge 
                        colorScheme={verification.score >= 80 ? 'green' : verification.score >= 60 ? 'yellow' : 'red'}
                        size="sm"
                      >
                        Score: {verification.score}/100
                      </Badge>
                      <Text fontSize="xs" color={mutedColor} noOfLines={2}>
                        {verification.summary}
                      </Text>
                    </HStack>
                  </Box>
                )}
                
                {/* Story Metadata */}
                <Box data-testid={`story-${story.id}-metadata-section`}>
                  <Text fontWeight="semibold" fontSize="sm" color={textColor} mb={2}>
                    Story Information
                  </Text>
                  <VStack data-testid={`story-${story.id}-metadata-list`} align="start" spacing={1}>
                    {story.epicId && (
                      <HStack>
                        <Text fontSize="xs" color={mutedColor} minW="60px">Epic:</Text>
                        <Badge size="sm" colorScheme="blue">Epic {story.epicId}</Badge>
                      </HStack>
                    )}
                    {story.lastModified && (
                      <HStack>
                        <Text fontSize="xs" color={mutedColor} minW="60px">Updated:</Text>
                        <Text fontSize="xs" color={mutedColor}>
                          {new Date(story.lastModified).toLocaleDateString()}
                        </Text>
                      </HStack>
                    )}
                  </VStack>
                </Box>
              </VStack>
            )}
          </ScaleFade>
        </Collapse>

        {/* Footer Actions */}
        <HStack 
          data-testid={`story-${story.id}-footer`}
          justify="space-between"
          mt="auto"
          pt={3}
          borderTop="1px solid"
          borderTopColor={borderColor}
        >
          {/* Parallel Indicator */}
          <HStack 
            data-testid={`story-${story.id}-parallel-indicator`}
            spacing={2}
          >
            <ParallelIndicator
              multiDevOK={story.parallelWork?.multiDevOK || false}
              reason={story.parallelWork?.reason || ''}
              storyId={story.id}
              size="small"
            />
            
            {/* Acceptance Criteria Count */}
            {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
              <Tooltip label={`${story.acceptanceCriteria.length} acceptance criteria`} placement="top">
                <HStack 
                  data-testid={`story-${story.id}-acceptance-criteria-count`}
                  spacing={1}
                >
                  <Text fontSize="xs">📋</Text>
                  <Text fontSize="xs" color={mutedColor}>
                    {story.acceptanceCriteria.length}
                  </Text>
                </HStack>
              </Tooltip>
            )}
          </HStack>

          {/* Action Buttons */}
          <HStack data-testid={`story-${story.id}-actions`} spacing={2}>
            {/* Verification Score */}
            {verification && (
              <Tooltip label={`Verification score: ${verification.score}/100`} placement="top">
                <Badge
                  data-testid={`story-${story.id}-verification-score`}
                  colorScheme={verification.score >= 80 ? 'green' : 
                             verification.score >= 60 ? 'yellow' : 'red'}
                  fontSize="xs"
                  fontWeight="bold"
                >
                  {verification.score}
                </Badge>
              </Tooltip>
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

          </HStack>
        </HStack>
      </VStack>

    </Box>
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