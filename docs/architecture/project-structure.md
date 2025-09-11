# Project Structure

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
