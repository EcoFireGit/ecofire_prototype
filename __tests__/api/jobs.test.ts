// __tests__/api/hello.test.ts
import request from 'supertest';
import { createServer } from 'http';
import handler from '../../app/api/jobs/route';

// Create a Next.js server for testing purposes
const server = createServer((req, res) => handler(req, res));

describe('GET /api/jobs', () => {
  it('should return a 200 status and a message', async () => {
    const response = await request(server).get('/api/jobs');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Hello, world!' });
  });


});
