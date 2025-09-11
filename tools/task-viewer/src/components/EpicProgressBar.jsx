import React from 'react';
import PropTypes from 'prop-types';
import { 
  Progress, 
  CircularProgress, 
  CircularProgressLabel,
  Box, 
  Text, 
  HStack, 
  VStack,
  Tooltip,
  Badge
} from '@chakra-ui/react';

/**
 * EpicProgressBar component displays visual progress indicators for epics
 * showing story completion and task progress with color coding
 */
const EpicProgressBar = ({ 
  epic,
  verifications = {},
  variant = 'linear', // 'linear' or 'circular'
  size = 'md', // 'sm', 'md', 'lg'
  showDetails = true,
  showScore = true
}) => {
  // Calculate epic progress
  const calculateProgress = () => {
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
    const completed = epic.stories.filter(story => story.status === 'Done' || story.status === 'Completed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate average verification score
    const epicVerifications = epic.stories
      .map(story => verifications[story.id])
      .filter(Boolean);
    
    const averageScore = epicVerifications.length > 0 
      ? Math.round(epicVerifications.reduce((sum, v) => sum + v.score, 0) / epicVerifications.length)
      : null;

    const storiesNeedingAttention = epic.stories.filter(story => {
      const verification = verifications[story.id];
      return verification && verification.score < 80;
    });

    return {
      total,
      completed,
      percentage,
      averageScore,
      storiesNeedingAttention
    };
  };

  const progress = calculateProgress();
  
  // Determine color scheme based on completion percentage
  const getColorScheme = (percentage) => {
    if (percentage >= 80) return 'green';
    if (percentage >= 50) return 'yellow';
    return 'red';
  };

  const colorScheme = getColorScheme(progress.percentage);

  // Size configurations
  const sizeConfig = {
    sm: {
      progressHeight: '6px',
      circularSize: '40px',
      fontSize: 'xs',
      textSize: 'sm'
    },
    md: {
      progressHeight: '8px',
      circularSize: '60px',
      fontSize: 'sm',
      textSize: 'md'
    },
    lg: {
      progressHeight: '12px',
      circularSize: '80px',
      fontSize: 'md',
      textSize: 'lg'
    }
  };

  const config = sizeConfig[size];

  const progressElement = variant === 'circular' ? (
    <CircularProgress 
      value={progress.percentage} 
      color={`${colorScheme}.400`}
      size={config.circularSize}
      thickness="8px"
      data-testid={`epic-progress-${epic.id}`}
    >
      <CircularProgressLabel fontSize={config.fontSize} fontWeight="bold">
        {progress.percentage}%
      </CircularProgressLabel>
    </CircularProgress>
  ) : (
    <Box width="100%" data-testid={`epic-progress-${epic.id}`}>
      <Progress 
        value={progress.percentage}
        colorScheme={colorScheme}
        height={config.progressHeight}
        borderRadius="md"
        bg="gray.200"
        _dark={{
          bg: "gray.600"
        }}
      />
    </Box>
  );

  if (!showDetails) {
    return progressElement;
  }

  return (
    <Box data-testid={`epic-progress-container-${epic.id}`}>
      {variant === 'circular' ? (
        <VStack spacing={2} align="center">
          {progressElement}
          {showDetails && (
            <VStack spacing={1} align="center">
              <Text fontSize={config.textSize} fontWeight="semibold">
                {progress.completed} / {progress.total} stories
              </Text>
              {showScore && progress.averageScore && (
                <Badge 
                  colorScheme={progress.averageScore >= 80 ? 'green' : progress.averageScore >= 60 ? 'yellow' : 'red'}
                  variant="solid"
                  fontSize="xs"
                >
                  Avg Score: {progress.averageScore}
                </Badge>
              )}
              {progress.storiesNeedingAttention.length > 0 && (
                <Tooltip 
                  label={`${progress.storiesNeedingAttention.length} stories have verification scores below 80`}
                  placement="top"
                >
                  <Badge colorScheme="orange" variant="outline" fontSize="xs">
                    ⚠️ {progress.storiesNeedingAttention.length} need attention
                  </Badge>
                </Tooltip>
              )}
            </VStack>
          )}
        </VStack>
      ) : (
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between" align="center">
            <Text fontSize={config.textSize} fontWeight="semibold">
              Epic Progress
            </Text>
            <Text fontSize={config.fontSize} color="gray.600" _dark={{ color: "gray.300" }}>
              {progress.percentage}%
            </Text>
          </HStack>
          
          {progressElement}
          
          <HStack justify="space-between" align="center" fontSize={config.fontSize}>
            <Text color="gray.600" _dark={{ color: "gray.300" }}>
              {progress.completed} of {progress.total} stories completed
            </Text>
            
            {showScore && progress.averageScore && (
              <Badge 
                colorScheme={progress.averageScore >= 80 ? 'green' : progress.averageScore >= 60 ? 'yellow' : 'red'}
                variant="solid"
                fontSize="xs"
              >
                Avg: {progress.averageScore}
              </Badge>
            )}
          </HStack>
          
          {progress.storiesNeedingAttention.length > 0 && (
            <Tooltip 
              label={`${progress.storiesNeedingAttention.length} stories have verification scores below 80 and may need attention`}
              placement="bottom"
            >
              <Badge 
                colorScheme="orange" 
                variant="outline" 
                fontSize="xs"
                alignSelf="flex-start"
                cursor="help"
              >
                ⚠️ {progress.storiesNeedingAttention.length} stories need attention
              </Badge>
            </Tooltip>
          )}
        </VStack>
      )}
    </Box>
  );
};

EpicProgressBar.propTypes = {
  epic: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    stories: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        status: PropTypes.string.isRequired
      })
    )
  }).isRequired,
  verifications: PropTypes.object,
  variant: PropTypes.oneOf(['linear', 'circular']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showDetails: PropTypes.bool,
  showScore: PropTypes.bool
};

export default EpicProgressBar;