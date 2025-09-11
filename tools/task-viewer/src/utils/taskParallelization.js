/**
 * Task Parallelization Utility
 * Analyzes tasks to determine which ones can be run in parallel
 */

/**
 * Analyzes tasks to find ones that can be run in parallel
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Analysis result with parallelizable tasks and command text
 */
export const analyzeTaskParallelization = (tasks) => {
  if (!tasks || tasks.length === 0) {
    return {
      parallelizableTasks: [],
      commandText: '',
      analysis: 'No tasks available for parallelization analysis.'
    };
  }

  // Get completed task IDs for dependency resolution
  const completedTaskIds = new Set(
    tasks.filter(task => 
      task.status === 'completed' || 
      task.status === 'done' ||
      task.completedAt
    ).map(task => task.id)
  );

  // Get pending tasks
  const pendingTasks = tasks.filter(task => 
    task.status === 'pending' || 
    task.status === 'todo' ||
    (!task.status && !task.completedAt)
  );

  // Find tasks that can run now (all dependencies met)
  const runnableTasks = pendingTasks.filter(task => {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true; // No dependencies, can run
    }
    
    // Check if all dependencies are completed
    return task.dependencies.every(dep => {
      // Handle different dependency formats
      if (typeof dep === 'string') {
        return completedTaskIds.has(dep);
      }
      if (dep.taskId) {
        return completedTaskIds.has(dep.taskId);
      }
      if (dep.id) {
        return completedTaskIds.has(dep.id);
      }
      return false;
    });
  });

  // Group tasks by their dependency signature to find truly parallelizable tasks
  const dependencyGroups = new Map();
  
  runnableTasks.forEach(task => {
    const depSignature = getDependencySignature(task.dependencies || []);
    if (!dependencyGroups.has(depSignature)) {
      dependencyGroups.set(depSignature, []);
    }
    dependencyGroups.get(depSignature).push(task);
  });

  // Find groups with multiple tasks (truly parallelizable)
  const parallelizableGroups = [];
  const individualTasks = [];

  dependencyGroups.forEach((taskGroup, signature) => {
    if (taskGroup.length > 1) {
      parallelizableGroups.push({
        signature,
        tasks: taskGroup,
        count: taskGroup.length
      });
    } else if (taskGroup.length === 1) {
      individualTasks.push(taskGroup[0]);
    }
  });

  // All runnable tasks should have commands generated
  const allParallelizableTasks = runnableTasks;

  return {
    parallelizableTasks: allParallelizableTasks,
    runnableTasks,
    parallelizableGroups,
    individualTasks,
    commandText: generateCommandText(allParallelizableTasks, tasks),
    analysis: generateAnalysisText(runnableTasks, parallelizableGroups, individualTasks)
  };
};

/**
 * Creates a signature for task dependencies to group similar tasks
 * @param {Array} dependencies - Task dependencies
 * @returns {string} Dependency signature
 */
const getDependencySignature = (dependencies) => {
  if (!dependencies || dependencies.length === 0) {
    return 'no-deps';
  }
  
  const depIds = dependencies.map(dep => {
    if (typeof dep === 'string') return dep;
    if (dep.taskId) return dep.taskId;
    if (dep.id) return dep.id;
    return 'unknown';
  }).sort();
  
  return depIds.join(',');
};

/**
 * Generates Claude command text for parallelizable tasks
 * @param {Array} tasks - Tasks that can be run in parallel
 * @returns {string} Command text for Claude
 */
const generateCommandText = (tasks, allTasks = []) => {
  if (!tasks || tasks.length === 0) {
    // If no runnable tasks, provide information about what's blocking
    const pendingTasks = allTasks.filter(task => 
      task.status === 'pending' || 
      task.status === 'todo' ||
      (!task.status && !task.completedAt)
    );
    
    if (pendingTasks.length === 0) {
      return 'All tasks are completed! No further action needed.';
    }
    
    const blockedTasks = pendingTasks.filter(task => {
      if (!task.dependencies || task.dependencies.length === 0) {
        return false; // This should be runnable, might be an error
      }
      
      const completedTaskIds = new Set(
        allTasks.filter(t => 
          t.status === 'completed' || 
          t.status === 'done' ||
          t.completedAt
        ).map(t => t.id)
      );
      
      return !task.dependencies.every(dep => {
        if (typeof dep === 'string') return completedTaskIds.has(dep);
        if (dep.taskId) return completedTaskIds.has(dep.taskId);
        if (dep.id) return completedTaskIds.has(dep.id);
        return false;
      });
    });
    
    if (blockedTasks.length > 0) {
      const example = blockedTasks[0];
      const missingDeps = (example.dependencies || []).filter(dep => {
        const completedTaskIds = new Set(
          allTasks.filter(t => 
            t.status === 'completed' || 
            t.status === 'done' ||
            t.completedAt
          ).map(t => t.id)
        );
        
        if (typeof dep === 'string') return !completedTaskIds.has(dep);
        if (dep.taskId) return !completedTaskIds.has(dep.taskId);
        if (dep.id) return !completedTaskIds.has(dep.id);
        return true;
      });
      
      return `No tasks ready to run. ${blockedTasks.length} tasks are waiting for dependencies. First complete: ${missingDeps.map(d => typeof d === 'string' ? d : d.taskId || d.id || 'unknown').join(', ')}`;
    }
    
    return 'No tasks are currently ready to run. Check task statuses and dependencies.';
  }

  if (tasks.length === 1) {
    const task = tasks[0];
    const agent = getTaskAgent(task);
    return `Use the built in subagent located in ${agent} to complete this shrimp task: ${task.id} please when u start working mark the shrimp task as in progress`;
  }

  // Generate parallel execution command with specific agent assignments
  const taskWithAgents = tasks.map(task => {
    if (task.agent && task.agent.trim() !== '') {
      return `${task.id} (${task.agent})`;
    } else {
      return task.id;
    }
  }).join(', ');
  
  return `I need to launch ${tasks.length} subagents simultaneously in parallel to execute these shrimp tasks at the same time: ${taskWithAgents}. Start all tasks concurrently, not sequentially.`;
};

/**
 * Gets the appropriate agent for a task
 * @param {Object} task - Task object
 * @returns {string} Agent path or default
 */
const getTaskAgent = (task) => {
  if (task.agent && task.agent.trim() !== '') {
    // If agent is already a full path, return it
    if (task.agent.includes('/')) {
      return task.agent;
    }
    // Otherwise, construct the path
    return `/home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/.claude/agents/${task.agent}`;
  }
  
  // Smart default based on task type or content
  const taskName = (task.name || task.description || '').toLowerCase();
  
  if (taskName.includes('api') || taskName.includes('endpoint') || taskName.includes('backend')) {
    return '/home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/.claude/agents/api-integration.md';
  }
  
  if (taskName.includes('component') || taskName.includes('ui') || taskName.includes('react') || taskName.includes('frontend')) {
    return '/home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/.claude/agents/react-components.md';
  }
  
  if (taskName.includes('test') || taskName.includes('spec')) {
    return '/home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/.claude/agents/testing-specialist.md';
  }
  
  // Default fallback agent
  return '/home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/.claude/agents/fullstack.md';
};

/**
 * Generates human-readable analysis text
 * @param {Array} runnableTasks - Tasks that can run now
 * @param {Array} parallelizableGroups - Groups of truly parallelizable tasks
 * @param {Array} individualTasks - Individual runnable tasks
 * @returns {string} Analysis description
 */
const generateAnalysisText = (runnableTasks, parallelizableGroups, individualTasks) => {
  if (runnableTasks.length === 0) {
    return 'No tasks are currently ready to run. All pending tasks have unmet dependencies. Check which dependencies need to be completed first.';
  }

  if (runnableTasks.length === 1) {
    const task = runnableTasks[0];
    return `1 task is ready to run: "${task.name || task.id}". Click to copy the command and execute it with Claude.`;
  }

  let analysis = `${runnableTasks.length} tasks are ready to run in parallel:\n\n`;
  
  if (parallelizableGroups.length > 0) {
    analysis += `Tasks with similar dependencies (can run together):\n`;
    parallelizableGroups.forEach(group => {
      analysis += `• ${group.count} tasks: ${group.tasks.map(t => t.name || t.id).join(', ')}\n`;
    });
  }

  if (individualTasks.length > 0) {
    analysis += `\nIndependent tasks:\n`;
    individualTasks.forEach(task => {
      analysis += `• ${task.name || task.id}\n`;
    });
  }

  return analysis;
};

/**
 * Generates a full execution plan for all tasks with proper sequencing
 * @param {Array} tasks - All tasks in the project
 * @returns {string} Complete execution plan with parallel and sequential steps
 */
export const generateFullExecutionPlan = (tasks) => {
  if (!tasks || tasks.length === 0) {
    return 'No tasks available to plan.';
  }

  // Separate tasks by status
  const completedTaskIds = new Set(
    tasks.filter(task => 
      task.status === 'completed' || 
      task.status === 'done' ||
      task.completedAt
    ).map(task => task.id)
  );

  const pendingTasks = tasks.filter(task => 
    task.status === 'pending' || 
    task.status === 'todo' ||
    (!task.status && !task.completedAt)
  );

  if (pendingTasks.length === 0) {
    return 'All tasks are completed! No further action needed.';
  }

  // Build execution phases based on dependencies
  const executionPhases = [];
  const tasksToProcess = new Set(pendingTasks.map(t => t.id));
  const processedTasks = new Set(completedTaskIds);
  
  // Keep finding phases until all tasks are processed
  while (tasksToProcess.size > 0) {
    // Find all tasks that can run in this phase
    const currentPhaseTasks = pendingTasks.filter(task => {
      if (!tasksToProcess.has(task.id)) {
        return false; // Already processed
      }
      
      if (!task.dependencies || task.dependencies.length === 0) {
        return true; // No dependencies
      }
      
      // Check if all dependencies are processed
      return task.dependencies.every(dep => {
        const depId = typeof dep === 'string' ? dep : (dep.taskId || dep.id);
        return processedTasks.has(depId);
      });
    });

    if (currentPhaseTasks.length === 0) {
      // No tasks can run - there might be circular dependencies
      const remainingTasks = pendingTasks.filter(t => tasksToProcess.has(t.id));
      if (remainingTasks.length > 0) {
        executionPhases.push({
          type: 'blocked',
          tasks: remainingTasks,
          reason: 'Circular dependencies or missing dependent tasks'
        });
      }
      break;
    }

    // Add this phase
    executionPhases.push({
      type: 'parallel',
      tasks: currentPhaseTasks
    });

    // Mark these tasks as processed
    currentPhaseTasks.forEach(task => {
      processedTasks.add(task.id);
      tasksToProcess.delete(task.id);
    });
  }

  // Generate the execution plan text
  let plan = '=== COMPLETE EXECUTION PLAN ===\\n\\n';
  
  if (executionPhases.length === 0) {
    return plan + 'No executable tasks found.';
  }

  executionPhases.forEach((phase, index) => {
    if (phase.type === 'blocked') {
      plan += `\\n⚠️ BLOCKED TASKS (${phase.tasks.length} tasks):\\n`;
      plan += `Reason: ${phase.reason}\\n`;
      phase.tasks.forEach(task => {
        plan += `  - ${task.name || task.id}\\n`;
      });
    } else {
      plan += `\\n📍 PHASE ${index + 1} (${phase.tasks.length} task${phase.tasks.length > 1 ? 's' : ''}):\\n`;
      
      if (phase.tasks.length === 1) {
        const task = phase.tasks[0];
        const agent = getTaskAgent(task);
        plan += `\\nUse the built in subagent located in ${agent} to complete this shrimp task: ${task.id} please when u start working mark the shrimp task as in progress\\n`;
      } else {
        // Multiple tasks - can run in parallel
        plan += `\\nI need to launch ${phase.tasks.length} subagents simultaneously in parallel to execute these shrimp tasks at the same time:\\n`;
        phase.tasks.forEach(task => {
          const agent = task.agent && task.agent.trim() !== '' ? task.agent : 'auto-assigned';
          plan += `  - ${task.id} (${agent}): ${task.name || 'No description'}\\n`;
        });
        plan += `\\nStart all ${phase.tasks.length} tasks concurrently, not sequentially.\\n`;
      }
      
      // Add a note about what comes next
      if (index < executionPhases.length - 1 && executionPhases[index + 1].type !== 'blocked') {
        plan += `\\nAfter completing the above, proceed to Phase ${index + 2}.\\n`;
      }
    }
  });

  // Add summary
  const totalTasks = pendingTasks.length;
  const executableTasks = executionPhases
    .filter(p => p.type === 'parallel')
    .reduce((sum, phase) => sum + phase.tasks.length, 0);
  const blockedTasks = totalTasks - executableTasks;

  plan += `\\n\\n=== SUMMARY ===\\n`;
  plan += `Total pending tasks: ${totalTasks}\\n`;
  plan += `Executable tasks: ${executableTasks}\\n`;
  plan += `Execution phases: ${executionPhases.filter(p => p.type === 'parallel').length}\\n`;
  
  if (blockedTasks > 0) {
    plan += `Blocked tasks: ${blockedTasks}\\n`;
  }

  return plan;
};

/**
 * Copies text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};