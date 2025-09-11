# BMAD Integration Guide

## Overview

Shrimp Task Manager now features seamless integration with the BMAD (Business-Minded Agent Development) system. When BMAD is detected in your project, Shrimp automatically delegates task execution to specialized BMAD agents while maintaining its role as the planning and tracking layer.

## How It Works

### Automatic Detection
Shrimp automatically detects BMAD presence by checking for the `.bmad-core` directory in your project root. When detected:

1. **Planning Phase**: Shrimp handles task planning, breakdown, and analysis
2. **Execution Phase**: BMAD agents handle implementation following their specialized workflows
3. **Tracking Phase**: Shrimp monitors progress and verifies completion

### Task Routing

When you use `execute_task`, Shrimp determines whether to use BMAD based on:

1. **BMAD Presence**: Is `.bmad-core` directory present?
2. **Task Type**: Does the task match BMAD patterns (stories, epics, PRDs)?
3. **Configuration**: Is BMAD integration enabled in `.shrimp-bmad.json`?
4. **Task Metadata**: Does the task have `useBMAD` metadata?

### Agent Mapping

Shrimp automatically maps tasks to appropriate BMAD agents:

| Task Pattern | BMAD Agent | Use Case |
|-------------|------------|----------|
| Story tasks | `dev` | Story implementation |
| PRD creation | `pm` | Product requirements |
| Testing tasks | `qa` | Quality assurance |
| Architecture | `architect` | System design |
| Analysis | `analyst` | Research & analysis |
| UX tasks | `ux-expert` | User experience |

## Configuration

Create `.shrimp-bmad.json` in your project root:

```json
{
  "enabled": true,           // Enable/disable BMAD integration
  "autoDetect": true,        // Auto-detect BMAD presence
  "preferBMAD": true,        // Prefer BMAD when available
  "agentMappings": {         // Custom agent mappings
    "development": "dev",
    "testing": "qa"
  },
  "storyFileLocation": "stories"  // Where to save story files
}
```

## Usage Examples

### Example 1: Story Implementation

```bash
# Plan a story task
plan_task "Story 1.1: Implement user authentication"

# Execute with BMAD (automatic)
execute_task <task-id>
# Output: "Task will be executed using BMAD agent: dev"
# Output: "/BMad:agents:dev *develop-story 1.1"
```

### Example 2: Force Standard Execution

Add metadata to bypass BMAD:

```bash
# Create task with metadata
plan_task "Fix styling issue" --metadata '{"useBMAD": false}'

# Will use standard Shrimp execution
execute_task <task-id>
```

### Example 3: Force BMAD Execution

Add metadata to force BMAD:

```bash
# Create task with metadata
plan_task "Complex feature" --metadata '{"useBMAD": true}'

# Will use BMAD even if pattern doesn't match
execute_task <task-id>
```

## Workflow Integration

### Recommended Workflow

1. **Planning Phase** (Shrimp)
   - `plan_task`: Break down requirements
   - `analyze_task`: Deep technical analysis
   - `split_tasks`: Create subtasks

2. **Execution Phase** (BMAD)
   - `execute_task`: Delegates to BMAD agent
   - BMAD agent follows its workflow
   - Story files created if needed

3. **Tracking Phase** (Shrimp)
   - Task status updated to IN_PROGRESS
   - Monitor progress via task viewer
   - `complete_task`: Mark as done
   - `verify_task`: Validate implementation

### Benefits

- **Clean Separation**: Planning vs execution clearly separated
- **Best of Both**: Shrimp's planning + BMAD's specialized execution
- **Visual Tracking**: Task viewer shows progress regardless of executor
- **Flexibility**: Can override automation when needed
- **Preservation**: Both systems maintain their strengths

## Troubleshooting

### BMAD Not Detected

Check:
1. `.bmad-core` directory exists in project root
2. `.shrimp-bmad.json` has `"enabled": true`
3. Task patterns match BMAD types

### Force Disable BMAD

Options:
1. Set `"enabled": false` in `.shrimp-bmad.json`
2. Add `"useBMAD": false` to task metadata
3. Delete `.shrimp-bmad.json` file

### Debug Mode

Check what Shrimp detects:
```bash
node test-bmad-integration.js
```

## API Reference

### Task Metadata

```typescript
interface TaskMetadata {
  useBMAD?: boolean;  // Force BMAD on/off
  [key: string]: any; // Other metadata
}
```

### Configuration Schema

```typescript
interface BMADConfig {
  enabled: boolean;
  autoDetect: boolean;
  preferBMAD: boolean;
  agentMappings: Record<string, string>;
  storyFileLocation: string;
}
```

## Future Enhancements

- [ ] Bi-directional sync between Shrimp tasks and BMAD stories
- [ ] Automatic agent recommendation based on task content
- [ ] BMAD agent status monitoring
- [ ] Integration with BMAD team configurations