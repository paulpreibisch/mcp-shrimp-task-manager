/**
 * Archive service for managing task archives
 * Provides reusable archive functionality that can be shared between modals
 */

/**
 * Creates an archive with the given details and saves it to localStorage
 * @param {string} projectId - The project ID to archive tasks for
 * @param {string} archiveName - The name for the archive (usually project name)
 * @param {string} description - Description/initial request for the archive
 * @param {Array} tasks - Array of tasks to archive
 * @returns {Promise<Object>} - Returns the created archive object
 * @throws {Error} - Throws descriptive errors on failure
 */
export const createArchive = async (projectId, archiveName, description, tasks) => {
  if (!projectId) {
    throw new Error('Project ID is required to create an archive');
  }

  if (!tasks || !Array.isArray(tasks)) {
    throw new Error('Tasks must be provided as an array');
  }

  if (tasks.length === 0) {
    throw new Error('Cannot create archive with no tasks');
  }

  try {
    // Create archive object with timestamp
    const archiveData = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      projectId: projectId,
      projectName: archiveName || 'Unknown Project',
      initialRequest: description || '',
      tasks: tasks,
      stats: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        pending: tasks.filter(t => t.status === 'pending').length
      }
    };

    // Get existing archives from localStorage
    const storageKey = `task-archives-${projectId}`;
    const existingArchives = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Add new archive to the beginning
    const updatedArchives = [archiveData, ...existingArchives];
    
    // Limit to 50 archives to prevent localStorage overflow
    const limitedArchives = updatedArchives.slice(0, 50);
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(limitedArchives));

    return {
      success: true,
      archive: archiveData,
      archives: limitedArchives,
      message: `Archived ${tasks.length} tasks successfully`
    };
  } catch (error) {
    console.error('Archive creation failed:', error);
    
    // Provide more descriptive error messages
    if (error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please delete some old archives and try again.');
    } else if (error.message.includes('localStorage')) {
      throw new Error('Unable to save archive. Local storage may be disabled.');
    } else {
      throw new Error(`Archive creation failed: ${error.message}`);
    }
  }
};