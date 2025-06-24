// app/api/recurring-tasks/process/route.ts
import { NextResponse } from "next/server";
import { RecurringTaskService } from '@/lib/services/recurring-task.service';

export async function GET() {
  try {
    console.log(`[${new Date().toISOString()}] Processing recurring tasks via API...`);
    
    const recurringTaskService = new RecurringTaskService();
    await recurringTaskService.processRecurringTasks();
    
    return NextResponse.json({
      success: true,
      message: "Recurring tasks processed successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error processing recurring tasks:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to process recurring tasks",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Same logic for POST requests (useful for external cron services)
  return GET();
}