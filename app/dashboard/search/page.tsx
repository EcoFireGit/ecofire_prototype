'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchResultCard } from "@/components/search/search-card";
import { TasksSidebar } from "@/components/search/search-sidebar";

const SearchPage = () => {
  // State for holding the search query and results
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  
  // State for sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [taskOwnerMap, setTaskOwnerMap] = useState<Record<string, string>>({});

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
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
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

  // Function to handle opening the sidebar
  const handleOpenSidebar = (item: any) => {
    setCurrentItem(item);
    setSidebarOpen(true);
  };

  // Function to handle selection of items
  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedResults);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedResults(newSelected);
  };

  return (
    <div className="p-4">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Search</h1>
        </div>
        <div className="search-bar mb-6">
            <input
            type="text"
            placeholder="Search for jobs or tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="bg-gray-100 p-2 rounded-md w-full sm:w-auto" />
            <Button onClick={handleSearch} disabled={loading} className="mt-2 sm:mt-0 sm:ml-2">
            {loading ? 'Searching...' : 'Search'}
            </Button>
        </div>
        {error && <div className="error text-red-500 mb-4">{error}</div>}
        
        {/* Selected count */}
        {selectedResults.size > 0 && (
          <div className="mb-4 p-2 bg-blue-50 rounded-md flex justify-between items-center">
            <span>{selectedResults.size} items selected</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedResults(new Set())}>
              Clear selection
            </Button>
          </div>
        )}
        
        {/* Search Results */}
        <div className="search-results">
          {results.length > 0 ? (
            <div className="flex flex-col space-y-4">
              {results.map((result, index) => (
                <SearchResultCard 
                  key={result.id || result.uid || index}
                  result={result}
                  index={index}
                  onOpenTasksSidebar={handleOpenSidebar}
                  onSelect={handleSelectItem}
                  isSelected={selectedResults.has(result.id)}
                  taskOwnerMap={taskOwnerMap}
                />
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              {query.trim() ? "No results found" : "Enter a search term to find items"}
            </p>
          )}
        </div>
        
        {/* Tasks Sidebar */}
        <TasksSidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          selectedItem={currentItem}
        />
      </div>
    </div>
  );
};

export default SearchPage;