"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import CalendarAuth from '@/components/gcal/calendar-auth';
import { Gcal, convertGcalsToTableData } from "@/components/gcal/table/columns";

export default function CalendarPage() {
  const [data, setData] = useState<Gcal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false); // Track CalendarAuth completion
  const [selectedRows, setSelectedRows] = useState<Gcal[]>([]); // Store full objects
  const { toast } = useToast();

  // Fetch data for the table
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

  const handleCreate = async () => {
    if (selectedRows.length === 0) {
      toast({
        title: "Error",
        description: "No rows selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/gcal/calendars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calendars: selectedRows }), // Send full objects
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `${selectedRows.length} calendar(s) added successfully`,
        });
        setSelectedRows([]); // Clear selection after successful operation
        fetchGcals(); // Refresh table data
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error adding calendars:", error);
      toast({
        title: "Error",
        description: "Failed to add calendars",
        variant: "destructive",
      });
    }
  };


  // Initialize authentication and fetch data
  useEffect(() => {
    setAuthInitialized(true);
    if (authInitialized) {
      fetchGcals(); // Fetch data only after CalendarAuth is initialized
    }
  }, [authInitialized]);

  // Handle row selection
  const toggleRowSelection = (row: Gcal) => {
    setSelectedRows((prevSelectedRows) =>
      prevSelectedRows.some((selectedRow) => selectedRow.id === row.id)
        ? prevSelectedRows.filter((selectedRow) => selectedRow.id !== row.id)
        : [...prevSelectedRows, row]
    );
  };
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
              <Button onClick={handleCreate} className="bg-blue-500 hover:bg-blue-600">
                <Plus className="mr-2 h-4 w-4" /> Add Selected Calendar
              </Button>
            </div>

            {/* Render Table */}
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 text-left">Select</th>
                  <th className="border border-gray-300 p-2 text-left">ID</th>
                  <th className="border border-gray-300 p-2 text-left">Etag</th>
                  <th className="border border-gray-300 p-2 text-left">Summary</th>
                  <th className="border border-gray-300 p-2 text-left">Timezone</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                <tr key={row.id} className={`border border-gray-300 ${selectedRows.some((selectedRow)=> selectedRow.id
                  === row.id) ? 'bg-blue-100' : ''}`}
                  >
                  <td className="p-2">
                    <input type="checkbox" checked={selectedRows.some((selectedRow)=> selectedRow.id === row.id)}
                    onChange={() => toggleRowSelection(row)} // Pass full row object
                    />
                  </td>
                  <td className="p-2">{row.id}</td>
                  <td className="p-2">{row.etag}</td>
                  <td className="p-2">{row.summary}</td>
                  <td className="p-2">{row.timeZone}</td>
                </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>
        )}
      </>
      );
      }