import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  IconButton,
  Collapse,
  Center,
  Tooltip,
  Skeleton,
  SkeletonText,
  useDisclosure,
  ScaleFade,
} from '@chakra-ui/react';
import { MdExpandMore, MdChevronRight, MdInfoOutline } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import ParallelTaskIndicator from './ParallelTaskIndicator';

/**
 * EnhancedTasksView component displays tasks grouped by story using TanStack Table
 * with sorting, filtering, pagination, and expandable story groups
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
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });
  const [expanded, setExpanded] = useState({});
  const [storyDetailsLoaded, setStoryDetailsLoaded] = useState({});
  const [loadingStoryDetails, setLoadingStoryDetails] = useState({});
  
  // Chakra UI color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  
  // Transform data to include story grouping information
  const transformedData = useMemo(() => {
    let filtered = [...data];
    
    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    // Apply story filter
    if (storyFilter && storyFilter !== 'all') {
      filtered = filtered.filter(task => {
        const storyTitle = task.storyContext?.title || task.story || 'No Story';
        return storyTitle === storyFilter;
      });
    }
    
    // Add normalized story information for grouping
    return filtered.map(task => {
      const storyTitle = task.storyContext?.title || task.story || 'No Story';
      const storyDescription = task.storyContext?.description || task.storyDescription || `Tasks for ${storyTitle}`;
      
      return {
        ...task,
        storyGroup: storyTitle,
        storyDescription: storyDescription,
        storyContext: task.storyContext // Ensure storyContext is preserved
      };
    });
  }, [data, statusFilter, storyFilter]);
  
  // Get unique stories for filter dropdown
  const uniqueStories = useMemo(() => {
    const stories = new Set();
    data.forEach(task => {
      const storyTitle = task.storyContext?.title || task.story || 'No Story';
      stories.add(storyTitle);
    });
    return Array.from(stories).sort();
  }, [data]);

  // Define TanStack Table columns (excluding expand column since we handle it in group headers)
  const columns = useMemo(() => [
    {
      accessorKey: 'id',
      id: 'taskId',
      header: 'Task ID',
      cell: ({ getValue, row }) => {
        const taskId = getValue();
        const shortId = taskId.slice(0, 8);
        
        return (
          <Text
            fontSize="xs"
            fontFamily="mono"
            color={mutedColor}
            cursor="pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.clipboard) {
                navigator.clipboard.writeText(taskId);
                if (showToast) {
                  showToast('Task ID copied to clipboard', 'success');
                }
              }
            }}
            title={`Click to copy: ${taskId}`}
            data-testid={`task-row-${taskId}`}
          >
            {shortId}...
          </Text>
        );
      },
      size: 100,
    },
    {
      accessorKey: 'name',
      header: 'Task Name',
      cell: ({ getValue, row }) => (
        <VStack align="start" spacing={1}>
          <Text fontWeight="600" fontSize="md">
            {getValue()}
          </Text>
          {row.original.description && (
            <Text fontSize="sm" color={mutedColor} noOfLines={2}>
              {row.original.description}
            </Text>
          )}
        </VStack>
      ),
      size: 250,
    },
    {
      accessorKey: 'storyGroup',
      header: 'Story',
      cell: ({ getValue }) => (
        <Text fontSize="sm" fontWeight="500">
          📖 {getValue()}
        </Text>
      ),
      size: 150,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue();
        return (
          <Badge
            colorScheme={getStatusColor(status)}
            size="sm"
            textTransform="capitalize"
          >
            {getStatusLabel(status)}
          </Badge>
        );
      },
      size: 100,
    },
    {
      id: 'parallel',
      header: 'Parallel',
      cell: ({ row }) => {
        const task = row.original;
        return (
          <ParallelTaskIndicator
            taskId={task.id}
            multiDevOK={task.multiDevOK || false}
            isParallelizable={task.isParallelizable || false}
            reason={task.parallelReason || ''}
            userCount={task.userCount || 1}
          />
        );
      },
      size: 90,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => {
        const priority = getValue();
        return priority ? (
          <Badge
            colorScheme={getPriorityColor(priority)}
            size="sm"
            textTransform="capitalize"
          >
            {priority}
          </Badge>
        ) : (
          <Text fontSize="sm" color={mutedColor}>—</Text>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'agent',
      header: 'Assignee',
      cell: ({ getValue, row }) => {
        const assignee = getValue() || row.original.assignee;
        return assignee ? (
          <Text fontSize="sm" color={textColor}>
            {assignee}
          </Text>
        ) : (
          <Text fontSize="sm" color={mutedColor}>—</Text>
        );
      },
      size: 120,
    },
  ], [mutedColor, textColor, showToast]);

  // Group data by story for table display
  const groupedTableData = useMemo(() => {
    const groups = {};
    
    transformedData.forEach(task => {
      const storyKey = task.storyGroup;
      if (!groups[storyKey]) {
        groups[storyKey] = {
          id: `group-${storyKey}`,
          storyGroup: storyKey,
          isGroupHeader: true,
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

    // Flatten the data into alternating group headers and task rows
    const result = [];
    Object.values(groups)
      .sort((a, b) => a.storyGroup.localeCompare(b.storyGroup))
      .forEach(group => {
        // Add group header
        result.push(group);
        
        // Add tasks if expanded
        if (expanded[group.storyGroup]) {
          result.push(...group.tasks);
        }
      });
    
    return result;
  }, [transformedData, expanded]);

  // Create TanStack Table instance
  const table = useReactTable({
    data: groupedTableData,
    columns,
    state: {
      sorting,
      pagination,
      globalFilter,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    manualPagination: false,
    enableSorting: true,
    enableFiltering: true,
  });

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

  // Helper functions for expand/collapse all
  const expandAll = () => {
    const allStoryGroups = uniqueStories.reduce((acc, story) => {
      acc[story] = true;
      return acc;
    }, {});
    setExpanded(allStoryGroups);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  // Toggle individual story expansion with lazy loading
  const toggleStoryExpansion = (storyGroup) => {
    const isCurrentlyExpanded = expanded[storyGroup];
    
    setExpanded(prev => ({
      ...prev,
      [storyGroup]: !isCurrentlyExpanded
    }));
    
    // Simulate lazy loading of story details when expanding
    if (!isCurrentlyExpanded && !storyDetailsLoaded[storyGroup]) {
      setLoadingStoryDetails(prev => ({ ...prev, [storyGroup]: true }));
      
      // Simulate async data loading
      setTimeout(() => {
        setStoryDetailsLoaded(prev => ({ ...prev, [storyGroup]: true }));
        setLoadingStoryDetails(prev => ({ ...prev, [storyGroup]: false }));
      }, 300);
    }
  };

  if (data.length === 0) {
    return (
      <Center p={16} data-testid="tasks-table">
        <VStack spacing={4} color={mutedColor}>
          <Text fontSize="6xl">📋</Text>
          <Text fontSize="xl" fontWeight="600">
            No Tasks Found
          </Text>
          <Text fontSize="md" textAlign="center">
            Create tasks using the task manager to see them organized by story here.
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box data-testid="tasks-table" p={4}>
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
            <Select
              value={storyFilter}
              onChange={(e) => setStoryFilter(e.target.value)}
              size="sm"
              width="200px"
            >
              <option value="all">All Stories</option>
              {uniqueStories.map(story => (
                <option key={story} value={story}>
                  {story}
                </option>
              ))}
            </Select>
          </HStack>
          
          <Text fontSize="sm" color={mutedColor}>
            Showing {table.getFilteredRowModel().rows.length} tasks in {uniqueStories.length} stories
          </Text>
        </HStack>

        <HStack>
          <Tooltip label="Expand all story details to see full information" placement="top">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={expandAll}
              leftIcon={<MdExpandMore />}
            >
              Expand All
            </Button>
          </Tooltip>
          <Tooltip label="Collapse all story details to summary view" placement="top">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={collapseAll}
              leftIcon={<MdChevronRight />}
            >
              Collapse All
            </Button>
          </Tooltip>
        </HStack>
      </Flex>

      {/* TanStack Table */}
      <Box
        border="1px solid"
        borderColor={borderColor}
        borderRadius="md"
        overflow="hidden"
      >
        <Table size="sm" bg={bgColor}>
          <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
            {table.getHeaderGroups().map(headerGroup => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <Th
                    key={header.id}
                    width={header.getSize()}
                    cursor={header.column.getCanSort() ? 'pointer' : 'default'}
                    onClick={header.column.getToggleSortingHandler()}
                    _hover={header.column.getCanSort() ? { bg: useColorModeValue('gray.100', 'gray.600') } : {}}
                  >
                    <Flex align="center" gap={2}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <Text fontSize="xs">
                          {header.column.getIsSorted() === 'asc' ? '↑' : 
                           header.column.getIsSorted() === 'desc' ? '↓' : '↕'}
                        </Text>
                      )}
                    </Flex>
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map(row => {
              const rowData = row.original;
              
              if (rowData.isGroupHeader) {
                // Render story group header
                const storyGroup = rowData.storyGroup;
                const isExpanded = expanded[storyGroup];
                
                return (
                  <Tr 
                    key={row.id}
                    bg={useColorModeValue('blue.50', 'blue.900')}
                    data-testid={`story-group-${storyGroup}`}
                  >
                    <Td colSpan={columns.length} py={3}>
                      <Box>
                        {/* Story Header - Always Visible */}
                        <Flex 
                          align="center" 
                          justify="space-between" 
                          p={2}
                          cursor="pointer"
                          onClick={() => toggleStoryExpansion(storyGroup)}
                          _hover={{ bg: useColorModeValue('blue.100', 'blue.800') }}
                          borderRadius="md"
                        >
                          {/* Story Summary Section */}
                          <HStack>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              icon={isExpanded ? <MdExpandMore /> : <MdChevronRight />}
                              aria-label={isExpanded ? 'Collapse story details' : 'Expand story details'}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStoryExpansion(storyGroup);
                              }}
                            />
                            <VStack align="start" spacing={1}>
                              <HStack>
                                <Text fontSize="lg" fontWeight="bold">
                                  📖 {storyGroup}
                                </Text>
                                <Badge colorScheme="gray" fontSize="xs">
                                  {rowData.completedCount}/{rowData.taskCount} tasks
                                </Badge>
                                {/* Show verification status if available */}
                                {rowData.tasks && rowData.tasks.length > 0 && rowData.tasks[0].storyContext && (
                                  <>
                                    {(rowData.tasks[0].storyContext.verified !== undefined || 
                                      rowData.tasks[0].storyContext.verificationScore !== null) && (
                                      <Badge 
                                        colorScheme={rowData.tasks[0].storyContext.verified ? 'green' : 'yellow'}
                                        fontSize="xs"
                                        variant="subtle"
                                      >
                                        {rowData.tasks[0].storyContext.verified ? '✅' : '⚠️'}
                                        {rowData.tasks[0].storyContext.verificationScore !== null && 
                                          ` ${rowData.tasks[0].storyContext.verificationScore}`
                                        }
                                      </Badge>
                                    )}
                                    {rowData.tasks[0].storyContext.epicId && (
                                      <Badge colorScheme="purple" fontSize="xs" variant="subtle">
                                        Epic {rowData.tasks[0].storyContext.epicId}
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </HStack>
                              <Text fontSize="sm" color={mutedColor} noOfLines={1}>
                                {rowData.storyDescription || `${rowData.taskCount} tasks in this story`}
                              </Text>
                            </VStack>
                          </HStack>
                          
                          {/* Quick Status Overview */}
                          <HStack spacing={4}>
                            <HStack spacing={2}>
                              {rowData.completedCount > 0 && (
                                <Tooltip label={`${rowData.completedCount} completed tasks`}>
                                  <Badge colorScheme="green" size="sm">
                                    ✓ {rowData.completedCount}
                                  </Badge>
                                </Tooltip>
                              )}
                              {rowData.inProgressCount > 0 && (
                                <Tooltip label={`${rowData.inProgressCount} tasks in progress`}>
                                  <Badge colorScheme="blue" size="sm">
                                    ⏳ {rowData.inProgressCount}
                                  </Badge>
                                </Tooltip>
                              )}
                              {rowData.pendingCount > 0 && (
                                <Tooltip label={`${rowData.pendingCount} pending tasks`}>
                                  <Badge colorScheme="gray" size="sm">
                                    ⏸️ {rowData.pendingCount}
                                  </Badge>
                                </Tooltip>
                              )}
                            </HStack>
                            
                            <VStack align="end" spacing={1}>
                              <Progress
                                value={rowData.taskCount > 0 ? (rowData.completedCount / rowData.taskCount) * 100 : 0}
                                size="sm"
                                colorScheme={rowData.completedCount === rowData.taskCount ? "green" : "blue"}
                                width="80px"
                                bg={useColorModeValue('white', 'gray.700')}
                              />
                              <Text fontSize="xs" color={mutedColor}>
                                {rowData.taskCount > 0 ? Math.round((rowData.completedCount / rowData.taskCount) * 100) : 0}% complete
                              </Text>
                            </VStack>
                          </HStack>
                        </Flex>
                        
                        {/* Progressive Disclosure Content */}
                        <Collapse in={isExpanded} animateOpacity>
                          <Box p={4} pt={2}>
                            <ScaleFade in={isExpanded && !loadingStoryDetails[storyGroup]} initialScale={0.95}>
                              {loadingStoryDetails[storyGroup] ? (
                                <VStack spacing={3} align="start">
                                  <Skeleton height="20px" width="60%" />
                                  <SkeletonText mt={2} noOfLines={3} spacing={2} skeletonHeight={2} />
                                  <HStack spacing={4}>
                                    <Skeleton height="24px" width="80px" />
                                    <Skeleton height="24px" width="100px" />
                                    <Skeleton height="24px" width="90px" />
                                  </HStack>
                                </VStack>
                              ) : (
                                <VStack spacing={4} align="start">
                                  {/* Story Description */}
                                  <Box>
                                    <HStack mb={2}>
                                      <MdInfoOutline color={mutedColor} />
                                      <Text fontWeight="semibold" color={textColor} fontSize="sm">
                                        Story Details
                                      </Text>
                                    </HStack>
                                    <Text fontSize="sm" color={mutedColor} lineHeight="1.6">
                                      {rowData.storyDescription || 'No detailed description available for this story.'}
                                    </Text>
                                  </Box>
                                  
                                  {/* Detailed Progress Metrics */}
                                  <Box>
                                    <Text fontWeight="semibold" color={textColor} fontSize="sm" mb={2}>
                                      Task Breakdown
                                    </Text>
                                    <HStack spacing={4} flexWrap="wrap">
                                      <VStack spacing={1}>
                                        <Text fontSize="lg" fontWeight="bold" color="green.500">
                                          {rowData.completedCount}
                                        </Text>
                                        <Text fontSize="xs" color={mutedColor}>
                                          Completed
                                        </Text>
                                      </VStack>
                                      <VStack spacing={1}>
                                        <Text fontSize="lg" fontWeight="bold" color="blue.500">
                                          {rowData.inProgressCount}
                                        </Text>
                                        <Text fontSize="xs" color={mutedColor}>
                                          In Progress
                                        </Text>
                                      </VStack>
                                      <VStack spacing={1}>
                                        <Text fontSize="lg" fontWeight="bold" color="gray.500">
                                          {rowData.pendingCount}
                                        </Text>
                                        <Text fontSize="xs" color={mutedColor}>
                                          Pending
                                        </Text>
                                      </VStack>
                                      <VStack spacing={1}>
                                        <Text fontSize="lg" fontWeight="bold" color={textColor}>
                                          {rowData.taskCount}
                                        </Text>
                                        <Text fontSize="xs" color={mutedColor}>
                                          Total
                                        </Text>
                                      </VStack>
                                    </HStack>
                                  </Box>
                                  
                                  {/* Additional Story Metadata */}
                                  <Box>
                                    <Text fontWeight="semibold" color={textColor} fontSize="sm" mb={2}>
                                      Story Status
                                    </Text>
                                    <HStack spacing={4}>
                                      <Badge 
                                        colorScheme={rowData.completedCount === rowData.taskCount ? "green" : rowData.inProgressCount > 0 ? "blue" : "gray"}
                                        size="md"
                                        px={3}
                                        py={1}
                                      >
                                        {rowData.completedCount === rowData.taskCount ? "Complete" : 
                                         rowData.inProgressCount > 0 ? "In Progress" : "Not Started"}
                                      </Badge>
                                      <Text fontSize="sm" color={mutedColor}>
                                        Last updated: {new Date().toLocaleDateString()}
                                      </Text>
                                    </HStack>
                                  </Box>
                                </VStack>
                              )}
                            </ScaleFade>
                          </Box>
                        </Collapse>
                      </Box>
                    </Td>
                  </Tr>
                );
              } else {
                // Render individual task row
                return (
                  <Tr
                    key={row.id}
                    cursor="pointer"
                    _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                    onClick={() => onTaskClick && onTaskClick(rowData)}
                    data-testid={`task-row-${rowData.id}`}
                  >
                    {row.getVisibleCells().map(cell => (
                      <Td key={cell.id} py={3}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </Tr>
                );
              }
            })}
          </Tbody>
        </Table>
      </Box>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <Flex justify="space-between" align="center" mt={4}>
          <Text fontSize="sm" color={mutedColor}>
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} tasks
          </Text>

          <HStack>
            <Button
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {'<<'}
            </Button>
            <Button
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {'<'}
            </Button>
            <Text fontSize="sm">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </Text>
            <Button
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {'>'}
            </Button>
            <Button
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {'>>'}
            </Button>
          </HStack>
        </Flex>
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