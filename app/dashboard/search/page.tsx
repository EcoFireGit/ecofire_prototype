'use client'
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input"
import { SearchResultCard } from "@/app/dashboard/search/search-card";


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
        <div className="search-bar">
            <input
            type="text"
            placeholder="Search for jobs or tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-gray-100"/>
            <Button onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
            </Button>
        </div>

        {error && <div className="error">{error}</div>}

      <div className="search-results">
        {results.length > 0 ? (
          results.map((result) => (
            <SearchResultCard key={result.uid} result={result} />
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