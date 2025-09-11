# Unified Project Structure - MadShrimp Integration

## Overview
This document provides the definitive project structure for the MadShrimp integration, showing exactly where each component belongs and how the nested tab UI architecture maps to the file system.

## Complete Project Structure

```
/home/fire/claude/mcp-shrimp-task-manager/
│
├── agents/
│   └── madshrimp.md                    # MadShrimp conversational agent
│
├── src/
│   ├── tools/
│   │   ├── bmad/                       # BMAD integration MCP tools
│   │   │   ├── auto-verify.ts         # Auto-verification when stories complete
│   │   │   ├── story-dashboard.ts     # Update visual dashboard
│   │   │   ├── epic-organizer.ts      # Organize stories by epic
│   │   │   ├── story-editor.ts        # Edit stories via UI
│   │   │   └── prd-editor.ts          # Edit PRD via UI
│   │   └── task/                       # Existing Shrimp task tools
│   │       └── [existing tools]
│   │
│   ├── types/
│   │   ├── index.ts                   # Extended with BMAD exports
│   │   └── bmad.ts                    # BMAD type definitions
│   │
│   └── utils/
│       ├── bmad-sync.ts               # Story file synchronization
│       └── file-watcher.ts            # Monitor story status changes
│
├── tools/
│   └── task-viewer/
│       ├── src/
│       │   ├── components/            # React UI components
│       │   │   │
│       │   │   ├── BMADView.jsx      # Main BMAD tab container
│       │   │   │   └── Renders nested tab structure:
│       │   │   │       ├── Overview (default)
│       │   │   │       ├── Epics (nested tabs)
│       │   │   │       ├── PRD
│       │   │   │       └── Stories
│       │   │   │
│       │   │   ├── EpicTabs.jsx      # Epic navigation tabs
│       │   │   │   └── Renders one tab per epic:
│       │   │   │       ├── Epic 1 Tab
│       │   │   │       ├── Epic 2 Tab
│       │   │   │       └── Epic N Tab
│       │   │   │
│       │   │   ├── StoryPanel.jsx    # Individual story display
│       │   │   │   └── Components:
│       │   │   │       ├── Story header (number, title, status)
│       │   │   │       ├── Parallel indicator (👥/👤)
│       │   │   │       ├── Story content (editable)
│       │   │   │       └── Verification results
│       │   │   │
│       │   │   ├── StoryGrid.jsx     # Grid view of all stories
│       │   │   │   └── TanStack Table implementation
│       │   │   │
│       │   │   ├── PRDEditor.jsx     # PRD editing interface
│       │   │   │   └── Rich text markdown editor
│       │   │   │
│       │   │   ├── VerificationView.jsx  # Verification results display
│       │   │   │   └── Shows score, details, challenges
│       │   │   │
│       │   │   ├── ParallelIndicator.jsx # Multi-dev work indicator
│       │   │   │   └── Renders 👥 or 👤 icon
│       │   │   │
│       │   │   └── NestedTabs.jsx    # Modified to include BMAD tab
│       │   │
│       │   ├── utils/
│       │   │   ├── bmad-api.js       # BMAD API client functions
│       │   │   ├── story-sync.js     # Story file synchronization
│       │   │   └── verification.js   # Verification data handling
│       │   │
│       │   └── App.jsx                # Modified with BMAD routes
│       │
│       └── server.js                  # Extended with BMAD endpoints
│
├── docs/
│   ├── prd/                          # Product Requirements
│   │   ├── index.md
│   │   ├── requirements.md
│   │   └── epic-1-madshrimp-integration-*.md
│   │
│   ├── architecture/                 # Technical Documentation
│   │   ├── index.md
│   │   ├── tech-stack.md
│   │   ├── source-tree.md
│   │   ├── unified-project-structure.md  # THIS FILE
│   │   ├── coding-standards.md
│   │   ├── ui-architecture-nested-tab-structure.md
│   │   └── data-models.md
│   │
│   └── stories/                      # BMAD story files
│       ├── 1.1.story.md              # Create MadShrimp agent
│       ├── 1.2.story.md              # Implement auto-verification
│       ├── 1.3.story.md              # Extend visual dashboard
│       └── [additional stories]
│
└── .bmad-core/
    └── core-config.yaml              # BMAD configuration
```

## UI Component Hierarchy to File System Mapping

### Tab Navigation Structure
```
NestedTabs (Primary Level)
├── Tasks Tab      → Existing Shrimp functionality
├── BMAD Tab       → BMADView.jsx
│   ├── Overview   → Default sub-tab
│   │   ├── Epic Progress    → Part of BMADView
│   │   └── Verification Summary → VerificationView.jsx
│   │
│   ├── Epics      → EpicTabs.jsx (nested tabs)
│   │   ├── Epic 1 Tab
│   │   │   ├── Story 1.1 → StoryPanel.jsx
│   │   │   ├── Story 1.2 → StoryPanel.jsx
│   │   │   └── Story 1.3 → StoryPanel.jsx
│   │   └── Epic 2 Tab
│   │       └── [stories]
│   │
│   ├── PRD        → PRDEditor.jsx
│   │   ├── View Mode
│   │   └── Edit Mode
│   │
│   └── Stories    → StoryGrid.jsx
│       ├── Grid View (TanStack Table)
│       └── Board View (Kanban style)
│
├── History Tab    → Existing functionality
├── Agents Tab     → Existing functionality
├── Settings Tab   → Existing functionality
└── Archive Tab    → Existing functionality
```

## Component Responsibilities

### BMADView.jsx (Main Container)
- Manages sub-tab state
- Coordinates data fetching
- Handles tab routing
- Provides context to child components

### EpicTabs.jsx (Epic Navigation)
- Dynamically generates epic tabs
- Manages epic selection state
- Loads stories for selected epic
- Shows epic progress indicators

### StoryPanel.jsx (Story Display)
- Displays story content
- Enables inline editing
- Shows parallel work indicator
- Displays verification results
- Handles save/sync operations

### PRDEditor.jsx (PRD Management)
- Renders PRD in view/edit modes
- Provides rich text editing
- Handles PRD file synchronization
- Maintains markdown formatting

### VerificationView.jsx (Verification Display)
- Shows verification scores
- Lists implementation details
- Displays technical challenges
- Formats verification timestamp

## Data Flow Architecture

```
1. User Interaction
   └── React Component
       └── API Call (bmad-api.js)
           └── Server Endpoint (server.js)
               └── MCP Tool or File System
                   └── Update State
                       └── Re-render Component

2. File System Changes
   └── File Watcher (file-watcher.ts)
       └── MCP Tool Trigger
           └── Update Dashboard
               └── WebSocket/SSE to Client
                   └── Update React State
```

## MCP Tool to Component Mapping

| MCP Tool | Primary Component | Purpose |
|----------|------------------|---------|
| auto-verify.ts | VerificationView.jsx | Display verification results |
| story-dashboard.ts | BMADView.jsx | Update overall dashboard |
| epic-organizer.ts | EpicTabs.jsx | Organize epic structure |
| story-editor.ts | StoryPanel.jsx | Handle story edits |
| prd-editor.ts | PRDEditor.jsx | Handle PRD edits |

## File System to UI Mapping

| File System Location | UI Component | Display Location |
|---------------------|--------------|------------------|
| docs/stories/*.story.md | StoryPanel.jsx | Epics → Epic N → Story |
| docs/prd/*.md | PRDEditor.jsx | BMAD → PRD tab |
| .ai/verification/*.json | VerificationView.jsx | Within each StoryPanel |
| docs/architecture/*.md | Reference only | Not displayed in UI |

## Development Order (Based on Stories)

### Story 1.1: Create MadShrimp Agent
```
CREATE:
└── agents/madshrimp.md
```

### Story 1.2: Implement Auto-Verification
```
CREATE:
├── src/tools/bmad/auto-verify.ts
├── src/types/bmad.ts
├── src/utils/file-watcher.ts
└── src/utils/bmad-sync.ts
```

### Story 1.3: Extend Visual Dashboard
```
CREATE:
├── tools/task-viewer/src/components/EpicTabs.jsx
├── tools/task-viewer/src/components/StoryPanel.jsx
├── tools/task-viewer/src/components/VerificationView.jsx
├── tools/task-viewer/src/components/ParallelIndicator.jsx
└── tools/task-viewer/src/utils/bmad-api.js

MODIFY:
├── tools/task-viewer/src/components/BMADView.jsx
├── tools/task-viewer/src/components/NestedTabs.jsx
└── tools/task-viewer/server.js
```

### Story 1.4: Conversational Verification Access
```
MODIFY:
└── agents/madshrimp.md (add verification query commands)
```

### Story 1.5: Story Editing UI
```
CREATE:
├── src/tools/bmad/story-editor.ts
└── tools/task-viewer/src/utils/story-sync.js

MODIFY:
└── tools/task-viewer/src/components/StoryPanel.jsx
```

### Story 1.6: PRD Editing UI
```
CREATE:
├── src/tools/bmad/prd-editor.ts
└── tools/task-viewer/src/components/PRDEditor.jsx
```

### Story 1.7: Parallel Work Indicators
```
MODIFY:
├── tools/task-viewer/src/components/StoryPanel.jsx
└── tools/task-viewer/src/components/ParallelIndicator.jsx
```

## Key Implementation Notes

1. **Nested Tabs**: Use HeadlessUI Tab components with proper nesting
2. **State Management**: Use React Context for BMAD state across components
3. **File Sync**: Always maintain BMAD file format compatibility
4. **Performance**: Lazy load tab content, virtualize long lists
5. **Accessibility**: Ensure keyboard navigation works for all tabs
6. **Error Handling**: Graceful fallbacks for all verification failures