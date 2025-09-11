import React from 'react';
import { Box, VStack, HStack, Text, Code } from '@chakra-ui/react';
import ParallelTaskIndicator from './ParallelTaskIndicator.jsx';

/**
 * Example usage of ParallelTaskIndicator component
 * This shows how the component can be integrated into task tables
 */
const ParallelTaskIndicatorExample = () => {
  const exampleTasks = [
    {
      id: 'task-1',
      name: 'Create Login Component',
      multiDevOK: false,
      reason: 'Single component requiring cohesive design',
      userCount: 1
    },
    {
      id: 'task-2', 
      name: 'Implement API Endpoints',
      multiDevOK: true,
      reason: 'Independent endpoints can be developed separately',
      userCount: 3,
      isParallelizable: true
    },
    {
      id: 'task-3',
      name: 'Write Unit Tests',
      multiDevOK: false,
      isParallelizable: true,
      reason: 'Can be parallelized with similar testing tasks',
      userCount: 2
    }
  ];

  return (
    <Box p={6}>
      <VStack spacing={4} align="stretch">
        <Text fontSize="xl" fontWeight="bold">
          ParallelTaskIndicator Examples
        </Text>
        
        {exampleTasks.map(task => (
          <HStack key={task.id} spacing={4} align="center">
            <ParallelTaskIndicator
              taskId={task.id}
              multiDevOK={task.multiDevOK}
              isParallelizable={task.isParallelizable}
              reason={task.reason}
              userCount={task.userCount}
            />
            <VStack align="start" spacing={1}>
              <Text fontWeight="medium">{task.name}</Text>
              <Code fontSize="sm">taskId: {task.id}</Code>
            </VStack>
          </HStack>
        ))}
        
        <Box mt={6} p={4} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontWeight="bold" mb={2}>Usage in Task Table:</Text>
          <Code display="block" whiteSpace="pre-wrap" fontSize="xs">
{`// In your task table column definition:
{
  header: 'Parallel',
  cell: (info) => (
    <ParallelTaskIndicator
      taskId={info.row.original.id}
      multiDevOK={info.row.original.multiDevOK || false}
      isParallelizable={info.row.original.isParallelizable || false}
      reason={info.row.original.parallelReason || ''}
      userCount={info.row.original.userCount || 1}
    />
  ),
  size: 100
}`}
          </Code>
        </Box>
      </VStack>
    </Box>
  );
};

export default ParallelTaskIndicatorExample;