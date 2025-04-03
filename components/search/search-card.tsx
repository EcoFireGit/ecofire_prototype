"use client";

import { useState } from "react";

interface SearchResultCardProps {
  result: { id: string; title: string; notes: string; type: string; author?: string };
  index: number;  // Add index as a prop to display serial number
}

export function SearchResultCard({
  result,
  index
}: SearchResultCardProps) {
  return (
    <div className="bg-[#F4F4F4] border rounded-md shadow-sm">
      <div className="p-4 cursor-pointer">
        {/* Row for displaying the data */}
        <div className="flex w-[100%]"> {/* Set fixed width for the entire row */}
          {/* Serial number column with fixed width */}
          <div className="w-[50px] min-w-[50px] max-w-[50px] border-r border-gray-300 pr-4 text-left">
            <p className="text-sm text-gray-700">{index + 1}</p> {/* Display serial number */}
          </div>

          {/* Title column with fixed width */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] border-r border-gray-300 pr-4 text-left">
            <p className="text-sm text-gray-700 break-words">{result.title}</p>
          </div>

          {/* Notes column with more width */}
          <div className="w-[400px] min-w-[400px] max-w-[400px] border-r border-gray-300 pr-4 text-left">
            <p className="text-sm text-gray-500 break-words">{result.notes}</p>
          </div>

          {/* Type column with fixed width */}
          <div className="w-[100px] min-w-[100px] max-w-[100px] text-left">
            <p className="text-sm text-gray-700 break-words">{result.type || "No type"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
