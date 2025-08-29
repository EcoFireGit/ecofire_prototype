#!/usr/bin/env npx tsx

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file from the project root
config({ path: resolve(__dirname, '../../.env.local') });

import mongoose from 'mongoose';
import dbConnect from '../../lib/mongodb';
import Task from '../../lib/models/task.model';
import Job from '../../lib/models/job.model';

interface MigrationStats {
  totalTasks: number;
  tasksProcessed: number;
  tasksUpdated: number;
  tasksSkipped: number;
  errors: Array<{ taskId: string; error: string }>;
}

class TaskUserIdMigration {
  private dryRun: boolean;
  private verbose: boolean;
  private stats: MigrationStats;

  constructor(dryRun = false, verbose = false) {
    this.dryRun = dryRun;
    this.verbose = verbose;
    this.stats = {
      totalTasks: 0,
      tasksProcessed: 0,
      tasksUpdated: 0,
      tasksSkipped: 0,
      errors: []
    };
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  private verboseLog(message: string) {
    if (this.verbose) {
      this.log(message);
    }
  }

  async run(): Promise<void> {
    try {
      this.log('Starting Task userId migration...');
      
      if (this.dryRun) {
        this.log('🔍 DRY RUN MODE - No changes will be made to the database', 'warn');
      }

      // Connect to database
      await dbConnect();
      this.log('✅ Connected to MongoDB');

      // Start transaction for data integrity
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          await this.processTaskUpdates(session);
        });

        this.log('✅ Migration completed successfully');
        this.printSummary();

      } catch (error) {
        this.log(`Transaction failed: ${error}`, 'error');
        throw error;
      } finally {
        await session.endSession();
      }

    } catch (error) {
      this.log(`Migration failed: ${error}`, 'error');
      throw error;
    } finally {
      await mongoose.connection.close();
      this.log('🔌 Database connection closed');
    }
  }

  private async processTaskUpdates(session: mongoose.ClientSession): Promise<void> {
    // Get all tasks that have a jobId
    const allTasks = await Task.find({ jobId: { $exists: true, $ne: null } })
      .select('_id jobId userId')
      .session(session);

    // Filter out tasks with invalid jobIds (like "undefined", empty strings, etc.)
    const tasks = allTasks.filter(task => {
      const jobId = task.jobId;
      return jobId && 
             jobId !== 'undefined' && 
             jobId !== 'null' && 
             typeof jobId === 'string' && 
             jobId.trim().length > 0 &&
             /^[0-9a-fA-F]{24}$/.test(jobId); // Valid MongoDB ObjectId format
    });

    this.stats.totalTasks = tasks.length;
    this.log(`Found ${allTasks.length} total tasks, ${tasks.length} with valid jobIds`);
    
    if (allTasks.length > tasks.length) {
      this.log(`⚠️ Filtered out ${allTasks.length - tasks.length} tasks with invalid jobIds`, 'warn');
    }

    // Create a map of jobId to userId for efficiency
    const jobIds = [...new Set(tasks.map(task => task.jobId))];
    this.verboseLog(`Found ${jobIds.length} unique jobIds`);

    const jobs = await Job.find({ _id: { $in: jobIds } })
      .select('_id userId')
      .session(session);

    const jobUserIdMap = new Map<string, string>();
    jobs.forEach(job => {
      jobUserIdMap.set(job._id.toString(), job.userId);
    });

    this.log(`Successfully mapped ${jobs.length} jobs`);

    // Process tasks in batches for better performance
    const batchSize = 100;
    const totalBatches = Math.ceil(tasks.length / batchSize);

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      this.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} tasks)`);
      
      await this.processBatch(batch, jobUserIdMap, session);
    }
  }

  private async processBatch(
    tasks: any[], 
    jobUserIdMap: Map<string, string>, 
    session: mongoose.ClientSession
  ): Promise<void> {
    
    for (const task of tasks) {
      this.stats.tasksProcessed++;
      
      try {
        const jobUserId = jobUserIdMap.get(task.jobId);
        
        if (!jobUserId) {
          const errorMsg = `Job not found for jobId: ${task.jobId}`;
          this.log(`⚠️ Task ${task._id}: ${errorMsg}`, 'warn');
          this.stats.errors.push({ taskId: task._id.toString(), error: errorMsg });
          this.stats.tasksSkipped++;
          continue;
        }

        // Check if task already has the correct userId
        if (task.userId === jobUserId) {
          this.verboseLog(`Task ${task._id} already has correct userId: ${jobUserId}`);
          this.stats.tasksSkipped++;
          continue;
        }

        this.verboseLog(
          `Task ${task._id}: updating userId from '${task.userId}' to '${jobUserId}'`
        );

        if (!this.dryRun) {
          await Task.updateOne(
            { _id: task._id },
            { $set: { userId: jobUserId } },
            { session }
          );
        }

        this.stats.tasksUpdated++;

      } catch (error) {
        const errorMsg = `Failed to update task: ${error}`;
        this.log(`❌ Task ${task._id}: ${errorMsg}`, 'error');
        this.stats.errors.push({ taskId: task._id.toString(), error: errorMsg });
      }
    }
  }

  private printSummary(): void {
    this.log('\n📊 MIGRATION SUMMARY');
    this.log('==================');
    this.log(`Total tasks found: ${this.stats.totalTasks}`);
    this.log(`Tasks processed: ${this.stats.tasksProcessed}`);
    this.log(`Tasks updated: ${this.stats.tasksUpdated}`);
    this.log(`Tasks skipped: ${this.stats.tasksSkipped}`);
    this.log(`Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      this.log('\n❌ ERRORS:', 'error');
      this.stats.errors.forEach(({ taskId, error }) => {
        this.log(`  Task ${taskId}: ${error}`, 'error');
      });
    }

    if (this.dryRun) {
      this.log('\n🔍 This was a DRY RUN - no changes were made to the database', 'warn');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
Task userId Migration Script
===========================

Updates the 'userId' attribute of each task to match the 'userId' of its associated job.

Usage: npx tsx scripts/migrations/update-task-userId-from-jobs.ts [options]

Options:
  --dry-run, -d    Preview changes without modifying the database
  --verbose, -v    Show detailed logging
  --help, -h       Show this help message

Examples:
  # Preview changes
  npx tsx scripts/migrations/update-task-userId-from-jobs.ts --dry-run

  # Run migration with verbose logging
  npx tsx scripts/migrations/update-task-userId-from-jobs.ts --verbose

  # Run actual migration
  npx tsx scripts/migrations/update-task-userId-from-jobs.ts

⚠️  IMPORTANT: It's recommended to backup your database before running this migration!
`);
    return;
  }

  const migration = new TaskUserIdMigration(dryRun, verbose);
  
  try {
    await migration.run();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { TaskUserIdMigration };