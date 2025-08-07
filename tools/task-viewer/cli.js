#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PID_FILE = path.join(process.cwd(), '.shrimp-viewer.pid');
const DEFAULT_PORT = 9998;
const DEFAULT_HOST = '127.0.0.1';

async function getPid() {
    try {
        const pid = await fs.readFile(PID_FILE, 'utf8');
        return parseInt(pid.trim());
    } catch {
        return null;
    }
}

async function setPid(pid) {
    await fs.writeFile(PID_FILE, pid.toString());
}

async function removePid() {
    try {
        await fs.unlink(PID_FILE);
    } catch {}
}

function isProcessRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

async function startServer(options = {}) {
    const existingPid = await getPid();
    
    if (existingPid && isProcessRunning(existingPid)) {
        console.log(`🦐 Shrimp Task Viewer is already running (PID: ${existingPid})`);
        console.log(`   View at: http://${options.host || DEFAULT_HOST}:${options.port || DEFAULT_PORT}`);
        return;
    }

    // Clean up stale PID file
    if (existingPid) {
        await removePid();
    }

    console.log('🦐 Starting Shrimp Task Viewer...');

    const env = { ...process.env };
    if (options.port) env.SHRIMP_VIEWER_PORT = options.port;
    if (options.host) env.SHRIMP_VIEWER_HOST = options.host;
    if (options.dataDir) env.SHRIMP_DATA_DIR = options.dataDir;
    if (options.configFile) env.SHRIMP_CONFIG_FILE = options.configFile;

    const serverPath = path.join(__dirname, 'server.js');
    const child = spawn('node', [serverPath], {
        env,
        detached: true,
        stdio: 'ignore'
    });

    child.unref();
    await setPid(child.pid);

    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (isProcessRunning(child.pid)) {
        console.log(`✅ Shrimp Task Viewer started successfully!`);
        console.log(`   PID: ${child.pid}`);
        console.log(`   URL: http://${options.host || DEFAULT_HOST}:${options.port || DEFAULT_PORT}`);
        console.log(`   Data: ${options.dataDir || process.cwd()}`);
        console.log('\n   Use --stop to stop the server');
    } else {
        console.error('❌ Failed to start server');
        await removePid();
        process.exit(1);
    }
}

async function stopServer() {
    const pid = await getPid();
    
    if (!pid) {
        console.log('🦐 Shrimp Task Viewer is not running');
        return;
    }

    if (!isProcessRunning(pid)) {
        console.log('🦐 Shrimp Task Viewer process not found, cleaning up...');
        await removePid();
        return;
    }

    console.log(`🛑 Stopping Shrimp Task Viewer (PID: ${pid})...`);
    
    try {
        process.kill(pid, 'SIGTERM');
        
        // Wait for process to stop
        let attempts = 0;
        while (isProcessRunning(pid) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (isProcessRunning(pid)) {
            console.log('🔨 Force killing process...');
            process.kill(pid, 'SIGKILL');
        }
        
        await removePid();
        console.log('✅ Shrimp Task Viewer stopped');
    } catch (err) {
        console.error('❌ Error stopping server:', err.message);
        await removePid();
    }
}

async function restartServer(options = {}) {
    console.log('🔄 Restarting Shrimp Task Viewer...');
    await stopServer();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await startServer(options);
}

async function statusServer() {
    const pid = await getPid();
    
    if (!pid) {
        console.log('🦐 Shrimp Task Viewer: Not running');
        return;
    }

    if (isProcessRunning(pid)) {
        console.log(`🦐 Shrimp Task Viewer: Running (PID: ${pid})`);
        console.log(`   URL: http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
    } else {
        console.log('🦐 Shrimp Task Viewer: Not running (stale PID file)');
        await removePid();
    }
}

function showHelp() {
    console.log(`
🦐 Shrimp Task Manager Viewer CLI

Usage: shrimp-viewer [command] [options]

Commands:
  start      Start the task viewer server (default)
  stop       Stop the task viewer server
  restart    Restart the task viewer server
  status     Show server status
  help       Show this help message

Options:
  --port <number>     Server port (default: ${DEFAULT_PORT})
  --host <host>       Server host (default: ${DEFAULT_HOST})
  --data-dir <path>   Base directory for task discovery (default: current directory)
  --config <file>     Configuration file path (optional)

Environment Variables:
  SHRIMP_VIEWER_PORT     Server port
  SHRIMP_VIEWER_HOST     Server host
  SHRIMP_DATA_DIR        Base directory for task discovery
  SHRIMP_CONFIG_FILE     Configuration file path

Examples:
  shrimp-viewer                           # Start with defaults
  shrimp-viewer start --port 8080         # Start on port 8080
  shrimp-viewer --data-dir ~/projects     # Start with custom data directory
  shrimp-viewer stop                      # Stop the server
  shrimp-viewer restart                   # Restart the server
  shrimp-viewer status                    # Check status

Configuration File Format:
  {
    "agents": [
      {
        "id": "team1",
        "name": "Team 1",
        "path": "/path/to/team1/tasks.json"
      }
    ]
  }
`);
}

// Parse command line arguments
function parseArgs(args) {
    const options = {};
    let command = 'start';
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (['start', 'stop', 'restart', 'status', 'help'].includes(arg)) {
            command = arg;
        } else if (arg === '--port' && i + 1 < args.length) {
            options.port = args[++i];
        } else if (arg === '--host' && i + 1 < args.length) {
            options.host = args[++i];
        } else if (arg === '--data-dir' && i + 1 < args.length) {
            options.dataDir = args[++i];
        } else if (arg === '--config' && i + 1 < args.length) {
            options.configFile = args[++i];
        }
    }
    
    return { command, options };
}

// Main function
async function main() {
    const { command, options } = parseArgs(process.argv.slice(2));
    
    try {
        switch (command) {
            case 'start':
                await startServer(options);
                break;
            case 'stop':
                await stopServer();
                break;
            case 'restart':
                await restartServer(options);
                break;
            case 'status':
                await statusServer();
                break;
            case 'help':
                showHelp();
                break;
            default:
                console.error(`Unknown command: ${command}`);
                showHelp();
                process.exit(1);
        }
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

// Handle SIGINT for graceful shutdown when running directly
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await stopServer();
    process.exit(0);
});

// Run if called directly
main();

export {
    startServer,
    stopServer,
    restartServer,
    statusServer,
    showHelp
};