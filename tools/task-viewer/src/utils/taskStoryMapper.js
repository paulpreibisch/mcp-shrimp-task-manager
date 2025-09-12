/**
 * Task-Story Mapping Utility
 * Maps Shrimp tasks to BMAD stories for contextual display
 */

/**
 * Extract story ID from task metadata or file paths
 * @param {Object} task - Task object from Shrimp
 * @returns {string|null} - Story ID if found
 */
export function extractStoryIdFromTask(task) {
  if (!task) return null;

  // Check if task already has a storyId field
  if (task.storyId) {
    return task.storyId;
  }

  // Check task metadata for story references
  if (task.metadata && task.metadata.storyId) {
    return task.metadata.storyId;
  }

  // Check related files for story patterns
  if (task.relatedFiles && Array.isArray(task.relatedFiles)) {
    for (const file of task.relatedFiles) {
      const storyId = extractStoryIdFromPath(file.path);
      if (storyId) {
        return storyId;
      }
    }
  }

  // Check task description for story references
  if (task.description) {
    const patterns = [
      /story[:\s]+([0-9]+\.[0-9]+)/i,
      /STORY[-_]([0-9]+)/i,
      /#([0-9]+\.[0-9]+)/,
      /\b([0-9]{3}\.[0-9]{3})\b/
    ];
    
    for (const pattern of patterns) {
      const match = task.description.match(pattern);
      if (match) {
        const storyNum = match[1];
        // If we only got a number, assume it belongs to epic 001
        if (storyNum.indexOf('.') === -1) {
          return `001.${storyNum.padStart(3, '0')}`;
        }
        return storyNum;
      }
    }
  }

  // Check task name for story patterns
  if (task.name) {
    const patterns = [
      /story[:\s]+([0-9]+\.[0-9]+)/i,
      /STORY[-_]([0-9]+)/i,
      /#([0-9]+\.[0-9]+)/,
      /\b([0-9]{3}\.[0-9]{3})\b/
    ];
    
    for (const pattern of patterns) {
      const match = task.name.match(pattern);
      if (match) {
        const storyNum = match[1];
        // If we only got a number, assume it belongs to epic 001
        if (storyNum.indexOf('.') === -1) {
          return `001.${storyNum.padStart(3, '0')}`;
        }
        return storyNum;
      }
    }
  }

  return null;
}

/**
 * Extract story ID from file path
 * @param {string} filePath - File path to analyze
 * @returns {string|null} - Story ID if found
 */
export function extractStoryIdFromPath(filePath) {
  if (!filePath) return null;

  // Match patterns like: stories/story-001.001.md, STORY-001-*.md, etc.
  const patterns = [
    /story[s]?[\/\\]story[-_]?([0-9]+\.[0-9]+)/i,
    /STORY[-_]([0-9]+).*\.md/i,
    /stories[\/\\].*([0-9]+\.[0-9]+)/i,
    /epic[s]?[\/\\].*story[-_]?([0-9]+)/i
  ];

  for (const pattern of patterns) {
    const match = filePath.match(pattern);
    if (match) {
      const storyNum = match[1];
      // If we only got a number, assume it belongs to epic 001
      if (storyNum.indexOf('.') === -1) {
        return `001.${storyNum}`;
      }
      return storyNum;
    }
  }

  return null;
}

/**
 * Group tasks by their associated stories
 * @param {Array} tasks - Array of task objects
 * @param {Array} stories - Array of story objects from BMAD
 * @returns {Object} - Grouped tasks with story context
 */
export function groupTasksByStory(tasks, stories = []) {
  const grouped = {
    withStory: new Map(),
    withoutStory: []
  };

  // Create a map of story IDs to story objects for quick lookup
  const storyMap = new Map();
  if (stories && Array.isArray(stories)) {
    stories.forEach(story => {
      if (story.id) {
        storyMap.set(story.id, story);
      }
    });
  }

  // Process each task
  tasks.forEach(task => {
    const storyId = extractStoryIdFromTask(task);
    
    if (storyId) {
      // Task has an associated story
      if (!grouped.withStory.has(storyId)) {
        const storyInfo = storyMap.get(storyId) || {
          id: storyId,
          title: `Story ${storyId}`,
          description: 'Story details not found',
          status: 'unknown'
        };
        
        grouped.withStory.set(storyId, {
          story: storyInfo,
          tasks: []
        });
      }
      
      // Add task with story context
      grouped.withStory.get(storyId).tasks.push({
        ...task,
        storyId: storyId
      });
    } else {
      // Task has no associated story
      grouped.withoutStory.push(task);
    }
  });

  return grouped;
}

/**
 * Get story context for task display
 * @param {string} storyId - Story ID
 * @param {Array} stories - Array of available stories
 * @param {Object} verifications - Optional verification data for stories
 * @returns {Object} - Story context object
 */
export function getStoryContext(storyId, stories = [], verifications = {}) {
  if (!storyId) return null;

  const story = stories.find(s => s.id === storyId);
  const verification = verifications[storyId];
  
  if (!story) {
    return {
      id: storyId,
      title: `Story ${storyId}`,
      description: 'Story details not available',
      status: 'unknown',
      verified: false,
      verificationScore: verification?.score || null,
      verificationStatus: 'not-found'
    };
  }

  return {
    id: story.id,
    title: story.title || `Story ${storyId}`,
    description: story.description || story.userStory || 'No description available',
    status: story.status || 'active',
    verified: Boolean(story.verified || verification?.verified),
    verificationScore: verification?.score || story.verificationScore || null,
    verificationStatus: story.verificationStatus || (verification ? 'verified' : 'pending'),
    epicId: story.epicId || story.epic,
    directory: story.directory
  };
}

/**
 * Add story context to task data
 * @param {Array} tasks - Array of tasks
 * @param {Array} stories - Array of stories
 * @param {Object} verifications - Optional verification data for stories
 * @returns {Array} - Tasks with story context added
 */
export function enrichTasksWithStoryContext(tasks, stories = [], verifications = {}) {
  return tasks.map(task => {
    const storyId = extractStoryIdFromTask(task);
    const storyContext = storyId ? getStoryContext(storyId, stories, verifications) : null;
    
    return {
      ...task,
      storyId: storyId,
      storyContext: storyContext
    };
  });
}

/**
 * Validate story-task linking
 * @param {Array} tasks - Array of tasks
 * @param {Array} stories - Array of stories
 * @returns {Object} - Validation results
 */
export function validateStoryTaskLinking(tasks, stories = []) {
  const results = {
    totalTasks: tasks.length,
    tasksWithStories: 0,
    tasksWithoutStories: 0,
    linkedStories: new Set(),
    orphanedStories: new Set(),
    missingStories: new Set()
  };

  const storyIds = new Set(stories.map(s => s.id));
  
  tasks.forEach(task => {
    const storyId = extractStoryIdFromTask(task);
    if (storyId) {
      results.tasksWithStories++;
      results.linkedStories.add(storyId);
      
      if (!storyIds.has(storyId)) {
        results.missingStories.add(storyId);
      }
    } else {
      results.tasksWithoutStories++;
    }
  });

  // Find orphaned stories (stories with no linked tasks)
  storyIds.forEach(storyId => {
    if (!results.linkedStories.has(storyId)) {
      results.orphanedStories.add(storyId);
    }
  });

  return {
    ...results,
    linkedStories: Array.from(results.linkedStories),
    orphanedStories: Array.from(results.orphanedStories),
    missingStories: Array.from(results.missingStories)
  };
}

/**
 * Create story verification status indicator
 * @param {Object} story - Story object
 * @returns {Object} - Verification status info
 */
export function getStoryVerificationStatus(story) {
  if (!story) {
    return {
      status: 'unknown',
      color: 'gray',
      icon: '❓',
      text: 'Unknown'
    };
  }

  if (story.verified === true) {
    return {
      status: 'verified',
      color: 'green',
      icon: '✅',
      text: 'Verified'
    };
  }

  if (story.verified === false || story.status === 'failed') {
    return {
      status: 'failed',
      color: 'red',
      icon: '❌',
      text: 'Verification Failed'
    };
  }

  if (story.status === 'pending') {
    return {
      status: 'pending',
      color: 'yellow',
      icon: '⏳',
      text: 'Pending Verification'
    };
  }

  return {
    status: 'not-verified',
    color: 'orange',
    icon: '⚠️',
    text: 'Not Verified'
  };
}

export default {
  extractStoryIdFromTask,
  extractStoryIdFromPath,
  groupTasksByStory,
  getStoryContext,
  enrichTasksWithStoryContext,
  validateStoryTaskLinking,
  getStoryVerificationStatus
};