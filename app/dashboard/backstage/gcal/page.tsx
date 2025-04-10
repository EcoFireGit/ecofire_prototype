"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import CalendarAuth from '@/components/gcal/calendar-auth';
import { Gcal, convertGcalsToTableData } from "@/components/gcal/table/columns";

export default function CalendarPage() {
  const [data, setData] = useState<Gcal[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Gcal[]>([]);
  const { toast } = useToast();

  type CalendarEvent = {
    date: string;
    time: string;
    name: string;
    calendar: string;
  };

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

  const fetchCalendarEvents = async (calendarId: string) => {
    try {
      const response = await fetch(`/api/gcal/calendars/${calendarId}/events`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.log("HERE");
        throw new Error(result.error || 'Failed to fetch events');
      }
    } catch (err) {
      console.log("THERE");
      console.error(`Error fetching events for calendar ${calendarId}:`, err);
      return [];
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
      // First add the calendars
      const response = await fetch('/api/gcal/calendars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calendars: selectedRows }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Then fetch events for each selected calendar
      const allEvents = [];
      for (const row of selectedRows) {
        const calendarEvents = await fetchCalendarEvents(row.id);
        
        const formattedEvents = calendarEvents.map((event: any) => ({
          date: event.start.dateTime 
            ? new Date(event.start.dateTime).toLocaleDateString() 
            : event.start.date,
          time: event.start.dateTime 
            ? new Date(event.start.dateTime).toLocaleTimeString() 
            : 'All Day',
          name: event.summary,
          calendar: row.summary,
        }));
        
        allEvents.push(...formattedEvents);
      }

      setEvents(allEvents);
      
      toast({
        title: "Success",
        description: `${selectedRows.length} calendar(s) added successfully with ${allEvents.length} events`,
      });
      setSelectedRows([]);
      fetchGcals();

    } catch (error) {
      console.error("Error adding calendars:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add calendars",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setAuthInitialized(true);
    if (authInitialized) {
      fetchGcals();
    }
  }, [authInitialized]);

  const toggleRowSelection = (row: Gcal) => {
    setSelectedRows((prevSelectedRows) =>
      prevSelectedRows.some((selectedRow) => selectedRow.id === row.id)
        ? prevSelectedRows.filter((selectedRow) => selectedRow.id !== row.id)
        : [...prevSelectedRows, row]
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Calendar Integration</h1>
      <CalendarAuth />
  
      {authInitialized && (
        <div className="py-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Calendars</h2>
            <Button onClick={handleCreate} className="bg-blue-500 hover:bg-blue-600">
              <Plus className="mr-2 h-4 w-4" /> Add Selected Calendar
            </Button>
          </div>
  
          <table className="w-full border-collapse border border-gray-200 mb-8">
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
                <tr
                  key={row.id}
                  className={`border border-gray-300 ${
                    selectedRows.some((selectedRow) => selectedRow.id === row.id)
                      ? 'bg-blue-100'
                      : ''
                  }`}
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.some((selectedRow) => selectedRow.id === row.id)}
                      onChange={() => toggleRowSelection(row)}
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
  
          {events.length > 0 && (
            <>
              <h3 className="text-xl font-semibold mb-4">Calendar Events</h3>
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">Date</th>
                    <th className="border border-gray-300 p-2 text-left">Time</th>
                    <th className="border border-gray-300 p-2 text-left">Event Name</th>
                    <th className="border border-gray-300 p-2 text-left">Calendar Name</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, idx) => (
                    <tr key={idx} className="border border-gray-300">
                      <td className="p-2">{event.date}</td>
                      <td className="p-2">{event.time}</td>
                      <td className="p-2">{event.name}</td>
                      <td className="p-2">{event.calendar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}  