// 任務狀態枚舉：定義任務在工作流程中的當前階段
// Task status enumeration: Defines the current stage of tasks in the workflow
export enum TaskStatus {
  PENDING = "pending", // 已創建但尚未開始執行的任務
  // PENDING = "pending", // Created but not yet started tasks
  IN_PROGRESS = "in_progress", // 當前正在執行的任務
  // IN_PROGRESS = "in_progress", // Currently executing tasks
  COMPLETED = "completed", // 已成功完成並通過驗證的任務
  // COMPLETED = "completed", // Successfully completed and verified tasks
  BLOCKED = "blocked", // 由於依賴關係而暫時無法執行的任務
  // BLOCKED = "blocked", // Tasks temporarily unable to execute due to dependencies
}

// 任務依賴關係：定義任務之間的前置條件關係
// Task dependency: Defines prerequisite relationships between tasks
export interface TaskDependency {
  taskId: string; // 前置任務的唯一標識符，當前任務執行前必須完成此依賴任務
  // taskId: string; // Unique identifier of prerequisite task, must be completed before current task execution
}

// 相關文件類型：定義文件與任務的關係類型
// Related file type: Defines the relationship type between files and tasks
export enum RelatedFileType {
  TO_MODIFY = "TO_MODIFY", // 需要在任務中修改的文件
  // TO_MODIFY = "TO_MODIFY", // Files that need to be modified in the task
  REFERENCE = "REFERENCE", // 任務的參考資料或相關文檔
  // REFERENCE = "REFERENCE", // Reference materials or related documents for the task
  CREATE = "CREATE", // 需要在任務中建立的文件
  // CREATE = "CREATE", // Files that need to be created in the task
  DEPENDENCY = "DEPENDENCY", // 任務依賴的組件或庫文件
  // DEPENDENCY = "DEPENDENCY", // Components or library files that the task depends on
  OTHER = "OTHER", // 其他類型的相關文件
  // OTHER = "OTHER", // Other types of related files
}

// 相關文件：定義任務相關的文件信息
// Related file: Defines file information related to tasks
export interface RelatedFile {
  path: string; // 文件路徑，可以是相對於項目根目錄的路徑或絕對路徑
  // path: string; // File path, can be relative to project root or absolute path
  type: RelatedFileType; // 文件與任務的關係類型
  // type: RelatedFileType; // Relationship type between file and task
  description?: string; // 文件的補充描述，說明其與任務的具體關係或用途
  // description?: string; // Supplementary description of the file, explaining its specific relationship or purpose with the task
  lineStart?: number; // 相關代碼區塊的起始行（選填）
  // lineStart?: number; // Starting line of related code block (optional)
  lineEnd?: number; // 相關代碼區塊的結束行（選填）
  // lineEnd?: number; // Ending line of related code block (optional)
}

// 任務介面：定義任務的完整數據結構
// Task interface: Defines the complete data structure of tasks
export interface Task {
  id: string; // 任務的唯一標識符
  // id: string; // Unique identifier of the task
  name: string; // 簡潔明確的任務名稱
  // name: string; // Concise and clear task name
  description: string; // 詳細的任務描述，包含實施要點和驗收標準
  // description: string; // Detailed task description, including implementation points and acceptance criteria
  notes?: string; // 補充說明、特殊處理要求或實施建議（選填）
  // notes?: string; // Supplementary notes, special handling requirements or implementation suggestions (optional)
  status: TaskStatus; // 任務當前的執行狀態
  // status: TaskStatus; // Current execution status of the task
  dependencies: TaskDependency[]; // 任務的前置依賴關係列表
  // dependencies: TaskDependency[]; // List of prerequisite dependencies for the task
  createdAt: Date; // 任務創建的時間戳
  // createdAt: Date; // Timestamp when the task was created
  updatedAt: Date; // 任務最後更新的時間戳
  // updatedAt: Date; // Timestamp of last task update
  completedAt?: Date; // 任務完成的時間戳（僅適用於已完成的任務）
  // completedAt?: Date; // Timestamp when task was completed (only for completed tasks)
  summary?: string; // 任務完成摘要，簡潔描述實施結果和重要決策（僅適用於已完成的任務）
  // summary?: string; // Task completion summary, briefly describing implementation results and important decisions (only for completed tasks)
  relatedFiles?: RelatedFile[]; // 與任務相關的文件列表（選填）
  // relatedFiles?: RelatedFile[]; // List of files related to the task (optional)

  // 新增欄位：保存完整的技術分析結果
  // New field: Save complete technical analysis results
  analysisResult?: string; // 來自 analyze_task 和 reflect_task 階段的完整分析結果
  // analysisResult?: string; // Complete analysis results from analyze_task and reflect_task stages
  
  // 代理系統相關欄位
  // Agent system related fields
  agent?: string; // 最適合處理此任務的代理類型
  // agent?: string; // The most suitable agent type to handle this task

  // 新增欄位：保存具體的實現指南
  // New field: Save specific implementation guide
  implementationGuide?: string; // 具體的實現方法、步驟和建議
  // implementationGuide?: string; // Specific implementation methods, steps and recommendations

  // 新增欄位：保存驗證標準和檢驗方法
  // New field: Save verification standards and inspection methods
  verificationCriteria?: string; // 明確的驗證標準、測試要點和驗收條件
  // verificationCriteria?: string; // Clear verification standards, test points and acceptance conditions
}

// 任務複雜度級別：定義任務的複雜程度分類
// Task complexity level: Defines task complexity classification
export enum TaskComplexityLevel {
  LOW = "低複雜度", // 簡單且直接的任務，通常不需要特殊處理
  // LOW = "Low Complexity", // Simple and straightforward tasks, usually no special handling required
  MEDIUM = "中等複雜度", // 具有一定複雜性但仍可管理的任務
  // MEDIUM = "Medium Complexity", // Tasks with some complexity but still manageable
  HIGH = "高複雜度", // 複雜且耗時的任務，需要特別關注
  // HIGH = "High Complexity", // Complex and time-consuming tasks that require special attention
  VERY_HIGH = "極高複雜度", // 極其複雜的任務，建議拆分處理
  // VERY_HIGH = "Very High Complexity", // Extremely complex tasks, recommended to be split for processing
}

// 任務複雜度閾值：定義任務複雜度評估的參考標準
// Task complexity thresholds: Defines reference standards for task complexity assessment
export const TaskComplexityThresholds = {
  DESCRIPTION_LENGTH: {
    MEDIUM: 500, // 超過此字數判定為中等複雜度
    // MEDIUM: 500, // Above this word count is classified as medium complexity
    HIGH: 1000, // 超過此字數判定為高複雜度
    // HIGH: 1000, // Above this word count is classified as high complexity
    VERY_HIGH: 2000, // 超過此字數判定為極高複雜度
    // VERY_HIGH: 2000, // Above this word count is classified as very high complexity
  },
  DEPENDENCIES_COUNT: {
    MEDIUM: 2, // 超過此依賴數量判定為中等複雜度
    // MEDIUM: 2, // Above this dependency count is classified as medium complexity
    HIGH: 5, // 超過此依賴數量判定為高複雜度
    // HIGH: 5, // Above this dependency count is classified as high complexity
    VERY_HIGH: 10, // 超過此依賴數量判定為極高複雜度
    // VERY_HIGH: 10, // Above this dependency count is classified as very high complexity
  },
  NOTES_LENGTH: {
    MEDIUM: 200, // 超過此字數判定為中等複雜度
    // MEDIUM: 200, // Above this word count is classified as medium complexity
    HIGH: 500, // 超過此字數判定為高複雜度
    // HIGH: 500, // Above this word count is classified as high complexity
    VERY_HIGH: 1000, // 超過此字數判定為極高複雜度
    // VERY_HIGH: 1000, // Above this word count is classified as very high complexity
  },
};

// 任務複雜度評估結果：記錄任務複雜度分析的詳細結果
// Task complexity assessment result: Records detailed results of task complexity analysis
export interface TaskComplexityAssessment {
  level: TaskComplexityLevel; // 整體複雜度級別
  // level: TaskComplexityLevel; // Overall complexity level
  metrics: {
    // 各項評估指標的詳細數據
    // Detailed data of various assessment metrics
    descriptionLength: number; // 描述長度
    // descriptionLength: number; // Description length
    dependenciesCount: number; // 依賴數量
    // dependenciesCount: number; // Dependencies count
    notesLength: number; // 注記長度
    // notesLength: number; // Notes length
    hasNotes: boolean; // 是否有注記
    // hasNotes: boolean; // Whether there are notes
  };
  recommendations: string[]; // 處理建議列表
  // recommendations: string[]; // List of processing recommendations
}

// 任務數據結構：包含任務列表和初始請求
// Tasks data structure: Contains task list and initial request
export interface TasksData {
  tasks: Task[];
  initialRequest?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
