#!/usr/bin/env node

import http from 'http';
import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Version information
const VERSION = '2.0.0';
const PORT = process.env.SHRIMP_VIEWER_PORT || 9998;
const SETTINGS_FILE = path.join(os.homedir(), '.shrimp-task-viewer-settings.json');
const GLOBAL_SETTINGS_FILE = path.join(os.homedir(), '.shrimp-task-viewer-global-settings.json');
const TEMPLATES_DIR = path.join(os.homedir(), '.shrimp-task-viewer-templates');
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DEFAULT_TEMPLATES_DIR = path.join(PROJECT_ROOT, 'src', 'prompts', 'templates_en');

// Helper function to get ISO string in local timezone format
function getLocalISOString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // Get timezone offset in hours and minutes
  const offset = -now.getTimezoneOffset();
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
  const offsetSign = offset >= 0 ? '+' : '-';
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}

// Default agent data paths configuration
const defaultAgents = [];

let projects = []; // Project list

// Parse YAML frontmatter from agent file content
function parseAgentMetadata(content) {
    const metadata = {
        name: '',
        description: '',
        tools: [],
        color: null
    };
    
    if (!content) return metadata;
    
    // Check if content starts with YAML frontmatter
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);
    
    if (match) {
        const yamlContent = match[1];
        // Simple YAML parsing for the fields we need
        const lines = yamlContent.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('name:')) {
                metadata.name = trimmedLine.substring(5).trim().replace(/^["']|["']$/g, '');
            } else if (trimmedLine.startsWith('description:')) {
                metadata.description = trimmedLine.substring(12).trim().replace(/^["']|["']$/g, '');
            } else if (trimmedLine.startsWith('tools:')) {
                const toolsStr = trimmedLine.substring(6).trim();
                if (toolsStr) {
                    // Split by comma and trim each tool name
                    metadata.tools = toolsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
                }
            } else if (trimmedLine.startsWith('color:')) {
                metadata.color = trimmedLine.substring(6).trim().replace(/^["']|["']$/g, '');
            }
        }
    }
    
    return metadata;
}

// Load or create settings file
async function loadSettings() {
    try {
        console.log('Loading settings from:', SETTINGS_FILE);
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(data);
        console.log('Loaded settings:', settings);
        return settings.projects || settings.profiles || settings.agents || []; // Support new 'projects' and old keys for backward compatibility
    } catch (err) {
        console.error('Error loading settings:', err.message);
        await saveSettings(defaultAgents);
        return defaultAgents;
    }
}

// Save settings file
async function saveSettings(projectList) {
    const settings = {
        projects: projectList, // Changed from 'agents' to 'projects' for clarity
        lastUpdated: getLocalISOString(),
        version: VERSION
    };
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Load or create global settings file
async function loadGlobalSettings() {
    try {
        console.log('Loading global settings from:', GLOBAL_SETTINGS_FILE);
        const data = await fs.readFile(GLOBAL_SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(data);
        console.log('Loaded global settings:', settings);
        return settings;
    } catch (err) {
        console.error('Error loading global settings:', err.message);
        const defaultGlobalSettings = {
            claudeFolderPath: '',
            lastUpdated: getLocalISOString(),
            version: VERSION
        };
        await saveGlobalSettings(defaultGlobalSettings);
        return defaultGlobalSettings;
    }
}

// Save global settings file
async function saveGlobalSettings(settings) {
    await fs.writeFile(GLOBAL_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Add new project
async function addProject(name, filePath, projectRoot = null) {
    const id = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const newProfile = { id, name, path: filePath, projectRoot };
    
    const existingIndex = projects.findIndex(p => p.id === id);
    if (existingIndex >= 0) {
        projects[existingIndex] = newProfile;
    } else {
        projects.push(newProfile);
    }
    
    await saveSettings(projects);
    return newProfile;
}

// Remove project
async function removeProject(projectId) {
    projects = projects.filter(p => p.id !== projectId);
    await saveSettings(projects);
}

// Rename agent
async function renameProject(projectId, newName) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        throw new Error('Project not found');
    }
    project.name = newName;
    await saveSettings(projects);
    return project;
}

async function updateProject(projectId, updates) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        throw new Error('Project not found');
    }
    
    // Apply updates
    if (updates.name !== undefined) {
        project.name = updates.name;
    }
    if (updates.projectRoot !== undefined) {
        project.projectRoot = updates.projectRoot;
    }
    if (updates.taskPath !== undefined) {
        // Update the path property (which is what the project actually uses)
        project.path = updates.taskPath;
        // Also update taskPath and filePath for consistency
        project.taskPath = updates.taskPath;
        project.filePath = updates.taskPath;
    }
    
    await saveSettings(projects);
    return project;
}

// MIME type helper
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };
    return mimeTypes[ext] || 'text/plain';
}

// Template management functions
async function scanDefaultTemplates() {
    try {
        const templates = {};
        const functionDirs = await fs.readdir(DEFAULT_TEMPLATES_DIR);
        
        for (const functionName of functionDirs) {
            const functionPath = path.join(DEFAULT_TEMPLATES_DIR, functionName);
            const stat = await fs.stat(functionPath);
            
            if (stat.isDirectory()) {
                const indexPath = path.join(functionPath, 'index.md');
                try {
                    const content = await fs.readFile(indexPath, 'utf8');
                    templates[functionName] = {
                        name: functionName,
                        content,
                        status: 'default',
                        source: 'built-in'
                    };
                } catch (err) {
                    console.log(`No index.md found for ${functionName}`);
                }
            }
        }
        
        return templates;
    } catch (err) {
        console.error('Error scanning default templates:', err);
        return {};
    }
}

async function scanCustomTemplates() {
    try {
        const templates = {};
        await fs.mkdir(TEMPLATES_DIR, { recursive: true });
        const functionDirs = await fs.readdir(TEMPLATES_DIR);
        
        for (const functionName of functionDirs) {
            const functionPath = path.join(TEMPLATES_DIR, functionName);
            const stat = await fs.stat(functionPath);
            
            if (stat.isDirectory()) {
                const indexPath = path.join(functionPath, 'index.md');
                try {
                    const content = await fs.readFile(indexPath, 'utf8');
                    templates[functionName] = {
                        name: functionName,
                        content,
                        status: 'custom',
                        source: 'user-custom'
                    };
                } catch (err) {
                    console.log(`No index.md found in custom templates for ${functionName}`);
                }
            }
        }
        
        return templates;
    } catch (err) {
        console.error('Error scanning custom templates:', err);
        return {};
    }
}

function getEnvironmentOverrides() {
    const overrides = {};
    
    for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('MCP_PROMPT_')) {
            let functionName = key.replace('MCP_PROMPT_', '').toLowerCase();
            let isAppend = false;
            
            if (functionName.endsWith('_append')) {
                functionName = functionName.replace('_append', '');
                isAppend = true;
            }
            
            // Convert PLAN_TASK -> planTask format
            const camelCase = functionName.split('_').map((word, index) => 
                index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
            ).join('');
            
            if (!overrides[camelCase]) {
                overrides[camelCase] = {};
            }
            
            if (isAppend) {
                overrides[camelCase].append = value;
            } else {
                overrides[camelCase].override = value;
            }
        }
    }
    
    return overrides;
}

async function getAllTemplates() {
    const defaultTemplates = await scanDefaultTemplates();
    const customTemplates = await scanCustomTemplates();
    const envOverrides = getEnvironmentOverrides();
    
    const allTemplates = { ...defaultTemplates };
    
    // Apply custom templates
    for (const [name, template] of Object.entries(customTemplates)) {
        allTemplates[name] = template;
    }
    
    // Apply environment overrides
    for (const [name, override] of Object.entries(envOverrides)) {
        if (allTemplates[name]) {
            if (override.override) {
                allTemplates[name].content = override.override;
                allTemplates[name].status = 'env-override';
                allTemplates[name].source = 'environment';
            } else if (override.append) {
                allTemplates[name].content += '\n\n' + override.append;
                allTemplates[name].status = 'env-append';
                allTemplates[name].source = 'environment+' + allTemplates[name].source;
            }
        } else if (override.override) {
            // Create new template from environment
            allTemplates[name] = {
                name,
                content: override.override,
                status: 'env-only',
                source: 'environment'
            };
        }
    }
    
    return allTemplates;
}

async function getTemplate(functionName) {
    const templates = await getAllTemplates();
    return templates[functionName] || null;
}

async function saveCustomTemplate(functionName, content) {
    try {
        const functionDir = path.join(TEMPLATES_DIR, functionName);
        await fs.mkdir(functionDir, { recursive: true });
        
        const indexPath = path.join(functionDir, 'index.md');
        await fs.writeFile(indexPath, content, 'utf8');
        
        return true;
    } catch (err) {
        console.error('Error saving custom template:', err);
        return false;
    }
}

async function deleteCustomTemplate(functionName) {
    try {
        const functionDir = path.join(TEMPLATES_DIR, functionName);
        await fs.rm(functionDir, { recursive: true, force: true });
        return true;
    } catch (err) {
        console.error('Error deleting custom template:', err);
        return false;
    }
}


// Serve static files from dist directory
async function serveStaticFile(req, res, filePath) {
    try {
        const fullPath = path.join(__dirname, 'dist', filePath);
        const data = await fs.readFile(fullPath);
        const mimeType = getMimeType(fullPath);
        
        res.writeHead(200, { 
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000' // 1 year cache for assets
        });
        res.end(data);
    } catch (err) {
        // If file not found, serve index.html for SPA routing
        if (err.code === 'ENOENT' && !filePath.includes('.')) {
            try {
                const indexPath = path.join(__dirname, 'dist', 'index.html');
                const indexData = await fs.readFile(indexPath);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(indexData);
            } catch (indexErr) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('React app not built. Run: npm run build');
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
        }
    }
}

// Initialize and start server
async function startServer() {
    projects = await loadSettings();
    
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // API routes
        if (url.pathname === '/api/check-env' && req.method === 'GET') {
            // Check for environment variable
            const envVarName = 'OPEN_AI_KEY_SHRIMP_TASK_VIEWER';
            const isSet = !!process.env[envVarName];
            console.log(`Checking env var ${envVarName}: ${isSet ? 'SET' : 'NOT SET'}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                envVarName,
                isSet,
                value: isSet ? '***HIDDEN***' : null 
            }));
            
        } else if (url.pathname === '/api/agents' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(projects));
            
        } else if (url.pathname === '/api/add-project' && req.method === 'POST') {
            // Handle JSON or form data
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    let name, taskFileContent, filePath, projectRoot;
                    
                    // Try to parse as JSON first
                    const contentType = req.headers['content-type'] || '';
                    if (contentType.includes('application/json')) {
                        const data = JSON.parse(body);
                        name = data.name;
                        taskFileContent = data.taskFile;
                        filePath = data.filePath;
                        projectRoot = data.projectRoot;
                    } else {
                        // Parse as URL-encoded form data
                        const formData = new URLSearchParams(body);
                        name = formData.get('name');
                        taskFileContent = formData.get('taskFile');
                        filePath = formData.get('filePath');
                        projectRoot = formData.get('projectRoot');
                    }
                    
                    if (!name) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Missing name');
                        return;
                    }
                    
                    // If a file path is provided, use it directly
                    if (filePath) {
                        const project = await addProject(name, filePath, projectRoot);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(project));
                    } else if (taskFileContent) {
                        // Save the file content to a temporary location
                        const tempDir = path.join(os.tmpdir(), 'shrimp-task-viewer');
                        await fs.mkdir(tempDir, { recursive: true });
                        const tempFilePath = path.join(tempDir, `${Date.now()}-tasks.json`);
                        await fs.writeFile(tempFilePath, taskFileContent);
                        
                        const project = await addProject(name, tempFilePath, projectRoot);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(project));
                    } else {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Missing taskFile or filePath');
                    }
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal server error: ' + err.message);
                }
            });
            
        } else if (url.pathname.startsWith('/api/remove-project/') && req.method === 'DELETE') {
            const projectId = url.pathname.split('/').pop();
            try {
                await removeProject(projectId);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Project removed');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal server error: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/rename-project/') && req.method === 'PUT') {
            const projectId = url.pathname.split('/').pop();
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { name } = JSON.parse(body);
                    if (!name) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Missing name');
                        return;
                    }
                    const project = await renameProject(projectId, name);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(project));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal server error: ' + err.message);
                }
            });
            
        } else if (url.pathname.startsWith('/api/update-project/') && req.method === 'PUT') {
            const projectId = url.pathname.split('/').pop();
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const updates = JSON.parse(body);
                    const project = await updateProject(projectId, updates);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(project));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal server error: ' + err.message);
                }
            });
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/update') && req.method === 'PUT') {
            // Handle task update
            const pathParts = url.pathname.split('/');
            const projectId = pathParts[pathParts.length - 2];
            console.log('Update task route - projectId:', projectId, 'projects:', projects.map(p => p.id));
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                console.error('Project not found:', projectId, 'Available projects:', projects.map(p => p.id));
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { taskId, updates } = JSON.parse(body);
                    
                    // Read current tasks
                    const data = await fs.readFile(project.path, 'utf8');
                    const tasksData = JSON.parse(data);
                    
                    // Find and update the task
                    const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
                    if (taskIndex === -1) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Task not found');
                        return;
                    }
                    
                    // Update task fields
                    tasksData.tasks[taskIndex] = {
                        ...tasksData.tasks[taskIndex],
                        ...updates,
                        updatedAt: getLocalISOString()
                    };
                    
                    // Write back to file
                    await fs.writeFile(project.path, JSON.stringify(tasksData, null, 2));
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(tasksData.tasks[taskIndex]));
                } catch (err) {
                    console.error('Error updating task:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error updating task: ' + err.message);
                }
            });
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/delete') && req.method === 'DELETE') {
            // Handle task delete
            const pathParts = url.pathname.split('/');
            const taskId = pathParts[pathParts.length - 2];
            const projectId = pathParts[pathParts.length - 3];
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            try {
                // Read current tasks
                const data = await fs.readFile(project.path, 'utf8');
                const tasksData = JSON.parse(data);
                
                // Find and remove the task
                const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
                if (taskIndex === -1) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Task not found');
                    return;
                }
                
                // Remove the task
                tasksData.tasks.splice(taskIndex, 1);
                
                // Write back to file
                await fs.writeFile(project.path, JSON.stringify(tasksData, null, 2));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Task deleted successfully' }));
            } catch (err) {
                console.error('Error deleting task:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error deleting task: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/tasks/')) {
            const projectId = url.pathname.split('?')[0].split('/').pop();
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            try {
                console.log(`Reading tasks from: ${project.path}`);
                
                // Check if file exists
                try {
                    await fs.access(project.path);
                } catch (accessErr) {
                    // File doesn't exist - return empty tasks with helpful message
                    console.log(`Tasks file doesn't exist yet: ${project.path}`);
                    const emptyResponse = {
                        tasks: [],
                        projectRoot: project.projectRoot || null,
                        message: "No tasks found. The tasks.json file hasn't been created yet. Run shrimp in this folder to generate tasks."
                    };
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    });
                    res.end(JSON.stringify(emptyResponse));
                    return;
                }
                
                const stats = await fs.stat(project.path);
                console.log(`File last modified: ${stats.mtime}`);
                
                const data = await fs.readFile(project.path, 'utf8');
                const tasksData = JSON.parse(data);
                
                // Log task status for debugging
                const task880f = tasksData.tasks?.find(t => t.id === '880f4dd8-a603-4bb9-8d4d-5033887d0e0f');
                if (task880f) {
                    console.log(`Task 880f4dd8 status: ${task880f.status}`);
                }
                
                // Add projectRoot to the response
                if (project.projectRoot) {
                    tasksData.projectRoot = project.projectRoot;
                }
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                res.end(JSON.stringify(tasksData));
            } catch (err) {
                console.error(`Error reading file ${project.path}:`, err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error reading task file: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/history/') && url.pathname.split('/').length === 4) {
            const projectId = url.pathname.split('/').pop();
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Agent not found');
                return;
            }
            
            try {
                const tasksPath = project.path || project.filePath;
                const memoryDir = path.join(path.dirname(tasksPath), 'memory');
                
                console.log(`[History] Looking for memory directory at: ${memoryDir}`);
                console.log(`[History] Tasks path: ${tasksPath}`);
                
                // Check if memory directory exists
                const memoryExists = await fs.access(memoryDir).then(() => true).catch(() => false);
                if (!memoryExists) {
                    console.log(`[History] Memory directory does not exist at: ${memoryDir}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        history: [],
                        message: `No history found. Memory directory expected at: ${memoryDir}`
                    }));
                    return;
                }
                
                // Read memory files
                const files = await fs.readdir(memoryDir);
                const memoryFiles = files.filter(f => f.startsWith('tasks_memory_') && f.endsWith('.json'));
                
                console.log(`[History] Found ${memoryFiles.length} memory files in ${memoryDir}`);
                
                const historyData = await Promise.all(memoryFiles.map(async (filename) => {
                    try {
                        const filePath = path.join(memoryDir, filename);
                        const content = await fs.readFile(filePath, 'utf8');
                        const data = JSON.parse(content);
                        
                        // Parse timestamp from filename: tasks_memory_2025-07-31T21-54-13.json
                        const timestampMatch = filename.match(/tasks_memory_(.+)\.json$/);
                        let timestamp = getLocalISOString();
                        if (timestampMatch) {
                            // Convert 2025-07-31T21-54-13 to 2025-07-31T21:54:13
                            const rawTimestamp = timestampMatch[1];
                            timestamp = rawTimestamp.replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3');
                        }
                        
                        // Calculate task statistics
                        const tasks = data.tasks || [];
                        const stats = {
                            total: tasks.length,
                            completed: tasks.filter(t => t.status === 'completed').length,
                            pending: tasks.filter(t => t.status === 'pending').length,
                            inProgress: tasks.filter(t => t.status === 'in_progress').length
                        };
                        
                        return {
                            filename,
                            timestamp,
                            taskCount: tasks.length,
                            stats,
                            hasData: tasks.length > 0
                        };
                    } catch (err) {
                        console.error(`Error reading memory file ${filename}:`, err);
                        return null;
                    }
                }));
                
                // Filter out failed files and sort by timestamp descending
                const validHistory = historyData.filter(h => h !== null)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ history: validHistory }));
                
            } catch (err) {
                console.error('Error loading history:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading history');
            }
            
        } else if (url.pathname.startsWith('/api/history/') && url.pathname.split('/').length === 5) {
            // Handle /api/history/{projectId}/{filename}
            const pathParts = url.pathname.split('/');
            const projectId = pathParts[3];
            const filename = pathParts[4];
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Agent not found');
                return;
            }
            
            // Security check: ensure filename is valid memory file
            if (!filename.startsWith('tasks_memory_') || !filename.endsWith('.json') || filename.includes('..')) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid filename');
                return;
            }
            
            try {
                const tasksPath = project.path || project.filePath;
                const memoryDir = path.join(path.dirname(tasksPath), 'memory');
                const filePath = path.join(memoryDir, filename);
                
                // Check if file exists
                const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
                if (!fileExists) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('History file not found');
                    return;
                }
                
                // Read and parse the memory file
                const content = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(content);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
                
            } catch (err) {
                console.error('Error loading history file:', err);
                if (err instanceof SyntaxError) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid JSON in memory file');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading history file');
                }
            }
            
        } else if (url.pathname === '/api/readme' && req.method === 'GET') {
            // Serve README.md file
            try {
                const readmePath = path.join(__dirname, 'README.md');
                const data = await fs.readFile(readmePath, 'utf8');
                res.writeHead(200, { 
                    'Content-Type': 'text/markdown; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(data);
            } catch (err) {
                console.error('Error reading README:', err);
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('README not found');
            }

        // Template management API routes
        } else if (url.pathname === '/api/templates' && req.method === 'GET') {
            // List all templates with status
            try {
                const templates = await getAllTemplates();
                const templateList = Object.values(templates).map(template => ({
                    name: template.name,
                    status: template.status,
                    source: template.source,
                    contentLength: template.content.length
                }));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(templateList));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading templates: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/templates/') && !url.pathname.includes('/duplicate')) {
            const functionName = url.pathname.split('/').pop();
            
            if (req.method === 'GET') {
                // Get specific template
                try {
                    const template = await getTemplate(functionName);
                    if (!template) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Template not found');
                        return;
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(template));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading template: ' + err.message);
                }
                
            } else if (req.method === 'PUT') {
                // Update template
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', async () => {
                    try {
                        const { content } = JSON.parse(body);
                        if (!content) {
                            res.writeHead(400, { 'Content-Type': 'text/plain' });
                            res.end('Missing content');
                            return;
                        }
                        
                        const success = await saveCustomTemplate(functionName, content);
                        if (success) {
                            const updatedTemplate = await getTemplate(functionName);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(updatedTemplate));
                        } else {
                            res.writeHead(500, { 'Content-Type': 'text/plain' });
                            res.end('Failed to save template');
                        }
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Error updating template: ' + err.message);
                    }
                });
                
            } else if (req.method === 'DELETE') {
                // Reset to default (delete custom template)
                try {
                    const success = await deleteCustomTemplate(functionName);
                    if (success) {
                        const defaultTemplate = await getTemplate(functionName);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(defaultTemplate || { message: 'Template reset to default' }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Failed to reset template');
                    }
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error resetting template: ' + err.message);
                }
            }
            
        } else if (url.pathname.startsWith('/api/templates/') && url.pathname.endsWith('/duplicate') && req.method === 'POST') {
            // Duplicate template
            const functionName = url.pathname.split('/')[3];
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { newName } = JSON.parse(body);
                    if (!newName) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Missing newName');
                        return;
                    }
                    
                    const sourceTemplate = await getTemplate(functionName);
                    if (!sourceTemplate) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Source template not found');
                        return;
                    }
                    
                    const success = await saveCustomTemplate(newName, sourceTemplate.content);
                    if (success) {
                        const newTemplate = await getTemplate(newName);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(newTemplate));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Failed to duplicate template');
                    }
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error duplicating template: ' + err.message);
                }
            });
            
        // Global settings API routes
        } else if (url.pathname === '/api/global-settings' && req.method === 'GET') {
            // Get global settings
            try {
                const settings = await loadGlobalSettings();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(settings));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading global settings: ' + err.message);
            }
            
        } else if (url.pathname === '/api/global-settings' && req.method === 'PUT') {
            // Update global settings
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const newSettings = JSON.parse(body);
                    newSettings.lastUpdated = getLocalISOString();
                    newSettings.version = VERSION;
                    
                    await saveGlobalSettings(newSettings);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(newSettings));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error saving global settings: ' + err.message);
                }
            });
            
        // Agent management API routes
        } else if (url.pathname === '/api/agents/global' && req.method === 'GET') {
            // List global agents from Claude folder
            try {
                const settings = await loadGlobalSettings();
                const claudeFolderPath = settings.claudeFolderPath;
                
                if (!claudeFolderPath) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify([]));
                    return;
                }
                
                const agentsDir = path.join(claudeFolderPath, 'agents');
                let agentFiles = [];
                
                try {
                    const files = await fs.readdir(agentsDir);
                    agentFiles = files.filter(file => 
                        file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')
                    );
                } catch (err) {
                    // Directory doesn't exist, return empty array
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify([]));
                    return;
                }
                
                // Read each agent file to get content
                const agentList = await Promise.all(agentFiles.map(async (filename) => {
                    try {
                        const filePath = path.join(agentsDir, filename);
                        const content = await fs.readFile(filePath, 'utf8');
                        const metadata = parseAgentMetadata(content);
                        return {
                            name: filename,
                            content: content,
                            path: filePath,
                            metadata: metadata
                        };
                    } catch (err) {
                        return {
                            name: filename,
                            content: '',
                            path: path.join(agentsDir, filename),
                            error: err.message,
                            metadata: parseAgentMetadata('')
                        };
                    }
                }));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(agentList));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading global agents: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/agents/project/') && req.method === 'GET' && url.pathname.split('/').length === 5) {
            // List project agents from .claude/agents directory
            const pathParts = url.pathname.split('/');
            // /api/agents/project/:projectId
            const projectId = pathParts[4];
            console.log('Looking for project agents for projectId:', projectId);
            console.log('Available projects:', projects.map(p => ({ id: p.id, name: p.name, projectRoot: p.projectRoot })));
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                console.log('Project not found for projectId:', projectId);
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            try {
                const projectRoot = project.projectRoot;
                console.log('Project root:', projectRoot);
                if (!projectRoot) {
                    console.log('No project root configured for project:', projectId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify([]));
                    return;
                }
                
                const agentsDir = path.join(projectRoot, '.claude', 'agents');
                console.log('Looking for agents in directory:', agentsDir);
                let agentFiles = [];
                
                try {
                    const files = await fs.readdir(agentsDir);
                    console.log('Found files in agents directory:', files);
                    agentFiles = files.filter(file => 
                        file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')
                    );
                    console.log('Filtered agent files:', agentFiles);
                } catch (err) {
                    // Directory doesn't exist, return empty array
                    console.log('Error reading agents directory:', err.message);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify([]));
                    return;
                }
                
                // Read each agent file to get content
                const projectAgents = await Promise.all(agentFiles.map(async (filename) => {
                    try {
                        const filePath = path.join(agentsDir, filename);
                        const content = await fs.readFile(filePath, 'utf8');
                        const metadata = parseAgentMetadata(content);
                        // Debug logging for project agents
                        console.log(`Parsing ${filename}:`, {
                            tools: metadata.tools,
                            toolsLength: metadata.tools.length,
                            firstLine: content.split('\n')[0]
                        });
                        return {
                            name: filename,
                            content: content,
                            path: filePath,
                            metadata: metadata
                        };
                    } catch (err) {
                        return {
                            name: filename,
                            content: '',
                            path: path.join(agentsDir, filename),
                            error: err.message,
                            metadata: parseAgentMetadata('')
                        };
                    }
                }));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(projectAgents));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading project agents: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/agents/global/') && req.method === 'GET') {
            // Read specific global agent file
            const filename = url.pathname.split('/').pop();
            
            try {
                const settings = await loadGlobalSettings();
                const claudeFolderPath = settings.claudeFolderPath;
                
                if (!claudeFolderPath) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Claude folder path not configured');
                    return;
                }
                
                const filePath = path.join(claudeFolderPath, 'agents', filename);
                const content = await fs.readFile(filePath, 'utf8');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    name: filename,
                    content: content,
                    path: filePath,
                    metadata: parseAgentMetadata(content)
                }));
            } catch (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Agent file not found: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/agents/global/') && req.method === 'PUT') {
            // Update specific global agent file
            const filename = url.pathname.split('/').pop();
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { content } = JSON.parse(body);
                    if (!content && content !== '') {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Missing content');
                        return;
                    }
                    
                    const settings = await loadGlobalSettings();
                    const claudeFolderPath = settings.claudeFolderPath;
                    
                    if (!claudeFolderPath) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Claude folder path not configured');
                        return;
                    }
                    
                    const filePath = path.join(claudeFolderPath, 'agents', filename);
                    await fs.writeFile(filePath, content, 'utf8');
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        name: filename,
                        content: content,
                        path: filePath,
                        message: 'Agent updated successfully'
                    }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error updating agent: ' + err.message);
                }
            });
            
        } else if (url.pathname.startsWith('/api/agents/project/') && req.method === 'GET' && url.pathname.split('/').length === 6) {
            // Read specific project agent file
            const pathParts = url.pathname.split('/');
            const projectId = pathParts[4];
            const filename = pathParts[5];
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            try {
                const projectRoot = project.projectRoot;
                if (!projectRoot) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Project root not configured for this profile');
                    return;
                }
                
                const filePath = path.join(projectRoot, '.claude', 'agents', filename);
                const content = await fs.readFile(filePath, 'utf8');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    name: filename,
                    content: content,
                    path: filePath,
                    metadata: parseAgentMetadata(content)
                }));
            } catch (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Agent file not found: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/agents/project/') && req.method === 'PUT' && url.pathname.split('/').length === 6) {
            // Update specific project agent file
            const pathParts = url.pathname.split('/');
            const projectId = pathParts[4];
            const filename = pathParts[5];
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { content } = JSON.parse(body);
                    if (!content && content !== '') {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Missing content');
                        return;
                    }
                    
                    const projectRoot = project.projectRoot;
                    if (!projectRoot) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Project root not configured for this profile');
                        return;
                    }
                    
                    const filePath = path.join(projectRoot, '.claude', 'agents', filename);
                    await fs.writeFile(filePath, content, 'utf8');
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        name: filename,
                        content: content,
                        path: filePath,
                        message: 'Project agent updated successfully'
                    }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error updating project agent: ' + err.message);
                }
            });
            
        } else if (url.pathname.startsWith('/api/agents/combined/') && req.method === 'GET') {
            // Get combined list of global and project agents
            const profileId = url.pathname.split('/').pop();
            const project = projects.find(p => p.id === profileId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            try {
                // Load global agents
                const settings = await loadGlobalSettings();
                const claudeFolderPath = settings.claudeFolderPath;
                let globalAgents = [];
                
                if (claudeFolderPath) {
                    const agentsDir = path.join(claudeFolderPath, 'agents');
                    try {
                        const files = await fs.readdir(agentsDir);
                        const agentFiles = files.filter(file => 
                            file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')
                        );
                        
                        globalAgents = await Promise.all(agentFiles.map(async (filename) => {
                            try {
                                const filePath = path.join(agentsDir, filename);
                                const content = await fs.readFile(filePath, 'utf8');
                                const metadata = parseAgentMetadata(content);
                                return {
                                    name: filename,
                                    type: 'global',
                                    content: content,
                                    path: filePath,
                                    metadata: metadata
                                };
                            } catch (err) {
                                return {
                                    name: filename,
                                    type: 'global',
                                    content: '',
                                    path: path.join(agentsDir, filename),
                                    error: err.message,
                                    metadata: parseAgentMetadata('')
                                };
                            }
                        }));
                    } catch (err) {
                        // Directory doesn't exist, continue with empty global agents
                        console.log('Global agents directory not found:', err.message);
                    }
                }
                
                // Load project agents
                let projectAgents = [];
                const projectRoot = project.projectRoot;
                
                if (projectRoot) {
                    const agentsDir = path.join(projectRoot, '.claude', 'agents');
                    try {
                        const files = await fs.readdir(agentsDir);
                        const agentFiles = files.filter(file => 
                            file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')
                        );
                        
                        projectAgents = await Promise.all(agentFiles.map(async (filename) => {
                            try {
                                const filePath = path.join(agentsDir, filename);
                                const content = await fs.readFile(filePath, 'utf8');
                                const metadata = parseAgentMetadata(content);
                                return {
                                    name: filename,
                                    type: 'project',
                                    content: content,
                                    path: filePath,
                                    metadata: metadata
                                };
                            } catch (err) {
                                return {
                                    name: filename,
                                    type: 'project',
                                    content: '',
                                    path: path.join(agentsDir, filename),
                                    error: err.message,
                                    metadata: parseAgentMetadata('')
                                };
                            }
                        }));
                    } catch (err) {
                        // Directory doesn't exist, continue with empty project agents
                        console.log('Project agents directory not found:', err.message);
                    }
                }
                
                // Combine and deduplicate agents
                // Project agents take precedence over global agents with the same name
                const agentMap = new Map();
                
                // Add global agents first
                globalAgents.forEach(agent => {
                    agentMap.set(agent.name, agent);
                });
                
                // Add/override with project agents
                projectAgents.forEach(agent => {
                    agentMap.set(agent.name, agent);
                });
                
                // Convert map back to array and return agent objects with metadata
                const combinedAgents = Array.from(agentMap.values()).map(agent => ({
                    name: agent.name,
                    description: agent.metadata?.description || '',
                    type: agent.type,
                    tools: agent.metadata?.tools || [],
                    color: agent.metadata?.color || null
                }));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(combinedAgents));
                
            } catch (err) {
                console.error('Error loading combined agents:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading combined agents: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/releases/')) {
            // Serve release files (markdown and images)
            const fileName = url.pathname.split('/').pop();
            try {
                const releasePath = path.join(__dirname, 'releases', fileName);
                console.log('Attempting to read release file:', releasePath);
                
                if (fileName.endsWith('.md')) {
                    const data = await fs.readFile(releasePath, 'utf8');
                    res.writeHead(200, { 
                        'Content-Type': 'text/markdown; charset=utf-8',
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    });
                    res.end(data);
                } else {
                    // Serve images and other files
                    const data = await fs.readFile(releasePath);
                    const mimeType = getMimeType(releasePath);
                    res.writeHead(200, { 
                        'Content-Type': mimeType,
                        'Cache-Control': 'public, max-age=31536000' // Cache images for 1 year
                    });
                    res.end(data);
                }
            } catch (err) {
                console.error('Error reading release file:', err);
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Release file not found');
            }
            
        } else if (url.pathname === '/api/ai-assign-agents' && req.method === 'POST') {
            // AI-powered agent assignment for bulk tasks
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { projectId, taskIds } = JSON.parse(body);
                    console.log('AI Agent Assignment request:', { projectId, taskIds });
                    
                    // Check if OpenAI API key is set - first from settings, then environment
                    let openAIKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY_SHRIMP_TASK_VIEWER;
                    
                    // Try to get key from global settings if not in environment
                    if (!openAIKey) {
                        try {
                            const globalSettings = await loadGlobalSettings();
                            if (globalSettings && globalSettings.openAIKey) {
                                openAIKey = globalSettings.openAIKey;
                            }
                        } catch (err) {
                            console.error('Error loading global settings for API key:', err);
                        }
                    }
                    
                    if (!openAIKey) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: 'OpenAI API key not configured',
                            message: 'To use AI agent assignment, please configure your OpenAI API key.',
                            instructions: [
                                '1. Go to Settings → Global Settings in the app',
                                '   Enter your API key in the "OpenAI API Key" field',
                                '   Click Save',
                                '',
                                '2. Or create a .env file in:',
                                '   ' + path.resolve(process.cwd(), '.env'),
                                '   Add: OPENAI_API_KEY=sk-your-api-key-here',
                                '',
                                '3. Get your API key from:',
                                '   https://platform.openai.com/api-keys'
                            ]
                        }));
                        return;
                    }
                    
                    // Get project and tasks
                    const project = projects.find(p => p.id === projectId);
                    if (!project) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Project not found' }));
                        return;
                    }
                    
                    // Load tasks
                    const tasksData = await fs.readFile(project.path || project.filePath, 'utf8');
                    const tasksJson = JSON.parse(tasksData);
                    const allTasks = Array.isArray(tasksJson) ? tasksJson : (tasksJson.tasks || []);
                    const selectedTasks = allTasks.filter(task => taskIds.includes(task.id));
                    
                    if (selectedTasks.length === 0) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'No valid tasks found' }));
                        return;
                    }
                    
                    // Get available agents using internal method
                    let availableAgents = [];
                    try {
                        // Get global agents
                        const settings = await loadGlobalSettings();
                        const claudeFolderPath = settings.claudeFolderPath;
                        let globalAgents = [];
                        
                        if (claudeFolderPath) {
                            const agentsDir = path.join(claudeFolderPath, 'agents');
                            try {
                                const files = await fs.readdir(agentsDir);
                                const agentFiles = files.filter(file => 
                                    file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')
                                );
                                
                                globalAgents = await Promise.all(agentFiles.map(async (filename) => {
                                    try {
                                        const filePath = path.join(agentsDir, filename);
                                        const content = await fs.readFile(filePath, 'utf8');
                                        const metadata = parseAgentMetadata(content);
                                        return {
                                            name: filename,
                                            type: 'global',
                                            content: content,
                                            path: filePath,
                                            metadata: metadata
                                        };
                                    } catch (err) {
                                        return null;
                                    }
                                }));
                                globalAgents = globalAgents.filter(a => a !== null);
                            } catch (err) {
                                console.log('Global agents directory not found:', err.message);
                            }
                        }
                        
                        // Get project agents
                        let projectAgents = [];
                        if (project.projectRoot) {
                            const agentsDir = path.join(project.projectRoot, '.claude', 'agents');
                            try {
                                const files = await fs.readdir(agentsDir);
                                const agentFiles = files.filter(file => 
                                    file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')
                                );
                                
                                projectAgents = await Promise.all(agentFiles.map(async (filename) => {
                                    try {
                                        const filePath = path.join(agentsDir, filename);
                                        const content = await fs.readFile(filePath, 'utf8');
                                        const metadata = parseAgentMetadata(content);
                                        return {
                                            name: filename,
                                            type: 'project',
                                            content: content,
                                            path: filePath,
                                            metadata: metadata
                                        };
                                    } catch (err) {
                                        return null;
                                    }
                                }));
                                projectAgents = projectAgents.filter(a => a !== null);
                            } catch (err) {
                                console.log('Project agents directory not found:', err.message);
                            }
                        }
                        
                        // Combine agents
                        const agentMap = new Map();
                        globalAgents.forEach(agent => agentMap.set(agent.name, agent));
                        projectAgents.forEach(agent => agentMap.set(agent.name, agent));
                        availableAgents = Array.from(agentMap.values());
                    } catch (err) {
                        console.error('Error loading agents:', err);
                        availableAgents = [];
                    }
                    
                    // Prepare the prompt for OpenAI
                    const prompt = `You are an AI assistant helping to assign specialized agents to tasks.

Available Agents:
${availableAgents.map(agent => {
    const desc = agent.metadata?.description || agent.content?.slice(0, 200) || 'No description';
    return `- ${agent.name}: ${desc}`;
}).join('\n')}

Tasks to Assign:
${selectedTasks.map(task => {
    return `- Task ID: ${task.id}
  Name: ${task.name}
  Description: ${task.description || 'No description'}
  Dependencies: ${task.dependencies?.join(', ') || 'None'}`;
}).join('\n\n')}

For each task, select the most appropriate agent based on the task requirements and agent capabilities. If no agent is particularly suitable, you may assign "No agent".

Return ONLY a JSON object mapping task IDs to agent names, like this:
{
  "task-id-1": "agent-name.md",
  "task-id-2": "No agent",
  "task-id-3": "another-agent.yaml"
}`;

                    // Call OpenAI API using https module
                    
                    const openAIData = JSON.stringify({
                        model: 'gpt-4',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a helpful assistant that assigns agents to tasks based on their descriptions and capabilities. Always respond with valid JSON only.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.3,
                        max_tokens: 1000
                    });
                    
                    const openAIPromise = new Promise((resolve, reject) => {
                        const options = {
                            hostname: 'api.openai.com',
                            path: '/v1/chat/completions',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${openAIKey}`,
                                'Content-Length': Buffer.byteLength(openAIData)
                            }
                        };
                        
                        const req = https.request(options, (res) => {
                            let data = '';
                            res.on('data', chunk => data += chunk);
                            res.on('end', () => {
                                if (res.statusCode === 200) {
                                    try {
                                        resolve(JSON.parse(data));
                                    } catch (err) {
                                        reject(new Error('Invalid JSON from OpenAI'));
                                    }
                                } else {
                                    reject(new Error(`OpenAI API error: ${res.statusCode} - ${data}`));
                                }
                            });
                        });
                        
                        req.on('error', reject);
                        req.write(openAIData);
                        req.end();
                    });
                    
                    try {
                        const aiResult = await openAIPromise;
                        const assignments = JSON.parse(aiResult.choices[0].message.content);
                        
                        // Update tasks with AI assignments
                        let updatedCount = 0;
                        allTasks.forEach(task => {
                            if (assignments[task.id] !== undefined) {
                                const agentName = assignments[task.id];
                                if (agentName === 'No agent' || agentName === null) {
                                    delete task.agent;
                                } else {
                                    task.agent = agentName;
                                }
                                updatedCount++;
                            }
                        });
                        
                        // Save updated tasks maintaining original structure
                        const dataToSave = Array.isArray(tasksJson) ? allTasks : { ...tasksJson, tasks: allTasks };
                        await fs.writeFile(project.path || project.filePath, JSON.stringify(dataToSave, null, 2));
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: true,
                            updatedCount,
                            assignments
                        }));
                        
                    } catch (err) {
                        console.error('Error in AI agent assignment:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            error: 'Failed to assign agents',
                            details: err.message 
                        }));
                    }
                } catch (err) {
                    console.error('Error processing AI assignment request:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
            
        } else {
            // Serve static files (React app)
            const filePath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
            await serveStaticFile(req, res, filePath);
        }
    });

    server.listen(PORT, '127.0.0.1', () => {
        console.log(`\n🦐 Shrimp Task Manager Viewer Server v${VERSION}`);
        console.log('===============================================');
        console.log(`Server is running at: http://localhost:${PORT}`);
        console.log(`Also accessible at: http://127.0.0.1:${PORT}`);
        console.log(`\nSettings file: ${SETTINGS_FILE}`);
        console.log('    ');
        console.log('Available projects:');
        if (projects.length === 0) {
            console.log('  - No projects configured. Add projects via the web interface.');
        } else {
            projects.forEach(project => {
                console.log(`  - ${project.name} (${project.path})`);
            });
        }
        console.log('\n🎯 Features:');
        console.log('  • React-based UI with TanStack Table');
        console.log('  • Real-time search and filtering');
        console.log('  • Sortable columns with pagination');
        console.log('  • Auto-refresh functionality');
        console.log('  • Profile management via web interface');
        console.log('\nOpen your browser to view tasks!');
    });

    return server;
}

// Start the server
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

export { startServer };