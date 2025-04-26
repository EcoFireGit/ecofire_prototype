// app/organizations/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useView } from '@/lib/contexts/view-context';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrganizationDialog } from '@/components/organizations/organization-dialog';
import { OrganizationsTable } from '@/components/organizations/table/organizations-table';

export default function OrganizationsPage() {
  const { organizations } = useView();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Organization
        </Button>
      </div>
      
      <OrganizationsTable organizations={organizations} />
      
      <OrganizationDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        mode="create"
        onSubmit={async () => {
          // Refresh the organization list
          window.location.reload();
        }}
      />
    </div>
  );
}