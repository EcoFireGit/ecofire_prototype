import {SearchResult} from "../models/search-result.model"
import dbConnect from '../mongodb';
import Job from '../models/job.model';
import Task from '../models/task.model';
import { Jobs } from '../models/job.model';

// Interface to add score property to search results
interface SearchResultWithScore extends Record<string, any> {
  score?: number;
  type: string;
  _id: unknown;
  __v: number;
}

export class SearchService {
  /**
   * Search for items based on query parameters
   * @param query - The search query string
   * @param userId - ID of the user performing the search
   * @param options - Optional search parameters (limit, offset, filters)
   * @returns Promise resolving to search results
   */
  async search(
    query: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      filters?: Record<string, any>;
    }
  ): Promise<SearchResult[]> {
    try {
      await dbConnect();
      const searchCriteria: any = {
        userId,
        $text: { $search: query }
      };
     
      // Pagination options
      const limit = options?.limit || 10;
      const skip = options?.offset || 0;
     
      // Process each search result within the Promise chain
      const taskResults: SearchResultWithScore[] = await Task.find(searchCriteria, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .skip(skip)
        .lean()
        .then(tasks => tasks.map(task => ({
          ...task,
          type: 'task'
        })));
         
      const jobResults: SearchResultWithScore[] = await Job.find(searchCriteria, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .skip(skip)
        .lean()
        .then(jobs => jobs.map(job => ({
          ...job,
          type: 'job'
        })));
     
      // Combine and sort results by relevance score
      let counter = 1; // Initialize a counter
      const combinedResults = [...taskResults, ...jobResults]
        .sort((a, b) => (b.score || 0) - (a.score || 0)) // Sort by relevance score
        .slice(0, limit)
        .map(result => ({
          ...result,
          uid: counter++, // Assign a unique incremental ID
        }));
       
      return JSON.parse(JSON.stringify(combinedResults));
    } catch (error) {
      console.error('Error in searchService/search:', error);
      throw new Error('Error performing search operation');
    }
  }
}