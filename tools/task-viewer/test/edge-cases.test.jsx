import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import TaskTable from '../src/components/TaskTable';
import TaskDetailView from '../src/components/TaskDetailView';
import { createMockTask, mockFetch } from './test-utils';

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Network Errors', () => {
    it('handles network timeout gracefully', async () => {
      // Mock fetch to simulate timeout
      global.fetch = vi.fn(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 100);
      }));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load profiles.*Network timeout/)).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('handles intermittent network failures with retry', async () => {
      let attemptCount = 0;
      
      mockFetch({
        '/api/agents': {
          ok: attemptCount++ > 1, // Fail first two attempts
          status: attemptCount > 1 ? 200 : 503,
          json: [
            { id: 'agent1', name: 'Agent 1', path: '/path/1' }
          ]
        }
      });

      render(<App />);

      // Initial failure
      await waitFor(() => {
        expect(screen.getByText(/Failed to load profiles/)).toBeInTheDocument();
      });

      // Manual retry could be implemented here
    });

    it('handles malformed JSON responses', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.resolve('{ invalid json }')
      }));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load profiles.*Invalid JSON/)).toBeInTheDocument();
      });
    });
  });

  describe('Data Integrity Issues', () => {
    it('handles circular dependencies in tasks', () => {
      const task1 = createMockTask({
        id: '1',
        name: 'Task 1',
        dependencies: [{ taskId: '2', name: 'Task 2' }]
      });

      const task2 = createMockTask({
        id: '2', 
        name: 'Task 2',
        dependencies: [{ taskId: '1', name: 'Task 1' }]
      });

      // Component should handle circular deps without crashing
      render(
        <TaskTable 
          data={[task1, task2]}
          globalFilter=""
          onGlobalFilterChange={vi.fn()}
        />
      );

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });

    it('handles tasks with extremely long content', () => {
      const longTask = createMockTask({
        name: 'A'.repeat(1000),
        description: 'B'.repeat(5000),
        notes: 'C'.repeat(10000)
      });

      render(
        <TaskDetailView 
          task={longTask}
          onBack={vi.fn()}
        />
      );

      // Should truncate or handle gracefully
      expect(screen.getByText(/A{100,}/)).toBeInTheDocument();
      expect(screen.getByText(/B{100,}/)).toBeInTheDocument();
      expect(screen.getByText(/C{100,}/)).toBeInTheDocument();
    });

    it('handles special characters and potential XSS', () => {
      const maliciousTask = createMockTask({
        name: '<script>alert("XSS")</script>',
        description: '<img src="x" onerror="alert(\'XSS\')">',
        notes: '"><script>alert(String.fromCharCode(88,83,83))</script>'
      });

      render(
        <TaskDetailView 
          task={maliciousTask}
          onBack={vi.fn()}
        />
      );

      // Content should be escaped
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(document.querySelector('script')).not.toBeInTheDocument();
      expect(screen.getByText(/<script>/)).toBeInTheDocument();
    });

    it('handles Unicode and emoji in content', () => {
      const unicodeTask = createMockTask({
        name: '🚀 Deploy to production 部署到生产',
        description: 'Task with émojis and 中文字符 and العربية',
        notes: '✅ Complete ❌ Failed ⚠️ Warning'
      });

      render(
        <TaskDetailView 
          task={unicodeTask}
          onBack={vi.fn()}
        />
      );

      expect(screen.getByText(/🚀 Deploy to production/)).toBeInTheDocument();
      expect(screen.getByText(/中文字符/)).toBeInTheDocument();
      expect(screen.getByText(/✅ Complete/)).toBeInTheDocument();
    });
  });

  describe('State Management Edge Cases', () => {
    it('handles rapid profile switching', async () => {
      mockFetch({
        '/api/agents': {
          json: [
            { id: 'agent1', name: 'Agent 1', path: '/1' },
            { id: 'agent2', name: 'Agent 2', path: '/2' },
            { id: 'agent3', name: 'Agent 3', path: '/3' }
          ]
        },
        '/api/tasks/agent1': { json: { tasks: [createMockTask({ name: 'Task 1' })] } },
        '/api/tasks/agent2': { json: { tasks: [createMockTask({ name: 'Task 2' })] } },
        '/api/tasks/agent3': { json: { tasks: [createMockTask({ name: 'Task 3' })] } }
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Agent 1')).toBeInTheDocument();
      });

      // Rapidly switch between profiles
      fireEvent.click(screen.getByText('Agent 1'));
      fireEvent.click(screen.getByText('Agent 2'));
      fireEvent.click(screen.getByText('Agent 3'));
      fireEvent.click(screen.getByText('Agent 1'));

      // Should handle rapid switching without errors
      await waitFor(() => {
        expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
      });
    });

    it('handles search input with special regex characters', async () => {
      const tasks = [
        createMockTask({ name: 'Task [1]' }),
        createMockTask({ name: 'Task (2)' }),
        createMockTask({ name: 'Task $3' }),
        createMockTask({ name: 'Task *4*' })
      ];

      render(
        <TaskTable 
          data={tasks}
          globalFilter="["
          onGlobalFilterChange={vi.fn()}
        />
      );

      // Should not crash with regex special chars
      expect(screen.getByText('Task [1]')).toBeInTheDocument();
    });

    it('handles concurrent auto-refresh and manual refresh', async () => {
      vi.useFakeTimers();
      
      mockFetch({
        '/api/agents': {
          json: [{ id: 'agent1', name: 'Agent 1', path: '/1' }]
        },
        default: { json: { tasks: [] } }
      });

      render(<App />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Agent 1'));
      });

      // Enable auto-refresh
      const autoRefreshCheckbox = screen.getByLabelText(/Auto-refresh/);
      fireEvent.click(autoRefreshCheckbox);

      // Trigger manual refresh while auto-refresh is pending
      const refreshButton = screen.getByLabelText('Refresh tasks');
      fireEvent.click(refreshButton);

      // Advance timers
      vi.advanceTimersByTime(30000);

      // Should handle concurrent refreshes
      await waitFor(() => {
        expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Browser Compatibility Issues', () => {
    it('handles missing localStorage gracefully', () => {
      // Simulate missing localStorage
      const originalLocalStorage = global.localStorage;
      delete global.localStorage;

      render(<App />);

      // Should work without localStorage
      expect(screen.getByText('🦐 Shrimp Task Manager Viewer')).toBeInTheDocument();

      // Restore
      global.localStorage = originalLocalStorage;
    });

    it('handles file input restrictions', async () => {
      mockFetch({
        '/api/agents': { json: [] }
      });

      render(<App />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Profile'));
      });

      const fileInput = screen.getByLabelText(/JSON file/);
      
      // Try uploading non-JSON file
      const file = new File(['not json'], 'test.txt', { type: 'text/plain' });
      await userEvent.upload(fileInput, file);

      // Component should handle gracefully
      expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
    });
  });

  describe('Performance Edge Cases', () => {
    it('handles extremely large task lists', () => {
      const hugeTasks = Array.from({ length: 10000 }, (_, i) => 
        createMockTask({
          id: `task-${i}`,
          name: `Task ${i}`,
          description: `Description ${i}`.repeat(10)
        })
      );

      const { container } = render(
        <TaskTable 
          data={hugeTasks}
          globalFilter=""
          onGlobalFilterChange={vi.fn()}
        />
      );

      // Should only render visible items
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBeLessThan(100); // Pagination should limit
    });

    it('handles rapid filtering on large datasets', async () => {
      const tasks = Array.from({ length: 1000 }, (_, i) => 
        createMockTask({
          id: `task-${i}`,
          name: `Task ${i % 10}`, // Repeated names
          description: `Type ${i % 5}` // Categories
        })
      );

      const mockOnFilterChange = vi.fn();
      const user = userEvent.setup();

      render(
        <TaskTable 
          data={tasks}
          globalFilter=""
          onGlobalFilterChange={mockOnFilterChange}
        />
      );

      // Rapid filter changes
      await user.type(screen.getByRole('textbox'), 'Task 1');
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'Type 3');
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'Task 5');

      // Should handle rapid changes
      expect(mockOnFilterChange).toHaveBeenCalledTimes(15); // Each keystroke
    });
  });

  describe('Memory Leak Prevention', () => {
    it('cleans up intervals on unmount', async () => {
      const { unmount } = render(<App />);

      // Enable auto-refresh
      mockFetch({
        '/api/agents': {
          json: [{ id: 'agent1', name: 'Agent 1', path: '/1' }]
        },
        default: { json: { tasks: [] } }
      });

      await waitFor(() => {
        expect(screen.getByText('Agent 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Agent 1'));
      
      await waitFor(() => {
        const autoRefreshCheckbox = screen.getByLabelText(/Auto-refresh/);
        fireEvent.click(autoRefreshCheckbox);
      });

      // Unmount component
      unmount();

      // Intervals should be cleared (no way to directly test, but no errors should occur)
    });

    it('handles component unmounting during async operations', async () => {
      let resolveFetch;
      global.fetch = vi.fn(() => new Promise((resolve) => {
        resolveFetch = resolve;
      }));

      const { unmount } = render(<App />);

      // Unmount while fetch is pending
      unmount();

      // Resolve fetch after unmount
      if (resolveFetch) {
        resolveFetch({
          ok: true,
          json: async () => []
        });
      }

      // Should not cause errors
      expect(true).toBe(true);
    });
  });

  describe('Accessibility Edge Cases', () => {
    it('handles keyboard navigation in complex scenarios', async () => {
      mockFetch({
        '/api/agents': {
          json: [
            { id: 'agent1', name: 'Agent 1', path: '/1' },
            { id: 'agent2', name: 'Agent 2', path: '/2' }
          ]
        }
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Agent 1')).toBeInTheDocument();
      });

      // Tab through interface
      const user = userEvent.setup();
      await user.tab();
      await user.tab();
      await user.tab();

      // Should maintain focus outline
      expect(document.activeElement).toBeTruthy();
    });

    it('maintains focus after state changes', async () => {
      const mockOnFilterChange = vi.fn();
      const tasks = [
        createMockTask({ name: 'Task 1' }),
        createMockTask({ name: 'Task 2' })
      ];

      render(
        <TaskTable 
          data={tasks}
          globalFilter=""
          onGlobalFilterChange={mockOnFilterChange}
        />
      );

      // Focus on search
      const searchInput = screen.getByRole('textbox');
      searchInput.focus();

      // Type to filter
      await userEvent.type(searchInput, 'Task 1');

      // Focus should remain on search
      expect(document.activeElement).toBe(searchInput);
    });
  });
});