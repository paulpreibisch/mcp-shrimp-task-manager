# System Architecture

## Component Overview
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
