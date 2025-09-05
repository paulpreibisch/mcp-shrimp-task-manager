/**
 * Automatic Rich Completion Module
 * 
 * Provides automatic capture of rich task completion details during task verification,
 * making the rich completion system seamless and transparent to users.
 */

import {
  RichCompletionDetails,
  createUITaskTemplate,
  createBackendTaskTemplate,
  createDevOpsTaskTemplate,
  createGenericTaskTemplate,
  selectTaskType,
  formatRichCompletion,
  extractImplementationNotes
} from './completionTemplates.js';
import { Task } from '../types/index.js';

/**
 * Interface for context information available during task verification
 */
export interface TaskVerificationContext {
  task: Task;
  summary: string;
  score: number;
  executionContext?: {
    filesModified?: string[];
    linesChanged?: number;
    testsAdded?: number;
    dependencies?: string[];
    tools?: string[];
  };
}

/**
 * Automatically extracts rich completion details from task verification context
 * Uses AI-driven analysis of the task, its description, and verification summary
 * to generate comprehensive completion documentation.
 * 
 * @param context - Task verification context containing all available information
 * @returns Rich completion details extracted from context
 */
export function extractRichCompletionDetails(
  context: TaskVerificationContext
): RichCompletionDetails {
  const { task, summary, score, executionContext } = context;
  
  // Auto-detect task type based on task metadata
  const taskType = selectTaskType(
    task.name,
    task.description || '',
    task.agent
  );
  
  // Parse accomplishments from summary and task context
  const accomplishments = parseAccomplishments(task, summary, executionContext);
  
  // Extract solution features from task description and implementation
  const solutionFeatures = extractSolutionFeatures(task, summary, taskType);
  
  // Generate technical approach description
  const technicalApproach = generateTechnicalApproach(task, summary, taskType, executionContext);
  
  // Identify key decisions from task context
  const keyDecisions = extractKeyDecisions(task, summary, taskType);
  
  // Use appropriate template based on detected task type
  switch (taskType) {
    case 'ui':
      return createUITaskTemplate(
        accomplishments,
        solutionFeatures,
        technicalApproach,
        keyDecisions
      );
    case 'backend':
      return createBackendTaskTemplate(
        accomplishments,
        solutionFeatures,
        technicalApproach,
        keyDecisions
      );
    case 'devops':
      return createDevOpsTaskTemplate(
        accomplishments,
        solutionFeatures,
        technicalApproach,
        keyDecisions
      );
    default:
      return createGenericTaskTemplate(
        accomplishments,
        solutionFeatures,
        technicalApproach,
        keyDecisions
      );
  }
}

/**
 * Parses accomplishments from verification summary and execution context
 */
function parseAccomplishments(
  task: Task,
  summary: string,
  executionContext?: TaskVerificationContext['executionContext']
): string[] {
  const accomplishments: string[] = [];
  
  // Extract main accomplishment from task completion
  if (task.name) {
    accomplishments.push(`Completed ${task.name.toLowerCase()}`);
  }
  
  // Parse accomplishments from summary
  const summaryAccomplishments = extractFromSummary(summary, [
    'implemented', 'created', 'built', 'developed', 'added', 'configured',
    'set up', 'integrated', 'deployed', 'fixed', 'updated', 'enhanced'
  ]);
  accomplishments.push(...summaryAccomplishments);
  
  // Add context-based accomplishments
  if (executionContext?.filesModified?.length) {
    accomplishments.push(`Modified ${executionContext.filesModified.length} files`);
  }
  
  if (executionContext?.testsAdded && executionContext.testsAdded > 0) {
    accomplishments.push(`Added ${executionContext.testsAdded} tests`);
  }
  
  if (executionContext?.linesChanged && executionContext.linesChanged > 0) {
    accomplishments.push(`Added/modified ${executionContext.linesChanged} lines of code`);
  }
  
  // Ensure we have at least one accomplishment
  if (accomplishments.length === 0) {
    accomplishments.push('Successfully completed task implementation');
  }
  
  return accomplishments.slice(0, 6); // Limit to 6 accomplishments
}

/**
 * Extracts solution features from task context and type
 */
function extractSolutionFeatures(
  task: Task,
  summary: string,
  taskType: 'ui' | 'backend' | 'devops' | 'generic'
): string[] {
  const features: string[] = [];
  
  // Extract features mentioned in description or summary
  const featureKeywords = {
    ui: ['responsive', 'interactive', 'accessible', 'user-friendly', 'mobile', 'desktop'],
    backend: ['api', 'database', 'authentication', 'security', 'performance', 'scalable'],
    devops: ['automated', 'monitored', 'scalable', 'secure', 'reliable', 'optimized'],
    generic: ['functional', 'tested', 'documented', 'maintainable', 'reliable', 'efficient']
  };
  
  const keywords = featureKeywords[taskType];
  const text = `${task.description || ''} ${summary}`.toLowerCase();
  
  keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      features.push(`${capitalize(keyword)}: Enhanced ${keyword} implementation`);
    }
  });
  
  // Add default features based on task type
  if (features.length === 0) {
    const defaultFeatures = {
      ui: ['User Experience: Intuitive and responsive interface'],
      backend: ['API Design: RESTful endpoints with proper error handling'],
      devops: ['Automation: Streamlined deployment and monitoring'],
      generic: ['Implementation: Core functionality delivered successfully']
    };
    features.push(...defaultFeatures[taskType]);
  }
  
  return features.slice(0, 4); // Limit to 4 features
}

/**
 * Generates technical approach description based on task context
 */
function generateTechnicalApproach(
  task: Task,
  summary: string,
  taskType: 'ui' | 'backend' | 'devops' | 'generic',
  executionContext?: TaskVerificationContext['executionContext']
): string {
  const approaches = [];
  
  // Add tools mentioned in context
  if (executionContext?.tools?.length) {
    approaches.push(`Used ${executionContext.tools.join(', ')}`);
  }
  
  // Extract technical details from implementation guide
  if (task.implementationGuide) {
    const technicalTerms = extractTechnicalTerms(task.implementationGuide);
    if (technicalTerms.length > 0) {
      approaches.push(`Implemented using ${technicalTerms.join(', ')}`);
    }
  }
  
  // Extract from summary
  const summaryTech = extractTechnicalTerms(summary);
  if (summaryTech.length > 0) {
    approaches.push(`Applied ${summaryTech.join(', ')} patterns`);
  }
  
  // Default approaches by task type
  if (approaches.length === 0) {
    const defaultApproaches = {
      ui: 'Implemented using modern frontend frameworks with responsive design principles',
      backend: 'Built using server-side technologies with RESTful API patterns',
      devops: 'Configured using infrastructure as code and automation tools',
      generic: 'Implemented following project standards and best practices'
    };
    approaches.push(defaultApproaches[taskType]);
  }
  
  return approaches.join('. ') + '.';
}

/**
 * Extracts key decisions from task context
 */
function extractKeyDecisions(
  task: Task,
  summary: string,
  taskType: 'ui' | 'backend' | 'devops' | 'generic'
): string {
  const decisions: string[] = [];
  
  // Look for decision keywords in notes or implementation guide
  const decisionSources = [task.notes, task.implementationGuide, summary].filter(Boolean);
  
  decisionSources.forEach(source => {
    const decisionPhrases = extractDecisionPhrases(source!);
    decisions.push(...decisionPhrases);
  });
  
  // Default decisions by task type
  if (decisions.length === 0) {
    const defaultDecisions = {
      ui: 'Prioritized user experience and accessibility compliance',
      backend: 'Chose scalable architecture patterns for future growth',
      devops: 'Selected proven tools for reliability and maintainability',
      generic: 'Followed established patterns for consistency and maintainability'
    };
    decisions.push(defaultDecisions[taskType]);
  }
  
  return decisions.slice(0, 3).join('. ') + '.';
}

/**
 * Utility functions
 */

function extractFromSummary(summary: string, actionWords: string[]): string[] {
  const accomplishments: string[] = [];
  const sentences = summary.split(/[.!]/).filter(s => s.trim().length > 0);
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    actionWords.forEach(action => {
      if (trimmed.toLowerCase().includes(action)) {
        accomplishments.push(capitalize(trimmed));
      }
    });
  });
  
  return [...new Set(accomplishments)]; // Remove duplicates
}

function extractTechnicalTerms(text: string): string[] {
  const techTerms = [
    'react', 'vue', 'angular', 'typescript', 'javascript',
    'node.js', 'express', 'fastify', 'nest.js',
    'postgresql', 'mongodb', 'redis', 'mysql',
    'docker', 'kubernetes', 'terraform', 'jenkins',
    'aws', 'azure', 'gcp', 'github actions',
    'jest', 'cypress', 'playwright', 'vitest'
  ];
  
  const found = techTerms.filter(term => 
    text.toLowerCase().includes(term.toLowerCase())
  );
  
  return found.map(term => term.charAt(0).toUpperCase() + term.slice(1));
}

function extractDecisionPhrases(text: string): string[] {
  const decisionPatterns = [
    /chose (\w+.*?) for/gi,
    /selected (\w+.*?) because/gi,
    /decided to (\w+.*?) due to/gi,
    /opted for (\w+.*?) to/gi
  ];
  
  const decisions: string[] = [];
  
  decisionPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        decisions.push(`Chose ${match[1]} for strategic reasons`);
      }
    }
  });
  
  return decisions;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Automatically generates and applies rich completion details to a task
 * This function is called internally during task verification to enhance
 * the task documentation without requiring explicit calls.
 * 
 * @param context - Task verification context
 * @returns Promise resolving to enhanced notes content
 */
export async function autoApplyRichCompletion(
  context: TaskVerificationContext
): Promise<string> {
  const { task } = context;
  
  // Extract existing implementation notes
  const originalNotes = extractImplementationNotes(task.notes || '');
  
  // Generate rich completion details
  const richDetails = extractRichCompletionDetails(context);
  
  // Format the enhanced notes
  const enhancedNotes = formatRichCompletion(
    originalNotes,
    richDetails,
    {
      includeEmojis: true,
      bulletStyle: '•',
      includeSeparator: true
    }
  );
  
  return enhancedNotes;
}

/**
 * Checks if a verification summary indicates the task deserves rich documentation
 * Some simple tasks may not warrant full rich completion treatment
 * 
 * @param summary - Verification summary
 * @param score - Task score
 * @returns Whether to apply rich completion
 */
export function shouldApplyRichCompletion(summary: string, score: number): boolean {
  // Always apply for high scores (indicates significant work)
  if (score >= 90) return true;
  
  // Apply for completed tasks (score >= 80) with sufficient detail in summary
  if (score >= 80 && summary.length >= 50) return true;
  
  // Skip for very short summaries or low scores
  if (summary.length < 30 || score < 80) return false;
  
  return true;
}