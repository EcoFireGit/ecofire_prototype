import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Job from '@/lib/models/job.model';
import { validateAuth } from '@/lib/utils/auth-utils';

// GET /api/jobs/completed?userId=<optional>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&sort=asc|desc&limit=100
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

    const userId = queryUserId || currentUserId;

    await dbConnect();

    const filter: any = {
      userId,
      isDone: true,
      $or: [{ isDeleted: { $eq: false } }, { isDeleted: { $exists: false } }],
    };

    if (startDateStr || endDateStr) {
      // Jobs may use a completed date field; try to use updatedAt or dueDate fallback. Use updatedAt if available.
      filter.updatedAt = {};
      if (startDateStr) {
        const start = new Date(startDateStr);
        if (!isNaN(start.getTime())) filter.updatedAt.$gte = start;
      }
      if (endDateStr) {
        const end = new Date(endDateStr);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          filter.updatedAt.$lte = end;
        }
      }
    }

    const sortOrder = sortParam === 'asc' ? 1 : -1;

    const jobs = await Job.find(filter)
      .sort({ updatedAt: sortOrder })
      .limit(Math.min(limitParam, 5000))
      .lean();

    return NextResponse.json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    console.error('Error in GET /api/jobs/completed:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
