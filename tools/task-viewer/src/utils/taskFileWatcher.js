/**
 * Simple EventEmitter implementation for browser compatibility
 */
class BrowserEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(data));
  }
}

/**
 * Task File Watcher - Intelligent file monitoring for task updates
 * Watches tasks.json files and emits events for React components
 */
export class TaskFileWatcher extends BrowserEventEmitter {
  constructor() {
    super();
    this.watchers = new Map(); // profileId -> watcher info
    this.debounceTimers = new Map();
    this.lastModified = new Map(); // profileId -> timestamp
    this.isWatching = false;
    this.DEBOUNCE_DELAY = 300; // ms
  }

  /**
   * Start watching a specific profile's task file
   */
  async startWatching(profileId, taskFilePath) {
    if (this.watchers.has(profileId)) {
      console.log(`Already watching tasks for profile: ${profileId}`);
      return;
    }

    try {
      // Get initial file stats
      const stats = await this.getFileStats(taskFilePath);
      if (stats) {
        this.lastModified.set(profileId, stats.mtime.getTime());
      }

      // Use Server-Sent Events for real-time updates
      const eventSource = new EventSource(`/api/tasks/${profileId}/watch`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleFileChange(profileId, data);
        } catch (parseError) {
          console.error(`Failed to parse SSE data for ${profileId}:`, parseError, event.data);
          const errorMessage = `JSON parse error: ${parseError.message}`;
          this.emit('error', { profileId, error: errorMessage });
        }
      };

      eventSource.onerror = (event) => {
        console.error(`SSE error for profile ${profileId}:`, event);
        let errorMessage = 'SSE connection error';
        
        // Handle different SSE error scenarios
        if (eventSource.readyState === EventSource.CONNECTING) {
          errorMessage = 'SSE connecting...';
        } else if (eventSource.readyState === EventSource.CLOSED) {
          errorMessage = 'SSE connection closed';
        } else {
          errorMessage = 'SSE connection failed';
        }
        
        this.emit('error', { profileId, error: errorMessage });
      };

      this.watchers.set(profileId, {
        eventSource,
        filePath: taskFilePath,
        startTime: Date.now()
      });

      console.log(`Started watching tasks for profile: ${profileId}`);
      this.emit('watchStarted', { profileId, filePath: taskFilePath });

    } catch (error) {
      console.error(`Failed to start watching profile ${profileId}:`, error);
      this.emit('error', { profileId, error });
    }
  }

  /**
   * Stop watching a specific profile
   */
  stopWatching(profileId) {
    const watcher = this.watchers.get(profileId);
    if (watcher) {
      watcher.eventSource.close();
      this.watchers.delete(profileId);
      this.lastModified.delete(profileId);
      
      // Clear pending timers
      const timer = this.debounceTimers.get(profileId);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(profileId);
      }

      console.log(`Stopped watching profile: ${profileId}`);
      this.emit('watchStopped', { profileId });
    }
  }

  /**
   * Stop watching all profiles
   */
  stopAll() {
    for (const profileId of this.watchers.keys()) {
      this.stopWatching(profileId);
    }
  }

  /**
   * Handle file change events with debouncing
   */
  handleFileChange(profileId, changeData) {
    const existingTimer = this.debounceTimers.get(profileId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce rapid changes
    const timer = setTimeout(async () => {
      try {
        await this.processFileChange(profileId, changeData);
      } catch (error) {
        console.error(`Error processing file change for ${profileId}:`, error);
        const errorMessage = error.message || error.toString() || 'File processing error';
        this.emit('error', { profileId, error: errorMessage });
      } finally {
        this.debounceTimers.delete(profileId);
      }
    }, this.DEBOUNCE_DELAY);

    this.debounceTimers.set(profileId, timer);
  }

  /**
   * Process file change after debouncing
   */
  async processFileChange(profileId, changeData) {
    console.log('Processing file change:', profileId, changeData);
    
    // Check if this is an error event from the server
    if (changeData.type === 'error') {
      console.error('Server-side error:', changeData.error);
      this.emit('error', { profileId, error: changeData.error });
      return;
    }
    
    const { type, timestamp, tasks } = changeData;
    
    // Prevent duplicate processing
    const lastMod = this.lastModified.get(profileId) || 0;
    if (timestamp <= lastMod) {
      return;
    }

    this.lastModified.set(profileId, timestamp);

    // Emit different events based on change type
    switch (type) {
      case 'tasks_updated':
        this.emit('tasksUpdated', {
          profileId,
          tasks,
          timestamp,
          changeType: 'update'
        });
        break;

      case 'task_added':
        this.emit('taskAdded', {
          profileId,
          task: changeData.task,
          timestamp
        });
        break;

      case 'task_removed':
        this.emit('taskRemoved', {
          profileId,
          taskId: changeData.taskId,
          timestamp
        });
        break;

      case 'task_status_changed':
        this.emit('taskStatusChanged', {
          profileId,
          taskId: changeData.taskId,
          oldStatus: changeData.oldStatus,
          newStatus: changeData.newStatus,
          timestamp
        });
        break;

      case 'connected':
      case 'heartbeat':
        // These are system events, just log them
        console.log(`SSE ${type} event for ${profileId}`);
        break;

      default:
        console.warn('Unknown event type:', type, changeData);
        this.emit('fileChanged', {
          profileId,
          timestamp,
          tasks
        });
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePath) {
    try {
      const response = await fetch(`/api/file-stats?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const stats = await response.json();
        return {
          mtime: new Date(stats.mtime)
        };
      }
    } catch (error) {
      console.warn(`Could not get file stats for ${filePath}:`, error);
    }
    return null;
  }

  /**
   * Get current watching status
   */
  getWatchingStatus() {
    const status = {};
    for (const [profileId, watcher] of this.watchers) {
      status[profileId] = {
        filePath: watcher.filePath,
        startTime: watcher.startTime,
        isConnected: watcher.eventSource.readyState === EventSource.OPEN
      };
    }
    return status;
  }

  /**
   * Check if a profile is being watched
   */
  isWatchingProfile(profileId) {
    return this.watchers.has(profileId);
  }
}

// Create singleton instance
export const taskFileWatcher = new TaskFileWatcher();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    taskFileWatcher.stopAll();
  });
}