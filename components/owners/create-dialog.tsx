
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, userId: string) => void;
}

export function CreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateDialogProps) {
  const [name, setName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      console.log('Users API response status:', response.status);
      if (response.ok) {
        const userData = await response.json();
        console.log('Users data received:', userData);
        setUsers(userData);
      } else {
        console.error('Failed to fetch users, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Create form submitting with:', { name, selectedUserId, usersCount: users.length });
    if (!selectedUserId) {
      console.log('No user selected, selectedUserId:', selectedUserId);
      alert('Please select a user');
      return;
    }
    console.log('Calling onSubmit with:', { name, selectedUserId });
    onSubmit(name, selectedUserId);
    setName("");
    setSelectedUserId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Owner</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Enter owner name"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user" className="text-right">
                Assign User
              </Label>
              <Select 
                value={selectedUserId} 
                onValueChange={(value) => {
                  console.log('User selection changed to:', value);
                  setSelectedUserId(value);
                }} 
                required
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={loading ? "Loading users..." : "Select a user"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
