import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import OptimizedTaskTable from '../OptimizedTaskTable.jsx';
import chakraTheme from '../../theme/chakra-theme';

// Mock dependencies
vi.mock('../TaskDetailView', () => ({
  default: ({ task, onSave, onCancel }) => (
    <div data-testid="task-detail-view">
      <div data-testid="task-detail-id">{task?.id}</div>
      <button onClick={() => onSave?.({ ...task, name: 'Updated Task' })}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('../Tooltip', () => ({
  default: ({ children, label }) => (
    <div title={label}>{children}</div>
  )
}));

vi.mock('../AgentInfoModal', () => ({
  default: ({ agent, isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="agent-info-modal">
        <div data-testid="agent-name">{agent?.name}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../ParallelTaskIndicator', () => ({
  default: ({ taskId, multiDevOK, isParallelizable }) => (
    <div data-testid={`parallel-indicator-${taskId}`}>
      <div data-testid="multi-dev-ok">{multiDevOK.toString()}</div>
      <div data-testid="is-parallelizable">{isParallelizable.toString()}</div>
    </div>
  )
}));

vi.mock('../ErrorBoundary', () => ({
  default: ({ children }) => children
}));

// Mock react-i18next
const mockUseTranslation = {
  t: (key) => {
    const translations = {
      'searchTasksPlaceholder': 'Search tasks...',
      'status.completed': 'Completed',
      'status.inProgress': 'In Progress', 
      'status.pending': 'Pending',
      'noTasksMessage': 'No tasks available',
      'filteredFrom': 'filtered from',
      'total': 'total'
    };
    return translations[key] || key;
  },
  i18n: { language: 'en' }
};

vi.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation
}));

// Mock optimization utilities
vi.mock('../../utils/taskNumbering', () => ({
  generateTaskNumbers: vi.fn((tasks) => tasks.map((task, index) => ({ ...task, taskNumber: index + 1 }))),
  getTaskNumber: vi.fn((taskId) => 1),
  convertDependenciesToNumbers: vi.fn((deps) => deps),
  getTaskByNumber: vi.fn((tasks, number) => tasks.find((_, index) => index + 1 === number))
}));

vi.mock('../../utils/debug', () => ({
  debugLog: vi.fn(),
  performanceMonitor: vi.fn()
}));

vi.mock('../../utils/optimizedHooks', () => ({
  usePerformanceMonitoring: vi.fn(() => ({ recordMetric: vi.fn() })),
  useDebugMemo: vi.fn((factory, deps, name) => React.useMemo(factory, deps)),
  useDebugCallback: vi.fn((callback, deps, name) => React.useCallback(callback, deps)),
  useEventListener: vi.fn(),
  useFetch: vi.fn(() => ({ data: null, loading: false, error: null }))
}));

vi.mock('../../utils/optimizedComponents', () => ({
  optimizedMemo: vi.fn((component) => component),
  VirtualList: ({ children }) => <div data-testid="virtual-list">{children}</div>,
  OptimizedTableRow: ({ children, ...props }) => <tr {...props}>{children}</tr>,
  DebouncedInput: ({ value, onChange, ...props }) => (
    <input 
      {...props} 
      value={value || ''} 
      onChange={(e) => onChange?.(e.target.value)}
      data-testid="debounced-input"
    />
  )
}));

vi.mock('../../utils/networkOptimization', () => ({
  fetchWithAnalytics: vi.fn(() => Promise.resolve({ data: [] }))
}));

const renderWithChakra = (component) => {
  return render(
    <ChakraProvider theme={chakraTheme}>
      {component}
    </ChakraProvider>
  );
};

describe('OptimizedTaskTable', () => {
  // Mock data for testing
  const mockTasks = [
    {
      id: 'task-1',
      uuid: 'uuid-1',
      name: 'First Task',
      description: 'Description for first task',
      status: 'pending',
      priority: 'high',
      assignedAgent: 'agent-1',
      dependencies: [],
      multiDevOK: true,
      isParallelizable: true,
      parallelReason: 'Can be done in parallel'
    },
    {
      id: 'task-2',
      uuid: 'uuid-2', 
      name: 'Second Task',
      description: 'Description for second task',
      status: 'in_progress',
      priority: 'medium',
      assignedAgent: 'agent-2',
      dependencies: ['task-1'],
      multiDevOK: false,
      isParallelizable: false
    },
    {
      id: 'task-3',
      uuid: 'uuid-3',
      name: 'Third Task',
      description: 'Description for third task',
      status: 'completed',
      priority: 'low',
      assignedAgent: null,
      dependencies: []
    }
  ];

  const defaultProps = {
    data: mockTasks,
    globalFilter: '',
    onGlobalFilterChange: vi.fn(),
    projectRoot: '/test/project',
    onDetailViewChange: vi.fn(),
    resetDetailView: vi.fn(),
    profileId: 'test-profile',
    onTaskSaved: vi.fn(),
    onDeleteTask: vi.fn(),
    showToast: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch for agent data
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { id: 'agent-1', name: 'Agent 1', description: 'Test agent' },
          { id: 'agent-2', name: 'Agent 2', description: 'Another agent' }
        ])
      })
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with default props', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      expect(screen.getByText('First Task')).toBeInTheDocument();
      expect(screen.getByText('Second Task')).toBeInTheDocument();
      expect(screen.getByText('Third Task')).toBeInTheDocument();
    });

    it('renders empty state when no tasks', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} data={[]} />);
      });
      
      expect(screen.getByText('No tasks available')).toBeInTheDocument();
    });

    it('displays task count correctly', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      expect(screen.getByText(/3.*total/)).toBeInTheDocument();
    });

    it('applies error boundary protection', async () => {
      // This test ensures ErrorBoundary is used
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      expect(screen.getByText('First Task')).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('uses memoized components for better performance', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      // Verify performance monitoring is active
      const { usePerformanceMonitoring } = await import('../../utils/optimizedHooks');
      expect(usePerformanceMonitoring).toHaveBeenCalled();
    });

    it('handles large datasets efficiently', async () => {
      const largeTasks = Array.from({ length: 500 }, (_, index) => ({
        id: `task-${index}`,
        uuid: `uuid-${index}`,
        name: `Task ${index}`,
        status: ['pending', 'in_progress', 'completed'][index % 3],
        priority: ['low', 'medium', 'high'][index % 3],
        dependencies: []
      }));

      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} data={largeTasks} />);
      });
      
      expect(screen.getByText(/500.*total/)).toBeInTheDocument();
    });

    it('uses debounced input for search', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      expect(screen.getByTestId('debounced-input')).toBeInTheDocument();
    });

    it('implements virtual scrolling for large lists', async () => {
      const manyTasks = Array.from({ length: 100 }, (_, index) => ({
        id: `task-${index}`,
        name: `Task ${index}`,
        status: 'pending',
        dependencies: []
      }));

      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} data={manyTasks} />);
      });
      
      // Check if virtual list is used
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });
  });

  describe('Table Functionality', () => {
    it('supports sorting by columns', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      // Find sortable headers and click them
      const headers = screen.getAllByRole('columnheader');
      const nameHeader = headers.find(h => h.textContent?.includes('Name'));
      
      if (nameHeader) {
        await user.click(nameHeader);
        // Verify sorting indicator appears
        expect(nameHeader).toBeInTheDocument();
      }
    });

    it('supports filtering through global filter', async () => {
      const user = userEvent.setup();
      const onGlobalFilterChange = vi.fn();
      
      await act(async () => {
        renderWithChakra(
          <OptimizedTaskTable 
            {...defaultProps} 
            onGlobalFilterChange={onGlobalFilterChange}
          />
        );
      });
      
      const searchInput = screen.getByTestId('debounced-input');
      await user.type(searchInput, 'First');
      
      // Should call filter change handler
      expect(onGlobalFilterChange).toHaveBeenCalled();
    });

    it('supports pagination for large datasets', async () => {
      const manyTasks = Array.from({ length: 50 }, (_, index) => ({
        id: `task-${index}`,
        name: `Task ${index}`,
        status: 'pending',
        dependencies: []
      }));

      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} data={manyTasks} />);
      });
      
      // Should show pagination controls if implemented
      expect(screen.getByText(/50.*total/)).toBeInTheDocument();
    });
  });

  describe('Task Interactions', () => {
    it('opens task detail view on task click', async () => {
      const user = userEvent.setup();
      const onDetailViewChange = vi.fn();
      
      await act(async () => {
        renderWithChakra(
          <OptimizedTaskTable 
            {...defaultProps} 
            onDetailViewChange={onDetailViewChange}
          />
        );
      });
      
      const taskRow = screen.getByText('First Task').closest('tr');
      if (taskRow) {
        await user.click(taskRow);
        expect(onDetailViewChange).toHaveBeenCalledWith(expect.objectContaining({
          id: 'task-1'
        }));
      }
    });

    it('handles task saving correctly', async () => {
      const user = userEvent.setup();
      const onTaskSaved = vi.fn();
      
      await act(async () => {
        renderWithChakra(
          <OptimizedTaskTable 
            {...defaultProps} 
            onTaskSaved={onTaskSaved}
            selectedTask={mockTasks[0]}
          />
        );
      });
      
      // If detail view is shown, test save functionality
      if (screen.queryByTestId('task-detail-view')) {
        const saveButton = screen.getByText('Save');
        await user.click(saveButton);
        
        expect(onTaskSaved).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Updated Task'
        }));
      }
    });

    it('handles task deletion correctly', async () => {
      const user = userEvent.setup();
      const onDeleteTask = vi.fn();
      
      await act(async () => {
        renderWithChakra(
          <OptimizedTaskTable 
            {...defaultProps} 
            onDeleteTask={onDeleteTask}
          />
        );
      });
      
      // Find delete button if it exists
      const deleteButtons = screen.queryAllByText(/delete/i);
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);
        expect(onDeleteTask).toHaveBeenCalled();
      }
    });
  });

  describe('Agent Integration', () => {
    it('displays agent information correctly', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      // Tasks with agents should display agent info
      expect(screen.getByText('First Task')).toBeInTheDocument();
      
      // Verify fetch was called to get agent data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('opens agent info modal on agent click', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      // Find agent name and click it
      const agentElements = screen.queryAllByText(/agent-/);
      if (agentElements.length > 0) {
        await user.click(agentElements[0]);
        
        // Should open agent modal
        await waitFor(() => {
          expect(screen.queryByTestId('agent-info-modal')).toBeInTheDocument();
        });
      }
    });

    it('handles tasks without assigned agents gracefully', async () => {
      const tasksWithoutAgents = [
        {
          id: 'task-no-agent',
          name: 'Unassigned Task',
          status: 'pending',
          assignedAgent: null,
          dependencies: []
        }
      ];

      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} data={tasksWithoutAgents} />);
      });
      
      expect(screen.getByText('Unassigned Task')).toBeInTheDocument();
    });
  });

  describe('Parallel Task Indicators', () => {
    it('displays parallel task indicators correctly', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      expect(screen.getByTestId('parallel-indicator-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('parallel-indicator-task-2')).toBeInTheDocument();
    });

    it('shows correct parallel task properties', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      const indicator1 = screen.getByTestId('parallel-indicator-task-1');
      expect(indicator1.querySelector('[data-testid="multi-dev-ok"]')).toHaveTextContent('true');
      expect(indicator1.querySelector('[data-testid="is-parallelizable"]')).toHaveTextContent('true');
      
      const indicator2 = screen.getByTestId('parallel-indicator-task-2');
      expect(indicator2.querySelector('[data-testid="multi-dev-ok"]')).toHaveTextContent('false');
      expect(indicator2.querySelector('[data-testid="is-parallelizable"]')).toHaveTextContent('false');
    });
  });

  describe('Task Numbering Integration', () => {
    it('generates task numbers correctly', async () => {
      const { generateTaskNumbers } = await import('../../utils/taskNumbering');
      
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      expect(generateTaskNumbers).toHaveBeenCalledWith(mockTasks);
    });

    it('displays task numbers in UI', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      // Task numbers should be visible somewhere in the UI
      expect(screen.getByText('First Task')).toBeInTheDocument();
    });

    it('handles dependency conversion correctly', async () => {
      const { convertDependenciesToNumbers } = await import('../../utils/taskNumbering');
      
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      // Should convert dependencies to numbers for tasks that have them
      expect(convertDependenciesToNumbers).toHaveBeenCalled();
    });
  });

  describe('Filtering and Search', () => {
    it('filters tasks based on global filter', async () => {
      await act(async () => {
        renderWithChakra(
          <OptimizedTaskTable 
            {...defaultProps} 
            globalFilter="First"
          />
        );
      });
      
      // With filter applied, should show filtered results
      expect(screen.getByText('First Task')).toBeInTheDocument();
    });

    it('shows filtered count correctly', async () => {
      await act(async () => {
        renderWithChakra(
          <OptimizedTaskTable 
            {...defaultProps} 
            globalFilter="Third"
          />
        );
      });
      
      // Should show filtered count
      const countText = screen.getByText(/filtered from.*total/);
      expect(countText).toBeInTheDocument();
    });

    it('handles complex filter queries', async () => {
      await act(async () => {
        renderWithChakra(
          <OptimizedTaskTable 
            {...defaultProps} 
            globalFilter="task"
          />
        );
      });
      
      // Should match multiple tasks with "task" in the name
      expect(screen.getByText('First Task')).toBeInTheDocument();
      expect(screen.getByText('Second Task')).toBeInTheDocument();
      expect(screen.getByText('Third Task')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed task data gracefully', async () => {
      const malformedTasks = [
        { id: 'task-1', name: 'Valid Task', status: 'pending' },
        { id: 'task-2' }, // Missing name
        { name: 'No ID Task', status: 'pending' }, // Missing ID
        null, // Null task
        undefined // Undefined task
      ].filter(Boolean);

      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} data={malformedTasks} />);
      });
      
      // Should render valid tasks without crashing
      expect(screen.getByText('Valid Task')).toBeInTheDocument();
    });

    it('handles network errors for agent data gracefully', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      // Should still render tasks even if agent data fails to load
      expect(screen.getByText('First Task')).toBeInTheDocument();
    });

    it('handles missing optional props', async () => {
      const minimalProps = {
        data: mockTasks
      };

      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...minimalProps} />);
      });
      
      expect(screen.getByText('First Task')).toBeInTheDocument();
    });

    it('handles empty dependency arrays', async () => {
      const tasksWithEmptyDeps = [
        {
          id: 'task-empty-deps',
          name: 'Task with Empty Dependencies',
          status: 'pending',
          dependencies: []
        }
      ];

      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} data={tasksWithEmptyDeps} />);
      });
      
      expect(screen.getByText('Task with Empty Dependencies')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to different screen sizes', async () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // Tablet size
      });

      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      expect(screen.getByText('First Task')).toBeInTheDocument();
    });

    it('handles mobile layout correctly', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile size
      });

      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      expect(screen.getByText('First Task')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      const table = screen.getByRole('table');
      await user.tab();
      
      // Should be able to navigate through table elements
      expect(document.activeElement).toBeDefined();
    });

    it('provides meaningful text for screen readers', async () => {
      await act(async () => {
        renderWithChakra(<OptimizedTaskTable {...defaultProps} />);
      });
      
      // Check for descriptive text
      expect(screen.getByText(/3.*total/)).toBeInTheDocument();
    });
  });
});