import { z } from "zod";
import { UUID_V4_REGEX } from "../../utils/regex.js";
import {
  getTaskById,
  updateTaskStatus,
  canExecuteTask,
  assessTaskComplexity,
} from "../../models/taskModel.js";
import { TaskStatus, Task } from "../../types/index.js";
import { getExecuteTaskPrompt } from "../../prompts/index.js";
import { loadTaskRelatedFiles } from "../../utils/fileLoader.js";
import {
  isBMADPresent,
  shouldUseBMAD,
  getBMADAgentForTask,
  generateBMADCommand,
  createBMADStoryFromTask,
} from "../../utils/bmadDetector.js";

// 執行任務工具
// Execute task tool
export const executeTaskSchema = z.object({
  taskId: z
    .string()
    .regex(UUID_V4_REGEX, {
      message: "任務ID格式無效，請提供有效的UUID v4格式",
      // Task ID format is invalid, please provide a valid UUID v4 format
    })
    .describe("待執行任務的唯一標識符，必須是系統中存在的有效任務ID"),
    // Unique identifier of the task to be executed, must be a valid task ID that exists in the system
});

export async function executeTask({
  taskId,
}: z.infer<typeof executeTaskSchema>) {
  try {
    // 檢查任務是否存在
    // Check if task exists
    const task = await getTaskById(taskId);
    if (!task) {
      return {
        content: [
          {
            type: "text" as const,
            text: `找不到ID為 \`${taskId}\` 的任務。請確認ID是否正確。`,
            // Cannot find task with ID `${taskId}`. Please confirm if the ID is correct.
          },
        ],
      };
    }

    // 檢查任務是否可以執行（依賴任務都已完成）
    // Check if task can be executed (all dependency tasks are completed)
    const executionCheck = await canExecuteTask(taskId);
    if (!executionCheck.canExecute) {
      const blockedByTasksText =
        executionCheck.blockedBy && executionCheck.blockedBy.length > 0
          ? `被以下未完成的依賴任務阻擋: ${executionCheck.blockedBy.join(", ")}`
          // Blocked by the following incomplete dependency tasks: ${executionCheck.blockedBy.join(", ")}
          : "無法確定阻擋原因";
          // Unable to determine blocking reason

      return {
        content: [
          {
            type: "text" as const,
            text: `任務 "${task.name}" (ID: \`${taskId}\`) 目前無法執行。${blockedByTasksText}`,
            // Task "${task.name}" (ID: `${taskId}`) cannot be executed currently. ${blockedByTasksText}
          },
        ],
      };
    }

    // 如果任務已經標記為「進行中」，提示用戶
    // If task is already marked as "in progress", prompt user
    if (task.status === TaskStatus.IN_PROGRESS) {
      return {
        content: [
          {
            type: "text" as const,
            text: `任務 "${task.name}" (ID: \`${taskId}\`) 已經處於進行中狀態。`,
            // Task "${task.name}" (ID: `${taskId}`) is already in progress status.
          },
        ],
      };
    }

    // 如果任務已經標記為「已完成」，提示用戶
    // If task is already marked as "completed", prompt user
    if (task.status === TaskStatus.COMPLETED) {
      return {
        content: [
          {
            type: "text" as const,
            text: `任務 "${task.name}" (ID: \`${taskId}\`) 已經標記為完成。如需重新執行，請先使用 delete_task 刪除該任務並重新創建。`,
            // Task "${task.name}" (ID: `${taskId}`) is already marked as completed. If you need to re-execute, please first use delete_task to delete the task and recreate it.
          },
        ],
      };
    }

    // 更新任務狀態為「進行中」
    // Update task status to "in progress"
    await updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);

    // Check if BMAD should handle this task
    const useBMAD = await shouldUseBMAD(task);
    
    if (useBMAD) {
      // BMAD is present and should handle this task
      const bmadAgent = getBMADAgentForTask(task);
      
      if (bmadAgent) {
        // Generate BMAD command
        const bmadCommand = generateBMADCommand(task, bmadAgent);
        
        // Check if we need to create a story file
        let storyFileInfo = "";
        if (task.name.toLowerCase().includes('story') && 
            !task.name.toLowerCase().includes('develop')) {
          // Create a BMAD-compatible story file
          const storyPath = await createBMADStoryFromTask(task);
          storyFileInfo = `\n\n📝 **Story file created:** ${storyPath}`;
        }
        
        // Return BMAD execution prompt
        return {
          content: [
            {
              type: "text" as const,
              text: `## 🤖 BMAD Integration Detected

Task "${task.name}" will be executed using BMAD agent: **${bmadAgent}**

### Task Information
- **ID:** ${taskId}
- **Name:** ${task.name}
- **Description:** ${task.description}
${task.dependencies && task.dependencies.length > 0 ? `- **Dependencies:** ${task.dependencies.map(d => d.taskId).join(', ')}` : ''}

### BMAD Execution Command
\`\`\`
${bmadCommand}
\`\`\`
${storyFileInfo}

### Execution Instructions
1. The BMAD ${bmadAgent} agent will handle this task following BMAD workflows
2. Task status has been updated to "IN_PROGRESS" in Shrimp
3. After BMAD completes the task, use \`complete_task\` to mark it as done
4. Use \`verify_task\` to validate the implementation meets requirements

### Why BMAD?
- BMAD system detected in project (.bmad-core present)
- Task pattern matches BMAD workflow (${task.name.includes('story') ? 'Story implementation' : 'Development task'})
- BMAD agents provide specialized expertise for this task type

**Note:** Shrimp will track progress while BMAD handles execution.`,
            },
          ],
        };
      }
    }

    // 評估任務複雜度
    // Assess task complexity
    const complexityResult = await assessTaskComplexity(taskId);

    // 將複雜度結果轉換為適當的格式
    // Convert complexity results to appropriate format
    const complexityAssessment = complexityResult
      ? {
          level: complexityResult.level,
          metrics: {
            descriptionLength: complexityResult.metrics.descriptionLength,
            dependenciesCount: complexityResult.metrics.dependenciesCount,
          },
          recommendations: complexityResult.recommendations,
        }
      : undefined;

    // 獲取依賴任務，用於顯示完成摘要
    // Get dependency tasks for displaying completion summary
    const dependencyTasks: Task[] = [];
    if (task.dependencies && task.dependencies.length > 0) {
      for (const dep of task.dependencies) {
        const depTask = await getTaskById(dep.taskId);
        if (depTask) {
          dependencyTasks.push(depTask);
        }
      }
    }

    // 加載任務相關的文件內容
    // Load task-related file content
    let relatedFilesSummary = "";
    if (task.relatedFiles && task.relatedFiles.length > 0) {
      try {
        const relatedFilesResult = await loadTaskRelatedFiles(
          task.relatedFiles
        );
        relatedFilesSummary =
          typeof relatedFilesResult === "string"
            ? relatedFilesResult
            : relatedFilesResult.summary || "";
      } catch (error) {
        relatedFilesSummary =
          "Error loading related files, please check the files manually.";
      }
    }

    // 使用prompt生成器獲取最終prompt
    // Use prompt generator to get final prompt
    const prompt = await getExecuteTaskPrompt({
      task,
      complexityAssessment,
      relatedFilesSummary,
      dependencyTasks,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: prompt,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `執行任務時發生錯誤: ${
            error instanceof Error ? error.message : String(error)
          }`,
          // Error occurred while executing task: ${error instanceof Error ? error.message : String(error)}
        },
      ],
    };
  }
}
