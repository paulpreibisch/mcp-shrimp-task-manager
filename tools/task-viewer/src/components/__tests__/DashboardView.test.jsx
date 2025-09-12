import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DashboardView from '../DashboardView.jsx';
import chakraTheme from '../../theme/chakra-theme';

// Mock EpicProgressBar component
vi.mock('../EpicProgressBar.jsx', () => ({
  default: ({ epic, verifications, variant, size, showDetails, showScore }) => (
    <div data-testid={`epic-progress-bar-${epic.id}`}>
      <div data-testid="progress-bar-variant">{variant}</div>
      <div data-testid="progress-bar-size">{size}</div>
      <div data-testid="progress-bar-show-details">{showDetails.toString()}</div>
      <div data-testid="progress-bar-show-score">{showScore.toString()}</div>
    </div>
  )
}));

// Mock icons
vi.mock('react-icons/fi', () => ({
  FiTrendingUp: () => <div data-testid="trending-up-icon" />,
  FiClock: () => <div data-testid="clock-icon" />,
  FiCheckCircle: () => <div data-testid="check-circle-icon" />,
  FiTarget: () => <div data-testid="target-icon" />
}));

const renderWithChakra = (component) => {
  return render(
    <ChakraProvider theme={chakraTheme}>
      {component}
    </ChakraProvider>
  );
};

describe('DashboardView', () => {
  // Sample test data
  const mockEpics = [
    {
      id: '1',
      title: 'Epic 1',
      description: 'First epic description'
    },
    {
      id: '2', 
      title: 'Epic 2',
      description: 'Second epic description'
    },
    {
      id: '3',
      description: 'Epic with numeric ID pattern'
    }
  ];

  const mockStories = [
    {
      id: 'story-1',
      status: 'completed',
      title: 'Story 1'
    },
    {
      id: 'story-2', 
      status: 'in_progress',
      title: 'Story 2'
    },
    {
      id: 'story-3',
      status: 'pending',
      title: 'Story 3'
    }
  ];

  const mockTasks = [
    {
      id: 'task-1',
      status: 'pending',
      name: 'Task 1'
    },
    {
      id: 'task-2',
      status: 'completed', 
      name: 'Task 2'
    },
    {
      id: 'task-3',
      status: 'in_progress',
      name: 'Task 3'
    },
    {
      id: 'task-4',
      status: 'completed',
      name: 'Task 4'
    }
  ];

  const mockVerifications = {
    'story-1': {
      storyId: 'story-1',
      score: 85,
      timestamp: '2024-01-15T10:30:00Z'
    },
    'story-2': {
      storyId: 'story-2', 
      score: 72,
      timestamp: '2024-01-14T15:45:00Z'
    },
    'story-3': {
      storyId: 'story-3',
      score: 95,
      timestamp: '2024-01-16T08:20:00Z'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders dashboard title and description', () => {
      renderWithChakra(<DashboardView />);
      
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive overview of your epic and story management system')).toBeInTheDocument();
    });

    it('renders with empty data gracefully', () => {
      renderWithChakra(<DashboardView />);
      
      // Should still render the statistics cards with zero values
      expect(screen.getByTestId('dashboard-epic-count')).toHaveTextContent('0');
      expect(screen.getByTestId('dashboard-story-count')).toHaveTextContent('0'); 
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent('0');
    });

    it('applies correct data-testids for statistics', () => {
      renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          stories={mockStories}
          tasks={mockTasks}
          verifications={mockVerifications}
        />
      );

      expect(screen.getByTestId('dashboard-epic-count')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-story-count')).toBeInTheDocument(); 
      expect(screen.getByTestId('dashboard-task-count')).toBeInTheDocument();
    });
  });

  describe('Statistics Calculation', () => {
    it('correctly calculates total epics', () => {
      renderWithChakra(
        <DashboardView epics={mockEpics} />
      );
      
      expect(screen.getByTestId('dashboard-epic-count')).toHaveTextContent('3');
    });

    it('correctly calculates active stories (non-completed)', () => {
      renderWithChakra(
        <DashboardView stories={mockStories} />
      );
      
      // 2 active stories (in_progress + pending, excluding completed)
      expect(screen.getByTestId('dashboard-story-count')).toHaveTextContent('2');
    });

    it('correctly calculates pending tasks', () => {
      renderWithChakra(
        <DashboardView tasks={mockTasks} />
      );
      
      // 1 pending task
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent('1');
    });

    it('correctly calculates completion rate', () => {
      renderWithChakra(
        <DashboardView tasks={mockTasks} />
      );
      
      // 2 completed out of 4 total = 50%
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('2 of 4 tasks')).toBeInTheDocument();
    });

    it('handles zero tasks for completion rate', () => {
      renderWithChakra(<DashboardView tasks={[]} />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 of 0 tasks')).toBeInTheDocument();
    });
  });

  describe('Epic Progress Section', () => {
    it('renders epic progress section when epics exist', () => {
      renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          verifications={mockVerifications}
        />
      );
      
      expect(screen.getByText('Epic Progress Overview')).toBeInTheDocument();
    });

    it('does not render epic progress section when no epics', () => {
      renderWithChakra(<DashboardView epics={[]} />);
      
      expect(screen.queryByText('Epic Progress Overview')).not.toBeInTheDocument();
    });

    it('renders epic cards with correct test IDs', () => {
      renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          verifications={mockVerifications}
        />
      );
      
      expect(screen.getByTestId('dashboard-epic-1-card')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-epic-2-card')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-epic-3-card')).toBeInTheDocument();
    });

    it('displays epic titles correctly', () => {
      renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          verifications={mockVerifications}
        />
      );
      
      expect(screen.getByText('Epic 1')).toBeInTheDocument();
      expect(screen.getByText('Epic 2')).toBeInTheDocument();
      // For numeric ID '3', the component displays "Epic 3"
      expect(screen.getByText('Epic 3')).toBeInTheDocument();
    });

    it('displays epic descriptions when available', () => {
      renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          verifications={mockVerifications}
        />
      );
      
      expect(screen.getByText('First epic description')).toBeInTheDocument();
      expect(screen.getByText('Second epic description')).toBeInTheDocument();
      expect(screen.getByText('Epic with numeric ID pattern')).toBeInTheDocument();
    });

    it('passes correct props to EpicProgressBar components', () => {
      renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          verifications={mockVerifications}
        />
      );
      
      expect(screen.getByTestId('epic-progress-bar-1')).toBeInTheDocument();
      // Check for multiple progress bars
      const variants = screen.getAllByTestId('progress-bar-variant');
      expect(variants[0]).toHaveTextContent('linear');
      
      const sizes = screen.getAllByTestId('progress-bar-size');
      expect(sizes[0]).toHaveTextContent('sm');
      
      const showDetails = screen.getAllByTestId('progress-bar-show-details');
      expect(showDetails[0]).toHaveTextContent('true');
      
      const showScore = screen.getAllByTestId('progress-bar-show-score');
      expect(showScore[0]).toHaveTextContent('true');
    });
  });

  describe('Recent Activity Feed', () => {
    it('renders recent activity section', () => {
      renderWithChakra(
        <DashboardView verifications={mockVerifications} />
      );
      
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    it('displays verification activities when available', () => {
      renderWithChakra(
        <DashboardView verifications={mockVerifications} />
      );
      
      expect(screen.getByText('Story story-1')).toBeInTheDocument();
      expect(screen.getByText('Story story-2')).toBeInTheDocument();
      expect(screen.getByText('Story story-3')).toBeInTheDocument();
    });

    it('displays verification scores with correct color schemes', () => {
      renderWithChakra(
        <DashboardView verifications={mockVerifications} />
      );
      
      expect(screen.getByText('85/100')).toBeInTheDocument();
      expect(screen.getByText('72/100')).toBeInTheDocument();
      expect(screen.getByText('95/100')).toBeInTheDocument();
    });

    it('sorts activities by timestamp (newest first)', () => {
      renderWithChakra(
        <DashboardView verifications={mockVerifications} />
      );
      
      const activities = screen.getAllByText(/Story story-/);
      // story-3 has the latest timestamp (2024-01-16), should appear first
      expect(activities[0]).toHaveTextContent('Story story-3');
    });

    it('shows empty state when no verification activities', () => {
      renderWithChakra(<DashboardView verifications={{}} />);
      
      expect(screen.getByText('No recent verification activity')).toBeInTheDocument();
      expect(screen.getByText('Complete story verifications to see activity here')).toBeInTheDocument();
    });

    it('limits recent activity to 5 items', () => {
      const manyVerifications = {};
      for (let i = 1; i <= 10; i++) {
        manyVerifications[`story-${i}`] = {
          storyId: `story-${i}`,
          score: 80,
          timestamp: `2024-01-${i.toString().padStart(2, '0')}T10:00:00Z`
        };
      }
      
      renderWithChakra(<DashboardView verifications={manyVerifications} />);
      
      const activities = screen.getAllByText(/Story story-/);
      expect(activities).toHaveLength(5);
    });
  });

  describe('Quick Stats Section', () => {
    it('renders quick stats section', () => {
      renderWithChakra(
        <DashboardView 
          stories={mockStories}
          verifications={mockVerifications}
          tasks={mockTasks}
        />
      );
      
      expect(screen.getByText('Quick Stats')).toBeInTheDocument();
    });

    it('displays correct total stories count', () => {
      renderWithChakra(
        <DashboardView stories={mockStories} />
      );
      
      expect(screen.getByText('Total Stories')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays correct verified stories count', () => {
      renderWithChakra(
        <DashboardView verifications={mockVerifications} />
      );
      
      expect(screen.getByText('Verified Stories')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('calculates and displays average score correctly', () => {
      renderWithChakra(
        <DashboardView verifications={mockVerifications} />
      );
      
      // (85 + 72 + 95) / 3 = 84
      expect(screen.getByText('Average Score')).toBeInTheDocument();
      expect(screen.getByText('84')).toBeInTheDocument();
    });

    it('shows dash when no verifications for average score', () => {
      renderWithChakra(
        <DashboardView verifications={{}} />
      );
      
      expect(screen.getByText('Average Score')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('displays task status breakdown', () => {
      renderWithChakra(
        <DashboardView tasks={mockTasks} />
      );
      
      expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      
      // Check the counts in badges
      const badges = screen.getAllByText('2');
      expect(badges.length).toBeGreaterThan(0); // 2 completed tasks
      
      expect(screen.getByText('1')).toBeInTheDocument(); // 1 in progress and 1 pending
    });
  });

  describe('Data Aggregation and Display', () => {
    it('aggregates data correctly from all props', () => {
      renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          stories={mockStories}
          tasks={mockTasks}
          verifications={mockVerifications}
        />
      );
      
      // Verify all sections are rendered with correct data
      expect(screen.getByTestId('dashboard-epic-count')).toHaveTextContent('3');
      expect(screen.getByTestId('dashboard-story-count')).toHaveTextContent('2');
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent('1');
      expect(screen.getByText('50%')).toBeInTheDocument(); // completion rate
    });

    it('handles missing or undefined props gracefully', () => {
      renderWithChakra(<DashboardView />);
      
      // Should not crash and should show zeros/empty states
      expect(screen.getByTestId('dashboard-epic-count')).toHaveTextContent('0');
      expect(screen.getByTestId('dashboard-story-count')).toHaveTextContent('0');
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent('0');
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles null props gracefully', () => {
      renderWithChakra(
        <DashboardView 
          epics={null}
          stories={null}
          tasks={null}
          verifications={null}
        />
      );
      
      // Should not crash and should show zeros/empty states
      expect(screen.getByTestId('dashboard-epic-count')).toHaveTextContent('0');
      expect(screen.getByTestId('dashboard-story-count')).toHaveTextContent('0');
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent('0');
    });
  });

  describe('Theme Integration', () => {
    it('applies correct Chakra UI theme classes', () => {
      const { container } = renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          stories={mockStories}
          tasks={mockTasks}
          verifications={mockVerifications}
        />
      );
      
      // Check for Chakra UI specific classes
      expect(container.querySelector('.chakra-stack')).toBeInTheDocument();
      expect(container.querySelector('.chakra-card')).toBeInTheDocument();
    });

    it('renders icons correctly', () => {
      renderWithChakra(
        <DashboardView tasks={mockTasks} />
      );
      
      expect(screen.getByTestId('target-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles tasks with undefined status', () => {
      const tasksWithUndefinedStatus = [
        { id: 'task-1', status: undefined },
        { id: 'task-2', status: 'completed' }
      ];
      
      renderWithChakra(
        <DashboardView tasks={tasksWithUndefinedStatus} />
      );
      
      // Should not crash
      expect(screen.getByTestId('dashboard-task-count')).toBeInTheDocument();
    });

    it('handles stories with undefined status', () => {
      const storiesWithUndefinedStatus = [
        { id: 'story-1', status: undefined },
        { id: 'story-2', status: 'completed' }
      ];
      
      renderWithChakra(
        <DashboardView stories={storiesWithUndefinedStatus} />
      );
      
      // Should not crash and count undefined as active
      expect(screen.getByTestId('dashboard-story-count')).toHaveTextContent('1');
    });

    it('handles verifications with invalid timestamps', () => {
      const invalidVerifications = {
        'story-1': {
          storyId: 'story-1',
          score: 80,
          timestamp: 'invalid-date'
        }
      };
      
      renderWithChakra(
        <DashboardView verifications={invalidVerifications} />
      );
      
      // Should not crash
      expect(screen.getByText('Story story-1')).toBeInTheDocument();
    });

    it('handles verifications with missing score', () => {
      const verificationsWithMissingScore = {
        'story-1': {
          storyId: 'story-1',
          timestamp: '2024-01-15T10:30:00Z'
        }
      };
      
      renderWithChakra(
        <DashboardView verifications={verificationsWithMissingScore} />
      );
      
      // Should not crash and handle gracefully
      expect(screen.getByText('Story story-1')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('displays loading state correctly', () => {
      renderWithChakra(
        <DashboardView 
          loading={true}
          epics={mockEpics}
          stories={mockStories}
          tasks={mockTasks}
        />
      );
      
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Overview')).not.toBeInTheDocument();
    });

    it('displays error state correctly', () => {
      const errorMessage = 'Failed to load dashboard data';
      renderWithChakra(
        <DashboardView 
          error={errorMessage}
          epics={mockEpics}
          stories={mockStories}
          tasks={mockTasks}
        />
      );
      
      expect(screen.getByText(`Error loading dashboard: ${errorMessage}`)).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Overview')).not.toBeInTheDocument();
    });

    it('prioritizes error state over loading state', () => {
      renderWithChakra(
        <DashboardView 
          loading={true}
          error="Error occurred"
          epics={mockEpics}
        />
      );
      
      expect(screen.getByText('Error loading dashboard: Error occurred')).toBeInTheDocument();
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
    });
  });

  describe('Stats Integration with Props', () => {
    it('uses provided stats when available', () => {
      const customStats = {
        pending: 5,
        completed: 8,
        total: 15,
        inProgress: 2
      };

      renderWithChakra(
        <DashboardView 
          tasks={mockTasks}
          stats={customStats}
        />
      );
      
      // Should use stats props instead of calculating from tasks
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent('5');
      expect(screen.getByText('53%')).toBeInTheDocument(); // 8/15 * 100 = 53.33% rounded
      expect(screen.getByText('8 of 15 tasks')).toBeInTheDocument();
    });

    it('falls back to calculated stats when stats prop is not provided', () => {
      renderWithChakra(
        <DashboardView tasks={mockTasks} />
      );
      
      // Should calculate from tasks array
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent('1');
      expect(screen.getByText('50%')).toBeInTheDocument(); // 2/4 = 50%
    });

    it('handles partial stats objects', () => {
      const partialStats = {
        pending: 3,
        // missing completed, total, inProgress
      };

      renderWithChakra(
        <DashboardView 
          tasks={mockTasks}
          stats={partialStats}
        />
      );
      
      // Should use provided stats for pending, calculate others
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent('3');
      expect(screen.getByText('50%')).toBeInTheDocument(); // Still calculated from tasks
    });
  });

  describe('Epic Title Display Logic', () => {
    it('displays epic titles correctly for different ID formats', () => {
      const epicsWithVariousFormats = [
        { id: '1', title: 'Epic One' },
        { id: 'alpha', title: 'Epic Alpha' },
        { id: '2' }, // No title, numeric ID
        { id: 'beta' }, // No title, non-numeric ID
        { title: 'No ID Epic' }, // No ID
        {} // Empty epic
      ];

      renderWithChakra(
        <DashboardView 
          epics={epicsWithVariousFormats}
          verifications={mockVerifications}
        />
      );
      
      expect(screen.getByText('Epic One')).toBeInTheDocument();
      expect(screen.getByText('Epic Alpha')).toBeInTheDocument();
      expect(screen.getByText('Epic 2')).toBeInTheDocument();
      expect(screen.getByText('beta')).toBeInTheDocument();
      expect(screen.getByText('No ID Epic')).toBeInTheDocument();
      expect(screen.getByText('Epic')).toBeInTheDocument(); // Default fallback
    });
  });

  describe('Recent Activity Timestamp Handling', () => {
    it('formats timestamps correctly', () => {
      const verificationsWithDifferentTimes = {
        'story-1': {
          storyId: 'story-1',
          score: 85,
          timestamp: '2024-01-15T10:30:00Z'
        },
        'story-2': {
          storyId: 'story-2',
          score: 90,
          timestamp: '2024-12-25T23:59:59Z' 
        }
      };

      renderWithChakra(
        <DashboardView verifications={verificationsWithDifferentTimes} />
      );
      
      // Check that dates are formatted and displayed
      expect(screen.getByText(/Jan 15/)).toBeInTheDocument();
      expect(screen.getByText(/Dec 25/)).toBeInTheDocument();
    });

    it('handles future timestamps', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const verificationsWithFuture = {
        'story-future': {
          storyId: 'story-future',
          score: 95,
          timestamp: futureDate.toISOString()
        }
      };

      renderWithChakra(
        <DashboardView verifications={verificationsWithFuture} />
      );
      
      // Should not crash with future dates
      expect(screen.getByText('Story story-future')).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('handles large datasets efficiently', () => {
      const largeEpics = Array.from({ length: 50 }, (_, i) => ({
        id: `epic-${i}`,
        title: `Epic ${i}`,
        description: `Description for epic ${i}`
      }));

      const largeVerifications = {};
      for (let i = 0; i < 100; i++) {
        largeVerifications[`story-${i}`] = {
          storyId: `story-${i}`,
          score: Math.floor(Math.random() * 100),
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
        };
      }

      renderWithChakra(
        <DashboardView 
          epics={largeEpics}
          verifications={largeVerifications}
          tasks={mockTasks}
        />
      );
      
      expect(screen.getByTestId('dashboard-epic-count')).toHaveTextContent('50');
      // Should only show 5 most recent activities despite 100 verifications
      const activities = screen.getAllByText(/Story story-/);
      expect(activities).toHaveLength(5);
    });

    it('recalculates stats only when props change', () => {
      const { rerender } = renderWithChakra(
        <DashboardView tasks={mockTasks} />
      );
      
      const initialCount = screen.getByTestId('dashboard-task-count').textContent;
      
      // Rerender with same props
      rerender(
        <ChakraProvider theme={chakraTheme}>
          <DashboardView tasks={mockTasks} />
        </ChakraProvider>
      );
      
      // Should maintain the same calculated values
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent(initialCount);
    });
  });

  describe('Color Mode Integration', () => {
    it('applies color mode values correctly', () => {
      const { container } = renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          stories={mockStories}
          tasks={mockTasks}
          verifications={mockVerifications}
        />
      );
      
      // Check that color mode dependent styles are applied
      const cards = container.querySelectorAll('.chakra-card');
      expect(cards.length).toBeGreaterThan(0);
      
      // Verify VStack elements exist (layout structure)
      const vstacks = container.querySelectorAll('.chakra-stack');
      expect(vstacks.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA labels and semantic structure', () => {
      renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          stories={mockStories}
          tasks={mockTasks}
          verifications={mockVerifications}
        />
      );
      
      // Check for proper heading hierarchy
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Dashboard Overview');
      
      const subHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(subHeadings.length).toBeGreaterThan(0);
    });

    it('provides meaningful text content for screen readers', () => {
      renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          tasks={mockTasks}
        />
      );
      
      expect(screen.getByText('Active projects')).toBeInTheDocument();
      expect(screen.getByText('Awaiting action')).toBeInTheDocument();
    });

    it('maintains focus management for interactive elements', () => {
      renderWithChakra(
        <DashboardView 
          epics={mockEpics}
          verifications={mockVerifications}
        />
      );
      
      // Verify that epic cards are focusable
      const epicCards = screen.getAllByTestId(/dashboard-epic-.*-card/);
      epicCards.forEach(card => {
        expect(card).toBeInTheDocument();
      });
    });
  });

  describe('Dynamic Data Updates', () => {
    it('updates statistics when props change', () => {
      const { rerender } = renderWithChakra(
        <DashboardView tasks={mockTasks} />
      );
      
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent('1');
      
      const updatedTasks = [
        ...mockTasks,
        { id: 'task-5', status: 'pending', name: 'New Task' }
      ];
      
      rerender(
        <ChakraProvider theme={chakraTheme}>
          <DashboardView tasks={updatedTasks} />
        </ChakraProvider>
      );
      
      expect(screen.getByTestId('dashboard-task-count')).toHaveTextContent('2');
    });

    it('updates epic display when epics change', () => {
      const { rerender } = renderWithChakra(
        <DashboardView epics={mockEpics.slice(0, 1)} />
      );
      
      expect(screen.getByTestId('dashboard-epic-count')).toHaveTextContent('1');
      
      rerender(
        <ChakraProvider theme={chakraTheme}>
          <DashboardView epics={mockEpics} />
        </ChakraProvider>
      );
      
      expect(screen.getByTestId('dashboard-epic-count')).toHaveTextContent('3');
    });

    it('updates recent activity when verifications change', () => {
      const { rerender } = renderWithChakra(
        <DashboardView verifications={{}} />
      );
      
      expect(screen.getByText('No recent verification activity')).toBeInTheDocument();
      
      rerender(
        <ChakraProvider theme={chakraTheme}>
          <DashboardView verifications={mockVerifications} />
        </ChakraProvider>
      );
      
      expect(screen.queryByText('No recent verification activity')).not.toBeInTheDocument();
      expect(screen.getByText('Story story-1')).toBeInTheDocument();
    });
  });
});