enum SearchResultType {
    JOB = "Job",
    TASK = "Task",
}

export interface SearchResult{
    // Core fields
    id: string;              // Unique identifier for the search result
    userId: string;          // ID of the user who owns this item
    title: string;           // Title or name of the result item
    notes?: string;    // Optional description
    content?: string;        // Optional content text that was matched
    
    // Search metadata
    score?: number;          // Search relevance score
    highlights?: {           // Optional highlighted text snippets showing matches
      field: string;         // Which field contains the highlight
      text: string;          // The highlighted text snippet
    }[];
    
    // Additional metadata
    type?: string;           // Type of result (document, task, contact, etc.)
    createdAt: Date;         // When the item was created
    updatedAt: Date;         // When the item was last updated
    
}