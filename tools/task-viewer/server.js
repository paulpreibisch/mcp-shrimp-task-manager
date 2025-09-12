#!/usr/bin/env node

import http from 'http';
import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import dotenv from 'dotenv';
import mcpBridge from './src/utils/mcp-bridge.js';

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

// Enhanced task-story integration caching
const taskStoryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Cache management functions
function setCacheEntry(key, data) {
    taskStoryCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

function getCacheEntry(key) {
    const entry = taskStoryCache.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL) {
        taskStoryCache.delete(key);
        return null;
    }
    
    return entry.data;
}

function clearCache() {
    taskStoryCache.clear();
}

// Parse BMAD agent metadata from embedded YAML block
function parseBMADAgentMetadata(content) {
    const metadata = {
        name: '',
        title: '',
        icon: '',
        whenToUse: '',
        description: '',
        tools: [],
        color: null,
        isBMAD: true
    };
    
    if (!content) return metadata;
    
    // Look for YAML block in BMAD format (```yaml ... ```)
    const yamlBlockRegex = /```yaml\s*\n([\s\S]*?)\n```/;
    const yamlMatch = content.match(yamlBlockRegex);
    
    if (yamlMatch) {
        const yamlContent = yamlMatch[1];
        const lines = yamlContent.split('\n');
        
        let inAgent = false;
        let indentLevel = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Track when we're in the agent section
            if (trimmed === 'agent:') {
                inAgent = true;
                indentLevel = line.indexOf('agent:');
                continue;
            }
            
            // Exit agent section if we hit another top-level key
            if (inAgent && !line.startsWith(' ') && trimmed.includes(':')) {
                inAgent = false;
            }
            
            // Parse agent fields
            if (inAgent) {
                if (trimmed.startsWith('name:')) {
                    metadata.name = trimmed.substring(5).trim();
                } else if (trimmed.startsWith('id:')) {
                    metadata.id = trimmed.substring(3).trim();
                } else if (trimmed.startsWith('title:')) {
                    metadata.title = trimmed.substring(6).trim();
                } else if (trimmed.startsWith('icon:')) {
                    metadata.icon = trimmed.substring(5).trim();
                } else if (trimmed.startsWith('whenToUse:')) {
                    metadata.whenToUse = trimmed.substring(10).trim();
                }
            }
        }
        
        // Use whenToUse as description if available
        if (metadata.whenToUse) {
            metadata.description = metadata.whenToUse;
        }
    }
    
    return metadata;
}

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
        // Improved YAML parsing for the fields we need
        const lines = yamlContent.split('\n');
        
        let currentField = null;
        let multilineValue = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Check if this is a field definition
            if (trimmedLine.includes(':') && !line.startsWith('  ')) {
                // Save any previous multiline field
                if (currentField === 'description' && multilineValue.length > 0) {
                    metadata.description = multilineValue.join(' ').trim().replace(/^["']|["']$/g, '');
                    multilineValue = [];
                }
                
                if (trimmedLine.startsWith('name:')) {
                    currentField = 'name';
                    metadata.name = trimmedLine.substring(5).trim().replace(/^["']|["']$/g, '');
                } else if (trimmedLine.startsWith('description:')) {
                    currentField = 'description';
                    const value = trimmedLine.substring(12).trim();
                    if (value) {
                        metadata.description = value.replace(/^["']|["']$/g, '');
                    }
                } else if (trimmedLine.startsWith('tools:')) {
                    currentField = 'tools';
                    const toolsStr = trimmedLine.substring(6).trim();
                    if (toolsStr && !toolsStr.startsWith('[')) {
                        // Single line tools
                        metadata.tools = toolsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    }
                } else if (trimmedLine.startsWith('color:')) {
                    currentField = 'color';
                    metadata.color = trimmedLine.substring(6).trim().replace(/^["']|["']$/g, '');
                } else {
                    currentField = null;
                }
            } else if (currentField === 'description' && trimmedLine && trimmedLine !== '-') {
                // Multiline description
                multilineValue.push(trimmedLine.replace(/^-\s*/, ''));
            } else if (currentField === 'tools' && trimmedLine.startsWith('-')) {
                // Array format tools
                if (!metadata.tools) metadata.tools = [];
                metadata.tools.push(trimmedLine.substring(1).trim());
            }
        }
        
        // Handle any remaining multiline field
        if (currentField === 'description' && multilineValue.length > 0) {
            metadata.description = multilineValue.join(' ').trim().replace(/^["']|["']$/g, '');
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
        const projects = settings.projects || settings.profiles || settings.agents || []; // Support new 'projects' and old keys for backward compatibility
        
        // Ensure all projects have an 'id' field (for backward compatibility with old 'profileName' format)
        const processedProjects = projects.map(project => {
            if (!project.id && project.profileName) {
                // Generate ID from profileName for backward compatibility
                project.id = project.profileName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                console.log(`Generated ID '${project.id}' from profileName '${project.profileName}'`);
            }
            return project;
        });
        
        console.log('Final projects with IDs:', processedProjects.map(p => ({ id: p.id, name: p.name || p.profileName })));
        return processedProjects;
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
    if (updates.robotEmojiTemplate !== undefined) {
        project.robotEmojiTemplate = updates.robotEmojiTemplate;
    }
    if (updates.armEmojiTemplate !== undefined) {
        project.armEmojiTemplate = updates.armEmojiTemplate;
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
            
            // Check for both APPEND_ prefix and _append suffix patterns
            if (functionName.startsWith('append_')) {
                functionName = functionName.replace('append_', '');
                isAppend = true;
            } else if (functionName.endsWith('_append')) {
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
    // First try to get from the cached templates
    const templates = await getAllTemplates();
    
    // If template exists in cache, return it
    if (templates[functionName]) {
        return templates[functionName];
    }
    
    // If not in cache, try to read it directly to distinguish between 
    // "file doesn't exist" vs "file read error"
    const customPath = path.join(TEMPLATES_DIR, functionName, 'index.md');
    const defaultPath = path.join(DEFAULT_TEMPLATES_DIR, functionName, 'index.md');
    
    try {
        // Try custom template first
        const customContent = await fs.readFile(customPath, 'utf8');
        return {
            name: functionName,
            content: customContent,
            status: 'custom',
            source: 'user-custom'
        };
    } catch (customErr) {
        if (customErr.code !== 'ENOENT') {
            // File exists but can't be read - this is a real error
            throw new Error(`Error reading custom template: ${customErr.message}`);
        }
        
        try {
            // Try default template
            const defaultContent = await fs.readFile(defaultPath, 'utf8');
            return {
                name: functionName,
                content: defaultContent,
                status: 'default',
                source: 'built-in'
            };
        } catch (defaultErr) {
            if (defaultErr.code !== 'ENOENT') {
                // File exists but can't be read - this is a real error
                throw new Error(`Error reading default template: ${defaultErr.message}`);
            }
            // Both files don't exist
            return null;
        }
    }
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
async function startServer(testPort = null) {
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
            
        } else if (url.pathname === '/api/tasks/bulk-status-update' && req.method === 'PUT') {
            // Handle bulk status update - reset completed tasks to pending
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { projectId, taskIds, newStatus } = JSON.parse(body);
                    
                    // Validate input
                    if (!projectId || !taskIds || !Array.isArray(taskIds) || !newStatus) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Invalid request: missing required fields');
                        return;
                    }
                    
                    // Find the project
                    const project = projects.find(p => p.id === projectId);
                    
                    if (!project) {
                        console.error('Project not found:', projectId, 'Available projects:', projects.map(p => p.id));
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Project not found');
                        return;
                    }
                    
                    // Read current tasks
                    const data = await fs.readFile(project.path, 'utf8');
                    const tasksData = JSON.parse(data);
                    
                    // Ensure tasks array exists
                    if (!tasksData.tasks || !Array.isArray(tasksData.tasks)) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Invalid task data structure');
                        return;
                    }
                    
                    // Update status for each eligible task
                    let updatedCount = 0;
                    const updatedTasks = [];
                    
                    taskIds.forEach(taskId => {
                        const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
                        
                        if (taskIndex !== -1) {
                            const task = tasksData.tasks[taskIndex];
                            
                            // Handle status transitions
                            if ((task.status === 'completed' && newStatus === 'pending') || 
                                (task.status === 'pending' && newStatus === 'completed') ||
                                (task.status === 'in_progress' && newStatus === 'completed')) {
                                
                                if (newStatus === 'pending') {
                                    // Reset to pending - clear completion data
                                    tasksData.tasks[taskIndex] = {
                                        ...task,
                                        status: newStatus,
                                        updatedAt: getLocalISOString(),
                                        completedAt: undefined,
                                        summary: undefined,
                                        completionDetails: undefined
                                    };
                                } else if (newStatus === 'completed') {
                                    // Mark as completed - add completion timestamp
                                    tasksData.tasks[taskIndex] = {
                                        ...task,
                                        status: newStatus,
                                        updatedAt: getLocalISOString(),
                                        completedAt: getLocalISOString()
                                    };
                                }
                                
                                updatedTasks.push(tasksData.tasks[taskIndex]);
                                updatedCount++;
                                
                                console.log(`Updated task ${taskId} from ${task.status} to ${newStatus}`);
                            } else {
                                console.log(`Skipped task ${taskId} - invalid transition from ${task.status} to ${newStatus}`);
                            }
                        } else {
                            console.warn(`Task ${taskId} not found in project ${projectId}`);
                        }
                    });
                    
                    // Only write to file if there were actual updates
                    if (updatedCount > 0) {
                        await fs.writeFile(project.path, JSON.stringify(tasksData, null, 2));
                        console.log(`Successfully updated ${updatedCount} task(s) to ${newStatus} status`);
                    }
                    
                    // Return success response with details
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        updatedCount,
                        message: `Updated ${updatedCount} of ${taskIds.length} task(s)`,
                        updatedTasks: updatedTasks.map(t => ({ id: t.id, name: t.name, status: t.status }))
                    }));
                    
                } catch (err) {
                    console.error('Error updating task statuses:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error updating task statuses: ' + err.message);
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
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/summarize') && req.method === 'POST') {
            // Handle POST /api/tasks/{projectId}/summarize
            const pathParts = url.pathname.split('/');
            const projectId = pathParts[pathParts.length - 2]; // Get projectId from path
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const { completedTasks, totalTasks, incompleteTasks } = JSON.parse(body);
                    
                    if (!Array.isArray(completedTasks) || completedTasks.length === 0) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'No completed tasks provided' }));
                        return;
                    }
                    
                    // Generate summary using OpenAI
                    let summary;
                    
                    try {
                        // Try to get OpenAI API key
                        let openaiApiKey = null;
                        try {
                            const globalSettings = JSON.parse(await fs.readFile(GLOBAL_SETTINGS_FILE, 'utf8'));
                            openaiApiKey = globalSettings.openAIKey || globalSettings.openaiApiKey;
                        } catch (settingsErr) {
                            // Try environment variable as fallback
                            openaiApiKey = process.env.OPENAI_API_KEY;
                        }

                        if (openaiApiKey) {
                            // Create the prompt for OpenAI
                            const taskSummaries = completedTasks.map(task => `- ${task.name}: ${task.summary}`).join('\n');
                            
                            const incompleteTasksInfo = incompleteTasks && incompleteTasks.length > 0
                                ? `\n\nINCOMPLETE TASKS:\n${incompleteTasks.map(task => `- ${task.name} (${task.status})`).join('\n')}`
                                : '';
                                
                            const totalTasksInfo = totalTasks && completedTasks.length < totalTasks 
                                ? `\n\nIMPORTANT: Only ${completedTasks.length} out of ${totalTasks} total tasks are completed. This is a PARTIAL progress report.${incompleteTasksInfo}`
                                : totalTasks 
                                    ? `\n\nAll ${completedTasks.length} tasks in this project are completed.`
                                    : '';

                            const prompt = `Generate an executive summary for these completed tasks:

${taskSummaries}${totalTasksInfo}

Create a brief, impactful summary that highlights business value and key achievements. If this is partial progress, clearly indicate remaining work and include the incomplete tasks in a red warning section.`;

                            // Call OpenAI API
                            const response = await new Promise((resolve, reject) => {
                                const postData = JSON.stringify({
                                    model: 'gpt-4',
                                    messages: [
                                        {
                                            role: 'system',
                                            content: `You are an experienced Project Manager who excels at delivering concise executive reports. 

Your reports use:
✅ Green checkmarks for completed items
🚀 Rockets for launches/deployments  
🎯 Targets for objectives met
🔧 Wrenches for technical implementations
📊 Charts for metrics/analysis
⚡ Lightning for performance improvements
🛡️ Shields for security features
📝 Notes for documentation

Format your response with:
- **Bold** markdown headings for sections
- Bullet points with relevant emojis
- Maximum 150 words total
- Focus on business value and outcomes
- No technical jargon

IMPORTANT: 
- If there are 7 or fewer completed tasks, list ALL of them individually. Only use "X more" notation if there are 8+ completed tasks.
- If this is partial progress (not all tasks completed), clearly indicate this in the Project Status and mention remaining work.

Structure for COMPLETE projects:
**Project Status:**
🎉 All X tasks completed successfully

**Key Deliverables:**
• ✅ [List ALL completed tasks if 7 or fewer, otherwise first 5 + "X more"]

**Impact:**
Business value achieved

Structure for PARTIAL progress:
**Project Status:**  
🚧 X of Y tasks completed (Y% progress)

**Completed Deliverables:**
• ✅ [List completed tasks]

**⚠️ Remaining Tasks:**
• ❌ [List incomplete tasks by name]

**Impact:**
Progress achieved so far and remaining scope`
                                        },
                                        {
                                            role: 'user',
                                            content: prompt
                                        }
                                    ],
                                    max_tokens: 300,
                                    temperature: 0.2
                                });

                                const options = {
                                    hostname: 'api.openai.com',
                                    port: 443,
                                    path: '/v1/chat/completions',
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${openaiApiKey}`,
                                        'Content-Length': Buffer.byteLength(postData)
                                    }
                                };

                                const req = https.request(options, (res) => {
                                    let data = '';
                                    res.on('data', (chunk) => data += chunk);
                                    res.on('end', () => {
                                        if (res.statusCode === 200) {
                                            try {
                                                const result = JSON.parse(data);
                                                resolve(result.choices[0].message.content.trim());
                                            } catch (parseErr) {
                                                reject(new Error('Invalid JSON from OpenAI'));
                                            }
                                        } else {
                                            reject(new Error('OpenAI API error: ' + res.statusCode + ' - ' + data));
                                        }
                                    });
                                });

                                req.on('error', reject);
                                req.write(postData);
                                req.end();
                            });

                            summary = response;
                        } else {
                            // Fallback to basic summary generation if no OpenAI key
                            // Show all tasks if 7 or fewer, otherwise show first 5 with remaining count
                            const maxToShow = completedTasks.length <= 7 ? completedTasks.length : 5;
                            const taskList = completedTasks.slice(0, maxToShow).map(task => `• ✅ ${task.name}`).join('\n');
                            const remaining = completedTasks.length > maxToShow ? `\n• ➕ ${completedTasks.length - maxToShow} additional tasks completed` : '';
                            
                            // Create a more descriptive impact based on task summaries
                            const impact = completedTasks.length > 0 && completedTasks[0].summary 
                                ? `📊 ${completedTasks.filter(t => t.summary).length} features fully implemented and tested`
                                : `📊 All ${completedTasks.length} objectives achieved`;
                            
                            const isPartialProgress = totalTasks && completedTasks.length < totalTasks;
                            const statusLine = isPartialProgress 
                                ? `🚧 ${completedTasks.length} of ${totalTasks} tasks completed (${Math.round((completedTasks.length / totalTasks) * 100)}% progress)`
                                : `🚀 ${completedTasks.length} task${completedTasks.length === 1 ? '' : 's'} completed successfully`;
                            
                            const sectionTitle = isPartialProgress ? 'Completed Deliverables' : 'Key Deliverables';
                            
                            // Add warning section for incomplete tasks
                            const warningSection = isPartialProgress && incompleteTasks && incompleteTasks.length > 0
                                ? `\n\n**⚠️ Remaining Tasks:**\n${incompleteTasks.map(task => `• ❌ ${task.name}`).join('\n')}`
                                : '';
                            
                            const impactMessage = isPartialProgress 
                                ? `Partial progress achieved. Project completion pending ${totalTasks - completedTasks.length} remaining task${totalTasks - completedTasks.length === 1 ? '' : 's'}.`
                                : impact;
                            
                            summary = `**Project Status:**\n${statusLine}\n\n**${sectionTitle}:**\n${taskList}${remaining}${warningSection}\n\n**Impact:**\n${impactMessage}`;
                        }
                    } catch (openaiError) {
                        console.error('Error generating AI summary, using fallback:', openaiError);
                        // Fallback summary generation
                        // Show all tasks if 7 or fewer, otherwise show first 5 with remaining count
                        const maxToShow = completedTasks.length <= 7 ? completedTasks.length : 5;
                        const taskList = completedTasks.slice(0, maxToShow).map(task => `• ✅ ${task.name}`).join('\n');
                        const remaining = completedTasks.length > maxToShow ? `\n• ➕ ${completedTasks.length - maxToShow} additional tasks completed` : '';
                        
                        // Create a more descriptive impact based on task summaries
                        const impact = completedTasks.length > 0 && completedTasks[0].summary 
                            ? `📊 ${completedTasks.filter(t => t.summary).length} features fully implemented and tested`
                            : `📊 All ${completedTasks.length} objectives achieved`;
                        
                        const isPartialProgress = totalTasks && completedTasks.length < totalTasks;
                        const statusLine = isPartialProgress 
                            ? `🚧 ${completedTasks.length} of ${totalTasks} tasks completed (${Math.round((completedTasks.length / totalTasks) * 100)}% progress)`
                            : `🚀 ${completedTasks.length} task${completedTasks.length === 1 ? '' : 's'} completed successfully`;
                        
                        const sectionTitle = isPartialProgress ? 'Completed Deliverables' : 'Key Deliverables';
                        
                        // Add warning section for incomplete tasks
                        const warningSection = isPartialProgress && incompleteTasks && incompleteTasks.length > 0
                            ? `\n\n**⚠️ Remaining Tasks:**\n${incompleteTasks.map(task => `• ❌ ${task.name}`).join('\n')}`
                            : '';
                        
                        const impactMessage = isPartialProgress 
                            ? `Partial progress achieved. Project completion pending ${totalTasks - completedTasks.length} remaining task${totalTasks - completedTasks.length === 1 ? '' : 's'}.`
                            : impact;
                        
                        finalSummary = `**Project Status:**\n${statusLine}\n\n**${sectionTitle}:**\n${taskList}${remaining}${warningSection}\n\n**Impact:**\n${impactMessage}`;
                    }
                    
                    // Save the summary to tasks.json
                    try {
                        const data = await fs.readFile(project.path, 'utf8');
                        let tasksData = JSON.parse(data);
                        
                        // Handle backward compatibility
                        if (Array.isArray(tasksData)) {
                            tasksData = { tasks: tasksData };
                        }
                        
                        tasksData.summary = summary;
                        tasksData.summaryGeneratedAt = getLocalISOString();
                        
                        await fs.writeFile(project.path, JSON.stringify(tasksData, null, 2), 'utf8');
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ summary: summary }));
                    } catch (fileErr) {
                        console.error('Error saving summary:', fileErr);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to save summary' }));
                    }
                } catch (err) {
                    console.error('Error generating summary:', err);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid request data' }));
                }
            });

        } else if (url.pathname === '/api/tasks/archive' && req.method === 'POST') {
            // Handle task archiving using MCP bridge
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const { storyId, tasks = [] } = JSON.parse(body);
                    
                    if (!storyId) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'storyId is required' }));
                        return;
                    }
                    
                    console.log(`Archiving tasks for story ${storyId}`);
                    
                    const result = await mcpBridge.archiveTasks(storyId, tasks);
                    
                    if (result.success) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: result.error || 'Failed to archive tasks' }));
                    }
                } catch (err) {
                    console.error('Error archiving tasks:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Error archiving tasks: ' + err.message }));
                }
            });

        } else if (url.pathname === '/api/tasks/current' && req.method === 'GET') {
            // Handle getting current tasks using MCP bridge
            try {
                console.log('Getting current tasks');
                
                // Check MCP connection status first
                const connectionStatus = await mcpBridge.checkMCPConnection();
                
                if (!connectionStatus.connected) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'MCP bridge not available', 
                        details: connectionStatus.error,
                        connected: false 
                    }));
                    return;
                }
                
                // For now, return a placeholder response since the MCP bridge doesn't have a getCurrentTasks function
                // This should be implemented when the actual MCP integration is ready
                const result = {
                    success: true,
                    tasks: [],
                    message: "Current tasks endpoint - implementation pending MCP integration",
                    metadata: {
                        timestamp: new Date().toISOString(),
                        source: 'mcp-bridge',
                        connectionStatus
                    }
                };
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
                
            } catch (err) {
                console.error('Error getting current tasks:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error getting current tasks: ' + err.message }));
            }

        } else if (url.pathname === '/api/tasks/clear-all' && req.method === 'DELETE') {
            // Handle clearing all tasks using MCP bridge
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const { confirm = false } = JSON.parse(body || '{}');
                    
                    console.log(`Clearing all tasks (confirm: ${confirm})`);
                    
                    const result = await mcpBridge.clearAllTasks(confirm);
                    
                    if (result.success) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result));
                    } else {
                        const statusCode = result.requiresConfirmation ? 400 : 500;
                        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result));
                    }
                } catch (err) {
                    console.error('Error clearing all tasks:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Error clearing all tasks: ' + err.message }));
                }
            });
            
        } else if (url.pathname.match(/^\/api\/tasks\/[^\/]+\/watch$/) && req.method === 'GET') {
            // Server-Sent Events endpoint for real-time task updates (MOVED UP TO AVOID CONFLICT)
            const projectId = url.pathname.split('/')[3]; // Extract projectId from /api/tasks/{projectId}/watch
            console.log(`SSE request for projectId: '${projectId}'`);
            console.log('Available project IDs:', projects.map(p => `'${p.id}'`));
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                console.error(`Project not found: '${projectId}' (exact match)`);
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            console.log(`Found project for SSE: ${project.name || project.profileName}`);
            console.log(`Project path: ${project.path || project.taskPath || project.filePath}`);
            
            // Set up SSE headers
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            });
            
            // Send initial connection event
            res.write(`data: ${JSON.stringify({ type: 'connected', projectId, timestamp: Date.now() })}\n\n`);
            
            let watcher = null;
            let lastModified = null;
            
            try {
                // Get initial file stats
                const projectPath = project.path || project.taskPath || project.filePath;
                console.log(`Starting file watcher for: ${projectPath}`);
                
                const stats = await fs.stat(projectPath);
                lastModified = stats.mtime.getTime();
                
                // Set up file watcher
                const fsWatch = await import('fs');
                watcher = fsWatch.watch(projectPath, { persistent: false }, async (eventType) => {
                    if (eventType === 'change') {
                        try {
                            // Debounce rapid changes
                            setTimeout(async () => {
                                try {
                                    const newStats = await fs.stat(projectPath);
                                    const newModified = newStats.mtime.getTime();
                                    
                                    // Only process if file actually changed
                                    if (newModified > lastModified) {
                                        lastModified = newModified;
                                        
                                        // Read updated tasks
                                        const data = await fs.readFile(projectPath, 'utf8');
                                        let tasksData = JSON.parse(data);
                                        
                                        // Handle backward compatibility
                                        if (Array.isArray(tasksData)) {
                                            tasksData = { tasks: tasksData };
                                        }
                                        
                                        // Send update event
                                        const updateEvent = {
                                            type: 'tasks_updated',
                                            projectId,
                                            tasks: tasksData.tasks || [],
                                            timestamp: newModified
                                        };
                                        
                                        res.write(`data: ${JSON.stringify(updateEvent)}\n\n`);
                                        console.log(`Sent task update for ${projectId}`);
                                    }
                                } catch (error) {
                                    console.error(`Error processing file change for ${projectId}:`, error);
                                    const errorEvent = {
                                        type: 'error',
                                        projectId,
                                        error: error.message || error.toString() || 'Unknown error',
                                        timestamp: Date.now()
                                    };
                                    try {
                                        res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
                                    } catch (writeError) {
                                        console.error('Error writing SSE error event:', writeError);
                                    }
                                }
                            }, 300); // 300ms debounce
                        } catch (error) {
                            console.error('File watcher error:', error);
                        }
                    }
                });
                
                console.log(`Started watching tasks file for project: ${projectId}`);
                
            } catch (error) {
                console.error(`Failed to start file watcher for ${projectId}:`, error);
                const errorEvent = {
                    type: 'error',
                    projectId,
                    error: error.message || error.toString() || 'Failed to start file watcher',
                    timestamp: Date.now()
                };
                try {
                    res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
                } catch (writeError) {
                    console.error('Error writing SSE startup error:', writeError);
                }
            }
            
            // Handle client disconnect
            req.on('close', () => {
                if (watcher) {
                    try {
                        watcher.close();
                        console.log(`Stopped watching tasks file for project: ${projectId}`);
                    } catch (error) {
                        console.error('Error closing file watcher:', error);
                    }
                }
            });
            
            // Keep connection alive with periodic heartbeat
            const heartbeat = setInterval(() => {
                try {
                    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
                } catch (error) {
                    clearInterval(heartbeat);
                }
            }, 30000); // 30 seconds
            
            req.on('close', () => {
                clearInterval(heartbeat);
            });
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/grouped-by-story') && req.method === 'GET') {
            // Get tasks grouped by story for a project
            const projectId = url.pathname.split('/')[3]; // Extract projectId from /api/tasks/{projectId}/grouped-by-story
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            try {
                console.log(`Getting grouped tasks by story for project: ${projectId}`);
                
                // Check if tasks file exists
                try {
                    await fs.access(project.path);
                } catch (accessErr) {
                    // File doesn't exist - return empty response
                    const emptyResponse = {
                        withStory: {},
                        withoutStory: [],
                        message: "No tasks found. The tasks.json file hasn't been created yet."
                    };
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-store, no-cache, must-revalidate'
                    });
                    res.end(JSON.stringify(emptyResponse));
                    return;
                }
                
                // Read and parse tasks
                const data = await fs.readFile(project.path, 'utf8');
                let tasksData = JSON.parse(data);
                
                // Handle backward compatibility
                if (Array.isArray(tasksData)) {
                    tasksData = { tasks: tasksData };
                }
                
                let groupedTasks = { withStory: new Map(), withoutStory: tasksData.tasks || [] };
                
                try {
                    // Check if BMAD integration is available
                    const bmadPath = path.join(project.projectRoot, '.bmad-core');
                    const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                    
                    if (bmadExists && tasksData.tasks && tasksData.tasks.length > 0) {
                        // Dynamic import of BMAD API utilities
                        const bmadApi = await import('./src/utils/bmad-api.js');
                        
                        // Group tasks by story with epic hierarchy information
                        console.log(`Grouping ${tasksData.tasks.length} tasks by story with epic context for project ${projectId}`);
                        groupedTasks = await bmadApi.getGroupedTasksByStory(tasksData.tasks, projectId);
                        
                        // Get stories and epics for enrichment
                        const [stories, epics] = await Promise.all([
                            bmadApi.getStories(projectId),
                            bmadApi.getEpics(projectId)
                        ]);
                        
                        // Create epic mapping for enrichment
                        const epicMap = new Map();
                        epics.forEach(epic => {
                            epicMap.set(epic.id, epic);
                        });
                        
                        // Convert Map to Object for JSON serialization and enrich with epic info
                        const withStoryObject = {};
                        for (const [storyId, storyGroup] of groupedTasks.withStory) {
                            // Find the story's epic information
                            const story = stories.find(s => s.id === storyId);
                            const epicInfo = story && story.epic ? epicMap.get(story.epic) : null;
                            
                            withStoryObject[storyId] = {
                                ...storyGroup,
                                epic: epicInfo ? {
                                    id: epicInfo.id,
                                    title: epicInfo.title,
                                    status: epicInfo.status
                                } : null
                            };
                        }
                        groupedTasks.withStory = withStoryObject;
                    }
                } catch (error) {
                    console.error('Error grouping tasks by story:', error);
                    // Continue with original ungrouped tasks
                }
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                });
                res.end(JSON.stringify(groupedTasks));
            } catch (err) {
                console.error(`Error getting grouped tasks for ${project.path}:`, err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error getting grouped tasks: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/tasks/') && req.method === 'GET') {
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
                let tasksData = JSON.parse(data);
                
                // Handle backward compatibility - old format was just an array of tasks
                if (Array.isArray(tasksData)) {
                    tasksData = { tasks: tasksData };
                }
                
                // Log task status for debugging
                const task880f = tasksData.tasks?.find(t => t.id === '880f4dd8-a603-4bb9-8d4d-5033887d0e0f');
                if (task880f) {
                    console.log(`Task 880f4dd8 status: ${task880f.status}`);
                }
                
                // Check if BMAD integration is enabled for story context
                let enrichedTasks = tasksData.tasks || [];
                let storyValidation = null;
                
                try {
                    // Check if .bmad-core directory exists to determine BMAD integration
                    const bmadPath = path.join(project.projectRoot, '.bmad-core');
                    const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                    
                    if (bmadExists && enrichedTasks.length > 0) {
                        // Dynamic import of BMAD API utilities
                        const bmadApi = await import('./src/utils/bmad-api.js');
                        
                        // Get stories, epics, and verifications for complete context
                        const [stories, epics, verifications] = await Promise.all([
                            bmadApi.getStories(projectId),
                            bmadApi.getEpics(projectId),
                            bmadApi.getAllVerifications(projectId)
                        ]);
                        
                        // Enrich tasks with story context and epic hierarchy
                        console.log(`Enriching ${enrichedTasks.length} tasks with story context and epic hierarchy for project ${projectId}`);
                        enrichedTasks = await bmadApi.getTasksWithStoryContext(enrichedTasks, projectId, verifications);
                        
                        // Create story-to-epic mapping
                        const storyToEpicMap = new Map();
                        stories.forEach(story => {
                            if (story.epic) {
                                storyToEpicMap.set(story.id, story.epic);
                            }
                        });
                        
                        // Add epic IDs to enriched tasks
                        enrichedTasks.forEach(task => {
                            if (task.storyId && storyToEpicMap.has(task.storyId)) {
                                task.epicId = storyToEpicMap.get(task.storyId);
                            }
                        });
                        
                        // Get story validation information
                        storyValidation = await bmadApi.validateProjectStoryTaskLinking(enrichedTasks, projectId);
                        console.log('Story validation results:', storyValidation);
                    }
                } catch (error) {
                    console.error('Error enriching tasks with story context:', error);
                    // Continue with original tasks if enrichment fails
                }

                // Prepare response with all available data
                const response = {
                    tasks: enrichedTasks,
                    initialRequest: tasksData.initialRequest || null,
                    summary: tasksData.summary || null,
                    summaryGeneratedAt: tasksData.summaryGeneratedAt || null,
                    projectRoot: project.projectRoot || null,
                    storyValidation: storyValidation
                };
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                res.end(JSON.stringify(response));
            } catch (err) {
                console.error(`Error reading file ${project.path}:`, err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error reading task file: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/file-stats') && req.method === 'GET') {
            // File stats endpoint for the client-side watcher
            const filePath = url.searchParams.get('path');
            if (!filePath) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Missing path parameter');
                return;
            }
            
            try {
                const stats = await fs.stat(filePath);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    mtime: stats.mtime.toISOString(),
                    size: stats.size
                }));
            } catch (error) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
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
                            hasData: tasks.length > 0,
                            initialRequest: data.initialRequest || null,
                            summary: data.summary || null
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
            
            if (req.method === 'DELETE') {
                // Handle DELETE /api/history/{projectId}/{filename}
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
                    
                    // Delete the file
                    await fs.unlink(filePath);
                    
                    console.log(`[History] Deleted history file: ${filePath}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'History entry deleted successfully' }));
                    
                } catch (err) {
                    console.error('Error deleting history file:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error deleting history file: ' + err.message);
                }
            } else {
                // Handle GET /api/history/{projectId}/{filename}
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
                    
                    // Generate initial request if missing
                    if (!data.initialRequest && data.tasks && data.tasks.length > 0) {
                        // Generate a descriptive initial request from task data
                        const taskCategories = {};
                        
                        // Group tasks by common themes
                        data.tasks.forEach(task => {
                            // Extract key themes from task names
                            const name = task.name.toLowerCase();
                            if (name.includes('test')) {
                                taskCategories.testing = (taskCategories.testing || 0) + 1;
                            } else if (name.includes('fix') || name.includes('bug')) {
                                taskCategories.bugfixes = (taskCategories.bugfixes || 0) + 1;
                            } else if (name.includes('add') || name.includes('create') || name.includes('implement')) {
                                taskCategories.features = (taskCategories.features || 0) + 1;
                            } else if (name.includes('update') || name.includes('refactor')) {
                                taskCategories.improvements = (taskCategories.improvements || 0) + 1;
                            } else if (name.includes('document')) {
                                taskCategories.documentation = (taskCategories.documentation || 0) + 1;
                            } else {
                                taskCategories.other = (taskCategories.other || 0) + 1;
                            }
                        });
                        
                        // Build the generated initial request
                        const parts = [];
                        
                        // Add main task types
                        const mainCategories = Object.entries(taskCategories)
                            .filter(([key]) => key !== 'other')
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 3);
                        
                        if (mainCategories.length > 0) {
                            const categoryDescriptions = {
                                testing: 'write tests',
                                bugfixes: 'fix bugs',
                                features: 'implement new features',
                                improvements: 'improve existing functionality',
                                documentation: 'update documentation'
                            };
                            
                            const descriptions = mainCategories.map(([cat]) => categoryDescriptions[cat]);
                            if (descriptions.length === 1) {
                                parts.push(`Request to ${descriptions[0]}`);
                            } else if (descriptions.length === 2) {
                                parts.push(`Request to ${descriptions[0]} and ${descriptions[1]}`);
                            } else {
                                const last = descriptions.pop();
                                parts.push(`Request to ${descriptions.join(', ')}, and ${last}`);
                            }
                        }
                        
                        // Add some specific task examples
                        const exampleTasks = data.tasks
                            .filter(t => t.name.length < 60)
                            .slice(0, 3)
                            .map(t => t.name);
                        
                        if (exampleTasks.length > 0) {
                            parts.push(`Tasks include: ${exampleTasks.join(', ')}`);
                        }
                        
                        // Add task count
                        parts.push(`(${data.tasks.length} total tasks)`);
                        
                        data.initialRequest = parts.join('. ');
                        data.generatedInitialRequest = true; // Mark as generated
                    }
                    
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
            }
            
        } else if (url.pathname.startsWith('/api/readme') && req.method === 'GET') {
            // Serve README.md file (with language-specific support)
            try {
                // Extract language suffix from path (e.g., /api/readme-ko -> ko)
                const pathParts = url.pathname.split('-');
                const languageSuffix = pathParts.length > 1 ? `-${pathParts[1]}` : '';
                const readmeFilename = `README${languageSuffix}.md`;
                const readmePath = path.join(__dirname, readmeFilename);
                
                const data = await fs.readFile(readmePath, 'utf8');
                res.writeHead(200, { 
                    'Content-Type': 'text/markdown; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(data);
            } catch (err) {
                // If language-specific README not found, return 404 so client can fallback
                if (url.pathname !== '/api/readme') {
                    console.error(`Language-specific README not found: ${url.pathname}`, err.message);
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Language-specific README not found');
                } else {
                    console.error('Error reading README:', err);
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('README not found');
                }
            }

        // Template management API routes
        } else if (url.pathname === '/api/templates' && req.method === 'GET') {
            // List all templates with status
            try {
                const templates = await getAllTemplates();
                const templateList = Object.entries(templates).map(([functionName, template]) => ({
                    functionName: functionName,
                    name: template.name,
                    status: template.status,
                    source: template.source,
                    contentLength: template.content.length,
                    category: template.category || 'general'
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
                    res.end(JSON.stringify({
                        ...template,
                        functionName: functionName
                    }));
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
                
                // Check both .claude/agents and .bmad-core/agents directories
                const claudeAgentsDir = path.join(projectRoot, '.claude', 'agents');
                const bmadAgentsDir = path.join(projectRoot, '.bmad-core', 'agents');
                
                console.log('Looking for agents in directories:', claudeAgentsDir, bmadAgentsDir);
                
                // Load agents from .claude/agents
                let claudeAgentFiles = [];
                try {
                    const files = await fs.readdir(claudeAgentsDir);
                    console.log('Found files in .claude/agents directory:', files);
                    claudeAgentFiles = files.filter(file => 
                        file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')
                    );
                    console.log('Filtered Claude agent files:', claudeAgentFiles);
                } catch (err) {
                    console.log('Error reading .claude/agents directory:', err.message);
                }
                
                // Load agents from .bmad-core/agents
                let bmadAgentFiles = [];
                try {
                    const files = await fs.readdir(bmadAgentsDir);
                    console.log('Found files in .bmad-core/agents directory:', files);
                    bmadAgentFiles = files.filter(file => file.endsWith('.md'));
                    console.log('Filtered BMAD agent files:', bmadAgentFiles);
                } catch (err) {
                    console.log('Error reading .bmad-core/agents directory:', err.message);
                }
                
                // If no agents found in either directory
                if (claudeAgentFiles.length === 0 && bmadAgentFiles.length === 0) {
                    console.log('No agents found in either directory');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify([]));
                    return;
                }
                
                // Read each Claude agent file to get content
                const claudeAgents = await Promise.all(claudeAgentFiles.map(async (filename) => {
                    try {
                        const filePath = path.join(claudeAgentsDir, filename);
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
                            path: path.join(claudeAgentsDir, filename),
                            error: err.message,
                            metadata: parseAgentMetadata('')
                        };
                    }
                }));
                
                // Read each BMAD agent file to get content
                const bmadAgents = await Promise.all(bmadAgentFiles.map(async (filename) => {
                    try {
                        const filePath = path.join(bmadAgentsDir, filename);
                        const content = await fs.readFile(filePath, 'utf8');
                        const metadata = parseBMADAgentMetadata(content);
                        
                        // Use the BMAD metadata to enhance the agent info
                        return {
                            name: filename,
                            content: content,
                            path: filePath,
                            metadata: {
                                ...metadata,
                                name: metadata.name || filename.replace('.md', ''),
                                description: metadata.description || metadata.whenToUse || '',
                                tools: [], // BMAD agents typically have access to all tools
                                icon: metadata.icon || '🤖',
                                isBMAD: true
                            }
                        };
                    } catch (err) {
                        return {
                            name: filename,
                            content: '',
                            path: path.join(bmadAgentsDir, filename),
                            error: err.message,
                            metadata: {
                                name: filename.replace('.md', ''),
                                description: '',
                                tools: [],
                                isBMAD: true
                            }
                        };
                    }
                }));
                
                // Combine both sets of agents
                const combinedAgents = [...claudeAgents, ...bmadAgents];
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(combinedAgents));
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
            
        } else if (url.pathname.startsWith('/api/bmad-status/') && req.method === 'GET') {
            // Check BMAD status for a project
            const profileId = url.pathname.split('/').pop();
            const project = projects.find(p => p.id === profileId);
            
            if (!project || !project.projectRoot) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ detected: false, enabled: true }));
                return;
            }
            
            try {
                // Check if .bmad-core directory exists
                const bmadPath = path.join(project.projectRoot, '.bmad-core');
                const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                
                let enabled = true;
                if (bmadExists) {
                    try {
                        // Check for .shrimp-bmad.json config file
                        const configPath = path.join(project.projectRoot, '.shrimp-bmad.json');
                        const configData = await fs.readFile(configPath, 'utf8');
                        const config = JSON.parse(configData);
                        enabled = config.enabled !== false;
                    } catch (err) {
                        // Config file doesn't exist, default to enabled
                        enabled = true;
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ detected: bmadExists, enabled: enabled }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error checking BMAD status: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/bmad-config/') && req.method === 'PUT') {
            // Update BMAD configuration for a project
            const profileId = url.pathname.split('/').pop();
            const project = projects.find(p => p.id === profileId);
            
            if (!project || !project.projectRoot) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { enabled } = JSON.parse(body);
                    
                    // Load existing config or create new one
                    const configPath = path.join(project.projectRoot, '.shrimp-bmad.json');
                    let config = {
                        enabled: true,
                        autoDetect: true,
                        preferBMAD: true,
                        agentMappings: {
                            development: "dev",
                            testing: "qa",
                            architecture: "architect",
                            product: "pm",
                            analysis: "analyst",
                            ux: "ux-expert",
                            scrum: "sm",
                            "product-owner": "po"
                        },
                        storyFileLocation: "stories"
                    };
                    
                    try {
                        const existingConfig = await fs.readFile(configPath, 'utf8');
                        config = { ...config, ...JSON.parse(existingConfig) };
                    } catch (err) {
                        // Config file doesn't exist, use defaults
                    }
                    
                    // Update enabled status
                    config.enabled = enabled;
                    
                    // Save config
                    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error updating BMAD config: ' + err.message);
                }
            });

        } else if (url.pathname.startsWith('/api/bmad-content/') && req.method === 'GET') {
            // Get BMAD stories and epics for a project
            const profileId = url.pathname.split('/').pop();
            const project = projects.find(p => p.id === profileId);
            
            if (!project || !project.projectRoot) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            try {
                // Check if .bmad-core directory exists
                const bmadPath = path.join(project.projectRoot, '.bmad-core');
                const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                
                if (!bmadExists) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ stories: [], epics: [] }));
                    return;
                }
                
                const stories = [];
                const epics = [];
                
                // Scan only the docs/epics directory for BMAD content
                // Epic files: docs/epics/EPIC-XXX-*.md
                // Story files: docs/epics/stories/STORY-XXX-*.md
                for (const epicDir of ['docs/epics', '.bmad-core/epics']) {
                    const epicsPath = path.join(project.projectRoot, epicDir);
                    
                    try {
                        const entries = await fs.readdir(epicsPath, { withFileTypes: true });
                        
                        // Process epic files at the root of docs/epics
                        for (const entry of entries) {
                            if (entry.isFile() && entry.name.endsWith('.md')) {
                                // Only process files that follow EPIC-XXX pattern
                                if (/^EPIC-\d+/i.test(entry.name)) {
                                    const fullPath = path.join(epicsPath, entry.name);
                                    try {
                                        const content = await fs.readFile(fullPath, 'utf8');
                                        const epicNumMatch = entry.name.match(/^EPIC-(\d+)/i);
                                        if (epicNumMatch) {
                                            const epicId = epicNumMatch[1];
                                            
                                            // Extract title from content
                                            const titleMatch = content.match(/^#\s+(.+)/m);
                                            let title = titleMatch ? titleMatch[1].trim() : `Epic ${epicId}`;
                                            // Remove "Epic XXX:" prefix if present
                                            title = title.replace(/^Epic\s+\d+:\s*/i, '');
                                            
                                            // Extract description
                                            const descMatch = content.match(/##\s*Epic\s*(?:Description|Goal)[:\s]*\n+([\s\S]*?)(?=\n##|$)/i);
                                            const description = descMatch ? descMatch[1].trim() : '';
                                            
                                            epics.push({
                                                id: epicId,
                                                title: title,
                                                description: description,
                                                stories: [],
                                                filePath: path.relative(project.projectRoot, fullPath)
                                            });
                                        }
                                    } catch (err) {
                                        console.error(`Error reading epic file ${entry.name}:`, err);
                                    }
                                }
                            }
                        }
                        
                        // Process story files in the stories subdirectory
                        const storiesPath = path.join(epicsPath, 'stories');
                        try {
                            const storyEntries = await fs.readdir(storiesPath, { withFileTypes: true });
                            
                            for (const entry of storyEntries) {
                                if (entry.isFile() && entry.name.endsWith('.md')) {
                                    // Only process files that follow STORY-XXX pattern
                                    if (/^STORY-\d+/i.test(entry.name)) {
                                        const fullPath = path.join(storiesPath, entry.name);
                                        try {
                                            const content = await fs.readFile(fullPath, 'utf8');
                                            const storyNumMatch = entry.name.match(/^STORY-(\d+)/i);
                                            if (storyNumMatch) {
                                                const storyNum = storyNumMatch[1];
                                                // Stories in docs/epics/stories belong to epic 001
                                                const epicId = '001';
                                                const storyId = `${epicId}.${storyNum}`;
                                                
                                                // Extract title
                                                const titleMatch = content.match(/^#\s+Story\s+\d+:\s*(.+)/m);
                                                const title = titleMatch ? titleMatch[1].trim() : entry.name.replace('.md', '');
                                                
                                                // Extract user story
                                                const userStoryMatch = content.match(/##\s*User Story\s*\n([\s\S]*?)(?=\n##|$)/i);
                                                const description = userStoryMatch ? userStoryMatch[1].trim() : '';
                                                
                                                // Extract status
                                                const statusMatch = content.match(/##\s*Status:\s*(.+)/i);
                                                const status = statusMatch ? statusMatch[1].trim() : 'Unknown';
                                                
                                                stories.push({
                                                    id: storyId,
                                                    epicId: epicId,
                                                    epic: epicId, // Both epicId and epic for compatibility
                                                    name: title,
                                                    title: title,
                                                    description: description,
                                                    userStory: description,
                                                    status: status,
                                                    filename: entry.name,
                                                    path: fullPath,
                                                    directory: path.relative(project.projectRoot, storiesPath),
                                                    filePath: path.relative(project.projectRoot, fullPath),
                                                    verified: false, // Default verification status
                                                    verificationStatus: 'pending'
                                                });
                                            }
                                        } catch (err) {
                                            console.error(`Error reading story file ${entry.name}:`, err);
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            // Stories directory doesn't exist
                        }
                    } catch (err) {
                        // Epic directory doesn't exist
                    }
                }
                
                // Group stories by epic ID
                const epicMap = new Map();
                
                // First, add actual epic files to the map
                for (const epic of epics) {
                    const epicKey = epic.epicId || epic.id || epic.name;
                    epicMap.set(epicKey, {
                        id: epicKey,
                        title: epic.title || epic.name,
                        description: epic.description,
                        stories: [],
                        filePath: epic.filePath
                    });
                }
                
                // Then group stories by their epic ID
                for (const story of stories) {
                    if (story.epicId) {
                        if (!epicMap.has(story.epicId)) {
                            // Create epic from story if epic file doesn't exist
                            epicMap.set(story.epicId, {
                                id: story.epicId,
                                title: `Epic ${story.epicId}`,
                                description: `Stories for Epic ${story.epicId}`,
                                stories: []
                            });
                        }
                        epicMap.get(story.epicId).stories.push(story);
                    }
                }
                
                // Convert map to array and sort
                const finalEpics = Array.from(epicMap.values()).sort((a, b) => {
                    // Sort numerically if IDs are numbers
                    const aNum = parseInt(a.id);
                    const bNum = parseInt(b.id);
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return aNum - bNum;
                    }
                    // Otherwise sort alphabetically
                    return a.id.localeCompare(b.id);
                });
                
                // Sort stories within each epic
                finalEpics.forEach(epic => {
                    epic.stories.sort((a, b) => {
                        if (a.id && b.id) {
                            // Sort by story ID if available
                            return a.id.localeCompare(b.id);
                        }
                        return 0;
                    });
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ stories, epics: finalEpics }));
                
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading BMAD content: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/bmad-story/') && req.method === 'GET') {
            // Get individual story content
            const pathParts = url.pathname.split('/').slice(3); // Get everything after /api/bmad-story/
            const profileId = pathParts[0];
            // Reconstruct the relative path from the remaining parts
            const relativePath = decodeURIComponent(pathParts.slice(1).join('/'));
            const project = projects.find(p => p.id === profileId);
            
            if (!project || !project.projectRoot) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            try {
                // The relative path already includes the directory structure
                const storyPath = path.join(project.projectRoot, relativePath);
                
                try {
                    const storyContent = await fs.readFile(storyPath, 'utf8');
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(storyContent);
                } catch (err) {
                    // If not found with the direct path, try looking in common directories
                    const storyDirs = ['docs', 'stories', 'docs/stories'];
                    let storyContent = null;
                    const filename = path.basename(relativePath);
                    
                    for (const dir of storyDirs) {
                        try {
                            const altPath = path.join(project.projectRoot, dir, filename);
                            storyContent = await fs.readFile(altPath, 'utf8');
                            break;
                        } catch (err) {
                            // File not found in this directory, try next
                        }
                    }
                    
                    if (storyContent) {
                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end(storyContent);
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Story file not found');
                    }
                }
                
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading story content: ' + err.message);
            }

        } else if (url.pathname.startsWith('/api/bmad-document/') && req.method === 'GET') {
            // Get document content (PRD, Coding Standards, Source Tree, Tech Stack)
            const pathParts = url.pathname.split('/').slice(3);
            const profileId = pathParts[0];
            const docType = pathParts[1];
            const project = projects.find(p => p.id === profileId);
            
            if (!project || !project.projectRoot) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            try {
                let docPath;
                switch(docType) {
                    case 'prd':
                        docPath = path.join(project.projectRoot, 'docs', 'prd.md');
                        break;
                    case 'coding-standards':
                        docPath = path.join(project.projectRoot, 'docs', 'architecture', 'coding-standards.md');
                        break;
                    case 'source-tree':
                        docPath = path.join(project.projectRoot, 'docs', 'architecture', 'source-tree.md');
                        break;
                    case 'tech-stack':
                        docPath = path.join(project.projectRoot, 'docs', 'architecture', 'tech-stack.md');
                        break;
                    default:
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Unknown document type');
                        return;
                }
                
                try {
                    const docContent = await fs.readFile(docPath, 'utf8');
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(docContent);
                } catch (err) {
                    // Document doesn't exist yet, return empty
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('');
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading document: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/bmad-document/') && req.method === 'PUT') {
            // Save document content
            const pathParts = url.pathname.split('/').slice(3);
            const profileId = pathParts[0];
            const docType = pathParts[1];
            const project = projects.find(p => p.id === profileId);
            
            if (!project || !project.projectRoot) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    let docPath;
                    switch(docType) {
                        case 'prd':
                            docPath = path.join(project.projectRoot, 'docs', 'prd.md');
                            break;
                        case 'coding-standards':
                            docPath = path.join(project.projectRoot, 'docs', 'architecture', 'coding-standards.md');
                            break;
                        case 'source-tree':
                            docPath = path.join(project.projectRoot, 'docs', 'architecture', 'source-tree.md');
                            break;
                        case 'tech-stack':
                            docPath = path.join(project.projectRoot, 'docs', 'architecture', 'tech-stack.md');
                            break;
                        default:
                            res.writeHead(404, { 'Content-Type': 'text/plain' });
                            res.end('Unknown document type');
                            return;
                    }
                    
                    // Ensure directory exists
                    const docDir = path.dirname(docPath);
                    await fs.mkdir(docDir, { recursive: true });
                    
                    // Write the document
                    await fs.writeFile(docPath, body, 'utf8');
                    
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Document saved successfully');
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error saving document: ' + err.message);
                }
            });
            return;

        // BMAD Archive API endpoints
        } else if (url.pathname.startsWith('/api/bmad-archived-epics/') && req.method === 'GET') {
            // Get archived epics for a project
            const profileId = url.pathname.split('/').pop();
            const project = projects.find(p => p.id === profileId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            try {
                // Load archived epics from a JSON file in the project root
                const archivePath = path.join(project.projectRoot, '.bmad-archives.json');
                let archivedEpics = [];
                
                try {
                    const archiveData = await fs.readFile(archivePath, 'utf8');
                    const parsed = JSON.parse(archiveData);
                    archivedEpics = parsed.epics || [];
                } catch (err) {
                    // File doesn't exist yet, return empty array
                    archivedEpics = [];
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ archivedEpics }));
                
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading archived epics: ' + err.message);
            }
            
        } else if (url.pathname.startsWith('/api/bmad-archive-epic/') && req.method === 'POST') {
            // Archive an epic
            const pathParts = url.pathname.split('/').slice(3);
            const profileId = pathParts[0];
            const epicId = pathParts[1];
            const project = projects.find(p => p.id === profileId);
            
            if (!project || !project.projectRoot) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { epic } = JSON.parse(body);
                    
                    // Load existing archives
                    const archivePath = path.join(project.projectRoot, '.bmad-archives.json');
                    let archives = { epics: [] };
                    
                    try {
                        const archiveData = await fs.readFile(archivePath, 'utf8');
                        archives = JSON.parse(archiveData);
                    } catch (err) {
                        // File doesn't exist yet
                    }
                    
                    // Add epic to archives with timestamp
                    archives.epics = archives.epics || [];
                    const archivedEpic = {
                        ...epic,
                        archivedAt: new Date().toISOString()
                    };
                    
                    // Check if already archived
                    const existingIndex = archives.epics.findIndex(e => e.id === epicId);
                    if (existingIndex >= 0) {
                        archives.epics[existingIndex] = archivedEpic;
                    } else {
                        archives.epics.push(archivedEpic);
                    }
                    
                    // Save archives
                    await fs.writeFile(archivePath, JSON.stringify(archives, null, 2), 'utf8');
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, epic: archivedEpic }));
                    
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error archiving epic: ' + err.message);
                }
            });
            return;
            
        } else if (url.pathname.startsWith('/api/bmad-unarchive-epic/') && req.method === 'POST') {
            // Unarchive/restore an epic
            const pathParts = url.pathname.split('/').slice(3);
            const profileId = pathParts[0];
            const epicId = pathParts[1];
            const project = projects.find(p => p.id === profileId);
            
            if (!project || !project.projectRoot) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Project not found');
                return;
            }
            
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { epic } = JSON.parse(body);
                    
                    // Load existing archives
                    const archivePath = path.join(project.projectRoot, '.bmad-archives.json');
                    let archives = { epics: [] };
                    
                    try {
                        const archiveData = await fs.readFile(archivePath, 'utf8');
                        archives = JSON.parse(archiveData);
                    } catch (err) {
                        // File doesn't exist yet
                    }
                    
                    // Remove epic from archives
                    archives.epics = (archives.epics || []).filter(e => e.id !== epicId);
                    
                    // Save archives
                    await fs.writeFile(archivePath, JSON.stringify(archives, null, 2), 'utf8');
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, epic }));
                    
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error unarchiving epic: ' + err.message);
                }
            });
            return;

        // BMAD MadShrimp API endpoints
        } else if (url.pathname === '/api/bmad/stories' && req.method === 'GET') {
            // Get all stories
            try {
                const stories = []; // TODO: Implement story parsing
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(stories));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading stories: ' + err.message);
            }

        } else if (url.pathname.startsWith('/api/bmad/stories/') && req.method === 'GET') {
            // Get specific story
            const storyId = url.pathname.split('/').pop();
            try {
                // TODO: Implement story retrieval by ID
                const story = null;
                if (story) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(story));
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Story not found');
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading story: ' + err.message);
            }

        } else if (url.pathname.startsWith('/api/bmad/stories/') && req.method === 'PUT') {
            // Update story
            const storyId = url.pathname.split('/').pop();
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const storyData = JSON.parse(body);
                    // TODO: Implement story update
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, storyId }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error updating story: ' + err.message);
                }
            });

        } else if (url.pathname === '/api/bmad/epics' && req.method === 'GET') {
            // Get all epics
            try {
                // Get the current project from query params or use default
                const queryParams = new URLSearchParams(url.search);
                const profileId = queryParams.get('profileId');
                
                // Find the project root
                let projectRoot = process.cwd();
                if (profileId) {
                    const project = projects.find(p => p.id === profileId);
                    if (project && project.projectRoot) {
                        projectRoot = project.projectRoot;
                    }
                }
                
                // Get stories first to group them by epic
                const stories = [];
                // Look specifically in docs/epics for BMAD epic structure
                const epicsDirs = [
                    'docs/epics',      // Main epics directory
                    '.bmad-core/epics' // Alternative BMAD location
                ];
                
                // First, scan for epic files to build epic metadata
                const epicMap = new Map();
                
                for (const dir of epicsDirs) {
                    const epicsPath = path.join(projectRoot, dir);
                    try {
                        const entries = await fs.readdir(epicsPath, { withFileTypes: true });
                        
                        // First pass: find epic files
                        for (const entry of entries) {
                            if (entry.isFile() && entry.name.startsWith('EPIC-')) {
                                // Extract epic ID from filename like "EPIC-001-persona-based.md"
                                const epicMatch = entry.name.match(/^EPIC-(\d+).*\.md$/);
                                if (epicMatch) {
                                    const epicId = epicMatch[1];
                                    const fullPath = path.join(epicsPath, entry.name);
                                    
                                    try {
                                        const content = await fs.readFile(fullPath, 'utf-8');
                                        const titleMatch = content.match(/^#\s*(.+)/m);
                                        const descMatch = content.match(/##\s*Epic\s*Description[:\s]*\n+([\s\S]*?)(?=\n##|$)/i);
                                        
                                        epicMap.set(epicId, {
                                            id: epicId,
                                            title: titleMatch ? titleMatch[1].replace(/^Epic\s*\d+:\s*/i, '').trim() : `Epic ${epicId}`,
                                            description: descMatch ? descMatch[1].trim() : '',
                                            stories: [],
                                            filename: entry.name,
                                            directory: dir
                                        });
                                    } catch (err) {
                                        console.error(`Error reading epic file ${entry.name}:`, err);
                                    }
                                }
                            }
                        }
                        
                        // Second pass: look for stories in the stories subdirectory
                        const storiesPath = path.join(epicsPath, 'stories');
                        try {
                            const storyEntries = await fs.readdir(storiesPath, { withFileTypes: true });
                            for (const entry of storyEntries) {
                                if (entry.isFile() && entry.name.startsWith('STORY-')) {
                                    // Extract story ID from filename like "STORY-001-job-naming.md"
                                    const storyMatch = entry.name.match(/^STORY-(\d+).*\.md$/);
                                    if (storyMatch) {
                                        const storyNum = storyMatch[1];
                                        // Assume stories belong to epic 001 if present
                                        const epicId = '001';
                                        const fullStoryId = `${epicId}.${storyNum}`;
                                        
                                        try {
                                            const fullPath = path.join(storiesPath, entry.name);
                                            const content = await fs.readFile(fullPath, 'utf-8');
                                        
                                            // Parse basic story info from content
                                            const titleMatch = content.match(/^#\s*Story\s+\d+:\s*(.+)/m);
                                            const statusMatch = content.match(/##\s*Status:\s*(.+)/m);
                                            const userStoryMatch = content.match(/##\s*User Story\s*\n([\s\S]*?)(?=\n##|$)/);
                                            const parallelMatch = content.match(/\*\*Parallel Work:\*\*\s*(.*)/);
                                            
                                            const story = {
                                                id: fullStoryId,
                                                epicId: epicId,
                                                title: titleMatch ? titleMatch[1].trim() : entry.name,
                                                status: statusMatch ? statusMatch[1].trim() : 'Unknown',
                                                description: userStoryMatch ? userStoryMatch[1].trim() : '',
                                                filename: entry.name,
                                                directory: `${dir}/stories`,
                                                parallelWork: {
                                                    multiDevOK: parallelMatch ? parallelMatch[1].includes('Multi-Dev OK') : false,
                                                    reason: parallelMatch ? parallelMatch[1] : ''
                                                }
                                            };
                                            
                                            stories.push(story);
                                            
                                            // Add story to its epic
                                            if (!epicMap.has(epicId)) {
                                                // Create a default epic if we haven't found the epic file yet
                                                epicMap.set(epicId, {
                                                    id: epicId,
                                                    title: `Epic ${epicId}`,
                                                    description: '',
                                                    stories: [],
                                                    directory: dir
                                                });
                                            }
                                            epicMap.get(epicId).stories.push(story);
                                            
                                        } catch (fileErr) {
                                            console.error(`Error reading story file ${entry.name}:`, fileErr.message);
                                        }
                                    }
                                }
                            }
                        } catch (storiesErr) {
                            // Stories subdirectory doesn't exist, skip
                        }
                    } catch (dirErr) {
                        // Epic directory doesn't exist, skip
                    }
                }
                
                // Convert map to array and sort by epic ID
                const epics = Array.from(epicMap.values()).sort((a, b) => {
                    const aId = parseInt(a.id) || 0;
                    const bId = parseInt(b.id) || 0;
                    return aId - bId;
                });
                
                // Sort stories within each epic
                epics.forEach(epic => {
                    epic.stories.sort((a, b) => {
                        const aStoryNum = parseInt(a.id.split('.')[1]) || 0;
                        const bStoryNum = parseInt(b.id.split('.')[1]) || 0;
                        return aStoryNum - bStoryNum;
                    });
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(epics));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading epics: ' + err.message);
            }

        } else if (url.pathname.startsWith('/api/bmad/verification/') && req.method === 'GET') {
            // Get verification results
            const storyId = url.pathname.split('/').pop();
            try {
                // TODO: Implement verification retrieval
                const verification = null;
                if (verification) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(verification));
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Verification not found');
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading verification: ' + err.message);
            }

        } else if (url.pathname === '/api/bmad/verification' && req.method === 'GET') {
            // Get all verification results
            try {
                const verificationDir = path.join(PROJECT_ROOT, '.ai', 'verification');
                const verifications = [];
                
                if (await fs.access(verificationDir).then(() => true).catch(() => false)) {
                    const files = await fs.readdir(verificationDir);
                    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('failed'));
                    
                    for (const file of jsonFiles) {
                        try {
                            const filePath = path.join(verificationDir, file);
                            const content = await fs.readFile(filePath, 'utf-8');
                            const verification = JSON.parse(content);
                            verifications.push(verification);
                        } catch (err) {
                            console.error(`Error reading verification file ${file}:`, err);
                        }
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(verifications));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading verifications: ' + err.message);
            }

        } else if (url.pathname === '/api/bmad/verify' && req.method === 'POST') {
            // Trigger verification
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { storyId } = JSON.parse(body);
                    // TODO: Implement verification trigger
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Verification triggered', storyId }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error triggering verification: ' + err.message);
                }
            });

        } else if (url.pathname === '/api/bmad/prd' && req.method === 'GET') {
            // Get PRD content
            try {
                const prdPath = path.join(PROJECT_ROOT, 'docs', 'prd.md');
                if (await fs.access(prdPath).then(() => true).catch(() => false)) {
                    const content = await fs.readFile(prdPath, 'utf-8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ content }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('PRD not found');
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading PRD: ' + err.message);
            }

        } else if (url.pathname === '/api/bmad/prd' && req.method === 'PUT') {
            // Update PRD content
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { content } = JSON.parse(body);
                    const prdPath = path.join(PROJECT_ROOT, 'docs', 'prd.md');
                    await fs.writeFile(prdPath, content);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error updating PRD: ' + err.message);
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
                    const agentsList = availableAgents.map(agent => {
                        const desc = agent.metadata?.description || agent.content?.slice(0, 200) || 'No description';
                        return '- ' + agent.name + ': ' + desc;
                    }).join('\n');
                    
                    const tasksList = selectedTasks.map(task => {
                        return '- Task ID: ' + task.id + '\n  Name: ' + task.name + '\n  Description: ' + (task.description || 'No description') + '\n  Dependencies: ' + (task.dependencies?.join(', ') || 'None');
                    }).join('\n\n');
                    
                    const prompt = 'You are an AI assistant helping to assign specialized agents to tasks.\n\nAvailable Agents:\n' + agentsList + '\n\nTasks to Assign:\n' + tasksList + '\n\nFor each task, select the most appropriate agent based on the task requirements and agent capabilities. If no agent is particularly suitable, you may assign "No agent".\n\nReturn ONLY a JSON object mapping task IDs to agent names, like this:\n{\n  "task-id-1": "agent-name.md",\n  "task-id-2": "No agent",\n  "task-id-3": "another-agent.yaml"\n}';

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
                                    reject(new Error('OpenAI API error: ' + res.statusCode + ' - ' + data));
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
            
        } else if (url.pathname === '/api/chat' && req.method === 'POST') {
            // Handle chat with AI agents
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { message, agents, context, profileId, openAIKey, availableAgents } = JSON.parse(body);
                    console.log('Chat request:', { message, agents, context: context?.currentPage });
                    
                    // Validate OpenAI key
                    const apiKey = openAIKey || process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY_SHRIMP_TASK_VIEWER;
                    
                    if (!apiKey) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: 'OpenAI API key not configured',
                            message: 'Please configure your OpenAI API key in Settings → Global Settings'
                        }));
                        return;
                    }
                    
                    // Build context-aware prompt
                    let systemPrompt = 'You are an AI assistant helping with task management in the Shrimp Task Manager. You have access to information about available agents and can help users understand tasks, suggest agent assignments, and provide task-related insights.\n\n';
                    
                    // Add available agents
                    systemPrompt += 'Available agents for this project:\n';
                    systemPrompt += availableAgents.map(a => '- ' + a.name + ': ' + (a.description || 'No description')).join('\n');
                    systemPrompt += '\n\n';
                    
                    // Add current context
                    systemPrompt += 'Current context:\n- Page: ' + context.currentPage + '\n';
                    
                    // Add current task details if available
                    if (context.currentTask) {
                        systemPrompt += 'Current Task Details:\n';
                        systemPrompt += '- Name: ' + context.currentTask.name + '\n';
                        systemPrompt += '- Status: ' + context.currentTask.status + '\n';
                        systemPrompt += '- Description: ' + (context.currentTask.description || 'No description') + '\n';
                        systemPrompt += '- Assigned Agent: ' + (context.currentTask.assignedAgent || 'Unassigned') + '\n';
                        systemPrompt += '- Dependencies: ' + (context.currentTask.dependencies?.join(', ') || 'None') + '\n';
                    }
                    
                    // Add tasks summary
                    if (context.tasksSummary) {
                        systemPrompt += '\nTasks Overview:\n';
                        systemPrompt += '- Total tasks: ' + context.tasksSummary.total + '\n';
                        systemPrompt += '- Completed: ' + context.tasksSummary.completed + '\n';
                        systemPrompt += '- In Progress: ' + context.tasksSummary.inProgress + '\n';
                        systemPrompt += '- Pending: ' + context.tasksSummary.pending + '\n';
                    }
                    
                    // Add completed tasks
                    if (context.completedTasks && context.completedTasks.length > 0) {
                        systemPrompt += '\nCompleted Tasks:\n';
                        systemPrompt += context.completedTasks.map(t => '- ' + t.name + (t.description ? ': ' + t.description : '')).join('\n');
                        systemPrompt += '\n';
                    }
                    
                    // Add in progress tasks
                    if (context.inProgressTasks && context.inProgressTasks.length > 0) {
                        systemPrompt += '\nIn Progress Tasks:\n';
                        systemPrompt += context.inProgressTasks.map(t => '- ' + t.name + (t.description ? ': ' + t.description : '')).join('\n');
                        systemPrompt += '\n';
                    }
                    
                    // Add pending tasks
                    if (context.pendingTasks && context.pendingTasks.length > 0) {
                        systemPrompt += '\nPending Tasks:\n';
                        systemPrompt += context.pendingTasks.map(t => '- ' + t.name + (t.description ? ': ' + t.description : '')).join('\n');
                        systemPrompt += '\n';
                    }
                    
                    // Add available agents details
                    if (context.availableAgents && context.availableAgents.length > 0) {
                        systemPrompt += '\nAvailable Agents:\n';
                        systemPrompt += context.availableAgents.map(a => '- ' + a.name + ' (' + a.type + '): ' + a.description + (a.tools && a.tools.length > 0 ? ' | Tools: ' + a.tools.join(', ') : '')).join('\n');
                        systemPrompt += '\n';
                    }
                    
                    // Add agent assignments
                    if (context.agentAssignments && Object.keys(context.agentAssignments).length > 0) {
                        systemPrompt += '\nAgent Assignment Statistics:\n';
                        systemPrompt += Object.entries(context.agentAssignments).map(([agent, stats]) => 
                            '- ' + agent + ': ' + stats.total + ' tasks (' + stats.completed + ' completed, ' + stats.inProgress + ' in progress, ' + stats.pending + ' pending)'
                        ).join('\n');
                        systemPrompt += '\n';
                    }
                    
                    // Add unassigned tasks
                    if (context.unassignedTasks && context.unassignedTasks.total > 0) {
                        systemPrompt += '\nUnassigned Tasks: ' + context.unassignedTasks.total + ' total (' + context.unassignedTasks.completed + ' completed, ' + context.unassignedTasks.inProgress + ' in progress, ' + context.unassignedTasks.pending + ' pending)\n';
                    }
                    
                    systemPrompt += '\nWhen the user asks for summaries or information about tasks, use the detailed task information provided in the context.\n';
                    systemPrompt += 'When suggesting agent assignments, consider the agent\'s capabilities and the task requirements.\n\n';
                    systemPrompt += 'IMPORTANT: If the user asks to modify/edit a task and there is a currentTask in the context, respond with the modification in this EXACT format:\n';
                    systemPrompt += 'TASK_MODIFICATION: {JSON object with the fields to update}\n\n';
                    systemPrompt += 'Available task fields you can modify:\n';
                    systemPrompt += '- name: The task title/name\n';
                    systemPrompt += '- description: The task description\n';
                    systemPrompt += '- notes: Additional notes about the task\n';
                    systemPrompt += '- status: Task status (pending, in_progress, completed)\n';
                    systemPrompt += '- assignedAgent: Which agent is assigned to the task\n';
                    systemPrompt += '- implementationGuide: Implementation guidance\n';
                    systemPrompt += '- verificationCriteria: How to verify completion\n';
                    systemPrompt += '- dependencies: Task dependencies (array)\n';
                    systemPrompt += '- relatedFiles: Related files (array)\n\n';
                    systemPrompt += 'Examples:\n';
                    systemPrompt += 'TASK_MODIFICATION: {"notes": "Updated notes with hello world"}\n';
                    systemPrompt += 'TASK_MODIFICATION: {"description": "New description", "status": "in_progress"}\n';
                    systemPrompt += 'TASK_MODIFICATION: {"assignedAgent": "gpt-engineer"}\n\n';
                    systemPrompt += 'Be helpful, concise, and specific in your responses.\n\n';
                    systemPrompt += 'FORMATTING: Use markdown formatting and emojis to make your responses more readable:\n';
                    systemPrompt += '- Use **bold** for important points\n';
                    systemPrompt += '- Use \'code\' for technical terms\n';
                    systemPrompt += '- Use ✅ for completed/positive items in lists\n';
                    systemPrompt += '- Use ❌ for failed/negative items in lists\n';
                    systemPrompt += '- Use emojis (📋 📝 ⚠️ 🔧 💡 🎯) to add visual context\n';
                    systemPrompt += '- Use headers (##) for section organization\n';

                    // Call OpenAI API
                    const openAIData = JSON.stringify({
                        model: 'gpt-4-turbo-preview',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: message }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
                    });
                    
                    const openAIResponse = await new Promise((resolve, reject) => {
                        const options = {
                            hostname: 'api.openai.com',
                            path: '/v1/chat/completions',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + apiKey,
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
                                    reject(new Error('OpenAI API error: ' + res.statusCode + ' - ' + data));
                                }
                            });
                        });
                        
                        req.on('error', reject);
                        req.write(openAIData);
                        req.end();
                    });
                    
                    let aiResponse = openAIResponse.choices[0].message.content;
                    
                    // Check if response suggests task modification
                    let taskModification = null;
                    if (context.currentTask && aiResponse.includes('TASK_MODIFICATION:')) {
                        try {
                            // Extract the JSON from the response
                            const modificationMatch = aiResponse.match(/TASK_MODIFICATION:\s*(\{[^}]+\})/);
                            if (modificationMatch) {
                                const modifications = JSON.parse(modificationMatch[1]);
                                taskModification = {
                                    suggested: true,
                                    ...modifications
                                };
                                console.log('Parsed task modification:', taskModification);
                                
                                // Remove the TASK_MODIFICATION line from the response
                                aiResponse = aiResponse.replace(/TASK_MODIFICATION:\s*\{[^}]+\}\s*/, '').trim();
                            }
                        } catch (err) {
                            console.error('Error parsing task modification:', err);
                        }
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        response: aiResponse,
                        respondingAgents: agents,
                        taskModification
                    }));
                    
                } catch (err) {
                    console.error('Error processing chat request:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Failed to process chat request',
                        details: err.message 
                    }));
                }
            });
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/story-hierarchy') && req.method === 'GET') {
            // Enhanced endpoint: Get complete epic-story-task hierarchy
            const projectId = url.pathname.split('/')[3]; // Extract projectId from /api/tasks/{projectId}/story-hierarchy
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }
            
            try {
                // Check cache first
                const cacheKey = `story-hierarchy-${projectId}`;
                const cachedHierarchy = getCacheEntry(cacheKey);
                
                if (cachedHierarchy) {
                    console.log(`Serving cached story hierarchy for project: ${projectId}`);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=300'
                    });
                    res.end(JSON.stringify(cachedHierarchy));
                    return;
                }
                
                // Check if tasks file exists
                try {
                    await fs.access(project.path);
                } catch (accessErr) {
                    const emptyHierarchy = {
                        epics: [],
                        stories: [],
                        tasks: [],
                        hierarchy: {},
                        metrics: {
                            totalEpics: 0,
                            totalStories: 0,
                            totalTasks: 0,
                            tasksWithStories: 0,
                            storiesWithTasks: 0,
                            epicsWithStories: 0
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    setCacheEntry(cacheKey, emptyHierarchy);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=300'
                    });
                    res.end(JSON.stringify(emptyHierarchy));
                    return;
                }
                
                // Read and parse tasks
                const data = await fs.readFile(project.path, 'utf8');
                let tasksData = JSON.parse(data);
                
                if (Array.isArray(tasksData)) {
                    tasksData = { tasks: tasksData };
                }
                
                const tasks = tasksData.tasks || [];
                let stories = [];
                let epics = [];
                let hierarchy = {};
                
                // Try BMAD integration for complete hierarchy
                try {
                    const bmadPath = path.join(project.projectRoot, '.bmad-core');
                    const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                    
                    if (bmadExists) {
                        const bmadApi = await import('./src/utils/bmad-api.js');
                        
                        // Get stories and epics with full data
                        [stories, epics] = await Promise.all([
                            bmadApi.getStories(projectId),
                            bmadApi.getEpics(projectId)
                        ]);
                        
                        // Enrich tasks with story context
                        const enrichedTasks = await bmadApi.getTasksWithStoryContext(tasks, projectId);
                        
                        // Build complete hierarchy
                        epics.forEach(epic => {
                            hierarchy[epic.id] = {
                                epic: {
                                    id: epic.id,
                                    title: epic.title,
                                    description: epic.description,
                                    status: epic.status,
                                    priority: epic.priority || 'medium',
                                    createdAt: epic.createdAt,
                                    updatedAt: epic.updatedAt
                                },
                                stories: {},
                                metrics: {
                                    storyCount: 0,
                                    taskCount: 0,
                                    completedTasks: 0,
                                    completionRate: 0
                                }
                            };
                        });
                        
                        // Add stories to hierarchy
                        stories.forEach(story => {
                            const epicId = story.epic || story.epicId;
                            if (epicId && hierarchy[epicId]) {
                                hierarchy[epicId].stories[story.id] = {
                                    story: {
                                        id: story.id,
                                        title: story.title,
                                        description: story.description || story.userStory,
                                        status: story.status,
                                        epic: epicId,
                                        verified: Boolean(story.verified),
                                        verificationStatus: story.verificationStatus || 'pending',
                                        acceptanceCriteria: story.acceptanceCriteria || [],
                                        createdAt: story.createdAt,
                                        updatedAt: story.updatedAt
                                    },
                                    tasks: [],
                                    metrics: {
                                        taskCount: 0,
                                        completedTasks: 0,
                                        completionRate: 0
                                    }
                                };
                                hierarchy[epicId].metrics.storyCount++;
                            }
                        });
                        
                        // Add tasks to hierarchy
                        enrichedTasks.forEach(task => {
                            const storyId = task.storyId;
                            if (storyId) {
                                // Find the epic containing this story
                                for (const epicId in hierarchy) {
                                    if (hierarchy[epicId].stories[storyId]) {
                                        const taskData = {
                                            id: task.id,
                                            name: task.name,
                                            description: task.description,
                                            status: task.status,
                                            agent: task.agent || null,
                                            priority: task.priority || 'medium',
                                            storyId: storyId,
                                            epicId: epicId,
                                            createdAt: task.createdAt,
                                            updatedAt: task.updatedAt,
                                            storyContext: task.storyContext
                                        };
                                        
                                        hierarchy[epicId].stories[storyId].tasks.push(taskData);
                                        hierarchy[epicId].stories[storyId].metrics.taskCount++;
                                        hierarchy[epicId].metrics.taskCount++;
                                        
                                        if (task.status === 'completed') {
                                            hierarchy[epicId].stories[storyId].metrics.completedTasks++;
                                            hierarchy[epicId].metrics.completedTasks++;
                                        }
                                        break;
                                    }
                                }
                            }
                        });
                        
                        // Calculate completion rates
                        for (const epicId in hierarchy) {
                            const epicData = hierarchy[epicId];
                            
                            // Epic completion rate
                            if (epicData.metrics.taskCount > 0) {
                                epicData.metrics.completionRate = Math.round(
                                    (epicData.metrics.completedTasks / epicData.metrics.taskCount) * 100
                                );
                            }
                            
                            // Story completion rates
                            for (const storyId in epicData.stories) {
                                const storyData = epicData.stories[storyId];
                                if (storyData.metrics.taskCount > 0) {
                                    storyData.metrics.completionRate = Math.round(
                                        (storyData.metrics.completedTasks / storyData.metrics.taskCount) * 100
                                    );
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error building story hierarchy:', error);
                    // Continue with basic structure if enhancement fails
                }
                
                // Calculate overall metrics
                const metrics = {
                    totalEpics: epics.length,
                    totalStories: stories.length,
                    totalTasks: tasks.length,
                    tasksWithStories: tasks.filter(t => t.storyId || 
                        stories.some(s => s.id === t.storyId)).length,
                    storiesWithTasks: stories.filter(s => 
                        tasks.some(t => t.storyId === s.id)).length,
                    epicsWithStories: epics.filter(e => 
                        stories.some(s => s.epic === e.id || s.epicId === e.id)).length
                };
                
                const storyHierarchy = {
                    epics,
                    stories,
                    tasks,
                    hierarchy,
                    metrics,
                    timestamp: new Date().toISOString()
                };
                
                // Cache the response
                setCacheEntry(cacheKey, storyHierarchy);
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'private, max-age=300'
                });
                res.end(JSON.stringify(storyHierarchy));
                
            } catch (err) {
                console.error(`Error building story hierarchy for ${project.path}:`, err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Failed to build story hierarchy',
                    details: err.message 
                }));
            }
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/story-validation') && req.method === 'GET') {
            // Enhanced endpoint: Validate task-story linkages and return detailed report
            const projectId = url.pathname.split('/')[3]; // Extract projectId from /api/tasks/{projectId}/story-validation
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }
            
            try {
                // Check cache first
                const cacheKey = `story-validation-${projectId}`;
                const cachedValidation = getCacheEntry(cacheKey);
                
                if (cachedValidation) {
                    console.log(`Serving cached story validation for project: ${projectId}`);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=180' // 3 minutes cache for validation data
                    });
                    res.end(JSON.stringify(cachedValidation));
                    return;
                }
                
                // Check if tasks file exists
                try {
                    await fs.access(project.path);
                } catch (accessErr) {
                    const emptyValidation = {
                        summary: {
                            totalTasks: 0,
                            tasksWithStories: 0,
                            tasksWithoutStories: 0,
                            totalStories: 0,
                            storiesWithTasks: 0,
                            storiesWithoutTasks: 0,
                            validLinks: 0,
                            brokenLinks: 0,
                            healthScore: 0
                        },
                        taskAnalysis: {
                            linked: [],
                            unlinked: [],
                            brokenLinks: []
                        },
                        storyAnalysis: {
                            withTasks: [],
                            orphaned: [],
                            missingFromProject: []
                        },
                        recommendations: [],
                        timestamp: new Date().toISOString()
                    };
                    
                    setCacheEntry(cacheKey, emptyValidation);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=180'
                    });
                    res.end(JSON.stringify(emptyValidation));
                    return;
                }
                
                // Read and parse tasks
                const data = await fs.readFile(project.path, 'utf8');
                let tasksData = JSON.parse(data);
                
                if (Array.isArray(tasksData)) {
                    tasksData = { tasks: tasksData };
                }
                
                const tasks = tasksData.tasks || [];
                let stories = [];
                let validationResult = {
                    summary: {
                        totalTasks: tasks.length,
                        tasksWithStories: 0,
                        tasksWithoutStories: tasks.length,
                        totalStories: 0,
                        storiesWithTasks: 0,
                        storiesWithoutTasks: 0,
                        validLinks: 0,
                        brokenLinks: 0,
                        healthScore: 0
                    },
                    taskAnalysis: {
                        linked: [],
                        unlinked: [],
                        brokenLinks: []
                    },
                    storyAnalysis: {
                        withTasks: [],
                        orphaned: [],
                        missingFromProject: []
                    },
                    recommendations: []
                };
                
                // Try BMAD integration for comprehensive validation
                try {
                    const bmadPath = path.join(project.projectRoot, '.bmad-core');
                    const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                    
                    if (bmadExists) {
                        const bmadApi = await import('./src/utils/bmad-api.js');
                        
                        // Get stories and perform validation using the utility functions
                        stories = await bmadApi.getStories(projectId);
                        const validation = await bmadApi.validateProjectStoryTaskLinking(tasks, projectId);
                        
                        if (validation) {
                            // Use validation results to build comprehensive report
                            validationResult.summary.totalStories = stories.length;
                            validationResult.summary.tasksWithStories = validation.tasksWithStories;
                            validationResult.summary.tasksWithoutStories = validation.tasksWithoutStories;
                            
                            const storiesWithTasks = validation.linkedStories.length;
                            const orphanedStories = validation.orphanedStories.length;
                            
                            validationResult.summary.storiesWithTasks = storiesWithTasks;
                            validationResult.summary.storiesWithoutTasks = orphanedStories;
                            validationResult.summary.validLinks = validation.tasksWithStories;
                            validationResult.summary.brokenLinks = validation.missingStories.length;
                            
                            // Calculate health score (0-100)
                            const totalConnections = tasks.length + stories.length;
                            const validConnections = validation.tasksWithStories + storiesWithTasks;
                            validationResult.summary.healthScore = totalConnections > 0 ? 
                                Math.round((validConnections / totalConnections) * 100) : 100;
                            
                            // Detailed task analysis
                            tasks.forEach(task => {
                                const storyId = task.storyId;
                                const taskInfo = {
                                    id: task.id,
                                    name: task.name,
                                    status: task.status,
                                    storyId: storyId
                                };
                                
                                if (storyId) {
                                    if (validation.missingStories.includes(storyId)) {
                                        validationResult.taskAnalysis.brokenLinks.push({
                                            ...taskInfo,
                                            issue: 'Story not found in project',
                                            storyId: storyId
                                        });
                                    } else {
                                        validationResult.taskAnalysis.linked.push(taskInfo);
                                    }
                                } else {
                                    validationResult.taskAnalysis.unlinked.push(taskInfo);
                                }
                            });
                            
                            // Detailed story analysis
                            stories.forEach(story => {
                                const storyInfo = {
                                    id: story.id,
                                    title: story.title,
                                    status: story.status,
                                    epic: story.epic || story.epicId
                                };
                                
                                if (validation.linkedStories.includes(story.id)) {
                                    validationResult.storyAnalysis.withTasks.push(storyInfo);
                                } else {
                                    validationResult.storyAnalysis.orphaned.push(storyInfo);
                                }
                            });
                            
                            // Add missing stories that tasks reference
                            validation.missingStories.forEach(storyId => {
                                validationResult.storyAnalysis.missingFromProject.push({
                                    id: storyId,
                                    title: `Story ${storyId}`,
                                    status: 'unknown',
                                    issue: 'Referenced by tasks but not found in project stories'
                                });
                            });
                            
                            // Generate recommendations
                            if (validation.tasksWithoutStories > 0) {
                                validationResult.recommendations.push({
                                    type: 'unlinked-tasks',
                                    priority: 'medium',
                                    message: `${validation.tasksWithoutStories} tasks are not linked to stories. Consider creating stories or linking them to existing ones.`,
                                    count: validation.tasksWithoutStories
                                });
                            }
                            
                            if (validation.orphanedStories.length > 0) {
                                validationResult.recommendations.push({
                                    type: 'orphaned-stories',
                                    priority: 'low',
                                    message: `${validation.orphanedStories.length} stories have no associated tasks. Consider creating implementation tasks.`,
                                    count: validation.orphanedStories.length
                                });
                            }
                            
                            if (validation.missingStories.length > 0) {
                                validationResult.recommendations.push({
                                    type: 'broken-links',
                                    priority: 'high',
                                    message: `${validation.missingStories.length} tasks reference non-existent stories. Please create these stories or fix the references.`,
                                    count: validation.missingStories.length,
                                    storyIds: validation.missingStories
                                });
                            }
                            
                            if (validationResult.summary.healthScore >= 90) {
                                validationResult.recommendations.push({
                                    type: 'health-excellent',
                                    priority: 'info',
                                    message: 'Excellent task-story linkage health! Your project has strong traceability.'
                                });
                            } else if (validationResult.summary.healthScore >= 70) {
                                validationResult.recommendations.push({
                                    type: 'health-good',
                                    priority: 'info',
                                    message: 'Good task-story linkage health. Consider addressing the recommendations to improve further.'
                                });
                            } else {
                                validationResult.recommendations.push({
                                    type: 'health-poor',
                                    priority: 'high',
                                    message: 'Poor task-story linkage health. Immediate attention needed to improve project traceability.'
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error performing story validation:', error);
                    validationResult.recommendations.push({
                        type: 'validation-error',
                        priority: 'high',
                        message: 'Error occurred during validation. Some results may be incomplete.',
                        details: error.message
                    });
                }
                
                validationResult.timestamp = new Date().toISOString();
                
                // Cache the response (shorter TTL for validation data)
                setCacheEntry(cacheKey, validationResult);
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'private, max-age=180'
                });
                res.end(JSON.stringify(validationResult));
                
            } catch (err) {
                console.error(`Error validating story links for ${project.path}:`, err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Failed to validate story links',
                    details: err.message 
                }));
            }
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/with-stories') && req.method === 'GET') {
            // Enhanced endpoint: Get tasks with enriched story data
            const projectId = url.pathname.split('/')[3]; // Extract projectId from /api/tasks/{projectId}/with-stories
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }
            
            try {
                // Check cache first
                const cacheKey = `with-stories-${projectId}`;
                const cachedResponse = getCacheEntry(cacheKey);
                
                if (cachedResponse) {
                    console.log(`Serving cached tasks with stories for project: ${projectId}`);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=300' // 5 minutes browser cache
                    });
                    res.end(JSON.stringify(cachedResponse));
                    return;
                }
                
                // Check if tasks file exists
                try {
                    await fs.access(project.path);
                } catch (accessErr) {
                    const emptyResponse = {
                        tasks: [],
                        enrichedData: {
                            storyContext: {},
                            epicHierarchy: {},
                            aggregatedStats: {
                                totalTasks: 0,
                                tasksWithStories: 0,
                                tasksWithoutStories: 0,
                                storiesWithTasks: 0,
                                storiesWithoutTasks: 0
                            }
                        },
                        projectRoot: project.projectRoot || null,
                        message: "No tasks found. The tasks.json file hasn't been created yet."
                    };
                    
                    setCacheEntry(cacheKey, emptyResponse);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=300'
                    });
                    res.end(JSON.stringify(emptyResponse));
                    return;
                }
                
                // Read and parse tasks
                const data = await fs.readFile(project.path, 'utf8');
                let tasksData = JSON.parse(data);
                
                if (Array.isArray(tasksData)) {
                    tasksData = { tasks: tasksData };
                }
                
                let enrichedTasks = tasksData.tasks || [];
                let enrichedData = {
                    storyContext: {},
                    epicHierarchy: {},
                    aggregatedStats: {
                        totalTasks: enrichedTasks.length,
                        tasksWithStories: 0,
                        tasksWithoutStories: enrichedTasks.length,
                        storiesWithTasks: 0,
                        storiesWithoutTasks: 0
                    }
                };
                
                // Enhanced BMAD integration
                try {
                    const bmadPath = path.join(project.projectRoot, '.bmad-core');
                    const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                    
                    if (bmadExists && enrichedTasks.length > 0) {
                        console.log(`Enhanced processing for ${enrichedTasks.length} tasks with BMAD integration for project ${projectId}`);
                        
                        const bmadApi = await import('./src/utils/bmad-api.js');
                        
                        // Get stories, epics, and verifications for complete context
                        const [stories, epics, verifications] = await Promise.all([
                            bmadApi.getStories(projectId),
                            bmadApi.getEpics(projectId),
                            bmadApi.getAllVerifications(projectId)
                        ]);
                        
                        // Enrich tasks with story context and verification data
                        enrichedTasks = await bmadApi.getTasksWithStoryContext(enrichedTasks, projectId, verifications);
                        
                        // Build story context map with verification status
                        const storyMap = new Map();
                        stories.forEach(story => {
                            const storyVerification = verifications[story.id] || {};
                            storyMap.set(story.id, {
                                id: story.id,
                                title: story.title,
                                epic: story.epic,
                                status: story.status,
                                verified: Boolean(story.verified || storyVerification.verified),
                                verificationStatus: story.verificationStatus || storyVerification.status || 'pending',
                                verificationScore: storyVerification.score || story.verificationScore || null,
                                verificationUpdatedAt: storyVerification.updatedAt || story.verificationUpdatedAt || null,
                                acceptanceCriteria: story.acceptanceCriteria || [],
                                tasks: []
                            });
                        });
                        
                        // Build epic hierarchy
                        const epicMap = new Map();
                        epics.forEach(epic => {
                            epicMap.set(epic.id, {
                                id: epic.id,
                                title: epic.title,
                                description: epic.description,
                                status: epic.status,
                                stories: []
                            });
                        });
                        
                        // Associate tasks with stories and calculate stats
                        let tasksWithStories = 0;
                        enrichedTasks.forEach(task => {
                            if (task.storyId && storyMap.has(task.storyId)) {
                                storyMap.get(task.storyId).tasks.push(task.id);
                                tasksWithStories++;
                            }
                        });
                        
                        // Associate stories with epics
                        stories.forEach(story => {
                            if (story.epic && epicMap.has(story.epic)) {
                                epicMap.get(story.epic).stories.push(story.id);
                            }
                        });
                        
                        // Convert maps to objects for JSON serialization
                        enrichedData.storyContext = Object.fromEntries(storyMap);
                        enrichedData.epicHierarchy = Object.fromEntries(epicMap);
                        
                        // Update aggregated stats
                        enrichedData.aggregatedStats = {
                            totalTasks: enrichedTasks.length,
                            tasksWithStories,
                            tasksWithoutStories: enrichedTasks.length - tasksWithStories,
                            storiesWithTasks: Array.from(storyMap.values()).filter(s => s.tasks.length > 0).length,
                            storiesWithoutTasks: Array.from(storyMap.values()).filter(s => s.tasks.length === 0).length,
                            totalStories: stories.length,
                            totalEpics: epics.length
                        };
                    }
                } catch (error) {
                    console.error('Error in enhanced BMAD processing:', error);
                    // Continue with basic task data if enhancement fails
                }
                
                const response = {
                    tasks: enrichedTasks,
                    enrichedData,
                    initialRequest: tasksData.initialRequest || null,
                    summary: tasksData.summary || null,
                    summaryGeneratedAt: tasksData.summaryGeneratedAt || null,
                    projectRoot: project.projectRoot || null,
                    timestamp: new Date().toISOString()
                };
                
                // Cache the response
                setCacheEntry(cacheKey, response);
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'private, max-age=300'
                });
                res.end(JSON.stringify(response));
                
            } catch (err) {
                console.error(`Error in enhanced tasks endpoint for ${project.path}:`, err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Failed to get enhanced task data',
                    details: err.message 
                }));
            }
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/dashboard-stats') && req.method === 'GET') {
            // Enhanced endpoint: Get aggregated dashboard statistics
            const projectId = url.pathname.split('/')[3]; // Extract projectId from /api/tasks/{projectId}/dashboard-stats
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }
            
            try {
                // Check cache first
                const cacheKey = `dashboard-stats-${projectId}`;
                const cachedStats = getCacheEntry(cacheKey);
                
                if (cachedStats) {
                    console.log(`Serving cached dashboard stats for project: ${projectId}`);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=300'
                    });
                    res.end(JSON.stringify(cachedStats));
                    return;
                }
                
                // Check if tasks file exists
                try {
                    await fs.access(project.path);
                } catch (accessErr) {
                    const emptyStats = {
                        taskStats: {
                            total: 0,
                            completed: 0,
                            inProgress: 0,
                            pending: 0,
                            completionRate: 0
                        },
                        storyStats: {
                            total: 0,
                            withTasks: 0,
                            withoutTasks: 0,
                            avgTasksPerStory: 0
                        },
                        epicStats: {
                            total: 0,
                            withStories: 0,
                            withoutStories: 0,
                            avgStoriesPerEpic: 0
                        },
                        agentStats: {
                            assigned: 0,
                            unassigned: 0,
                            agents: {}
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    setCacheEntry(cacheKey, emptyStats);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=300'
                    });
                    res.end(JSON.stringify(emptyStats));
                    return;
                }
                
                // Read and parse tasks
                const data = await fs.readFile(project.path, 'utf8');
                let tasksData = JSON.parse(data);
                
                if (Array.isArray(tasksData)) {
                    tasksData = { tasks: tasksData };
                }
                
                const tasks = tasksData.tasks || [];
                
                // Basic task statistics
                let taskStats = {
                    total: tasks.length,
                    completed: tasks.filter(t => t.status === 'completed').length,
                    inProgress: tasks.filter(t => t.status === 'in_progress').length,
                    pending: tasks.filter(t => t.status === 'pending').length,
                    completionRate: 0
                };
                taskStats.completionRate = taskStats.total > 0 ? 
                    Math.round((taskStats.completed / taskStats.total) * 100) : 0;
                
                // Agent statistics
                let agentStats = {
                    assigned: tasks.filter(t => t.agent && t.agent.trim() !== '').length,
                    unassigned: tasks.filter(t => !t.agent || t.agent.trim() === '').length,
                    agents: {}
                };
                
                tasks.forEach(task => {
                    if (task.agent && task.agent.trim() !== '') {
                        if (!agentStats.agents[task.agent]) {
                            agentStats.agents[task.agent] = {
                                total: 0,
                                completed: 0,
                                inProgress: 0,
                                pending: 0
                            };
                        }
                        agentStats.agents[task.agent].total++;
                        agentStats.agents[task.agent][task.status]++;
                    }
                });
                
                let storyStats = { total: 0, withTasks: 0, withoutTasks: 0, avgTasksPerStory: 0 };
                let epicStats = { total: 0, withStories: 0, withoutStories: 0, avgStoriesPerEpic: 0 };
                
                // Enhanced statistics with BMAD integration
                try {
                    const bmadPath = path.join(project.projectRoot, '.bmad-core');
                    const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                    
                    if (bmadExists) {
                        const bmadApi = await import('./src/utils/bmad-api.js');
                        
                        const [stories, epics] = await Promise.all([
                            bmadApi.getStories(projectId),
                            bmadApi.getEpics(projectId)
                        ]);
                        
                        // Story statistics
                        const storiesWithTasks = stories.filter(story => 
                            tasks.some(task => task.storyId === story.id)
                        );
                        
                        storyStats = {
                            total: stories.length,
                            withTasks: storiesWithTasks.length,
                            withoutTasks: stories.length - storiesWithTasks.length,
                            avgTasksPerStory: stories.length > 0 ? 
                                Math.round(tasks.filter(t => t.storyId).length / stories.length * 10) / 10 : 0
                        };
                        
                        // Epic statistics
                        const epicsWithStories = epics.filter(epic => 
                            stories.some(story => story.epic === epic.id)
                        );
                        
                        epicStats = {
                            total: epics.length,
                            withStories: epicsWithStories.length,
                            withoutStories: epics.length - epicsWithStories.length,
                            avgStoriesPerEpic: epics.length > 0 ? 
                                Math.round(stories.length / epics.length * 10) / 10 : 0
                        };
                    }
                } catch (error) {
                    console.error('Error calculating enhanced statistics:', error);
                }
                
                const dashboardStats = {
                    taskStats,
                    storyStats,
                    epicStats,
                    agentStats,
                    timestamp: new Date().toISOString()
                };
                
                // Cache the response
                setCacheEntry(cacheKey, dashboardStats);
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'private, max-age=300'
                });
                res.end(JSON.stringify(dashboardStats));
                
            } catch (err) {
                console.error(`Error calculating dashboard stats for ${project.path}:`, err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Failed to calculate dashboard statistics',
                    details: err.message 
                }));
            }
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/story-hierarchy') && req.method === 'GET') {
            // Enhanced endpoint: Get complete epic-story-task hierarchy
            const projectId = url.pathname.split('/')[3]; // Extract projectId from /api/tasks/{projectId}/story-hierarchy
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }
            
            try {
                // Check cache first
                const cacheKey = `story-hierarchy-${projectId}`;
                const cachedHierarchy = getCacheEntry(cacheKey);
                
                if (cachedHierarchy) {
                    console.log(`Serving cached story hierarchy for project: ${projectId}`);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=300'
                    });
                    res.end(JSON.stringify(cachedHierarchy));
                    return;
                }
                
                // Check if tasks file exists
                try {
                    await fs.access(project.path);
                } catch (accessErr) {
                    const emptyHierarchy = {
                        epics: [],
                        stories: [],
                        tasks: [],
                        hierarchy: {},
                        metrics: {
                            totalEpics: 0,
                            totalStories: 0,
                            totalTasks: 0,
                            tasksWithStories: 0,
                            storiesWithTasks: 0,
                            epicsWithStories: 0
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    setCacheEntry(cacheKey, emptyHierarchy);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=300'
                    });
                    res.end(JSON.stringify(emptyHierarchy));
                    return;
                }
                
                // Read and parse tasks
                const data = await fs.readFile(project.path, 'utf8');
                let tasksData = JSON.parse(data);
                
                if (Array.isArray(tasksData)) {
                    tasksData = { tasks: tasksData };
                }
                
                const tasks = tasksData.tasks || [];
                let stories = [];
                let epics = [];
                let hierarchy = {};
                
                // Try BMAD integration for complete hierarchy
                try {
                    const bmadPath = path.join(project.projectRoot, '.bmad-core');
                    const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                    
                    if (bmadExists) {
                        const bmadApi = await import('./src/utils/bmad-api.js');
                        
                        // Get stories and epics with full data
                        [stories, epics] = await Promise.all([
                            bmadApi.getStories(projectId),
                            bmadApi.getEpics(projectId)
                        ]);
                        
                        // Enrich tasks with story context
                        const enrichedTasks = await bmadApi.getTasksWithStoryContext(tasks, projectId);
                        
                        // Build complete hierarchy
                        epics.forEach(epic => {
                            hierarchy[epic.id] = {
                                epic: {
                                    id: epic.id,
                                    title: epic.title,
                                    description: epic.description,
                                    status: epic.status,
                                    priority: epic.priority || 'medium',
                                    createdAt: epic.createdAt,
                                    updatedAt: epic.updatedAt
                                },
                                stories: {},
                                metrics: {
                                    storyCount: 0,
                                    taskCount: 0,
                                    completedTasks: 0,
                                    completionRate: 0
                                }
                            };
                        });
                        
                        // Add stories to hierarchy
                        stories.forEach(story => {
                            const epicId = story.epic || story.epicId;
                            if (epicId && hierarchy[epicId]) {
                                hierarchy[epicId].stories[story.id] = {
                                    story: {
                                        id: story.id,
                                        title: story.title,
                                        description: story.description || story.userStory,
                                        status: story.status,
                                        epic: epicId,
                                        verified: Boolean(story.verified),
                                        verificationStatus: story.verificationStatus || 'pending',
                                        acceptanceCriteria: story.acceptanceCriteria || [],
                                        createdAt: story.createdAt,
                                        updatedAt: story.updatedAt
                                    },
                                    tasks: [],
                                    metrics: {
                                        taskCount: 0,
                                        completedTasks: 0,
                                        completionRate: 0
                                    }
                                };
                                hierarchy[epicId].metrics.storyCount++;
                            }
                        });
                        
                        // Add tasks to hierarchy
                        enrichedTasks.forEach(task => {
                            const storyId = task.storyId;
                            if (storyId) {
                                // Find the epic containing this story
                                for (const epicId in hierarchy) {
                                    if (hierarchy[epicId].stories[storyId]) {
                                        const taskData = {
                                            id: task.id,
                                            name: task.name,
                                            description: task.description,
                                            status: task.status,
                                            agent: task.agent || null,
                                            priority: task.priority || 'medium',
                                            storyId: storyId,
                                            epicId: epicId,
                                            createdAt: task.createdAt,
                                            updatedAt: task.updatedAt,
                                            storyContext: task.storyContext
                                        };
                                        
                                        hierarchy[epicId].stories[storyId].tasks.push(taskData);
                                        hierarchy[epicId].stories[storyId].metrics.taskCount++;
                                        hierarchy[epicId].metrics.taskCount++;
                                        
                                        if (task.status === 'completed') {
                                            hierarchy[epicId].stories[storyId].metrics.completedTasks++;
                                            hierarchy[epicId].metrics.completedTasks++;
                                        }
                                        break;
                                    }
                                }
                            }
                        });
                        
                        // Calculate completion rates
                        for (const epicId in hierarchy) {
                            const epicData = hierarchy[epicId];
                            
                            // Epic completion rate
                            if (epicData.metrics.taskCount > 0) {
                                epicData.metrics.completionRate = Math.round(
                                    (epicData.metrics.completedTasks / epicData.metrics.taskCount) * 100
                                );
                            }
                            
                            // Story completion rates
                            for (const storyId in epicData.stories) {
                                const storyData = epicData.stories[storyId];
                                if (storyData.metrics.taskCount > 0) {
                                    storyData.metrics.completionRate = Math.round(
                                        (storyData.metrics.completedTasks / storyData.metrics.taskCount) * 100
                                    );
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error building story hierarchy:', error);
                    // Continue with basic structure if enhancement fails
                }
                
                // Calculate overall metrics
                const metrics = {
                    totalEpics: epics.length,
                    totalStories: stories.length,
                    totalTasks: tasks.length,
                    tasksWithStories: tasks.filter(t => t.storyId || 
                        stories.some(s => s.id === t.storyId)).length,
                    storiesWithTasks: stories.filter(s => 
                        tasks.some(t => t.storyId === s.id)).length,
                    epicsWithStories: epics.filter(e => 
                        stories.some(s => s.epic === e.id || s.epicId === e.id)).length
                };
                
                const storyHierarchy = {
                    epics,
                    stories,
                    tasks,
                    hierarchy,
                    metrics,
                    timestamp: new Date().toISOString()
                };
                
                // Cache the response
                setCacheEntry(cacheKey, storyHierarchy);
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'private, max-age=300'
                });
                res.end(JSON.stringify(storyHierarchy));
                
            } catch (err) {
                console.error(`Error building story hierarchy for ${project.path}:`, err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Failed to build story hierarchy',
                    details: err.message 
                }));
            }
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/story-validation') && req.method === 'GET') {
            // Enhanced endpoint: Validate task-story linkages and return detailed report
            const projectId = url.pathname.split('/')[3]; // Extract projectId from /api/tasks/{projectId}/story-validation
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }
            
            try {
                // Check cache first
                const cacheKey = `story-validation-${projectId}`;
                const cachedValidation = getCacheEntry(cacheKey);
                
                if (cachedValidation) {
                    console.log(`Serving cached story validation for project: ${projectId}`);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=180' // 3 minutes cache for validation data
                    });
                    res.end(JSON.stringify(cachedValidation));
                    return;
                }
                
                // Check if tasks file exists
                try {
                    await fs.access(project.path);
                } catch (accessErr) {
                    const emptyValidation = {
                        summary: {
                            totalTasks: 0,
                            tasksWithStories: 0,
                            tasksWithoutStories: 0,
                            totalStories: 0,
                            storiesWithTasks: 0,
                            storiesWithoutTasks: 0,
                            validLinks: 0,
                            brokenLinks: 0,
                            healthScore: 0
                        },
                        taskAnalysis: {
                            linked: [],
                            unlinked: [],
                            brokenLinks: []
                        },
                        storyAnalysis: {
                            withTasks: [],
                            orphaned: [],
                            missingFromProject: []
                        },
                        recommendations: [],
                        timestamp: new Date().toISOString()
                    };
                    
                    setCacheEntry(cacheKey, emptyValidation);
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=180'
                    });
                    res.end(JSON.stringify(emptyValidation));
                    return;
                }
                
                // Read and parse tasks
                const data = await fs.readFile(project.path, 'utf8');
                let tasksData = JSON.parse(data);
                
                if (Array.isArray(tasksData)) {
                    tasksData = { tasks: tasksData };
                }
                
                const tasks = tasksData.tasks || [];
                let stories = [];
                let validationResult = {
                    summary: {
                        totalTasks: tasks.length,
                        tasksWithStories: 0,
                        tasksWithoutStories: tasks.length,
                        totalStories: 0,
                        storiesWithTasks: 0,
                        storiesWithoutTasks: 0,
                        validLinks: 0,
                        brokenLinks: 0,
                        healthScore: 0
                    },
                    taskAnalysis: {
                        linked: [],
                        unlinked: [],
                        brokenLinks: []
                    },
                    storyAnalysis: {
                        withTasks: [],
                        orphaned: [],
                        missingFromProject: []
                    },
                    recommendations: []
                };
                
                // Try BMAD integration for comprehensive validation
                try {
                    const bmadPath = path.join(project.projectRoot, '.bmad-core');
                    const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                    
                    if (bmadExists) {
                        const bmadApi = await import('./src/utils/bmad-api.js');
                        
                        // Get stories and perform validation using the utility functions
                        stories = await bmadApi.getStories(projectId);
                        const validation = await bmadApi.validateProjectStoryTaskLinking(tasks, projectId);
                        
                        if (validation) {
                            // Use validation results to build comprehensive report
                            validationResult.summary.totalStories = stories.length;
                            validationResult.summary.tasksWithStories = validation.tasksWithStories;
                            validationResult.summary.tasksWithoutStories = validation.tasksWithoutStories;
                            
                            const storiesWithTasks = validation.linkedStories.length;
                            const orphanedStories = validation.orphanedStories.length;
                            
                            validationResult.summary.storiesWithTasks = storiesWithTasks;
                            validationResult.summary.storiesWithoutTasks = orphanedStories;
                            validationResult.summary.validLinks = validation.tasksWithStories;
                            validationResult.summary.brokenLinks = validation.missingStories.length;
                            
                            // Calculate health score (0-100)
                            const totalConnections = tasks.length + stories.length;
                            const validConnections = validation.tasksWithStories + storiesWithTasks;
                            validationResult.summary.healthScore = totalConnections > 0 ? 
                                Math.round((validConnections / totalConnections) * 100) : 100;
                            
                            // Detailed task analysis
                            tasks.forEach(task => {
                                const storyId = task.storyId;
                                const taskInfo = {
                                    id: task.id,
                                    name: task.name,
                                    status: task.status,
                                    storyId: storyId
                                };
                                
                                if (storyId) {
                                    if (validation.missingStories.includes(storyId)) {
                                        validationResult.taskAnalysis.brokenLinks.push({
                                            ...taskInfo,
                                            issue: 'Story not found in project',
                                            storyId: storyId
                                        });
                                    } else {
                                        validationResult.taskAnalysis.linked.push(taskInfo);
                                    }
                                } else {
                                    validationResult.taskAnalysis.unlinked.push(taskInfo);
                                }
                            });
                            
                            // Detailed story analysis
                            stories.forEach(story => {
                                const storyInfo = {
                                    id: story.id,
                                    title: story.title,
                                    status: story.status,
                                    epic: story.epic || story.epicId
                                };
                                
                                if (validation.linkedStories.includes(story.id)) {
                                    validationResult.storyAnalysis.withTasks.push(storyInfo);
                                } else {
                                    validationResult.storyAnalysis.orphaned.push(storyInfo);
                                }
                            });
                            
                            // Add missing stories that tasks reference
                            validation.missingStories.forEach(storyId => {
                                validationResult.storyAnalysis.missingFromProject.push({
                                    id: storyId,
                                    title: `Story ${storyId}`,
                                    status: 'unknown',
                                    issue: 'Referenced by tasks but not found in project stories'
                                });
                            });
                            
                            // Generate recommendations
                            if (validation.tasksWithoutStories > 0) {
                                validationResult.recommendations.push({
                                    type: 'unlinked-tasks',
                                    priority: 'medium',
                                    message: `${validation.tasksWithoutStories} tasks are not linked to stories. Consider creating stories or linking them to existing ones.`,
                                    count: validation.tasksWithoutStories
                                });
                            }
                            
                            if (validation.orphanedStories.length > 0) {
                                validationResult.recommendations.push({
                                    type: 'orphaned-stories',
                                    priority: 'low',
                                    message: `${validation.orphanedStories.length} stories have no associated tasks. Consider creating implementation tasks.`,
                                    count: validation.orphanedStories.length
                                });
                            }
                            
                            if (validation.missingStories.length > 0) {
                                validationResult.recommendations.push({
                                    type: 'broken-links',
                                    priority: 'high',
                                    message: `${validation.missingStories.length} tasks reference non-existent stories. Please create these stories or fix the references.`,
                                    count: validation.missingStories.length,
                                    storyIds: validation.missingStories
                                });
                            }
                            
                            if (validationResult.summary.healthScore >= 90) {
                                validationResult.recommendations.push({
                                    type: 'health-excellent',
                                    priority: 'info',
                                    message: 'Excellent task-story linkage health! Your project has strong traceability.'
                                });
                            } else if (validationResult.summary.healthScore >= 70) {
                                validationResult.recommendations.push({
                                    type: 'health-good',
                                    priority: 'info',
                                    message: 'Good task-story linkage health. Consider addressing the recommendations to improve further.'
                                });
                            } else {
                                validationResult.recommendations.push({
                                    type: 'health-poor',
                                    priority: 'high',
                                    message: 'Poor task-story linkage health. Immediate attention needed to improve project traceability.'
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error performing story validation:', error);
                    validationResult.recommendations.push({
                        type: 'validation-error',
                        priority: 'high',
                        message: 'Error occurred during validation. Some results may be incomplete.',
                        details: error.message
                    });
                }
                
                validationResult.timestamp = new Date().toISOString();
                
                // Cache the response (shorter TTL for validation data)
                setCacheEntry(cacheKey, validationResult);
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'private, max-age=180'
                });
                res.end(JSON.stringify(validationResult));
                
            } catch (err) {
                console.error(`Error validating story links for ${project.path}:`, err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Failed to validate story links',
                    details: err.message 
                }));
            }
            
        } else if (url.pathname === '/api/tasks/cache-clear' && req.method === 'POST') {
            // Enhanced cache management endpoint with selective clearing
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    let requestData = {};
                    if (body) {
                        try {
                            requestData = JSON.parse(body);
                        } catch (parseErr) {
                            console.warn('Invalid JSON in cache-clear request, using default behavior');
                        }
                    }
                    
                    const { projectId, cacheType, all = false } = requestData;
                    let clearedCount = 0;
                    let clearedTypes = [];
                    
                    if (all || (!projectId && !cacheType)) {
                        // Clear all cache
                        clearedCount = taskStoryCache.size;
                        clearCache();
                        clearedTypes.push('all');
                        console.log('All task-story integration cache cleared');
                    } else {
                        // Selective cache clearing
                        const cacheKeys = Array.from(taskStoryCache.keys());
                        
                        cacheKeys.forEach(key => {
                            let shouldClear = false;
                            
                            if (projectId && key.includes(projectId)) {
                                shouldClear = true;
                            }
                            
                            if (cacheType && key.startsWith(cacheType)) {
                                shouldClear = true;
                            }
                            
                            if (projectId && cacheType && key.startsWith(`${cacheType}-${projectId}`)) {
                                shouldClear = true;
                            }
                            
                            if (shouldClear) {
                                taskStoryCache.delete(key);
                                clearedCount++;
                                
                                // Track what types were cleared
                                const type = key.split('-')[0];
                                if (!clearedTypes.includes(type)) {
                                    clearedTypes.push(type);
                                }
                            }
                        });
                        
                        console.log(`Selective cache clear: ${clearedCount} entries cleared for projectId=${projectId}, cacheType=${cacheType}`);
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true,
                        message: `Cache cleared successfully: ${clearedCount} entries`,
                        cleared: {
                            count: clearedCount,
                            types: clearedTypes,
                            projectId: projectId || 'all',
                            cacheType: cacheType || 'all'
                        },
                        timestamp: new Date().toISOString()
                    }));
                } catch (err) {
                    console.error('Error clearing cache:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Failed to clear cache',
                        details: err.message 
                    }));
                }
            });
            
        } else if (url.pathname === '/api/tasks/cache-status' && req.method === 'GET') {
            // Cache status and metrics endpoint
            try {
                const cacheEntries = Array.from(taskStoryCache.entries());
                const now = Date.now();
                
                let stats = {
                    totalEntries: cacheEntries.length,
                    cacheSize: taskStoryCache.size,
                    ttl: CACHE_TTL,
                    byType: {},
                    byProject: {},
                    expired: 0,
                    fresh: 0,
                    oldestEntry: null,
                    newestEntry: null
                };
                
                cacheEntries.forEach(([key, entry]) => {
                    const age = now - entry.timestamp;
                    const isExpired = age > CACHE_TTL;
                    
                    if (isExpired) {
                        stats.expired++;
                    } else {
                        stats.fresh++;
                    }
                    
                    // Track oldest and newest
                    if (!stats.oldestEntry || entry.timestamp < stats.oldestEntry.timestamp) {
                        stats.oldestEntry = {
                            key,
                            timestamp: entry.timestamp,
                            age: age,
                            expired: isExpired
                        };
                    }
                    
                    if (!stats.newestEntry || entry.timestamp > stats.newestEntry.timestamp) {
                        stats.newestEntry = {
                            key,
                            timestamp: entry.timestamp,
                            age: age,
                            expired: isExpired
                        };
                    }
                    
                    // Parse cache type and project ID from key
                    const keyParts = key.split('-');
                    const cacheType = keyParts[0];
                    const projectId = keyParts[1];
                    
                    // Count by type
                    if (!stats.byType[cacheType]) {
                        stats.byType[cacheType] = { count: 0, fresh: 0, expired: 0 };
                    }
                    stats.byType[cacheType].count++;
                    if (isExpired) {
                        stats.byType[cacheType].expired++;
                    } else {
                        stats.byType[cacheType].fresh++;
                    }
                    
                    // Count by project
                    if (projectId) {
                        if (!stats.byProject[projectId]) {
                            stats.byProject[projectId] = { count: 0, fresh: 0, expired: 0 };
                        }
                        stats.byProject[projectId].count++;
                        if (isExpired) {
                            stats.byProject[projectId].expired++;
                        } else {
                            stats.byProject[projectId].fresh++;
                        }
                    }
                });
                
                // Calculate hit rates and efficiency metrics
                stats.efficiency = {
                    freshPercentage: stats.totalEntries > 0 ? Math.round((stats.fresh / stats.totalEntries) * 100) : 100,
                    expiredPercentage: stats.totalEntries > 0 ? Math.round((stats.expired / stats.totalEntries) * 100) : 0,
                    memoryUsageEstimate: `~${Math.round(stats.totalEntries * 0.001)}KB` // Rough estimate
                };
                
                stats.timestamp = new Date().toISOString();
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(JSON.stringify(stats));
                
            } catch (err) {
                console.error('Error getting cache status:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Failed to get cache status',
                    details: err.message 
                }));
            }
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.includes('/link-story') && req.method === 'POST') {
            // Link a task to a story
            const pathParts = url.pathname.split('/');
            const projectId = pathParts[3]; // Extract projectId from /api/tasks/{projectId}/link-story
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }
            
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const { taskId, storyId } = JSON.parse(body);
                    
                    if (!taskId || !storyId) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            error: 'Missing required parameters: taskId and storyId' 
                        }));
                        return;
                    }
                    
                    // Read current tasks
                    const data = await fs.readFile(project.path, 'utf8');
                    let tasksData = JSON.parse(data);
                    
                    if (Array.isArray(tasksData)) {
                        tasksData = { tasks: tasksData };
                    }
                    
                    // Find the task to update
                    const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
                    if (taskIndex === -1) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Task not found' }));
                        return;
                    }
                    
                    // Validate story exists (if BMAD is available)
                    let storyExists = true;
                    try {
                        const bmadPath = path.join(project.projectRoot, '.bmad-core');
                        const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                        
                        if (bmadExists) {
                            const bmadApi = await import('./src/utils/bmad-api.js');
                            const stories = await bmadApi.getStories(projectId);
                            storyExists = stories.some(s => s.id === storyId);
                        }
                    } catch (error) {
                        console.warn('Could not validate story existence:', error);
                        // Continue without validation if BMAD is unavailable
                    }
                    
                    if (!storyExists) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            error: 'Story not found in project',
                            storyId: storyId 
                        }));
                        return;
                    }
                    
                    // Update the task with story link
                    const previousStoryId = tasksData.tasks[taskIndex].storyId;
                    tasksData.tasks[taskIndex].storyId = storyId;
                    tasksData.tasks[taskIndex].updatedAt = getLocalISOString();
                    
                    // Save updated tasks
                    await fs.writeFile(project.path, JSON.stringify(tasksData, null, 2));
                    
                    // Clear relevant cache entries
                    const cacheKeys = Array.from(taskStoryCache.keys());
                    cacheKeys.forEach(key => {
                        if (key.includes(projectId)) {
                            taskStoryCache.delete(key);
                        }
                    });
                    
                    console.log(`Task ${taskId} linked to story ${storyId} (previously: ${previousStoryId || 'none'})`);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true,
                        message: 'Task linked to story successfully',
                        taskId: taskId,
                        storyId: storyId,
                        previousStoryId: previousStoryId || null,
                        timestamp: new Date().toISOString()
                    }));
                    
                } catch (err) {
                    console.error(`Error linking task to story for project ${projectId}:`, err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Failed to link task to story',
                        details: err.message 
                    }));
                }
            });
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.includes('/unlink-story') && req.method === 'POST') {
            // Unlink a task from its story
            const pathParts = url.pathname.split('/');
            const projectId = pathParts[3]; // Extract projectId from /api/tasks/{projectId}/unlink-story
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }
            
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const { taskId } = JSON.parse(body);
                    
                    if (!taskId) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            error: 'Missing required parameter: taskId' 
                        }));
                        return;
                    }
                    
                    // Read current tasks
                    const data = await fs.readFile(project.path, 'utf8');
                    let tasksData = JSON.parse(data);
                    
                    if (Array.isArray(tasksData)) {
                        tasksData = { tasks: tasksData };
                    }
                    
                    // Find the task to update
                    const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
                    if (taskIndex === -1) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Task not found' }));
                        return;
                    }
                    
                    // Remove story link
                    const previousStoryId = tasksData.tasks[taskIndex].storyId;
                    delete tasksData.tasks[taskIndex].storyId;
                    tasksData.tasks[taskIndex].updatedAt = getLocalISOString();
                    
                    // Save updated tasks
                    await fs.writeFile(project.path, JSON.stringify(tasksData, null, 2));
                    
                    // Clear relevant cache entries
                    const cacheKeys = Array.from(taskStoryCache.keys());
                    cacheKeys.forEach(key => {
                        if (key.includes(projectId)) {
                            taskStoryCache.delete(key);
                        }
                    });
                    
                    console.log(`Task ${taskId} unlinked from story ${previousStoryId || 'none'}`);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true,
                        message: 'Task unlinked from story successfully',
                        taskId: taskId,
                        previousStoryId: previousStoryId || null,
                        timestamp: new Date().toISOString()
                    }));
                    
                } catch (err) {
                    console.error(`Error unlinking task from story for project ${projectId}:`, err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Failed to unlink task from story',
                        details: err.message 
                    }));
                }
            });
            
        } else if (url.pathname.startsWith('/api/tasks/') && url.pathname.includes('/bulk-link-stories') && req.method === 'POST') {
            // Bulk link multiple tasks to stories
            const pathParts = url.pathname.split('/');
            const projectId = pathParts[3]; // Extract projectId from /api/tasks/{projectId}/bulk-link-stories
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Project not found' }));
                return;
            }
            
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const { links } = JSON.parse(body); // Array of {taskId, storyId} objects
                    
                    if (!Array.isArray(links) || links.length === 0) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            error: 'Missing or invalid parameter: links (should be array of {taskId, storyId})' 
                        }));
                        return;
                    }
                    
                    // Read current tasks
                    const data = await fs.readFile(project.path, 'utf8');
                    let tasksData = JSON.parse(data);
                    
                    if (Array.isArray(tasksData)) {
                        tasksData = { tasks: tasksData };
                    }
                    
                    let successful = 0;
                    let failed = 0;
                    let results = [];
                    
                    // Get available stories for validation
                    let availableStories = [];
                    try {
                        const bmadPath = path.join(project.projectRoot, '.bmad-core');
                        const bmadExists = await fs.access(bmadPath).then(() => true).catch(() => false);
                        
                        if (bmadExists) {
                            const bmadApi = await import('./src/utils/bmad-api.js');
                            availableStories = await bmadApi.getStories(projectId);
                        }
                    } catch (error) {
                        console.warn('Could not load stories for bulk validation:', error);
                    }
                    
                    // Process each link
                    for (const link of links) {
                        const { taskId, storyId } = link;
                        
                        try {
                            // Find the task
                            const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
                            if (taskIndex === -1) {
                                results.push({
                                    taskId,
                                    storyId,
                                    success: false,
                                    error: 'Task not found'
                                });
                                failed++;
                                continue;
                            }
                            
                            // Validate story exists (if stories are available)
                            if (availableStories.length > 0 && !availableStories.some(s => s.id === storyId)) {
                                results.push({
                                    taskId,
                                    storyId,
                                    success: false,
                                    error: 'Story not found in project'
                                });
                                failed++;
                                continue;
                            }
                            
                            // Update the task
                            const previousStoryId = tasksData.tasks[taskIndex].storyId;
                            tasksData.tasks[taskIndex].storyId = storyId;
                            tasksData.tasks[taskIndex].updatedAt = getLocalISOString();
                            
                            results.push({
                                taskId,
                                storyId,
                                success: true,
                                previousStoryId: previousStoryId || null
                            });
                            successful++;
                            
                        } catch (error) {
                            results.push({
                                taskId,
                                storyId,
                                success: false,
                                error: error.message
                            });
                            failed++;
                        }
                    }
                    
                    // Save updated tasks
                    await fs.writeFile(project.path, JSON.stringify(tasksData, null, 2));
                    
                    // Clear relevant cache entries
                    const cacheKeys = Array.from(taskStoryCache.keys());
                    cacheKeys.forEach(key => {
                        if (key.includes(projectId)) {
                            taskStoryCache.delete(key);
                        }
                    });
                    
                    console.log(`Bulk link operation completed: ${successful} successful, ${failed} failed`);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true,
                        message: `Bulk link completed: ${successful} successful, ${failed} failed`,
                        summary: {
                            total: links.length,
                            successful,
                            failed
                        },
                        results,
                        timestamp: new Date().toISOString()
                    }));
                    
                } catch (err) {
                    console.error(`Error in bulk link operation for project ${projectId}:`, err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Failed to perform bulk link operation',
                        details: err.message 
                    }));
                }
            });
            
        } else {
            // Serve static files (React app)
            const filePath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
            await serveStaticFile(req, res, filePath);
        }
    });

    const listenPort = testPort !== null ? testPort : PORT;
    
    // Return a promise that resolves when the server is ready
    return new Promise((resolve, reject) => {
        server.listen(listenPort, '127.0.0.1', () => {
            console.log(`\n🦐 Shrimp Task Manager Viewer Server v${VERSION}`);
            console.log('===============================================');
            console.log(`Server is running at: http://localhost:${listenPort}`);
            console.log(`Also accessible at: http://127.0.0.1:${listenPort}`);
        console.log(`\nSettings file: ${SETTINGS_FILE}`);
        console.log('    ');
        console.log('Available projects:');
        if (projects.length === 0) {
            console.log('  - No projects configured. Add projects via the web interface.');
        } else {
            projects.forEach(project => {
                const name = project.name || project.profileName || 'Unnamed Project';
                const path = project.path || project.taskPath || project.filePath || 'No path';
                console.log(`  - ${name} (${path})`);
            });
        }
        console.log('\n🎯 Features:');
        console.log('  • React-based UI with TanStack Table');
        console.log('  • Real-time search and filtering');
        console.log('  • Sortable columns with pagination');
        console.log('  • Auto-refresh functionality');
        console.log('  • Profile management via web interface');
        console.log('\nOpen your browser to view tasks!');
        
        resolve(server);
    });
    
    server.on('error', reject);
    });
}

// Start the server only if not being imported for testing
if (process.env.NODE_ENV !== 'test') {
    startServer().catch(err => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
}

export { startServer };