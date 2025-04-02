// components/organizations/members/members-table.tsx
'use client'

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Member {
  _id: string;
  userId: string;
  organizationId: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

interface MembersTableProps {
  members: Member[];
  organizationId: string;
  onMemberUpdate: () => void;
}

export function MembersTable({
  members,
  organizationId,
  onMemberUpdate
}: MembersTableProps) {
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onMemberUpdate();
      } else {
        console.error('Error updating member role:', data.error);
      }
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  };

  const handleDelete = (member: Member) => {
    setMemberToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${memberToDelete._id}`,
        { method: 'DELETE' }
      );
      
      const data = await response.json();
      
      if (data.success) {
        onMemberUpdate();
      } else {
        console.error('Error removing member:', data.error);
      }
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                No members found.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member._id}>
                <TableCell>{member.userId}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={member.role}
                    onValueChange={(value: 'admin' | 'member') => 
                      handleRoleChange(member._id, value)
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {new Date(member.joinedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(member)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the organization?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}