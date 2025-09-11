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
      
      expect(screen.getByTestId('tasks-accordion')).toBeInTheDocument();
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

  describe('Performance', () => {
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
  });
});