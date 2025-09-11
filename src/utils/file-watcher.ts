import * as fs from 'fs';
import * as path from 'path';
import { FileWatchEvent, StoryStatus, ParsedStoryFile } from '../types/bmad.js';

const DEBOUNCE_DELAY = 500; // milliseconds
const STORIES_DIR = 'docs/stories';

/**
 * File watcher utility for monitoring BMAD story file changes
 */
export class StoryFileWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private onStatusChange?: (storyId: string, newStatus: StoryStatus, filePath: string) => void;

  constructor(
    private projectRoot: string,
    statusChangeCallback?: (storyId: string, newStatus: StoryStatus, filePath: string) => void
  ) {
    this.onStatusChange = statusChangeCallback;
  }

  /**
   * Start watching the stories directory for changes
   */
  public startWatching(): void {
    const storiesPath = path.join(this.projectRoot, STORIES_DIR);
    
    if (!fs.existsSync(storiesPath)) {
      console.warn(`Stories directory not found: ${storiesPath}`);
      return;
    }

    console.log(`Starting file watcher on: ${storiesPath}`);
    
    const watcher = fs.watch(storiesPath, { recursive: true }, (eventType, filename) => {
      if (!filename || !filename.endsWith('.story.md')) {
        return;
      }

      const filePath = path.join(storiesPath, filename);
      this.handleFileEvent(eventType, filename, filePath);
    });

    this.watchers.set(storiesPath, watcher);
  }

  /**
   * Stop watching all directories
   */
  public stopWatching(): void {
    for (const [path, watcher] of this.watchers) {
      watcher.close();
      console.log(`Stopped watching: ${path}`);
    }
    this.watchers.clear();
    
    // Clear any pending timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Handle file system events with debouncing
   */
  private handleFileEvent(eventType: fs.WatchEventType, filename: string, filePath: string): void {
    const event: FileWatchEvent = {
      eventType: eventType as 'change' | 'rename',
      filename,
      filePath,
      timestamp: new Date()
    };

    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.processFileChange(event);
      this.debounceTimers.delete(filePath);
    }, DEBOUNCE_DELAY);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Process a file change event after debouncing
   */
  private async processFileChange(event: FileWatchEvent): Promise<void> {
    try {
      if (event.eventType === 'change' && fs.existsSync(event.filePath)) {
        const storyData = await this.parseStoryFile(event.filePath);
        if (storyData) {
          const storyId = this.extractStoryId(event.filename);
          if (storyId && this.shouldTriggerVerification(storyData.status)) {
            console.log(`Story ${storyId} status changed to: ${storyData.status}`);
            this.onStatusChange?.(storyId, storyData.status, event.filePath);
          }
        }
      }
    } catch (error) {
      console.error('Error processing file change:', error);
    }
  }

  /**
   * Parse a story file to extract status and metadata
   */
  private async parseStoryFile(filePath: string): Promise<{ status: StoryStatus } | null> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const statusMatch = content.match(/^## Status:\s*(.+)$/m);
      
      if (statusMatch) {
        const status = statusMatch[1].trim() as StoryStatus;
        return { status };
      }
    } catch (error) {
      console.error(`Error reading story file ${filePath}:`, error);
    }
    
    return null;
  }

  /**
   * Extract story ID from filename (e.g., "1.2.story.md" -> "1.2")
   */
  private extractStoryId(filename: string): string | null {
    const match = filename.match(/^(\d+\.\d+)\.story\.md$/);
    return match ? match[1] : null;
  }

  /**
   * Determine if a status change should trigger verification
   */
  private shouldTriggerVerification(status: StoryStatus): boolean {
    return status === 'Done' || status === 'Ready for Review';
  }

  /**
   * Parse a complete story file with all sections
   */
  public async parseCompleteStoryFile(filePath: string): Promise<ParsedStoryFile | null> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // Extract basic metadata
      const titleMatch = content.match(/^# Story [\d.]+:\s*(.+)$/m);
      const statusMatch = content.match(/^## Status:\s*(.+)$/m);
      const storyMatch = content.match(/^## Story\n([\s\S]*?)(?=^## |$)/m);
      
      // Extract acceptance criteria
      const acMatch = content.match(/^## Acceptance Criteria\n([\s\S]*?)(?=^## |$)/m);
      const acceptanceCriteria: string[] = [];
      if (acMatch) {
        const acText = acMatch[1];
        const criteria = acText.match(/^\d+\.\s*(.+)$/gm);
        if (criteria) {
          acceptanceCriteria.push(...criteria.map(c => c.replace(/^\d+\.\s*/, '')));
        }
      }

      // Extract dev agent record
      const devRecordMatch = content.match(/^## Dev Agent Record\n([\s\S]*?)(?=^# |$)/m);
      let devAgentRecord: any = null;
      if (devRecordMatch) {
        // Parse change log table if it exists
        const changeLogMatch = devRecordMatch[1].match(/\| Date \| Change \| Author \|\n\|------|--------|--------\|\n((?:\|[^|]*\|[^|]*\|[^|]*\|\n?)*)/);
        const changeLog: any[] = [];
        if (changeLogMatch) {
          const rows = changeLogMatch[1].split('\n').filter(row => row.includes('|'));
          for (const row of rows) {
            const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
            if (cells.length >= 3 && cells[0] && cells[1] && cells[2]) {
              changeLog.push({
                date: cells[0],
                change: cells[1],
                author: cells[2]
              });
            }
          }
        }
        devAgentRecord = { changeLog };
      }

      const parsed: ParsedStoryFile = {
        frontmatter: {
          title: titleMatch?.[1] || '',
          status: (statusMatch?.[1]?.trim() as StoryStatus) || 'Draft',
          story: storyMatch?.[1]?.trim() || '',
          acceptanceCriteria
        },
        sections: {
          devAgentRecord
        },
        rawContent: content
      };

      return parsed;
    } catch (error) {
      console.error(`Error parsing complete story file ${filePath}:`, error);
      return null;
    }
  }
}