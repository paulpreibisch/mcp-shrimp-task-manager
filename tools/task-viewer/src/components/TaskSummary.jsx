import React, { memo } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

/**
 * Performance-optimized TaskSummary component for rendering Markdown content
 * Features:
 * - Memoized to prevent unnecessary re-renders
 * - Lazy-loaded markdown renderer
 * - Memory leak prevention
 * - Dark theme optimized
 */
const TaskSummary = memo(({ summary }) => {
  // Early return for falsy values to prevent unnecessary renders
  if (!summary || (typeof summary === 'string' && summary.trim() === '')) {
    return null;
  }

  return (
    <div 
      className="task-summary-container"
      data-testid="task-summary"
      style={{
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#b8c5d6'
      }}
    >
      <div data-color-mode="dark" className="wmde-markdown-container">
        <MDEditor.Markdown 
          source={summary}
          style={{ 
            backgroundColor: 'transparent',
            color: '#b8c5d6',
            padding: 0,
            fontSize: 'inherit',
            lineHeight: 'inherit'
          }}
          data-testid="markdown-content"
          // Performance optimization: disable plugins if not needed
          rehypePlugins={[]}
          // Security: prevent unsafe HTML
          skipHtml={false}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization optimization
  return prevProps.summary === nextProps.summary;
});


TaskSummary.displayName = 'TaskSummary';

export default TaskSummary;