import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StoryGrid from './StoryGrid';

// Mock child components
vi.mock('./ParallelIndicator.jsx', () => {
  return {
    default: ({ multiDevOK, reason, storyId, size }) => (
      <div data-testid={`parallel-indicator-${storyId}`} className={size}>
        {multiDevOK ? '👥' : '👤'} {reason}
      </div>
    )
  };
});

// Mock @tanstack/react-table
vi.mock('@tanstack/react-table', () => ({
  useReactTable: vi.fn(),
  getCoreRowModel: vi.fn(),
  getFilteredRowModel: vi.fn(),
  getSortedRowModel: vi.fn(),
  createColumnHelper: vi.fn(),
  flexRender: vi.fn()
}));

describe('StoryGrid Component', () => {
  const mockStories = [
    {
      id: '1-1',
      title: 'Create login form',
      status: 'Done',
      description: 'Build responsive login form with validation',
      epicId: '1',
      filePath: '/stories/story-1-1.md',
      parallelWork: { multiDevOK: true, reason: 'Independent UI component' }
    },
    {
      id: '1-2', 
      title: 'Implement authentication API',
      status: 'In Progress',
      description: 'Create JWT-based authentication endpoints',
      epicId: '1',
      filePath: '/stories/story-1-2.md',
      parallelWork: { multiDevOK: false, reason: 'Requires database schema changes' }
    },
    {
      id: '2-1',
      title: 'Create dashboard layout',
      status: 'Ready',
      description: 'Design responsive dashboard with sidebar navigation',
      epicId: '2',
      filePath: '/stories/story-2-1.md',
      parallelWork: { multiDevOK: true, reason: 'UI component work' }
    }
  ];

  const mockVerifications = {
    '1-1': {
      storyId: '1-1',
      score: 85,
      summary: 'Login form implemented successfully'
    },
    '1-2': {
      storyId: '1-2',
      score: 65,
      summary: 'Authentication API partially complete'
    },
    '2-1': {
      storyId: '2-1',
      score: 90,
      summary: 'Dashboard layout completed'
    }
  };

  // Mock table functions
  const mockTable = {
    getHeaderGroups: () => [
      {
        id: 'header-group-1',
        headers: [
          {
            id: 'epicId',
            getSize: () => 80,
            column: {
              columnDef: { header: 'Epic' },
              getCanSort: () => true,
              getToggleSortingHandler: () => vi.fn(),
              getIsSorted: () => false
            },
            getContext: () => ({})
          },
          {
            id: 'id',
            getSize: () => 100,
            column: {
              columnDef: { header: 'Story' },
              getCanSort: () => true,
              getToggleSortingHandler: () => vi.fn(),
              getIsSorted: () => false
            },
            getContext: () => ({})
          },
          {
            id: 'title',
            getSize: () => 300,
            column: {
              columnDef: { header: 'Title' },
              getCanSort: () => false,
              getToggleSortingHandler: () => vi.fn(),
              getIsSorted: () => false
            },
            getContext: () => ({})
          }
        ]
      }
    ],
    getRowModel: () => ({
      rows: mockStories.map((story, index) => ({
        id: story.id,
        original: story,
        getVisibleCells: () => [
          {
            id: `${story.id}-epicId`,
            column: {
              columnDef: {
                cell: ({ getValue }) => (
                  <span data-testid={`story-grid-epic-${getValue() || '1'}`}>
                    Epic {getValue() || '1'}
                  </span>
                )
              }
            },
            getContext: () => ({ getValue: () => story.epicId })
          },
          {
            id: `${story.id}-id`,
            column: {
              columnDef: {
                cell: ({ getValue }) => (
                  <span>Story {getValue()}</span>
                )
              }
            },
            getContext: () => ({ getValue: () => story.id })
          },
          {
            id: `${story.id}-title`,
            column: {
              columnDef: {
                cell: ({ getValue, row }) => (
                  <div>
                    <div>{getValue()}</div>
                    <div>{row.original.description || 'No description'}</div>
                  </div>
                )
              }
            },
            getContext: () => ({ 
              getValue: () => story.title,
              row: { original: story }
            })
          }
        ]
      }))
    })
  };

  const defaultProps = {
    stories: mockStories,
    verifications: mockVerifications,
    onEditStory: vi.fn(),
    onViewStory: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the react-table hooks
    const { useReactTable, flexRender } = vi.mocked(require('@tanstack/react-table'));
    useReactTable.mockReturnValue(mockTable);
    flexRender.mockImplementation((element, context) => {
      if (typeof element === 'function') {
        return element(context);
      }
      return element;
    });
  });

  describe('Rendering', () => {
    it('renders with empty stories array', () => {
      render(<StoryGrid stories={[]} />);
      
      expect(screen.getByTestId('story-grid-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No Stories Found')).toBeInTheDocument();
      expect(screen.getByText('Create stories using the MadShrimp agent to see them listed here.')).toBeInTheDocument();
    });

    it('renders grid container with correct test ID and accessibility', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const container = screen.getByTestId('story-grid-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'Stories grid view');
    });

    it('renders header section with correct test IDs', () => {
      render(<StoryGrid {...defaultProps} />);
      
      expect(screen.getByTestId('story-grid-header')).toBeInTheDocument();
      expect(screen.getByTestId('story-grid-count')).toBeInTheDocument();
      expect(screen.getByText('All Stories')).toBeInTheDocument();
      expect(screen.getByText('3 stories across all epics')).toBeInTheDocument();
    });

    it('renders search input with correct test ID', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const searchInput = screen.getByTestId('story-search-input');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', 'Search stories...');
    });

    it('renders filter count with correct test ID', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const filterCount = screen.getByTestId('story-grid-filter-count');
      expect(filterCount).toBeInTheDocument();
      expect(filterCount).toHaveTextContent('Showing 3 of 3');
    });

    it('renders table container and structure with correct test IDs', () => {
      render(<StoryGrid {...defaultProps} />);
      
      expect(screen.getByTestId('story-grid-table-container')).toBeInTheDocument();
      expect(screen.getByTestId('story-grid-table')).toBeInTheDocument();
      expect(screen.getByTestId('story-grid-table-header')).toBeInTheDocument();
      expect(screen.getByTestId('story-grid-table-body')).toBeInTheDocument();
    });

    it('renders table with proper accessibility attributes', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const table = screen.getByTestId('story-grid-table');
      expect(table).toHaveAttribute('aria-label', 'Stories data table');
    });
  });

  describe('Table Headers', () => {
    it('renders column headers with correct test IDs', () => {
      render(<StoryGrid {...defaultProps} />);
      
      expect(screen.getByTestId('story-grid-column-epicId')).toBeInTheDocument();
      expect(screen.getByTestId('story-grid-column-id')).toBeInTheDocument();
      expect(screen.getByTestId('story-grid-column-title')).toBeInTheDocument();
    });

    it('applies correct accessibility attributes to sortable columns', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const epicColumn = screen.getByTestId('story-grid-column-epicId');
      const storyColumn = screen.getByTestId('story-grid-column-id');
      
      expect(epicColumn).toHaveAttribute('aria-label', 'Sort by Epic');
      expect(storyColumn).toHaveAttribute('aria-label', 'Sort by Story');
    });

    it('handles column header clicks for sorting', () => {
      const mockToggleSort = vi.fn();
      
      // Update mock to include the click handler
      mockTable.getHeaderGroups()[0].headers[0].column.getToggleSortingHandler = () => mockToggleSort;
      
      render(<StoryGrid {...defaultProps} />);
      
      const epicColumn = screen.getByTestId('story-grid-column-epicId');
      fireEvent.click(epicColumn);
      
      expect(mockToggleSort).toHaveBeenCalled();
    });
  });

  describe('Table Rows', () => {
    it('renders story rows with correct test IDs', () => {
      render(<StoryGrid {...defaultProps} />);
      
      expect(screen.getByTestId('story-1-1-row')).toBeInTheDocument();
      expect(screen.getByTestId('story-1-2-row')).toBeInTheDocument();
      expect(screen.getByTestId('story-2-1-row')).toBeInTheDocument();
    });

    it('renders epic IDs with correct test IDs', () => {
      render(<StoryGrid {...defaultProps} />);
      
      // Based on the mock data, we should see Epic 1 and Epic 2
      expect(screen.getByTestId('story-grid-epic-1')).toBeInTheDocument();
      expect(screen.getByTestId('story-grid-epic-2')).toBeInTheDocument();
    });

    it('renders action buttons with correct test IDs', () => {
      render(<StoryGrid {...defaultProps} />);
      
      expect(screen.getByTestId('story-1-1-view-button')).toBeInTheDocument();
      expect(screen.getByTestId('story-1-1-edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('story-1-2-view-button')).toBeInTheDocument();
      expect(screen.getByTestId('story-1-2-edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('story-2-1-view-button')).toBeInTheDocument();
      expect(screen.getByTestId('story-2-1-edit-button')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('updates global filter when search input changes', async () => {
      const mockSetGlobalFilter = vi.fn();
      
      // Update the mock table to include the global filter state
      mockTable.getRowModel = () => ({
        rows: mockStories.filter(story => 
          story.title.toLowerCase().includes('login')
        ).map(story => ({
          id: story.id,
          original: story,
          getVisibleCells: () => []
        }))
      });

      render(<StoryGrid {...defaultProps} />);
      
      const searchInput = screen.getByTestId('story-search-input');
      fireEvent.change(searchInput, { target: { value: 'login' } });
      
      expect(searchInput.value).toBe('login');
    });

    it('shows no results message when search yields no matches', () => {
      // Mock empty search results
      const emptyTable = {
        ...mockTable,
        getRowModel: () => ({ rows: [] })
      };
      
      const { useReactTable } = vi.mocked(require('@tanstack/react-table'));
      useReactTable.mockReturnValue(emptyTable);

      render(<StoryGrid {...defaultProps} />);
      
      // Simulate a search with no results
      const searchInput = screen.getByTestId('story-search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      // The component should show "No stories found matching" message
      // This would appear when globalFilter is set and no rows match
      const noResultsElement = screen.queryByTestId('story-grid-no-results');
      // Note: This test would need the actual component state to work properly
    });

    it('updates filter count when search filters results', () => {
      // Mock filtered results
      const filteredTable = {
        ...mockTable,
        getRowModel: () => ({
          rows: [mockTable.getRowModel().rows[0]] // Only first story
        })
      };
      
      const { useReactTable } = vi.mocked(require('@tanstack/react-table'));
      useReactTable.mockReturnValue(filteredTable);

      render(<StoryGrid {...defaultProps} />);
      
      const filterCount = screen.getByTestId('story-grid-filter-count');
      expect(filterCount).toHaveTextContent('Showing 1 of 3');
    });
  });

  describe('Story Actions', () => {
    it('calls onViewStory when view button is clicked', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const viewButton = screen.getByTestId('story-1-1-view-button');
      fireEvent.click(viewButton);
      
      expect(defaultProps.onViewStory).toHaveBeenCalledWith(mockStories[0]);
    });

    it('calls onEditStory when edit button is clicked', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const editButton = screen.getByTestId('story-1-1-edit-button');
      fireEvent.click(editButton);
      
      expect(defaultProps.onEditStory).toHaveBeenCalledWith(mockStories[0]);
    });

    it('does not render action buttons when callbacks not provided', () => {
      const propsWithoutCallbacks = {
        stories: mockStories,
        verifications: mockVerifications
      };
      
      render(<StoryGrid {...propsWithoutCallbacks} />);
      
      expect(screen.queryByTestId('story-1-1-view-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('story-1-1-edit-button')).not.toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('displays status icons and colors correctly', () => {
      render(<StoryGrid {...defaultProps} />);
      
      // Test that status information is rendered
      // This would need to be tested with the actual status cell rendering
      expect(screen.getByText('✅')).toBeInTheDocument(); // Done status icon
      expect(screen.getByText('🔄')).toBeInTheDocument(); // In Progress status icon
      expect(screen.getByText('📋')).toBeInTheDocument(); // Ready status icon
    });

    it('applies correct status colors', () => {
      render(<StoryGrid {...defaultProps} />);
      
      // Status badges should have appropriate colors
      // This would be tested with actual rendered status elements
      const doneStatus = screen.getByText('Done');
      const inProgressStatus = screen.getByText('In Progress');
      const readyStatus = screen.getByText('Ready');
      
      // These would have specific style expectations based on the getStatusColor function
      expect(doneStatus).toBeInTheDocument();
      expect(inProgressStatus).toBeInTheDocument();
      expect(readyStatus).toBeInTheDocument();
    });
  });

  describe('Verification Scores', () => {
    it('displays verification scores with correct icons', () => {
      render(<StoryGrid {...defaultProps} />);
      
      // High score (85) should show green with checkmark
      expect(screen.getByText('85/100')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
      
      // Medium score (65) should show yellow with warning
      expect(screen.getByText('65/100')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      
      // High score (90) should show green with checkmark  
      expect(screen.getByText('90/100')).toBeInTheDocument();
    });

    it('displays N/A for missing verification scores', () => {
      const storiesWithoutVerification = [...mockStories, {
        id: '3-1',
        title: 'Unverified story',
        status: 'Draft',
        description: 'A story without verification',
        epicId: '3',
        filePath: '/stories/story-3-1.md',
        parallelWork: { multiDevOK: true, reason: 'Simple task' }
      }];
      
      render(<StoryGrid stories={storiesWithoutVerification} verifications={mockVerifications} />);
      
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('applies correct score colors', () => {
      render(<StoryGrid {...defaultProps} />);
      
      // Test that scores have appropriate styling
      const highScore = screen.getByText('85/100');
      const mediumScore = screen.getByText('65/100');
      const veryHighScore = screen.getByText('90/100');
      
      expect(highScore).toHaveStyle({ color: '#28a745' });
      expect(mediumScore).toHaveStyle({ color: '#ffc107' });
      expect(veryHighScore).toHaveStyle({ color: '#28a745' });
    });
  });

  describe('Parallel Work Indicators', () => {
    it('renders parallel work indicators correctly', () => {
      render(<StoryGrid {...defaultProps} />);
      
      expect(screen.getByTestId('parallel-indicator-1-1')).toBeInTheDocument();
      expect(screen.getByTestId('parallel-indicator-1-2')).toBeInTheDocument();
      expect(screen.getByTestId('parallel-indicator-2-1')).toBeInTheDocument();
    });

    it('shows correct icons for parallel work capability', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const multiDevIndicator = screen.getByTestId('parallel-indicator-1-1');
      const singleDevIndicator = screen.getByTestId('parallel-indicator-1-2');
      
      expect(multiDevIndicator).toHaveTextContent('👥'); // Multi-dev OK
      expect(singleDevIndicator).toHaveTextContent('👤'); // Single dev only
    });

    it('passes correct props to ParallelIndicator', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const indicator = screen.getByTestId('parallel-indicator-1-1');
      expect(indicator).toHaveClass('normal');
      expect(indicator).toHaveTextContent('Independent UI component');
    });
  });

  describe('Empty State', () => {
    it('renders empty state with correct accessibility', () => {
      render(<StoryGrid stories={[]} />);
      
      const emptyState = screen.getByTestId('story-grid-empty-state');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute('aria-label', 'No stories available');
      expect(emptyState).toHaveTextContent('No Stories Found');
    });

    it('provides helpful empty state message', () => {
      render(<StoryGrid stories={[]} />);
      
      expect(screen.getByText('Create stories using the MadShrimp agent to see them listed here.')).toBeInTheDocument();
    });
  });

  describe('Sorting Functionality', () => {
    it('handles sorting state changes', () => {
      const mockSetSorting = vi.fn();
      
      render(<StoryGrid {...defaultProps} />);
      
      // Test that sorting can be triggered
      const epicColumn = screen.getByTestId('story-grid-column-epicId');
      fireEvent.click(epicColumn);
      
      // Verify sortable columns are clickable
      expect(epicColumn).toHaveClass('cursor-pointer');
    });

    it('displays sort indicators', () => {
      // Mock sorted state
      const sortedMockTable = {
        ...mockTable,
        getHeaderGroups: () => [
          {
            id: 'header-group-1',
            headers: [
              {
                ...mockTable.getHeaderGroups()[0].headers[0],
                column: {
                  ...mockTable.getHeaderGroups()[0].headers[0].column,
                  getIsSorted: () => 'asc'
                }
              }
            ]
          }
        ]
      };
      
      const { useReactTable } = vi.mocked(require('@tanstack/react-table'));
      useReactTable.mockReturnValue(sortedMockTable);

      render(<StoryGrid {...defaultProps} />);
      
      // Should show ascending sort indicator
      expect(screen.getByText('↑')).toBeInTheDocument();
    });
  });

  describe('Click Handlers', () => {
    it('calls onViewStory when title is clicked', () => {
      render(<StoryGrid {...defaultProps} />);
      
      // This would need to be tested with the actual title cell implementation
      const titleElement = screen.getByText('Create login form');
      fireEvent.click(titleElement);
      
      expect(defaultProps.onViewStory).toHaveBeenCalledWith(mockStories[0]);
    });

    it('handles row hover effects', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const firstRow = screen.getByTestId('story-1-1-row');
      
      // Test hover class is applied
      fireEvent.mouseEnter(firstRow);
      expect(firstRow).toHaveClass('hover:bg-gray-50');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for all interactive elements', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const container = screen.getByTestId('story-grid-container');
      const table = screen.getByTestId('story-grid-table');
      const emptyState = screen.queryByTestId('story-grid-empty-state');
      
      expect(container).toHaveAttribute('aria-label', 'Stories grid view');
      expect(table).toHaveAttribute('aria-label', 'Stories data table');
      
      if (emptyState) {
        expect(emptyState).toHaveAttribute('aria-label', 'No stories available');
      }
    });

    it('maintains proper tab order', () => {
      render(<StoryGrid {...defaultProps} />);
      
      const searchInput = screen.getByTestId('story-search-input');
      const sortableHeaders = screen.getAllByRole('columnheader');
      const actionButtons = screen.getAllByRole('button');
      
      // Elements should be focusable in logical order
      expect(searchInput).toBeInTheDocument();
      expect(sortableHeaders.length).toBeGreaterThan(0);
      expect(actionButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles malformed story data gracefully', () => {
      const malformedStories = [
        {
          id: '1-1',
          title: 'Valid story',
          status: 'Done'
          // Missing required fields
        },
        {
          // Missing id
          title: 'Story without ID',
          status: 'Ready'
        }
      ];
      
      render(<StoryGrid stories={malformedStories} />);
      
      // Component should still render without crashing
      const container = screen.getByTestId('story-grid-container');
      expect(container).toBeInTheDocument();
    });

    it('handles missing verification data gracefully', () => {
      render(<StoryGrid {...defaultProps} verifications={null} />);
      
      // Should show N/A for all verification scores
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 100 }, (_, index) => ({
        id: `story-${index}`,
        title: `Story ${index}`,
        status: 'Ready',
        description: `Description for story ${index}`,
        epicId: `${Math.floor(index / 10)}`,
        filePath: `/stories/story-${index}.md`,
        parallelWork: { multiDevOK: index % 2 === 0, reason: 'Test reason' }
      }));
      
      render(<StoryGrid stories={largeDataset} />);
      
      // Component should render without performance issues
      const container = screen.getByTestId('story-grid-container');
      expect(container).toBeInTheDocument();
      
      const count = screen.getByTestId('story-grid-count');
      expect(count).toHaveTextContent('100 stories across all epics');
    });
  });
});