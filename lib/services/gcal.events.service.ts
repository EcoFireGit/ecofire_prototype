import { google } from 'googleapis';
import GCalAuth from '../models/gcal-auth.model';
import {  getAllEventsForTwoWeeks } from './google.calendar.provider';


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
    
  }catch(error){
    if (isErrorWithCode(error) && error.code === 404) {
      throw new Error('Calendar not found');
    }
    console.log("Error in createEvent: ", error);
    throw error;
  }
}

function isErrorWithCode(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && 'code' in error;
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
  } catch(error){
    if (isErrorWithCode(error) && error.code === 404) {
      throw new Error('Calendar or Event not found');
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

export async function getPrioriwiseEvents(userId: string) {
  try {
    await dbConnect();
    const prioriwiseCalendarExists = await getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

    const events = await getAllEventsForTwoWeeks(prioriwiseCalendarExists.auth, prioriwiseCalendarExists.prioriwiseCalendar.id);
    
    return events;
  } catch (error) {
    console.error('Error retrieving events:', error);
    throw error;
  }
}

export async function getPrioriwiseCalendarEvents(userId: string, calendarId: string) {
  try {
    await dbConnect();
    const prioriwiseCalendarExists = await getCalendarAuthForUserIfPrioriwiseCalendarExists(userId);

    const events = await getAllEventsForTwoWeeks(prioriwiseCalendarExists.auth, calendarId);    
    return events;
  } catch (error) {
    console.error('Error retrieving events for calendar {}:', calendarId, error);
    throw error;
  }
}
export async function getCalendarEvents(userId: string, calendarId: string) {
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

async function getCalendarAuthForUserIfPrioriwiseCalendarExists(userId: string) {
  const prioriwiseCalendarExists = await GCalAuth.findOne({ userId: userId, prioriwiseCalendar: { $ne: null } });
  if (!prioriwiseCalendarExists || !prioriwiseCalendarExists.prioriwiseCalendar || !prioriwiseCalendarExists.prioriwiseCalendar.id) {
    throw new Error('either user or Prioriwise Calendar not connected');
  }
  return prioriwiseCalendarExists;
}

export default createEvent;

