import { google, calendar_v3 } from 'googleapis';
import GCalAuth from '../models/gcal-auth.model';
import {  getAllEventsForTwoWeeks } from './google.calendar.provider';


import dbConnect from '../mongodb';
import getCalendar from './google.calendar.provider';


export class EventsService {

 async  createEvent(userId: string, eventData: any) {    

    try {
    await dbConnect();
    const prioriwiseCalendarExists = await this.getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

    const calendar = await getCalendar(prioriwiseCalendarExists.auth);
    const calendarId = prioriwiseCalendarExists.prioriwiseCalendar.id;
    //extract to provider class
    const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: eventData
    });
    return response.data;
    
  }catch(error){
    if (this.isErrorWithCode(error) && error.code === 404) {
      throw new Error('Calendar not found');
    }
    console.log("Error in createEvent: ", error);
    throw error;
  }
}

 isErrorWithCode(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

 async  updateEvent(userId: string, eventId: string, updatedEventDetails: any) {

  try {
    await dbConnect();
    const prioriwiseCalendarExists = await this.getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

    const calendar = await getCalendar(prioriwiseCalendarExists.auth);
    const calendarId = prioriwiseCalendarExists.prioriwiseCalendar.id;
    const event = await calendar.events.get({
        calendarId: calendarId,
        eventId: eventId
    });

    /// Update the event with new details
    const updatedEvent = {
      ...event.data,
      ...updatedEventDetails,  // Merge the updates
    };

      // Call the API to update the event
    const res = await calendar.events.update({
      calendarId: calendarId, 
      eventId: eventId, // The ID of the event you're updating
      requestBody: updatedEvent, // The updated event details
    });
    return res.data;
  } catch(error){
    if (this.isErrorWithCode(error) && error.code === 404) {
      throw new Error('Calendar or Event not found');
    }
    console.log("Error in updateEvent: ", error);
    throw error
  }
}


async  deleteEvent(userId: string, eventId: string) {
  try {
    await dbConnect();
    const prioriwiseCalendarExists = await this.getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

      const calendar = await getCalendar(prioriwiseCalendarExists.auth);
      const calendarId = prioriwiseCalendarExists.prioriwiseCalendar.id;

      // Call the API to delete the event
      await calendar.events.delete({
        calendarId: calendarId, 
        eventId: eventId, // The ID of the event to be deleted
      });

  }catch (error) {
    console.error('Error deleting event: ', error);
    throw error;
  }
}

async  getPrioriwiseEvents(userId: string) {
  try {
    await dbConnect();
    const prioriwiseCalendarExists = await this.getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

    const events = await getAllEventsForTwoWeeks(prioriwiseCalendarExists.auth, prioriwiseCalendarExists.prioriwiseCalendar.id);
    
    return events;
  } catch (error) {
    console.error('Error retrieving events:', error);
    throw error;
  }
}

async getPrioriwiseCalendarEvents(userId: string, calendarId: string) {
  try {
    await dbConnect();
    const prioriwiseCalendarExists = await this.getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

    const events = await getAllEventsForTwoWeeks(prioriwiseCalendarExists.auth, calendarId);    
    return events;
  } catch (error) {
    console.error('Error retrieving events for calendar {}:', calendarId, error);
    throw error;
  }
}

async  getCalendarEvents(userId: string, calendarId: string) {
  try {
    await dbConnect();
    const calendarAuth = await GCalAuth.findOne({ userId: userId});
    if (!calendarAuth || !calendarAuth.auth) {
      throw new Error('either user does not exist or calendar not connected');
    }
  
    const events = await getAllEventsForTwoWeeks(calendarAuth.auth, calendarId);    
    return events;
  } catch (error) {
    console.error('Error retrieving events for calendar {}:', calendarId, error);
    throw error;
  }
}
 async getUpcomingCalendarEventsFor(userId: string): Promise<calendar_v3.Schema$Event[]> {
  try {
    await dbConnect();
    const calendarAuth = await GCalAuth.findOne({ userId: userId});
    if (!calendarAuth || !calendarAuth.auth) {
      console.log("calendars not connected for user: ", userId);
      return [];
    }
    if (!calendarAuth.calendars || calendarAuth.calendars.length === 0) {
      console.log("calendars not selected for : ", userId);
      return [];
    }
    
    console.log("continuing for user: ", userId);
    const allEvents =[];
    const max_hours = 2; // Define max_hours with an appropriate value
    //calendarIds
    const calendarIds = calendarAuth.calendars.map((calendar: { id: string }) => calendar.id);
    for (const calendarId of calendarIds) {
      const events = await this.getAllEventsFor(calendarAuth.auth, calendarId);
      if (events) {
        allEvents.push(...events);
      }
    }
    console.log("all events for user {}: ", userId, allEvents.length);
    return allEvents;
  } catch (error) {
    console.error('Error retrieving upcoming for user {}:', userId, error);
    throw error;
  }
}

async getCalendarAuthForUserIfPrioriwiseCalendarExists(userId: string) {
  const prioriwiseCalendarExists = await GCalAuth.findOne({ userId: userId, prioriwiseCalendar: { $ne: null } });
  if (!prioriwiseCalendarExists || !prioriwiseCalendarExists.prioriwiseCalendar || !prioriwiseCalendarExists.prioriwiseCalendar.id) {
    throw new Error('either user or Prioriwise Calendar not connected');
  }
  return prioriwiseCalendarExists;
}


async  getAllEventsFor(auth: any, calendarId: any): Promise<calendar_v3.Schema$Event[]|null> {
  try {
    const calendar = await getCalendar(auth);
    const now = new Date();
  
    const max_hours = Number(process.env.REPRIORITIZE_EVENT_TIME_IN_HOURS!);
    if (isNaN(max_hours)) {
      throw new Error('REPRIORITIZE_EVENT_TIME_IN_HOURS must be a valid number');
    }
  
    const endTime = new Date(now.getTime() + max_hours * 60 * 60 * 1000); // Add max_hours to current time
    const startTime = now.toISOString();
    const endTimeISO = endTime.toISOString();
    const res = await calendar.events.list({
      calendarId: calendarId, 
      timeMin: startTime, // Events starting after this time
      timeMax: endTimeISO,   // Events ending before this time
      singleEvents: true,   // Ensure events that repeat are expanded
      orderBy: 'startTime', // Order by start time
    });
    const events = res.data.items || null;
    return events;
  } catch (error) {
    console.error('Error retrieving events:', error);
    throw error;
  }
}
  
}


