"use client";

import { useState, useEffect } from "react";
import { useView } from "@/lib/contexts/view-context";
import { Plus, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { OwnersTable } from "@/components/owners/table/owners-table";
import { Owner, columns as ownerColumns } from "@/components/owners/table/columns";
import { CreateDialog as OwnerCreateDialog } from "@/components/owners/create-dialog";
import { EditDialog as OwnerEditDialog } from "@/components/owners/edit-dialog";
import { OrganizationDialog } from "@/components/organizations/organization-dialog";
import { OrganizationsTable } from "@/components/organizations/table/organizations-table";
import { MembersTable } from "@/components/organizations/members/members-table";
import { AddMemberDialog } from "@/components/organizations/members/add-member-dialog";
import { useParams } from "next/navigation";

// Business functions import
import { BusinessFunction, columns as businessFunctionColumns } from "@/components/business-functions/table/columns";
import { DataTable as BusinessFunctionsTable } from "@/components/business-functions/table/business-functions-table";
import { CreateDialog as BusinessFunctionCreateDialog } from "@/components/business-functions/create-dialog";
import { EditDialog as BusinessFunctionEditDialog } from "@/components/business-functions/edit-dialog";

// Collapsible import
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface BusinessInfo {
  name: string;
  industry: string;
  missionStatement: string;
  monthsInBusiness: number;
  annualRevenue: number;
  growthStage: string;
}

interface Member {
  _id: string;
  userId: string;
  organizationId: string;
  role: "admin" | "member";
  joinedAt: string;
}

function convertToTableData(data: any[]): BusinessFunction[] {
  return data.map(item => ({
    id: item._id,
    name: item.name,
    isDefault: item.isDefault,
    jobCount: item.jobCount || 0
  }));
}

export default function SettingPage() {
  const { organizations } = useView();

  // Collapsible states
  const [openBusinessFunctions, setOpenBusinessFunctions] = useState(true);
  const [openOwners, setOpenOwners] = useState(true);
  const [openOrganizations, setOpenOrganizations] = useState(true);

  // Business Functions states
  const [businessFunctionsData, setBusinessFunctionsData] = useState<BusinessFunction[]>([]);
  const [businessFunctionsLoading, setBusinessFunctionsLoading] = useState(true);
  const [businessFunctionsError, setBusinessFunctionsError] = useState<string | null>(null);
  const [businessFunctionCreateDialogOpen, setBusinessFunctionCreateDialogOpen] = useState(false);
  const [businessFunctionEditDialogOpen, setBusinessFunctionEditDialogOpen] = useState(false);
  const [currentBusinessFunction, setCurrentBusinessFunction] = useState<{id: string, name: string}>({id: '', name: ''});

  // Owners States
  const [owners, setOwners] = useState<Owner[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentOwner, setCurrentOwner] = useState<{ id: string; name: string; userId: string }>({
    id: "",
    name: "",
    userId: "",
  });

  // Business Info States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: "",
    industry: "",
    missionStatement: "",
    monthsInBusiness: 0,
    annualRevenue: 0,
    growthStage: "",
  });

  // Organization Members States
  const params = useParams();
  const orgIdParam = params?.id as string | undefined;

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Toast
  const { toast } = useToast();

  // Business Functions Handlers
  const fetchBusinessFunctions = async () => {
    try {
      const response = await fetch('/api/business-functions');
      const result = await response.json();

      if (result.success) {
        const tableData = convertToTableData(result.data);
        setBusinessFunctionsData(tableData);
      } else {
        setBusinessFunctionsError(result.error);
      }
    } catch (err) {
      setBusinessFunctionsError('Failed to fetch business functions');
      console.error('Error fetching business functions:', err);
    } finally {
      setBusinessFunctionsLoading(false);
    }
  };

  const handleBusinessFunctionCreate = async (name: string) => {
    try {
      const response = await fetch('/api/business-functions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Business function created successfully",
        });
        fetchBusinessFunctions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create business function",
        variant: "destructive",
      });
    }
  };

  const handleBusinessFunctionEdit = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/business-functions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Business function updated successfully",
        });
        fetchBusinessFunctions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update business function",
        variant: "destructive",
      });
    }
  };

  const handleBusinessFunctionDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/business-functions/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Business function deleted successfully",
        });
        fetchBusinessFunctions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete business function",
        variant: "destructive",
      });
    }
  };

  const openBusinessFunctionEditDialog = (id: string, name: string) => {
    setCurrentBusinessFunction({id, name});
    setBusinessFunctionEditDialogOpen(true);
  };

  // Owners handlers
  const fetchOwners = async () => {
    try {
      const [ownersResponse, usersResponse] = await Promise.all([
        fetch("/api/owners"),
        fetch("/api/users")
      ]);
      
      const ownersResult = await ownersResponse.json();
      const usersResult = usersResponse.ok ? await usersResponse.json() : [];
      
      if (ownersResponse.ok) {
        const ownersWithUserInfo = ownersResult.map((owner: any) => {
          const user = usersResult.find((u: any) => u.id === owner.actualUserId);
          return {
            id: owner._id,
            name: owner.name,
            userId: owner.actualUserId || '',
            userEmail: user?.fullName || user?.email || (owner.actualUserId ? owner.actualUserId : 'No user assigned')
          };
        });
        setOwners(ownersWithUserInfo);
      }
    } catch (error) {
      console.error("Error fetching owners:", error);
    }
  };
  const handleCreate = async (name: string, userId: string) => {
    try {
      const response = await fetch("/api/owners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, userId }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Owner created successfully",
        });
        fetchOwners();
      } else {
        toast({
          title: "Error",
          description: "Failed to create owner",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      console.error("Error creating owner:", error);
    }
  };

  const handleEdit = async (id: string, name: string, userId?: string) => {
    try {
      // If no userId provided, get current user
      let finalUserId = userId;
      if (!finalUserId) {
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const users = await usersResponse.json();
          finalUserId = users[0]?.id;
        }
      }

      const response = await fetch(`/api/owners/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, userId: finalUserId }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Owner updated successfully",
        });
        fetchOwners();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update owner",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      console.error("Error updating owner:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/owners/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Owner deleted successfully",
        });
        fetchOwners();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete owner",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      console.error("Error deleting owner:", err);
    }
  };

  const openEditDialog = (id: string, name: string, userId: string) => {
    setCurrentOwner({ id, name, userId });
    setEditDialogOpen(true);
  };

  // Business Info handlers
  useEffect(() => {
    async function fetchBusinessInfo() {
      try {
        const response = await fetch("/api/business-info");
        if (response.ok) {
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            setBusinessInfo(data);
          }
        }
      } catch (error) {
        console.error("Error fetching business info:", error);
        toast({
          title: "Error",
          description: "Failed to load business information",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchBusinessInfo();
    fetchOwners();
    fetchBusinessFunctions();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setBusinessInfo((prev) => ({
      ...prev,
      [name]:
        name === "monthsInBusiness" || name === "annualRevenue"
          ? Number(value)
          : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setBusinessInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/business-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(businessInfo),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Business information saved successfully",
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving business info:", error);
      toast({
        title: "Error",
        description: "Failed to save business information",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Organization Members Logic
  useEffect(() => {
    if (!orgIdParam) {
      setMembersLoading(false);
      return;
    }
    async function fetchData() {
      setMembersLoading(true);
      try {
        // Fetch organization details
        const orgRes = await fetch(`/api/organizations/${orgIdParam}`);
        const orgData = await orgRes.json();

        if (orgData.success) {
          setOrgName(orgData.data.name);
        }

        // Fetch members
        const membersRes = await fetch(`/api/organizations/${orgIdParam}/members`);
        const membersData = await membersRes.json();

        if (membersData.success) {
          setMembers(membersData.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setMembersLoading(false);
      }
    }

    fetchData();
  }, [orgIdParam]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* LEFT SIDE: Business Information */}
        <div className="flex-1 min-w-[300px] bg-white shadow-lg rounded-lg p-6">
          <div className="bg-white bg-white shadow-lg rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">Business Information</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={businessInfo.name}
                  onChange={handleChange}
                  placeholder="Enter business name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  name="industry"
                  value={businessInfo.industry}
                  onChange={handleChange}
                  placeholder="Enter business industry"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="missionStatement">Mission Statement</Label>
                <Textarea
                  id="missionStatement"
                  name="missionStatement"
                  value={businessInfo.missionStatement}
                  onChange={handleChange}
                  placeholder="Enter your mission statement"
                  required
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthsInBusiness">Months in Business</Label>
                <Input
                  id="monthsInBusiness"
                  name="monthsInBusiness"
                  type="number"
                  value={businessInfo.monthsInBusiness}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="annualRevenue">Annual Revenue ($)</Label>
                <Input
                  id="annualRevenue"
                  name="annualRevenue"
                  type="number"
                  value={businessInfo.annualRevenue}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="growthStage">Growth Stage</Label>
                {businessInfo.growthStage === "custom" ||
                ![
                  "Pre-seed",
                  "Seed",
                  "Early",
                  "Growth",
                  "Expansion",
                  "Mature",
                ].includes(businessInfo.growthStage) ? (
                  <div className="space-y-2">
                    <Input
                      id="customGrowthStage"
                      name="growthStage"
                      value={
                        businessInfo.growthStage === "custom"
                          ? ""
                          : businessInfo.growthStage
                      }
                      onChange={(e) =>
                        setBusinessInfo((prev) => ({
                          ...prev,
                          growthStage: e.target.value || "custom",
                        }))
                      }
                      placeholder="Enter custom growth stage"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectChange("growthStage", "Pre-seed")}
                    >
                      Use dropdown options instead
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select
                      value={businessInfo.growthStage}
                      onValueChange={(value) =>
                        handleSelectChange("growthStage", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select growth stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pre-seed">Pre-seed</SelectItem>
                        <SelectItem value="Seed">Seed</SelectItem>
                        <SelectItem value="Early">Early</SelectItem>
                        <SelectItem value="Growth">Growth</SelectItem>
                        <SelectItem value="Expansion">Expansion</SelectItem>
                        <SelectItem value="Mature">Mature</SelectItem>
                        <SelectItem value="custom">
                          Custom (enter your own)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Business Information"}
              </Button>
            </form>
          </div>
        </div>
        {/* RIGHT SIDE: Business Functions, Owners, Organizations (stacked) */}
        <div className="flex flex-col gap-6 flex-1 md:max-w-2xl">
          {/* Business Functions (Collapsible) */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <Collapsible open={openBusinessFunctions} onOpenChange={setOpenBusinessFunctions}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Business Functions</h2>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {openBusinessFunctions ? "Hide" : "Show"}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                {businessFunctionsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="text-lg">Loading business functions...</div>
                  </div>
                ) : businessFunctionsError ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="text-lg text-red-500">Error: {businessFunctionsError}</div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end mb-4">
                      <Button onClick={() => setBusinessFunctionCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create Business Function
                      </Button>
                    </div>
                    <BusinessFunctionsTable
                      columns={businessFunctionColumns(handleBusinessFunctionDelete, openBusinessFunctionEditDialog)}
                      data={businessFunctionsData}
                    />
                    <BusinessFunctionCreateDialog
                      open={businessFunctionCreateDialogOpen}
                      onOpenChange={setBusinessFunctionCreateDialogOpen}
                      onSubmit={handleBusinessFunctionCreate}
                    />
                    <BusinessFunctionEditDialog
                      open={businessFunctionEditDialogOpen}
                      onOpenChange={setBusinessFunctionEditDialogOpen}
                      onSubmit={handleBusinessFunctionEdit}
                      initialId={currentBusinessFunction.id}
                      initialName={currentBusinessFunction.name}
                    />
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Owners (Collapsible) */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <Collapsible open={openOwners} onOpenChange={setOpenOwners}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Owners</h2>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {openOwners ? "Hide" : "Show"}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="flex justify-end mb-4">
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Owner
                  </Button>
                </div>
                <OwnersTable
                  columns={ownerColumns(handleDelete, openEditDialog)}
                  data={owners}
                />
                <OwnerCreateDialog
                  open={createDialogOpen}
                  onOpenChange={setCreateDialogOpen}
                  onSubmit={handleCreate}
                />
                <OwnerEditDialog
                  open={editDialogOpen}
                  onOpenChange={setEditDialogOpen}
                  onSubmit={handleEdit}
                  initialId={currentOwner.id}
                  initialName={currentOwner.name}
                  initialUserId={currentOwner.userId}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Organizations and Members (Collapsible) */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <Collapsible open={openOrganizations} onOpenChange={setOpenOrganizations}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Organizations</h2>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {openOrganizations ? "Hide" : "Show"}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="flex justify-end mb-4">
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
                    window.location.reload();
                  }}
                />

                <div className="my-8 border-t border-gray-200" />

                {/* Organization Members */}
                {orgIdParam && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {(orgName || "Organization") + " Members"}
                        </h2>
                        <p className="text-gray-500">
                          Manage members of this organization
                        </p>
                      </div>
                      <Button onClick={() => setMemberDialogOpen(true)}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Add Member
                      </Button>
                    </div>

                    {membersLoading ? (
                      <div className="text-center py-10">Loading members...</div>
                    ) : (
                      <MembersTable
                        members={members}
                        organizationId={orgIdParam}
                        onMemberUpdate={() => {
                          window.location.reload();
                        }}
                      />
                    )}

                    <AddMemberDialog
                      open={memberDialogOpen}
                      onOpenChange={setMemberDialogOpen}
                      organizationId={orgIdParam}
                      onSubmit={() => {
                        window.location.reload();
                      }}
                    />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  );
}