"use client";

import { useState, useEffect } from "react";
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
import { toast } from "@/hooks/use-toast";

interface BusinessInfo {
  name: string;
  industry: string;
  missionStatement: string;
  monthsInBusiness: number;
  annualRevenue: number;
  growthStage: string;
}

export default function BusinessInfoPage() {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        Loading...
      </div>
    );
  }

  return (
    <div className="container py-10 mx-auto">
      <h1 className="text-2xl font-bold mb-6">Business Information</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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
          {businessInfo.growthStage === "custom" ? (
            <div className="space-y-2">
              <Input
                id="customGrowthStage"
                name="growthStage"
                value={businessInfo.growthStage}
                onChange={handleChange}
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
  );
}
