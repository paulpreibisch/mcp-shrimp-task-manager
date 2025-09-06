#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFlexibleSummary } from '../../dist/completionSummaryParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration configuration
 */
// Find the file path (last non-flag argument)
const args = process.argv.slice(2);
const filePath = args.find(arg => !arg.startsWith('-')) || 'test-tasks.json';

const config = {
  tasksFilePath: filePath,
  dryRun: process.argv.includes('--dry-run') || process.argv.includes('-d'),
  verbose: true,
  createBackup: !process.argv.includes('--no-backup')
};

/**
 * Creates a timestamped backup
 */
async function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath, '.json');
  const backupPath = path.join(dir, `${basename}.backup.${timestamp}.json`);
  
  const data = await fs.readFile(filePath, 'utf8');
  await fs.writeFile(backupPath, data, 'utf8');
  
  return backupPath;
}

/**
 * Main migration function
 */
async function migrateCompletionDetails() {
  const stats = {
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
  console.log(`📁 Tasks file: ${config.tasksFilePath}`);
  console.log(`🔧 Mode: ${config.dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE'}`);
  console.log('');

  try {
    // Create backup if not in dry-run mode
    if (!config.dryRun && config.createBackup) {
      console.log('📦 Creating backup...');
      stats.backupPath = await createBackup(config.tasksFilePath);
      console.log(`✅ Backup created: ${stats.backupPath}`);
      console.log('');
    }

    // Read tasks
    console.log('📖 Reading tasks...');
    const data = await fs.readFile(config.tasksFilePath, 'utf8');
    const tasksData = JSON.parse(data);
    const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.tasks || []);

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

      // Skip if already has completionDetails
      if (task.completionDetails) {
        if (config.verbose) {
          console.log(`  ⏭️  Task ${task.id} already has completionDetails, skipping`);
        }
        stats.tasksSkipped++;
        return task;
      }

      // Skip if no summary
      if (!task.summary || typeof task.summary !== 'string' || task.summary.trim() === '') {
        if (config.verbose) {
          console.log(`  ⏭️  Task ${task.id} has no summary, skipping`);
        }
        stats.tasksSkipped++;
        return task;
      }

      try {
        // Parse the summary
        const completionDetails = parseFlexibleSummary(task.summary);

        // Only add if we extracted meaningful data
        const hasContent = 
          completionDetails.keyAccomplishments.length > 0 ||
          completionDetails.implementationDetails.length > 0 ||
          completionDetails.technicalChallenges.length > 0;

        if (hasContent) {
          // Update completedAt if task has one
          if (task.completedAt) {
            completionDetails.completedAt = new Date(task.completedAt);
          }

          // Add the completionDetails
          const migratedTask = {
            ...task,
            completionDetails
          };

          if (config.verbose) {
            console.log(`  ✅ Task ${task.id} migrated successfully`);
            console.log(`     - Accomplishments: ${completionDetails.keyAccomplishments.length}`);
            console.log(`     - Implementation: ${completionDetails.implementationDetails.length}`);
            console.log(`     - Challenges: ${completionDetails.technicalChallenges.length}`);
            if (completionDetails.verificationScore > 0) {
              console.log(`     - Score: ${completionDetails.verificationScore}`);
            }
          }

          stats.tasksMigrated++;
          return migratedTask;
        } else {
          if (config.verbose) {
            console.log(`  ⏭️  Task ${task.id} - no structured data extracted`);
          }
          stats.tasksSkipped++;
          return task;
        }
      } catch (error) {
        stats.errors.push({ taskId: task.id, error: error.message });
        stats.tasksWithErrors++;
        if (config.verbose) {
          console.error(`  ❌ Error migrating task ${task.id}: ${error.message}`);
        }
        return task;
      }
    });

    // Update the tasks data
    if (Array.isArray(tasksData)) {
      // If original was array, keep as array
      tasksData.length = 0;
      tasksData.push(...migratedTasks);
    } else {
      // If original was object, update tasks property
      tasksData.tasks = migratedTasks;
    }

    // Write back if not in dry-run mode
    if (!config.dryRun) {
      console.log('');
      console.log('💾 Saving migrated tasks...');
      await fs.writeFile(config.tasksFilePath, JSON.stringify(tasksData, null, 2), 'utf8');
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

    // Print summary
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

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node src/migrations/runMigration.js [options] <tasks-file-path>

Options:
  --dry-run, -d     Run without making changes (preview mode)
  --no-backup       Skip creating a backup file
  --help, -h        Show this help message

Examples:
  # Run migration on test-tasks.json
  node src/migrations/runMigration.js test-tasks.json
  
  # Dry run to preview changes
  node src/migrations/runMigration.js --dry-run test-tasks.json
  
  # Run without creating backup
  node src/migrations/runMigration.js --no-backup test-tasks.json
`);
    process.exit(0);
  }

  migrateCompletionDetails().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}