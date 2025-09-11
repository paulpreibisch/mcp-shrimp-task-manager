import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * MarkdownPreview component for displaying formatted markdown content
 * Simple markdown renderer without external dependencies
 */
const MarkdownPreview = ({ 
  content = '', 
  storyId = '',
  className = '' 
}) => {
  const renderedContent = useMemo(() => {
    if (!content) return '';

    // Simple markdown to HTML conversion
    let html = content;

    // Headers
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Lists
    html = html.replace(/^\d+\.\s(.*)$/gm, '<li>$1</li>');
    html = html.replace(/^-\s(.*)$/gm, '<li>$1</li>');
    html = html.replace(/^(\*\s.*)$/gm, '<li>$1</li>');

    // Wrap consecutive list items in ul/ol
    html = html.replace(/(<li>.*<\/li>\s*)+/g, (match) => {
      const hasNumbers = /<li>\d+\./.test(match);
      const tag = hasNumbers ? 'ol' : 'ul';
      return `<${tag}>${match}</${tag}>`;
    });

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraphs
    html = `<p>${html}</p>`;

    // Clean up empty paragraphs and fix structure
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>|<ol>)/g, '$1');
    html = html.replace(/(<\/ul>|<\/ol>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');

    return html;
  }, [content]);

  const previewStyles = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: '1.6',
    color: '#374151'
  };

  return (
    <div
      data-testid={`story-${storyId}-preview`}
      className={`markdown-preview ${className}`}
      style={previewStyles}
    >
      {content ? (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
          style={{
            // Custom prose styles
            '--tw-prose-body': '#374151',
            '--tw-prose-headings': '#1f2937',
            '--tw-prose-lead': '#4b5563',
            '--tw-prose-links': '#2563eb',
            '--tw-prose-bold': '#1f2937',
            '--tw-prose-counters': '#6b7280',
            '--tw-prose-bullets': '#d1d5db',
            '--tw-prose-hr': '#e5e7eb',
            '--tw-prose-quotes': '#1f2937',
            '--tw-prose-quote-borders': '#e5e7eb',
            '--tw-prose-captions': '#6b7280',
            '--tw-prose-code': '#1f2937',
            '--tw-prose-pre-code': '#e5e7eb',
            '--tw-prose-pre-bg': '#1f2937',
            '--tw-prose-th-borders': '#d1d5db',
            '--tw-prose-td-borders': '#e5e7eb'
          }}
        />
      ) : (
        <div className="text-gray-400 italic text-center py-8">
          No content to preview
        </div>
      )}

      <style jsx>{`
        .markdown-preview :global(h1) {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 1rem;
          color: #1f2937;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }

        .markdown-preview :global(h2) {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #1f2937;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.25rem;
        }

        .markdown-preview :global(h3) {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #1f2937;
        }

        .markdown-preview :global(p) {
          margin-bottom: 1rem;
        }

        .markdown-preview :global(ul),
        .markdown-preview :global(ol) {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }

        .markdown-preview :global(li) {
          margin-bottom: 0.25rem;
        }

        .markdown-preview :global(code) {
          background-color: #f3f4f6;
          color: #1f2937;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .markdown-preview :global(pre) {
          background-color: #1f2937;
          color: #e5e7eb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1rem;
        }

        .markdown-preview :global(pre code) {
          background-color: transparent;
          color: inherit;
          padding: 0;
          border-radius: 0;
        }

        .markdown-preview :global(a) {
          color: #2563eb;
          text-decoration: underline;
        }

        .markdown-preview :global(a:hover) {
          color: #1d4ed8;
        }

        .markdown-preview :global(strong) {
          font-weight: 600;
          color: #1f2937;
        }

        .markdown-preview :global(em) {
          font-style: italic;
        }

        .markdown-preview :global(blockquote) {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

MarkdownPreview.propTypes = {
  content: PropTypes.string,
  storyId: PropTypes.string,
  className: PropTypes.string
};

export default MarkdownPreview;