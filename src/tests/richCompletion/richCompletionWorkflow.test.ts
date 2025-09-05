import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import {
  completeTaskWithRichDetails,
  batchCompleteTasksWithRichDetails,
  createPartialCompletionDetails,
  validateTaskEligibility,
  WorkflowOptions,
  WorkflowResult
} from '../../utils/richCompletionWorkflow.js';
import { RichCompletionDetails } from '../../utils/completionTemplates.js';
import { TaskStatus } from '../../types/index.js';

// Mock dependencies
vi.mock('../../models/taskModel.js', () => ({
  getTaskById: vi.fn()
}));

vi.mock('../../tools/task/updateTask.js', () => ({
  updateTaskContent: vi.fn()
}));

vi.mock('../../tools/task/verifyTask.js', () => ({
  verifyTask: vi.fn()
}));

vi.mock('../../utils/completionTemplates.js', async () => {
  const actual = await vi.importActual('../../utils/completionTemplates.js');
  return {
    ...actual,
    formatRichCompletion: vi.fn(),
    extractImplementationNotes: vi.fn()
  };
});

describe('richCompletionWorkflow', () => {
  let mockGetTaskById: Mock;
  let mockUpdateTaskContent: Mock;
  let mockVerifyTask: Mock;
  let mockFormatRichCompletion: Mock;
  let mockExtractImplementationNotes: Mock;

  let validCompletionDetails: RichCompletionDetails;
  let mockTask: any;

  beforeEach(async () => {
    // Get mocked functions
    const taskModel = await import('../../models/taskModel.js');
    const updateTask = await import('../../tools/task/updateTask.js');
    const verifyTaskModule = await import('../../tools/task/verifyTask.js');
    const templates = await import('../../utils/completionTemplates.js');

    mockGetTaskById = taskModel.getTaskById as Mock;
    mockUpdateTaskContent = updateTask.updateTaskContent as Mock;
    mockVerifyTask = verifyTaskModule.verifyTask as Mock;
    mockFormatRichCompletion = templates.formatRichCompletion as Mock;
    mockExtractImplementationNotes = templates.extractImplementationNotes as Mock;

    // Setup default mock responses
    validCompletionDetails = {
      accomplishments: ['Task completed successfully', 'All tests passing'],
      solutionFeatures: ['Feature A implemented', 'Feature B integrated'],
      technicalApproach: 'Used TDD approach with comprehensive testing',
      keyDecisions: 'Chose TypeScript for type safety'
    };

    mockTask = {
      id: 'test-task-123',
      name: 'Test Task',
      description: 'Test task description',
      status: TaskStatus.IN_PROGRESS,
      notes: 'Original implementation notes',
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Configure default mock behaviors
    mockGetTaskById.mockResolvedValue(mockTask);
    mockExtractImplementationNotes.mockReturnValue('Original implementation notes');
    mockFormatRichCompletion.mockReturnValue('## Enhanced Notes\nFormatted content here');
    mockUpdateTaskContent.mockResolvedValue({
      isError: false,
      content: [{ type: 'text', text: 'Task updated successfully' }]
    });
    mockVerifyTask.mockResolvedValue({
      content: [{ type: 'text', text: 'Task verified successfully' }]
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('completeTaskWithRichDetails', () => {
    it('should complete workflow successfully with default options', async () => {
      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully completed');
      expect(result.taskId).toBe('test-task-123');
      expect(result.updatedNotes).toBeDefined();
      expect(result.verificationResult).toBeDefined();
      expect(result.verificationResult?.score).toBe(100);
      expect(result.verificationResult?.completed).toBe(true);
    });

    it('should validate completion details', async () => {
      const invalidDetails: RichCompletionDetails = {
        accomplishments: [], // Invalid: empty array
        solutionFeatures: ['Feature'],
        technicalApproach: 'Approach',
        keyDecisions: 'Decisions'
      };

      const result = await completeTaskWithRichDetails(
        'test-task-123',
        invalidDetails
      );

      expect(result.success).toBe(false);
      expect(result.error?.stage).toBe('validation');
      expect(result.message).toContain('Invalid completion details');
    });

    it('should handle task not found', async () => {
      mockGetTaskById.mockResolvedValue(null);

      const result = await completeTaskWithRichDetails(
        'non-existent-task',
        validCompletionDetails
      );

      expect(result.success).toBe(false);
      expect(result.error?.stage).toBe('taskLookup');
      expect(result.message).toContain('not found');
    });

    it('should handle task lookup error', async () => {
      mockGetTaskById.mockRejectedValue(new Error('Database connection failed'));

      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails
      );

      expect(result.success).toBe(false);
      expect(result.error?.stage).toBe('taskLookup');
      expect(result.error?.details).toContain('Database connection failed');
    });

    it('should preserve original implementation notes', async () => {
      await completeTaskWithRichDetails('test-task-123', validCompletionDetails);

      expect(mockExtractImplementationNotes).toHaveBeenCalledWith('Original implementation notes');
      expect(mockFormatRichCompletion).toHaveBeenCalledWith(
        'Original implementation notes',
        validCompletionDetails,
        expect.any(Object)
      );
    });

    it('should handle empty original notes', async () => {
      mockTask.notes = null;
      mockExtractImplementationNotes.mockReturnValue('');

      await completeTaskWithRichDetails('test-task-123', validCompletionDetails);

      // The workflow passes empty string when notes is null/undefined
      expect(mockExtractImplementationNotes).toHaveBeenCalledWith('');
      expect(mockFormatRichCompletion).toHaveBeenCalledWith(
        '',
        validCompletionDetails,
        expect.any(Object)
      );
    });

    it('should handle update task failure', async () => {
      mockUpdateTaskContent.mockResolvedValue({
        isError: true,
        content: [{ type: 'text', text: 'Update failed' }]
      });

      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails
      );

      expect(result.success).toBe(false);
      expect(result.error?.stage).toBe('update');
      expect(result.message).toContain('Failed to update task notes');
    });

    it('should handle update task exception', async () => {
      mockUpdateTaskContent.mockRejectedValue(new Error('Network error'));

      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails
      );

      expect(result.success).toBe(false);
      expect(result.error?.stage).toBe('update');
      expect(result.error?.details).toContain('Network error');
    });

    it('should skip verification when option set', async () => {
      const options: WorkflowOptions = {
        skipVerification: true
      };

      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails,
        options
      );

      expect(result.success).toBe(true);
      expect(result.verificationResult).toBeUndefined();
      expect(mockVerifyTask).not.toHaveBeenCalled();
      expect(result.message).toContain('successfully updated');
    });

    it('should skip verification for non-in-progress tasks', async () => {
      mockTask.status = TaskStatus.PENDING;

      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails
      );

      expect(result.success).toBe(true);
      expect(result.verificationResult).toBeUndefined();
      expect(mockVerifyTask).not.toHaveBeenCalled();
    });

    it('should use custom verification score', async () => {
      const options: WorkflowOptions = {
        autoVerify: false,
        verificationScore: 85
      };

      await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails,
        options
      );

      expect(mockVerifyTask).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 85
        })
      );
    });

    it('should handle scores below 80', async () => {
      const options: WorkflowOptions = {
        verificationScore: 75
      };

      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails,
        options
      );

      // Score below 80 is still allowed but won't complete the task
      expect(mockVerifyTask).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 75
        })
      );
    });

    it('should handle verification failure gracefully', async () => {
      mockVerifyTask.mockRejectedValue(new Error('Verification service down'));

      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails
      );

      // Should still be successful since notes were updated
      expect(result.success).toBe(true);
      expect(result.message).toContain('notes updated');
      expect(result.message).toContain('verification failed');
      expect(result.error?.stage).toBe('verification');
      expect(result.updatedNotes).toBeDefined();
    });

    it('should pass template options correctly', async () => {
      const options: WorkflowOptions = {
        templateOptions: {
          includeEmojis: false,
          taskType: 'backend'
        },
        formattingOptions: {
          bulletStyle: '-',
          includeSeparator: false
        }
      };

      await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails,
        options
      );

      expect(mockFormatRichCompletion).toHaveBeenCalledWith(
        expect.any(String),
        validCompletionDetails,
        expect.objectContaining({
          includeEmojis: false,
          taskType: 'backend',
          bulletStyle: '-',
          includeSeparator: false
        })
      );
    });

    it('should generate appropriate verification summary', async () => {
      await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails
      );

      expect(mockVerifyTask).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.stringContaining('Task completed successfully')
        })
      );
    });
  });

  describe('batchCompleteTasksWithRichDetails', () => {
    it('should process multiple tasks sequentially', async () => {
      const taskCompletions = [
        {
          taskId: 'task-1',
          completionDetails: validCompletionDetails
        },
        {
          taskId: 'task-2',
          completionDetails: {
            ...validCompletionDetails,
            accomplishments: ['Different accomplishment']
          }
        }
      ];

      const results = await batchCompleteTasksWithRichDetails(taskCompletions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].taskId).toBe('task-1');
      expect(results[1].success).toBe(true);
      expect(results[1].taskId).toBe('task-2');
      expect(mockUpdateTaskContent).toHaveBeenCalledTimes(2);
    });

    it('should handle failures in batch without stopping', async () => {
      mockGetTaskById
        .mockResolvedValueOnce(mockTask) // First task succeeds
        .mockResolvedValueOnce(null); // Second task fails (not found)

      const taskCompletions = [
        {
          taskId: 'task-1',
          completionDetails: validCompletionDetails
        },
        {
          taskId: 'task-2',
          completionDetails: validCompletionDetails
        }
      ];

      const results = await batchCompleteTasksWithRichDetails(taskCompletions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error?.stage).toBe('taskLookup');
    });

    it('should apply shared options to all tasks', async () => {
      const options: WorkflowOptions = {
        skipVerification: true,
        templateOptions: {
          includeEmojis: false
        }
      };

      const taskCompletions = [
        {
          taskId: 'task-1',
          completionDetails: validCompletionDetails
        }
      ];

      await batchCompleteTasksWithRichDetails(taskCompletions, options);

      expect(mockVerifyTask).not.toHaveBeenCalled();
      expect(mockFormatRichCompletion).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          includeEmojis: false
        })
      );
    });

    it('should handle unexpected errors in batch', async () => {
      // Make the mock throw an unexpected error
      mockGetTaskById.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const taskCompletions = [
        {
          taskId: 'task-1',
          completionDetails: validCompletionDetails
        }
      ];

      const results = await batchCompleteTasksWithRichDetails(taskCompletions);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].message).toContain('Unexpected error');
      expect(results[0].error?.details).toContain('Unexpected error');
    });
  });

  describe('createPartialCompletionDetails', () => {
    it('should create complete details from partial input', () => {
      const partial = {
        accomplishments: ['Custom accomplishment']
      };

      const complete = createPartialCompletionDetails(partial);

      expect(complete.accomplishments).toEqual(['Custom accomplishment']);
      expect(complete.solutionFeatures).toEqual(['Core functionality delivered']);
      expect(complete.technicalApproach).toBe('Implemented using project standards and best practices');
      expect(complete.keyDecisions).toBe('Followed existing patterns for consistency');
    });

    it('should provide all defaults when empty object provided', () => {
      const complete = createPartialCompletionDetails({});

      expect(complete.accomplishments).toEqual(['Task implementation completed']);
      expect(complete.solutionFeatures).toEqual(['Core functionality delivered']);
      expect(complete.technicalApproach).toBeDefined();
      expect(complete.keyDecisions).toBeDefined();
    });

    it('should override only provided fields', () => {
      const partial = {
        technicalApproach: 'Custom approach',
        keyDecisions: 'Custom decisions'
      };

      const complete = createPartialCompletionDetails(partial);

      expect(complete.accomplishments).toEqual(['Task implementation completed']);
      expect(complete.solutionFeatures).toEqual(['Core functionality delivered']);
      expect(complete.technicalApproach).toBe('Custom approach');
      expect(complete.keyDecisions).toBe('Custom decisions');
    });
  });

  describe('validateTaskEligibility', () => {
    it('should validate eligible in-progress task', async () => {
      mockTask.status = TaskStatus.IN_PROGRESS;
      mockGetTaskById.mockResolvedValue(mockTask);

      const result = await validateTaskEligibility('test-task-123');

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject non-existent task', async () => {
      mockGetTaskById.mockResolvedValue(null);

      const result = await validateTaskEligibility('non-existent');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Task not found');
    });

    it('should reject completed task', async () => {
      mockTask.status = TaskStatus.COMPLETED;
      mockGetTaskById.mockResolvedValue(mockTask);

      const result = await validateTaskEligibility('test-task-123');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Task is already completed');
    });

    it('should reject pending task', async () => {
      mockTask.status = TaskStatus.PENDING;
      mockGetTaskById.mockResolvedValue(mockTask);

      const result = await validateTaskEligibility('test-task-123');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Task must be in progress to complete');
    });

    it('should handle database errors', async () => {
      mockGetTaskById.mockRejectedValue(new Error('DB connection lost'));

      const result = await validateTaskEligibility('test-task-123');

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('DB connection lost');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete end-to-end workflow', async () => {
      // Simulate a complete workflow
      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails,
        {
          templateOptions: {
            includeEmojis: true,
            taskType: 'backend'
          },
          formattingOptions: {
            bulletStyle: '-'
          },
          autoVerify: true,
          verificationScore: 100
        }
      );

      // Verify all stages were called
      expect(mockGetTaskById).toHaveBeenCalled();
      expect(mockExtractImplementationNotes).toHaveBeenCalled();
      expect(mockFormatRichCompletion).toHaveBeenCalled();
      expect(mockUpdateTaskContent).toHaveBeenCalled();
      expect(mockVerifyTask).toHaveBeenCalled();

      expect(result.success).toBe(true);
      expect(result.verificationResult?.completed).toBe(true);
    });

    it('should handle workflow with verification disabled', async () => {
      mockTask.status = TaskStatus.PENDING; // Not in progress

      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails
      );

      expect(mockUpdateTaskContent).toHaveBeenCalled();
      expect(mockVerifyTask).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.verificationResult).toBeUndefined();
    });

    it('should handle partial success (update ok, verify fails)', async () => {
      mockVerifyTask.mockRejectedValue(new Error('Verify service down'));

      const result = await completeTaskWithRichDetails(
        'test-task-123',
        validCompletionDetails
      );

      expect(result.success).toBe(true);
      expect(result.updatedNotes).toBeDefined();
      expect(result.error?.stage).toBe('verification');
    });
  });
});