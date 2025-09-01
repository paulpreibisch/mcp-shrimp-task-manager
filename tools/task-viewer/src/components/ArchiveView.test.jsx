import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArchiveView from './ArchiveView';

describe('ArchiveView', () => {
  const mockArchives = [
    {
      id: 'archive-1',
      timestamp: '2024-01-15T10:30:00Z',
      projectId: 'project-1',
      projectName: 'Test Project 1',
      initialRequest: 'This is a very long initial request that should be truncated when displayed in the table to maintain proper formatting',
      tasks: [
        { id: '1', name: 'Task 1', status: 'completed' },
        { id: '2', name: 'Task 2', status: 'in_progress' },
        { id: '3', name: 'Task 3', status: 'pending' }
      ],
      stats: {
        total: 3,
        completed: 1,
        inProgress: 1,
        pending: 1
      }
    },
    {
      id: 'archive-2',
      timestamp: '2024-01-14T15:45:00Z',
      projectId: 'project-1',
      projectName: 'Test Project 1',
      initialRequest: 'Short request',
      tasks: [
        { id: '4', name: 'Task 4', status: 'completed' },
        { id: '5', name: 'Task 5', status: 'completed' }
      ],
      stats: {
        total: 2,
        completed: 2,
        inProgress: 0,
        pending: 0
      }
    }
  ];

  const mockProps = {
    archives: mockArchives,
    loading: false,
    error: '',
    onViewArchive: vi.fn(),
    onDeleteArchive: vi.fn(),
    onImportArchive: vi.fn(),
    projectId: 'project-1'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the archive view with header', () => {
      render(<ArchiveView {...mockProps} />);
      
      expect(screen.getByText(/Archived Task Lists/i)).toBeInTheDocument();
    });

    it('should render a table with correct columns', () => {
      render(<ArchiveView {...mockProps} />);
      
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Date Archived')).toBeInTheDocument();
      expect(screen.getByText('Initial Request')).toBeInTheDocument();
      expect(screen.getByText('Task Statistics')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should display archive data in table rows', () => {
      render(<ArchiveView {...mockProps} />);
      
      // Check if archive IDs are displayed (shortened to first 8 chars)
      const archiveElements = screen.getAllByText('archive-');
      expect(archiveElements.length).toBeGreaterThan(0);
      
      // Check if dates are formatted correctly
      expect(screen.getByText((content, element) => {
        return element && element.textContent.includes('2024');
      })).toBeInTheDocument();
    });

    it('should truncate long initial requests to 100 characters', () => {
      render(<ArchiveView {...mockProps} />);
      
      const longRequestElement = screen.getByText((content, element) => {
        return element && 
               element.textContent.includes('This is a very long initial request') &&
               element.textContent.includes('...');
      });
      
      expect(longRequestElement).toBeInTheDocument();
      expect(longRequestElement.textContent.length).toBeLessThanOrEqual(103); // 100 chars + '...'
    });

    it('should display task statistics correctly', () => {
      render(<ArchiveView {...mockProps} />);
      
      // First archive stats
      expect(screen.getByText(/1.*completed/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*in.*progress/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*pending/i)).toBeInTheDocument();
      
      // Second archive stats (all completed)
      expect(screen.getByText(/2.*completed/i)).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading state', () => {
      render(<ArchiveView {...mockProps} loading={true} />);
      
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('should display error message', () => {
      const errorMessage = 'Failed to load archives';
      render(<ArchiveView {...mockProps} error={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should display empty state when no archives', () => {
      render(<ArchiveView {...mockProps} archives={[]} />);
      
      expect(screen.getByText(/No archived task lists found/i)).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render action buttons for each archive', () => {
      render(<ArchiveView {...mockProps} />);
      
      // Should have 2 sets of action buttons (for 2 archives)
      const viewButtons = screen.getAllByTitle(/View/i);
      const deleteButtons = screen.getAllByTitle(/Delete/i);
      const importButtons = screen.getAllByTitle(/Import/i);
      
      expect(viewButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
      expect(importButtons).toHaveLength(2);
    });

    it('should call onViewArchive when view button is clicked', () => {
      render(<ArchiveView {...mockProps} />);
      
      const viewButtons = screen.getAllByTitle(/View/i);
      fireEvent.click(viewButtons[0]);
      
      expect(mockProps.onViewArchive).toHaveBeenCalledWith(mockArchives[0]);
    });

    it('should call onDeleteArchive when delete button is clicked', () => {
      render(<ArchiveView {...mockProps} />);
      
      const deleteButtons = screen.getAllByTitle(/Delete/i);
      fireEvent.click(deleteButtons[0]);
      
      expect(mockProps.onDeleteArchive).toHaveBeenCalledWith(mockArchives[0]);
    });

    it('should call onImportArchive when import button is clicked', () => {
      render(<ArchiveView {...mockProps} />);
      
      const importButtons = screen.getAllByTitle(/Import/i);
      fireEvent.click(importButtons[0]);
      
      expect(mockProps.onImportArchive).toHaveBeenCalledWith(mockArchives[0]);
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', () => {
      render(<ArchiveView {...mockProps} />);
      
      expect(screen.getByText('<<')).toBeInTheDocument();
      expect(screen.getByText('<')).toBeInTheDocument();
      expect(screen.getByText('>')).toBeInTheDocument();
      expect(screen.getByText('>>')).toBeInTheDocument();
      expect(screen.getByText(/Page.*1.*of/i)).toBeInTheDocument();
    });

    it('should show correct number of entries info', () => {
      render(<ArchiveView {...mockProps} />);
      
      expect(screen.getByText(/Showing.*1.*to.*2.*of.*2/i)).toBeInTheDocument();
    });

    it('should handle pagination with many archives', () => {
      // Create 20 archives to test pagination
      const manyArchives = Array.from({ length: 20 }, (_, i) => ({
        id: `archive-${i}`,
        timestamp: new Date(2024, 0, i + 1).toISOString(),
        projectId: 'project-1',
        projectName: 'Test Project',
        initialRequest: `Request ${i}`,
        tasks: [],
        stats: { total: 0, completed: 0, inProgress: 0, pending: 0 }
      }));

      render(<ArchiveView {...mockProps} archives={manyArchives} />);
      
      // Should show 15 items per page by default
      expect(screen.getByText(/Showing.*1.*to.*15.*of.*20/i)).toBeInTheDocument();
      
      // Click next page
      const nextButton = screen.getByText('>');
      fireEvent.click(nextButton);
      
      // Should show remaining items
      expect(screen.getByText(/Showing.*16.*to.*20.*of.*20/i)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort by timestamp descending by default', () => {
      render(<ArchiveView {...mockProps} />);
      
      const rows = screen.getAllByRole('row');
      // First data row should be the most recent archive (archive-1 from 2024-01-15)
      // Second data row should be older archive (archive-2 from 2024-01-14)
      expect(rows[1]).toHaveTextContent('01/15/2024'); // More recent first
      expect(rows[2]).toHaveTextContent('01/14/2024'); // Older second
    });

    it('should allow sorting by clicking column headers', () => {
      render(<ArchiveView {...mockProps} />);
      
      // Check if sort indicator is already present for default sort by timestamp
      expect(screen.getByText('↓')).toBeInTheDocument(); // Default desc sort
      
      // Click on Date Archived header to toggle sort
      const dateHeader = screen.getByText('Date Archived');
      fireEvent.click(dateHeader);
      
      // After clicking, sort should toggle to ascending
      expect(screen.getByText('↑')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<ArchiveView {...mockProps} />);
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
      
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should have accessible button labels', () => {
      render(<ArchiveView {...mockProps} />);
      
      const viewButtons = screen.getAllByTitle(/View/i);
      const deleteButtons = screen.getAllByTitle(/Delete/i);
      const importButtons = screen.getAllByTitle(/Import/i);
      
      viewButtons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });
      
      deleteButtons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });
      
      importButtons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });
    });
  });
});