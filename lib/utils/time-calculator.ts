export function calculateTimeElapsed(startDate: Date, endDate: Date): string {
  console.log("=== calculateTimeElapsed Debug ===");
  console.log("Start date:", startDate);
  console.log("End date:", endDate);
  console.log("Start date type:", typeof startDate);
  console.log("End date type:", typeof endDate);
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  console.log("Converted start:", start);
  console.log("Converted end:", end);
  
  const diffMs = end.getTime() - start.getTime();
  console.log("Difference in ms:", diffMs);
  
  const diffSeconds = Math.floor(diffMs / 1000);
  console.log("Difference in seconds:", diffSeconds);
  
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
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}`;
  }
  
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
}