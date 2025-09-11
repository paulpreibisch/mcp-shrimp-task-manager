# Data Models

## Story Model
```typescript
interface BMADStory {
  id: string;           // "1.1", "1.2", etc.
  epicId: string;       // "epic-1"
  title: string;
  description: string;
  status: 'Draft' | 'In Progress' | 'Ready for Review' | 'Done';
  acceptanceCriteria: string[];
  multiDevOK: boolean;  // Parallel work indicator
  verification?: {
    score: number;
    implementationDetails: string[];
    technicalChallenges: string[];
    completedAt: Date;
  };
  filePath: string;     // Path to .story.md file
  lastModified: Date;
}
```

## Epic Model
```typescript
interface BMADEpic {
  id: string;
  number: number;
  title: string;
  goal: string;
  stories: BMADStory[];
  progress: {
    total: number;
    completed: number;
    inProgress: number;
    percentage: number;
  };
}
```

## Verification Model
```typescript
interface VerificationResult {
  storyId: string;
  score: number;        // 0-100
  summary: string;
  implementationDetails: string[];
  keyAccomplishments: string[];
  technicalChallenges: string[];
  performanceMetrics?: Record<string, any>;
  timestamp: Date;
}
```
