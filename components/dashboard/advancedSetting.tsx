"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdvancedSettingsPage() {
  const [preferences, setPreferences] = useState({
    enableBackstage: false,
    enableTableView: false,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch user preferences on component mount
    const fetchPreferences = async () => {
      try {
        const response = await fetch("/api/user/preferences");
        const result = await response.json();

        if (result.success) {
          setPreferences({
            enableBackstage: result.data.enableBackstage,
            enableTableView: result.data.enableTableView,
          });
        }
      } catch (error) {
        console.error("Failed to fetch user preferences:", error);
        toast({
          title: "Error",
          description: "Failed to load settings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [toast]);

  const handleToggle = async (setting: "enableBackstage" | "enableTableView") => {
    // Optimistically update UI
    const newValue = !preferences[setting];
    setPreferences({ ...preferences, [setting]: newValue });

    // Send update to server
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [setting]: newValue }),
      });

      const result = await response.json();

      if (!result.success) {
        // If server update fails, revert UI
        setPreferences({ ...preferences, [setting]: !newValue });
        toast({
          title: "Error",
          description: "Failed to update preference. Please try again.",
          variant: "destructive",
        });
      } else {
        // Show success toast
        toast({
          title: "Settings Updated",
          description: `${setting === "enableBackstage" ? "Backstage access" : "Table view"} has been ${newValue ? "enabled" : "disabled"}.`,
        });
        
        // If the backstage setting was changed, refresh the page
        // This allows the sidebar to reflect the new setting immediately
        if (setting === "enableBackstage") {
          // Give the user a moment to see the toast before refreshing
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      }
    } catch (error) {
      // If request fails, revert UI
      setPreferences({ ...preferences, [setting]: !newValue });
      toast({
        title: "Error",
        description: "Failed to update preference. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <p>Loading your preferences...</p>
      </div>
    );
  }

  return (
    <div className="container py-10 pl-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid gap-6">
        {/* Backstage Access Setting */}
        <Card>
          <CardHeader>
            <CardTitle>Backstage Access</CardTitle>
            <CardDescription>
              Enable access to advanced administrative features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="backstage-access"
                    checked={preferences.enableBackstage}
                    onCheckedChange={() => handleToggle("enableBackstage")}
                  />
                  <Label htmlFor="backstage-access">
                    {preferences.enableBackstage ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </div>

            {!preferences.enableBackstage && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Backstage is currently disabled</AlertTitle>
                <AlertDescription>
                  Backstage contains advanced features.
                  Enabling this will show the Backstage section in the sidebar.
                </AlertDescription>
              </Alert>
            )}

            {preferences.enableBackstage && (
              <Alert className="mt-4 bg-amber-50 text-amber-800 border-amber-300">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Backstage is enabled</AlertTitle>
                <AlertDescription>
                  You now have access to advanced features. 
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Table View Setting */}
        <Card>
          <CardHeader>
            <CardTitle>Jobs Table View</CardTitle>
            <CardDescription>
              Enable table view option in the Jobs Feed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="table-view"
                    checked={preferences.enableTableView}
                    onCheckedChange={() => handleToggle("enableTableView")}
                  />
                  <Label htmlFor="table-view">
                    {preferences.enableTableView ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </div>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>About Table View</AlertTitle>
              <AlertDescription>
                Enabling this will add a Grid/Table view switcher to the Jobs Feed page, allowing you to see jobs in a more compact tabular format.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
