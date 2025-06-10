/**
 * @jest-environment node
 */

import { validateAuth } from '../../lib/utils/auth-utils';
import { JobService } from '../../lib/services/job.service';
import { GET } from '../../app/api/jobs/route';
import { Jobs } from '../../lib/models/job.model';

// Mock validateAuth from auth-utils
jest.mock('../../lib/utils/auth-utils', () => ({
  validateAuth: jest.fn()
}));

// Only mock class methods on JobService
jest.mock('../../lib/services/job.service');

describe('GET /api/jobs', () => {
  it('returns 200 with job data when authorized and job exists', async () => {
    // Mock validateAuth to simulate an authorized user
    (validateAuth as jest.Mock).mockResolvedValue({
      isAuthorized: true,
      userId: 'user123',      
    });

    // Prepare mock job data
    const mockJobs: Partial<Jobs>[] = [
      { _id: '1', title: 'Engineer' },
      { _id: '2', title: 'Manager' }
    ];

    // Mock getAllJobs on JobService prototype
    (JobService.prototype.getAllJobs as jest.Mock).mockResolvedValue(mockJobs as Jobs[]);

    const response = await GET();

    expect(response).toBeDefined();

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      count: mockJobs.length,
      data: mockJobs
    });
  });

  it('returns 401 when unauthorized', async () => {
    // Mock validateAuth to simulate an unauthorized user
    (validateAuth as jest.Mock).mockResolvedValue({
      isAuthorized: false,
      response: {
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: 'Unauthorized'
        })
      }
    });

    const response = await GET();

    // Assert the response is the unauthorized one
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: 'Unauthorized'
    });
  });
});  

