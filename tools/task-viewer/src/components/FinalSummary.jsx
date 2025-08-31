import React, { useState } from 'react';

function FinalSummary({ 
  tasks = [], 
  projectId, 
  onSummaryGenerated, 
  existingSummary = null 
}) {
  const [summary, setSummary] = useState(existingSummary);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Filter completed tasks that have summaries
      const completedTasks = tasks.filter(task => 
        task.status === 'completed' && task.summary
      ).map(task => ({
        id: task.id,
        name: task.name,
        summary: task.summary
      }));

      const response = await fetch(`/api/tasks/${projectId}/final-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completedTasks
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data.summary);
      
      if (onSummaryGenerated) {
        onSummaryGenerated(data.summary);
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setError('Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div 
      className="task-detail-section collapsible-section"
      data-testid="final-summary-section"
    >
      <h3 
        className="collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        Final Summary
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </h3>
      
      <div className={`collapsible-content ${isExpanded ? 'expanded' : ''}`}>
        {summary ? (
          <div className="detail-content">
            <div className="summary-text">{summary}</div>
          </div>
        ) : (
          <div className="no-summary-message">
            Click Generate to create an overall summary of all completed tasks.
          </div>
        )}
        
        {error && (
          <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
            {error}
          </div>
        )}
        
        <div className="summary-actions" style={{ marginTop: '15px' }}>
          <button
            className="generate-summary-button"
            onClick={handleGenerateSummary}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : (summary ? 'Regenerate' : 'Generate')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinalSummary;