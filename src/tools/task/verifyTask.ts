import { z } from "zod";
import { UUID_V4_REGEX } from "../../utils/regex.js";
import {
  getTaskById,
  updateTaskStatus,
  updateTaskSummary,
  updateTaskContent,
} from "../../models/taskModel.js";
import { TaskStatus } from "../../types/index.js";
import { getVerifyTaskPrompt } from "../../prompts/index.js";
import {
  autoApplyRichCompletion,
  shouldApplyRichCompletion,
  TaskVerificationContext
} from "../../utils/autoRichCompletion.js";
import {
  getExecutionContext,
  cleanupExecutionContext,
  inferExecutionContext
} from "../../utils/agentExecutionContext.js";

// 檢驗任務工具
// Task verification tool
export const verifyTaskSchema = z.object({
  taskId: z
    .string()
    .regex(UUID_V4_REGEX, {
      message: "任務ID格式無效，請提供有效的UUID v4格式",
      // message: "Invalid task ID format, please provide a valid UUID v4 format",
    })
    .describe("待驗證任務的唯一標識符，必須是系統中存在的有效任務ID"),
    // .describe("Unique identifier of the task to be verified, must be a valid task ID that exists in the system")
  summary: z
    .string()
    .min(30, {
      message: "最少30個字",
      // message: "Minimum 30 characters",
    })
    .describe(
      "當分數高於或等於 80分時代表任務完成摘要，簡潔描述實施結果和重要決策，當分數低於 80分時代表缺失或需要修正的部分說明，最少30個字"
      // "When score is 80 or above, this represents task completion summary, briefly describing implementation results and important decisions. When score is below 80, this represents missing or parts that need correction, minimum 30 characters"
    ),
  score: z
    .number()
    .min(0, { message: "分數不能小於0" })
    // .min(0, { message: "Score cannot be less than 0" })
    .max(100, { message: "分數不能大於100" })
    // .max(100, { message: "Score cannot be greater than 100" })
    .describe("針對任務的評分，當評分等於或超過80分時自動完成任務"),
    // .describe("Score for the task, automatically completes task when score equals or exceeds 80")
});

export async function verifyTask({
  taskId,
  summary,
  score,
}: z.infer<typeof verifyTaskSchema>) {
  const task = await getTaskById(taskId);

  if (!task) {
    return {
      content: [
        {
          type: "text" as const,
          text: `## 系統錯誤\n\n找不到ID為 \`${taskId}\` 的任務。請使用「list_tasks」工具確認有效的任務ID後再試。`,
          // text: `## System Error\n\nCannot find task with ID \`${taskId}\`. Please use the "list_tasks" tool to confirm a valid task ID and try again.`,
        },
      ],
      isError: true,
    };
  }

  if (task.status !== TaskStatus.IN_PROGRESS) {
    return {
      content: [
        {
          type: "text" as const,
          text: `## 狀態錯誤\n\n任務 "${task.name}" (ID: \`${task.id}\`) 當前狀態為 "${task.status}"，不處於進行中狀態，無法進行檢驗。\n\n只有狀態為「進行中」的任務才能進行檢驗。請先使用「execute_task」工具開始任務執行。`,
          // text: `## Status Error\n\nTask "${task.name}" (ID: \`${task.id}\`) current status is "${task.status}", not in progress state, cannot be verified.\n\nOnly tasks with "In Progress" status can be verified. Please use the "execute_task" tool to start task execution first.`,
        },
      ],
      isError: true,
    };
  }

  if (score >= 80) {
    // 自動應用豐富完成文檔（如果適用）
    // Automatically apply rich completion documentation (if applicable)
    if (shouldApplyRichCompletion(summary, score)) {
      try {
        // 獲取執行上下文（由代理報告或推斷）
        // Get execution context (reported by agents or inferred)
        let executionContext = getExecutionContext(taskId);
        
        // 如果沒有明確的執行上下文，嘗試從任務中推斷
        // If no explicit execution context, try to infer from task
        if (!executionContext) {
          executionContext = inferExecutionContext(task);
        }
        
        const context: TaskVerificationContext = {
          task,
          summary,
          score,
          executionContext
        };
        
        const enhancedNotes = await autoApplyRichCompletion(context);
        
        // 更新任務的筆記與摘要
        // Update task notes and summary
        await updateTaskContent(taskId, { notes: enhancedNotes });
        await updateTaskSummary(taskId, summary);
        await updateTaskStatus(taskId, TaskStatus.COMPLETED);
        
        // 清理執行上下文
        // Clean up execution context
        cleanupExecutionContext(taskId);
      } catch (error) {
        console.error('Error applying automatic rich completion:', error);
        // 如果豐富完成失敗，繼續正常完成流程
        // If rich completion fails, continue with normal completion flow
        await updateTaskSummary(taskId, summary);
        await updateTaskStatus(taskId, TaskStatus.COMPLETED);
        cleanupExecutionContext(taskId);
      }
    } else {
      // 不應用豐富完成，使用標準完成流程
      // Don't apply rich completion, use standard completion flow
      await updateTaskSummary(taskId, summary);
      await updateTaskStatus(taskId, TaskStatus.COMPLETED);
    }
  }

  // 使用prompt生成器獲取最終prompt
  // Use prompt generator to get final prompt
  const prompt = await getVerifyTaskPrompt({ task, score, summary });

  return {
    content: [
      {
        type: "text" as const,
        text: prompt,
      },
    ],
  };
}
