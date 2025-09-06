import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { migrateCompletionDetails } from './addCompletionDetails';

// Mock fs module
vi.mock('fs/promises');

describe('addCompletionDetails migration', () => {
  const mockTasksData = {
    tasks: [
      {
        id: 'task-1',
        name: 'Completed task with summary',
        status: 'completed',
        summary: `
## Key Accomplishments
- Built authentication system
- Added user management
- Created API endpoints

## Implementation Details
- Used JWT tokens
- PostgreSQL database
- RESTful design

## Technical Challenges
- Resolved CORS issues
- Fixed memory leaks
        `,
        completedAt: new Date('2024-01-15')
      },
      {
        id: 'task-2',
        name: 'Completed task without summary',
        status: 'completed',
        summary: ''
      },
      {
        id: 'task-3',
        name: 'Pending task',
        status: 'pending',
        summary: 'Should not be processed'
      },
      {
        id: 'task-4',
        name: 'Already migrated task',
        status: 'completed',
        summary: 'Has summary',
        completionDetails: {
          keyAccomplishments: ['Already migrated'],
          implementationDetails: [],
          technicalChallenges: [],
          completedAt: new Date('2024-01-10'),
          verificationScore: 95
        }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockTasksData));
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should migrate tasks with summaries in live mode', async () => {
    const stats = await migrateCompletionDetails({
      tasksFilePath: 'test-tasks.json',
      dryRun: false,
      verbose: false,
      createBackup: true
    });

    // Check statistics
    expect(stats.totalTasks).toBe(4);
    expect(stats.completedTasks).toBe(3);
    expect(stats.tasksWithSummary).toBe(2);
    expect(stats.tasksMigrated).toBe(1); // Only task-1 should be migrated
    expect(stats.tasksSkipped).toBe(2); // task-2 (no summary) and task-4 (already has completionDetails)
    expect(stats.tasksWithErrors).toBe(0);

    // Verify backup was created
    expect(fs.writeFile).toHaveBeenCalledTimes(2); // Once for backup, once for migrated data

    // Verify the migrated data was written
    const writeCall = vi.mocked(fs.writeFile).mock.calls[1];
    const writtenData = JSON.parse(writeCall[1] as string);
    
    // Check task-1 was migrated
    const task1 = writtenData.tasks.find((t: any) => t.id === 'task-1');
    expect(task1.completionDetails).toBeDefined();
    expect(task1.completionDetails.keyAccomplishments).toContain('Built authentication system');
    expect(task1.completionDetails.implementationDetails).toContain('Used JWT tokens');
    expect(task1.completionDetails.technicalChallenges).toContain('Resolved CORS issues');
    expect(task1.summary).toBeDefined(); // Original summary preserved
    
    // Check task-4 was not modified
    const task4 = writtenData.tasks.find((t: any) => t.id === 'task-4');
    expect(task4.completionDetails.keyAccomplishments).toContain('Already migrated');
  });

  it('should not write files in dry-run mode', async () => {
    const stats = await migrateCompletionDetails({
      tasksFilePath: 'test-tasks.json',
      dryRun: true,
      verbose: false,
      createBackup: true
    });

    // Check statistics
    expect(stats.tasksMigrated).toBe(1);
    
    // Verify no files were written
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should handle tasks without summaries gracefully', async () => {
    const tasksWithoutSummaries = {
      tasks: [
        {
          id: 'task-1',
          name: 'Task without summary',
          status: 'completed'
        },
        {
          id: 'task-2',
          name: 'Task with empty summary',
          status: 'completed',
          summary: ''
        },
        {
          id: 'task-3',
          name: 'Task with whitespace summary',
          status: 'completed',
          summary: '   \n   \t   '
        }
      ]
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(tasksWithoutSummaries));

    const stats = await migrateCompletionDetails({
      tasksFilePath: 'test-tasks.json',
      dryRun: true,
      verbose: false
    });

    expect(stats.totalTasks).toBe(3);
    expect(stats.completedTasks).toBe(3);
    expect(stats.tasksMigrated).toBe(0);
    expect(stats.tasksSkipped).toBe(3);
  });

  it('should be idempotent - running twice should not duplicate data', async () => {
    // First run
    await migrateCompletionDetails({
      tasksFilePath: 'test-tasks.json',
      dryRun: false,
      verbose: false,
      createBackup: false
    });

    // Get the migrated data from first run
    const firstWriteCall = vi.mocked(fs.writeFile).mock.calls[0];
    const migratedData = firstWriteCall[1] as string;

    // Setup for second run with migrated data
    vi.mocked(fs.readFile).mockResolvedValue(migratedData);
    vi.clearAllMocks();

    // Second run
    const stats = await migrateCompletionDetails({
      tasksFilePath: 'test-tasks.json',
      dryRun: false,
      verbose: false,
      createBackup: false
    });

    // Should skip all tasks since they already have completionDetails
    expect(stats.tasksMigrated).toBe(0);
    expect(stats.tasksSkipped).toBe(3); // All completed tasks should be skipped
  });

  it('should handle file read errors gracefully', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

    await expect(migrateCompletionDetails({
      tasksFilePath: 'non-existent.json',
      dryRun: false,
      verbose: false
    })).rejects.toThrow('File not found');
  });

  it('should handle parsing errors for individual tasks gracefully', async () => {
    const tasksWithBadSummary = {
      tasks: [
        {
          id: 'task-1',
          name: 'Task with unparseable summary',
          status: 'completed',
          summary: {} // Invalid summary type
        }
      ]
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(tasksWithBadSummary));

    const stats = await migrateCompletionDetails({
      tasksFilePath: 'test-tasks.json',
      dryRun: true,
      verbose: false
    });

    // Should handle the error gracefully
    expect(stats.tasksWithErrors).toBe(0); // Parser should handle non-string gracefully
    expect(stats.tasksSkipped).toBe(1);
  });

  it('should extract verification scores from summaries', async () => {
    const tasksWithScores = {
      tasks: [
        {
          id: 'task-1',
          name: 'Task with score',
          status: 'completed',
          summary: `
## Accomplishments
- Completed successfully

Verification Score: 95
          `
        }
      ]
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(tasksWithScores));

    await migrateCompletionDetails({
      tasksFilePath: 'test-tasks.json',
      dryRun: false,
      verbose: false,
      createBackup: false
    });

    const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1] as string);
    const task = writtenData.tasks[0];
    
    expect(task.completionDetails.verificationScore).toBe(95);
  });

  it('should create timestamped backups', async () => {
    const mockDate = new Date('2024-01-15T10:30:00.000Z');
    vi.setSystemTime(mockDate);

    await migrateCompletionDetails({
      tasksFilePath: '/path/to/tasks.json',
      dryRun: false,
      verbose: false,
      createBackup: true
    });

    // Check backup was created with timestamp
    const backupCall = vi.mocked(fs.writeFile).mock.calls[0];
    const backupPath = backupCall[0] as string;
    
    expect(backupPath).toContain('tasks.backup.');
    expect(backupPath).toContain('2024-01-15T10-30-00-000Z');
  });

  it('should handle array format tasks files', async () => {
    const arrayFormatTasks = [
      {
        id: 'task-1',
        name: 'Task in array format',
        status: 'completed',
        summary: '## Accomplishments\n- Done'
      }
    ];

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(arrayFormatTasks));

    const stats = await migrateCompletionDetails({
      tasksFilePath: 'test-tasks.json',
      dryRun: false,
      verbose: false,
      createBackup: false
    });

    expect(stats.totalTasks).toBe(1);
    expect(stats.tasksMigrated).toBe(1);

    // Verify it writes back in the expected format
    const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1] as string);
    expect(writtenData.tasks).toBeDefined();
    expect(Array.isArray(writtenData.tasks)).toBe(true);
  });
});