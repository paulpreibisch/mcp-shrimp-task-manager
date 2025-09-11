# MadShrimp Integration Architecture

## Tech Stack

### Frontend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework for task viewer dashboard |
| TanStack Table | 8.x | Data grid for story/task visualization |
| HeadlessUI | 1.x | Accessible UI components for tabs and modals |
| Tailwind CSS | 3.x | Utility-first CSS framework |
| TypeScript | 5.x | Type safety for frontend code |

### Backend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Server runtime |
| Express | 4.x | Web server for API endpoints |
| MCP Protocol | Latest | Model Context Protocol for tool integration |
| TypeScript | 5.x | Type safety for backend code |
| File System Watch | Native | Story completion detection |

### BMAD Integration
| Component | Type | Purpose |
|-----------|------|---------|
| BMAD Agents | Markdown/YAML | Conversational CLI agents |
| MadShrimp Agent | Markdown | Enhanced PM agent with verification |
| Story Files | Markdown | BMAD story format compatibility |
| PRD Files | Markdown | Product requirements documentation |

## System Architecture

### Component Overview
```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Interface                           │
│  /madshrimp command → Conversational Agent                  │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                  MadShrimp Agent Layer                      │
│  • BMAD PM capabilities                                     │
│  • Auto-verification triggers                               │
│  • Story status monitoring                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┬─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  BMAD Core    │ │   MCP Tools   │ │ File System   │
│  • Stories    │ │ • Verify      │ │ • Watch       │
│  • PRD        │ │ • Dashboard   │ │ • Sync        │
│  • Epics      │ │ • Edit        │ │               │
└───────────────┘ └───────────────┘ └───────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Visual Dashboard (React)                       │
│  • Nested Tab Structure                                     │
│  • Epic Organization                                        │
│  • Story Editing                                           │
│  • Verification Display                                     │
└─────────────────────────────────────────────────────────────┘
```

## UI Architecture - Nested Tab Structure

### Primary Tab Level
```typescript
interface PrimaryTabs {
  tasks: TasksTab;        // Existing Shrimp tasks
  bmad: BMADTab;         // New BMAD integration tab
  history: HistoryTab;   // Task history
  agents: AgentsTab;     // Agent management
  settings: SettingsTab; // Configuration
  archive: ArchiveTab;   // Archived tasks
}
```

### BMAD Tab - Nested Structure
```typescript
interface BMADTab {
  overview: {
    epicProgress: EpicProgressView;
    verificationSummary: VerificationDashboard;
  };
  epics: {
    [epicId: string]: EpicTab; // Dynamic epic tabs
  };
  prd: {
    view: PRDViewer;
    edit: PRDEditor;
  };
  stories: {
    grid: StoryGridView;  // All stories in grid
    board: StoryBoardView; // Kanban board view
  };
}
```

### Epic Tab - Nested Story Structure
```typescript
interface EpicTab {
  id: string;
  title: string;
  stories: {
    [storyId: string]: StoryPanel;
  };
  progress: EpicProgressIndicator;
}

interface StoryPanel {
  header: {
    number: string;      // "1.1", "1.2", etc.
    title: string;
    status: StoryStatus;
    parallelIndicator: "👥" | "👤";
  };
  content: {
    description: MarkdownContent;
    acceptanceCriteria: AcceptanceCriteria[];
    verification: VerificationResults | null;
  };
  actions: {
    edit: () => void;
    verify: () => void;
    viewDetails: () => void;
  };
}
```

## Project Structure

```
/home/fire/claude/mcp-shrimp-task-manager/
├── src/
│   ├── tools/
│   │   ├── bmad/
│   │   │   ├── auto-verify.ts
│   │   │   ├── story-dashboard.ts
│   │   │   ├── epic-organizer.ts
│   │   │   └── story-editor.ts
│   │   └── task/
│   │       └── [existing task tools]
│   ├── types/
│   │   ├── bmad.ts          # BMAD integration types
│   │   └── index.ts         # Extended with BMAD types
│   └── utils/
│       └── bmad-sync.ts     # File system sync utilities
├── tools/
│   └── task-viewer/
│       ├── src/
│       │   ├── components/
│       │   │   ├── BMADView.jsx        # Main BMAD tab component
│       │   │   ├── EpicTabs.jsx        # Epic tab navigation
│       │   │   ├── StoryPanel.jsx      # Story display/edit panel
│       │   │   ├── PRDEditor.jsx       # PRD editing component
│       │   │   ├── VerificationView.jsx # Verification results
│       │   │   └── NestedTabs.jsx      # Enhanced with BMAD tab
│       │   └── utils/
│       │       ├── bmad-api.js         # BMAD API client
│       │       └── story-sync.js       # Story file sync
│       └── server.js                    # Extended with BMAD endpoints
├── agents/
│   └── madshrimp.md                    # MadShrimp conversational agent
├── docs/
│   ├── prd/
│   │   ├── index.md
│   │   └── epic-1-*.md                 # Sharded epic file
│   ├── architecture/
│   │   ├── index.md
│   │   ├── tech-stack.md
│   │   ├── source-tree.md
│   │   ├── coding-standards.md
│   │   └── ui-architecture.md
│   └── stories/
│       └── [story files]
└── .bmad-core/
    └── core-config.yaml

```

## Coding Standards

### TypeScript Standards
- Use strict mode for all TypeScript files
- Define interfaces for all data structures
- Use type guards for runtime type checking
- Prefer const assertions for literal types
- Use generics for reusable components

### React Component Standards
- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for performance optimization
- Follow container/presenter pattern for complex components
- Use custom hooks for shared logic

### File Naming Conventions
- React components: PascalCase (StoryPanel.jsx)
- Utilities: camelCase (storySync.js)
- Types: PascalCase with .ts extension (BMADTypes.ts)
- MCP tools: kebab-case (auto-verify.ts)
- BMAD agents: kebab-case (madshrimp.md)

### API Endpoint Conventions
```
GET    /api/bmad/stories           - List all stories
GET    /api/bmad/stories/:id       - Get specific story
PUT    /api/bmad/stories/:id       - Update story
GET    /api/bmad/epics             - List all epics
GET    /api/bmad/verification/:id  - Get verification results
POST   /api/bmad/verify            - Trigger verification
GET    /api/bmad/prd               - Get PRD content
PUT    /api/bmad/prd               - Update PRD content
```

### State Management
- Use React Context for global state (user preferences, theme)
- Use component state for UI state (modals, form inputs)
- Use server state caching for API data
- Implement optimistic updates for better UX

### Tab Navigation Best Practices
- Lazy load tab content for performance
- Maintain tab state in URL for deep linking
- Use keyboard navigation (Tab, Shift+Tab, Arrow keys)
- Implement proper ARIA labels for accessibility
- Show loading states for async content

## Data Models

### Story Model
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

### Epic Model
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

### Verification Model
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

## Integration Points

### File System Watching
- Monitor `docs/stories/` directory for status changes
- Watch `docs/prd/` for PRD updates
- Debounce rapid changes (500ms)
- Handle file locks gracefully

### MCP Tool Integration
```typescript
// Auto-verification trigger
mcp__shrimp_task_manager__auto_verify_bmad_story({
  storyPath: string,
  storyContent: string,
  epicContext: string
});

// Dashboard update
mcp__shrimp_task_manager__update_story_dashboard({
  stories: BMADStory[],
  epics: BMADEpic[],
  verifications: VerificationResult[]
});

// Story editing
mcp__shrimp_task_manager__edit_bmad_story({
  storyId: string,
  updates: Partial<BMADStory>
});
```

### BMAD Agent Communication
- Agent reads story files directly from file system
- Agent triggers MCP tools via function calls
- Verification results stored in `.ai/verification/` directory
- Status updates propagate through file system events

## Testing Strategy

### Unit Testing
- Test MCP tool functions in isolation
- Test React component rendering and interactions
- Test file system sync utilities
- Test BMAD story parsing and formatting

### Integration Testing
- Test story completion → verification flow
- Test visual dashboard real-time updates
- Test concurrent editing scenarios
- Test BMAD agent → MCP tool communication

### E2E Testing
- Test complete workflow: story creation → implementation → verification
- Test tab navigation and deep linking
- Test editing through both CLI and visual interface
- Test conflict resolution scenarios

## Performance Considerations

### Frontend Optimization
- Virtualize long story lists (React Window)
- Lazy load verification details
- Implement progressive disclosure for nested tabs
- Cache API responses with SWR or React Query

### Backend Optimization
- Batch file system operations
- Implement connection pooling for API requests
- Use worker threads for verification processing
- Cache frequently accessed story data

### Real-time Updates
- Use Server-Sent Events for dashboard updates
- Implement optimistic UI updates
- Debounce rapid status changes
- Use WebSocket for bi-directional editing

## Security Considerations

### File System Access
- Validate all file paths to prevent directory traversal
- Implement proper file permissions
- Sanitize story content before display
- Use atomic file operations for updates

### API Security
- Implement rate limiting on API endpoints
- Validate all input data
- Use CORS appropriately
- Implement proper error handling without exposing internals

## Deployment Configuration

### Environment Variables
```bash
# MadShrimp Configuration
MADSHRIMP_ENABLED=true
BMAD_STORY_PATH=./docs/stories
BMAD_PRD_PATH=./docs/prd
VERIFICATION_TIMEOUT=30000
AUTO_VERIFY_ENABLED=true
PARALLEL_WORK_INDICATORS=true
```

### Build Configuration
```json
{
  "scripts": {
    "build:madshrimp": "tsc -p src/tools/bmad",
    "dev:viewer": "cd tools/task-viewer && npm run dev",
    "test:integration": "jest --config=jest.integration.config.js"
  }
}
```