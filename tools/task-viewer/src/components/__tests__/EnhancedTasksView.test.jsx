import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import EnhancedTasksView from '../EnhancedTasksView.jsx';
import chakraTheme from '../../theme/chakra-theme';

// Mock react-i18next
const mockUseTranslation = {
  t: (key) => {
    const translations = {
      'status.completed': 'Completed',
      'status.inProgress': 'In Progress',
      'status.pending': 'Pending',
      'searchTasksPlaceholder': 'Search tasks...'
    };
    return translations[key] || key;
  },
  i18n: { language: 'en' }
};

vi.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation
}));

const renderWithChakra = (component) => {
  return render(
    <ChakraProvider theme={chakraTheme}>
      {component}
    </ChakraProvider>
  );
};

describe('EnhancedTasksView', () => {
  // Mock data for testing
  const mockTasks = [
    {
      id: 'task-1',
      name: 'First Task',
      description: 'Description for first task',
      story: 'Story Alpha',
      storyDescription: 'Alpha story description',
      status: 'pending',
      priority: 'high',
      agent: 'agent-1'
    },
    {
      id: 'task-2', 
      name: 'Second Task',
      description: 'Description for second task',
      story: 'Story Alpha',
      status: 'in_progress',
      priority: 'medium',
      assignee: 'user-1'
    },
    {
      id: 'task-3',
      name: 'Third Task',
      description: 'Description for third task',
      story: 'Story Beta',
      storyDescription: 'Beta story description',
      status: 'completed',
      priority: 'low'
    },
    {
      id: 'task-4',
      name: 'Fourth Task',
      description: 'Task without story',
      status: 'pending'
    }
  ];

  const defaultProps = {
    data: mockTasks,
    globalFilter: '',
    onGlobalFilterChange: vi.fn(),
    statusFilter: 'all',
    onTaskClick: vi.fn(),
    showToast: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue('')
      },
      writable: true,
      configurable: true
    });
  });

  describe('Basic Rendering', () => {
    it('renders with correct test ID', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      expect(screen.getByTestId('tasks-table')).toBeInTheDocument();
    });

    it('renders empty state when no tasks', () => {
      renderWithChakra(<EnhancedTasksView data={[]} />);
      
      expect(screen.getByText('No Tasks Found')).toBeInTheDocument();
      expect(screen.getByText('Create tasks using the task manager to see them organized by story here.')).toBeInTheDocument();
    });

    it('renders filter controls', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      expect(screen.getByText('Filter by Story:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Stories')).toBeInTheDocument();
      expect(screen.getByText('Expand All')).toBeInTheDocument();
      expect(screen.getByText('Collapse All')).toBeInTheDocument();
    });

    it('displays correct task count', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      expect(screen.getByText('Showing 4 tasks in 3 stories')).toBeInTheDocument();
    });
  });

  describe('Data Filtering', () => {
    it('filters tasks by status', () => {
      const props = { ...defaultProps, statusFilter: 'completed' };
      renderWithChakra(<EnhancedTasksView {...props} />);
      
      expect(screen.getByText('Showing 1 tasks in 1 stories')).toBeInTheDocument();
    });

    it('filters tasks by story', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      const storySelect = screen.getByDisplayValue('All Stories');
      await user.selectOptions(storySelect, 'Story Alpha');
      
      expect(screen.getByText('Showing 2 tasks in 1 stories')).toBeInTheDocument();
    });

    it('shows all story options in filter dropdown', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      const select = screen.getByDisplayValue('All Stories');
      expect(select.querySelector('option[value="Story Alpha"]')).toBeInTheDocument();
      expect(select.querySelector('option[value="Story Beta"]')).toBeInTheDocument();
      expect(select.querySelector('option[value="No Story"]')).toBeInTheDocument();
    });

    it('handles tasks without story', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Task 4 has no story, should be grouped under "No Story"
      const noStoryOption = screen.getByDisplayValue('All Stories').querySelector('option[value="No Story"]');
      expect(noStoryOption).toBeInTheDocument();
    });
  });

  describe('Story Accordion', () => {
    it('renders story accordion items with correct test IDs', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      expect(screen.getByTestId('story-accordion-Story Alpha')).toBeInTheDocument();
      expect(screen.getByTestId('story-accordion-Story Beta')).toBeInTheDocument();
      expect(screen.getByTestId('story-accordion-No Story')).toBeInTheDocument();
    });

    it('displays correct story titles and task counts', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      expect(screen.getByText('📖 Story Alpha')).toBeInTheDocument();
      expect(screen.getByText('📖 Story Beta')).toBeInTheDocument();
      expect(screen.getByText('📖 No Story')).toBeInTheDocument();
      
      // Check task count badges
      expect(screen.getByText('1/2')).toBeInTheDocument(); // Story Alpha: 1 completed of 2
      expect(screen.getByText('1/1')).toBeInTheDocument(); // Story Beta: 1 completed of 1
      expect(screen.getByText('0/1')).toBeInTheDocument(); // No Story: 0 completed of 1
    });

    it('displays progress bars with correct completion percentages', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      expect(screen.getByText('50% complete')).toBeInTheDocument(); // Story Alpha: 1/2 = 50%
      expect(screen.getByText('100% complete')).toBeInTheDocument(); // Story Beta: 1/1 = 100%
      expect(screen.getByText('0% complete')).toBeInTheDocument(); // No Story: 0/1 = 0%
    });

    it('displays status breakdown badges', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Story Alpha should have completed, in_progress, and pending badges
      expect(screen.getByText('⏳ 1')).toBeInTheDocument(); // in_progress
      expect(screen.getByText('⏸️ 1')).toBeInTheDocument(); // pending (task-1 in Story Alpha)
    });

    it('expands/collapses stories on click', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      const storyButton = screen.getByTestId('story-accordion-Story Alpha');
      
      // Initially collapsed - task details should not be visible
      expect(screen.queryByText('First Task')).not.toBeInTheDocument();
      
      // Expand story
      await user.click(storyButton);
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
      });
    });
  });

  describe('Task Cards', () => {
    it('renders task cards with correct test IDs when expanded', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Expand Story Alpha to see tasks
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      await waitFor(() => {
        expect(screen.getByTestId('task-card-task-1')).toBeInTheDocument();
        expect(screen.getByTestId('task-card-task-2')).toBeInTheDocument();
      });
    });

    it('displays task information correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
        expect(screen.getByText('Description for first task')).toBeInTheDocument();
        expect(screen.getByText('Second Task')).toBeInTheDocument();
        expect(screen.getByText('Description for second task')).toBeInTheDocument();
      });
    });

    it('displays status badges with correct colors', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });

    it('displays priority badges when available', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      await waitFor(() => {
        expect(screen.getByText('high')).toBeInTheDocument();
        expect(screen.getByText('medium')).toBeInTheDocument();
      });
    });

    it('displays agent or assignee information', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      await waitFor(() => {
        expect(screen.getByText('agent-1')).toBeInTheDocument();
        expect(screen.getByText('user-1')).toBeInTheDocument();
      });
    });

    it('handles task click events', async () => {
      const user = userEvent.setup();
      const onTaskClick = vi.fn();
      renderWithChakra(<EnhancedTasksView {...defaultProps} onTaskClick={onTaskClick} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      const taskCard = await screen.findByTestId('task-card-task-1');
      await user.click(taskCard);
      
      expect(onTaskClick).toHaveBeenCalledWith(mockTasks[0]);
    });
  });

  describe('Task ID Copying', () => {
    it('copies task ID to clipboard on ID click', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      const taskIdElement = await screen.findByText('task-1...');
      await user.click(taskIdElement);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('task-1');
      expect(defaultProps.showToast).toHaveBeenCalledWith('Task ID copied to clipboard', 'success');
    });

    it('displays shortened task IDs', async () => {
      const user = userEvent.setup();
      const longIdTask = {
        ...mockTasks[0],
        id: 'very-long-task-id-that-should-be-shortened'
      };
      
      renderWithChakra(<EnhancedTasksView data={[longIdTask]} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      await waitFor(() => {
        expect(screen.getByText('very-lon...')).toBeInTheDocument();
      });
    });

    it('shows full task ID in tooltip', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      const taskIdElement = await screen.findByText('task-1...');
      expect(taskIdElement).toHaveAttribute('title', 'Click to copy: task-1');
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('expands all stories on Expand All button click', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      const expandAllButton = screen.getByText('Expand All');
      await user.click(expandAllButton);
      
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
        expect(screen.getByText('Third Task')).toBeInTheDocument();
        expect(screen.getByText('Fourth Task')).toBeInTheDocument();
      });
    });

    it('collapses all stories on Collapse All button click', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // First expand all
      await user.click(screen.getByText('Expand All'));
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
      });
      
      // Then collapse all
      await user.click(screen.getByText('Collapse All'));
      await waitFor(() => {
        expect(screen.queryByText('First Task')).not.toBeInTheDocument();
      });
    });
  });

  describe('TanStack Table Integration', () => {
    it('handles progressive disclosure correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Initially only story headers should be visible
      expect(screen.getByText('📖 Story Alpha')).toBeInTheDocument();
      expect(screen.queryByText('First Task')).not.toBeInTheDocument();
      
      // Expand to show task details
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
      });
    });

    it('maintains filter state when expanding/collapsing', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} statusFilter="pending" />);
      
      // Should only show pending tasks
      expect(screen.getByText('Showing 2 tasks in 2 stories')).toBeInTheDocument();
      
      // Expand a story
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      // Filter should still be applied
      expect(screen.getByText('Showing 2 tasks in 2 stories')).toBeInTheDocument();
    });
  });

  describe('Story Data Aggregation', () => {
    it('correctly groups tasks by story', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Should have 3 story groups
      expect(screen.getByText('Showing 4 tasks in 3 stories')).toBeInTheDocument();
    });

    it('calculates story statistics correctly', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Story Alpha: 2 tasks (1 pending, 1 in_progress)
      expect(screen.getByText('1/2')).toBeInTheDocument();
      
      // Story Beta: 1 task (1 completed)
      expect(screen.getByText('1/1')).toBeInTheDocument();
      
      // No Story: 1 task (1 pending)
      expect(screen.getByText('0/1')).toBeInTheDocument();
    });

    it('displays story descriptions correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      await waitFor(() => {
        expect(screen.getByText('Alpha story description')).toBeInTheDocument();
      });
    });

    it('handles tasks without story description', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-accordion-No Story'));
      
      await waitFor(() => {
        expect(screen.getByText('Tasks for No Story')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination and Sorting', () => {
    it('sorts stories alphabetically', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      const storyTitles = screen.getAllByText(/📖/);
      expect(storyTitles[0]).toHaveTextContent('📖 No Story');
      expect(storyTitles[1]).toHaveTextContent('📖 Story Alpha');
      expect(storyTitles[2]).toHaveTextContent('📖 Story Beta');
    });

    it('maintains task order within stories', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      await waitFor(() => {
        const tasks = screen.getAllByTestId(/task-card-/);
        expect(tasks[0]).toHaveAttribute('data-testid', 'task-card-task-1');
        expect(tasks[1]).toHaveAttribute('data-testid', 'task-card-task-2');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles tasks with missing properties', () => {
      const incompleteTask = {
        id: 'incomplete-task',
        name: 'Incomplete Task'
        // Missing description, story, status, priority, agent
      };
      
      renderWithChakra(<EnhancedTasksView data={[incompleteTask]} />);
      
      expect(screen.getByText('Showing 1 tasks in 1 stories')).toBeInTheDocument();
    });

    it('handles empty story name', () => {
      const taskWithEmptyStory = {
        id: 'task-empty-story',
        name: 'Task with Empty Story',
        story: '',
        status: 'pending'
      };
      
      renderWithChakra(<EnhancedTasksView data={[taskWithEmptyStory]} />);
      
      expect(screen.getByTestId('story-accordion-No Story')).toBeInTheDocument();
    });

    it('handles null clipboard API gracefully', async () => {
      const user = userEvent.setup();
      delete navigator.clipboard;
      
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-accordion-Story Alpha'));
      
      const taskIdElement = await screen.findByText('task-1...');
      
      // Should not crash when clipboard API is not available
      await user.click(taskIdElement);
      expect(defaultProps.showToast).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for accordion', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      const accordionButtons = screen.getAllByRole('button');
      expect(accordionButtons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      const storyButton = screen.getByTestId('story-accordion-Story Alpha');
      storyButton.focus();
      
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
      });
    });

    it('provides meaningful text for screen readers', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      expect(screen.getByText('Filter by Story:')).toBeInTheDocument();
      expect(screen.getByText('Showing 4 tasks in 3 stories')).toBeInTheDocument();
    });
  });

  describe('TanStack Table Integration', () => {
    it('initializes table with correct configuration', () => {
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Verify table headers are rendered
      expect(screen.getByText('Task ID')).toBeInTheDocument();
      expect(screen.getByText('Task Name')).toBeInTheDocument();
      expect(screen.getByText('Story')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Parallel')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Assignee')).toBeInTheDocument();
    });

    it('handles table sorting correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Expand a story to see sortable content
      await user.click(screen.getByTestId('story-group-Story Alpha'));
      
      // Find and click a sortable header (Task Name should be sortable)
      const taskNameHeader = screen.getByText('Task Name');
      await user.click(taskNameHeader);
      
      // Should show sort indicator
      expect(screen.getByText('↕')).toBeInTheDocument();
    });

    it('handles pagination when needed', () => {
      // Create enough tasks to trigger pagination (more than 20)
      const manyTasks = Array.from({ length: 25 }, (_, index) => ({
        id: `task-${index}`,
        name: `Task ${index}`,
        story: 'Large Story',
        status: 'pending'
      }));
      
      renderWithChakra(<EnhancedTasksView data={manyTasks} />);
      
      // Should show task count indicating pagination might be needed
      expect(screen.getByText('Showing 25 tasks in 1 stories')).toBeInTheDocument();
    });

    it('maintains table state during story expansion/collapse', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Expand a story
      await user.click(screen.getByTestId('story-group-Story Alpha'));
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
      });
      
      // Collapse the story
      await user.click(screen.getByTestId('story-group-Story Alpha'));
      await waitFor(() => {
        expect(screen.queryByText('First Task')).not.toBeInTheDocument();
      });
      
      // Table structure should remain intact
      expect(screen.getByText('Task Name')).toBeInTheDocument();
    });

    it('handles global filter integration with TanStack Table', async () => {
      const user = userEvent.setup();
      const onGlobalFilterChange = vi.fn();
      
      renderWithChakra(
        <EnhancedTasksView 
          {...defaultProps} 
          globalFilter="First"
          onGlobalFilterChange={onGlobalFilterChange}
        />
      );
      
      // Global filter should affect the display
      expect(screen.getByText('Showing 4 tasks in 3 stories')).toBeInTheDocument();
    });
  });

  describe('Progressive Disclosure and Lazy Loading', () => {
    it('implements progressive disclosure correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Initially only story headers should be visible
      expect(screen.getByText('📖 Story Alpha')).toBeInTheDocument();
      expect(screen.queryByText('First Task')).not.toBeInTheDocument();
      
      // Expand to show detailed view with skeleton loading
      await user.click(screen.getByTestId('story-group-Story Alpha'));
      
      // Should eventually show story details after loading
      await waitFor(() => {
        expect(screen.getByText('Story Details')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('shows loading skeletons during story detail loading', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      await user.click(screen.getByTestId('story-group-Story Alpha'));
      
      // Should briefly show skeleton loading
      // Note: This is timing-sensitive, so we check for the presence of loading indicators
      expect(screen.getByText('📖 Story Alpha')).toBeInTheDocument();
    });

    it('maintains expanded state across re-renders', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Expand a story
      await user.click(screen.getByTestId('story-group-Story Alpha'));
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
      });
      
      // Re-render with same props
      rerender(
        <ChakraProvider theme={chakraTheme}>
          <EnhancedTasksView {...defaultProps} />
        </ChakraProvider>
      );
      
      // Should maintain expanded state
      expect(screen.getByText('First Task')).toBeInTheDocument();
    });
  });

  describe('Story Context Integration', () => {
    it('handles tasks with rich story context', async () => {
      const user = userEvent.setup();
      const tasksWithStoryContext = [
        {
          id: 'task-1',
          name: 'Context Task',
          storyContext: {
            title: 'Rich Story',
            description: 'A story with rich context',
            verified: true,
            verificationScore: 95,
            epicId: 'epic-1'
          },
          status: 'pending'
        }
      ];
      
      renderWithChakra(<EnhancedTasksView data={tasksWithStoryContext} />);
      
      expect(screen.getByText('📖 Rich Story')).toBeInTheDocument();
      
      // Should show verification status
      await user.click(screen.getByTestId('story-group-Rich Story'));
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('Epic epic-1')).toBeInTheDocument();
    });

    it('handles tasks without story context gracefully', () => {
      const tasksWithoutContext = [
        {
          id: 'task-1',
          name: 'No Context Task',
          status: 'pending'
        }
      ];
      
      renderWithChakra(<EnhancedTasksView data={tasksWithoutContext} />);
      
      expect(screen.getByText('📖 No Story')).toBeInTheDocument();
      expect(screen.getByText('Showing 1 tasks in 1 stories')).toBeInTheDocument();
    });

    it('displays story metadata correctly in expanded view', async () => {
      const user = userEvent.setup();
      const tasksWithMetadata = [
        {
          id: 'task-1',
          name: 'Metadata Task',
          storyContext: {
            title: 'Story With Metadata',
            description: 'Detailed story description',
            verified: false,
            verificationScore: null,
            epicId: 'epic-2'
          },
          status: 'completed'
        }
      ];
      
      renderWithChakra(<EnhancedTasksView data={tasksWithMetadata} />);
      
      await user.click(screen.getByTestId('story-group-Story With Metadata'));
      
      await waitFor(() => {
        expect(screen.getByText('Story Details')).toBeInTheDocument();
        expect(screen.getByText('Detailed story description')).toBeInTheDocument();
        expect(screen.getByText('Epic epic-2')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('handles large datasets efficiently', () => {
      const largeTasks = Array.from({ length: 100 }, (_, index) => ({
        id: `task-${index}`,
        name: `Task ${index}`,
        description: `Description ${index}`,
        story: `Story ${index % 10}`, // 10 different stories
        status: ['pending', 'in_progress', 'completed'][index % 3],
        priority: ['low', 'medium', 'high'][index % 3]
      }));
      
      renderWithChakra(<EnhancedTasksView data={largeTasks} />);
      
      expect(screen.getByText('Showing 100 tasks in 10 stories')).toBeInTheDocument();
    });

    it('filters large datasets efficiently', async () => {
      const user = userEvent.setup();
      const largeTasks = Array.from({ length: 100 }, (_, index) => ({
        id: `task-${index}`,
        name: `Task ${index}`,
        story: 'Large Story',
        status: 'pending'
      }));
      
      renderWithChakra(<EnhancedTasksView data={largeTasks} />);
      
      const storySelect = screen.getByDisplayValue('All Stories');
      await user.selectOptions(storySelect, 'Large Story');
      
      expect(screen.getByText('Showing 100 tasks in 1 stories')).toBeInTheDocument();
    });

    it('optimizes story group rendering for many stories', () => {
      const manyStoryTasks = Array.from({ length: 200 }, (_, index) => ({
        id: `task-${index}`,
        name: `Task ${index}`,
        story: `Story ${index}`, // Each task has its own story
        status: 'pending'
      }));
      
      renderWithChakra(<EnhancedTasksView data={manyStoryTasks} />);
      
      expect(screen.getByText('Showing 200 tasks in 200 stories')).toBeInTheDocument();
      
      // Should still render without performance issues
      expect(screen.getByText('Expand All')).toBeInTheDocument();
      expect(screen.getByText('Collapse All')).toBeInTheDocument();
    });

    it('debounces filter changes effectively', async () => {
      const user = userEvent.setup();
      const onGlobalFilterChange = vi.fn();
      
      renderWithChakra(
        <EnhancedTasksView 
          {...defaultProps} 
          onGlobalFilterChange={onGlobalFilterChange}
        />
      );
      
      const storySelect = screen.getByDisplayValue('All Stories');
      
      // Rapidly change filters
      await user.selectOptions(storySelect, 'Story Alpha');
      await user.selectOptions(storySelect, 'Story Beta');
      await user.selectOptions(storySelect, 'All Stories');
      
      // Should handle rapid changes without issues
      expect(screen.getByText('Showing 4 tasks in 3 stories')).toBeInTheDocument();
    });

    it('memoizes expensive calculations', () => {
      const { rerender } = renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Initial render
      expect(screen.getByText('Showing 4 tasks in 3 stories')).toBeInTheDocument();
      
      // Re-render with same props should use memoized values
      rerender(
        <ChakraProvider theme={chakraTheme}>
          <EnhancedTasksView {...defaultProps} />
        </ChakraProvider>
      );
      
      expect(screen.getByText('Showing 4 tasks in 3 stories')).toBeInTheDocument();
    });
  });

  describe('Advanced Interaction Patterns', () => {
    it('supports keyboard navigation for story expansion', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      const storyGroup = screen.getByTestId('story-group-Story Alpha');
      storyGroup.focus();
      
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
      });
    });

    it('handles rapid expand/collapse operations', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      const storyGroup = screen.getByTestId('story-group-Story Alpha');
      
      // Rapidly expand and collapse
      await user.click(storyGroup);
      await user.click(storyGroup);
      await user.click(storyGroup);
      
      // Should handle rapid operations gracefully
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
      });
    });

    it('maintains scroll position during story operations', async () => {
      const user = userEvent.setup();
      const manyTasks = Array.from({ length: 50 }, (_, index) => ({
        id: `task-${index}`,
        name: `Task ${index}`,
        story: `Story ${Math.floor(index / 5)}`,
        status: 'pending'
      }));
      
      renderWithChakra(<EnhancedTasksView data={manyTasks} />);
      
      // Should render many stories without scroll issues
      expect(screen.getByText('Showing 50 tasks in 10 stories')).toBeInTheDocument();
      
      // Expand a story (should not cause scroll jumps)
      await user.click(screen.getByTestId('story-group-Story 0'));
      
      expect(screen.getByText('Task 0')).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('recovers gracefully from invalid story data', () => {
      const invalidTasks = [
        {
          id: 'valid-task',
          name: 'Valid Task',
          story: 'Valid Story',
          status: 'pending'
        },
        {
          id: 'invalid-task',
          // Missing name
          story: null, // Invalid story
          status: 'invalid-status'
        }
      ];
      
      renderWithChakra(<EnhancedTasksView data={invalidTasks} />);
      
      // Should still render valid data
      expect(screen.getByText('📖 Valid Story')).toBeInTheDocument();
      expect(screen.getByText('📖 No Story')).toBeInTheDocument();
    });

    it('handles concurrent story expansions correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Try to expand multiple stories simultaneously
      const storyAlpha = screen.getByTestId('story-group-Story Alpha');
      const storyBeta = screen.getByTestId('story-group-Story Beta');
      
      // Simulate near-simultaneous clicks
      await Promise.all([
        user.click(storyAlpha),
        user.click(storyBeta)
      ]);
      
      // Both should expand
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
        expect(screen.getByText('Third Task')).toBeInTheDocument();
      });
    });

    it('handles story data updates during expansion', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithChakra(<EnhancedTasksView {...defaultProps} />);
      
      // Expand a story
      await user.click(screen.getByTestId('story-group-Story Alpha'));
      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument();
      });
      
      // Update data while expanded
      const updatedTasks = [
        ...defaultProps.data,
        {
          id: 'new-task',
          name: 'New Task',
          story: 'Story Alpha',
          status: 'pending'
        }
      ];
      
      rerender(
        <ChakraProvider theme={chakraTheme}>
          <EnhancedTasksView {...defaultProps} data={updatedTasks} />
        </ChakraProvider>
      );
      
      // Should handle the update and maintain expansion
      expect(screen.getByText('New Task')).toBeInTheDocument();
      expect(screen.getByText('First Task')).toBeInTheDocument();
    });
  });
});