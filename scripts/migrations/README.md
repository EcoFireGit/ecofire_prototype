# Database Migrations

This directory contains database migration scripts for the Prioriwise application.

## Available Migrations

### update-task-userId-from-jobs.ts

**Purpose**: Updates the `userId` attribute of each task to match the `userId` of its associated job.

**Background**: This migration is needed when task records have incorrect or missing `userId` values, but the correct `userId` can be determined from the associated job record.

**What it does**:
1. Finds all tasks that have a `jobId`
2. Looks up the corresponding job for each task using the `jobId`
3. Updates the task's `userId` to match the job's `userId`
4. Skips tasks that already have the correct `userId`
5. Reports any errors or issues encountered

**Safety Features**:
- **Dry run mode**: Preview changes without modifying the database
- **Transaction support**: Ensures data integrity during the migration
- **Batch processing**: Processes tasks in batches for better performance
- **Error handling**: Continues processing even if individual tasks fail
- **Detailed logging**: Provides comprehensive feedback on the migration process

## Usage

### Prerequisites

1. Ensure you have the correct MongoDB connection string in your `.env.local` file
2. **IMPORTANT**: Backup your database before running any migration
3. Make sure no other processes are writing to the tasks collection during migration

### Running Migrations

#### 1. Preview Changes (Recommended First Step)

```bash
npx tsx scripts/migrations/update-task-userId-from-jobs.ts --dry-run
```

This will show you exactly what changes would be made without actually modifying the database.

#### 2. Run with Verbose Logging

```bash
npx tsx scripts/migrations/update-task-userId-from-jobs.ts --verbose --dry-run
```

Shows detailed information about each task being processed.

#### 3. Execute the Migration

```bash
npx tsx scripts/migrations/update-task-userId-from-jobs.ts
```

⚠️ **Warning**: Only run this after reviewing the dry-run output and backing up your database.

#### 4. Execute with Verbose Output

```bash
npx tsx scripts/migrations/update-task-userId-from-jobs.ts --verbose
```

### Example Output

```
[2024-XX-XX] ℹ️ Starting Task userId migration...
[2024-XX-XX] ℹ️ ✅ Connected to MongoDB
[2024-XX-XX] ℹ️ Found 1523 tasks to process
[2024-XX-XX] ℹ️ Found 284 unique jobIds
[2024-XX-XX] ℹ️ Successfully mapped 284 jobs
[2024-XX-XX] ℹ️ Processing batch 1/16 (100 tasks)
...
[2024-XX-XX] ℹ️ ✅ Migration completed successfully

📊 MIGRATION SUMMARY
==================
Total tasks found: 1523
Tasks processed: 1523
Tasks updated: 1205
Tasks skipped: 318
Errors: 0
```

## Best Practices

1. **Always run with `--dry-run` first** to preview changes
2. **Backup your database** before running any migration
3. **Run during low-traffic periods** to minimize impact
4. **Monitor the logs** for any errors or warnings
5. **Verify results** by spot-checking a few updated records
6. **Keep migration scripts** for future reference and rollback scenarios

## Troubleshooting

### Common Issues

1. **"Job not found" warnings**: Some tasks may reference jobs that no longer exist. These tasks will be skipped and reported in the summary.

2. **Connection timeouts**: For very large datasets, you may need to increase MongoDB connection timeouts.

3. **Permission errors**: Ensure your MongoDB user has read/write permissions on the collections.

### Rollback

If you need to rollback this migration, you would need to:
1. Restore from your database backup, or
2. Create a reverse migration script that restores the original `userId` values

## Development

### Adding New Migrations

1. Create a new TypeScript file in this directory
2. Follow the pattern established in `update-task-userId-from-jobs.ts`
3. Include proper error handling, logging, and dry-run support
4. Test thoroughly with dry-run mode
5. Update this README with documentation

### Testing Migrations

Always test migrations on a copy of production data before running on the live database.

```bash
# Test the migration logic
npm test scripts/migrations/

# Run with dry-run to verify logic
npx tsx scripts/migrations/your-migration.ts --dry-run --verbose
```