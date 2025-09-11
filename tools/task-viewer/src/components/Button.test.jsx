import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from './Button.jsx';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveStyle({
      backgroundColor: '#3182ce', // primary variant default
      fontSize: '13px' // medium size default
    });
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Button variant="danger">Delete</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveStyle({ backgroundColor: '#dc2626' });

    rerender(<Button variant="outline">View</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveStyle({ 
      backgroundColor: 'transparent',
      color: '#63b3ed',
      border: '1px solid #63b3ed'
    });

    rerender(<Button variant="success">Save</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveStyle({ backgroundColor: '#10b981' });
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Button size="small">Small</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveStyle({ 
      fontSize: '11px',
      height: '28px'
    });

    rerender(<Button size="large">Large</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveStyle({ 
      fontSize: '14px',
      height: '44px'
    });
  });

  it('handles click events', () => {
    const mockClick = jest.fn();
    render(<Button onClick={mockClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const mockClick = jest.fn();
    render(<Button onClick={mockClick} disabled>Disabled</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('renders with icon correctly', () => {
    render(<Button icon="📦">Archive</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('📦Archive');
  });

  it('applies custom styles and className', () => {
    render(
      <Button 
        className="custom-class" 
        style={{ marginTop: '10px' }}
      >
        Custom
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveStyle({ marginTop: '10px' });
  });

  it('handles accessibility attributes', () => {
    render(
      <Button 
        aria-label="Custom label"
        title="Custom title"
      >
        Button
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('title', 'Custom title');
  });
});