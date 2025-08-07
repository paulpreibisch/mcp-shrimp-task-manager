// Simple test to validate basic functionality
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock fetch globally
global.fetch = vi.fn();

describe('Simple Component Tests', () => {
  beforeEach(() => {
    // Reset fetch mock with valid responses
    fetch.mockImplementation((url) => {
      if (url === '/api/agents') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'agent1', name: 'Agent 1', path: '/path/1' },
            { id: 'agent2', name: 'Agent 2', path: '/path/2' }
          ])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ tasks: [] })
      });
    });
  });

  it('should render without crashing', async () => {
    // Dynamically import App to avoid module resolution issues
    const { default: App } = await import('./src/App.jsx');
    
    expect(() => {
      render(<App />);
    }).not.toThrow();

    // Check that the app header renders
    expect(screen.getByText('🦐 Shrimp Task Manager Viewer')).toBeInTheDocument();
  });

  it('should load profiles on mount', async () => {
    const { default: App } = await import('./src/App.jsx');
    
    render(<App />);
    
    // Check that fetch is called for profiles
    expect(fetch).toHaveBeenCalledWith('/api/agents');
  });
});