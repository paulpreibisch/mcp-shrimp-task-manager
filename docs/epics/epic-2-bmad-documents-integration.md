# Epic 2: BMAD Technical Documents Integration

## Epic Overview

**Epic ID**: 2
**Epic Title**: BMAD Technical Documents Viewer & Task Context Integration
**Epic Goal**: Provide visual access to BMAD-generated technical documents (architecture, coding standards, tech stack) through a nested tab interface and enable Shrimp Task Manager to leverage these documents during task analysis and planning phases.

## Business Value

### Problem Statement
When BMAD is installed for a project, it generates critical technical documentation including:
- System Architecture Document (`docs/architecture/system-architecture.md`)
- Coding Standards Document (`docs/architecture/coding-standards.md`)
- Tech Stack Document (`docs/architecture/tech-stack.md`)

Currently:
1. These documents are only accessible via file system navigation
2. Shrimp Task Manager doesn't leverage this valuable context during task execution
3. Developers must manually reference these documents when implementing tasks

### Value Proposition
This epic will:
- **Improve Developer Experience**: One-click access to technical documents within the task viewer interface
- **Enhance Task Quality**: Automatic context loading ensures tasks follow project standards
- **Reduce Errors**: Tasks automatically adhere to coding standards and architectural patterns
- **Accelerate Development**: No manual document lookup needed during implementation

## Technical Architecture

### Component Structure
```
BMAD Tab (existing)
├── Overview (existing)
├── Epics (existing)
├── PRD (existing)
├── Stories (existing)
└── Documents (NEW)
    └── TanStack Table View
        ├── Document Name (column)
        ├── Type (column)
        ├── Last Modified (column)
        ├── Status (column)
        └── Actions (column)
```

### User Flow
1. User clicks "Documents" tab within BMAD
2. Sees TanStack table listing all available documents
3. Clicks on a document row to view/edit
4. Document opens in markdown viewer/editor
5. "← Back to Documents" button returns to table view

### Integration Points
1. **UI Layer**: New tab in BMADView component with TanStack table
2. **API Layer**: New endpoints for document listing and retrieval
3. **MCP Tools**: Enhanced task analysis with document context
4. **Server Layer**: Document parsing and caching

## User Stories

### Story 2.1: Create BMAD Documents Tab with TanStack Table

**As a** developer using the Shrimp Task Manager,  
**I want** a Documents tab within the BMAD interface showing all technical documents in a table,  
**So that** I can browse and select documentation without leaving the task viewer.

**Acceptance Criteria**:
1. ✅ New "Documents" tab appears as the 5th tab in BMAD interface (same level as Overview, Epics, PRD, Stories)
2. ✅ Documents tab displays TanStack table with columns: Document Name, Type, Last Modified, Status, Actions
3. ✅ Table lists Architecture, Coding Standards, and Tech Stack documents
4. ✅ Clicking a document row opens it in full-screen markdown viewer
5. ✅ "← Back to Documents" button returns to table view from document viewer
6. ✅ Table shows appropriate status: ✅ Exists, ⚠️ Outdated, ❌ Missing
7. ✅ Documents tab only appears when BMAD is detected for the project
8. ✅ Table supports sorting by name, type, and last modified date
9. ✅ Search/filter box allows quick document finding

**Technical Details**:
- Use `@tanstack/react-table` for table implementation (already in project)
- Reuse existing `MarkdownEditor` component from Templates implementation  
- Follow dark theme styling with `rgba(100, 149, 210, 0.1)` backgrounds
- Table row hover effect with cursor pointer for clickability
- Document viewer takes full tab space with back navigation

**Priority**: P0 - Core functionality

---

### Story 2.2: Implement Document Loading API Endpoints

**As a** developer,  
**I want** the system to automatically load BMAD technical documents,  
**So that** they are available for viewing and editing in the interface.

**Acceptance Criteria**:
1. ✅ New endpoint `/api/bmad/documents/:type` returns document content
2. ✅ Supported types: 'architecture', 'coding-standards', 'tech-stack'
3. ✅ Documents are loaded from `{projectRoot}/docs/architecture/` directory
4. ✅ API returns 404 with helpful message if document doesn't exist
5. ✅ Document content is cached for performance (5-minute TTL)
6. ✅ API supports both GET (read) and PUT (update) operations

**Technical Details**:
```javascript
// GET /api/bmad/documents/architecture
// Returns: { content: string, exists: boolean, path: string }

// PUT /api/bmad/documents/architecture
// Body: { content: string }
// Returns: { success: boolean, path: string }
```

**Priority**: P0 - Core functionality

---

### Story 2.3: Enable Document Editing Capabilities

**As a** technical lead,  
**I want** to edit BMAD technical documents through the visual interface,  
**So that** I can maintain documentation without switching to file editors.

**Acceptance Criteria**:
1. ✅ Edit button appears for each document when in edit mode
2. ✅ Markdown editor provides syntax highlighting and preview
3. ✅ Changes auto-save after 2 seconds of inactivity
4. ✅ Save status indicator shows "Saved" or "Saving..."
5. ✅ Concurrent edit detection with conflict resolution
6. ✅ Version history maintained in `.bmad-core/history/` directory

**Technical Details**:
- Implement debounced auto-save mechanism
- Use optimistic UI updates with rollback on failure
- Store up to 10 versions per document

**Priority**: P1 - Enhanced functionality

---

### Story 2.4: Integrate Documents into Shrimp Task Analysis

**As a** developer executing tasks,  
**I want** Shrimp to automatically consider technical documents during analysis,  
**So that** my implementations follow project standards without manual reference.

**Acceptance Criteria**:
1. ✅ When BMAD is detected, Shrimp's analyze phase loads relevant documents
2. ✅ Task analysis output references applicable coding standards
3. ✅ Architecture document informs component placement decisions
4. ✅ Tech stack document validates library/framework choices
5. ✅ Analysis warnings generated for standard violations
6. ✅ Document context included in task planning output

**Technical Details**:
```typescript
// Enhanced analyze phase
interface TaskAnalysisContext {
  existingContext: AnalysisResult;
  bmadDocuments?: {
    architecture?: string;
    codingStandards?: string;
    techStack?: string;
  };
  applicableStandards: string[];
  architecturalConstraints: string[];
}
```

**Priority**: P0 - Core integration

---

### Story 2.5: Create Document Context MCP Tool

**As a** Shrimp Task Manager,  
**I want** an MCP tool to retrieve BMAD document context,  
**So that** I can provide this context during task execution.

**Acceptance Criteria**:
1. ✅ New tool `mcp__shrimp-task-manager__get_bmad_context` created
2. ✅ Tool returns relevant sections based on task type
3. ✅ Intelligent extraction of applicable standards/patterns
4. ✅ Caching mechanism for frequently accessed sections
5. ✅ Tool gracefully handles missing documents
6. ✅ Performance: Context retrieval < 100ms

**Technical Details**:
```typescript
interface BMADContextTool {
  name: 'mcp__shrimp-task-manager__get_bmad_context';
  input: {
    taskType: 'feature' | 'bug' | 'refactor' | 'test';
    component?: string;
    technology?: string;
  };
  output: {
    relevantStandards: string[];
    architecturalGuidelines: string[];
    techStackConstraints: string[];
    suggestions: string[];
  };
}
```

**Priority**: P0 - Core integration

---

### Story 2.6: Add Document Status Indicators

**As a** project manager,  
**I want** to see which BMAD documents exist and their last update time,  
**So that** I know the documentation completeness and currency.

**Acceptance Criteria**:
1. ✅ Document tab shows status badges: ✅ Exists, ⚠️ Outdated, ❌ Missing
2. ✅ Last modified timestamp displayed for each document
3. ✅ "Outdated" warning if document older than PRD/stories
4. ✅ Quick stats: Total docs (3), Present (2), Missing (1)
5. ✅ One-click generation for missing documents using BMAD templates
6. ✅ Visual indicator when documents are being used in active task

**Technical Details**:
- Compare document timestamps with story/PRD modifications
- Outdated threshold: Document older than newest story by 7+ days

**Priority**: P2 - Nice to have

---

### Story 2.7: Implement Smart Document Suggestions

**As a** developer,  
**I want** the system to suggest document updates based on task completions,  
**So that** documentation stays synchronized with implementation.

**Acceptance Criteria**:
1. ✅ After task completion, system analyzes if documents need updates
2. ✅ Suggestions appear as non-blocking notifications
3. ✅ One-click acceptance of suggested updates
4. ✅ Suggestions based on: new libraries added, patterns changed, standards violated
5. ✅ Machine learning from accepted/rejected suggestions
6. ✅ Batch suggestions weekly to avoid notification fatigue

**Technical Details**:
- Implement suggestion engine using task verification data
- Store suggestion history for pattern learning

**Priority**: P3 - Future enhancement

## Implementation Plan

### Phase 1: Core UI (Stories 2.1, 2.2)
- **Duration**: 2 days
- **Goal**: Basic document viewing functionality
- **Deliverable**: Documents tab with read-only viewing

### Phase 2: Editing (Story 2.3)
- **Duration**: 2 days
- **Goal**: Full CRUD operations on documents
- **Deliverable**: Editable documents with auto-save

### Phase 3: Integration (Stories 2.4, 2.5)
- **Duration**: 3 days
- **Goal**: Shrimp leverages document context
- **Deliverable**: Context-aware task execution

### Phase 4: Enhancements (Stories 2.6, 2.7)
- **Duration**: 3 days
- **Goal**: Advanced features and intelligence
- **Deliverable**: Status tracking and suggestions

## Success Metrics

1. **Adoption Rate**: 80% of BMAD projects use Documents tab within first week
2. **Task Quality**: 30% reduction in standards violations post-implementation
3. **Documentation Currency**: Average document age < 14 days
4. **Developer Satisfaction**: 4.5+ star rating for document integration
5. **Performance**: Document load time < 500ms, context retrieval < 100ms

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large documents slow UI | High | Implement virtual scrolling and lazy loading |
| Concurrent edit conflicts | Medium | Optimistic locking with merge assistance |
| Missing documents break tasks | High | Graceful degradation, continue without context |
| Stale cache issues | Low | Implement cache invalidation on file changes |

## Dependencies

1. **Existing Components**:
   - MarkdownEditor component from Templates tab
   - BMADView component structure
   - Dark theme styling system

2. **External Systems**:
   - BMAD document generation
   - File system watching for changes
   - MCP tool infrastructure

## Technical Debt Considerations

- Refactor MarkdownEditor for better reusability
- Consider unified document management system
- Plan for future document types (API docs, test specs)

## Parallel Work Indicators

- **Story 2.1**: 👥 Multi-Dev OK (UI work independent)
- **Story 2.2**: 👥 Multi-Dev OK (API work independent)  
- **Story 2.3**: 👤 Single Dev (extends 2.1 and 2.2)
- **Story 2.4**: 👥 Multi-Dev OK (MCP integration separate)
- **Story 2.5**: 👥 Multi-Dev OK (Tool creation independent)
- **Story 2.6**: 👤 Single Dev (requires 2.1-2.2 complete)
- **Story 2.7**: 👤 Single Dev (requires all previous stories)

## Notes

- This epic directly enhances the MadShrimp integration by providing critical context
- Document integration makes Shrimp "BMAD-aware" at a deeper level
- Future expansion could include API documentation, test specifications, and deployment guides
- Consider creating a "Documentation Health Score" dashboard in future iteration