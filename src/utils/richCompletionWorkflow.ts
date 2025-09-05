/**
 * Rich completion workflow orchestration module
 * 
 * Provides a standardized workflow for completing tasks with rich documentation,
 * integrating completion templates, task updates, and verification in a single flow.
 */

import { z } from "zod";
import { 
  RichCompletionDetails,
  formatRichCompletion,
  extractImplementationNotes,
  validateRichCompletionDetails,
  TemplateOptions,
  FormattingOptions
} from "./completionTemplates.js";
import { updateTaskContent } from "../tools/task/updateTask.js";
import { verifyTask } from "../tools/task/verifyTask.js";
import { getTaskById } from "../models/taskModel.js";
import { TaskStatus } from "../types/index.js";

/**
 * Workflow configuration options
 */
export interface WorkflowOptions {
  /** Template options for formatting rich completion */
  templateOptions?: TemplateOptions;
  /** Formatting options for markdown output */
  formattingOptions?: FormattingOptions;
  /** Whether to auto-verify with a score of 100 */
  autoVerify?: boolean;
  /** Custom verification score (80-100) */
  verificationScore?: number;
  /** Whether to skip verification step entirely */
  skipVerification?: boolean;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  /** Whether the workflow completed successfully */
  success: boolean;
  /** Result message describing the outcome */
  message: string;
  /** Updated task ID */
  taskId?: string;
  /** Updated notes content if successful */
  updatedNotes?: string;
  /** Verification result if verification was performed */
  verificationResult?: {
    score: number;
    summary: string;
    completed: boolean;
  };
  /** Error details if workflow failed */
  error?: {
    stage: 'validation' | 'taskLookup' | 'update' | 'verification';
    details: string;
  };
}

/**
 * Main workflow function for completing tasks with rich documentation
 * Orchestrates the complete process: detail capture, notes update, and verification
 * 
 * @param taskId - The ID of the task to complete
 * @param completionDetails - Rich completion details to document
 * @param options - Optional workflow configuration
 * @returns Promise resolving to workflow execution result
 * 
 * @example
 * ```typescript
 * const result = await completeTaskWithRichDetails(
 *   'task-uuid-here',
 *   {
 *     accomplishments: ['Implemented API endpoint', 'Added validation'],
 *     solutionFeatures: ['RESTful design', 'Input sanitization'],
 *     technicalApproach: 'Used Express.js with middleware pattern',
 *     keyDecisions: 'Chose JWT for stateless authentication'
 *   },
 *   {
 *     autoVerify: true,
 *     templateOptions: { includeEmojis: true }
 *   }
 * );
 * ```
 */
export async function completeTaskWithRichDetails(
  taskId: string,
  completionDetails: RichCompletionDetails,
  options: WorkflowOptions = {}
): Promise<WorkflowResult> {
  const {
    templateOptions = {},
    formattingOptions = {},
    autoVerify = true,
    verificationScore = 100,
    skipVerification = false
  } = options;

  // Step 1: Validate completion details
  const validation = validateRichCompletionDetails(completionDetails);
  if (!validation.isValid) {
    return {
      success: false,
      message: `Invalid completion details: ${validation.errors.join(', ')}`,
      error: {
        stage: 'validation',
        details: validation.errors.join(', ')
      }
    };
  }

  // Step 2: Get current task to preserve existing notes
  let currentTask;
  try {
    currentTask = await getTaskById(taskId);
    if (!currentTask) {
      return {
        success: false,
        message: `Task with ID ${taskId} not found`,
        error: {
          stage: 'taskLookup',
          details: 'Task does not exist in the system'
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to retrieve task: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: {
        stage: 'taskLookup',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }

  // Step 3: Extract original implementation notes and format rich completion
  const originalNotes = extractImplementationNotes(currentTask.notes || '');
  const enhancedNotes = formatRichCompletion(
    originalNotes,
    completionDetails,
    {
      ...templateOptions,
      ...formattingOptions
    }
  );

  // Step 4: Update task with enhanced notes
  try {
    const updateResult = await updateTaskContent({
      taskId,
      notes: enhancedNotes
    });

    // Check if update was successful
    if (updateResult.isError) {
      return {
        success: false,
        message: 'Failed to update task notes with rich completion details',
        taskId,
        error: {
          stage: 'update',
          details: 'Task update operation failed'
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`,
      taskId,
      error: {
        stage: 'update',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }

  // Step 5: Optionally proceed with verification
  if (!skipVerification && currentTask.status === TaskStatus.IN_PROGRESS) {
    try {
      // Generate summary from completion details
      const verificationSummary = generateVerificationSummary(completionDetails);
      
      // Determine score
      const score = autoVerify ? verificationScore : 
                   (verificationScore >= 80 && verificationScore <= 100) ? verificationScore : 100;
      
      const verifyResult = await verifyTask({
        taskId,
        summary: verificationSummary,
        score
      });

      // Check if verification was successful
      const wasCompleted = score >= 80;
      
      return {
        success: true,
        message: wasCompleted ? 
          `Task successfully completed with rich documentation (score: ${score})` :
          `Task updated with rich documentation, needs further work (score: ${score})`,
        taskId,
        updatedNotes: enhancedNotes,
        verificationResult: {
          score,
          summary: verificationSummary,
          completed: wasCompleted
        }
      };
    } catch (error) {
      // Verification failed but notes were updated successfully
      return {
        success: true,
        message: 'Task notes updated with rich completion details, but verification failed',
        taskId,
        updatedNotes: enhancedNotes,
        error: {
          stage: 'verification',
          details: error instanceof Error ? error.message : 'Verification process failed'
        }
      };
    }
  }

  // Return success without verification
  return {
    success: true,
    message: 'Task notes successfully updated with rich completion details',
    taskId,
    updatedNotes: enhancedNotes
  };
}

/**
 * Generates a concise verification summary from rich completion details
 * 
 * @param details - Rich completion details to summarize
 * @returns A formatted summary string for verification
 */
function generateVerificationSummary(details: RichCompletionDetails): string {
  const mainAccomplishment = details.accomplishments[0] || 'Completed task implementation';
  const featureCount = details.solutionFeatures.length;
  const approach = details.technicalApproach.split('.')[0]; // First sentence
  
  return `${mainAccomplishment}. Delivered ${featureCount} key features using ${approach}. ${details.keyDecisions}`;
}

/**
 * Batch workflow for completing multiple tasks with rich details
 * Processes multiple tasks sequentially with error handling
 * 
 * @param taskCompletions - Array of task IDs and their completion details
 * @param options - Shared workflow options for all tasks
 * @returns Promise resolving to array of workflow results
 */
export async function batchCompleteTasksWithRichDetails(
  taskCompletions: Array<{
    taskId: string;
    completionDetails: RichCompletionDetails;
  }>,
  options: WorkflowOptions = {}
): Promise<WorkflowResult[]> {
  const results: WorkflowResult[] = [];

  for (const { taskId, completionDetails } of taskCompletions) {
    try {
      const result = await completeTaskWithRichDetails(
        taskId,
        completionDetails,
        options
      );
      results.push(result);
    } catch (error) {
      // Capture any unexpected errors
      results.push({
        success: false,
        message: `Unexpected error processing task ${taskId}`,
        taskId,
        error: {
          stage: 'validation',
          details: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      });
    }
  }

  return results;
}

/**
 * Creates a completion details object with partial information
 * Useful when some completion aspects are not yet available
 * 
 * @param partial - Partial completion details
 * @returns Complete RichCompletionDetails with defaults for missing fields
 */
export function createPartialCompletionDetails(
  partial: Partial<RichCompletionDetails>
): RichCompletionDetails {
  return {
    accomplishments: partial.accomplishments || ['Task implementation completed'],
    solutionFeatures: partial.solutionFeatures || ['Core functionality delivered'],
    technicalApproach: partial.technicalApproach || 'Implemented using project standards and best practices',
    keyDecisions: partial.keyDecisions || 'Followed existing patterns for consistency'
  };
}

/**
 * Validates if a task is eligible for rich completion workflow
 * 
 * @param taskId - The ID of the task to check
 * @returns Promise resolving to eligibility status and reason
 */
export async function validateTaskEligibility(
  taskId: string
): Promise<{ eligible: boolean; reason?: string }> {
  try {
    const task = await getTaskById(taskId);
    
    if (!task) {
      return { 
        eligible: false, 
        reason: 'Task not found' 
      };
    }
    
    if (task.status === TaskStatus.COMPLETED) {
      return { 
        eligible: false, 
        reason: 'Task is already completed' 
      };
    }
    
    if (task.status !== TaskStatus.IN_PROGRESS) {
      return { 
        eligible: false, 
        reason: 'Task must be in progress to complete' 
      };
    }
    
    return { eligible: true };
  } catch (error) {
    return { 
      eligible: false, 
      reason: `Error checking task: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}