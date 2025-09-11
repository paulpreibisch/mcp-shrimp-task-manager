# Source Tree - MadShrimp Integration

## Project Root Structure
```
/home/fire/claude/mcp-shrimp-task-manager/
├── src/                          # Main source code directory
├── tools/                        # Development tools and viewer
├── agents/                       # BMAD agent definitions
├── docs/                         # Documentation
├── .bmad-core/                   # BMAD configuration
├── package.json                  # Project dependencies
└── tsconfig.json                # TypeScript configuration
```

## Core Source Structure (`src/`)
```
src/
├── tools/                        # MCP tool implementations
│   ├── bmad/                    # NEW: BMAD integration tools
│   │   ├── auto-verify.ts      # Auto-verification tool
│   │   ├── story-dashboard.ts  # Dashboard update tool
│   │   ├── epic-organizer.ts   # Epic organization tool
│   │   ├── story-editor.ts     # Story editing tool
│   │   └── prd-editor.ts       # PRD editing tool
│   └── task/                    # Existing task tools
│       ├── analyzeTool.ts
│       ├── executeTask.ts
│       └── verifyTask.ts
├── types/                       # TypeScript type definitions
│   ├── index.ts                # Core types (extended with BMAD)
│   └── bmad.ts                 # NEW: BMAD-specific types
└── utils/                       # Utility functions
    ├── bmad-sync.ts            # NEW: File sync utilities
    └── file-watcher.ts         # NEW: Story status monitoring
```

## Visual Interface Structure (`tools/task-viewer/`)
```
tools/task-viewer/
├── src/
│   ├── components/
│   │   ├── BMADView.jsx        # Main BMAD tab component
│   │   ├── EpicTabs.jsx        # NEW: Epic tab navigation
│   │   ├── StoryPanel.jsx      # NEW: Story display/edit
│   │   ├── StoryGrid.jsx       # NEW: Story grid view
│   │   ├── PRDEditor.jsx       # NEW: PRD editing component
│   │   ├── VerificationView.jsx # NEW: Verification display
│   │   ├── ParallelIndicator.jsx # NEW: Multi-dev indicators
│   │   └── NestedTabs.jsx      # MODIFIED: Add BMAD tab
│   ├── utils/
│   │   ├── bmad-api.js         # NEW: BMAD API client
│   │   ├── story-sync.js       # NEW: Story file sync
│   │   └── verification.js     # NEW: Verification utilities
│   └── App.jsx                  # MODIFIED: Include BMAD routes
├── server.js                    # MODIFIED: Add BMAD endpoints
└── package.json
```

## Documentation Structure (`docs/`)
```
docs/
├── prd/                         # Sharded PRD files
│   ├── index.md                # PRD table of contents
│   ├── intro-project-analysis-and-context.md
│   ├── requirements.md
│   ├── technical-constraints-and-integration-requirements.md
│   ├── required-new-mcp-tools.md
│   ├── epic-and-story-structure.md
│   └── epic-1-madshrimp-integration-*.md
├── architecture/                # Sharded architecture files
│   ├── index.md                # Architecture TOC
│   ├── tech-stack.md           # Technology stack
│   ├── source-tree.md          # THIS FILE
│   ├── coding-standards.md     # Coding conventions
│   ├── ui-architecture-nested-tab-structure.md
│   ├── data-models.md
│   ├── integration-points.md
│   └── [other architecture files]
└── stories/                     # BMAD story files
    ├── 1.1.story.md            # Story 1.1
    ├── 1.2.story.md            # Story 1.2
    └── [additional stories]
```

## Agent Structure (`agents/`)
```
agents/
└── madshrimp.md                # NEW: MadShrimp conversational agent
    ├── YAML Configuration Block
    ├── Commands Section
    ├── Dependencies Section
    └── Persona Definition
```

## Configuration Structure (`.bmad-core/`)
```
.bmad-core/
├── core-config.yaml            # BMAD configuration
│   ├── markdownExploder: true
│   ├── prd configuration
│   ├── architecture configuration
│   └── devLoadAlwaysFiles
└── [other BMAD core files if present]
```

## Key File Locations for Development

### Files Dev Agent Must Create
```
NEW FILES TO CREATE:
├── /agents/madshrimp.md
├── /src/tools/bmad/*.ts (all 5 tools)
├── /src/types/bmad.ts
├── /src/utils/bmad-sync.ts
├── /src/utils/file-watcher.ts
├── /tools/task-viewer/src/components/EpicTabs.jsx
├── /tools/task-viewer/src/components/StoryPanel.jsx
├── /tools/task-viewer/src/components/StoryGrid.jsx
├── /tools/task-viewer/src/components/PRDEditor.jsx
├── /tools/task-viewer/src/components/VerificationView.jsx
├── /tools/task-viewer/src/components/ParallelIndicator.jsx
├── /tools/task-viewer/src/utils/bmad-api.js
├── /tools/task-viewer/src/utils/story-sync.js
└── /tools/task-viewer/src/utils/verification.js
```

### Files Dev Agent Must Modify
```
EXISTING FILES TO MODIFY:
├── /src/types/index.ts         # Add BMAD type exports
├── /tools/task-viewer/src/components/BMADView.jsx
├── /tools/task-viewer/src/components/NestedTabs.jsx
├── /tools/task-viewer/src/App.jsx
└── /tools/task-viewer/server.js
```

## Import Path Examples

### TypeScript Imports (src/)
```typescript
// From auto-verify.ts
import { BMADStory, VerificationResult } from '../../types/bmad';
import { syncStoryFile } from '../../utils/bmad-sync';
import { watchStoryStatus } from '../../utils/file-watcher';
```

### React Component Imports (tools/task-viewer/)
```javascript
// From EpicTabs.jsx
import { StoryPanel } from './StoryPanel';
import { VerificationView } from './VerificationView';
import { fetchBMADStories } from '../utils/bmad-api';
```

## API Endpoint Structure
```
Server endpoints to add to tools/task-viewer/server.js:

GET    /api/bmad/stories           # List all stories
GET    /api/bmad/stories/:id       # Get specific story
PUT    /api/bmad/stories/:id       # Update story
GET    /api/bmad/epics             # List all epics
GET    /api/bmad/verification/:id  # Get verification results
POST   /api/bmad/verify            # Trigger verification
GET    /api/bmad/prd               # Get PRD content
PUT    /api/bmad/prd               # Update PRD content
```

## Component Hierarchy

### Tab Structure
```
App
└── NestedTabs
    └── BMADView (when BMAD tab selected)
        ├── Overview Tab
        │   ├── EpicProgressView
        │   └── VerificationDashboard
        ├── Epics Tab (nested)
        │   └── EpicTabs
        │       └── StoryPanel (per story)
        │           ├── ParallelIndicator
        │           └── VerificationView
        ├── PRD Tab
        │   └── PRDEditor
        └── Stories Tab
            └── StoryGrid
```

## File Naming Conventions

### Component Files
- React Components: `PascalCase.jsx` (e.g., `StoryPanel.jsx`)
- Utilities: `camelCase.js` (e.g., `storySync.js`)
- Types: `camelCase.ts` (e.g., `bmad.ts`)
- MCP Tools: `kebab-case.ts` (e.g., `auto-verify.ts`)

### Documentation Files
- Markdown: `kebab-case.md` (e.g., `coding-standards.md`)
- Stories: `{epic}.{story}.story.md` (e.g., `1.1.story.md`)
- Epics: `epic-{n}-*.md` (e.g., `epic-1-madshrimp-integration.md`)

## Development Notes

1. **Start with Story 1.1**: Create the MadShrimp agent first
2. **Test file watching**: Ensure story status changes are detected
3. **Tab navigation**: Implement lazy loading for performance
4. **State management**: Use React Context for BMAD state
5. **Error handling**: Graceful fallbacks for verification failures
6. **Accessibility**: Ensure all tabs are keyboard navigable