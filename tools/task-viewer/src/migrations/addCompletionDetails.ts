import * as fs from 'fs/promises';
import * as path from 'path';
import { parseFlexibleSummary } from '../utils/completionSummaryParser.js';
import { Task, TaskCompletionDetails } from '../utils/completionTemplates.js';

/**
 * Migration configuration interface
 */
interface MigrationConfig {
  tasksFilePath: string;
  dryRun?: boolean;
  verbose?: boolean;
  createBackup?: boolean;
}

/**
 * Migration statistics tracking
 */
interface MigrationStats {
  totalTasks: number;
  completedTasks: number;
  tasksWithSummary: number;
  tasksMigrated: number;
  tasksSkipped: number;
  tasksWithErrors: number;
  errors: Array<{ taskId: string; error: string }>;
  startTime: Date;
  endTime?: Date;
  backupPath?: string;
}

/**
 * Task data structure as stored in JSON
 */
interface TaskData {
  tasks: Task[];
  [key: string]: any; // Allow other fields in the JSON
}

/**
 * Creates a timestamped backup of the tasks file
 */
async function createBackup(filePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath, '.json');
  const backupPath = path.join(dir, `${basename}.backup.${timestamp}.json`);
  
  const data = await fs.readFile(filePath, 'utf8');
  await fs.writeFile(backupPath, data, 'utf8');
  
  return backupPath;
}

/**
 * Reads tasks from the JSON file
 */
async function readTasks(filePath: string): Promise<TaskData> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Handle both array format and object with tasks property
    if (Array.isArray(parsed)) {
      return { tasks: parsed };
    }
    
    return parsed;
  } catch (error) {
    throw new Error(`Failed to read tasks file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Writes tasks back to the JSON file
 */
async function writeTasks(filePath: string, data: TaskData): Promise<void> {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write tasks file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks if a task already has completionDetails
 */
function hasCompletionDetails(task: Task): boolean {
  return task.completionDetails !== undefined && task.completionDetails !== null;
}

/**
 * Migrates a single task by parsing its summary
 */
function migrateTask(task: Task, stats: MigrationStats, verbose: boolean): Task {
  // Skip if already has completionDetails (idempotency)
  if (hasCompletionDetails(task)) {
    if (verbose) {
      console.log(`  ⏭️  Task ${task.id} already has completionDetails, skipping`);
    }
    stats.tasksSkipped++;
    return task;
  }
  
  // Skip if no summary to parse
  if (!task.summary || typeof task.summary !== 'string' || task.summary.trim() === '') {
    if (verbose) {
      console.log(`  ⏭️  Task ${task.id} has no summary, skipping`);
    }
    stats.tasksSkipped++;
    return task;
  }
  
  try {
    // Parse the summary to extract structured data
    const completionDetails = parseFlexibleSummary(task.summary);
    
    // Only add completionDetails if we extracted meaningful data
    const hasContent = 
      completionDetails.keyAccomplishments.length > 0 ||
      completionDetails.implementationDetails.length > 0 ||
      completionDetails.technicalChallenges.length > 0;
    
    if (hasContent) {
      // Update completedAt if task has one
      if (task.completedAt) {
        completionDetails.completedAt = new Date(task.completedAt);
      }
      
      // Add the completionDetails to the task
      const migratedTask = {
        ...task,
        completionDetails
      };
      
      if (verbose) {
        console.log(`  ✅ Task ${task.id} migrated successfully`);
        console.log(`     - Accomplishments: ${completionDetails.keyAccomplishments.length}`);
        console.log(`     - Implementation: ${completionDetails.implementationDetails.length}`);
        console.log(`     - Challenges: ${completionDetails.technicalChallenges.length}`);
      }
      
      stats.tasksMigrated++;
      return migratedTask;
    } else {
      if (verbose) {
        console.log(`  ⏭️  Task ${task.id} - no structured data extracted from summary`);
      }
      stats.tasksSkipped++;
      return task;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stats.errors.push({ taskId: task.id, error: errorMessage });
    stats.tasksWithErrors++;
    
    if (verbose) {
      console.error(`  ❌ Error migrating task ${task.id}: ${errorMessage}`);
    }
    
    // Return original task unchanged on error
    return task;
  }
}

/**
 * Main migration function
 */
export async function migrateCompletionDetails(config: MigrationConfig): Promise<MigrationStats> {
  const { tasksFilePath, dryRun = false, verbose = true, createBackup: shouldBackup = true } = config;
  
  // Initialize statistics
  const stats: MigrationStats = {
    totalTasks: 0,
    completedTasks: 0,
    tasksWithSummary: 0,
    tasksMigrated: 0,
    tasksSkipped: 0,
    tasksWithErrors: 0,
    errors: [],
    startTime: new Date()
  };
  
  console.log('🚀 Starting migration to add completionDetails to tasks');
  console.log(`📁 Tasks file: ${tasksFilePath}`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE'}`);
  console.log('');
  
  try {
    // Create backup if not in dry-run mode
    if (!dryRun && shouldBackup) {
      console.log('📦 Creating backup...');
      stats.backupPath = await createBackup(tasksFilePath);
      console.log(`✅ Backup created: ${stats.backupPath}`);
      console.log('');
    }
    
    // Read tasks
    console.log('📖 Reading tasks...');
    const tasksData = await readTasks(tasksFilePath);
    const tasks = tasksData.tasks || [];
    
    stats.totalTasks = tasks.length;
    stats.completedTasks = tasks.filter(t => t.status === 'completed').length;
    stats.tasksWithSummary = tasks.filter(t => t.status === 'completed' && t.summary).length;
    
    console.log(`📊 Found ${stats.totalTasks} total tasks`);
    console.log(`   - ${stats.completedTasks} completed tasks`);
    console.log(`   - ${stats.tasksWithSummary} with summaries`);
    console.log('');
    
    // Process each task
    console.log('🔄 Processing tasks...');
    const migratedTasks = tasks.map(task => {
      // Only process completed tasks
      if (task.status !== 'completed') {
        return task;
      }
      
      return migrateTask(task, stats, verbose);
    });
    
    // Update the tasks data
    tasksData.tasks = migratedTasks;
    
    // Write back if not in dry-run mode
    if (!dryRun) {
      console.log('');
      console.log('💾 Saving migrated tasks...');
      await writeTasks(tasksFilePath, tasksData);
      console.log('✅ Tasks saved successfully');
    } else {
      console.log('');
      console.log('ℹ️  DRY RUN - No changes were saved');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    stats.endTime = new Date();
    const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;
    
    // Print summary statistics
    console.log('');
    console.log('📈 Migration Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Total tasks:           ${stats.totalTasks}`);
    console.log(`Completed tasks:       ${stats.completedTasks}`);
    console.log(`Tasks with summary:    ${stats.tasksWithSummary}`);
    console.log(`Tasks migrated:        ${stats.tasksMigrated}`);
    console.log(`Tasks skipped:         ${stats.tasksSkipped}`);
    console.log(`Tasks with errors:     ${stats.tasksWithErrors}`);
    console.log(`Duration:              ${duration.toFixed(2)}s`);
    
    if (stats.backupPath) {
      console.log(`Backup location:       ${stats.backupPath}`);
    }
    
    if (stats.errors.length > 0) {
      console.log('');
      console.log('⚠️  Errors encountered:');
      stats.errors.forEach(({ taskId, error }) => {
        console.log(`   - Task ${taskId}: ${error}`);
      });
    }
    
    console.log('═══════════════════════════════════════');
    console.log('✨ Migration complete!');
  }
  
  return stats;
}

/**
 * CLI entry point for running the migration
 */
export async function runMigration(
  tasksFilePath: string,
  options: { dryRun?: boolean; verbose?: boolean; noBackup?: boolean } = {}
): Promise<void> {
  const config: MigrationConfig = {
    tasksFilePath,
    dryRun: options.dryRun ?? false,
    verbose: options.verbose ?? true,
    createBackup: !options.noBackup
  };
  
  try {
    await migrateCompletionDetails(config);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Support running directly from command line
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: ts-node src/migrations/addCompletionDetails.ts [options] <tasks-file-path>

Options:
  --dry-run, -d     Run without making changes (preview mode)
  --verbose, -v     Show detailed output for each task
  --no-backup       Skip creating a backup file
  --help, -h        Show this help message

Examples:
  # Run migration on tasks.json
  ts-node src/migrations/addCompletionDetails.ts tasks.json
  
  # Dry run to preview changes
  ts-node src/migrations/addCompletionDetails.ts --dry-run tasks.json
  
  # Run without creating backup
  ts-node src/migrations/addCompletionDetails.ts --no-backup tasks.json
`);
    process.exit(0);
  }
  
  const tasksFilePath = args.find(arg => !arg.startsWith('-')) || 'tasks.json';
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    verbose: args.includes('--verbose') || args.includes('-v') || true,
    noBackup: args.includes('--no-backup')
  };
  
  runMigration(tasksFilePath, options);
}