/**
 * Export utility functions for tasks
 */

/**
 * Filters tasks by selected statuses
 * @param {Array} tasks - Array of task objects
 * @param {Array} selectedStatuses - Array of status strings to filter by
 * @returns {Array} Filtered tasks
 */
export const filterTasksByStatus = (tasks, selectedStatuses) => {
  if (!selectedStatuses || selectedStatuses.length === 0) {
    return [];
  }
  
  return tasks.filter(task => selectedStatuses.includes(task.status));
};

/**
 * Escapes CSV field value by adding quotes and escaping internal quotes
 * @param {string} value - Value to escape
 * @returns {string} Escaped CSV field
 */
const escapeCSVField = (value) => {
  if (value == null) return '';
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap in quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape internal quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

/**
 * Exports tasks to CSV format with all details
 * @param {Array} tasks - Array of task objects
 * @param {string} initialRequest - The initial request that started the task planning
 * @returns {string} CSV formatted string
 */
export const exportToCSV = (tasks, initialRequest = '') => {
  const headers = [
    'Task Number',
    'ID',
    'Name',
    'Description',
    'Status',
    'Notes',
    'Implementation Guide',
    'Verification Criteria',
    'Summary',
    'Completion Summary',
    'Key Accomplishments',
    'Implementation Details',
    'Technical Challenges',
    'Verification Score',
    'Analysis Result',
    'Related Files',
    'Dependencies',
    'Agent',
    'Created At',
    'Updated At',
    'Completed At'
  ];
  const csvRows = [headers.join(',')];
  
  // Add initial request as a special row if provided
  if (initialRequest) {
    const requestRow = [
      escapeCSVField('Initial Request'),
      escapeCSVField(''),
      escapeCSVField(''),
      escapeCSVField(initialRequest),
      ...Array(headers.length - 4).fill('')
    ];
    csvRows.push(requestRow.join(','));
  }
  
  tasks.forEach((task, index) => {
    // Parse completion details if available
    let keyAccomplishments = '';
    let implementationDetails = '';
    let technicalChallenges = '';
    let verificationScore = '';
    
    if (task.completionDetails) {
      keyAccomplishments = (task.completionDetails.keyAccomplishments || []).join('; ');
      implementationDetails = (task.completionDetails.implementationDetails || []).join('; ');
      technicalChallenges = (task.completionDetails.technicalChallenges || []).join('; ');
      verificationScore = task.completionDetails.verificationScore || '';
    }
    
    // Format related files
    const relatedFiles = (task.relatedFiles || []).map(file => 
      `${file.path} (${file.type})${file.description ? ': ' + file.description : ''}`
    ).join('; ');
    
    // Format dependencies
    const dependencies = (task.dependencies || []).map(dep => {
      if (typeof dep === 'string') return dep;
      if (dep && typeof dep === 'object') {
        return dep.taskId || dep.id || 'Unknown';
      }
      return '';
    }).join('; ');
    
    const row = [
      escapeCSVField(`Task ${index + 1}`),
      escapeCSVField(task.id),
      escapeCSVField(task.name),
      escapeCSVField(task.description || ''),
      escapeCSVField(task.status),
      escapeCSVField(task.notes || ''),
      escapeCSVField(task.implementationGuide || task.metadata?.implementationNotes || ''),
      escapeCSVField(task.verificationCriteria || task.metadata?.verificationCriteria || ''),
      escapeCSVField(task.summary || ''),
      escapeCSVField(task.completionSummary || ''),
      escapeCSVField(keyAccomplishments),
      escapeCSVField(implementationDetails),
      escapeCSVField(technicalChallenges),
      escapeCSVField(verificationScore.toString()),
      escapeCSVField(task.analysisResult || ''),
      escapeCSVField(relatedFiles),
      escapeCSVField(dependencies),
      escapeCSVField(task.agent || ''),
      escapeCSVField(task.createdAt || task.metadata?.createdAt || ''),
      escapeCSVField(task.updatedAt || task.metadata?.updatedAt || ''),
      escapeCSVField(task.completedAt || '')
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
};

/**
 * Formats date for markdown display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
const formatDateForMarkdown = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    return new Date(dateString).toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return dateString;
  }
};

/**
 * Groups tasks by status
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Tasks grouped by status
 */
const groupTasksByStatus = (tasks) => {
  return tasks.reduce((groups, task) => {
    const status = task.status || 'unknown';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(task);
    return groups;
  }, {});
};

/**
 * Generates task statistics
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Statistics object
 */
const generateTaskStats = (tasks) => {
  const stats = tasks.reduce((acc, task) => {
    const status = task.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  return {
    total: tasks.length,
    completed: stats.completed || 0,
    in_progress: stats.in_progress || 0,
    pending: stats.pending || 0,
    other: Object.keys(stats).reduce((sum, key) => {
      if (!['completed', 'in_progress', 'pending'].includes(key)) {
        return sum + stats[key];
      }
      return sum;
    }, 0)
  };
};

/**
 * Exports tasks to Markdown format with comprehensive details
 * @param {Array} tasks - Array of task objects
 * @param {string} initialRequest - The initial request that started the task planning
 * @param {string} overallSummary - Overall summary of the tasks
 * @returns {string} Markdown formatted string
 */
export const exportToMarkdown = (tasks, initialRequest = '', overallSummary = '') => {
  if (tasks.length === 0) {
    let markdown = `# Tasks Export

**Export Date:** ${new Date().toISOString().split('T')[0]}

`;
    
    if (initialRequest) {
      markdown += `## Initial Request

${initialRequest}

---

`;
    }
    
    markdown += `Total tasks: 0

No tasks to export.`;
    
    return markdown;
  }

  const stats = generateTaskStats(tasks);
  const groupedTasks = groupTasksByStatus(tasks);
  
  let markdown = `# Tasks Export

**Export Date:** ${new Date().toISOString().split('T')[0]}

Total tasks: ${stats.total}

`;

  // Add initial request if provided
  if (initialRequest) {
    markdown += `## Initial Request

${initialRequest}

---

`;
  }
  
  // Add overall summary if provided
  if (overallSummary) {
    markdown += `## Overall Summary

${overallSummary}

---

`;
  }

  markdown += `## Summary

- **Completed:** ${stats.completed}
- **In Progress:** ${stats.in_progress}
- **Pending:** ${stats.pending}`;

  if (stats.other > 0) {
    markdown += `\n- **Other:** ${stats.other}`;
  }

  markdown += '\n\n---\n';

  // Sort statuses for consistent output and create a flat list for numbering
  const sortedStatuses = Object.keys(groupedTasks).sort();
  
  // Create a flat list of all tasks with their original order for numbering
  const allTasksFlat = [];
  tasks.forEach((task, index) => {
    allTasksFlat.push({ ...task, taskNumber: index + 1 });
  });
  
  sortedStatuses.forEach(status => {
    const statusTasks = groupedTasks[status];
    const statusLabel = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    markdown += `\n### Status: ${statusLabel}\n\n`;
    
    statusTasks.forEach(task => {
      // Find the task number from the original order
      const taskWithNumber = allTasksFlat.find(t => t.id === task.id);
      const taskNumber = taskWithNumber ? taskWithNumber.taskNumber : '?';
      markdown += `## Task ${taskNumber}: ${task.name}\n\n`;
      
      if (task.description) {
        markdown += `**Description:**  \n${task.description}\n\n`;
      }
      
      if (task.notes) {
        markdown += `**Notes:**  \n${task.notes}\n\n`;
      }
      
      // Include implementation guide from task or metadata
      const implementationGuide = task.implementationGuide || task.metadata?.implementationNotes;
      if (implementationGuide) {
        markdown += `**Implementation Guide:**  \n${implementationGuide}\n\n`;
      }
      
      // Include verification criteria from task or metadata
      const verificationCriteria = task.verificationCriteria || task.metadata?.verificationCriteria;
      if (verificationCriteria) {
        markdown += `**Verification Criteria:**  \n${verificationCriteria}\n\n`;
      }
      
      if (task.agent) {
        markdown += `**Assigned Agent:** ${task.agent}\n\n`;
      }
      
      if (task.summary) {
        markdown += `**Summary:**  \n${task.summary}\n\n`;
      }
      
      // Add completion details section
      if (task.completionSummary || task.completionDetails) {
        markdown += `### Completion Details\n\n`;
        
        if (task.completionSummary) {
          markdown += `**Completion Summary:**  \n${task.completionSummary}\n\n`;
        }
        
        if (task.completionDetails) {
          if (task.completionDetails.keyAccomplishments && task.completionDetails.keyAccomplishments.length > 0) {
            markdown += `**Key Accomplishments:**\n`;
            task.completionDetails.keyAccomplishments.forEach(item => {
              markdown += `- ${item}\n`;
            });
            markdown += '\n';
          }
          
          if (task.completionDetails.implementationDetails && task.completionDetails.implementationDetails.length > 0) {
            markdown += `**Implementation Details:**\n`;
            task.completionDetails.implementationDetails.forEach(item => {
              markdown += `- ${item}\n`;
            });
            markdown += '\n';
          }
          
          if (task.completionDetails.technicalChallenges && task.completionDetails.technicalChallenges.length > 0) {
            markdown += `**Technical Challenges:**\n`;
            task.completionDetails.technicalChallenges.forEach(item => {
              markdown += `- ${item}\n`;
            });
            markdown += '\n';
          }
          
          if (task.completionDetails.verificationScore) {
            markdown += `**Verification Score:** ${task.completionDetails.verificationScore}/100\n\n`;
          }
        }
      }
      
      if (task.analysisResult) {
        markdown += `**Analysis Result:**  \n${task.analysisResult}\n\n`;
      }
      
      if (task.dependencies && task.dependencies.length > 0) {
        markdown += `**Dependencies:**\n`;
        task.dependencies.forEach(dep => {
          if (typeof dep === 'string') {
            markdown += `- ${dep}\n`;
          } else if (dep && typeof dep === 'object') {
            const depId = dep.taskId || dep.id || 'Unknown';
            const depName = dep.name ? ` (${dep.name})` : '';
            markdown += `- ${depId}${depName}\n`;
          }
        });
        markdown += '\n';
      }
      
      if (task.relatedFiles && task.relatedFiles.length > 0) {
        markdown += `**Related Files:**\n`;
        task.relatedFiles.forEach(file => {
          const typeIcons = {
            CREATE: "➕",
            TO_MODIFY: "✏️", 
            REFERENCE: "📖",
            DEPENDENCY: "🔗",
            OTHER: "📄"
          };
          const icon = typeIcons[file.type] || "📄";
          markdown += `- ${icon} **${file.path}** (${file.type})`;
          if (file.description) {
            markdown += ` - ${file.description}`;
          }
          if (file.lineStart || file.lineEnd) {
            const start = file.lineStart || '?';
            const end = file.lineEnd || '?';
            markdown += ` [Lines: ${start}-${end}]`;
          }
          markdown += '\n';
        });
        markdown += '\n';
      }
      
      markdown += `**Metadata:**  \n`;
      markdown += `- **ID:** ${task.id}\n`;
      markdown += `- **Status:** ${status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
      markdown += `- **Created:** ${formatDateForMarkdown(task.createdAt || task.metadata?.createdAt)}\n`;
      markdown += `- **Updated:** ${formatDateForMarkdown(task.updatedAt || task.metadata?.updatedAt)}\n`;
      if (task.completedAt) {
        markdown += `- **Completed:** ${formatDateForMarkdown(task.completedAt)}\n`;
      }
      if (task.metadata?.complexity) {
        markdown += `- **Complexity:** ${task.metadata.complexity}\n`;
      }
      if (task.metadata?.estimatedHours) {
        markdown += `- **Estimated Hours:** ${task.metadata.estimatedHours}\n`;
      }
      if (task.metadata?.requiredSkills && task.metadata.requiredSkills.length > 0) {
        markdown += `- **Required Skills:** ${task.metadata.requiredSkills.join(', ')}\n`;
      }
      markdown += '\n---\n\n';
    });
  });
  
  return markdown.trim();
};

/**
 * Exports tasks to JSON format with all details
 * @param {Array} tasks - Array of task objects
 * @param {string} initialRequest - The initial request that started the task planning
 * @param {string} overallSummary - Overall summary of the tasks
 * @returns {string} JSON formatted string
 */
export const exportToJSON = (tasks, initialRequest = '', overallSummary = '') => {
  const exportData = {
    exportDate: new Date().toISOString(),
    version: '2.0',
    initialRequest: initialRequest || null,
    overallSummary: overallSummary || null,
    statistics: generateTaskStats(tasks),
    tasks: tasks.map((task, index) => ({
      taskNumber: index + 1,
      id: task.id,
      name: task.name,
      description: task.description || null,
      status: task.status,
      notes: task.notes || null,
      implementationGuide: task.implementationGuide || task.metadata?.implementationNotes || null,
      verificationCriteria: task.verificationCriteria || task.metadata?.verificationCriteria || null,
      summary: task.summary || null,
      completionSummary: task.completionSummary || null,
      completionDetails: task.completionDetails || null,
      analysisResult: task.analysisResult || null,
      relatedFiles: task.relatedFiles || [],
      dependencies: task.dependencies || [],
      agent: task.agent || null,
      metadata: task.metadata || {},
      createdAt: task.createdAt || task.metadata?.createdAt || null,
      updatedAt: task.updatedAt || task.metadata?.updatedAt || null,
      completedAt: task.completedAt || null
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
};