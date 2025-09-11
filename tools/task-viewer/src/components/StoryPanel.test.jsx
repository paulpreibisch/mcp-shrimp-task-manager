import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StoryPanel from './StoryPanel';

// Mock the CreateTasksModal component
jest.mock('./CreateTasksModal', () => {
  return function MockCreateTasksModal({ isOpen, onClose, onConfirm, storyId, storyTitle }) {
    if (!isOpen) return null;
    return (
      <div data-testid="create-tasks-modal">
        <div>Story ID: {storyId}</div>
        <div>Story Title: {storyTitle}</div>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onConfirm({ taskOption: 'clear' })}>Confirm</button>
      </div>
    );
  };
});

describe('StoryPanel - Create Tasks Feature', () => {
  const mockStory = {
    id: '1-1',
    title: 'Test Story',
    status: 'Ready',
    description: 'Test description',
    filePath: '/test/path',
    epicId: '1',
    parallelWork: {
      multiDevOK: true,
      reason: 'Independent feature'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Create Tasks button with correct attributes', () => {
    render(<StoryPanel story={mockStory} />);
    
    const createTasksButton = screen.getByTestId('story-1-1-create-tasks-button');
    expect(createTasksButton).toBeInTheDocument();
    expect(createTasksButton).toHaveAttribute('aria-label', 'Create tasks from story');
    expect(createTasksButton).toHaveAttribute('title', 'Generate Shrimp tasks for this story');
    expect(createTasksButton).toHaveTextContent('Create Tasks');
  });

  test('opens Create Tasks modal when button is clicked', () => {
    render(<StoryPanel story={mockStory} />);
    
    const createTasksButton = screen.getByTestId('story-1-1-create-tasks-button');
    fireEvent.click(createTasksButton);
    
    expect(screen.getByTestId('create-tasks-modal')).toBeInTheDocument();
    expect(screen.getByText('Story ID: 1-1')).toBeInTheDocument();
    expect(screen.getByText('Story Title: Test Story')).toBeInTheDocument();
  });

  test('closes modal when close is clicked', () => {
    render(<StoryPanel story={mockStory} />);
    
    // Open modal
    const createTasksButton = screen.getByTestId('story-1-1-create-tasks-button');
    fireEvent.click(createTasksButton);
    
    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('create-tasks-modal')).not.toBeInTheDocument();
  });

  test('calls onCreateTasks prop when provided', async () => {
    const mockOnCreateTasks = jest.fn();
    render(<StoryPanel story={mockStory} onCreateTasks={mockOnCreateTasks} />);
    
    // Open modal
    const createTasksButton = screen.getByTestId('story-1-1-create-tasks-button');
    fireEvent.click(createTasksButton);
    
    // Confirm task creation
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    expect(mockOnCreateTasks).toHaveBeenCalledWith(mockStory, { taskOption: 'clear' });
  });

  test('prevents event propagation when button is clicked', () => {
    const mockOnClick = jest.fn();
    render(
      <div onClick={mockOnClick}>
        <StoryPanel story={mockStory} />
      </div>
    );
    
    const createTasksButton = screen.getByTestId('story-1-1-create-tasks-button');
    fireEvent.click(createTasksButton);
    
    // The parent onClick should not be called due to stopPropagation
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  test('shows button icon correctly', () => {
    render(<StoryPanel story={mockStory} />);
    
    const createTasksButton = screen.getByTestId('story-1-1-create-tasks-button');
    expect(createTasksButton).toHaveTextContent('📋');
  });
});