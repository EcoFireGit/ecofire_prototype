export function calculateTimeElapsed(startDate: Date, endDate: Date): string {
  
  const start = new Date(startDate);
  const end = new Date(endDate);

  
  const diffMs = end.getTime() - start.getTime();

  
  const diffSeconds = Math.floor(diffMs / 1000);

  
  if (diffSeconds < 60) {
    return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''}`;
  }
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  
}