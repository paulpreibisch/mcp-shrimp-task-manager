import { z } from "zod";
import { UUID_V4_REGEX } from "../../utils/regex.js";
import {
  getTaskById,
  updateTaskStatus,
  updateTaskSummary,
} from "../../models/taskModel.js";
import { TaskStatus } from "../../types/index.js";
import { getVerifyTaskPrompt } from "../../prompts/index.js";
// Import the completion summary parser - assuming it's available in the project
// If not available, we'll create a simplified version
interface TaskCompletionDetails {
  keyAccomplishments: string[];
  implementationDetails: string[];
  technicalChallenges: string[];
  completedAt: Date;
  verificationScore: number;
}

// Simple parser function for extracting structured data from summary
function parseCompletionSummary(summary: string): TaskCompletionDetails {
  const result: TaskCompletionDetails = {
    keyAccomplishments: [],
    implementationDetails: [],
    technicalChallenges: [],
    completedAt: new Date(),
    verificationScore: 0
  };
  
  if (!summary) return result;
  
  // Extract sections using simple patterns
  const lines = summary.split('\n');
  let currentSection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check for section headers
    if (/accomplishment|achievement|complete/i.test(trimmedLine)) {
      currentSection = 'accomplishments';
    } else if (/implementation|detail|technical/i.test(trimmedLine)) {
      currentSection = 'implementation';
    } else if (/challenge|issue|problem/i.test(trimmedLine)) {
      currentSection = 'challenges';
    } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
      // Extract bullet points
      const content = trimmedLine.substring(1).trim();
      if (content) {
        switch (currentSection) {
          case 'accomplishments':
            result.keyAccomplishments.push(content);
            break;
          case 'implementation':
            result.implementationDetails.push(content);
            break;
          case 'challenges':
            result.technicalChallenges.push(content);
            break;
        }
      }
    }
  }
  
  return result;
}

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
  
  // Optional structured completion fields
  keyAccomplishments: z
    .array(z.string())
    .optional()
    .describe("關鍵成就清單，列出任務完成的主要成果"),
    // .describe("List of key accomplishments, listing main achievements of task completion")
  
  implementationDetails: z
    .array(z.string())
    .optional()
    .describe("實施細節清單，描述技術實現的具體方法和步驟"),
    // .describe("List of implementation details, describing specific methods and steps of technical implementation")
  
  technicalChallenges: z
    .array(z.string())
    .optional()
    .describe("技術挑戰清單，記錄遇到的困難及解決方案"),
    // .describe("List of technical challenges, recording difficulties encountered and solutions")
});

export async function verifyTask({
  taskId,
  summary,
  score,
  keyAccomplishments,
  implementationDetails,
  technicalChallenges,
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
    // 完成任務並保存摘要
    // Complete task and save summary
    
    // Parse summary to extract structured data if not provided
    let completionDetails = null;
    try {
      const parsedDetails = parseCompletionSummary(summary);
      
      // Merge provided structured fields with parsed data
      completionDetails = {
        keyAccomplishments: keyAccomplishments || parsedDetails.keyAccomplishments,
        implementationDetails: implementationDetails || parsedDetails.implementationDetails,
        technicalChallenges: technicalChallenges || parsedDetails.technicalChallenges,
        completedAt: new Date(),
        verificationScore: score
      };
    } catch (error) {
      // If parsing fails, use provided fields if any
      if (keyAccomplishments || implementationDetails || technicalChallenges) {
        completionDetails = {
          keyAccomplishments: keyAccomplishments || [],
          implementationDetails: implementationDetails || [],
          technicalChallenges: technicalChallenges || [],
          completedAt: new Date(),
          verificationScore: score
        };
      }
    }
    
    // Update task with summary and completion details
    await updateTaskSummary(taskId, summary, completionDetails);
    await updateTaskStatus(taskId, TaskStatus.COMPLETED);
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
