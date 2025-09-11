import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import ParallelTaskIndicator from './ParallelTaskIndicator.jsx';

// Helper function to render with Chakra provider
const renderWithChakra = (ui) => {
  return render(
    <ChakraProvider>
      {ui}
    </ChakraProvider>
  );
};

describe('ParallelTaskIndicator', () => {
  it('renders with single dev indicator when multiDevOK is false', () => {
    renderWithChakra(
      <ParallelTaskIndicator 
        taskId="test-task-1" 
        multiDevOK={false}
      />
    );
    
    const indicator = screen.getByTestId('parallel-indicator-test-task-1');
    expect(indicator).toBeInTheDocument();
  });

  it('renders with multi dev indicator when multiDevOK is true', () => {
    renderWithChakra(
      <ParallelTaskIndicator 
        taskId="test-task-2" 
        multiDevOK={true}
        userCount={3}
        reason="Independent components can be developed separately"
      />
    );
    
    const indicator = screen.getByTestId('parallel-indicator-test-task-2');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent('3');
  });

  it('renders with parallelizable indicator when isParallelizable is true', () => {
    renderWithChakra(
      <ParallelTaskIndicator 
        taskId="test-task-3" 
        multiDevOK={false}
        isParallelizable={true}
        userCount={2}
      />
    );
    
    const indicator = screen.getByTestId('parallel-indicator-test-task-3');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent('2');
  });

  it('shows correct test ID format', () => {
    renderWithChakra(
      <ParallelTaskIndicator 
        taskId="my-special-task" 
        multiDevOK={true}
      />
    );
    
    const indicator = screen.getByTestId('parallel-indicator-my-special-task');
    expect(indicator).toBeInTheDocument();
  });

  it('renders without tooltip when no reason is provided', () => {
    renderWithChakra(
      <ParallelTaskIndicator 
        taskId="test-task-4" 
        multiDevOK={true}
      />
    );
    
    const indicator = screen.getByTestId('parallel-indicator-test-task-4');
    expect(indicator).toBeInTheDocument();
  });
});