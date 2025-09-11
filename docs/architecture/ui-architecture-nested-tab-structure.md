# UI Architecture - Nested Tab Structure

## Primary Tab Level
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

## BMAD Tab - Nested Structure
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

## Stories Tab vs Epic Story Panels - Key Distinction

### Stories Tab (Global Project View)
**Purpose**: High-level project management and story overview
- Shows ALL stories across ALL epics in one unified view
- Grid View: Sortable/filterable table with columns for Epic, Story #, Title, Status, Parallel Indicator
- Board View: Kanban columns (Draft, In Progress, Review, Done)
- Quick filters: By epic, by status, by parallel work capability
- Bulk actions: Select multiple stories for status updates
- Search: Find stories by title or content

### Epic Tabs → Story Panels (Epic-Focused Development View)
**Purpose**: Deep dive into specific epic's implementation
- Shows ONLY stories within the selected epic
- Each story displayed as expanded panel with full details
- Rich content display: Full description, acceptance criteria, technical notes
- Inline editing capabilities for story content
- Verification results displayed prominently
- Implementation notes and technical challenges visible

## Epic Tab - Nested Story Structure
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

## Visual Layout Example

```
┌─────────────────────────────────────────────────────────────┐
│ [Tasks] [BMAD] [History] [Agents] [Settings] [Archive]      │
├─────────────────────────────────────────────────────────────┤
│         ↑ BMAD Tab Selected                                 │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ [Overview] [Epics] [PRD] [Stories]                    │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │                                                        │  │
│ │  Stories Tab Content (when selected):                 │  │
│ │  ┌──────────────────────────────────────────────┐    │  │
│ │  │ 🔍 Search: [___________] Filter: [All Epics v]│    │  │
│ │  ├────┬──────┬─────────────┬────────┬──────────┤    │  │
│ │  │Epic│Story#│ Title        │ Status │ Parallel │    │  │
│ │  ├────┼──────┼─────────────┼────────┼──────────┤    │  │
│ │  │ 1  │ 1.1  │ MadShrimp... │ Done   │    👥    │    │  │
│ │  │ 1  │ 1.2  │ Auto-Verify..│ In Prog│    👤    │    │  │
│ │  │ 1  │ 1.3  │ Visual Dash..│ Draft  │    👥    │    │  │
│ │  │ 2  │ 2.1  │ Another Epic │ Draft  │    👥    │    │  │
│ │  └────┴──────┴─────────────┴────────┴──────────┘    │  │
│ │                                                        │  │
│ │  Epics Tab Content (when selected):                   │  │
│ │  ┌──────────────────────────────────────────────┐    │  │
│ │  │ [Epic 1 ▼] [Epic 2] [Epic 3]                 │    │  │
│ │  ├──────────────────────────────────────────────┤    │  │
│ │  │ Epic 1: MadShrimp Integration (3/7 complete) │    │  │
│ │  │                                               │    │  │
│ │  │ ┌─Story 1.1────────────────────────────┐     │    │  │
│ │  │ │ ✅ Create MadShrimp Agent        👥  │     │    │  │
│ │  │ │ As a developer, I want to...         │     │    │  │
│ │  │ │ [Verification Score: 95]             │     │    │  │
│ │  │ │ [Edit] [View Details]                │     │    │  │
│ │  │ └──────────────────────────────────────┘     │    │  │
│ │  │                                               │    │  │
│ │  │ ┌─Story 1.2────────────────────────────┐     │    │  │
│ │  │ │ ⚡ Implement Auto-Verification    👤  │     │    │  │
│ │  │ │ As a developer, I want story...      │     │    │  │
│ │  │ │ [In Progress - 60% complete]         │     │    │  │
│ │  │ │ [Edit] [View Details]                │     │    │  │
│ │  │ └──────────────────────────────────────┘     │    │  │
│ │  └──────────────────────────────────────────────┘    │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```
