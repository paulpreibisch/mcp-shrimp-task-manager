import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EpicTabs from './EpicTabs';

// Mock child components
vi.mock('./StoryPanel.jsx', () => {
  return {
    default: ({ story, verification, onEdit, onView }) => (
      <div data-testid={`mock-story-panel-${story.id}`}>
        Story Panel: {story.title}
        {onEdit && <button onClick={() => onEdit(story)}>Mock Edit</button>}
        {onView && <button onClick={() => onView(story)}>Mock View</button>}
      </div>
    )
  };
});

vi.mock('./Button.jsx', () => {
  return {
    default: ({ children, onClick, variant, size, icon, ...props }) => (
      <button 
        onClick={onClick} 
        className={`mock-button ${variant || ''} ${size || ''}`}
        {...props}
      >
        {icon && <span className="icon">{icon}</span>}
        {children}
      </button>
    )
  };
});

// Mock @headlessui/react
vi.mock('@headlessui/react', () => ({
  Tab: {
    Group: ({ children }) => <div data-testid="tab-group">{children}</div>,
    List: ({ children }) => <div data-testid="tab-list">{children}</div>,
    Panel: ({ children, ...props }) => <div data-testid="tab-panel" {...props}>{children}</div>,
    Panels: ({ children }) => <div data-testid="tab-panels">{children}</div>,
    __esModule: true
  }
}));

// Mock Tab component with selected state
const MockTab = ({ children, ...props }) => (
  <button 
    {...props}
    className={`mock-tab ${props.className || ''}`}
  >
    {children}
  </button>
);

// Setup Tab mock with proper context
vi.mocked(vi.importMock('@headlessui/react')).Tab = MockTab;

describe('EpicTabs Component', () => {
  const mockEpics = [
    {
      id: '1',
      title: 'User Authentication',
      description: 'Implement user login and authentication system',
      stories: [
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
        }
      ]
    },
    {
      id: '2',
      title: 'Dashboard Features',
      description: 'Build user dashboard with analytics',
      stories: [
        {
          id: '2-1',
          title: 'Create dashboard layout',
          status: 'Ready',
          description: 'Design responsive dashboard with sidebar navigation',
          epicId: '2',
          filePath: '/stories/story-2-1.md',
          parallelWork: { multiDevOK: true, reason: 'UI component work' }
        }
      ]
    }
  ];

  const mockVerifications = {
    '1-1': {
      storyId: '1-1',
      score: 85,
      summary: 'Login form implemented successfully',
      implementationDetails: ['Form validation working'],
      keyAccomplishments: ['Responsive design'],
      technicalChallenges: ['Cross-browser compatibility'],
      timestamp: new Date()
    },
    '1-2': {
      storyId: '1-2',
      score: 65,
      summary: 'Authentication API partially complete',
      implementationDetails: ['Basic JWT implementation'],
      keyAccomplishments: ['API structure defined'],
      technicalChallenges: ['Security considerations'],
      timestamp: new Date()
    }
  };

  const defaultProps = {
    epics: mockEpics,
    verifications: mockVerifications,
    onEditStory: vi.fn(),
    onViewStory: vi.fn(),
    onArchiveEpic: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with empty epics array', () => {
      render(<EpicTabs epics={[]} />);
      
      expect(screen.getByTestId('epic-tabs-no-epics')).toBeInTheDocument();
      expect(screen.getByText('No Epics Found')).toBeInTheDocument();
      expect(screen.getByText('Create epics using the MadShrimp agent to see them organized here.')).toBeInTheDocument();
    });

    it('renders with invalid epics data', () => {
      render(<EpicTabs epics={null} />);
      
      expect(screen.getByText('Error: Invalid epics data')).toBeInTheDocument();
    });

    it('renders tabs container and structure', () => {
      render(<EpicTabs {...defaultProps} />);
      
      expect(screen.getByTestId('epic-tabs-container')).toBeInTheDocument();
      expect(screen.getByTestId('epic-tabs-rendered')).toBeInTheDocument();
      expect(screen.getByTestId('tab-group')).toBeInTheDocument();
      expect(screen.getByTestId('tab-list')).toBeInTheDocument();
    });

    it('renders epic tabs with correct test IDs and labels', () => {
      render(<EpicTabs {...defaultProps} />);
      
      const epic1Tab = screen.getByTestId('epic-1-tab-button');
      const epic2Tab = screen.getByTestId('epic-2-tab-button');
      
      expect(epic1Tab).toBeInTheDocument();
      expect(epic1Tab).toHaveAttribute('aria-label', 'Epic 1: User Authentication');
      expect(epic1Tab).toHaveAttribute('role', 'tab');
      expect(epic1Tab).toHaveTextContent('Epic 1');
      
      expect(epic2Tab).toBeInTheDocument();
      expect(epic2Tab).toHaveAttribute('aria-label', 'Epic 2: Dashboard Features');
      expect(epic2Tab).toHaveTextContent('Epic 2');
    });

    it('renders epic panels with correct test IDs', () => {
      render(<EpicTabs {...defaultProps} />);
      
      expect(screen.getByTestId('epic-1-panel')).toBeInTheDocument();
      expect(screen.getByTestId('epic-2-panel')).toBeInTheDocument();
    });
  });

  describe('Epic Content and Features', () => {
    it('displays epic descriptions', () => {
      render(<EpicTabs {...defaultProps} />);
      
      expect(screen.getByText('Implement user login and authentication system')).toBeInTheDocument();
      expect(screen.getByText('Build user dashboard with analytics')).toBeInTheDocument();
    });

    it('shows progress information', () => {
      render(<EpicTabs {...defaultProps} />);
      
      expect(screen.getByText('1 of 2 stories completed')).toBeInTheDocument();
      expect(screen.getByText('0 of 1 stories completed')).toBeInTheDocument();
    });

    it('displays stories needing attention warning', () => {
      render(<EpicTabs {...defaultProps} />);
      
      expect(screen.getByText('⚠️ 1 stories need attention')).toBeInTheDocument();
    });

    it('renders view mode toggle buttons with correct test IDs', () => {
      render(<EpicTabs {...defaultProps} />);
      
      const cardsButton = screen.getByTestId('epic-1-view-cards-button');
      const listButton = screen.getByTestId('epic-1-view-list-button');
      
      expect(cardsButton).toBeInTheDocument();
      expect(cardsButton).toHaveAttribute('aria-label', 'Switch to card view for Epic 1');
      expect(cardsButton).toHaveTextContent('Card View');
      
      expect(listButton).toBeInTheDocument();
      expect(listButton).toHaveAttribute('aria-label', 'Switch to list view for Epic 1');
      expect(listButton).toHaveTextContent('List View');
    });

    it('renders archive button with correct test ID when callback provided', () => {
      render(<EpicTabs {...defaultProps} />);
      
      const archiveButton = screen.getByTestId('epic-1-archive-button');
      expect(archiveButton).toBeInTheDocument();
      expect(archiveButton).toHaveAttribute('aria-label', 'Archive Epic 1');
      expect(archiveButton).toHaveTextContent('Archive');
    });

    it('does not render archive button when callback not provided', () => {
      const propsWithoutArchive = { ...defaultProps };
      delete propsWithoutArchive.onArchiveEpic;
      
      render(<EpicTabs {...propsWithoutArchive} />);
      
      expect(screen.queryByTestId('epic-1-archive-button')).not.toBeInTheDocument();
    });
  });

  describe('View Mode Switching', () => {
    it('switches to list view when list button is clicked', async () => {
      render(<EpicTabs {...defaultProps} />);
      
      const listButton = screen.getByTestId('epic-1-view-list-button');
      fireEvent.click(listButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('epic-1-stories-list-view')).toBeInTheDocument();
      });
    });

    it('renders stories in card view by default', () => {
      render(<EpicTabs {...defaultProps} />);
      
      expect(screen.getByTestId('epic-1-stories-card-view')).toBeInTheDocument();
      expect(screen.getByTestId('mock-story-panel-1-1')).toBeInTheDocument();
      expect(screen.getByTestId('mock-story-panel-1-2')).toBeInTheDocument();
    });

    it('renders stories in list view with correct test IDs', async () => {
      render(<EpicTabs {...defaultProps} />);
      
      const listButton = screen.getByTestId('epic-1-view-list-button');
      fireEvent.click(listButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('epic-1-stories-list-view')).toBeInTheDocument();
        expect(screen.getByTestId('epic-1-story-1-1-row')).toBeInTheDocument();
        expect(screen.getByTestId('epic-1-story-1-2-row')).toBeInTheDocument();
      });
    });
  });

  describe('Story Actions', () => {
    it('renders story action buttons with correct test IDs in list view', async () => {
      render(<EpicTabs {...defaultProps} />);
      
      const listButton = screen.getByTestId('epic-1-view-list-button');
      fireEvent.click(listButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('epic-1-story-1-1-view-button')).toBeInTheDocument();
        expect(screen.getByTestId('epic-1-story-1-1-edit-button')).toBeInTheDocument();
        expect(screen.getByTestId('epic-1-story-1-2-view-button')).toBeInTheDocument();
        expect(screen.getByTestId('epic-1-story-1-2-edit-button')).toBeInTheDocument();
      });
    });

    it('calls onViewStory when view button is clicked in list view', async () => {
      render(<EpicTabs {...defaultProps} />);
      
      const listButton = screen.getByTestId('epic-1-view-list-button');
      fireEvent.click(listButton);
      
      await waitFor(() => {
        const viewButton = screen.getByTestId('epic-1-story-1-1-view-button');
        fireEvent.click(viewButton);
      });
      
      expect(defaultProps.onViewStory).toHaveBeenCalledWith(mockEpics[0].stories[0]);
    });

    it('calls onEditStory when edit button is clicked in list view', async () => {
      render(<EpicTabs {...defaultProps} />);
      
      const listButton = screen.getByTestId('epic-1-view-list-button');
      fireEvent.click(listButton);
      
      await waitFor(() => {
        const editButton = screen.getByTestId('epic-1-story-1-1-edit-button');
        fireEvent.click(editButton);
      });
      
      expect(defaultProps.onEditStory).toHaveBeenCalledWith(mockEpics[0].stories[0]);
    });

    it('calls onViewStory when story row is clicked in list view', async () => {
      render(<EpicTabs {...defaultProps} />);
      
      const listButton = screen.getByTestId('epic-1-view-list-button');
      fireEvent.click(listButton);
      
      await waitFor(() => {
        const storyRow = screen.getByTestId('epic-1-story-1-1-row');
        fireEvent.click(storyRow);
      });
      
      expect(defaultProps.onViewStory).toHaveBeenCalledWith(mockEpics[0].stories[0]);
    });
  });

  describe('Archive Functionality', () => {
    it('shows confirmation dialog when archive button is clicked', () => {
      const mockConfirm = vi.fn().mockReturnValue(true);
      global.confirm = mockConfirm;
      
      render(<EpicTabs {...defaultProps} />);
      
      const archiveButton = screen.getByTestId('epic-1-archive-button');
      fireEvent.click(archiveButton);
      
      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to archive Epic 1? You can restore it later from the Archived EPICs tab.'
      );
      expect(defaultProps.onArchiveEpic).toHaveBeenCalledWith('1');
    });

    it('does not archive when confirmation is cancelled', () => {
      const mockConfirm = vi.fn().mockReturnValue(false);
      global.confirm = mockConfirm;
      
      render(<EpicTabs {...defaultProps} />);
      
      const archiveButton = screen.getByTestId('epic-1-archive-button');
      fireEvent.click(archiveButton);
      
      expect(mockConfirm).toHaveBeenCalled();
      expect(defaultProps.onArchiveEpic).not.toHaveBeenCalled();
    });
  });

  describe('Empty States', () => {
    it('renders no stories message when epic has no stories', () => {
      const epicsWithoutStories = [{
        id: '1',
        title: 'Empty Epic',
        description: 'An epic without stories',
        stories: []
      }];
      
      render(<EpicTabs epics={epicsWithoutStories} />);
      
      expect(screen.getByTestId('epic-1-no-stories')).toBeInTheDocument();
      expect(screen.getByText('No Stories Yet')).toBeInTheDocument();
      expect(screen.getByText('Create stories for this epic using the MadShrimp agent.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<EpicTabs {...defaultProps} />);
      
      const epic1Tab = screen.getByTestId('epic-1-tab-button');
      expect(epic1Tab).toHaveAttribute('role', 'tab');
      expect(epic1Tab).toHaveAttribute('aria-label', 'Epic 1: User Authentication');
      
      const cardView = screen.getByTestId('epic-1-stories-card-view');
      expect(cardView).toHaveAttribute('aria-label', 'Stories in Epic 1 displayed as cards');
    });

    it('provides proper aria-labels for action buttons', () => {
      render(<EpicTabs {...defaultProps} />);
      
      const cardsButton = screen.getByTestId('epic-1-view-cards-button');
      const listButton = screen.getByTestId('epic-1-view-list-button');
      const archiveButton = screen.getByTestId('epic-1-archive-button');
      
      expect(cardsButton).toHaveAttribute('aria-label', 'Switch to card view for Epic 1');
      expect(listButton).toHaveAttribute('aria-label', 'Switch to list view for Epic 1');
      expect(archiveButton).toHaveAttribute('aria-label', 'Archive Epic 1');
    });
  });

  describe('Error Handling', () => {
    it('handles epics without story arrays gracefully', () => {
      const epicsWithoutStoryArrays = [{
        id: '1',
        title: 'Epic without stories array',
        description: 'Testing epic without stories property'
      }];
      
      render(<EpicTabs epics={epicsWithoutStoryArrays} />);
      
      expect(screen.getByTestId('epic-1-no-stories')).toBeInTheDocument();
      expect(screen.getByText('0 of 0 stories completed')).toBeInTheDocument();
    });

    it('handles missing verification data gracefully', () => {
      render(<EpicTabs {...defaultProps} verifications={{}} />);
      
      expect(screen.getByText('1 of 2 stories completed')).toBeInTheDocument();
    });
  });

  describe('Progress Calculation', () => {
    it('calculates completion percentage correctly', () => {
      render(<EpicTabs {...defaultProps} />);
      
      // Epic 1 has 1 completed out of 2 stories (50%)
      expect(screen.getByText('1 of 2 stories completed')).toBeInTheDocument();
      
      // Epic 2 has 0 completed out of 1 stories (0%)
      expect(screen.getByText('0 of 1 stories completed')).toBeInTheDocument();
    });

    it('identifies stories needing attention (score < 80)', () => {
      render(<EpicTabs {...defaultProps} />);
      
      // Story 1-2 has score of 65, which is < 80
      expect(screen.getByText('⚠️ 1 stories need attention')).toBeInTheDocument();
    });
  });

  describe('List View Details', () => {
    it('displays story information in list view table', async () => {
      render(<EpicTabs {...defaultProps} />);
      
      const listButton = screen.getByTestId('epic-1-view-list-button');
      fireEvent.click(listButton);
      
      await waitFor(() => {
        expect(screen.getByText('1-1')).toBeInTheDocument();
        expect(screen.getByText('Create login form')).toBeInTheDocument();
        expect(screen.getByText('1-2')).toBeInTheDocument();
        expect(screen.getByText('Implement authentication API')).toBeInTheDocument();
      });
    });

    it('displays status badges in list view', async () => {
      render(<EpicTabs {...defaultProps} />);
      
      const listButton = screen.getByTestId('epic-1-view-list-button');
      fireEvent.click(listButton);
      
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });

    it('displays verification scores in list view', async () => {
      render(<EpicTabs {...defaultProps} />);
      
      const listButton = screen.getByTestId('epic-1-view-list-button');
      fireEvent.click(listButton);
      
      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument();
        expect(screen.getByText('65')).toBeInTheDocument();
      });
    });

    it('shows parallel work indicators in list view', async () => {
      render(<EpicTabs {...defaultProps} />);
      
      const listButton = screen.getByTestId('epic-1-view-list-button');
      fireEvent.click(listButton);
      
      await waitFor(() => {
        // Check for multi-dev OK (👥) and single dev (👤) indicators
        expect(screen.getByText('👥')).toBeInTheDocument();
        expect(screen.getByText('👤')).toBeInTheDocument();
      });
    });
  });
});