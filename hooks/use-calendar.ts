import { redirect } from 'next/navigation';
import { useState } from 'react';

export default function useCalendar() {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const handleAuth = async () => {
    setIsAuthorizing(true);
    try {
      const response = await fetch('/api/gcal/auth');
      
      if (response.ok) {
        const data = await response.json();
        console.log("console: " + data.authUrl);
        window.open(data.authUrl);
        //console.log("Console: use-calendar" + response.json().authUrl);
        // const calendarsResponse = await fetch('/api/gcal/calendars');
        // const calendarsData = await calendarsResponse.json();
     //  setCalendars(calendarsData);
      }
    } catch (error) {
      console.error('Authorization failed:', error);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleCalendarSelect = (calendarId: string) => {
    setSelectedCalendars(prev => 
      prev.includes(calendarId)
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId]
    );
  };

  const handleGetEvents = async () => {
    try {
      const response = await fetch('/api/gcal/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendars: selectedCalendars })
      });
      const eventsData = await response.json();
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  return {
    isAuthorizing,
    calendars,
    selectedCalendars,
    events,
    handleAuth,
    handleCalendarSelect,
    handleGetEvents
  };
}
