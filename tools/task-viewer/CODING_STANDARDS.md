# Coding Standards - Task Viewer

## Markdown Editor Implementation Patterns

This document outlines the coding patterns and standards for implementing markdown editors in the Task Viewer application.

### Overview

The Task Viewer uses `@uiw/react-md-editor` for markdown editing functionality. This provides a consistent, dark-themed editor with live preview capabilities across all components.

### Dependencies

```json
{
  "@uiw/react-md-editor": "^4.0.8"
}
```

Required imports:
```jsx
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
```

### Standard Implementation Pattern

#### 1. State Management

For components that support markdown editing, maintain these state variables:

```jsx
const [isEditingMarkdown, setIsEditingMarkdown] = useState(false);
const [editingField, setEditingField] = useState(null);
const [editingContent, setEditingContent] = useState('');
```

#### 2. Helper Functions

Implement these standard callback functions:

```jsx
const startEditingMarkdown = useCallback((field, content) => {
  setEditingField(field);
  setEditingContent(content || '');
  setIsEditingMarkdown(true);
}, []);

const cancelEditingMarkdown = useCallback(() => {
  setIsEditingMarkdown(false);
  setEditingField(null);
  setEditingContent('');
}, []);

const saveMarkdownChanges = useCallback((newContent) => {
  setIsEditingMarkdown(false);
  setEditingField(null);
  setEditingContent('');
  // Implement actual save logic here
  console.log(`Saving ${editingField}:`, newContent);
}, [editingField]);
```

#### 3. Keyboard Navigation Integration

Ensure the Escape key exits markdown editing mode:

```jsx
useEffect(() => {
  const handleKeyDown = (e) => {
    // ... other key handlers
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isEditingMarkdown) {
        cancelEditingMarkdown();
      } else {
        // Default escape behavior
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [/* dependencies including isEditingMarkdown, cancelEditingMarkdown */]);
```

#### 4. Field Section Template

For each editable field, use this template:

```jsx
<div className="task-detail-section">
  <h3>
    Field Name
    {!isReadOnly && (
      <button 
        className="edit-field-btn"
        onClick={() => startEditingMarkdown('fieldName', fieldValue)}
        title="Edit field in markdown"
        style={{ marginLeft: '10px', fontSize: '14px', padding: '2px 8px' }}
      >
        ✏️ Edit
      </button>
    )}
  </h3>
  {isEditingMarkdown && editingField === 'fieldName' ? (
    <div className="markdown-editor-container" data-color-mode="dark">
      <MDEditor
        value={editingContent}
        onChange={(val) => setEditingContent(val || '')}
        preview="live"
        height={300}
        hideToolbar={false}
        enableScroll={true}
        textareaProps={{
          placeholder: "Enter content in markdown..."
        }}
        previewOptions={{
          components: {
            code: ({inline, children, className, ...props}) => {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <div className="code-block-wrapper">
                  <pre className={className} {...props}>
                    <code>{children}</code>
                  </pre>
                </div>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }
        }}
      />
      <div className="markdown-editor-actions" style={{ marginTop: '10px' }}>
        <button 
          className="primary-btn"
          onClick={() => saveMarkdownChanges(editingContent)}
          style={{ marginRight: '10px' }}
        >
          💾 Save
        </button>
        <button 
          className="secondary-btn"
          onClick={cancelEditingMarkdown}
        >
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <div className="detail-content">{fieldValue || 'No content provided'}</div>
  )}
</div>
```

### Standard Configuration Options

#### MDEditor Standard Props

- `preview="live"` - Show live preview alongside editor
- `height={300}` - Standard height for field editors, `height={500}` for full templates
- `hideToolbar={false}` - Show the toolbar for formatting options
- `enableScroll={true}` - Allow scrolling within the editor
- `data-color-mode="dark"` - Dark theme to match application

#### Preview Options

Always include code block styling enhancement:

```jsx
previewOptions={{
  components: {
    code: ({inline, children, className, ...props}) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="code-block-wrapper">
          <pre className={className} {...props}>
            <code>{children}</code>
          </pre>
        </div>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  }
}}
```

### Best Practices

1. **State Management**: Always use local state for editing content to prevent accidental data loss
2. **Escape Key**: Always handle the Escape key for user experience consistency
3. **Read-Only Mode**: Disable editing for historical or read-only views
4. **Placeholders**: Use descriptive placeholders that indicate the purpose of each field
5. **Actions**: Always provide both Save and Cancel options
6. **Dark Mode**: Use `data-color-mode="dark"` for theme consistency
7. **Height**: Use consistent heights across similar components

### Examples

#### Template Editor Pattern (Full Screen)

Used in `TemplateEditor.jsx` for complete template editing:
- Height: 500px
- Includes parameter help panel
- Supports mode toggling (override/append)

#### Story Editor Pattern

Used in `StoryEditor.jsx` for BMAD story editing:
- Description field: Height 250px with full toolbar
- Acceptance criteria: Height 120px with no toolbar (simplified)
- Dark theme with custom styling to match application
- Edit/Preview toggle for full story view

#### Task Field Pattern (Inline Editing)  

Used in `TaskDetailView.jsx` for field-specific editing:
- Height: 300px  
- Edit buttons in field headers
- Multiple fields per component

### Testing Considerations

When implementing markdown editors:
1. Test keyboard navigation (especially Escape key)
2. Test content persistence during editing
3. Test cancel functionality  
4. Test save functionality
5. Verify dark theme appearance
6. Check responsive behavior

### Future Enhancements

Consider these future improvements:
- Auto-save functionality
- Revision history
- Collaborative editing
- Custom toolbar configurations
- Field-specific validation
- Markdown syntax highlighting in edit mode

## UI Components

This section covers the standards for UI components, styling patterns, and user interface consistency throughout the Task Viewer application.

### Overview

The Task Viewer uses a dark theme with consistent spacing, color palette, and component architecture. All UI components should follow these established patterns to maintain visual consistency and accessibility.

### Button Component

The application uses a standardized Button component located at `src/components/Button.jsx` that provides consistent styling, behavior, and accessibility features.

#### Available Variants

- **primary** (`#3182ce`) - Main action buttons, primary calls-to-action
- **secondary** (`#4a5568`) - Secondary actions, alternative choices
- **danger** (`#dc2626`) - Delete actions, destructive operations
- **success** (`#10b981`) - Confirmation actions, positive operations
- **outline** (`#63b3ed`) - Subtle actions, border-only styling
- **ghost** - Minimal actions, transparent background with hover effects

#### Available Sizes

- **small** - Height 28px, padding 4px 12px, font-size 11px
- **medium** - Height 36px, padding 6px 16px, font-size 13px (default)
- **large** - Height 44px, padding 8px 24px, font-size 14px

#### Usage Examples

```jsx
import Button from './components/Button';

// Primary action button
<Button variant="primary" onClick={handleSave}>
  Save Changes
</Button>

// Button with icon
<Button variant="secondary" icon={<span>📄</span>} iconPosition="left">
  Export PDF
</Button>

// Danger button for destructive actions
<Button 
  variant="danger" 
  size="small"
  onClick={handleDelete}
  aria-label="Delete task permanently"
>
  Delete
</Button>

// Disabled button
<Button variant="primary" disabled={!isValid}>
  Submit Form
</Button>
```

#### Icon Integration

```jsx
// Left icon (default)
<Button variant="primary" icon={<SaveIcon />}>
  Save
</Button>

// Right icon
<Button variant="outline" icon={<ArrowIcon />} iconPosition="right">
  Next
</Button>

// Icon-only button (requires aria-label)
<Button 
  variant="ghost" 
  icon={<CloseIcon />}
  aria-label="Close dialog"
  title="Close"
/>
```

#### Accessibility Requirements

- **ARIA Labels**: Always provide `aria-label` for icon-only buttons
- **Title Attribute**: Include `title` for additional context on hover
- **Keyboard Navigation**: All buttons support Tab navigation and Enter/Space activation
- **Disabled State**: Properly handled with `disabled` prop and visual feedback
- **Focus Indicators**: Automatic browser focus rings with enhanced visibility

### Table Component Guidelines

The application uses standardized table patterns for consistent data display across all components.

#### Full-Width Table Pattern

```jsx
<div className="table-container" style={{
  backgroundColor: 'rgba(26, 32, 44, 0.5)',
  borderRadius: '8px',
  border: '1px solid #2d3748'
}}>
  <table className="table-full-width">
    <thead>
      <tr style={{
        backgroundColor: 'rgba(45, 55, 72, 0.3)',
        borderBottom: '1px solid #4a5568'
      }}>
        <th style={{ width: '30%', padding: '12px 16px' }}>Name</th>
        <th style={{ width: '15%', padding: '12px 16px' }}>Status</th>
        <th style={{ width: '25%', padding: '12px 16px' }}>Description</th>
        <th style={{ width: '20%', padding: '12px 16px' }}>Created</th>
        <th style={{ width: '10%', padding: '12px 16px' }}>Actions</th>
      </tr>
    </thead>
    <tbody>
      {/* Table rows */}
    </tbody>
  </table>
</div>
```

#### Column Width Best Practices

- **ID/Actions**: 10-15% width for narrow columns
- **Status**: 15-20% width for status indicators
- **Name/Title**: 25-35% width for primary content
- **Description**: 20-30% width for secondary content
- **Dates**: 15-20% width for timestamps

#### Multi-Line Text Handling

For table cells with potentially long content:

```css
.table-cell-multiline {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  max-height: 4.2em; /* 3 lines × 1.4 line-height */
}
```

#### Responsive Table Container

```jsx
<div className="table-container">
  {/* 
    - Provides horizontal scroll on narrow screens
    - Maintains table layout integrity
    - Includes proper overflow handling
  */}
</div>
```

### Color and Spacing Conventions

#### Dark Theme Color Palette

```css
/* Primary Background Colors */
--bg-primary: #1a202c;        /* Main background */
--bg-secondary: #2d3748;      /* Secondary surfaces */
--bg-tertiary: #4a5568;       /* Tertiary elements */

/* Text Colors */
--text-primary: #e2e8f0;      /* Primary text */
--text-secondary: #cbd5e1;    /* Secondary text */
--text-muted: #a0aec0;        /* Muted/placeholder text */

/* Border Colors */
--border-primary: #2d3748;    /* Main borders */
--border-secondary: #4a5568;  /* Emphasis borders */
--border-accent: #3182ce;     /* Active/focus borders */

/* Status Colors */
--status-success: #10b981;    /* Success states */
--status-warning: #f59e0b;    /* Warning states */
--status-error: #dc2626;      /* Error states */
--status-info: #3182ce;       /* Info states */
```

#### Consistent Spacing Units

Use these standardized spacing values:

```css
/* Base spacing units (multiples of 4px) */
--spacing-xs: 4px;     /* Minimal spacing */
--spacing-sm: 8px;     /* Small spacing */
--spacing-md: 12px;    /* Medium spacing */
--spacing-lg: 16px;    /* Large spacing */
--spacing-xl: 20px;    /* Extra large spacing */
--spacing-2xl: 24px;   /* Double extra large spacing */
```

#### Usage Examples

```jsx
// Component spacing
<div style={{
  padding: '16px',           // --spacing-lg
  marginBottom: '20px',      // --spacing-xl
  gap: '12px'               // --spacing-md
}}>

// Button spacing
<Button style={{
  marginRight: '8px'        // --spacing-sm
}}>

// Form field spacing
<div style={{
  marginBottom: '16px'      // --spacing-lg
}}>
```

### Empty State Patterns

Consistent empty state messaging and layout:

```jsx
const EmptyState = ({ title, message, actionButton }) => (
  <div style={{
    textAlign: 'center',
    padding: '40px 20px',
    color: '#a0aec0'
  }}>
    <div style={{
      fontSize: '48px',
      marginBottom: '16px',
      opacity: 0.5
    }}>
      📝
    </div>
    <h3 style={{
      color: '#cbd5e1',
      marginBottom: '8px',
      fontSize: '18px'
    }}>
      {title}
    </h3>
    <p style={{
      marginBottom: actionButton ? '20px' : '0',
      lineHeight: '1.5'
    }}>
      {message}
    </p>
    {actionButton && actionButton}
  </div>
);

// Usage
<EmptyState
  title="No Tasks Found"
  message="Create your first task to get started with project management."
  actionButton={
    <Button variant="primary" onClick={handleCreateTask}>
      Create Task
    </Button>
  }
/>
```

### Accessibility Requirements

#### ARIA Labels and Descriptions

```jsx
// Buttons with clear purpose
<Button 
  aria-label="Delete task permanently"
  title="This action cannot be undone"
  variant="danger"
>
  Delete
</Button>

// Form inputs
<input
  aria-label="Task name"
  aria-describedby="task-name-help"
  placeholder="Enter task name..."
/>
<div id="task-name-help">
  Choose a descriptive name for your task
</div>

// Tables
<table aria-label="Task list" className="table-full-width">
  <thead>
    <tr>
      <th scope="col">Task Name</th>
      <th scope="col">Status</th>
      <th scope="col">Actions</th>
    </tr>
  </thead>
</table>
```

#### Keyboard Navigation Support

```jsx
// Tab order and Enter/Space handling
<div 
  tabIndex={0}
  role="button"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAction();
    }
  }}
  onClick={handleAction}
>
  Interactive Element
</div>

// Focus management
const focusableRef = useRef();

useEffect(() => {
  if (isOpen) {
    focusableRef.current?.focus();
  }
}, [isOpen]);
```

#### Focus Indicators

Ensure all interactive elements have visible focus indicators:

```css
.interactive-element:focus {
  outline: 2px solid #3182ce;
  outline-offset: 2px;
  border-radius: 4px;
}

/* For custom focus styles */
.button:focus-visible {
  box-shadow: 0 0 0 2px #1a202c, 0 0 0 4px #3182ce;
}
```

### Component Architecture Principles

#### Component Structure

```jsx
import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Component description and usage notes
 */
const ComponentName = forwardRef(({ 
  // Props with defaults
  variant = 'default',
  size = 'medium',
  disabled = false,
  // Event handlers
  onClick,
  // Accessibility props
  'aria-label': ariaLabel,
  title,
  // Flexible props
  className = '',
  style = {},
  children,
  ...props
}, ref) => {
  
  // Component logic here
  
  return (
    <element
      ref={ref}
      className={className}
      style={combinedStyles}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      {...props}
    >
      {children}
    </element>
  );
});

ComponentName.displayName = 'ComponentName';

ComponentName.propTypes = {
  variant: PropTypes.oneOf(['default', 'primary', 'secondary']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  'aria-label': PropTypes.string,
  title: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  children: PropTypes.node
};

export default ComponentName;
```

#### PropTypes Validation

Always include comprehensive PropTypes:

```jsx
ComponentName.propTypes = {
  // Required props
  id: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  
  // Optional props with specific types
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  
  // Functions
  onClick: PropTypes.func,
  onSubmit: PropTypes.func,
  
  // Accessibility
  'aria-label': PropTypes.string,
  'aria-describedby': PropTypes.string,
  
  // Flexible content
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object
};
```

### Component Best Practices

#### When to Create Reusable Components

Create reusable components when:
- The pattern is used 3+ times across the application
- The component has complex logic that benefits from isolation
- Consistent styling and behavior is critical
- Accessibility features need to be centralized

#### Component File Organization

```
src/components/
├── Button/
│   ├── Button.jsx
│   ├── Button.test.jsx
│   └── index.js
├── Table/
│   ├── Table.jsx
│   ├── TableRow.jsx
│   ├── TableCell.jsx
│   ├── Table.test.jsx
│   └── index.js
└── common/
    ├── EmptyState.jsx
    ├── LoadingSpinner.jsx
    └── ErrorBoundary.jsx
```

#### Testing Requirements

Every component should include:

```jsx
// Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  test('renders with correct variant styling', () => {
    render(<Button variant="primary">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ backgroundColor: '#3182ce' });
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('supports keyboard navigation', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('displays correct accessibility attributes', () => {
    render(
      <Button 
        aria-label="Save document" 
        title="Save your work"
      >
        Save
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Save document');
    expect(button).toHaveAttribute('title', 'Save your work');
  });
});
```

### Integration Guidelines

#### Working with Existing Components

When extending existing components:
1. Follow established patterns for props and styling
2. Maintain backward compatibility
3. Add new features as optional props with sensible defaults
4. Update PropTypes and documentation
5. Add comprehensive tests for new functionality

#### Theme Integration

All components should work seamlessly with the dark theme:

```jsx
const ThemedComponent = ({ style = {}, ...props }) => {
  const defaultStyle = {
    backgroundColor: '#2d3748',
    color: '#e2e8f0',
    border: '1px solid #4a5568',
    ...style
  };

  return <div style={defaultStyle} {...props} />;
};
```

This comprehensive UI component guide ensures consistent, accessible, and maintainable user interface components throughout the Task Viewer application.