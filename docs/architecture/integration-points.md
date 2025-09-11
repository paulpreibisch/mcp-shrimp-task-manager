# Integration Points

## File System Watching
- Monitor `docs/stories/` directory for status changes
- Watch `docs/prd/` for PRD updates
- Debounce rapid changes (500ms)
- Handle file locks gracefully

## MCP Tool Integration
```typescript
// Auto-verification trigger
mcp__shrimp_task_manager__auto_verify_bmad_story({
  storyPath: string,
  storyContent: string,
  epicContext: string
});

// Dashboard update
mcp__shrimp_task_manager__update_story_dashboard({
  stories: BMADStory[],
  epics: BMADEpic[],
  verifications: VerificationResult[]
});

// Story editing
mcp__shrimp_task_manager__edit_bmad_story({
  storyId: string,
  updates: Partial<BMADStory>
});
```

## BMAD Agent Communication
- Agent reads story files directly from file system
- Agent triggers MCP tools via function calls
- Verification results stored in `.ai/verification/` directory
- Status updates propagate through file system events
