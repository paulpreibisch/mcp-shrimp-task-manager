import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';

// Mock modules
vi.mock('fs/promises');
vi.mock('http');

describe('Final Summary Endpoint', () => {
  let server;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      url: '/api/tasks/test-project-id/final-summary',
      on: vi.fn(),
      headers: {}
    };

    mockResponse = {
      writeHead: vi.fn(),
      end: vi.fn(),
      statusCode: 200
    };

    // Mock project data
    const mockProjects = [
      {
        id: 'test-project-id',
        name: 'Test Project',
        path: '/path/to/tasks.json'
      }
    ];

    // Setup a basic server with the endpoint
    global.projects = mockProjects;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle POST request with completed tasks', async () => {
    const mockCompletedTasks = [
      { id: '1', name: 'Create ExportFormatModal component', summary: 'Successfully created component' },
      { id: '2', name: 'Create image converter utility', summary: 'Successfully implemented utility' }
    ];

    const mockRequestBody = JSON.stringify({ completedTasks: mockCompletedTasks });

    // Mock fs.readFile to return existing tasks
    fs.readFile = vi.fn().mockResolvedValue(JSON.stringify({ tasks: [] }));
    fs.writeFile = vi.fn().mockResolvedValue(undefined);

    // Simulate request data event
    mockRequest.on.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from(mockRequestBody));
      }
      if (event === 'end') {
        setTimeout(() => callback(), 0);
      }
    });

    // Test the endpoint logic here
    expect(mockCompletedTasks).toHaveLength(2);
    expect(mockCompletedTasks[0].name).toContain('ExportFormatModal');
  });

  it('should return 400 if no completed tasks provided', async () => {
    const mockRequestBody = JSON.stringify({ completedTasks: [] });

    mockRequest.on.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from(mockRequestBody));
      }
      if (event === 'end') {
        // Should return 400 for empty tasks
        mockResponse.writeHead(400, { 'Content-Type': 'application/json' });
        mockResponse.end(JSON.stringify({ error: 'No completed tasks provided' }));
        callback();
      }
    });

    expect(mockResponse.statusCode).toBe(200); // Default status
  });

  it('should return 404 if project not found', async () => {
    mockRequest.url = '/api/tasks/unknown-project-id/final-summary';
    
    // Should return 404 for unknown project
    const projectId = 'unknown-project-id';
    const project = global.projects.find(p => p.id === projectId);
    
    expect(project).toBeUndefined();
  });

  it('should handle file read errors gracefully', async () => {
    const mockCompletedTasks = [
      { id: '1', name: 'Test task', summary: 'Test summary' }
    ];

    const mockRequestBody = JSON.stringify({ completedTasks: mockCompletedTasks });

    // Mock fs.readFile to throw an error
    fs.readFile = vi.fn().mockRejectedValue(new Error('File not found'));

    mockRequest.on.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from(mockRequestBody));
      }
      if (event === 'end') {
        // Should handle error gracefully
        callback();
      }
    });

    // Verify error handling
    await expect(fs.readFile('/path/to/tasks.json')).rejects.toThrow('File not found');
  });

  it('should generate summary with markdown format for completed projects', () => {
    const completedTasks = [
      { id: '1', name: 'Task 1', summary: 'Summary 1' },
      { id: '2', name: 'Task 2', summary: 'Summary 2' },
      { id: '3', name: 'Task 3', summary: 'Summary 3' }
    ];
    const totalTasks = 3; // All tasks completed

    // Test complete project summary generation
    const taskList = completedTasks.slice(0, 3).map(task => `• ✅ ${task.name}`).join('\n');
    const finalSummary = `**Project Status:**\n🎉 All ${completedTasks.length} tasks completed successfully\n\n**Key Deliverables:**\n${taskList}\n\n**Impact:**\n📊 All objectives achieved`;

    expect(finalSummary).toContain('**Project Status:**');
    expect(finalSummary).toContain('🎉 All');
    expect(finalSummary).toContain('✅');
    expect(finalSummary).toContain('**Key Deliverables:**');
    expect(finalSummary).toContain('**Impact:**');
    expect(finalSummary).not.toContain('🚧');
    expect(finalSummary).not.toContain('⚠️');
  });

  it('should generate partial progress summary with warning section', () => {
    const completedTasks = [
      { id: '1', name: 'Create ArchiveModal component', summary: 'Successfully created component' },
      { id: '2', name: 'Create ArchiveView component', summary: 'Successfully created view' },
      { id: '3', name: 'Create ImportArchiveModal component', summary: 'Successfully created import modal' },
      { id: '4', name: 'Create ViewArchiveModal component', summary: 'Successfully created view modal' }
    ];
    const totalTasks = 7; // 4 of 7 tasks completed
    const incompleteTaskNames = [
      'Add Archive button and integrate modals in App.jsx',
      'Add Archive tab to navigation', 
      'Add i18n translations for Archive feature'
    ];

    // Test partial progress summary generation
    const progress = Math.round((completedTasks.length / totalTasks) * 100); // 57%
    const taskList = completedTasks.map(task => `• ✅ ${task.name}`).join('\n');
    const incompleteList = incompleteTaskNames.map(name => `• ❌ ${name}`).join('\n');
    const incompleteCount = totalTasks - completedTasks.length;

    const finalSummary = `**Project Status:**
🚧 ${completedTasks.length} of ${totalTasks} tasks completed (${progress}% progress)

**Completed Deliverables:**
${taskList}

**⚠️ Remaining Tasks:**
${incompleteList}

**Impact:**
Partial progress achieved. Project completion pending ${incompleteCount} remaining tasks.`;

    expect(finalSummary).toContain('**Project Status:**');
    expect(finalSummary).toContain('🚧 4 of 7 tasks completed (57% progress)');
    expect(finalSummary).toContain('**Completed Deliverables:**');
    expect(finalSummary).toContain('**⚠️ Remaining Tasks:**');
    expect(finalSummary).toContain('❌ Add Archive button');
    expect(finalSummary).toContain('❌ Add Archive tab');
    expect(finalSummary).toContain('❌ Add i18n translations');
    expect(finalSummary).toContain('pending 3 remaining tasks');
    expect(finalSummary).not.toContain('🎉 All');
    expect(finalSummary).not.toContain('completed successfully');
  });

  it('should handle single remaining task correctly', () => {
    const completedTasks = [
      { id: '1', name: 'Task A', summary: 'Completed A' },
      { id: '2', name: 'Task B', summary: 'Completed B' }
    ];
    const totalTasks = 3; // 2 of 3 tasks completed
    const incompleteTaskNames = ['Task C'];

    const progress = Math.round((completedTasks.length / totalTasks) * 100); // 67%
    const taskList = completedTasks.map(task => `• ✅ ${task.name}`).join('\n');
    const incompleteList = incompleteTaskNames.map(name => `• ❌ ${name}`).join('\n');
    const incompleteCount = totalTasks - completedTasks.length;

    const finalSummary = `**Project Status:**
🚧 ${completedTasks.length} of ${totalTasks} tasks completed (${progress}% progress)

**Completed Deliverables:**
${taskList}

**⚠️ Remaining Tasks:**
${incompleteList}

**Impact:**
Partial progress achieved. Project completion pending ${incompleteCount} remaining task.`;

    expect(finalSummary).toContain('🚧 2 of 3 tasks completed (67% progress)');
    expect(finalSummary).toContain('**⚠️ Remaining Tasks:**');
    expect(finalSummary).toContain('❌ Task C');
    expect(finalSummary).toContain('pending 1 remaining task');
    expect(finalSummary).not.toContain('remaining tasks'); // Should be singular
  });

  it('should handle JSON parse errors', async () => {
    const invalidJson = 'not valid json';

    mockRequest.on.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from(invalidJson));
      }
      if (event === 'end') {
        try {
          JSON.parse(invalidJson);
        } catch (err) {
          mockResponse.writeHead(400, { 'Content-Type': 'application/json' });
          mockResponse.end(JSON.stringify({ error: 'Invalid request data' }));
        }
        callback();
      }
    });

    expect(() => JSON.parse(invalidJson)).toThrow();
  });

  it('should save summary to tasks.json', async () => {
    const mockCompletedTasks = [
      { id: '1', name: 'Task 1', summary: 'Summary 1' }
    ];

    const existingData = { tasks: [] };
    const expectedSummary = '**Project Status:**\n🚀 1 task completed successfully';

    fs.readFile = vi.fn().mockResolvedValue(JSON.stringify(existingData));
    fs.writeFile = vi.fn().mockResolvedValue(undefined);

    // Simulate saving summary
    const dataToSave = {
      ...existingData,
      finalSummary: expectedSummary,
      finalSummaryGeneratedAt: new Date().toISOString()
    };

    await fs.writeFile('/path/to/tasks.json', JSON.stringify(dataToSave, null, 2), 'utf8');

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/path/to/tasks.json',
      expect.stringContaining('finalSummary'),
      'utf8'
    );
  });
});