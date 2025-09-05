/**
 * Agent Execution Context Module
 * 
 * Provides a standardized way for agents to report execution context
 * that can be used for automatic rich completion documentation.
 */

import { TaskVerificationContext } from './autoRichCompletion.js';

/**
 * Global execution context store for the current task
 * Agents can update this during task execution to provide richer completion details
 */
class ExecutionContextManager {
  private contexts: Map<string, TaskVerificationContext['executionContext']> = new Map();
  
  /**
   * Records execution context for a task
   */
  setContext(taskId: string, context: Partial<TaskVerificationContext['executionContext']>) {
    const existing = this.contexts.get(taskId) || {};
    this.contexts.set(taskId, {
      ...existing,
      ...context
    });
  }
  
  /**
   * Appends to execution context arrays
   */
  appendContext(taskId: string, context: {
    filesModified?: string[];
    dependencies?: string[];
    tools?: string[];
  }) {
    const existing = this.contexts.get(taskId) || {};
    
    this.contexts.set(taskId, {
      ...existing,
      filesModified: [
        ...(existing.filesModified || []),
        ...(context.filesModified || [])
      ],
      dependencies: [
        ...(existing.dependencies || []),
        ...(context.dependencies || [])
      ],
      tools: [
        ...(existing.tools || []),
        ...(context.tools || [])
      ]
    });
  }
  
  /**
   * Gets execution context for a task
   */
  getContext(taskId: string): TaskVerificationContext['executionContext'] {
    return this.contexts.get(taskId);
  }
  
  /**
   * Clears execution context for a task (called after completion)
   */
  clearContext(taskId: string) {
    this.contexts.delete(taskId);
  }
  
  /**
   * Records that a file was modified during task execution
   */
  recordFileModification(taskId: string, filePath: string) {
    this.appendContext(taskId, {
      filesModified: [filePath]
    });
  }
  
  /**
   * Records lines of code changed
   */
  recordCodeChanges(taskId: string, linesChanged: number) {
    const existing = this.contexts.get(taskId) || {};
    this.contexts.set(taskId, {
      ...existing,
      linesChanged: (existing.linesChanged || 0) + linesChanged
    });
  }
  
  /**
   * Records tests added
   */
  recordTestsAdded(taskId: string, testCount: number) {
    const existing = this.contexts.get(taskId) || {};
    this.contexts.set(taskId, {
      ...existing,
      testsAdded: (existing.testsAdded || 0) + testCount
    });
  }
  
  /**
   * Records tools/technologies used
   */
  recordToolUsage(taskId: string, tools: string[]) {
    this.appendContext(taskId, { tools });
  }
  
  /**
   * Records dependencies added/modified
   */
  recordDependencies(taskId: string, dependencies: string[]) {
    this.appendContext(taskId, { dependencies });
  }
}

// Global instance
export const executionContextManager = new ExecutionContextManager();

/**
 * Convenience functions for agents to report execution details
 */

/**
 * Reports that files were modified during task execution
 * Agents should call this whenever they create, modify, or delete files
 * 
 * @param taskId - Task ID being worked on
 * @param filePaths - Array of file paths that were modified
 */
export function reportFileModifications(taskId: string, filePaths: string[]) {
  filePaths.forEach(path => {
    executionContextManager.recordFileModification(taskId, path);
  });
}

/**
 * Reports code metrics from task execution
 * 
 * @param taskId - Task ID being worked on
 * @param metrics - Code metrics to report
 */
export function reportCodeMetrics(taskId: string, metrics: {
  linesChanged?: number;
  testsAdded?: number;
}) {
  if (metrics.linesChanged) {
    executionContextManager.recordCodeChanges(taskId, metrics.linesChanged);
  }
  if (metrics.testsAdded) {
    executionContextManager.recordTestsAdded(taskId, metrics.testsAdded);
  }
}

/**
 * Reports technologies and tools used during task execution
 * 
 * @param taskId - Task ID being worked on
 * @param tools - Array of tools/technologies used
 */
export function reportToolUsage(taskId: string, tools: string[]) {
  executionContextManager.recordToolUsage(taskId, tools);
}

/**
 * Reports dependencies that were added or modified
 * 
 * @param taskId - Task ID being worked on
 * @param dependencies - Array of dependency names
 */
export function reportDependencies(taskId: string, dependencies: string[]) {
  executionContextManager.recordDependencies(taskId, dependencies);
}

/**
 * Convenience function for agents to report comprehensive execution context
 * 
 * @param taskId - Task ID being worked on
 * @param context - Complete execution context
 */
export function reportExecutionContext(
  taskId: string, 
  context: TaskVerificationContext['executionContext']
) {
  executionContextManager.setContext(taskId, context);
}

/**
 * Enhanced verification context getter that includes execution context
 * Used internally by the verification system
 * 
 * @param taskId - Task ID to get context for
 * @returns Execution context or undefined if none exists
 */
export function getExecutionContext(taskId: string): TaskVerificationContext['executionContext'] {
  return executionContextManager.getContext(taskId);
}

/**
 * Cleans up execution context after task completion
 * Called internally by the verification system
 * 
 * @param taskId - Task ID to clean up
 */
export function cleanupExecutionContext(taskId: string) {
  executionContextManager.clearContext(taskId);
}

/**
 * Auto-detection helpers for agents that don't explicitly report context
 */

/**
 * Attempts to detect execution context from task notes and related files
 * This is a fallback when agents don't explicitly report context
 * 
 * @param task - Task object to analyze
 * @returns Inferred execution context
 */
export function inferExecutionContext(task: any): TaskVerificationContext['executionContext'] {
  const context: TaskVerificationContext['executionContext'] = {};
  
  // Infer from related files
  if (task.relatedFiles?.length) {
    context.filesModified = task.relatedFiles
      .filter((file: any) => file.type === 'TO_MODIFY' || file.type === 'CREATE')
      .map((file: any) => file.path);
  }
  
  // Infer tools from implementation guide or notes
  const text = `${task.implementationGuide || ''} ${task.notes || ''}`.toLowerCase();
  const detectedTools = detectToolsFromText(text);
  if (detectedTools.length > 0) {
    context.tools = detectedTools;
  }
  
  // Infer dependencies from task dependencies
  if (task.dependencies?.length) {
    context.dependencies = task.dependencies;
  }
  
  return context;
}

/**
 * Detects tools/technologies from text content
 */
function detectToolsFromText(text: string): string[] {
  const toolPatterns = [
    // Frontend
    'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt',
    // Backend  
    'express', 'fastify', 'nest.js', 'koa', 'hapi',
    // Databases
    'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite',
    // Languages
    'typescript', 'javascript', 'python', 'java', 'go', 'rust',
    // Tools
    'docker', 'kubernetes', 'terraform', 'jenkins', 'github actions',
    // Testing
    'jest', 'mocha', 'cypress', 'playwright', 'vitest',
    // Cloud
    'aws', 'azure', 'gcp', 'vercel', 'netlify'
  ];
  
  return toolPatterns.filter(tool => 
    text.includes(tool.toLowerCase()) || text.includes(tool.replace('.', ''))
  );
}

/**
 * Agent instruction helpers
 */

/**
 * Provides standard instructions for agents on how to report execution context
 */
export const AGENT_CONTEXT_INSTRUCTIONS = `
## Execution Context Reporting

To enable automatic rich completion documentation, agents should report execution context during task implementation:

### File Operations
\`\`\`typescript
// When modifying files
reportFileModifications(taskId, ['src/api/users.ts', 'tests/users.test.ts']);
\`\`\`

### Code Metrics
\`\`\`typescript  
// When adding code or tests
reportCodeMetrics(taskId, {
  linesChanged: 150,
  testsAdded: 5
});
\`\`\`

### Tool Usage
\`\`\`typescript
// When using specific technologies
reportToolUsage(taskId, ['Express.js', 'TypeScript', 'Jest']);
\`\`\`

### Dependencies
\`\`\`typescript
// When adding/modifying dependencies
reportDependencies(taskId, ['zod', 'bcrypt', 'jsonwebtoken']);
\`\`\`

### Comprehensive Reporting
\`\`\`typescript
// All at once
reportExecutionContext(taskId, {
  filesModified: ['src/auth.ts', 'src/middleware/auth.ts'],
  linesChanged: 200,
  testsAdded: 8,
  tools: ['Express.js', 'TypeScript', 'bcrypt'],
  dependencies: ['bcrypt', 'jsonwebtoken']
});
\`\`\`

This context will be automatically used to generate comprehensive completion documentation when the task is verified.
`;

export default {
  reportFileModifications,
  reportCodeMetrics,
  reportToolUsage,
  reportDependencies,
  reportExecutionContext,
  getExecutionContext,
  cleanupExecutionContext,
  inferExecutionContext,
  AGENT_CONTEXT_INSTRUCTIONS
};