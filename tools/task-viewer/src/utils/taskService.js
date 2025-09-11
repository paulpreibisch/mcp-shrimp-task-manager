/**
 * Task API utility for interacting with task management endpoints
 */

const API_BASE = '/api/tasks';


/**
 * Get current tasks
 */
export const getCurrentTasks = async () => {
  try {
    const response = await fetch(`${API_BASE}/current`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`GET /current failed:`, error);
    throw error;
  }
};

/**
 * Clear all current tasks
 */
export const clearAllTasks = async (archiveFirst = false) => {
  try {
    const response = await fetch(`${API_BASE}/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        archiveFirst
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`POST /clear failed:`, error);
    throw error;
  }
};

/**
 * Archive current tasks
 */
export const archiveCurrentTasks = async () => {
  try {
    const response = await fetch(`${API_BASE}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`POST /archive failed:`, error);
    throw error;
  }
};