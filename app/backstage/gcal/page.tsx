"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

import CalendarAuth from "@/components/gcal/calendar-auth";
import { Gcal, convertGcalsToTableData } from "@/components/gcal/table/columns";
import { useSearchParams } from "next/navigation";

export default function CalendarPage() {
  const [data, setData] = useState<Gcal[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Gcal[]>([]);
  const { toast } = useToast();
  const driverRef = useRef<any>(null);
  const tourStartedRef = useRef(false); // Track if tour was already started
  const searchParams = useSearchParams();

  type CalendarEvent = {
    date: string;
    time: string;
    name: string;
    calendar: string;
  };

  // Fetch data for the table
  const fetchGcals = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/gcal/calendars");
      const result = await response.json();

      if (result.success) {
        const tableData = convertGcalsToTableData(result.data);
        setData(tableData);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to fetch Calendars");
      console.error("Error fetching Calendars:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarEvents = async (calendarId: string) => {
    try {
      const response = await fetch(`/api/gcal/calendars/${calendarId}/events`);
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        return result.data;
      } else {
        // Return an empty array if no events are found
        return [];
      }
    } catch (err) {
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
      const response = await fetch("/api/gcal/calendars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ calendars: selectedRows }), // Send full objects
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Then fetch events for each selected calendar
      const allEvents = [];
      for (const row of selectedRows) {
        const calendarEvents = await fetchCalendarEvents(row.id);

        if (calendarEvents.length > 0) {
          const formattedEvents = calendarEvents.map((event: any) => ({
            date: event.start.dateTime
              ? new Date(event.start.dateTime).toLocaleDateString()
              : event.start.date,
            time: event.start.dateTime
              ? new Date(event.start.dateTime).toLocaleTimeString()
              : "All Day",
            name: event.summary,
            calendar: row.summary,
          }));
          allEvents.push(...formattedEvents);
        }
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
        description: "Failed to add calendars",
        variant: "destructive",
      });
    }
  };

  // Start Google Calendar tour
  const startGcalTour = (stepIndex = 0) => {
    console.log(`🚀 Starting Google Calendar tour at step ${stepIndex}`);

    const tourSteps = [
      {
        // First step: Authorize Google Calendar button
        element: "#authorize-gcal",
        popover: {
          title: "Authorize Google Calendar",
          description:
            "Connect your Google account to enable calendar integration. Click authorize to proceed with the connection.",
        },
      },
      {
        // Second step: Get Calendars button
        element: "#get-calendars",
        popover: {
          title: "Get Your Calendars",
          description:
            "Fetch all your available calendars from Google to choose which ones to sync.",
        },
      },
      {
        // Third step: Select Calendars button
        element: "#select-calendars",
        popover: {
          title: "Select Your Calendars",
          description:
            "Choose which calendars you want to add. You will receive notifications for upcoming events from these calendars.",
        },
      },
      {
        // Fourth step: Create prioriwise calendar
        element: "#create-prioriwise-calendar",
        popover: {
          title: "Create Prioriwise calendar",
          description:
            "You can schedule your tasks to be done as events in your Prioriwise calendar.",
        },
      },
      {
        // Final step
        element: "#help-button",
        popover: {
          title: "You're All Set!",
          description:
            "You've completed the tour. You can restart it anytime from the help button in your Navbar.",
        },
      },
    ];

    try {
      const driverOptions = {
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayClickNext: false,
        onDestroyed: () => {
          console.log("🏆 GCal tour completed or closed manually");

          // Clear the tour parameter from URL without page reload
          const url = new URL(window.location.href);
          url.searchParams.delete("tour");
          url.searchParams.delete("step");
          window.history.replaceState({}, "", url.toString());
        },
        steps: tourSteps,
      };

      console.log(
        "🔍 Starting tour with steps:",
        tourSteps.map((step) => step.element),
      );
      driverRef.current = driver(driverOptions);
      driverRef.current.drive(stepIndex);
    } catch (error) {
      console.error("❌ Error starting tour:", error);
    }
  };

  // Initialize authentication, fetch data, and check for tour parameter
  useEffect(() => {
    setAuthInitialized(true);
    if (authInitialized) {
      fetchGcals(); // Fetch data only after CalendarAuth is initialized
    }
  }, [authInitialized]);

  // Handle tour initialization - separate from data loading
  useEffect(() => {
    if (authInitialized && !loading && !tourStartedRef.current) {
      // Check if tour should be started
      const tourType = searchParams?.get("tour");
      const tourStep = parseInt(searchParams?.get("step") || "0", 10);

      if (tourType === "gcal") {
        console.log("📣 Tour parameter detected in URL, starting tour");
        tourStartedRef.current = true; // Mark as started

        // Remove the tour parameters from URL to prevent loops
        const url = new URL(window.location.href);
        url.searchParams.delete("tour");
        url.searchParams.delete("step");
        window.history.replaceState({}, "", url.toString());

        // Use setTimeout to ensure DOM is fully loaded
        setTimeout(() => {
          startGcalTour(tourStep);
        }, 1000);
      }
    }
  }, [authInitialized, loading, searchParams]);

  // Cleanup function to destroy driver on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        try {
          driverRef.current.destroy();
        } catch (error) {
          console.error("Error destroying driver:", error);
        }
      }
    };
  }, []);

  // Handle row selection
  const toggleRowSelection = (row: Gcal) => {
    setSelectedRows((prevSelectedRows) =>
      prevSelectedRows.some((selectedRow) => selectedRow.id === row.id)
        ? prevSelectedRows.filter((selectedRow) => selectedRow.id !== row.id)
        : [...prevSelectedRows, row],
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
            <Button
              onClick={handleCreate}
              className="bg-blue-500 hover:bg-blue-600"
              id="select-calendars"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Selected Calendar
            </Button>
          </div>

          {/* Render Calendar Table */}
          <table className="w-full border-collapse border border-gray-200 mb-8">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 text-left">Select</th>
                <th className="border border-gray-300 p-2 text-left">ID</th>
                <th className="border border-gray-300 p-2 text-left">Etag</th>
                <th className="border border-gray-300 p-2 text-left">
                  Summary
                </th>
                <th className="border border-gray-300 p-2 text-left">
                  Timezone
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  className={`border border-gray-300 ${
                    selectedRows.some(
                      (selectedRow) => selectedRow.id === row.id,
                    )
                      ? "bg-blue-100"
                      : ""
                  }`}
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.some(
                        (selectedRow) => selectedRow.id === row.id,
                      )}
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

          {/* Render Events Table */}
          {events.length > 0 ? (
            <>
              <h3 className="text-xl font-semibold mb-4">Calendar Events</h3>
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">
                      Date
                    </th>
                    <th className="border border-gray-300 p-2 text-left">
                      Time
                    </th>
                    <th className="border border-gray-300 p-2 text-left">
                      Event Name
                    </th>
                    <th className="border border-gray-300 p-2 text-left">
                      Calendar Name
                    </th>
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
          ) : (
            <p>No events found for the selected calendars.</p> // Fallback message
          )}
        </div>
      )}
    </div>
  );
}

