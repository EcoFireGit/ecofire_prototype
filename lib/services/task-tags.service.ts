// services/task-tag.service.ts

/**
 * Saves tags to the database when a task is submitted
 * @param tags Array of tag strings to save
 * @returns Promise that resolves when all tags are saved
 */
export async function saveTags(tags: string[]): Promise<void> {
    try {
      // Process all tags in parallel
      await Promise.all(
        tags.map(async (tag) => {
          await fetch('/api/task-tags', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: tag }),
          });
        })
      );
    } catch (error) {
      console.error('Error saving tags:', error);
    }
  }