// app/organizations/[id]/members/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { MembersTable } from '@/components/organizations/members/members-table';
import { AddMemberDialog } from '@/components/organizations/members/add-member-dialog';

interface Member {
  _id: string;
  userId: string;
  organizationId: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export default function OrganizationMembersPage() {
  const params = useParams();
  const orgId = params.id as string;
  
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch organization details
        const orgRes = await fetch(`/api/organizations/${orgId}`);
        const orgData = await orgRes.json();
        
        if (orgData.success) {
          setOrgName(orgData.data.name);
        }
        
        // Fetch members
        const membersRes = await fetch(`/api/organizations/${orgId}/members`);
        const membersData = await membersRes.json();
        
        if (membersData.success) {
          setMembers(membersData.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [orgId]);
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{orgName || 'Organization'} Members</h1>
          <p className="text-gray-500">Manage members of this organization</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">Loading members...</div>
      ) : (
        <MembersTable 
          members={members}
          organizationId={orgId}
          onMemberUpdate={() => {
            // Refresh the member list
            window.location.reload();
          }}
        />
      )}
      
      <AddMemberDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        organizationId={orgId}
        onSubmit={() => {
          // Refresh the member list
          window.location.reload();
        }}
      />
    </div>
  );
}