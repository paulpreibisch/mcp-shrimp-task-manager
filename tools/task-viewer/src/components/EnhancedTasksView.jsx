import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Badge,
  Text,
  Flex,
  Progress,
  Button,
  HStack,
  VStack,
  Spacer,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

/**
 * EnhancedTasksView component displays tasks grouped by story using Chakra UI Accordion
 * with progressive disclosure, filtering, and expand/collapse capabilities
 */
const EnhancedTasksView = ({ 
  data = [], 
  globalFilter, 
  onGlobalFilterChange, 
  statusFilter,
  onTaskClick,
  showToast 
}) => {
  const { t } = useTranslation();
  const [storyFilter, setStoryFilter] = useState('all');
  const [expandedStories, setExpandedStories] = useState([]);
  
  // Chakra UI color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  
  // Filter data based on status and story filters
  const filteredData = useMemo(() => {
    let filtered = [...data];
    
    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    // Apply story filter
    if (storyFilter && storyFilter !== 'all') {
      filtered = filtered.filter(task => (task.story || 'No Story') === storyFilter);
    }
    
    return filtered;
  }, [data, statusFilter, storyFilter]);
  
  // Get unique stories for filter dropdown
  const uniqueStories = useMemo(() => {
    const stories = new Set();
    data.forEach(task => {
      stories.add(task.story || 'No Story');
    });
    return Array.from(stories).sort();
  }, [data]);

  // Group tasks by story for accordion
  const storiesData = useMemo(() => {
    const groups = {};
    
    filteredData.forEach(task => {
      const storyKey = task.story || 'No Story';
      if (!groups[storyKey]) {
        groups[storyKey] = {
          id: storyKey,
          title: storyKey,
          description: task.storyDescription || `Tasks for ${storyKey}`,
          tasks: [],
          taskCount: 0,
          completedCount: 0,
          inProgressCount: 0,
          pendingCount: 0
        };
      }
      
      groups[storyKey].tasks.push(task);
      groups[storyKey].taskCount++;
      
      if (task.status === 'completed') {
        groups[storyKey].completedCount++;
      } else if (task.status === 'in_progress') {
        groups[storyKey].inProgressCount++;
      } else {
        groups[storyKey].pendingCount++;
      }
    });

    return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title));
  }, [filteredData]);

  // Functions for expand/collapse all
  const expandAll = () => {
    setExpandedStories(storiesData.map(story => story.id));
  };

  const collapseAll = () => {
    setExpandedStories([]);
  };

  const toggleStory = (storyId) => {
    setExpandedStories(prev => 
      prev.includes(storyId) 
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId]
    );
  };

  // Helper function to get status badge color
  const getStatusColor = (status) => {
    const colors = {
      completed: 'green',
      in_progress: 'blue', 
      pending: 'gray'
    };
    return colors[status] || 'gray';
  };

  // Helper function to get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      high: 'red',
      medium: 'yellow',
      low: 'green'
    };
    return colors[priority] || 'yellow';
  };

  // Helper function to get status label
  const getStatusLabel = (status) => {
    const labels = {
      completed: t('status.completed') || 'Completed',
      in_progress: t('status.inProgress') || 'In Progress', 
      pending: t('status.pending') || 'Pending'
    };
    return labels[status] || status;
  };

  if (data.length === 0) {
    return (
      <div className="empty-state" style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#718096'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
          No Tasks Found
        </div>
        <div style={{ fontSize: '14px' }}>
          Create tasks using the task manager to see them organized by story here.
        </div>
      </div>
    );
  }

  return (
    <Box data-testid="tasks-accordion" p={4}>
      {/* Filters and Controls */}
      <Flex
        gap={4}
        mb={6}
        align="center"
        wrap="wrap"
        justify="space-between"
      >
        <HStack spacing={4} flexWrap="wrap">
          <HStack>
            <Text fontSize="sm" fontWeight="500" color={mutedColor}>
              Filter by Story:
            </Text>
            <select
              value={storyFilter}
              onChange={(e) => setStoryFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: bgColor,
                color: textColor
              }}
            >
              <option value="all">All Stories</option>
              {uniqueStories.map(story => (
                <option key={story} value={story}>
                  {story}
                </option>
              ))}
            </select>
          </HStack>
          
          <Text fontSize="sm" color={mutedColor}>
            Showing {filteredData.length} tasks in {storiesData.length} stories
          </Text>
        </HStack>

        <HStack>
          <Button size="sm" variant="outline" onClick={expandAll}>
            Expand All
          </Button>
          <Button size="sm" variant="outline" onClick={collapseAll}>
            Collapse All
          </Button>
        </HStack>
      </Flex>

      {/* Stories Accordion */}
      <Accordion 
        allowMultiple 
        index={expandedStories.map(id => storiesData.findIndex(story => story.id === id)).filter(index => index !== -1)}
        onChange={(expandedIndexes) => {
          const newExpandedStories = Array.isArray(expandedIndexes) 
            ? expandedIndexes.map(index => storiesData[index]?.id).filter(Boolean)
            : [storiesData[expandedIndexes]?.id].filter(Boolean);
          setExpandedStories(newExpandedStories);
        }}
      >
        {storiesData.map((story, index) => (
          <AccordionItem key={story.id} border="1px solid" borderColor={borderColor} mb={4} borderRadius="md">
            <AccordionButton
              data-testid={`story-accordion-${story.id}`}
              p={4}
              _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
              _expanded={{ bg: useColorModeValue('blue.50', 'blue.900') }}
            >
              <Box flex="1" textAlign="left">
                <Flex align="center" gap={3}>
                  <Text fontSize="lg" fontWeight="bold">
                    📖 {story.title}
                  </Text>
                  <Badge colorScheme="gray" fontSize="xs">
                    {story.completedCount}/{story.taskCount}
                  </Badge>
                  <Spacer />
                  <VStack align="end" spacing={1}>
                    <Progress
                      value={story.taskCount > 0 ? (story.completedCount / story.taskCount) * 100 : 0}
                      size="sm"
                      colorScheme={story.completedCount === story.taskCount ? "green" : "blue"}
                      width="100px"
                    />
                    <Text fontSize="xs" color={mutedColor}>
                      {story.taskCount > 0 ? Math.round((story.completedCount / story.taskCount) * 100) : 0}% complete
                    </Text>
                  </VStack>
                </Flex>
                
                {/* Status breakdown */}
                <HStack mt={2} spacing={2}>
                  {story.completedCount > 0 && (
                    <Badge colorScheme="green" size="sm">
                      ✓ {story.completedCount}
                    </Badge>
                  )}
                  {story.inProgressCount > 0 && (
                    <Badge colorScheme="blue" size="sm">
                      ⏳ {story.inProgressCount}
                    </Badge>
                  )}
                  {story.pendingCount > 0 && (
                    <Badge colorScheme="gray" size="sm">
                      ⏸️ {story.pendingCount}
                    </Badge>
                  )}
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            
            <AccordionPanel pb={4}>
              <VStack align="stretch" spacing={3}>
                {/* Story description */}
                <Text fontSize="sm" color={mutedColor} fontStyle="italic">
                  {story.description}
                </Text>
                
                {/* Tasks list */}
                <VStack align="stretch" spacing={2}>
                  {story.tasks.map(task => (
                    <Box
                      key={task.id}
                      p={3}
                      border="1px solid"
                      borderColor={useColorModeValue('gray.100', 'gray.600')}
                      borderRadius="md"
                      bg={useColorModeValue('white', 'gray.800')}
                      cursor="pointer"
                      _hover={{ bg: useColorModeValue('gray.50', 'gray.700'), transform: 'translateY(-1px)' }}
                      transition="all 0.2s"
                      onClick={() => onTaskClick && onTaskClick(task)}
                      data-testid={`task-card-${task.id}`}
                    >
                      <Flex align="start" gap={3}>
                        <VStack align="start" flex="1" spacing={1}>
                          <Text fontWeight="600" fontSize="md">
                            {task.name}
                          </Text>
                          {task.description && (
                            <Text fontSize="sm" color={mutedColor} noOfLines={2}>
                              {task.description}
                            </Text>
                          )}
                          <HStack spacing={2} mt={1}>
                            <Badge
                              colorScheme={getStatusColor(task.status)}
                              size="sm"
                              textTransform="capitalize"
                            >
                              {getStatusLabel(task.status)}
                            </Badge>
                            {task.priority && (
                              <Badge
                                colorScheme={getPriorityColor(task.priority)}
                                size="sm"
                                textTransform="capitalize"
                              >
                                {task.priority}
                              </Badge>
                            )}
                          </HStack>
                        </VStack>
                        
                        <VStack align="end" spacing={1}>
                          <Text
                            fontSize="xs"
                            fontFamily="mono"
                            color={mutedColor}
                            cursor="pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(task.id);
                                if (showToast) {
                                  showToast('Task ID copied to clipboard', 'success');
                                }
                              }
                            }}
                            title={`Click to copy: ${task.id}`}
                          >
                            {task.id.slice(0, 8)}...
                          </Text>
                          {(task.agent || task.assignee) && (
                            <Text fontSize="xs" color={mutedColor}>
                              {task.agent || task.assignee}
                            </Text>
                          )}
                        </VStack>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
      
      {storiesData.length === 0 && (
        <Box
          textAlign="center"
          p={16}
          color={mutedColor}
        >
          <Text fontSize="6xl" mb={4}>📋</Text>
          <Text fontSize="xl" fontWeight="600" mb={2}>
            No Tasks Found
          </Text>
          <Text fontSize="md">
            Create tasks using the task manager to see them organized by story here.
          </Text>
        </Box>
      )}
    </Box>
  );
};

EnhancedTasksView.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    story: PropTypes.string,
    status: PropTypes.oneOf(['pending', 'in_progress', 'completed']).isRequired,
    agent: PropTypes.string,
    assignee: PropTypes.string,
    priority: PropTypes.oneOf(['low', 'medium', 'high'])
  })),
  globalFilter: PropTypes.string,
  onGlobalFilterChange: PropTypes.func,
  statusFilter: PropTypes.string,
  onTaskClick: PropTypes.func,
  showToast: PropTypes.func
};

export default EnhancedTasksView;