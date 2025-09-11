/**
 * BMAD API utility for interacting with BMAD data endpoints
 */

const API_BASE = '/api/bmad';

/**
 * Base API client with error handling
 */
class BMADApi {
  constructor(projectId = null) {
    this.baseURL = API_BASE;
    this.projectId = projectId;
  }

  setProjectId(projectId) {
    this.projectId = projectId;
  }

  /**
   * Make a GET request
   */
  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a PUT request
   */
  async put(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request
   */
  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }
}

// Note: API functions now require projectId for proper project context

/**
 * Get all stories for a specific project
 */
export const getStories = async (projectId) => {
  if (!projectId) {
    console.warn('getStories called without projectId');
    return [];
  }
  // Use the project-specific endpoint
  const response = await fetch(`/api/bmad-content/${projectId}`);
  if (!response.ok) {
    throw new Error(`Failed to load stories: ${response.statusText}`);
  }
  const data = await response.json();
  return data.stories || [];
};

/**
 * Get a specific story
 */
export const getStory = async (storyId, projectId) => {
  const api = new BMADApi(projectId);
  return api.get(`/stories/${storyId}`);
};

/**
 * Update a story
 */
export const updateStory = async (storyId, storyData, projectId) => {
  const api = new BMADApi(projectId);
  return api.put(`/stories/${storyId}`, storyData);
};

/**
 * Get all epics for a specific project
 */
export const getEpics = async (projectId) => {
  if (!projectId) {
    console.warn('getEpics called without projectId');
    return [];
  }
  // Use the project-specific endpoint
  const response = await fetch(`/api/bmad-content/${projectId}`);
  if (!response.ok) {
    throw new Error(`Failed to load epics: ${response.statusText}`);
  }
  const data = await response.json();
  return data.epics || [];
};

/**
 * Get verification results for a story
 */
export const getVerification = async (storyId, projectId) => {
  const api = new BMADApi(projectId);
  return api.get(`/verification/${storyId}`);
};

/**
 * Get all verification results for a specific project
 */
export const getAllVerifications = async (projectId) => {
  if (!projectId) {
    console.warn('getAllVerifications called without projectId');
    return {};
  }
  // For now, return empty object as verifications are project-specific
  // TODO: Implement project-specific verification endpoint
  return {};
};

/**
 * Trigger verification for a story
 */
export const triggerVerification = async (storyId, projectId) => {
  const api = new BMADApi(projectId);
  return api.post('/verify', { storyId });
};

/**
 * Get PRD content
 */
export const getPRD = async (projectId) => {
  const api = new BMADApi(projectId);
  return api.get('/prd');
};

/**
 * Update PRD content
 */
export const updatePRD = async (prdData, projectId) => {
  const api = new BMADApi(projectId);
  return api.put('/prd', prdData);
};

/**
 * Real-time updates using Server-Sent Events
 */
export class BMADRealTimeUpdater {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
  }

  /**
   * Start listening for real-time updates
   */
  start() {
    if (this.eventSource) {
      this.stop();
    }

    this.eventSource = new EventSource(`${API_BASE}/events`);

    this.eventSource.onopen = () => {
      console.log('BMAD real-time updates connected');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.notifyListeners(data.type, data);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('BMAD SSE error:', error);
      // Attempt reconnection after 5 seconds
      setTimeout(() => {
        if (this.eventSource.readyState === EventSource.CLOSED) {
          this.start();
        }
      }, 5000);
    };
  }

  /**
   * Stop listening for real-time updates
   */
  stop() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Notify all listeners for an event type
   */
  notifyListeners(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }
}

/**
 * Polling-based updates as fallback
 */
export class BMADPollingUpdater {
  constructor(interval = 30000) { // 30 seconds default
    this.interval = interval;
    this.timerId = null;
    this.callbacks = new Set();
    this.lastUpdate = new Date();
  }

  /**
   * Start polling for updates
   */
  start() {
    if (this.timerId) {
      this.stop();
    }

    this.poll(); // Initial poll
    this.timerId = setInterval(() => {
      this.poll();
    }, this.interval);
  }

  /**
   * Stop polling
   */
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Add callback for updates
   */
  subscribe(callback) {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Poll for updates
   */
  async poll() {
    try {
      const [stories, verifications] = await Promise.all([
        getStories(),
        getAllVerifications()
      ]);

      const updateData = {
        stories,
        verifications,
        timestamp: new Date()
      };

      this.callbacks.forEach(callback => {
        try {
          callback(updateData);
        } catch (error) {
          console.error('Error in polling callback:', error);
        }
      });

      this.lastUpdate = new Date();
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  /**
   * Get time since last successful update
   */
  getTimeSinceUpdate() {
    return Date.now() - this.lastUpdate.getTime();
  }
}

/**
 * Data cache for optimistic updates
 */
export class BMADDataCache {
  constructor() {
    this.cache = new Map();
    this.optimisticUpdates = new Map();
  }

  /**
   * Set cached data
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached data
   */
  get(key, maxAge = 60000) { // 1 minute default
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Apply any optimistic updates
    const optimistic = this.optimisticUpdates.get(key);
    if (optimistic) {
      return { ...cached.data, ...optimistic };
    }

    return cached.data;
  }

  /**
   * Set optimistic update
   */
  setOptimistic(key, update, ttl = 5000) { // 5 seconds default
    this.optimisticUpdates.set(key, update);
    
    // Clear after TTL
    setTimeout(() => {
      this.optimisticUpdates.delete(key);
    }, ttl);
  }

  /**
   * Clear optimistic update
   */
  clearOptimistic(key) {
    this.optimisticUpdates.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
    this.optimisticUpdates.clear();
  }
}

// Export singleton instances
export const realTimeUpdater = new BMADRealTimeUpdater();
export const pollingUpdater = new BMADPollingUpdater();
export const dataCache = new BMADDataCache();