import React, { useState, useCallback, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import EmptyState from './EmptyState';
import Button from './Button.jsx';

/**
 * DocumentEditor Component
 * A reusable markdown editor for various document types (PRD, Coding Standards, etc.)
 */
const DocumentEditor = ({ 
  title,
  content,
  onSave,
  placeholder = "Enter content in markdown...",
  height = 500,
  readOnly = false,
  showToast,
  documentType = "Document",
  hideTitle = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(content || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditingContent(content || '');
  }, [content]);

  const handleStartEdit = useCallback(() => {
    setEditingContent(content || '');
    setIsEditing(true);
  }, [content]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingContent(content || '');
  }, [content]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(editingContent);
        showToast?.(`${title} saved successfully!`, 'success');
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving document:', error);
      showToast?.(`Failed to save ${title}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [editingContent, onSave, title, showToast]);

  const handleCreateDocument = useCallback(() => {
    setEditingContent('');
    setIsEditing(true);
  }, []);

  // Helper function to get appropriate icon for document type
  const getDocumentIcon = (docType) => {
    const type = docType.toLowerCase();
    if (type.includes('prd') || type.includes('product')) return '📋';
    if (type.includes('coding') || type.includes('standards')) return '📝';
    if (type.includes('source') || type.includes('tree')) return '🌳';
    if (type.includes('tech') || type.includes('stack')) return '🛠️';
    return '📄';
  };

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isEditing) {
        e.preventDefault();
        handleCancelEdit();
      }
    };
    
    if (isEditing) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditing, handleCancelEdit]);

  return (
    <div className="document-editor-container" style={{ padding: hideTitle ? '0' : '16px', position: hideTitle ? 'relative' : 'static' }}>
      <div className="rounded-lg border" style={{ 
        backgroundColor: 'rgba(100, 149, 210, 0.1)', 
        padding: hideTitle ? '0' : '20px', 
        borderColor: 'rgba(100, 149, 210, 0.2)',
        position: 'relative'
      }}>
        {!hideTitle && (
          <div className="document-header flex justify-between items-center mb-4" style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            minHeight: '2rem'
          }}>
            <h3 className="text-lg font-semibold" style={{ 
              color: '#e2e8f0',
              margin: 0,
              flex: '1 1 auto',
              paddingRight: '1rem'
            }}>
              {title}
            </h3>
            {!readOnly && !isEditing && (
              <Button
                variant="primary"
                size="small"
                onClick={handleStartEdit}
                className="edit-btn"
                icon="✏️"
                style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                Edit
              </Button>
            )}
          </div>
        )}
        {hideTitle && !readOnly && !isEditing && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
            <Button
              variant="primary"
              size="small"
              onClick={handleStartEdit}
              className="edit-btn"
              icon="✏️"
              style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              Edit
            </Button>
          </div>
        )}

        {isEditing ? (
          <div className="markdown-editor-wrapper">
            <div data-color-mode="dark">
              <MDEditor
                value={editingContent}
                onChange={(val) => setEditingContent(val || '')}
                preview="live"
                height={height}
                hideToolbar={false}
                enableScroll={true}
                textareaProps={{
                  placeholder: placeholder
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
            </div>
            <div className="editor-actions" style={{ 
              marginTop: '16px',
              display: 'flex',
              gap: '10px'
            }}>
              <Button
                variant="success"
                size="medium"
                onClick={handleSave}
                disabled={isSaving}
                icon={isSaving ? '⏳' : '💾'}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="secondary"
                size="medium"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {content ? (
              <div className="document-content" style={{
                backgroundColor: '#1a202c',
                color: '#e5e5e5',
                padding: '20px',
                borderRadius: '8px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '14px',
                lineHeight: '1.6',
                border: '1px solid #2d3748',
                maxHeight: `${height}px`,
                overflowY: 'auto'
              }}>
                <div className="markdown-preview" style={{ padding: '16px' }}>
                  <MDEditor.Markdown source={content} />
                </div>
              </div>
            ) : (
              <EmptyState
                documentType={documentType}
                onCreateClick={handleCreateDocument}
                icon={getDocumentIcon(documentType)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentEditor;