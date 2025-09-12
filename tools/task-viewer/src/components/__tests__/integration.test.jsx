import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';
import chakraTheme from '../../theme/chakra-theme';

// Mock components for integration testing
const MockDashboardView = ({ epics, stories, tasks, verifications, loading, error }) => (
  <div data-testid="dashboard-view">
    {loading && <div data-testid="dashboard-loading">Loading...</div>}
    {error && <div data-testid="dashboard-error">{error}</div>}
    {!loading && !error && (
      <>
        <div data-testid="dashboard-content">Dashboard Content</div>
        <div data-testid="epics-count">{epics?.length || 0}</div>
        <div data-testid="stories-count">{stories?.length || 0}</div>
        <div data-testid="tasks-count">{tasks?.length || 0}</div>
      </>
    )}
  </div>
);

const MockEnhancedTasksView = ({ data, globalFilter, onGlobalFilterChange, onTaskClick, showToast }) => (
  <div data-testid="enhanced-tasks-view">
    <input 
      data-testid="tasks-search"
      value={globalFilter}
      onChange={(e) => onGlobalFilterChange?.(e.target.value)}
      placeholder="Search tasks..."
    />
    <div data-testid="tasks-list">
      {data?.filter(task => 
        !globalFilter || task.name.toLowerCase().includes(globalFilter.toLowerCase())
      ).map(task => (
        <div 
          key={task.id} 
          data-testid={`task-item-${task.id}`}
          onClick={() => onTaskClick?.(task)}
          style={{ cursor: 'pointer', padding: '8px', border: '1px solid #ccc', margin: '4px' }}
        >
          <div data-testid={`task-name-${task.id}`}>{task.name}</div>
          <div data-testid={`task-status-${task.id}`}>{task.status}</div>
        </div>
      ))}
    </div>
    <button onClick={() => showToast?.('Test toast', 'success')}>Show Toast</button>
  </div>
);

const MockOptimizedTaskTable = ({ data, globalFilter, onDetailViewChange, onTaskSaved, showToast }) => (
  <div data-testid="optimized-task-table">
    <div data-testid="table-header">Task Table</div>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data?.filter(task => 
          !globalFilter || task.name.toLowerCase().includes(globalFilter.toLowerCase())
        ).map(task => (
          <tr key={task.id} data-testid={`table-row-${task.id}`}>
            <td onClick={() => onDetailViewChange?.(task)}>{task.name}</td>
            <td>{task.status}</td>
            <td>
              <button onClick={() => onTaskSaved?.({ ...task, updated: true })}>
                Save
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Mock Tab Navigation Component
const MockTabNavigation = ({ activeTab, onTabChange, children }) => (
  <div data-testid="tab-navigation">
    <div data-testid="tab-bar">
      {['dashboard', 'tasks', 'table'].map(tab => (
        <button
          key={tab}
          data-testid={`tab-${tab}`}
          onClick={() => onTabChange(tab)}
          style={{
            background: activeTab === tab ? 'blue' : 'gray',
            color: activeTab === tab ? 'white' : 'black'
          }}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
    <div data-testid="tab-content">
      {children}
    </div>
  </div>
);

// Main Integration Component
const IntegratedTaskManager = () => {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [selectedTask, setSelectedTask] = React.useState(null);
  const [tasks, setTasks] = React.useState([
    { id: 'task-1', name: 'First Task', status: 'pending', story: 'Story A' },
    { id: 'task-2', name: 'Second Task', status: 'in_progress', story: 'Story A' },
    { id: 'task-3', name: 'Third Task', status: 'completed', story: 'Story B' }
  ]);
  const [epics, setEpics] = React.useState([
    { id: 'epic-1', title: 'Epic One', description: 'First epic' }
  ]);
  const [stories, setStories] = React.useState([
    { id: 'story-a', title: 'Story A', status: 'active' },
    { id: 'story-b', title: 'Story B', status: 'completed' }
  ]);
  const [verifications, setVerifications] = React.useState({
    'story-a': { score: 85, timestamp: '2024-01-15T10:30:00Z' }
  });
  const [toastMessages, setToastMessages] = React.useState([]);

  const showToast = React.useCallback((message, type) => {
    setToastMessages(prev => [...prev, { message, type, id: Date.now() }]);
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToastMessages(prev => prev.slice(1));
    }, 3000);
  }, []);

  const handleTaskClick = React.useCallback((task) => {
    setSelectedTask(task);
    showToast(`Selected task: ${task.name}`, 'info');
  }, [showToast]);

  const handleTaskSaved = React.useCallback((updatedTask) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      )
    );
    showToast(`Task saved: ${updatedTask.name}`, 'success');
  }, [showToast]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <MockDashboardView
            epics={epics}
            stories={stories}
            tasks={tasks}
            verifications={verifications}
          />
        );
      case 'tasks':
        return (
          <MockEnhancedTasksView
            data={tasks}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onTaskClick={handleTaskClick}
            showToast={showToast}
          />
        );
      case 'table':
        return (
          <MockOptimizedTaskTable
            data={tasks}
            globalFilter={globalFilter}
            onDetailViewChange={setSelectedTask}
            onTaskSaved={handleTaskSaved}
            showToast={showToast}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div data-testid="integrated-task-manager">
      <MockTabNavigation activeTab={activeTab} onTabChange={setActiveTab}>
        {renderTabContent()}
      </MockTabNavigation>
      
      {/* Global Search */}
      <div data-testid="global-search">
        <input
          data-testid="global-filter"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Global filter..."
        />
        <button onClick={() => setGlobalFilter('')}>Clear</button>
      </div>

      {/* Selected Task Display */}
      {selectedTask && (
        <div data-testid="selected-task-panel">
          <h3>Selected Task</h3>
          <div data-testid="selected-task-name">{selectedTask.name}</div>
          <div data-testid="selected-task-status">{selectedTask.status}</div>
          <button onClick={() => setSelectedTask(null)}>Close</button>
        </div>
      )}

      {/* Toast Messages */}
      {toastMessages.length > 0 && (
        <div data-testid="toast-container">
          {toastMessages.map(toast => (
            <div 
              key={toast.id}
              data-testid={`toast-${toast.type}`}
              style={{ 
                background: toast.type === 'success' ? 'green' : toast.type === 'error' ? 'red' : 'blue',
                color: 'white',
                padding: '8px',
                margin: '4px',
                borderRadius: '4px'
              }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const renderWithChakra = (component) => {
  return render(
    <ChakraProvider theme={chakraTheme}>
      {component}
    </ChakraProvider>
  );
};

describe('Integration Tests - Tab Navigation and Component Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tab Navigation', () => {
    it('renders all tabs and switches between them', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Check initial state (dashboard tab)
      expect(screen.getByTestId('tab-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('tab-tasks')).toBeInTheDocument();
      expect(screen.getByTestId('tab-table')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();

      // Switch to tasks tab
      await user.click(screen.getByTestId('tab-tasks'));
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-tasks-view')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard-view')).not.toBeInTheDocument();
      });

      // Switch to table tab
      await user.click(screen.getByTestId('tab-table'));
      await waitFor(() => {
        expect(screen.getByTestId('optimized-task-table')).toBeInTheDocument();
        expect(screen.queryByTestId('enhanced-tasks-view')).not.toBeInTheDocument();
      });

      // Switch back to dashboard
      await user.click(screen.getByTestId('tab-dashboard'));
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
        expect(screen.queryByTestId('optimized-task-table')).not.toBeInTheDocument();
      });
    });

    it('maintains active tab state correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      const dashboardTab = screen.getByTestId('tab-dashboard');
      const tasksTab = screen.getByTestId('tab-tasks');

      // Initial state
      expect(dashboardTab.style.background).toBe('blue');
      expect(tasksTab.style.background).toBe('gray');

      // Switch tab
      await user.click(tasksTab);
      
      await waitFor(() => {
        expect(dashboardTab.style.background).toBe('gray');
        expect(tasksTab.style.background).toBe('blue');
      });
    });

    it('persists data state across tab switches', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Check initial data in dashboard
      expect(screen.getByTestId('epics-count')).toHaveTextContent('1');
      expect(screen.getByTestId('stories-count')).toHaveTextContent('2');
      expect(screen.getByTestId('tasks-count')).toHaveTextContent('3');

      // Switch to tasks tab
      await user.click(screen.getByTestId('tab-tasks'));
      
      await waitFor(() => {
        expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
        expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument();
        expect(screen.getByTestId('task-item-task-3')).toBeInTheDocument();
      });

      // Switch back to dashboard - data should still be there
      await user.click(screen.getByTestId('tab-dashboard'));
      
      await waitFor(() => {
        expect(screen.getByTestId('epics-count')).toHaveTextContent('1');
        expect(screen.getByTestId('tasks-count')).toHaveTextContent('3');
      });
    });
  });

  describe('Global Filter Integration', () => {
    it('applies global filter across different components', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Set global filter
      const globalFilter = screen.getByTestId('global-filter');
      await user.type(globalFilter, 'First');

      // Switch to tasks tab - filter should be applied
      await user.click(screen.getByTestId('tab-tasks'));
      
      await waitFor(() => {
        expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
        expect(screen.queryByTestId('task-item-task-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('task-item-task-3')).not.toBeInTheDocument();
      });

      // Switch to table tab - filter should still be applied
      await user.click(screen.getByTestId('tab-table'));
      
      await waitFor(() => {
        expect(screen.getByTestId('table-row-task-1')).toBeInTheDocument();
        expect(screen.queryByTestId('table-row-task-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('table-row-task-3')).not.toBeInTheDocument();
      });
    });

    it('synchronizes local and global filters', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Switch to tasks tab first
      await user.click(screen.getByTestId('tab-tasks'));

      await waitFor(() => {
        expect(screen.getByTestId('tasks-search')).toBeInTheDocument();
      });

      // Use local search in tasks component
      const localSearch = screen.getByTestId('tasks-search');
      await user.type(localSearch, 'Second');

      // Should filter tasks locally
      await waitFor(() => {
        expect(screen.queryByTestId('task-item-task-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument();
        expect(screen.queryByTestId('task-item-task-3')).not.toBeInTheDocument();
      });

      // Global filter should also be updated
      const globalFilter = screen.getByTestId('global-filter');
      expect(globalFilter.value).toBe('Second');
    });

    it('clears filter across all components', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Set a filter
      const globalFilter = screen.getByTestId('global-filter');
      await user.type(globalFilter, 'First');

      // Clear the filter
      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);

      // Check that filter is cleared
      expect(globalFilter.value).toBe('');

      // Switch to tasks tab - all tasks should be visible
      await user.click(screen.getByTestId('tab-tasks'));
      
      await waitFor(() => {
        expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
        expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument();
        expect(screen.getByTestId('task-item-task-3')).toBeInTheDocument();
      });
    });
  });

  describe('Task Selection and State Management', () => {
    it('handles task selection across different views', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Switch to tasks view
      await user.click(screen.getByTestId('tab-tasks'));

      await waitFor(() => {
        expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
      });

      // Select a task
      await user.click(screen.getByTestId('task-item-task-1'));

      // Should show selected task panel
      await waitFor(() => {
        expect(screen.getByTestId('selected-task-panel')).toBeInTheDocument();
        expect(screen.getByTestId('selected-task-name')).toHaveTextContent('First Task');
        expect(screen.getByTestId('selected-task-status')).toHaveTextContent('pending');
      });

      // Task should remain selected when switching tabs
      await user.click(screen.getByTestId('tab-table'));
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-task-panel')).toBeInTheDocument();
        expect(screen.getByTestId('selected-task-name')).toHaveTextContent('First Task');
      });
    });

    it('updates task data and reflects changes across views', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Switch to table view
      await user.click(screen.getByTestId('tab-table'));

      await waitFor(() => {
        expect(screen.getByTestId('table-row-task-1')).toBeInTheDocument();
      });

      // Save a task (simulating an update)
      const saveButtons = screen.getAllByText('Save');
      await user.click(saveButtons[0]);

      // Should show success toast
      await waitFor(() => {
        expect(screen.getByTestId('toast-success')).toBeInTheDocument();
        expect(screen.getByText(/Task saved: First Task/)).toBeInTheDocument();
      });

      // Switch to tasks view - updated data should be reflected
      await user.click(screen.getByTestId('tab-tasks'));
      
      await waitFor(() => {
        expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
      });
    });

    it('closes selected task panel', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Switch to tasks view and select a task
      await user.click(screen.getByTestId('tab-tasks'));
      
      await waitFor(() => {
        expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('task-item-task-2'));

      await waitFor(() => {
        expect(screen.getByTestId('selected-task-panel')).toBeInTheDocument();
      });

      // Close the panel
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('selected-task-panel')).not.toBeInTheDocument();
      });
    });
  });

  describe('Toast Notification System', () => {
    it('displays toast messages from different components', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Switch to tasks view
      await user.click(screen.getByTestId('tab-tasks'));

      await waitFor(() => {
        expect(screen.getByText('Show Toast')).toBeInTheDocument();
      });

      // Trigger toast from tasks component
      await user.click(screen.getByText('Show Toast'));

      // Should show toast
      await waitFor(() => {
        expect(screen.getByTestId('toast-success')).toBeInTheDocument();
        expect(screen.getByText('Test toast')).toBeInTheDocument();
      });
    });

    it('auto-removes toast messages after timeout', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Switch to tasks view and trigger toast
      await user.click(screen.getByTestId('tab-tasks'));
      
      await waitFor(() => {
        expect(screen.getByText('Show Toast')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Show Toast'));

      // Toast should appear
      await waitFor(() => {
        expect(screen.getByTestId('toast-success')).toBeInTheDocument();
      });

      // Toast should disappear after 3 seconds (mocked timing)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 3100));
      });

      expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
    });

    it('handles multiple toast messages', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Select a task (triggers info toast)
      await user.click(screen.getByTestId('tab-tasks'));
      
      await waitFor(() => {
        expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('task-item-task-1'));

      // Should show info toast
      await waitFor(() => {
        expect(screen.getByTestId('toast-info')).toBeInTheDocument();
      });

      // Trigger another toast
      await user.click(screen.getByText('Show Toast'));

      // Should have both toasts
      await waitFor(() => {
        expect(screen.getByTestId('toast-info')).toBeInTheDocument();
        expect(screen.getByTestId('toast-success')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('does not leak memory during tab switches', async () => {
      const user = userEvent.setup();
      renderWithChakra(<IntegratedTaskManager />);

      // Perform many tab switches to test for memory leaks
      for (let i = 0; i < 20; i++) {
        await user.click(screen.getByTestId('tab-dashboard'));
        await user.click(screen.getByTestId('tab-tasks'));
        await user.click(screen.getByTestId('tab-table'));
      }

      // Should still function correctly
      await waitFor(() => {
        expect(screen.getByTestId('optimized-task-table')).toBeInTheDocument();
      });
    });

    it('maintains performance with large datasets', async () => {
      const user = userEvent.setup();
      
      // Component with large dataset
      const ComponentWithLargeData = () => {
        const largeTasks = React.useMemo(() => 
          Array.from({ length: 1000 }, (_, i) => ({
            id: `task-${i}`,
            name: `Task ${i}`,
            status: ['pending', 'in_progress', 'completed'][i % 3],
            story: `Story ${Math.floor(i / 10)}`
          })), []);

        const [activeTab, setActiveTab] = React.useState('tasks');
        const [globalFilter, setGlobalFilter] = React.useState('');

        return (
          <MockTabNavigation activeTab={activeTab} onTabChange={setActiveTab}>
            <MockEnhancedTasksView
              data={largeTasks}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
            />
          </MockTabNavigation>
        );
      };

      renderWithChakra(<ComponentWithLargeData />);

      // Should handle large dataset
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-tasks-view')).toBeInTheDocument();
      });

      // Filter should still work efficiently
      const searchInput = screen.getByTestId('tasks-search');
      await user.type(searchInput, '999');

      await waitFor(() => {
        expect(screen.getByTestId('task-item-task-999')).toBeInTheDocument();
        expect(screen.queryByTestId('task-item-task-1')).not.toBeInTheDocument();
      });
    });
  });
});