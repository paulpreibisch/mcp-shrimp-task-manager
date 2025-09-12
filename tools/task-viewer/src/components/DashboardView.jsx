import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardBody, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Divider,
  List,
  ListItem,
  Icon,
  useColorModeValue
} from '@chakra-ui/react';
import { FiTrendingUp, FiClock, FiCheckCircle, FiTarget } from 'react-icons/fi';
import EpicProgressBar from './EpicProgressBar.jsx';

const DashboardView = ({ 
  epics = [], 
  stories = [], 
  tasks = [], 
  verifications = {},
  stats = {},
  profileId,
  loading,
  error
}) => {
  // Use provided stats or calculate statistics
  const totalEpics = epics.length;
  const activeStories = stories.filter(story => story.status !== 'completed').length;
  const pendingTasks = stats.pending || tasks.filter(task => task.status === 'pending').length;
  const completedTasks = stats.completed || tasks.filter(task => task.status === 'completed').length;
  const totalTasks = stats.total || tasks.length;
  const inProgressTasks = stats.inProgress || tasks.filter(task => task.status === 'in_progress').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get recent activity from verifications
  const recentActivity = Object.values(verifications || {})
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Handle loading state
  if (loading) {
    return (
      <Box p={6} minH="100vh">
        <VStack spacing={8} align="stretch">
          <Text>Loading dashboard...</Text>
        </VStack>
      </Box>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Box p={6} minH="100vh">
        <VStack spacing={8} align="stretch">
          <Text color="red.500">Error loading dashboard: {error}</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={6} minH="100vh">
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading as="h1" size="lg" mb={2}>
            Dashboard Overview
          </Heading>
          <Text color="text.muted" fontSize="md">
            Comprehensive overview of your epic and story management system
          </Text>
        </Box>

        {/* Statistics Grid */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6}>
          {/* Total Epics Card */}
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <StatLabel fontSize="sm" fontWeight="medium">Total Epics</StatLabel>
                    <StatNumber 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color="blue.400"
                      data-testid="dashboard-epic-count"
                    >
                      {totalEpics}
                    </StatNumber>
                    <StatHelpText fontSize="xs" color="text.muted">
                      Active projects
                    </StatHelpText>
                  </VStack>
                  <Icon as={FiTarget} w={5} h={5} color="blue.400" />
                </HStack>
              </Stat>
            </CardBody>
          </Card>

          {/* Active Stories Card */}
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <StatLabel fontSize="sm" fontWeight="medium">Active Stories</StatLabel>
                    <StatNumber 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color="green.400"
                      data-testid="dashboard-story-count"
                    >
                      {activeStories}
                    </StatNumber>
                    <StatHelpText fontSize="xs" color="text.muted">
                      In progress
                    </StatHelpText>
                  </VStack>
                  <Icon as={FiTrendingUp} w={5} h={5} color="green.400" />
                </HStack>
              </Stat>
            </CardBody>
          </Card>

          {/* Pending Tasks Card */}
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <StatLabel fontSize="sm" fontWeight="medium">Pending Tasks</StatLabel>
                    <StatNumber 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color="orange.400"
                      data-testid="dashboard-task-count"
                    >
                      {pendingTasks}
                    </StatNumber>
                    <StatHelpText fontSize="xs" color="text.muted">
                      Awaiting action
                    </StatHelpText>
                  </VStack>
                  <Icon as={FiClock} w={5} h={5} color="orange.400" />
                </HStack>
              </Stat>
            </CardBody>
          </Card>

          {/* Completion Rate Card */}
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <StatLabel fontSize="sm" fontWeight="medium">Completion Rate</StatLabel>
                    <StatNumber 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color="purple.400"
                    >
                      {completionRate}%
                    </StatNumber>
                    <StatHelpText fontSize="xs" color="text.muted">
                      {completedTasks} of {totalTasks} tasks
                    </StatHelpText>
                  </VStack>
                  <Icon as={FiCheckCircle} w={5} h={5} color="purple.400" />
                </HStack>
              </Stat>
            </CardBody>
          </Card>
        </Grid>

        {/* Epic Progress Section */}
        {epics && epics.length > 0 && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack align="stretch" spacing={6}>
                <Heading as="h3" size="md">
                  Epic Progress Overview
                </Heading>
                <Divider />
                
                <Grid 
                  templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} 
                  gap={6}
                >
                  {epics.map((epic) => (
                    <Card 
                      key={epic.id} 
                      bg={useColorModeValue('gray.50', 'gray.700')} 
                      borderColor={borderColor}
                      data-testid={`dashboard-epic-${epic.id}-card`}
                    >
                      <CardBody>
                        <VStack spacing={3} align="stretch">
                          <Box>
                            <Text fontSize="md" fontWeight="bold" mb={1}>
                              {epic.id && !isNaN(parseInt(epic.id)) ? `Epic ${epic.id}` : (epic.title || epic.id || 'Epic')}
                            </Text>
                            {epic.description && (
                              <Text fontSize="sm" color="text.muted" noOfLines={2}>
                                {epic.description}
                              </Text>
                            )}
                          </Box>
                          
                          <EpicProgressBar
                            epic={epic}
                            verifications={verifications}
                            variant="linear"
                            size="sm"
                            showDetails={true}
                            showScore={true}
                          />
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </Grid>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Recent Activity Feed */}
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading as="h3" size="md">
                  Recent Activity
                </Heading>
                <Divider />
                
                {recentActivity.length > 0 ? (
                  <List spacing={3}>
                    {recentActivity.map((verification, index) => (
                      <ListItem key={`${verification.storyId}-${index}`}>
                        <HStack justify="space-between" align="center" p={3} 
                               bg={useColorModeValue('gray.50', 'gray.700')} 
                               borderRadius="md">
                          <VStack align="start" spacing={1} flex={1}>
                            <HStack>
                              <Icon as={FiCheckCircle} w={4} h={4} color="green.400" />
                              <Text fontWeight="medium" fontSize="sm">
                                Story {verification.storyId}
                              </Text>
                              <Badge variant="subtle" colorScheme="green" fontSize="xs">
                                verified
                              </Badge>
                            </HStack>
                            <Text fontSize="xs" color="text.muted">
                              {new Date(verification.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          </VStack>
                          <Badge
                            variant="solid"
                            colorScheme={
                              verification.score >= 80 ? 'green' :
                              verification.score >= 60 ? 'yellow' : 'red'
                            }
                            fontSize="xs"
                          >
                            {verification.score}/100
                          </Badge>
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box textAlign="center" py={8}>
                    <Icon as={FiClock} w={8} h={8} color="gray.400" mb={3} />
                    <Text color="text.muted" fontSize="sm">
                      No recent verification activity
                    </Text>
                    <Text color="text.muted" fontSize="xs" mt={1}>
                      Complete story verifications to see activity here
                    </Text>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Summary Stats */}
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading as="h3" size="md">
                  Quick Stats
                </Heading>
                <Divider />
                
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="text.muted">Total Stories</Text>
                    <Text fontSize="sm" fontWeight="semibold">{stories.length}</Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="text.muted">Verified Stories</Text>
                    <Text fontSize="sm" fontWeight="semibold">{Object.keys(verifications).length}</Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="text.muted">Average Score</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {Object.keys(verifications).length > 0 
                        ? Math.round(Object.values(verifications).reduce((sum, v) => sum + v.score, 0) / Object.keys(verifications).length)
                        : '-'
                      }
                    </Text>
                  </HStack>

                  <Divider />
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="text.muted">Completed Tasks</Text>
                    <Badge variant="outline" colorScheme="green">
                      {completedTasks}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="text.muted">In Progress</Text>
                    <Badge variant="outline" colorScheme="blue">
                      {inProgressTasks}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="text.muted">Pending</Text>
                    <Badge variant="outline" colorScheme="orange">
                      {pendingTasks}
                    </Badge>
                  </HStack>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </Grid>
      </VStack>
    </Box>
  );
};

export default DashboardView;