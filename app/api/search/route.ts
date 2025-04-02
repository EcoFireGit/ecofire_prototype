import { SearchService } from "@/lib/services/search.service"
import { NextResponse } from "next/server";
import { validateAuth } from '@/lib/utils/auth-utils';


const searchService = new SearchService();

export async function GET(request: Request) {
    try {
      const authResult = await validateAuth();
    
      if (!authResult.isAuthorized) {
        return authResult.response;
      }
      
      const userId = authResult.userId;
    
        // Parse query parameters from the request URL
        const url = new URL(request.url);
        const query = url.searchParams.get('query');
        const limit = url.searchParams.get('limit') || '10';
        const offset = url.searchParams.get('offset') || '0';
        const filters = url.searchParams.get('filters') || undefined;


        if (!query) {
            return NextResponse.json(
              {
                success: false,
                error: 'Query parameter is required'
              },
              { status: 400 }
            );
          }
      
          // Parse the filters if provided
          const parsedFilters = filters ? JSON.parse(filters) : undefined;
      
          // Call the search service to get results
          const results = await searchService.search(query, userId!, {
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            filters: parsedFilters,
          });
      
          // Return the search results
          return NextResponse.json({
            success: true,
            count: results.length,
            data: results,
          });        

    }catch(error ){
        console.error('Error in GET /api/search:', error);
        return NextResponse.json(
            {
            success: false,
            error: 'Internal Server Error'
            },
            { status: 500 }
        );        
    }

}

