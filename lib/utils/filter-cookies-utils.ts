"use client";

// This file handles saving and retrieving filter settings from cookies

/**
 * Save filters to cookies
 * @param filters The filters object to save
 * @param activeWellnessMood The active wellness mood (if any)
 */
export function saveFiltersToCookies(
  filters: Record<string, any>,
  activeWellnessMood: string | null = null
) {
  // Convert filters to a JSON string
  const filtersJson = JSON.stringify(filters);
  
  // Store in localStorage (fallback for cookies)
  try {
    localStorage.setItem('jobFilters', filtersJson);
    if (activeWellnessMood) {
      localStorage.setItem('activeWellnessMood', activeWellnessMood);
    } else {
      localStorage.removeItem('activeWellnessMood');
    }
  } catch (error) {
    console.error('Error saving filters to localStorage:', error);
  }
}

/**
 * Load filters from cookies
 * @returns Object containing filters and activeWellnessMood
 */
export function loadFiltersFromCookies(): { 
  filters: Record<string, any>;
  activeWellnessMood: string | null;
} {
  try {
    // Load from localStorage (fallback for cookies)
    const filtersJson = localStorage.getItem('jobFilters');
    const activeWellnessMood = localStorage.getItem('activeWellnessMood');
    
    return {
      filters: filtersJson ? JSON.parse(filtersJson) : {},
      activeWellnessMood: activeWellnessMood
    };
  } catch (error) {
    console.error('Error loading filters from localStorage:', error);
    return { filters: {}, activeWellnessMood: null };
  }
}

/**
 * Clear all saved filters
 */
export function clearSavedFilters() {
  try {
    localStorage.removeItem('jobFilters');
    localStorage.removeItem('activeWellnessMood');
  } catch (error) {
    console.error('Error clearing saved filters:', error);
  }
}