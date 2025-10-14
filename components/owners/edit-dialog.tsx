
import { useEffect, useState } from "react";
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

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, name: string, userId: string) => void;
  initialId: string;
  initialName: string;
  initialUserId: string;
}

export function EditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialId,
  initialName,
  initialUserId
}: EditDialogProps) {
  const [name, setName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (open) {
      setName(initialName);
      setSelectedUserId(initialUserId || '');
      fetchUsers();
    }
  }, [open, initialName, initialUserId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert('Please select a user');
      return;
    }
    onSubmit(initialId, name, selectedUserId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Owner</DialogTitle>
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
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user" className="text-right">
                Assign User
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
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
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
