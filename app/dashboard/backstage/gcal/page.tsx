import CalendarAuth from '@/components/gcal/calendar-auth';

export default function CalendarPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Calendar Integration</h1>
       <CalendarAuth /> 
    </div>
  );
}
