# MadShrimp Integration Brownfield Enhancement PRD

## Intro Project Analysis and Context

### Existing Project Overview

**Analysis Source**: IDE-based fresh analysis of existing MCP Shrimp Task Manager and BMAD-METHOD integration

**Current Project State**: We have two separate but powerful systems:
- **MCP Shrimp Task Manager**: Advanced task management with plan→analyze→split→execute→verify workflow, visual task viewer with React components, comprehensive task tracking with metadata support
- **BMAD-METHOD**: Agent-based development framework with conversational CLI agents (PM, Dev, SM, QA), story-centric planning approach, expansion pack architecture for domain extensions

### Available Documentation Analysis

**Available Documentation**:
✅ Tech Stack Documentation (Both systems well-documented)
✅ Source Tree/Architecture (Clear component structure in both)
✅ API Documentation (MCP tools and BMAD agent dependencies)
✅ External API Documentation (MCP integration patterns)
⚠️ UX/UI Guidelines (Partial - Shrimp has React components, BMAD has CLI patterns)
✅ Technical Debt Documentation (Both systems identify integration points)

### Enhancement Scope Definition

**Enhancement Type**: ✅ Integration with New Systems (Verification & Tracking Integration)

**Enhancement Description**: Create hybrid MadShrimp system that preserves BMAD's full execution workflow (planning, story creation, SM→Dev implementation) while adding Shrimp's verification capabilities and visual project tracking through a single `/madshrimp` command interface.

**Impact Assessment**: ✅ Minimal Impact (isolated additions) - Pure extension approach with no changes to existing execution workflows

### Goals and Background Context

**Goals**:
- Preserve complete BMAD execution workflow (PM, SM, Dev agent conversations)
- Add automatic verification capture when BMAD stories are marked complete
- Provide visual project dashboard showing story progress and verification details
- Enable Epic.Story visual organization without changing BMAD's story-centric execution
- Maintain single `/madshrimp` conversational interface
- Enable story and PRD editing through visual interface
- Display parallel work indicators for multi-dev agent planning

**Background Context**: Developers love BMAD's conversational workflow and execution model but want the rich verification details and visual project tracking that Shrimp provides. The integration should feel like an enhanced BMAD PM that automatically captures implementation learnings and provides visual project insights without changing how development work gets done.

**Change Log**:
| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial | 2025-01-09 | 1.0 | Created MadShrimp integration PRD | John (PM) |

## Requirements

### Functional Requirements

**FR1**: The `/madshrimp` command shall provide all existing BMAD PM agent capabilities (create-prd, create-epic, create-story, shard-prd) without modification to core BMAD workflows.

**FR2**: When BMAD stories are marked as "Done" or "Ready for Review", the system shall automatically trigger Shrimp verification to capture implementation details, technical challenges, and completion quality scores.

**FR3**: The visual dashboard shall display BMAD story progress organized by Epic with completion status, verification scores, and implementation details without requiring user interaction for updates.

**FR4**: The system shall maintain Epic.Story numbering (1.1, 1.2, 1.3) for visual organization while preserving BMAD's native story file structure and workflows.

**FR5**: The MadShrimp agent shall provide conversational access to view verification results and project status through natural language queries (e.g., "Show me verification details for story 1.2").

**FR6**: All BMAD story creation, modification, and SM→Dev→QA execution workflows shall remain completely unchanged from standard BMAD operation.

**FR7**: The Shrimp Task Manager visual interface shall provide editing capabilities for BMAD stories, allowing users to modify story content, acceptance criteria, and status through the web interface.

**FR8**: The Shrimp Task Manager interface shall provide PRD editing capabilities, enabling users to update product requirements, epic descriptions, and project details through the visual dashboard.

**FR9**: All edits made through the Shrimp visual interface shall automatically synchronize back to BMAD story files and PRD files, maintaining file format compatibility.

**FR10**: The system shall provide conflict resolution when simultaneous edits occur through both CLI (MadShrimp agent) and visual interface (Shrimp dashboard).

**FR11**: Story cards in the visual interface shall display indicators showing whether multiple dev agents can work on the story simultaneously without conflicts.

### Non-Functional Requirements

**NFR1**: Auto-verification must complete within 30 seconds of story completion notification to maintain development flow.

**NFR2**: Visual dashboard must update in real-time without requiring page refresh when story statuses change.

**NFR3**: Integration must not impact BMAD agent response times or modify any existing BMAD source code files.

**NFR4**: System must handle concurrent story completions and verification requests without data loss or conflicting updates.

**NFR5**: Verification data and visual tracking must persist across system restarts and maintain historical completion records.

### Compatibility Requirements

**CR1**: All existing BMAD agent commands and workflows must function identically with or without MadShrimp integration enabled.

**CR2**: BMAD story file formats and directory structures must remain unchanged and compatible with standard BMAD tooling.

**CR3**: Visual dashboard must integrate with existing Shrimp task viewer UI components without breaking current functionality.

**CR4**: MCP tool integration must be backward compatible and not interfere with existing Shrimp task management features.

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: TypeScript/JavaScript (MCP Shrimp), Markdown/YAML (BMAD agents)
**Frameworks**: React (Shrimp viewer), Node.js (Shrimp server), BMAD agent framework
**Database**: File-based (BMAD stories), JSON state (Shrimp tasks)
**Infrastructure**: MCP server architecture, CLI agent system
**External Dependencies**: BMAD-METHOD core, MCP protocol, React components

### Integration Approach

**Verification Integration Strategy**: File system watching for BMAD story status changes + MCP tool calls for auto-verification trigger when stories marked complete

**API Integration Strategy**: New MCP tools (`auto_verify_bmad_story`, `update_story_dashboard`, `organize_epic_structure`) bridge BMAD story completion events to Shrimp verification workflow

**Frontend Integration Strategy**: Extend existing BMADView component with Epic-based organization, verification result display, and story/PRD editing capabilities

**Testing Integration Strategy**: Verification integration testing through BMAD story completion simulation, visual dashboard update validation

### Code Organization and Standards

**File Structure Approach**: 
- MadShrimp agent: `/home/fire/claude/mcp-shrimp-task-manager/agents/madshrimp.md`
- New MCP tools: Extend existing `src/tools/` directory structure
- UI components: Enhance existing `tools/task-viewer/src/components/BMADView.jsx`

**Naming Conventions**: Follow existing patterns - `mcp__shrimp-task-manager__` prefix for new tools, camelCase for React components

**Coding Standards**: Maintain TypeScript strict mode, React functional components, BMAD YAML agent structure

**Documentation Standards**: Inline JSDoc for new functions, BMAD agent YAML documentation blocks

### Deployment and Operations

**Build Process Integration**: Extend existing npm scripts, no additional build pipeline needed

**Deployment Strategy**: File-based deployment for MadShrimp agent, existing server restart for MCP tools

**Monitoring and Logging**: Extend existing console logging, add verification completion tracking

**Configuration Management**: Optional feature flags in environment variables, backward compatible defaults

### Risk Assessment and Mitigation

**Technical Risks**: File system watching reliability, verification timing conflicts
**Integration Risks**: BMAD story format changes, MCP protocol updates
**Deployment Risks**: Agent file conflicts, React component integration issues
**Mitigation Strategies**: Graceful fallback to manual verification, comprehensive integration testing, version compatibility checks

## Required New MCP Tools

### Auto-Verification Tools
- `mcp__shrimp-task-manager__auto_verify_bmad_story`: Automatically trigger verification when BMAD stories complete
- `mcp__shrimp-task-manager__get_verification_details`: Retrieve verification results for conversational queries

### Visual Tracking Tools
- `mcp__shrimp-task-manager__update_story_dashboard`: Update visual dashboard with story status and verification data
- `mcp__shrimp-task-manager__organize_epic_structure`: Organize stories by Epic for visual display

### Story Management Tools
- `mcp__shrimp-task-manager__edit_bmad_story`: Enable story editing through visual interface with sync back to files
- `mcp__shrimp-task-manager__edit_prd`: Enable PRD editing through visual interface

### Parallel Work Indicators
- Simple metadata flags on stories: `multiDevOK: true/false`
- Visual indicators: 👥 Multi-Dev OK / 👤 Single Dev Only

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: Single comprehensive epic with rationale - This MadShrimp integration represents a cohesive enhancement that bridges two existing systems. All stories are interconnected and focused on the same goal of adding verification and visual tracking to BMAD workflows without disrupting execution.

## Epic 1: MadShrimp Integration - BMAD Execution with Shrimp Verification & Visual Tracking

**Epic Goal**: Enable developers to continue using natural BMAD conversational workflows while automatically capturing rich verification details and providing visual project tracking through seamless integration.

**Integration Requirements**: Preserve all existing BMAD agent functionality, add non-intrusive verification automation, extend visual dashboard with BMAD story organization.

### Story 1.1: Create MadShrimp Conversational Agent

As a developer,
I want to use `/madshrimp` command to access all BMAD PM capabilities,
so that I can continue natural conversational workflow with enhanced verification capabilities.

**Acceptance Criteria**:
1. `/madshrimp` command activates agent with full BMAD PM persona and commands
2. Agent provides all existing PM capabilities (*create-prd, *create-epic, *create-story, *shard-prd)
3. Agent responds conversationally without requiring subcommand syntax
4. Agent maintains John PM identity and investigative, data-driven approach

**Integration Verification**:
- IV1: All standard BMAD PM workflows function identically through MadShrimp agent
- IV2: Agent activation and command processing maintains existing response times
- IV3: BMAD story files created through MadShrimp match standard BMAD format exactly

### Story 1.2: Implement Auto-Verification MCP Tools

As a developer,
I want story completion to automatically trigger verification capture,
so that implementation details and challenges are documented without manual effort.

**Acceptance Criteria**:
1. New MCP tool `mcp__shrimp-task-manager__auto_verify_bmad_story` detects story completion
2. Tool captures implementation details, technical challenges, and quality scores
3. Verification completes within 30 seconds of story status change
4. Verification data persists and remains accessible through conversational queries

**Integration Verification**:
- IV1: BMAD story status changes trigger verification without impacting story file integrity
- IV2: Verification process does not interfere with ongoing BMAD agent operations
- IV3: Failed verification attempts gracefully fallback without blocking story completion

### Story 1.3: Extend Visual Dashboard with Epic Organization

As a developer,
I want to see BMAD stories organized by Epic with verification details in visual dashboard,
so that I can track project progress and review implementation learnings.

**Acceptance Criteria**:
1. BMADView component displays stories organized by Epic (1.1, 1.2, 1.3 format)
2. Each story shows completion status, verification score, and implementation details
3. Dashboard updates automatically when story statuses change
4. Epic progress indicators show completion percentage and verification summaries

**Integration Verification**:
- IV1: Visual dashboard integration maintains existing Shrimp task viewer functionality
- IV2: Real-time updates function without page refresh or performance degradation
- IV3: Epic organization handles multiple concurrent story updates correctly

### Story 1.4: Enable Conversational Access to Verification Data

As a developer,
I want to query verification results through natural conversation with MadShrimp,
so that I can review implementation details without leaving the CLI interface.

**Acceptance Criteria**:
1. MadShrimp agent responds to queries like "Show verification details for story 1.2"
2. Agent provides verification scores, technical challenges, and implementation notes conversationally
3. Agent can summarize epic progress and highlight stories needing attention
4. Verification data access integrates seamlessly with other PM conversations

**Integration Verification**:
- IV1: Conversational verification access maintains agent response consistency
- IV2: Verification data queries do not conflict with standard BMAD PM operations
- IV3: Agent gracefully handles requests for non-existent or incomplete verification data

### Story 1.5: Enable Story Editing Through Visual Interface

As a developer,
I want to edit BMAD stories directly through the Shrimp visual dashboard,
so that I can update story details, acceptance criteria, and status without switching to CLI.

**Acceptance Criteria**:
1. Story cards in visual dashboard include edit buttons for title, description, and acceptance criteria
2. Story status can be updated through dropdown or status workflow controls
3. Edits automatically save and sync back to BMAD story files in correct format
4. Real-time preview shows formatted story content before saving

**Integration Verification**:
- IV1: Edited story files maintain BMAD-compatible format and structure
- IV2: CLI access to edited stories shows updated content immediately
- IV3: Concurrent CLI and visual edits are handled with conflict resolution

### Story 1.6: Enable PRD Editing Through Visual Interface

As a product manager,
I want to edit PRD content through the Shrimp visual dashboard,
so that I can update requirements and epic details using a rich text interface.

**Acceptance Criteria**:
1. PRD sections display with inline editing capabilities for requirements and epic descriptions
2. Rich text editor supports markdown formatting and maintains PRD structure
3. Changes automatically save to `docs/prd.md` in BMAD-compatible format
4. Edit history and version tracking for PRD changes

**Integration Verification**:
- IV1: PRD edits maintain markdown structure and BMAD template compliance
- IV2: MadShrimp agent can access and reference updated PRD content immediately
- IV3: PRD editing does not conflict with BMAD shard-prd or other PRD operations

### Story 1.7: Add Parallel Work Indicators

As a project manager,
I want to see which stories multiple dev agents can work on simultaneously,
so that I can efficiently allocate development resources.

**Acceptance Criteria**:
1. Story cards display visual indicators: 👥 Multi-Dev OK or 👤 Single Dev Only
2. Indicators based on story metadata flag `multiDevOK: true/false`
3. Stories with independent files/components marked as Multi-Dev OK
4. Stories with shared components/database changes marked as Single Dev Only

**Integration Verification**:
- IV1: Parallel work indicators display correctly based on story metadata
- IV2: Indicators update when story dependencies or technical constraints change
- IV3: Visual indicators align with actual technical constraints in story requirements