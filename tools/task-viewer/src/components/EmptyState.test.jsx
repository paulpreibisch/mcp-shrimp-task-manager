import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  const mockOnCreateClick = jest.fn();

  beforeEach(() => {
    mockOnCreateClick.mockClear();
  });

  test('renders with default props', () => {
    render(<EmptyState onCreateClick={mockOnCreateClick} />);
    
    expect(screen.getByText('No Document Found')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your document')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create document/i })).toBeInTheDocument();
  });

  test('renders with custom document type', () => {
    render(
      <EmptyState 
        documentType="PRD" 
        onCreateClick={mockOnCreateClick} 
      />
    );
    
    expect(screen.getByText('No PRD Found')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your prd')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create prd/i })).toBeInTheDocument();
  });

  test('renders with custom icon and description', () => {
    render(
      <EmptyState 
        documentType="Tech Stack"
        onCreateClick={mockOnCreateClick}
        icon="🛠️"
        description="Custom description here"
      />
    );
    
    expect(screen.getByText('🛠️')).toBeInTheDocument();
    expect(screen.getByText('Custom description here')).toBeInTheDocument();
  });

  test('calls onCreateClick when create button is clicked', () => {
    render(<EmptyState onCreateClick={mockOnCreateClick} />);
    
    const createButton = screen.getByRole('button', { name: /create document/i });
    fireEvent.click(createButton);
    
    expect(mockOnCreateClick).toHaveBeenCalledTimes(1);
  });

  test('has proper accessibility attributes', () => {
    render(
      <EmptyState 
        documentType="PRD" 
        onCreateClick={mockOnCreateClick} 
        icon="📋"
      />
    );
    
    // Check icon has proper aria-label
    expect(screen.getByLabelText('PRD icon')).toBeInTheDocument();
    
    // Check button has proper aria-label
    expect(screen.getByLabelText('Create new prd')).toBeInTheDocument();
  });
});