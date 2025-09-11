import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import StatusDropdown from './StatusDropdown.jsx';
import MarkdownPreview from './MarkdownPreview.jsx';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

/**
 * StoryEditor component for editing BMAD story files
 * Follows Chakra UI v2 styling guidelines and coding standards
 */
const StoryEditor = ({ 
  story, 
  onSave, 
  onCancel, 
  isLoading = false 
}) => {
  const [editMode, setEditMode] = useState('edit');
  const [editedStory, setEditedStory] = useState({
    title: '',
    status: 'Draft',
    description: '',
    acceptanceCriteria: [],
    content: ''
  });
  const [saveStatus, setSaveStatus] = useState({ type: null, message: '' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (story) {
      setEditedStory({
        title: story.title || story.name || '',
        status: story.status || 'Draft',
        description: story.description || '',
        acceptanceCriteria: story.acceptanceCriteria || [],
        content: story.content || ''
      });
      setHasUnsavedChanges(false);
    }
  }, [story]);

  const handleFieldChange = (field, value) => {
    setEditedStory(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setSaveStatus({ type: null, message: '' });
  };

  const handleAcceptanceCriteriaChange = (index, value) => {
    const newCriteria = [...editedStory.acceptanceCriteria];
    newCriteria[index] = value;
    handleFieldChange('acceptanceCriteria', newCriteria);
  };

  const addAcceptanceCriterion = () => {
    handleFieldChange('acceptanceCriteria', [...editedStory.acceptanceCriteria, '']);
  };

  const removeAcceptanceCriterion = (index) => {
    const newCriteria = editedStory.acceptanceCriteria.filter((_, i) => i !== index);
    handleFieldChange('acceptanceCriteria', newCriteria);
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      setSaveStatus({ type: 'info', message: 'No changes to save' });
      return;
    }

    setSaveStatus({ type: 'loading', message: 'Saving...' });

    try {
      await onSave?.(editedStory);
      setHasUnsavedChanges(false);
      setSaveStatus({ type: 'success', message: 'Story saved successfully!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus({ type: null, message: '' });
      }, 3000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: `Save failed: ${error.message}` });
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onCancel?.();
      }
    } else {
      onCancel?.();
    }
  };

  const generatePreviewMarkdown = () => {
    const { title, status, description, acceptanceCriteria } = editedStory;
    
    let markdown = `# Story ${story?.id || 'X.X'}: ${title}\n\n`;
    markdown += `## Status: ${status}\n\n`;
    markdown += `## Story\n${description}\n\n`;
    
    if (acceptanceCriteria.length > 0) {
      markdown += `## Acceptance Criteria\n`;
      acceptanceCriteria.forEach((criterion, index) => {
        if (criterion.trim()) {
          markdown += `${index + 1}. ${criterion}\n`;
        }
      });
      markdown += '\n';
    }
    
    return markdown;
  };

  if (!story) {
    return (
      <div className="story-editor-container" style={{ padding: '24px', backgroundColor: '#1a202c' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          No story selected for editing
        </div>
      </div>
    );
  }

  return (
    <div className="story-editor-container" data-testid={`story-${story.id}-editor`} style={{ 
      backgroundColor: '#1a202c', 
      color: '#e5e5e5',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div className="story-editor-header" style={{ 
        backgroundColor: 'rgba(45, 55, 72, 0.3)', 
        borderBottom: '1px solid #2d3748',
        padding: '16px 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#e5e5e5', margin: 0 }}>
              Edit Story {story.id}
            </h2>
            <p style={{ fontSize: '13px', marginTop: '4px', color: '#94a3b8' }}>
              {story.filePath}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Edit/Preview Toggle */}
            <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #2d3748' }}>
              <button
                onClick={() => setEditMode('edit')}
                data-testid={`story-${story.id}-edit-mode-button`}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: editMode === 'edit' ? '#3182ce' : 'transparent',
                  color: editMode === 'edit' ? 'white' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Edit
              </button>
              <button
                onClick={() => setEditMode('preview')}
                data-testid={`story-${story.id}-preview-mode-button`}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: editMode === 'preview' ? '#3182ce' : 'transparent',
                  color: editMode === 'preview' ? 'white' : '#cbd5e1',
                  border: 'none',
                  borderLeft: '1px solid #2d3748',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Preview
              </button>
            </div>
          </div>
        </div>

        {/* Save Status */}
        {saveStatus.message && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            backgroundColor: saveStatus.type === 'success' ? 'rgba(154, 230, 180, 0.16)' :
                           saveStatus.type === 'error' ? 'rgba(254, 178, 178, 0.16)' :
                           saveStatus.type === 'loading' ? 'rgba(190, 227, 248, 0.16)' :
                           'rgba(160, 174, 192, 0.16)',
            color: saveStatus.type === 'success' ? '#48bb78' :
                   saveStatus.type === 'error' ? '#fc8181' :
                   saveStatus.type === 'loading' ? '#63b3ed' :
                   '#a0aec0',
            border: `1px solid ${
              saveStatus.type === 'success' ? 'rgba(154, 230, 180, 0.3)' :
              saveStatus.type === 'error' ? 'rgba(254, 178, 178, 0.3)' :
              saveStatus.type === 'loading' ? 'rgba(190, 227, 248, 0.3)' :
              'rgba(160, 174, 192, 0.3)'
            }`
          }}>
            {saveStatus.type === 'loading' && <span style={{ marginRight: '8px' }}>⏳</span>}
            {saveStatus.type === 'success' && <span style={{ marginRight: '8px' }}>✅</span>}
            {saveStatus.type === 'error' && <span style={{ marginRight: '8px' }}>❌</span>}
            {saveStatus.message}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="story-editor-content" style={{ flex: 1, overflowY: 'auto' }}>
        {editMode === 'edit' ? (
          <div style={{ padding: '24px' }}>
            {/* Title */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#cbd5e1' }}>
                Title
              </label>
              <input
                type="text"
                value={editedStory.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                data-testid={`story-${story.id}-title-input`}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#2d3748',
                  border: '1px solid #4a5568',
                  color: '#e5e5e5',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                placeholder="Enter story title..."
                onFocus={(e) => { e.target.style.borderColor = '#3182ce'; }}
                onBlur={(e) => { e.target.style.borderColor = '#4a5568'; }}
              />
            </div>

            {/* Status */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#cbd5e1' }}>
                Status
              </label>
              <StatusDropdown
                value={editedStory.status}
                onChange={(status) => handleFieldChange('status', status)}
                storyId={story.id}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#cbd5e1' }}>
                Description
              </label>
              <div data-color-mode="dark">
                <MDEditor
                  value={editedStory.description}
                  onChange={(val) => handleFieldChange('description', val || '')}
                  preview="live"
                  height={250}
                  hideToolbar={false}
                  enableScroll={true}
                  textareaProps={{
                    placeholder: "Describe what this story accomplishes using markdown...",
                    'data-testid': `story-${story.id}-description-input`
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
            </div>

            {/* Acceptance Criteria */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>
                  Acceptance Criteria
                </label>
                <button
                  onClick={addAcceptanceCriterion}
                  data-testid={`story-${story.id}-add-criterion-button`}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: '500',
                    backgroundColor: '#3182ce',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = '#2c5282'; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = '#3182ce'; }}
                >
                  + Add Criterion
                </button>
              </div>
              
              <div style={{ paddingLeft: '24px' }}>
                {editedStory.acceptanceCriteria.map((criterion, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px', minWidth: '20px' }}>
                      {index + 1}.
                    </span>
                    <div style={{ flex: 1 }} data-color-mode="dark">
                      <MDEditor
                        value={criterion}
                        onChange={(val) => handleAcceptanceCriteriaChange(index, val || '')}
                        preview="live"
                        height={120}
                        hideToolbar={true}
                        enableScroll={true}
                        textareaProps={{
                          placeholder: "Enter acceptance criterion using markdown...",
                          'data-testid': `story-${story.id}-criterion-${index}-input`
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
                    <button
                      onClick={() => removeAcceptanceCriterion(index)}
                      data-testid={`story-${story.id}-remove-criterion-${index}-button`}
                      style={{
                        padding: '4px 8px',
                        marginTop: '4px',
                        fontSize: '18px',
                        color: '#fc8181',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'color 0.2s ease'
                      }}
                      title="Remove criterion"
                      onMouseEnter={(e) => { e.target.style.color = '#e53e3e'; }}
                      onMouseLeave={(e) => { e.target.style.color = '#fc8181'; }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {editedStory.acceptanceCriteria.length === 0 && (
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                    No acceptance criteria defined. Click "Add Criterion" to add one.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px' }}>
            <MarkdownPreview
              content={generatePreviewMarkdown()}
              storyId={story.id}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="story-editor-footer" style={{ 
        backgroundColor: 'rgba(45, 55, 72, 0.3)', 
        borderTop: '1px solid #2d3748',
        padding: '16px 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px' }}>
            {hasUnsavedChanges && (
              <span style={{ color: '#ecc94b' }}>
                ⚠️ Unsaved changes
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleCancel}
              data-testid={`story-${story.id}-cancel-button`}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                backgroundColor: 'transparent',
                color: '#cbd5e1',
                border: '1px solid #4a5568',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { 
                e.target.style.backgroundColor = 'rgba(74, 85, 104, 0.2)';
                e.target.style.borderColor = '#718096';
              }}
              onMouseLeave={(e) => { 
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = '#4a5568';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !hasUnsavedChanges}
              data-testid={`story-${story.id}-save-button`}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                backgroundColor: hasUnsavedChanges && !isLoading ? '#3182ce' : '#4a5568',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: hasUnsavedChanges && !isLoading ? 'pointer' : 'not-allowed',
                opacity: hasUnsavedChanges && !isLoading ? 1 : 0.6,
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => { 
                if (hasUnsavedChanges && !isLoading) {
                  e.target.style.backgroundColor = '#2c5282';
                }
              }}
              onMouseLeave={(e) => { 
                if (hasUnsavedChanges && !isLoading) {
                  e.target.style.backgroundColor = '#3182ce';
                }
              }}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

StoryEditor.propTypes = {
  story: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    description: PropTypes.string,
    acceptanceCriteria: PropTypes.arrayOf(PropTypes.string),
    filePath: PropTypes.string.isRequired,
    lastModified: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    epicId: PropTypes.string,
    parallelWork: PropTypes.shape({
      multiDevOK: PropTypes.bool.isRequired,
      reason: PropTypes.string.isRequired
    })
  }),
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
  isLoading: PropTypes.bool
};

export default StoryEditor;