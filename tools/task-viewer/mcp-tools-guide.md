# MCP Shrimp Task Manager Tools Guide

## Overview
This guide shows how to use the MCP tools to create development tasks for story "test-001".

## Available MCP Tools

### 1. plan_task
Creates a comprehensive plan for implementing a user story.

**Input:**
```json
{
  "story_id": "test-001",
  "story_content": "Test story for creating a simple feature"
}
```

**Expected Output:**
```json
{
  "plan_id": "plan-test-001-xxxxx",
  "plan": {
    "overview": "Implementation plan for simple feature",
    "phases": [...],
    "estimated_total_hours": 26,
    "complexity": "medium"
  }
}
```

### 2. analyze_task
Analyzes a task plan for complexity, dependencies, and potential issues.

**Input:**
```json
{
  "task_id": "<plan_id from step 1>",
  "task_content": "<stringified plan from step 1>"
}
```

**Expected Output:**
```json
{
  "analysis": {
    "complexity_score": 6.5,
    "risk_areas": [...],
    "dependencies": [...],
    "recommendations": [...]
  }
}
```

### 3. split_tasks
Splits a plan into detailed implementation tasks.

**Input:**
```json
{
  "plan_id": "<plan_id from step 1>",
  "target_count": 7
}
```

**Expected Output:**
```json
{
  "tasks": [
    {
      "id": "task-001",
      "title": "Set up project structure",
      "description": "...",
      "status": "pending",
      "priority": "high",
      "estimated_hours": 2,
      "dependencies": []
    },
    // ... more tasks
  ]
}
```

### 4. list_tasks
Lists all tasks, optionally filtered by criteria.

**Input:**
```json
{
  "story_id": "test-001"
}
```

**Expected Output:**
```json
{
  "tasks": [
    // Array of all tasks for the story
  ]
}
```

## Step-by-Step Process

1. **Check Existing Tasks**
   - Use `list_tasks` with story_id "test-001"
   - This ensures we don't duplicate tasks

2. **Plan the Story**
   - Use `plan_task` with the story details
   - Save the returned plan_id and plan content

3. **Analyze the Plan**
   - Use `analyze_task` with the plan_id and stringified plan
   - Review the analysis for any concerns

4. **Create Implementation Tasks**
   - Use `split_tasks` with plan_id and target_count=7
   - This generates 7 detailed tasks

5. **Verify Results**
   - Use `list_tasks` again to see all created tasks

## Expected Task Types

For a "simple feature" story, expect tasks like:
- Project setup and configuration
- Data model/schema definition
- Core logic implementation
- API/interface development
- UI/frontend components
- Testing (unit, integration)
- Documentation and polish

## Notes
- Tasks are automatically saved to `/home/fire/claude/mcp-shrimp-task-manager/tasks.json`
- Each task has a unique ID, title, description, status, priority, estimated hours, and dependencies
- Dependencies ensure tasks are completed in the correct order
- The AI analyzes the story content to create contextually appropriate tasks