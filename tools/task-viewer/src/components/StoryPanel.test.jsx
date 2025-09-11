import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StoryPanel from './StoryPanel';

// Mock child components
vi.mock('./VerificationView.jsx', () => {
  return {
    default: ({ verification, isOpen, onClose }) => (
      isOpen ? (
        <div data-testid="verification-view">
          <div>Verification Score: {verification?.score}</div>
          <button onClick={onClose}>Close Verification</button>
        </div>
      ) : null
    )
  };
});

vi.mock('./ParallelIndicator.jsx', () => {
  return {
    default: ({ multiDevOK, reason, storyId, size }) => (
      <div data-testid={`parallel-indicator-${storyId}`} className={size}>
        {multiDevOK ? '👥' : '👤'} {reason}
      </div>
    )
  };
});

vi.mock('./Button.jsx', () => {
  return {
    default: ({ children, onClick, variant, size, ...props }) => (
      <button 
        onClick={onClick} 
        className={`mock-button ${variant || ''} ${size || ''}`}
        {...props}
      >
        {children}
      </button>
    )
  };
});

describe('StoryPanel Component', () => {
  const mockStory = {
    id: '1-1',
    title: 'Create user login form',
    status: 'Done',
    description: 'Build a responsive login form with proper validation and error handling',
    filePath: '/stories/story-1-1.md',
    epicId: '1',
    parallelWork: {
      multiDevOK: true,
      reason: 'Independent UI component development'
    },
    acceptanceCriteria: [
      'Form validates email format',
      'Password minimum 8 characters',
      'Shows loading state during submission'
    ]
  };

  const mockVerification = {
    storyId: '1-1',
    score: 85,
    summary: 'Login form implementation completed successfully',
    implementationDetails: ['Form validation working', 'Responsive design implemented'],
    keyAccomplishments: ['Clean UI design', 'Accessibility features'],
    technicalChallenges: ['Cross-browser compatibility'],
    timestamp: new Date()
  };

  const defaultProps = {
    story: mockStory,
    verification: mockVerification,
    isLoading: false,
    error: null,
    onEdit: vi.fn(),
    onView: vi.fn(),
    onCreateTasks: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders story panel with correct test ID and structure', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const panel = screen.getByTestId('story-1-1-panel');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveAttribute('aria-label', 'Story 1-1: Create user login form');
    });

    it('renders story title with correct test ID', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const title = screen.getByTestId('story-1-1-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Create user login form');
    });

    it('renders story description with correct test ID', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const description = screen.getByTestId('story-1-1-description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent('Build a responsive login form with proper validation and error handling');
    });

    it('renders status badge with correct test ID and styling', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const statusBadge = screen.getByTestId('story-1-1-status-badge');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveAttribute('aria-label', 'Status: Completed');
      expect(statusBadge).toHaveTextContent('Completed');
    });

    it('renders parallel indicator with correct test ID', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const parallelIndicator = screen.getByTestId('story-1-1-parallel-indicator');
      expect(parallelIndicator).toBeInTheDocument();
      
      const mockParallelIndicator = screen.getByTestId('parallel-indicator-1-1');
      expect(mockParallelIndicator).toBeInTheDocument();
      expect(mockParallelIndicator).toHaveTextContent('👥 Independent UI component development');
    });

    it('renders acceptance criteria count with correct test ID', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const criteriaCount = screen.getByTestId('story-1-1-acceptance-criteria-count');
      expect(criteriaCount).toBeInTheDocument();
      expect(criteriaCount).toHaveAttribute('aria-label', '3 acceptance criteria');
      expect(criteriaCount).toHaveTextContent('📋 3');
    });

    it('renders verification score with correct test ID', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const verificationScore = screen.getByTestId('story-1-1-verification-score');
      expect(verificationScore).toBeInTheDocument();
      expect(verificationScore).toHaveAttribute('title', 'Verification score: 85/100');
      expect(verificationScore).toHaveTextContent('85');
    });

    it('does not render acceptance criteria count when none exist', () => {
      const storyWithoutCriteria = { ...mockStory, acceptanceCriteria: [] };
      render(<StoryPanel story={storyWithoutCriteria} />);
      
      expect(screen.queryByTestId('story-1-1-acceptance-criteria-count')).not.toBeInTheDocument();
    });

    it('does not render verification score when none provided', () => {
      render(<StoryPanel {...defaultProps} verification={null} />);
      
      expect(screen.queryByTestId('story-1-1-verification-score')).not.toBeInTheDocument();
    });

    it('handles missing description gracefully', () => {
      const storyWithoutDescription = { ...mockStory, description: null };
      render(<StoryPanel story={storyWithoutDescription} />);
      
      const description = screen.getByTestId('story-1-1-description');
      expect(description).toHaveTextContent('No description available');
    });
  });

  describe('Status Display', () => {
    const statusTests = [
      { status: 'Done', expectedText: 'Completed', expectedIcon: '✅' },
      { status: 'Completed', expectedText: 'Completed', expectedIcon: '✅' },
      { status: 'In Progress', expectedText: 'In Progress', expectedIcon: '🔄' },
      { status: 'Ready for Review', expectedText: 'Ready for Review', expectedIcon: '👀' },
      { status: 'Ready', expectedText: 'Ready', expectedIcon: '📋' },
      { status: 'Draft', expectedText: 'Draft', expectedIcon: '📝' }
    ];

    statusTests.forEach(({ status, expectedText, expectedIcon }) => {
      it(`displays correct status for ${status}`, () => {
        const storyWithStatus = { ...mockStory, status };
        render(<StoryPanel story={storyWithStatus} />);
        
        const statusBadge = screen.getByTestId('story-1-1-status-badge');
        expect(statusBadge).toHaveTextContent(expectedText);
        
        // Check for icon in the panel header
        expect(screen.getByText(expectedIcon)).toBeInTheDocument();
      });
    });
  });

  describe('Verification Score Colors', () => {
    it('displays green background for high scores (≥80)', () => {
      const highScoreVerification = { ...mockVerification, score: 85 };
      render(<StoryPanel {...defaultProps} verification={highScoreVerification} />);
      
      const scoreElement = screen.getByTestId('story-1-1-verification-score');
      expect(scoreElement).toHaveStyle({ backgroundColor: '#38a169' });
    });

    it('displays yellow background for medium scores (60-79)', () => {
      const mediumScoreVerification = { ...mockVerification, score: 65 };
      render(<StoryPanel {...defaultProps} verification={mediumScoreVerification} />);
      
      const scoreElement = screen.getByTestId('story-1-1-verification-score');
      expect(scoreElement).toHaveStyle({ backgroundColor: '#d69e2e' });
    });

    it('displays red background for low scores (<60)', () => {
      const lowScoreVerification = { ...mockVerification, score: 45 };
      render(<StoryPanel {...defaultProps} verification={lowScoreVerification} />);
      
      const scoreElement = screen.getByTestId('story-1-1-verification-score');
      expect(scoreElement).toHaveStyle({ backgroundColor: '#e53e3e' });
    });
  });

  describe('Action Buttons', () => {
    it('renders view button with correct test ID when callback provided', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const viewButton = screen.getByTestId('story-1-1-view-button');
      expect(viewButton).toBeInTheDocument();
      expect(viewButton).toHaveAttribute('aria-label', 'View details for story 1-1');
      expect(viewButton).toHaveTextContent('View');
    });

    it('renders edit button with correct test ID when callback provided', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const editButton = screen.getByTestId('story-1-1-edit-button');
      expect(editButton).toBeInTheDocument();
      expect(editButton).toHaveTextContent('Edit');
    });

    it('does not render view button when callback not provided', () => {
      const propsWithoutView = { ...defaultProps };
      delete propsWithoutView.onView;
      
      render(<StoryPanel {...propsWithoutView} />);
      
      expect(screen.queryByTestId('story-1-1-view-button')).not.toBeInTheDocument();
    });

    it('does not render edit button when callback not provided', () => {
      const propsWithoutEdit = { ...defaultProps };
      delete propsWithoutEdit.onEdit;
      
      render(<StoryPanel {...propsWithoutEdit} />);
      
      expect(screen.queryByTestId('story-1-1-edit-button')).not.toBeInTheDocument();
    });

    it('calls onView callback when view button is clicked', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const viewButton = screen.getByTestId('story-1-1-view-button');
      fireEvent.click(viewButton);
      
      expect(defaultProps.onView).toHaveBeenCalledWith(mockStory);
    });

    it('calls onEdit callback when edit button is clicked', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const editButton = screen.getByTestId('story-1-1-edit-button');
      fireEvent.click(editButton);
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockStory);
    });

    it('prevents event propagation when buttons are clicked', () => {
      const mockContainerClick = vi.fn();
      
      render(
        <div onClick={mockContainerClick}>
          <StoryPanel {...defaultProps} />
        </div>
      );
      
      const viewButton = screen.getByTestId('story-1-1-view-button');
      const editButton = screen.getByTestId('story-1-1-edit-button');
      
      fireEvent.click(viewButton);
      fireEvent.click(editButton);
      
      expect(mockContainerClick).not.toHaveBeenCalled();
    });
  });

  describe('Hover Effects', () => {
    it('applies hover transform on mouse enter', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const panel = screen.getByTestId('story-1-1-panel');
      
      // Simulate mouse enter
      fireEvent.mouseEnter(panel);
      expect(panel.style.transform).toBe('translateY(-4px)');
      expect(panel.style.borderColor).toBe('rgba(100, 149, 237, 0.4)');
    });

    it('removes hover transform on mouse leave', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const panel = screen.getByTestId('story-1-1-panel');
      
      // Simulate mouse enter then leave
      fireEvent.mouseEnter(panel);
      fireEvent.mouseLeave(panel);
      
      expect(panel.style.transform).toBe('translateY(0)');
      expect(panel.style.borderColor).toBe('rgba(100, 149, 237, 0.2)');
    });
  });

  describe('Parallel Work Display', () => {
    it('shows correct parallel indicator for multi-dev OK', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const parallelIndicator = screen.getByTestId('parallel-indicator-1-1');
      expect(parallelIndicator).toHaveTextContent('👥');
    });

    it('shows correct parallel indicator for single dev only', () => {
      const singleDevStory = {
        ...mockStory,
        parallelWork: { multiDevOK: false, reason: 'Requires database changes' }
      };
      
      render(<StoryPanel story={singleDevStory} />);
      
      const parallelIndicator = screen.getByTestId('parallel-indicator-1-1');
      expect(parallelIndicator).toHaveTextContent('👤');
    });

    it('handles missing parallel work data', () => {
      const storyWithoutParallelWork = { ...mockStory };
      delete storyWithoutParallelWork.parallelWork;
      
      render(<StoryPanel story={storyWithoutParallelWork} />);
      
      const parallelIndicator = screen.getByTestId('parallel-indicator-1-1');
      expect(parallelIndicator).toHaveTextContent('👤');
    });
  });

  describe('Story ID Formatting', () => {
    it('formats story ID correctly', () => {
      render(<StoryPanel {...defaultProps} />);
      
      expect(screen.getByText('Story 1-1')).toBeInTheDocument();
    });

    it('handles different story ID formats', () => {
      const storyWithDifferentId = { ...mockStory, id: 'EPIC-2-STORY-3' };
      render(<StoryPanel story={storyWithDifferentId} />);
      
      expect(screen.getByText('Story EPIC-2-STORY-3')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('displays error state when provided', () => {
      const errorProps = { ...defaultProps, error: 'Failed to load story data' };
      render(<StoryPanel {...errorProps} />);
      
      // Component should still render but could show error styling
      const panel = screen.getByTestId('story-1-1-panel');
      expect(panel).toBeInTheDocument();
    });

    it('displays loading state when provided', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<StoryPanel {...loadingProps} />);
      
      // Component should still render but could show loading styling
      const panel = screen.getByTestId('story-1-1-panel');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for screen readers', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const panel = screen.getByTestId('story-1-1-panel');
      const statusBadge = screen.getByTestId('story-1-1-status-badge');
      const criteriaCount = screen.getByTestId('story-1-1-acceptance-criteria-count');
      const viewButton = screen.getByTestId('story-1-1-view-button');
      
      expect(panel).toHaveAttribute('aria-label', 'Story 1-1: Create user login form');
      expect(statusBadge).toHaveAttribute('aria-label', 'Status: Completed');
      expect(criteriaCount).toHaveAttribute('aria-label', '3 acceptance criteria');
      expect(viewButton).toHaveAttribute('aria-label', 'View details for story 1-1');
    });

    it('provides semantic HTML structure', () => {
      render(<StoryPanel {...defaultProps} />);
      
      // Check that title is rendered as h4
      const title = screen.getByTestId('story-1-1-title');
      expect(title.tagName).toBe('H4');
      
      // Check that description is rendered as p
      const description = screen.getByTestId('story-1-1-description');
      expect(description.tagName).toBe('P');
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to ParallelIndicator', () => {
      render(<StoryPanel {...defaultProps} />);
      
      const parallelIndicator = screen.getByTestId('parallel-indicator-1-1');
      expect(parallelIndicator).toHaveClass('small');
      expect(parallelIndicator).toHaveTextContent('Independent UI component development');
    });
  });
});