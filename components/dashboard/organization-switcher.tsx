// components/dashboard/organization-switcher.tsx
'use client'

import { useView } from '@/lib/contexts/view-context';
import { useUser } from '@clerk/nextjs';
import React from 'react';

export function OrganizationSwitcher() {
  const { user } = useUser();
  const { 
    currentViewId, 
    isOrganization, 
    setOrganizationView,
    organizations,
    currentOrganization
  } = useView();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'personal') {
      await setOrganizationView(null);
    } else {
      await setOrganizationView(value);
    }
    window.location.reload();
    };

  return (
    <div className="p-2">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">Current View:</label>
        <select 
          value={isOrganization ? currentViewId : 'personal'}
          onChange={handleChange}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="personal">Personal</option>
          {organizations.map(org => (
            <option key={org._id} value={org._id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}