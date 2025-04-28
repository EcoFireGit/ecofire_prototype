'use client'
import { useView } from '@/lib/contexts/view-context';
import { useUser } from '@clerk/nextjs';
import React, { useState } from 'react';

export function OrganizationSwitcher() {
  const { user } = useUser();
  const {
    currentViewId,
    isOrganization,
    setOrganizationView,
    organizations,
    currentOrganization
  } = useView();
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      setIsLoading(true);
      const value = e.target.value;
      let success;
     
      if (value === 'personal') {
        success = await setOrganizationView(null);
      } else {
        success = await setOrganizationView(value);
      }
     
      if (success) {
        window.location.reload();
      } else {
        // If switching fails, reset loading state
        setIsLoading(false);
        alert('Failed to switch organization view. Please try again.');
      }
    } catch (error) {
      console.error('Error switching organization:', error);
      setIsLoading(false);
      alert('An error occurred while switching organizations.');
    }
  };

  // Function to truncate text to 50 characters
  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  return (
    <div className="p-2" id='org-view-toggle'>
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">Current View:</label>
        <div className="w-40 relative">
          <select
            value={isOrganization ? currentViewId : 'personal'}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full border rounded px-2 py-1 text-sm text-black truncate ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="personal">Personal</option>
            {organizations.map(org => (
              <option key={org._id} value={org._id} className="truncate" title={org.name}>
                {truncateText(org.name)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}