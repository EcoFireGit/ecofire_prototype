import { google } from 'googleapis';
import GCalAuth from '../models/gcal-auth.model';
import * as moment from 'moment-timezone';

import dbConnect from '../mongodb';
import getCalendar from './google.calendar.provider';


async function createEvent(userId: string, eventData: any) {    

    try {
    await dbConnect();
    const prioriwiseCalendarExists = await getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

    const calendar = await getCalendar(prioriwiseCalendarExists.auth);
    const calendarId = prioriwiseCalendarExists.prioriwiseCalendar.id;
    //extract to provider class
    const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: eventData
    });
    return response.data;
    
  }catch(error: any){
    if(error.code === 404){
      throw new Error('Calendar not found', error);
    }
    console.log("Error in createEvent: ", error);
    throw error;
  }
}

export async function updateEvent(userId: string, eventId: string, updatedEventDetails: any) {

  try {
    await dbConnect();
    const prioriwiseCalendarExists = await getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

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
  } catch(error: any){
    if(error.code === 404){
      throw new Error('Calendar or Event not found', error);
    }
    console.log("Error in updateEvent: ", error);
    throw error
  }
}


export async function deleteEvent(userId: string, eventId: string) {
  try {
    await dbConnect();
    const prioriwiseCalendarExists = await getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

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

export async function getAllEventsForTwoWeeks(userId: string) {
  try {
    await dbConnect();
    const prioriwiseCalendarExists = await getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

    const calendar = await getCalendar(prioriwiseCalendarExists.auth);
    const calendarId = prioriwiseCalendarExists.prioriwiseCalendar.id;


    // Calculate the start and end of the current week (Sunday to Saturday)
    const now = moment().startOf('week');  // Get the start of the current week (Sunday)
    const startOfWeek = now.toISOString(); // Start of the week (e.g., Sunday at 00:00)
    const endOfWeekInTwoWeeks = now.add(2, 'weeks').endOf('week').toISOString();

    // Fetch events from the calendar
    const res = await calendar.events.list({
      calendarId: calendarId, // Use 'primary' for the primary calendar
      timeMin: startOfWeek, // Events starting after this time
      timeMax: endOfWeekInTwoWeeks,   // Events ending before this time
      singleEvents: true,   // Ensure events that repeat are expanded
      orderBy: 'startTime', // Order by start time
    });

    const events = res.data.items;
    
    return events;
  } catch (error) {
    console.error('Error retrieving events:', error);
    throw error;
  }
}

async function getCalendarAuthForUserIfPrioriwiseCalendarExists(userId: string) {
  const prioriwiseCalendarExists = await GCalAuth.findOne({ userId: userId, prioriwiseCalendar: { $ne: null } });
  if (!prioriwiseCalendarExists || !prioriwiseCalendarExists.prioriwiseCalendar || !prioriwiseCalendarExists.prioriwiseCalendar.id) {
    throw new Error('either user or Prioriwise Calendar not connected');
  }
  return prioriwiseCalendarExists;
}

export default createEvent;

