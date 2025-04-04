import { redirect } from 'next/navigation';
import { useState } from 'react';

export default function useCalendar() {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isGetting, setIsGetting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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

  const handleGetCalenders = async () => {
    setIsGetting(true);
    try {
      const response = await fetch('/api/gcal/calendars');
      
      if (response.ok) {
        const data = await response.json();

        console.log("response: " + JSON.stringify(data.data));
        //console.log("Console: use-calendar" + response.json().authUrl);
        // const calendarsResponse = await fetch('/api/gcal/calendars');
        // const calendarsData = await calendarsResponse.json();
     //  setCalendars(calendarsData);
      }
    } catch (error) {
      console.error('Error pulling Calendars failed:', error);
    } finally {
      setIsGetting(false);
    }
  };


  const handleCreatePrioriCalendar = async () => {
    setIsCreating(true);
    try {

      const response = await fetch('/api/gcal/calendars/prioriwise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { name: 'Prioriwise' } }),
      });      
      if (response.ok) {
        const data = await response.json();
        console.log("response: " + JSON.stringify(data));

      }
    } catch (error) {
      console.error('Error Creating  Prioriwise failed:', error);
    } finally {
      setIsCreating(false);
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
    isGetting,
    isCreating,
    calendars,
    selectedCalendars,
    events,
    handleAuth,
    handleGetCalenders,
    handleCreatePrioriCalendar,
    handleCalendarSelect,
    handleGetEvents
  };
}
