/**
 * BMAD (Business-Minded Agent Development) type definitions
 * for MadShrimp integration
 */

export interface VerificationResult {
  storyId: string;
  score: number;        // 0-100
  summary: string;
  implementationDetails: string[];
  keyAccomplishments: string[];
  technicalChallenges: string[];
  performanceMetrics?: Record<string, any>;
  timestamp: Date;
}

export interface StoryFile {
  id: string;           // Format: "1.1", "1.2", etc.
  title: string;
  status: StoryStatus;
  description: string;
  acceptanceCriteria: string[];
  filePath: string;
  lastModified: Date;
  epicId?: string;
  parallelWork?: {
    multiDevOK: boolean;
    reason: string;
  };
}

export interface Epic {
  id: string;           // Format: "1", "2", etc.
  title: string;
  description: string;
  stories: StoryFile[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
  verificationSummary?: {
    averageScore: number;
    storiesWithIssues: string[];
  };
}

export type StoryStatus = 'Draft' | 'Ready' | 'In Progress' | 'Done' | 'Ready for Review';

export interface FileWatchEvent {
  eventType: 'change' | 'rename';
  filename: string;
  filePath: string;
  timestamp: Date;
}

export interface AutoVerifyRequest {
  storyId: string;
  storyPath: string;
  triggerReason: 'status_change' | 'manual_trigger';
}

export interface AutoVerifyResponse {
  success: boolean;
  verificationId?: string;
  error?: string;
  timestamp: Date;
}

export interface VerificationQuery {
  storyId?: string;
  epicId?: string;
  scoreThreshold?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface BMADAgentRecord {
  agentModel: string;
  debugLogReferences: string[];
  completionNotes: string;
  changeLog: Array<{
    date: string;
    change: string;
    author: string;
  }>;
}

// Utility type for parsing story files
export interface ParsedStoryFile {
  frontmatter: {
    title: string;
    status: StoryStatus;
    story: string;
    acceptanceCriteria: string[];
  };
  sections: {
    devNotes?: string;
    tasks?: string[];
    integrationVerification?: string[];
    testing?: string;
    fileList?: string[];
    devAgentRecord?: BMADAgentRecord;
  };
  rawContent: string;
}