'use client'
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchResultCard } from "@/components/search/search-card";

const SearchPage = () => {
  // State for holding the search query and results
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Function to handle search
  const handleSearch = async () => {
    if (!query.trim()) {
      alert('Please enter a search query!');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Fetch search results from the API
      const response = await fetch(`/api/search?query=${query}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization headers if needed, e.g. for Clerk or other auth providers
          // 'Authorization': `Bearer ${authToken}`
        },
      });

      // Check for successful response
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const data = await response.json();
      setResults(data.data || []);
    } catch (err) {
      setError('Error fetching search results');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Search</h1>
        </div>
        <div className="search-bar mb-6"> {/* Add margin-bottom to this section */}
            <input
            type="text"
            placeholder="Search for jobs or tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-gray-100 p-2 rounded-md w-full sm:w-auto" /> {/* Add some padding to the input */}
            <Button onClick={handleSearch} disabled={loading} className="mt-2 sm:mt-0 sm:ml-2">
            {loading ? 'Searching...' : 'Search'}
            </Button>
        </div>

        {error && <div className="error text-red-500 mb-4">{error}</div>} {/* Add margin-bottom for error message */}

        <div className="search-results">
          {/* Header Row with column headings */}
          <div className="flex w-full font-bold text-gray-700 border-b border-gray-300 pb-2 mb-4">
            {/* Serial number header */}
            <div className="w-[50px] min-w-[50px] max-w-[50px] pl-6 text-left">
              <p className="text-sm">#</p> {/* Serial Number header */}
            </div>

            {/* Title header */}
            <div className="w-[200px] min-w-[200px] max-w-[200px] pl-6 text-left">
              <p className="text-sm">Title</p>
            </div>

            {/* Notes header */}
            <div className="w-[400px] min-w-[400px] max-w-[400px] pl-6 text-left">
              <p className="text-sm">Notes</p>
            </div>

            {/* Type header */}
            <div className="w-[100px] min-w-[100px] max-w-[100px] pl-6 text-left">
              <p className="text-sm">Type</p>
            </div>
          </div>

          {/* Render rows */}
          {results.length > 0 ? (
            results.map((result, index) => (
              <SearchResultCard key={result.uid} result={result} index={index}/>
            ))
          ) : (
            <p>No results found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
