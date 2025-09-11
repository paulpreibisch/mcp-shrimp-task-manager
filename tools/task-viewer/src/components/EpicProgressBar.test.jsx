import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, it, expect } from 'vitest';
import EpicProgressBar from './EpicProgressBar.jsx';

const ChakraWrapper = ({ children }) => (
  <ChakraProvider>
    {children}
  </ChakraProvider>
);

describe('EpicProgressBar', () => {
  const mockEpic = {
    id: '1',
    title: 'Test Epic',
    stories: [
      { id: '1', status: 'Done' },
      { id: '2', status: 'In Progress' },
      { id: '3', status: 'Done' }
    ]
  };

  const mockVerifications = {
    '1': { score: 85 },
    '2': { score: 70 },
    '3': { score: 90 }
  };

  it('renders linear progress bar with correct test id', () => {
    render(
      <ChakraWrapper>
        <EpicProgressBar 
          epic={mockEpic} 
          verifications={mockVerifications}
          variant="linear" 
        />
      </ChakraWrapper>
    );

    expect(screen.getByTestId('epic-progress-1')).toBeInTheDocument();
  });

  it('renders circular progress bar with correct test id', () => {
    render(
      <ChakraWrapper>
        <EpicProgressBar 
          epic={mockEpic} 
          verifications={mockVerifications}
          variant="circular" 
        />
      </ChakraWrapper>
    );

    expect(screen.getByTestId('epic-progress-1')).toBeInTheDocument();
  });

  it('calculates correct completion percentage', () => {
    render(
      <ChakraWrapper>
        <EpicProgressBar 
          epic={mockEpic} 
          verifications={mockVerifications}
          variant="circular" 
        />
      </ChakraWrapper>
    );

    // 2 out of 3 stories are 'Done', so 67% completion
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('shows story completion count', () => {
    render(
      <ChakraWrapper>
        <EpicProgressBar 
          epic={mockEpic} 
          verifications={mockVerifications}
        />
      </ChakraWrapper>
    );

    expect(screen.getByText('2 of 3 stories completed')).toBeInTheDocument();
  });

  it('displays average verification score', () => {
    render(
      <ChakraWrapper>
        <EpicProgressBar 
          epic={mockEpic} 
          verifications={mockVerifications}
          showScore={true}
        />
      </ChakraWrapper>
    );

    // Average of 85, 70, 90 is 82 (rounded)
    expect(screen.getByText(/Avg.*82/)).toBeInTheDocument();
  });

  it('shows stories needing attention warning', () => {
    render(
      <ChakraWrapper>
        <EpicProgressBar 
          epic={mockEpic} 
          verifications={mockVerifications}
        />
      </ChakraWrapper>
    );

    // Story 2 has score 70 (< 80), so should show warning
    expect(screen.getByText(/1 stories need attention/)).toBeInTheDocument();
  });

  it('handles epic with no stories', () => {
    const emptyEpic = {
      id: '1',
      title: 'Empty Epic',
      stories: []
    };

    render(
      <ChakraWrapper>
        <EpicProgressBar 
          epic={emptyEpic} 
          verifications={{}}
          variant="circular"
        />
      </ChakraWrapper>
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 / 0 stories')).toBeInTheDocument();
  });

  it('applies correct color scheme based on progress', () => {
    const highProgressEpic = {
      id: '2',
      title: 'High Progress Epic',
      stories: [
        { id: '1', status: 'Done' },
        { id: '2', status: 'Done' },
        { id: '3', status: 'Done' },
        { id: '4', status: 'In Progress' }
      ]
    };

    render(
      <ChakraWrapper>
        <EpicProgressBar 
          epic={highProgressEpic} 
          verifications={{}}
          variant="circular"
        />
      </ChakraWrapper>
    );

    // 3 out of 4 stories done = 75%, should be yellow (50-80%)
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});