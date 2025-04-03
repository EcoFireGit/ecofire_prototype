// lib/contexts/view-context.tsx
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

type Organization = {
  _id: string;
  name: string;
  description?: string;
};

type ViewContextType = {
  currentViewId: string;
  isOrganization: boolean;
  setOrganizationView: (orgId: string | null) => Promise<boolean>;
  organizations: Organization[];
  currentOrganization: Organization | null;
};

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [currentViewId, setCurrentViewId] = useState<string>('');
  const [isOrganization, setIsOrganization] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);

  // Load user's organizations and active org when component mounts
  useEffect(() => {
    if (!isLoaded || !user) return;
    
    // Set default viewId to user's ID
    setCurrentViewId(user.id);
    
    // Fetch user's organizations
    async function fetchOrgs() {
      try {
        const res = await fetch('/api/organizations');
        const data = await res.json();
        
        if (data.success) {
          setOrganizations(data.data);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    }
    
    // Check if user has an active organization in their session
    async function checkActiveOrg() {
      try {
        const res = await fetch('/api/user/active-organization');
        const data = await res.json();
        
        if (data.success && data.organizationId) {
          setCurrentViewId(data.organizationId);
          setIsOrganization(true);
          
          // Find the organization object
          const org = organizations.find(o => o._id === data.organizationId);
          setCurrentOrganization(org || null);
        }
      } catch (error) {
        console.error('Error checking active organization:', error);
      }
    }
    
    fetchOrgs().then(() => checkActiveOrg());
  }, [user, isLoaded]);

  // Function to switch organization view
  const setOrganizationView = async (orgId: string | null) => {
    try {
      // Call API to update user's active organization
      const res = await fetch('/api/user/active-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId })
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (orgId) {
          setCurrentViewId(orgId);
          setIsOrganization(true);
          
          // Find the organization object
          const org = organizations.find(o => o._id === orgId);
          setCurrentOrganization(org || null);
        } else {
          setCurrentViewId(user?.id || '');
          setIsOrganization(false);
          setCurrentOrganization(null);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error setting organization view:', error);
      return false;
    }
  };

  return (
    <ViewContext.Provider value={{ 
      currentViewId, 
      isOrganization, 
      setOrganizationView,
      organizations,
      currentOrganization
    }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}