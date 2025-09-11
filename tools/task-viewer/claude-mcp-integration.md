# Claude MCP Integration for Task Creation

## Problem
The "Create Tasks" button currently uses a mock MCP bridge that doesn't actually create real tasks in the Shrimp Task Manager. We need a backend endpoint that can interface with Claude's MCP tools.

## Current Architecture
```
Frontend (Create Tasks Button) 
    ↓
POST /api/tasks/create-from-story
    ↓
Mock MCP Bridge (returns fake data)
    ↓
No real tasks created ❌
```

## Required Architecture
```
Frontend (Create Tasks Button)
    ↓
POST /api/tasks/create-from-story
    ↓
Backend Claude API Integration
    ↓
Claude with MCP Server Access
    ↓
Real Shrimp Task Manager Tools
    ↓
Tasks saved to tasks.json ✅
```

## Implementation Options

### Option 1: Direct MCP Server Integration
Set up an MCP server that the backend can connect to directly:

```javascript
// server.js
import { MCPClient } from '@modelcontextprotocol/sdk';

const mcpClient = new MCPClient({
  serverPath: '/path/to/mcp-shrimp-task-manager',
  transport: 'stdio'
});

app.post('/api/tasks/create-from-story', async (req, res) => {
  const { storyId, storyContent } = req.body;
  
  // Use MCP client to call tools
  const planResult = await mcpClient.callTool('shrimp-task-manager__plan_task', {
    description: storyContent,
    requirements: extractRequirements(storyContent)
  });
  
  const tasks = await mcpClient.callTool('shrimp-task-manager__split_tasks', {
    // ... task splitting params
  });
  
  res.json({ success: true, tasks });
});
```

### Option 2: Claude API with MCP Access
Use Claude's API with MCP server configured:

```javascript
// server.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/tasks/create-from-story', async (req, res) => {
  const { storyId, storyContent } = req.body;
  
  // Call Claude with MCP tools available
  const response = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 4096,
    tools: [{
      name: 'mcp__shrimp-task-manager__plan_task',
      // ... tool definition
    }],
    messages: [{
      role: 'user',
      content: `Create tasks for this story: ${storyContent}`
    }]
  });
  
  // Extract tasks from Claude's response
  const tasks = parseTasksFromResponse(response);
  
  res.json({ success: true, tasks });
});
```

### Option 3: Subprocess Claude with MCP
Run Claude as a subprocess with MCP server:

```javascript
// server.js
import { spawn } from 'child_process';

app.post('/api/tasks/create-from-story', async (req, res) => {
  const { storyId, storyContent } = req.body;
  
  // Spawn Claude process with MCP server
  const claude = spawn('claude', [
    '--mcp-server', '/path/to/mcp-shrimp-task-manager',
    '--execute', 'create-tasks'
  ]);
  
  // Send story content
  claude.stdin.write(JSON.stringify({ storyId, storyContent }));
  
  // Collect output
  let output = '';
  claude.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  claude.on('close', () => {
    const tasks = JSON.parse(output);
    res.json({ success: true, tasks });
  });
});
```

## Environment Setup Required

1. **Install MCP Server**
   ```bash
   npm install -g @modelcontextprotocol/server
   ```

2. **Configure MCP Server**
   ```json
   {
     "mcpServers": {
       "shrimp-task-manager": {
         "command": "node",
         "args": ["/path/to/mcp-shrimp-task-manager/index.js"]
       }
     }
   }
   ```

3. **Set Environment Variables**
   ```bash
   ANTHROPIC_API_KEY=your-api-key
   MCP_SERVER_PATH=/path/to/mcp-shrimp-task-manager
   ```

## Next Steps

1. Choose an implementation approach based on available resources
2. Set up MCP server configuration
3. Implement the backend integration
4. Update the frontend to handle real task responses
5. Test with actual story content

## Testing the Integration

Once implemented, test with:

```bash
curl -X POST http://localhost:9998/api/tasks/create-from-story \
  -H "Content-Type: application/json" \
  -d '{
    "storyId": "story-001",
    "storyContent": "As a user, I want to register an account...",
    "clearExisting": false,
    "archiveFirst": false
  }'
```

Expected response:
```json
{
  "success": true,
  "tasks": [
    {
      "id": "actual-task-id",
      "name": "Create registration form",
      "description": "...",
      "status": "pending"
    }
  ]
}
```

## Current Workaround

Until the real integration is implemented, you can:
1. Use the Claude UI directly with the shrimp-task-manager MCP server
2. Copy the generated tasks manually
3. Or use the mock data for UI development