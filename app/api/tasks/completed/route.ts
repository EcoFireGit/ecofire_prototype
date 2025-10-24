import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/lib/models/task.model';
import { validateAuth } from '@/lib/utils/auth-utils';

// GET /api/tasks/completed?userId=<optional>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&sort=asc|desc&limit=100
export async function GET(request: Request) {
  try {
    const authResult = await validateAuth();
    if (!authResult.isAuthorized) return authResult.response;

    const currentUserId = authResult.userId;

    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');
    const sortParam = (url.searchParams.get('sort') || 'desc').toLowerCase();
    const limitParam = parseInt(url.searchParams.get('limit') || '1000', 10);

    // By default restrict to current user's data unless an admin/team user is requesting others' data.
    // For now, allow passing userId to view other users' completed items (caller must be authorized by validateAuth).
    const userId = queryUserId || currentUserId;

    await dbConnect();

    const filter: any = {
      userId,
      completed: true,
      $or: [{ isDeleted: { $eq: false } }, { isDeleted: { $exists: false } }],
    };

    if (startDateStr || endDateStr) {
      filter.endDate = {};
      if (startDateStr) {
        const start = new Date(startDateStr);
        if (!isNaN(start.getTime())) filter.endDate.$gte = start;
      }
      if (endDateStr) {
        // include entire day by setting to end of day
        const end = new Date(endDateStr);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          filter.endDate.$lte = end;
        }
      }
    }

    const sortOrder = sortParam === 'asc' ? 1 : -1;

    const tasks = await Task.find(filter)
      .sort({ endDate: sortOrder })
      .limit(Math.min(limitParam, 5000))
      .lean();

    return NextResponse.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    console.error('Error in GET /api/tasks/completed:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
