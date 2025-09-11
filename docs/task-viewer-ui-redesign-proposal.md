# Task Viewer UI Redesign Proposal
## Epic-Story-Task Hierarchy Within Existing Tab Structure

## Executive Summary

This proposal enhances the existing Shrimp Task Viewer's nested tab structure to properly display the Epic → Story → Task hierarchy while maintaining all current functionality including detailed task views, the project manager overview, and the beloved tabbed interface. The redesign works entirely within the current tab architecture.

## Core Design Principles

1. **Preserve Existing Tab Structure**: Work within the outer/inner tab system
2. **Maintain Task Detail Views**: Keep the current task detail functionality
3. **Clear Visual Hierarchy**: Show Epics → Stories → Tasks relationship
4. **Project Manager Friendly**: Enhance cross-project overview capabilities
5. **Evolutionary Enhancement**: Build on what already works well

## Enhanced Tab Structure Analysis

```
📁 Projects (Outer Tab)
├── 📊 Dashboard Tab ← NEW (Cross-project overview)
├── Project A Tab
│   ├── 📋 Tasks (Inner Tab) ← ENHANCED
│   ├── 📊 History (Inner Tab) ← ENHANCED  
│   ├── 🤖 Agents (Inner Tab)
│   ├── ⚙️ Settings (Inner Tab)
│   └── 📦 Archive (Inner Tab) ← ENHANCED
├── Project B Tab
│   ├── 📋 Tasks (Inner Tab) ← ENHANCED
│   ├── 📊 History (Inner Tab) ← ENHANCED
│   ├── 🤖 Agents (Inner Tab)
│   ├── ⚙️ Settings (Inner Tab)
│   └── 📦 Archive (Inner Tab) ← ENHANCED
└── + Add Project

📋 Release Notes (Outer Tab)
ℹ️ README (Outer Tab)  
🎨 Templates (Outer Tab)
🤖 Sub-Agents (Outer Tab)
⚙️ Settings (Outer Tab)
```

## Enhanced Tab Specifications

### 0. New Dashboard Tab (📊 Dashboard - First Project Tab)

The Dashboard tab provides cross-project overview and is the default view when Projects outer tab is selected.

```
┌──────────────────────────────────────────────────────────────────┐
│ 📊 Dashboard                                          [Settings] │
├──────────────────────────────────────────────────────────────────┤
│ Total Projects: 3 | Active: 2 | Archived: 1                     │
│                                                                   │
│ Project A: E-Commerce Platform                     [Select] [⚙]  │
│ ├─ Current Version: 2.1.0 | Progress: ████████████░░░░░░ 68%    │
│ ├─ Active Epics: 3 | Active Stories: 8 | Active Tasks: 24       │
│ └─ 🔴 2 Blocked | 🟡 5 In Progress | 🟢 17 Complete            │
│                                                                   │
│ Project B: Mobile App                               [Select] [⚙]  │
│ ├─ Current Version: 1.0.0 | Progress: ██████░░░░░░░░░░░ 35%    │
│ ├─ Active Epics: 2 | Active Stories: 6 | Active Tasks: 18       │
│ └─ 🔴 0 Blocked | 🟡 8 In Progress | 🟢 10 Complete            │
│                                                                   │
│ [Show Archived Projects] [Export All] [Create Report]           │
└──────────────────────────────────────────────────────────────────┘
```

### 1. Enhanced Tasks Tab (📋 Tasks Inner Tab)

The existing Tasks tab is enhanced to display the Epic → Story → Task hierarchy with TAN Stack tables for tasks.

#### 1.1 Version Selector (Top of Tasks Tab)
```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Tasks                                            [Settings ⚙️] │
├─────────────────────────────────────────────────────────────────┤
│  Version: [v2.1 Current ▼] │ View: [Epic View ▼] │ [+ New Epic]   │
│                                                                  │
│  Progress: ████████████░░░░░░ 68% │ 3 Epics │ 8 Stories │ 24 Tasks │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.2 Epic Cards with TAN Stack Tables for Tasks
```
┌──────────────────────────────────────────────────────────────────┐
│ ▼ EPIC: User Authentication System                    [Archive] [⚙] │
│    ID: EPIC-001 │ Priority: High │ Status: In Progress (85%)       │
├──────────────────────────────────────────────────────────────────┤
│ Goal: Enable secure user registration, login, and account mgmt    │
├──────────────────────────────────────────────────────────────────┤
│ ▼ 📖 STORY 1.1: User Registration             [━━━━━░░░░░] 50%     │
│   Acceptance Criteria: Users can create accounts with email...    │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │☑│Task │Name             │Desc    │Status    │Summary │Agent │... │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │☑│ T1  │Create user model│Backend │✅Complete│Model..│AI-Bot│... │ │
│ │☑│ T2  │Build reg form   │Frontend│🔄Progress│Form.. │UI-Bot│... │ │
│ │☐│ T3  │Email verify     │Backend │⏸️Pending │Email..│--    │... │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ▼ 📖 STORY 1.2: User Login Flow               [━━░░░░░░░░] 20%     │
│   As a user, I want to log in securely...                        │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │☑│Task │Name             │Desc    │Status    │Summary │Agent │... │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │☑│ T4  │Login API        │Backend │✅Complete│API... │API-Bot│... │ │
│ │☑│ T5  │JWT sessions     │Security│✅Complete│JWT... │API-Bot│... │ │
│ │☐│ T6  │Login UI         │Frontend│🔄Progress│UI...  │UI-Bot │... │ │
│ │☐│ T7  │Connect UI-API   │Integ   │⏸️Pending │Conn..│--     │... │ │
│ │☐│ T8  │Integration test │Testing │⏸️Pending │Test..│--     │... │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ▶ 📖 STORY 1.3: Password Reset               [░░░░░░░░░░] 0%      │
└──────────────────────────────────────────────────────────────────┘
```

Note: Each TAN Stack table includes ALL current task table columns:
1. ☑ Select checkbox
2. Task# (Task number with click-to-copy UUID)
3. Name (Task name with ID preview)
4. Description (truncated with full text on hover)
5. Status (✅Completed, 🔄In Progress, ⏸️Pending)
6. Summary (expandable task summary)
7. Agent (dropdown with agent selection)
8. Created/Updated (formatted dates)
9. Dependencies (clickable task references)
10. Actions (🤖Agent, 🦾Direct, ✏️Edit, 🗑️Delete buttons)
- Full TAN Stack features: sorting, filtering, pagination, bulk selection

### 2. Enhanced History Tab (📊 History Inner Tab)

The existing History tab is enhanced to show version-based project history with expandable epic/story/task structure using TAN Stack tables.

#### 2.1 Version-Based History View with Expandable Epics
```
┌──────────────────────────────────────────────────────────────────┐
│ 📊 History                                         [Export All] [⚙] │
├──────────────────────────────────────────────────────────────────┤
│ Project: E-Commerce Platform | Total Versions: 4                │
│                                                                   │
│ ▼ Version 2.1 (April 2024) - Current Development   [In Progress] │
│   ├─ 🎯 Epic: User Auth System          ████████░░ 85%           │
│   ├─ 🎯 Epic: Payment Integration        ███░░░░░░░ 35%           │
│   ├─ 🎯 Epic: Mobile Responsive         ░░░░░░░░░░ 0%            │
│   └─ 3 Epics | 8 Stories | 24 Tasks | Started: Mar 15           │
│                                                                   │
│ ▼ Version 2.0 (March 2024) - Feature Expansion     [Completed]   │
│   ▼ ✅ Epic: Advanced Search           100% - Duration: 2 weeks   │
│     ▼ Story: Search Interface Design   (Completed Mar 5)         │
│    ┌──────────────────────────────────────────────────────────────┐ │
│    │☑│Task│Name        │Desc│Status    │Summary│Agent │Created│...│ │
│    ├──────────────────────────────────────────────────────────────┤ │
│    │☑│T1 │Design mock │UI  │✅Complete│Mock..│UI-Bot│Mar 2 │...│ │
│    │☑│T2 │Wireframes  │UX  │✅Complete│Wire..│UI-Bot│Mar 3 │...│ │
│    │☑│T3 │User testing│UX  │✅Complete│Test..│UX-Bot│Mar 4 │...│ │
│    │☑│T4 │Final design│UI  │✅Complete│Fina..│UI-Bot│Mar 5 │...│ │
│    └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│     ▼ Story: Search API Implementation (Completed Mar 8)         │
│    ┌──────────────────────────────────────────────────────────────┐ │
│    │☑│Task│Name        │Desc│Status    │Summary│Agent │Created│...│ │
│    ├──────────────────────────────────────────────────────────────┤ │
│    │☑│T5 │DB schema   │DB  │✅Complete│Sche..│DB-Bot│Mar 6 │...│ │
│    │☑│T6 │API endpoint│API │✅Complete│Endp..│API-Bot│Mar 7│...│ │
│    │☑│T7 │Index create│DB  │✅Complete│Inde..│DB-Bot│Mar 8 │...│ │
│    └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│     ▶ Story: Filters & Sorting     (4 tasks - Completed Mar 12) │
│     ▶ Story: Search Analytics      (3 tasks - Completed Mar 15) │
│                                                                   │
│   ▶ ✅ Epic: User Profiles             100%                     │
│   ▶ ✅ Epic: Analytics Dashboard       100%                     │
│   └─ 3 Epics | 12 Stories | 48 Tasks | Duration: 6 weeks        │
│                                                                   │
│ ▶ Version 1.1 (February 2024) - Bug Fixes         [Completed]   │
│ ▶ Version 1.0 (January 2024) - MVP                [Completed]   │
│                                                                   │
│ [Show All Versions] [Export History] [Version Report]           │
└──────────────────────────────────────────────────────────────────┘
```

Note: Each task table in History includes:
- Task Name, Status, Assigned Agent, Completion Date, Related Files Count
- Click any task row to view full task details, analysis results, completion info
- Full sorting and filtering capabilities within each story table

### 3. Enhanced Archive Tab (📦 Archive Inner Tab)

The Archive tab is enhanced to support epic/story/task archiving with full TAN Stack table functionality.

#### 3.1 Epic-Based Archive Organization
```
┌──────────────────────────────────────────────────────────────────┐
│ 📦 Archive                                         [Export All] [⚙] │
├──────────────────────────────────────────────────────────────────┤
│ Archived Items: 156 Total | 12 Epics | 45 Stories | 99 Tasks    │
│ Filter: [All ▼] Sort: [Archive Date ▼] Search: [Epic/Story...]   │
│                                                                   │
│ ▼ Version 1.0 (Archived Jan 2024) - MVP Release                 │
│   ▼ ✅ Epic: Foundation & Setup           (Archived Jan 30)      │
│     ▼ Story: Project Infrastructure      (5 tasks archived)     │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │☑│Task│Name       │Desc│Status    │Summary│Agent │Archived│...│ │
│   ├────────────────────────────────────────────────────────────────┤ │
│   │☑│T1 │Setup repo │Dev │✅Complete│Repo..│Dev-Bot│Jan 15 │...│ │
│   │☑│T2 │CI/CD pipe │DevOps│✅Complete│Pipe..│DevOps│Jan 18 │...│ │
│   │☑│T3 │Docker set │DevOps│✅Complete│Dock..│DevOps│Jan 20 │...│ │
│   │☑│T4 │Test config│Test │✅Complete│Test..│Test-Bot│Jan 22│...│ │
│   │☑│T5 │Docs       │Doc  │✅Complete│Doc.. │Doc-Bot│Jan 25 │...│ │
│   └────────────────────────────────────────────────────────────────┘ │
│                                                                   │
│     ▼ Story: Database Schema              (8 tasks archived)     │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │☑│Task│Name       │Desc│Status    │Summary│Agent │Archived│...│ │
│   ├────────────────────────────────────────────────────────────────┤ │
│   │☑│T6 │User tables│DB  │✅Complete│User..│DB-Bot │Jan 28 │...│ │
│   │☑│T7 │Index creat│DB  │✅Complete│Inde..│DB-Bot │Jan 29 │...│ │
│   │☑│T8 │Migration  │DB  │✅Complete│Migr..│DB-Bot │Jan 30 │...│ │
│   │☐│   │[5 more tasks] [Expand All] [Show Details]      │     │ │
│   └────────────────────────────────────────────────────────────────┘ │
│                                                                   │
│     ▶ Story: Basic Authentication       (12 tasks archived)     │
│                                                                   │
│   ▶ ✅ Epic: Core Features               (Archived Feb 15)       │
│   ▶ ✅ Epic: Basic UI                    (Archived Feb 28)       │
│                                                                   │
│ ▶ Individual Archived Tasks (Not part of Epic/Story): 23        │
│                                                                   │
│ [Restore Selected] [Permanently Delete] [Export Archive]        │
└──────────────────────────────────────────────────────────────────┘
```

Note: Archive tables include all current task columns plus archive-specific data:
1. ☑ Select checkbox 
2. Task# (Task number with click-to-copy UUID)
3. Name (Task name with ID preview)
4. Description (truncated with full text on hover)
5. Status (final status when archived)
6. Summary (expandable task summary from completion)
7. Agent (assigned agent at time of archival)
8. Archived Date (when task was archived)
9. Dependencies (preserved task references)
10. Actions (View Details, Restore, Export buttons)
- Additional archive metadata: Duration, Original Due Date, Final Result
- Full search and filtering across all archived epic/story/task data

## Key UI Features Within Existing Tab Structure

### 1. Progressive Disclosure in Tasks Tab
- **Epic Level**: Shows epic title, progress bar, story count (collapsible)
- **Story Level**: Shows user story format with acceptance criteria (expandable)  
- **Task Level**: Shows existing task detail view when clicked (preserves current functionality)

### 2. Version Management Integration
- **Version Selector**: Added to top of Tasks tab as dropdown
- **History Tab Enhancement**: Shows version-based epic/story history
- **Archive Tab Enhancement**: Version-based archiving of completed epics

### 3. Existing Tab Structure Preservation
```
📁 Projects (Outer Tab) ← UNCHANGED
├── Project A Tab ← UNCHANGED
│   ├── 📋 Tasks (Inner Tab) ← ENHANCED with epic/story view
│   ├── 📊 History (Inner Tab) ← ENHANCED with version tracking
│   ├── 🤖 Agents (Inner Tab) ← UNCHANGED
│   ├── ⚙️ Settings (Inner Tab) ← UNCHANGED
│   └── 📦 Archive (Inner Tab) ← ENHANCED with epic archive
├── Project B Tab ← UNCHANGED
└── + Add Project ← UNCHANGED

📋 Release Notes (Outer Tab) ← UNCHANGED
ℹ️ README (Outer Tab) ← UNCHANGED
🎨 Templates (Outer Tab) ← UNCHANGED
🤖 Sub-Agents (Outer Tab) ← UNCHANGED
⚙️ Settings (Outer Tab) ← UNCHANGED
```

### 4. Enhanced Filtering (Within Tasks Tab)
```
┌─────────────────────────────────────────────────────────┐
│ 📋 Tasks                                     [Settings] │
├─────────────────────────────────────────────────────────┤
│ 🔍 Search epics, stories, or tasks...                   │
│ View: [Epic View ▼] Filter: [All ▼] Sort: [Priority ▼] │
│ □ Show Completed ☑ Show In Progress ☑ Show Planned     │
└─────────────────────────────────────────────────────────┘
```

### 5. Task Detail View Preservation
When clicking any task, the existing task detail modal/view opens with all current functionality:
- Analysis results
- Completion status  
- Related files
- Agent assignments
- Task history
- Export options

## Data Structure Changes

### Epic Object
```typescript
interface Epic {
  id: string;
  version: string;
  title: string;
  goal: string;
  status: 'planned' | 'in_progress' | 'completed' | 'archived';
  stories: Story[];
  startDate: Date;
  targetDate: Date;
  completedDate?: Date;
  progress: number; // 0-100
  metadata: {
    createdBy: string;
    businessValue: string;
    dependencies: string[];
  };
}
```

### Story Object
```typescript
interface Story {
  id: string;
  epicId: string;
  title: string;
  userStory: {
    asA: string;
    iWant: string;
    soThat: string;
  };
  acceptanceCriteria: AcceptanceCriterion[];
  tasks: Task[];
  status: 'planned' | 'in_progress' | 'completed' | 'blocked';
  assignedTo?: string;
  storyPoints?: number;
}
```

### Version Object
```typescript
interface ProjectVersion {
  id: string;
  version: string;
  name: string;
  epics: Epic[];
  startDate: Date;
  endDate?: Date;
  status: 'planning' | 'active' | 'completed' | 'archived';
  releaseNotes?: string;
}
```

## Navigation Flow Within Existing Tab Structure

### Preserved Outer Tab Navigation
1. **📁 Projects**: Enhanced with Dashboard as first sub-tab, then individual project tabs
2. **📋 Release Notes**: Unchanged - existing functionality preserved
3. **ℹ️ README**: Unchanged - existing functionality preserved  
4. **🎨 Templates**: Enhanced - could include epic/story templates
5. **🤖 Sub-Agents**: Unchanged - existing functionality preserved
6. **⚙️ Settings**: Enhanced - export/archive settings for epic/story data

### Enhanced Inner Tab Navigation (Within Project)
1. **📋 Tasks**: Enhanced with epic/story hierarchy and TAN Stack tables for tasks
2. **📊 History**: Enhanced with expandable epic/story/task structure
3. **🤖 Agents**: Unchanged - existing functionality preserved
4. **⚙️ Settings**: Unchanged - existing functionality preserved
5. **📦 Archive**: Enhanced with epic/story archiving and TAN Stack tables

### Enhanced Drill-Down Flow with TAN Stack Tables
```
Projects Tab (Outer)
  └─> Dashboard Tab (Default) ← NEW cross-project view
  └─> Project Tab (e.g., "Project A")
      └─> Tasks Tab (Inner) ← Enhanced with epic/story hierarchy
          └─> Epic Card (Expandable)
              └─> Story Section (Expandable)  
                  └─> TAN Stack Table (Tasks) ← Full task table functionality
                      └─> Task Row (Clickable)
                          └─> Task Detail View ← Existing functionality preserved
```

### Enhanced Context Actions
- **Epic Actions**: Archive, Export, Generate Report, Move to Archive
- **Story Actions**: Convert to Tasks, Edit Acceptance Criteria, Archive Story
- **Task Row Actions**: All existing task functionality preserved in TAN Stack tables
- **Table Actions**: Sort, filter, search, bulk select, export within each story table

## Mobile/Responsive Design

### Mobile View (Phone)
```
┌─────────────────┐
│ 🦐 Project: ABC  │
├─────────────────┤
│ v2.1.0 ◉ 68%   │
├─────────────────┤
│ EPIC 1 ████░ 85%│
│ ▼ Stories (3)   │
│                 │
│ EPIC 2 ██░░░ 45%│
│ ▶ Stories (4)   │
│                 │
│ EPIC 3 ░░░░░ 0% │
│ ▶ Planned       │
└─────────────────┘
```

### Tablet View
- Two-column layout: Epic list on left, story details on right
- Collapsible panels for space optimization
- Touch-optimized expand/collapse controls

## Benefits of Tab-Integrated Design

### For Project Managers
1. **Familiar Interface**: All functionality remains within beloved tab structure
2. **Cross-Project View**: Enhanced Projects tab shows all projects at once
3. **Version Tracking**: Enhanced History tab provides complete project timeline
4. **Task Detail Access**: All existing task management features preserved

### For Developers  
1. **Context Preservation**: Epic/story context added without losing task details
2. **Workflow Continuity**: Existing task workflow and detail views unchanged
3. **Progressive Enhancement**: New epic/story view is additive, not replacement
4. **Tool Integration**: All existing MCP tools and agents continue to work

### For Users (All Types)
1. **No Learning Curve**: Interface enhancement, not replacement
2. **Feature Preservation**: All current functionality maintained
3. **Optional Complexity**: Epic/story view can be collapsed to show simple task list
4. **Backward Compatibility**: Existing projects work without modification

## Migration Strategy (Tab Structure Preservation)

### Phase 1: Enhanced Data Model (No UI Changes)
- Extend existing task model to include optional epic/story references
- Add epic and version entities as optional enhancements
- Ensure backward compatibility with existing task data

### Phase 2: Enhanced Inner Tab Components
- Enhance Tasks tab component to optionally display epic/story hierarchy
- Enhance History tab to show version-based organization
- Enhance Archive tab to support epic archiving
- **Preserve all existing task detail views and functionality**

### Phase 3: Progressive Feature Rollout
- Add epic/story creation tools as optional features
- Implement story-to-task conversion within existing workflow
- Add version management as optional project organization
- **Maintain existing tab structure and navigation**

### Phase 4: Integration Enhancement  
- Connect to BMAD MCP tools for story creation
- Add PRD import capability to Tasks tab
- Enhance export functionality for epic/story data
- **Keep all existing MCP tool integrations working**

## Technical Considerations

### Enhanced State Management
```typescript
interface AppState {
  currentProject: Project;
  currentVersion: ProjectVersion;
  activeEpics: Epic[];
  expandedItems: Set<string>; // Epic and Story IDs
  tableStates: Map<string, TableState>; // TAN Stack table states per story
  filters: FilterState;
  viewMode: 'epic' | 'story' | 'task_list';
  dashboardView: boolean; // Whether showing cross-project dashboard
}

interface TableState {
  sorting: SortingState;
  pagination: PaginationState;
  filtering: FilteringState;
  selection: RowSelectionState;
  visibility: VisibilityState;
}
```

### Performance Optimization with TAN Stack Tables
- **Virtual scrolling**: For large task tables within stories
- **Lazy loading**: Task details loaded on-demand when table rows expanded
- **Memoized table states**: Each story table maintains independent state
- **Optimistic updates**: Task status changes reflect immediately in tables
- **Cached table data**: Historical epic/story/task data cached for Archive/History tabs

### Real-time Updates Enhanced
- **WebSocket connection**: Live task status updates reflected in all TAN Stack tables
- **Table synchronization**: Changes in one view (Tasks) reflect in History/Archive tables
- **Collaborative indicators**: Show when other users are viewing/editing same epic/story
- **Conflict resolution**: Handle concurrent epic/story/task updates across tables

### Export/Archive Enhancements
```typescript
interface EnhancedExportData {
  format: 'csv' | 'json' | 'markdown';
  scope: 'epic' | 'story' | 'project' | 'dashboard';
  includeHistory: boolean;
  includeArchived: boolean;
  tableFilters: TableState[]; // Export filtered table data
  epicStoryContext: boolean; // Include epic/story hierarchy context
}
```

## Conclusion

This enhanced design preserves the beloved nested tab structure of the Shrimp Task Viewer while adding powerful epic/story hierarchy capabilities. By working entirely within the existing tab boundaries, users can enjoy enhanced functionality without losing any familiar workflow patterns.

Key design principles achieved:
- **Tab Structure Preservation**: All existing outer and inner tabs maintained
- **Task Detail Continuity**: Complete preservation of existing task management features  
- **Progressive Enhancement**: Epic/story features are additive, not replacement
- **Backward Compatibility**: Existing projects continue to work unchanged
- **Optional Complexity**: Users can collapse epic/story view for simple task lists

Enhanced capabilities within tab structure:
- **📊 Dashboard Tab**: NEW first project tab providing cross-project overview
- **📋 Tasks Tab**: Epic/story hierarchy with TAN Stack tables for task management
- **📊 History Tab**: Expandable epic/story structure with full task table functionality  
- **📦 Archive Tab**: Epic/story archiving with TAN Stack tables for all archived data
- **Export/Archive**: Enhanced to capture complete epic/story/task context and relationships

This design successfully integrates BMAD's story-driven product management approach with Shrimp's technical execution excellence, all while:
1. **Preserving the beloved nested tab structure** users explicitly requested to maintain
2. **Using TAN Stack tables** for all task displays within epic/story context
3. **Adding Dashboard tab** as the first project sub-tab for cross-project overview
4. **Enhancing export/archive functionality** to capture complete epic/story/task data
5. **Maintaining all existing task detail views** and functionality within the enhanced structure

The result is a more powerful task management system that feels familiar and maintains all existing functionality while adding valuable epic/story context displayed through industry-standard TAN Stack tables.

## BMAD Architecture Documents Integration Strategy

### Overview

This proposal outlines how to integrate BMAD's sophisticated document generation capabilities with Shrimp's task management system, creating a unified workflow for architecture documentation, PRDs, and technical specifications.

### Strategic Approach: Hybrid Integration

**Recommendation: Leverage BMAD as foundation, extend with Shrimp MCP tools**

Rather than rebuilding BMAD's mature document generation system, we propose creating MCP bridge tools that:
- Utilize BMAD's existing YAML template system
- Integrate document generation into Shrimp's task workflow
- Add visual document management within the enhanced tab structure

### BMAD's Core Strengths to Leverage

#### 1. **YAML-Based Template System**
```yaml
# Example: prd-tmpl.yaml structure
template:
  id: prd-template-v2
  name: Product Requirements Document
  version: 2.0
  output:
    format: markdown
    filename: docs/prd.md

sections:
  - id: requirements
    title: Requirements
    elicit: true  # Triggers interactive 1-9 option system
    sections:
      - id: functional
        type: numbered-list
        prefix: FR
```

#### 2. **Interactive Elicitation System**
- Advanced elicitation methods with 1-9 option prompting
- Mandatory user interaction for critical sections (`elicit: true`)
- Structured workflow preventing efficiency shortcuts

#### 3. **Document Templates Available**
- `prd-tmpl.yaml` - Product Requirements Document
- `architecture-tmpl.yaml` - System Architecture
- `tech-stack-tmpl.yaml` - Technology Stack Documentation
- `coding-standards-tmpl.yaml` - Coding Standards
- `source-tree-tmpl.yaml` - Project Structure Documentation

### Integration Architecture

#### 1. **New Shrimp MCP Tools**

Create bridge tools that interface with BMAD's capabilities:

```typescript
// New MCP tools for document generation
interface ShrimpBMADTools {
  // Document Generation Tools
  mcp__shrimp__generate_prd: Tool;           // Generate PRD using BMAD templates
  mcp__shrimp__generate_architecture: Tool;  // Generate architecture docs
  mcp__shrimp__generate_tech_stack: Tool;    // Generate tech stack docs
  mcp__shrimp__generate_coding_standards: Tool; // Generate coding standards
  mcp__shrimp__update_source_tree: Tool;     // Auto-update source tree
  
  // Document Lifecycle Tools
  mcp__shrimp__sync_documents_to_tasks: Tool; // Create tasks from document requirements
  mcp__shrimp__validate_document_completeness: Tool; // Verify all sections complete
  mcp__shrimp__update_document_from_tasks: Tool; // Update docs based on task completion
}
```

#### 2. **Enhanced UI Integration**

Add document management to the existing tab structure:

##### **Option A: Architecture Tab (New Inner Tab)**
```
📁 Projects → Project A →
├── 📋 Tasks (Enhanced with epic/story)
├── 📊 History (Enhanced with version tracking)
├── 📐 Architecture (NEW - Document Management) ← New tab
│   ├── 📄 PRD
│   ├── 🏗️ System Architecture  
│   ├── 💻 Tech Stack
│   ├── 📏 Coding Standards
│   └── 🌲 Source Tree
├── 🤖 Agents
├── ⚙️ Settings
└── 📦 Archive
```

##### **Option B: Enhanced BMAD Tab**
Enhance the existing BMAD tab to include architecture documents alongside epics/stories.

### Document Integration with Task Workflow

#### 1. **Document → Task Generation**
```typescript
// Example: Generate tasks from PRD requirements
interface PRDRequirement {
  id: string;           // "FR1", "NFR3"
  description: string;  // "User authentication system"
  tasks: Task[];        // Generated Shrimp tasks
  agent: string;        // Assigned agent
  epic: string;         // Parent epic
  story: string;        // Parent story
}
```

#### 2. **Task → Document Updates**
When tasks are completed, automatically update relevant architecture documents:
- Tech Stack updates when new technologies are implemented
- Source Tree updates when new components are added
- Coding Standards updates when patterns are established

#### 3. **Document Versioning**
Integrate with project versioning:
```typescript
interface DocumentVersion {
  version: string;      // "v2.1"
  documents: {
    prd: string;           // Path to PRD for this version
    architecture: string; // Path to architecture doc
    techStack: string;    // Path to tech stack doc
  };
  tasks: Task[];        // Tasks completed in this version
  epics: Epic[];        // Epics completed in this version
}
```

### Visual Document Management Interface

#### 1. **Document Cards in Architecture Tab**
```
┌──────────────────────────────────────────────────────────────────┐
│ 📐 Architecture                                        [+ New Doc] │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────────────────┐ ┌─────────────────────────┐           │
│ │ 📄 PRD v2.1            │ │ 🏗️ System Architecture  │           │
│ │ Status: ✅ Complete     │ │ Status: 🔄 In Progress   │           │
│ │ Last Updated: Mar 15   │ │ Last Updated: Mar 12     │           │
│ │ Sections: 8/8          │ │ Sections: 5/7            │           │
│ │ [View] [Edit] [Tasks]  │ │ [View] [Edit] [Tasks]    │           │
│ └─────────────────────────┘ └─────────────────────────┘           │
│                                                                   │
│ ┌─────────────────────────┐ ┌─────────────────────────┐           │
│ │ 💻 Tech Stack          │ │ 📏 Coding Standards      │           │
│ │ Status: ✅ Complete     │ │ Status: ⏸️ Pending      │           │
│ │ Technologies: 12       │ │ Rules: 0/15              │           │
│ │ [View] [Edit] [Update] │ │ [Generate] [View]        │           │
│ └─────────────────────────┘ └─────────────────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

#### 2. **Document Editor (Reuse Existing BMAD Logic)**
Reuse the existing DocumentEditor component from BMADView.jsx:
```jsx
<DocumentEditor
  title="Product Requirements Document"
  content={prdContent}
  onSave={(content) => saveDocument('prd', content)}
  documentType="PRD"
  bmadIntegration={true}  // Enable BMAD template features
  interactiveMode={true}  // Enable 1-9 elicitation system
  showToast={showToast}
/>
```

### Integration with Thinking Process

#### 1. **PRD Requirements → Epic/Story Generation**
```yaml
# Workflow: PRD → Epic → Story → Task
PRD Functional Requirement FR1: "User authentication system"
  ↓
Epic: "User Authentication & Security"
  ↓
Story 1.1: "User registration with email verification"
Story 1.2: "User login with session management"
Story 1.3: "Password reset functionality"
  ↓
Tasks: Generated using Shrimp's existing task planning tools
```

#### 2. **Architecture Documents in MCP Context**
When agents are planning or executing tasks, they can reference:
- **Coding Standards**: Ensure code follows established patterns
- **Tech Stack**: Use approved technologies and frameworks
- **Source Tree**: Understand project structure for file placement
- **Architecture**: Align with system design decisions

#### 3. **Document-Driven Task Validation**
```typescript
// Example: Validate task against architecture constraints
interface TaskValidation {
  task: Task;
  architectureCompliance: {
    techStackApproved: boolean;      // Uses approved technologies
    codingStandardsFollowed: boolean; // Follows established patterns
    architectureAligned: boolean;     // Aligns with system design
  };
  suggestions: string[];              // Improvement recommendations
}
```

### Implementation Phases

#### **Phase 1: Core MCP Bridge Tools (Week 1-2)**
- Create MCP tools for BMAD template integration
- Implement document generation with interactive elicitation
- Add basic document CRUD operations

#### **Phase 2: UI Integration (Week 3-4)**
- Add Architecture inner tab to project structure
- Implement document cards and editor integration
- Reuse existing DocumentEditor from BMAD tab

#### **Phase 3: Task Integration (Week 5-6)**
- Implement PRD → Epic/Story generation
- Add task validation against architecture documents
- Create document update workflows from task completion

#### **Phase 4: Advanced Features (Week 7-8)**
- Document versioning with project versions
- Auto-generation of source tree from codebase analysis
- Advanced document cross-referencing and linking

### Benefits of This Integration

#### **For Project Managers**
- **Unified Documentation**: All architecture docs in one place
- **Requirements Traceability**: Clear path from PRD to implemented tasks
- **Progress Visibility**: See documentation completion alongside task progress

#### **For Developers**
- **Context Clarity**: Access to coding standards and architecture decisions
- **Guided Development**: Tech stack and patterns clearly defined
- **Consistency**: All team members follow same documented standards

#### **For Stakeholders**
- **Professional Documentation**: BMAD's sophisticated template system
- **Living Documents**: Documentation stays current with development
- **Strategic Alignment**: Clear connection between requirements and implementation

### Technical Implementation Notes

#### **Reusing BMAD Code**
```typescript
// Leverage existing BMAD utilities
import { BMADTemplateEngine } from '../../../.bmad-core/utils/template-engine';
import { InteractiveElicitation } from '../../../.bmad-core/utils/elicitation';

// Create Shrimp-specific wrapper
export class ShrimpDocumentGenerator {
  private bmadEngine: BMADTemplateEngine;
  
  async generateDocument(template: string, interactive: boolean) {
    // Use BMAD's proven logic with Shrimp integration
    return this.bmadEngine.generate(template, {
      outputPath: `docs/architecture/`,
      taskIntegration: true,
      shrimpProject: this.projectId
    });
  }
}
```

#### **Document Storage Structure**
```
docs/
├── architecture/          # Generated architecture documents
│   ├── prd.md            # Product Requirements Document
│   ├── system-architecture.md
│   ├── tech-stack.md
│   ├── coding-standards.md
│   └── source-tree.md
├── epics/                # Epic documentation
└── stories/              # Story files (existing BMAD structure)
```

This integration creates a seamless workflow where sophisticated documentation drives development while development updates documentation, all within the familiar tab structure users love.