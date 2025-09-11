# Technical Constraints and Integration Requirements

## Existing Technology Stack

**Languages**: TypeScript/JavaScript (MCP Shrimp), Markdown/YAML (BMAD agents)
**Frameworks**: React (Shrimp viewer), Node.js (Shrimp server), BMAD agent framework
**Database**: File-based (BMAD stories), JSON state (Shrimp tasks)
**Infrastructure**: MCP server architecture, CLI agent system
**External Dependencies**: BMAD-METHOD core, MCP protocol, React components

## Integration Approach

**Verification Integration Strategy**: File system watching for BMAD story status changes + MCP tool calls for auto-verification trigger when stories marked complete

**API Integration Strategy**: New MCP tools (`auto_verify_bmad_story`, `update_story_dashboard`, `organize_epic_structure`) bridge BMAD story completion events to Shrimp verification workflow

**Frontend Integration Strategy**: Extend existing BMADView component with Epic-based organization, verification result display, and story/PRD editing capabilities

**Testing Integration Strategy**: Verification integration testing through BMAD story completion simulation, visual dashboard update validation

## Code Organization and Standards

**File Structure Approach**: 
- MadShrimp agent: `/home/fire/claude/mcp-shrimp-task-manager/agents/madshrimp.md`
- New MCP tools: Extend existing `src/tools/` directory structure
- UI components: Enhance existing `tools/task-viewer/src/components/BMADView.jsx`

**Naming Conventions**: Follow existing patterns - `mcp__shrimp-task-manager__` prefix for new tools, camelCase for React components

**Coding Standards**: Maintain TypeScript strict mode, React functional components, BMAD YAML agent structure

**Documentation Standards**: Inline JSDoc for new functions, BMAD agent YAML documentation blocks

## Deployment and Operations

**Build Process Integration**: Extend existing npm scripts, no additional build pipeline needed

**Deployment Strategy**: File-based deployment for MadShrimp agent, existing server restart for MCP tools

**Monitoring and Logging**: Extend existing console logging, add verification completion tracking

**Configuration Management**: Optional feature flags in environment variables, backward compatible defaults

## Risk Assessment and Mitigation

**Technical Risks**: File system watching reliability, verification timing conflicts
**Integration Risks**: BMAD story format changes, MCP protocol updates
**Deployment Risks**: Agent file conflicts, React component integration issues
**Mitigation Strategies**: Graceful fallback to manual verification, comprehensive integration testing, version compatibility checks
