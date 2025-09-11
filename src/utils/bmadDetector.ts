/**
 * BMAD Integration Detector
 * Detects presence of BMAD system and provides integration capabilities
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Task } from '../types/index.js';
import { isBMADEnabled, loadBMADConfig, getAgentMapping } from '../config/bmadConfig.js';

/**
 * Check if BMAD is present in the current project
 * @returns true if .bmad-core directory exists
 */
export async function isBMADPresent(): Promise<boolean> {
  try {
    // Check if .bmad-core directory exists in current working directory
    const bmadPath = path.join(process.cwd(), '.bmad-core');
    const stats = await fs.stat(bmadPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Get BMAD agent for a specific task type
 * Maps task characteristics to appropriate BMAD agents
 */
export function getBMADAgentForTask(task: Task): string | null {
  const taskNameLower = task.name.toLowerCase();
  const descriptionLower = task.description?.toLowerCase() || '';
  
  // Check for specific task patterns and map to BMAD agents
  if (taskNameLower.includes('story') || taskNameLower.includes('user story')) {
    return 'dev'; // Developer agent for story implementation
  }
  
  if (taskNameLower.includes('prd') || taskNameLower.includes('product requirement')) {
    return 'pm'; // Product Manager agent
  }
  
  if (taskNameLower.includes('test') || taskNameLower.includes('qa')) {
    return 'qa'; // QA agent
  }
  
  if (taskNameLower.includes('design') || taskNameLower.includes('architecture')) {
    return 'architect'; // Architect agent
  }
  
  if (taskNameLower.includes('analysis') || taskNameLower.includes('research')) {
    return 'analyst'; // Analyst agent
  }
  
  if (taskNameLower.includes('ux') || taskNameLower.includes('user experience')) {
    return 'ux-expert'; // UX Expert agent
  }
  
  // Default to dev agent for general development tasks
  if (taskNameLower.includes('implement') || 
      taskNameLower.includes('develop') || 
      taskNameLower.includes('code') ||
      taskNameLower.includes('feature')) {
    return 'dev';
  }
  
  // If task has an agent specified, check if it's a BMAD agent
  if (task.agent) {
    const bmadAgents = ['pm', 'dev', 'qa', 'architect', 'analyst', 'ux-expert', 'po', 'sm'];
    if (bmadAgents.includes(task.agent)) {
      return task.agent;
    }
  }
  
  return null;
}

/**
 * Generate BMAD execution command for a task
 */
export function generateBMADCommand(task: Task, agent: string): string {
  // Check if this is a story-related task
  if (task.name.toLowerCase().includes('story')) {
    // Extract story identifier if present
    const storyMatch = task.name.match(/story\s*(\d+\.?\d*)/i);
    const storyId = storyMatch ? storyMatch[1] : 'current';
    
    return `/BMad:agents:dev *develop-story ${storyId}`;
  }
  
  // For non-story tasks, use the appropriate agent with task context
  return `/BMad:agents:${agent}`;
}

/**
 * Check if a task should use BMAD execution
 * @param task The task to check
 * @returns true if BMAD should handle this task
 */
export async function shouldUseBMAD(task: Task): Promise<boolean> {
  // Check if BMAD integration is enabled in config
  const enabled = await isBMADEnabled();
  if (!enabled) {
    return false;
  }
  
  // Check if BMAD is present in the project
  const bmadPresent = await isBMADPresent();
  if (!bmadPresent) {
    return false;
  }
  
  // Load config to check preferences
  const config = await loadBMADConfig();
  
  // Check if task explicitly opts out of BMAD
  if (task.metadata?.useBMAD === false) {
    return false;
  }
  
  // Check if task explicitly opts in to BMAD
  if (task.metadata?.useBMAD === true) {
    return true;
  }
  
  // If preferBMAD is false and no explicit opt-in, use standard execution
  if (!config.preferBMAD) {
    return false;
  }
  
  // Check if task has a BMAD agent assigned
  const bmadAgent = getBMADAgentForTask(task);
  if (bmadAgent) {
    return true;
  }
  
  // Check for BMAD-specific task patterns
  const bmadPatterns = [
    /story\s*\d+/i,           // Story tasks
    /epic\s*\d+/i,            // Epic tasks
    /.*brownfield.*/i,        // Brownfield project tasks
    /.*greenfield.*/i,        // Greenfield project tasks
    /develop.*story/i,        // Development story tasks
    /create.*prd/i,           // PRD creation tasks
  ];
  
  const taskText = `${task.name} ${task.description || ''}`;
  return bmadPatterns.some(pattern => pattern.test(taskText));
}

/**
 * Get BMAD story file path if it exists
 */
export async function getBMADStoryFile(storyId: string): Promise<string | null> {
  try {
    const storyPath = path.join(process.cwd(), 'stories', `story-${storyId}.md`);
    await fs.access(storyPath);
    return storyPath;
  } catch {
    // Try alternative naming patterns
    try {
      const altPath = path.join(process.cwd(), 'stories', `${storyId}.md`);
      await fs.access(altPath);
      return altPath;
    } catch {
      return null;
    }
  }
}

/**
 * Create a BMAD-compatible story file from a Shrimp task
 */
export async function createBMADStoryFromTask(task: Task): Promise<string> {
  const storyTemplate = `# ${task.name}

## Description
${task.description}

## Acceptance Criteria
${task.verificationCriteria || '- [ ] Implementation complete\n- [ ] Tests passing\n- [ ] Code reviewed'}

## Technical Notes
${task.implementationGuide || task.notes || 'No additional notes'}

## Dependencies
${task.dependencies?.map(d => `- ${d.taskId}`).join('\n') || 'None'}

---
*Generated from Shrimp Task: ${task.id}*
`;

  // Save story file
  const storiesDir = path.join(process.cwd(), 'stories');
  await fs.mkdir(storiesDir, { recursive: true });
  
  const storyFileName = `shrimp-${task.id.slice(0, 8)}.md`;
  const storyPath = path.join(storiesDir, storyFileName);
  await fs.writeFile(storyPath, storyTemplate);
  
  return storyPath;
}