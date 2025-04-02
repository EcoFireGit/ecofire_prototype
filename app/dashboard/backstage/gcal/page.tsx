"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import CalendarAuth from '@/components/gcal/calendar-auth';
import { DataTable } from "@/components/gcal/table/gcal-table";
import { Gcal, columns, convertGcalsToTableData } from "@/components/gcal/table/columns";

export default function CalendarPage() {
  const [data, setData] = useState<Gcal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false); // Track CalendarAuth completion
  const { toast } = useToast();

  const fetchGcals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gcal/calendars');
      const result = await response.json();

      if (result.success) {
        const tableData = convertGcalsToTableData(result.data);
        setData(tableData);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch Calendars');
      console.error('Error fetching Calendars:', err);
    } finally {
      setLoading(false);
    }
  };

const handleCreate = async (GcalData: Partial<Gcal>) => {
    try {
      const response = await fetch('/api/gcal/calendars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(GcalData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Gcal created successfully",
        });
        fetchGcals();
        //setDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create Calendar",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setAuthInitialized(true);
    if (authInitialized) {
      fetchGcals(); // Fetch data only after CalendarAuth is initialized
    }
  }, [authInitialized]);

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Calendar Integration</h1>
        {/* Render CalendarAuth */}
        <CalendarAuth />
        
      </div>

      {authInitialized && (
        <div className="p-4">
          <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Calendars</h1>
              <Button onClick={() => {handleCreate}} className="bg-blue-500 hover:bg-blue-600">
                <Plus className="mr-2 h-4 w-4" /> Add Calendar
              </Button>
            </div>

            <DataTable columns={columns(() => {/* Handle delete */})} data={data} />
          </div>
        </div>
      )}
    </>
  );
}
