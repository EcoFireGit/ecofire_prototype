"use client";

import { useState } from "react";

interface SearchResultCardProps {
  result: { id: string; title: string; description: string; type: string; author?: string };
}

export function SearchResultCard({result}: SearchResultCardProps) {

  return (
    <div>
        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-gray-700">{result.title}</p>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-gray-700">{result.description}</p>
        </div>
        {/* Description */}
        
        <div className="mb-4">
          <p className="text-sm text-gray-700">{result.type}</p>
        </div>

    </div>
  );
}
