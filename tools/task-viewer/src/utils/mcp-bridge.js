/**
 * MCP Bridge Integration Module
 * 
 * This module provides an interface to Shrimp Task Manager MCP tools.
 * Currently implements mock functionality that will be replaced with actual
 * server-side MCP integration when ready.
 * 
 * MCP Tools Available:
 * - mcp__shrimp-task-manager__plan_task
 * - mcp__shrimp-task-manager__analyze_task
 * - mcp__shrimp-task-manager__split_tasks
 * - mcp__shrimp-task-manager__create_archive
 * - mcp__shrimp-task-manager__clear_all_tasks
 */

// Configuration
const MCP_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Utility function to delay execution
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility function for retry logic with exponential backoff
 */
const withRetry = async (fn, maxRetries = MAX_RETRIES) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      
      if (isLastAttempt) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      console.warn(`Attempt ${i + 1} failed, retrying in ${RETRY_DELAY * (i + 1)}ms:`, error.message);
      await delay(RETRY_DELAY * (i + 1)); // Exponential backoff
    }
  }
};

/**
 * Make MCP tool call with timeout and error handling
 */
const makeMCPCall = async (toolName, parameters) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`MCP call timeout after ${MCP_TIMEOUT}ms`)), MCP_TIMEOUT);
  });
  
  const callPromise = callMCPTool(toolName, parameters);
  
  try {
    return await Promise.race([callPromise, timeoutPromise]);
  } catch (error) {
    console.error(`MCP call failed for ${toolName}:`, error);
    throw error;
  }
};

/**
 * Core MCP tool calling function
 * Currently implements mock behavior - will be replaced with actual MCP integration
 */
const callMCPTool = async (toolName, parameters) => {
  console.log(`[MCP Bridge] Calling tool: ${toolName}`, parameters);
  
  // Mock implementation for development
  // TODO: Replace with actual server-side MCP integration
  
  switch (toolName) {
    case 'mcp__shrimp-task-manager__plan_task':
      return mockPlanTask(parameters);
      
    case 'mcp__shrimp-task-manager__analyze_task':
      return mockAnalyzeTask(parameters);
      
    case 'mcp__shrimp-task-manager__split_tasks':
      return mockSplitTasks(parameters);
      
    case 'mcp__shrimp-task-manager__create_archive':
      return mockCreateArchive(parameters);
      
    case 'mcp__shrimp-task-manager__clear_all_tasks':
      return mockClearAllTasks(parameters);
      
    default:
      throw new Error(`Unknown MCP tool: ${toolName}`);
  }
};

/**
 * Mock implementations for development
 * These will be removed when actual MCP integration is ready
 */

const mockPlanTask = async (parameters) => {
  const { storyContent, storyId } = parameters;
  
  // Simulate processing time
  await delay(1000 + Math.random() * 2000);
  
  return {
    success: true,
    planId: `plan_${storyId}_${Date.now()}`,
    plan: {
      title: `Task Plan for Story ${storyId}`,
      description: "Generated task plan based on story content",
      estimatedTasks: Math.floor(3 + Math.random() * 7), // 3-10 tasks
      complexity: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
      dependencies: []
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      tool: 'mcp__shrimp-task-manager__plan_task'
    }
  };
};

const mockAnalyzeTask = async (parameters) => {
  const { taskContent, taskId } = parameters;
  
  await delay(800 + Math.random() * 1200);
  
  return {
    success: true,
    analysisId: `analysis_${taskId}_${Date.now()}`,
    analysis: {
      complexity: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
      estimatedTime: `${Math.floor(1 + Math.random() * 8)} hours`,
      requiredSkills: ["JavaScript", "React", "Node.js"].slice(0, 1 + Math.floor(Math.random() * 3)),
      risks: Math.random() > 0.7 ? ["Potential integration complexity"] : [],
      suggestions: ["Consider breaking down into smaller subtasks", "Add unit tests"]
    },
    metadata: {
      analyzedAt: new Date().toISOString(),
      tool: 'mcp__shrimp-task-manager__analyze_task'
    }
  };
};

const mockSplitTasks = async (parameters) => {
  const { planId, targetCount } = parameters;
  
  await delay(1500 + Math.random() * 2500);
  
  const taskCount = targetCount || Math.floor(3 + Math.random() * 7);
  const tasks = [];
  
  for (let i = 1; i <= taskCount; i++) {
    tasks.push({
      id: `task_${planId}_${i}`,
      title: `Task ${i}: Implementation Step`,
      description: `Detailed implementation step ${i} of ${taskCount}`,
      status: "pending",
      priority: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
      estimatedHours: Math.floor(1 + Math.random() * 6),
      dependencies: i > 1 ? [`task_${planId}_${i-1}`] : []
    });
  }
  
  return {
    success: true,
    splitId: `split_${planId}_${Date.now()}`,
    tasks,
    metadata: {
      originalPlanId: planId,
      taskCount,
      splitAt: new Date().toISOString(),
      tool: 'mcp__shrimp-task-manager__split_tasks'
    }
  };
};

const mockCreateArchive = async (parameters) => {
  const { storyId, tasks = [] } = parameters;
  
  await delay(500 + Math.random() * 1000);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveId = `archive_${storyId}_${timestamp}`;
  
  return {
    success: true,
    archiveId,
    archive: {
      storyId,
      taskCount: tasks.length,
      archivedAt: new Date().toISOString(),
      tasks: tasks.map(task => ({
        ...task,
        archivedAt: new Date().toISOString()
      }))
    },
    metadata: {
      archiveLocation: `/archives/${archiveId}.json`,
      tool: 'mcp__shrimp-task-manager__create_archive'
    }
  };
};

const mockClearAllTasks = async (parameters) => {
  const { confirm = false } = parameters;
  
  if (!confirm) {
    return {
      success: false,
      error: "Confirmation required to clear all tasks",
      requiresConfirmation: true
    };
  }
  
  await delay(300 + Math.random() * 700);
  
  return {
    success: true,
    clearedAt: new Date().toISOString(),
    message: "All tasks have been cleared successfully",
    metadata: {
      tool: 'mcp__shrimp-task-manager__clear_all_tasks'
    }
  };
};

/**
 * Main API Functions
 */

/**
 * Create tasks from a story using MCP tools
 * Orchestrates planning, analysis, and task splitting
 */
export const createTasksFromStory = async (storyId, storyContent = null, options = {}) => {
  const {
    targetTaskCount = null,
    clearExisting = false,
    archiveFirst = false
  } = options;
  
  try {
    console.log(`[MCP Bridge] Creating tasks from story ${storyId}`);
    
    // Step 1: Plan the task
    const planResult = await withRetry(() => makeMCPCall('mcp__shrimp-task-manager__plan_task', {
      storyId,
      storyContent: storyContent || `Story content for ${storyId}`,
      options: {
        targetTaskCount,
        includeAnalysis: true
      }
    }));
    
    if (!planResult.success) {
      throw new Error(`Task planning failed: ${planResult.error}`);
    }
    
    console.log(`[MCP Bridge] Task planning completed:`, planResult.planId);
    
    // Step 2: Analyze the plan
    const analysisResult = await withRetry(() => makeMCPCall('mcp__shrimp-task-manager__analyze_task', {
      taskContent: JSON.stringify(planResult.plan),
      taskId: planResult.planId,
      analysisType: 'plan'
    }));
    
    if (!analysisResult.success) {
      console.warn(`[MCP Bridge] Task analysis failed, proceeding without analysis:`, analysisResult.error);
    } else {
      console.log(`[MCP Bridge] Task analysis completed:`, analysisResult.analysisId);
    }
    
    // Step 3: Split into individual tasks
    const splitResult = await withRetry(() => makeMCPCall('mcp__shrimp-task-manager__split_tasks', {
      planId: planResult.planId,
      targetCount: targetTaskCount || planResult.plan.estimatedTasks,
      analysis: analysisResult.success ? analysisResult.analysis : null
    }));
    
    if (!splitResult.success) {
      throw new Error(`Task splitting failed: ${splitResult.error}`);
    }
    
    console.log(`[MCP Bridge] Task splitting completed: ${splitResult.tasks.length} tasks created`);
    
    return {
      success: true,
      storyId,
      tasks: splitResult.tasks,
      plan: planResult.plan,
      analysis: analysisResult.success ? analysisResult.analysis : null,
      metadata: {
        planId: planResult.planId,
        analysisId: analysisResult.success ? analysisResult.analysisId : null,
        splitId: splitResult.splitId,
        createdAt: new Date().toISOString(),
        options
      }
    };
    
  } catch (error) {
    console.error(`[MCP Bridge] Failed to create tasks from story ${storyId}:`, error);
    return {
      success: false,
      storyId,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Archive tasks for a specific story
 */
export const archiveTasks = async (storyId, tasks = []) => {
  try {
    console.log(`[MCP Bridge] Archiving tasks for story ${storyId}`);
    
    const archiveResult = await withRetry(() => makeMCPCall('mcp__shrimp-task-manager__create_archive', {
      storyId,
      tasks,
      timestamp: new Date().toISOString()
    }));
    
    if (!archiveResult.success) {
      throw new Error(`Archive creation failed: ${archiveResult.error}`);
    }
    
    console.log(`[MCP Bridge] Tasks archived successfully:`, archiveResult.archiveId);
    
    return {
      success: true,
      storyId,
      archiveId: archiveResult.archiveId,
      archive: archiveResult.archive,
      metadata: archiveResult.metadata
    };
    
  } catch (error) {
    console.error(`[MCP Bridge] Failed to archive tasks for story ${storyId}:`, error);
    return {
      success: false,
      storyId,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Clear all tasks with confirmation
 */
export const clearAllTasks = async (confirm = false) => {
  try {
    console.log(`[MCP Bridge] Clearing all tasks (confirm: ${confirm})`);
    
    const clearResult = await withRetry(() => makeMCPCall('mcp__shrimp-task-manager__clear_all_tasks', {
      confirm
    }));
    
    if (!clearResult.success) {
      if (clearResult.requiresConfirmation) {
        return {
          success: false,
          requiresConfirmation: true,
          message: "Please confirm that you want to clear all tasks. This action cannot be undone."
        };
      }
      throw new Error(`Clear operation failed: ${clearResult.error}`);
    }
    
    console.log(`[MCP Bridge] All tasks cleared successfully`);
    
    return {
      success: true,
      clearedAt: clearResult.clearedAt,
      message: clearResult.message,
      metadata: clearResult.metadata
    };
    
  } catch (error) {
    console.error(`[MCP Bridge] Failed to clear all tasks:`, error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Utility functions for direct MCP tool access
 */

/**
 * Plan a task using MCP tools
 */
export const planTask = async (storyId, storyContent, options = {}) => {
  try {
    const result = await withRetry(() => makeMCPCall('mcp__shrimp-task-manager__plan_task', {
      storyId,
      storyContent,
      options
    }));
    
    return result;
  } catch (error) {
    console.error(`[MCP Bridge] Task planning failed:`, error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Analyze a task using MCP tools
 */
export const analyzeTask = async (taskId, taskContent, analysisType = 'task') => {
  try {
    const result = await withRetry(() => makeMCPCall('mcp__shrimp-task-manager__analyze_task', {
      taskId,
      taskContent,
      analysisType
    }));
    
    return result;
  } catch (error) {
    console.error(`[MCP Bridge] Task analysis failed:`, error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Split tasks using MCP tools
 */
export const splitTasks = async (planId, targetCount, analysis = null) => {
  try {
    const result = await withRetry(() => makeMCPCall('mcp__shrimp-task-manager__split_tasks', {
      planId,
      targetCount,
      analysis
    }));
    
    return result;
  } catch (error) {
    console.error(`[MCP Bridge] Task splitting failed:`, error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Check MCP connection status
 */
export const checkMCPConnection = async () => {
  try {
    // Simple health check - try to call a lightweight MCP operation
    const result = await makeMCPCall('mcp__shrimp-task-manager__plan_task', {
      storyId: 'health_check',
      storyContent: 'Health check',
      options: { dryRun: true }
    });
    
    return {
      connected: true,
      timestamp: new Date().toISOString(),
      version: result.metadata?.version || 'unknown'
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get MCP bridge configuration and status
 */
export const getMCPBridgeStatus = () => {
  return {
    timeout: MCP_TIMEOUT,
    maxRetries: MAX_RETRIES,
    retryDelay: RETRY_DELAY,
    availableTools: [
      'mcp__shrimp-task-manager__plan_task',
      'mcp__shrimp-task-manager__analyze_task',
      'mcp__shrimp-task-manager__split_tasks',
      'mcp__shrimp-task-manager__create_archive',
      'mcp__shrimp-task-manager__clear_all_tasks'
    ],
    mode: 'mock', // Will be 'server' when actual integration is ready
    version: '1.0.0'
  };
};

// Export all functions
export default {
  createTasksFromStory,
  archiveTasks,
  clearAllTasks,
  planTask,
  analyzeTask,
  splitTasks,
  checkMCPConnection,
  getMCPBridgeStatus
};