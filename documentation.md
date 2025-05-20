# EcoFire Prototype Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Setup and Installation](#setup-and-installation)
5. [Features](#features)
6. [Component Documentation](#component-documentation)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [Authentication](#authentication)
10. [State Management](#state-management)
11. [Settings Feature](#settings-feature)
12. [Organization Feature](#organization-feature)
13. [Sorting and Filtering](#sorting-and-filtering)
14. [Onboarding Tour](#onboarding-tour)
15. [Calendar Integration](#calendar-integration)
16. [Unit Testing](#unit-testing)


## Project Overview
EcoFire Prototype is a job management system built with Next.js, featuring active and completed jobs tracking. The application uses MongoDB for data storage and Clerk for authentication.

## Technology Stack
- **Frontend**: Next.js 15.1.6, React 19
- **Database**: MongoDB with Mongoose
- **Authentication**: Clerk
- **UI Components**: shadcn/ui, Radix UI
- **Styling**: TailwindCSS
- **Table Management**: TanStack Table
- **Tour System**: Driver.js
- **Development**: TypeScript

## Project Structure
```
ECOFIRE_PROTOTYPE/
├── .next/
├── app/
│   ├── api/                    # API routes
│   ├── dashboard/              # Dashboard pages
│   └── backstage/              # Backstage pages including Calendar
├──components/                  # Shared components
│   ├── business-funtions/      # Business function components
│   ├── dashboard/              # Dashboard components
│   ├── jobs/                   # Job management components
│   ├── onboarding/             # Onboarding tour components
│   └── ui/                    # UI components (shadcn)
├── hooks/                    # Custom React hooks
├── lib/                     # Utility functions and services
│   ├── models/             # MongoDB models
│   ├── services/          # Business logic services
│   ├── contexts/         # React contexts
│   └── mongodb.ts        # MongoDB connection
└── public/               # Static assets
```

## Setup and Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm i
   ```
3. Set up environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-key>
   CLERK_SECRET_KEY=<your-key>
   MONGODB_URI=<your-mongodb-uri>
   ```
4. Run development server:
   ```bash
   npm run dev
   ```

## Features

### Job Management
- **Active Jobs Table**
  - Create, Read, Update, Delete (CRUD) operations
  - Job status tracking
  - Notes and business function assignment
  - Bulk completion of jobs
  
- **Completed Jobs Table**
  - View completed jobs
  - Delete completed jobs
  - No editing capability for completed jobs

### Job Properties
- Title (required)
- Notes (optional)
- Owner (optional)
- Business Function (optional)
- Due Date (optional)
- isDone status

## Component Documentation

### JobDialog Component
Location: `components/jobs/job-dialog.tsx`
- Purpose: Creates and edits job entries
- Props:
  ```typescript
  interface JobDialogProps {
    mode: 'create' | 'edit';
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (job: Partial<Job>) => void;
    initialData?: Job;
  }
  ```

### DataTable Component
Location: `components/jobs/table/jobs-table.tsx`
- Purpose: Reusable table component with row selection
- Features:
  - Row selection
  - Custom column rendering
  - Responsive design

### OrganizationSwitcher Component
Location: `components/organizations/OrganizationSwitcher.tsx`
- Purpose: Provides UI for switching between personal and organization views
- Features:
  - Dropdown for organization selection
  - Truncated organization names for better UI
  - Handles view switching process

### FilterComponent
Location: `components/jobs/filter-component.tsx`
- Purpose: Provides UI for filtering jobs
- Features:
  - Multiple filter options (hours required, focus level, joy level, etc.)
  - Notifies parent component of filter changes
  - Responsive design

### SortingComponent
Location: `components/jobs/sorting-component.tsx`
- Purpose: Manages sort options and performs sorting of job data
- Features:
  - Multiple sort options (recommended, due date, hours required)
  - Automatic sorting reset when filters change
  - Custom sort logic for different job properties

### OnboardingContext
Location: `lib/contexts/onboarding-context.tsx`
- Purpose: Manages tour state across the application
- Features:
  - Stores tour completion status in localStorage
  - Provides methods to start, stop, and reset the tour
  - Makes tour state available to all components

### TourController
Location: `components/onboarding/tour-controller.tsx`
- Purpose: Controls when the tour is rendered
- Features:
  - Handles accessibility features (ESC key to exit)
  - Mounts/unmounts the DriverTour component
  - Manages the tour lifecycle

### DriverTour
Location: `components/onboarding/driver-tour.tsx`
- Purpose: Implements the main tour using driver.js
- Features:
  - Defines tour steps for the main dashboard
  - Handles redirection to the Google Calendar page
  - Customizable tour configurations

## API Documentation

### Jobs API

#### GET /api/jobs
- Returns all jobs for authenticated user
- Filters based on isDone status

#### POST /api/jobs
- Creates new job
- Required fields: title

#### PUT /api/jobs/[id]
- Updates existing job
- Supports partial updates

#### DELETE /api/jobs/[id]
- Deletes specified job

### Organizations API

#### GET /api/organizations
- Returns all organizations the user belongs to

#### POST /api/organizations
- Creates a new organization
- Adds the user as admin
- Required fields: name

## Database Schema

### Job Model
```typescript
interface Jobs extends mongoose.Document {
  _id: string;
  title: string;
  notes?: string;
  owner?: string;
  businessFunction?: string;
  tasks?: object[];
  userId: string;
  dueDate?: Date;
  isDone: boolean;
}
```

### Organization Model
```typescript
interface Organization extends mongoose.Document {
  _id: string;
  name: string;
  description?: string;
  isDeleted: boolean;
}
```

### UserOrganization Model
```typescript
interface UserOrganization extends mongoose.Document {
  userId: string;
  organizationId: string;
  role: 'admin' | 'member';
}
```

## Authentication
- Implemented using Clerk
- User ID is required for all job operations
- Authentication state is managed through Clerk's hooks and middleware
- Organization view managed via cookies

## State Management
- Local state management using React hooks
- Table selection state managed by TanStack Table
- Toast notifications for user feedback
- Modal state for job creation/editing
- View context for organization switching
- Filter and sort state management in JobsPage
- Onboarding tour state managed through context

## Best Practices
1. Always use TypeScript types for components and data
2. Implement error handling for API calls
3. Use loading states for async operations
4. Maintain separation of concerns between components
5. Follow the container/presentational pattern

## Common Tasks

### Adding a New Field to Jobs
1. Update the Job interface in `lib/models/job.model.ts`
2. Update the MongoDB schema
3. Add the field to the job dialog form
4. Update the table columns definition
5. Update any relevant API handlers

### Implementing a New Feature
1. Create necessary components in the appropriate directory
2. Add required API routes
3. Update database models if needed
4. Implement UI components using shadcn/ui
5. Add proper types and error handling

### Implementing a New Table
1. Create the DB model for the table, e.g., `lib/models/owner.model.ts`
2. Create a service for the table, e.g., `lib/services/owner.service.ts`
3. Create API routes for reading and adding entries in the table, e.g., `api/owners/route.ts`
4. Create API routes for updating and deleting existing entries in the table, e.g., `api/owners[id]/route.ts`
5. Create table components and columns for displaying the table in the app, e.g., `components/owners/table/columns.tsx` and `components/owners/table/owners-table.tsx`
6. Create dialog components to add and edit existing entries in the table, e.g., `components/owners/create-dialog.tsx` and `components/owners/edit-dialog.tsx`
   - Alternatively, you can create a single dialog box to combine create and edit functionality, e.g., `components/owners/owner-dialog.tsx`
7. Create a page to display the table in the app, e.g., `app/dashboard/owners/page.tsx`
8. Update the link in `components/dashboard/app-sidebar.tsx` to point to the appropriate page when clicked

## Settings Feature

### Overview
The Settings page provides control over advanced features and UI options. Currently manages:

1. **Backstage Access**: Controls visibility of advanced administrative features
2. **Jobs Table View**: Toggles the display of a view switcher in the Jobs Feed

### Technical Implementation

#### User Preferences Model
```typescript
// models/user-preferences.js
interface UserPreferences extends mongoose.Document {
  _id: string;
  userId: string;
  enableBackstage: boolean;
  enableTableView: boolean;
}
```

#### Service Layer
```typescript
// lib/services/user-preferences.service.js
export class UserPreferencesService {
  async getUserPreferences(userId: string) {...}
  async updateUserPreferences(userId: string, updates: Partial<{ 
    enableBackstage: boolean, 
    enableTableView: boolean 
  }>) {...}
}
```

#### API Routes
- **GET /api/user/preferences**: Retrieves user preferences
- **PATCH /api/user/preferences**: Updates user preferences

#### Implementation Details

##### Settings Page
- Located at `/dashboard/settings`
- Uses Toggle UI components with visual feedback
- Auto-refreshes when Backstage access is toggled

##### AppSidebar Component
```typescript
// components/dashboard/app-sidebar.tsx
const [userPreferences, setUserPreferences] = useState({
  enableBackstage: false,
  enableTableView: false
});

// Render backstage conditionally
{userPreferences.enableBackstage && (
  <Collapsible className="group/collapsible">
    {/* Backstage menu items */}
  </Collapsible>
)}
```

##### Jobs Page View Switcher
```typescript
// Modified JobsPage component
const [isTableViewEnabled, setIsTableViewEnabled] = useState(false);

// In the useEffect
const fetchUserPreferences = async () => {
  try {
    const response = await fetch("/api/user/preferences");
    const result = await response.json();
    setIsTableViewEnabled(result.data.enableTableView);
    
    // Force grid view if table view is disabled
    if (!result.data.enableTableView) {
      setViewMode("grid");
    }
  } catch (error) {
    console.error("Failed to fetch user preferences:", error);
  }
};

// In the render function
{isTableViewEnabled && (
  <div className="flex items-center border rounded-md overflow-hidden mr-2">
    {/* Grid/Table view switcher buttons */}
  </div>
)}
```

### Adding New User Preferences

1. Update the `UserPreferences` model with the new preference
2. Add the preference to the `updateUserPreferences` method validation
3. Add UI components to the Settings page
4. Implement the feature logic in relevant components

## Organization Feature

### Overview
The organization feature allows users to switch between their personal view and organization views. This functionality enables collaboration within organizations while maintaining a separation between personal and organizational data.

### Key Components

#### 1. Data Models

**Organization Model** (`lib/models/organization.model.ts`)
* Stores organization information (name, description)
* Includes soft delete functionality with `isDeleted` flag
* Created and maintained by organization admins

**UserOrganization Model** (`lib/models/userOrganization.model.ts`)
* Defines the relationship between users and organizations
* Stores user roles within organizations (`admin` or `member`)
* Uses a compound index to ensure a user can only be added to an organization once

#### 2. Services

**OrganizationService** (`lib/services/organization.service.ts`)
* Handles CRUD operations for organizations
* Provides methods to:
   * Get organizations for a user
   * Create/update/delete organizations
   * Only allows organization admins to perform update/delete operations

**UserOrganizationService**
* Manages user-organization relationships
* Handles adding users to organizations and checking user roles

#### 3. Context Provider

**ViewContext** (`lib/contexts/view-context.tsx`)
* React context provider for organization data
* Maintains state for:
   * Current view ID (personal or organization)
   * Organization list
   * Current organization
* Provides a method to switch between views

#### 4. UI Components

**OrganizationSwitcher** (`OrganizationSwitcher.tsx`)
* Dropdown UI for switching between personal and organization views
* Handles the view switching process
* Displays truncated organization names for better UI

#### 5. Authentication & Session Management

**Authentication Utilities** (`lib/utils/auth-utils.ts`)
* Uses Clerk for authentication
* Validates user authorization on each request
* Manages organization view via cookies
* Ensures users only access organizations they're members of

**Active Organization Cookie**
* Name: `ecofire_active_org`
* Stores the ID of the active organization or `null` for personal view
* Validated on each request to ensure it remains valid

#### 6. API Routes

**Organizations API** (`app/api/organizations/route.ts`)
* GET: Retrieves organizations the user belongs to
* POST: Creates a new organization and adds the user as admin

**Active Organization API**
* Manages the user's active organization view
* Sets cookies to persist the selection

### Flow of Operation

1. On application load, `ViewProvider` fetches user's organizations
2. The provider checks for an active organization in session
3. Users can switch organizations via the `OrganizationSwitcher` component
4. When switching, the application:
   * Updates the active organization cookie
   * Clears saved filters
   * Reloads the page with the new organization context
5. All subsequent API requests use `validateAuth()` to determine the current view context
6. The `userId` provided by `validateAuth()` is actually the `viewId`, which changes based on active organization

### Important Implementation Details

**View Context vs. Actual User ID**
* `currentViewId`: Can be either the user's ID (personal view) or an organization ID
* `actualUserId`: Always the user's ID, regardless of current view
* API routes use `validateAuth()` to distinguish between the two

**Cookie Validation**
* Active organization cookies are validated on each request
* If a user's access to an organization is revoked, they're automatically switched back to personal view

**Organization Switching**
* Organization switching triggers a full page reload to refresh all data
* Application clears saved filters when switching organizations

## Sorting and Filtering

### Overview

The sorting and filtering system provides a comprehensive way to manage and display jobs based on user preferences. This functionality is implemented through a coordinated system of components that manage the data flow and user interactions.

### Component Architecture

The filtering and sorting system consists of three main components:

1. **JobsPage** - The parent component that manages the state and coordinates filtering and sorting
2. **FilterComponent** - Handles user selection of filters and notifies the parent of changes
3. **SortingComponent** - Manages sort options and performs the actual sorting of job data

### Data Flow

```
┌────────────────────────────────────────────────────────────────┐
│ JobsPage                                                        │
│                                                                 │
│ ┌─────────────┐         ┌─────────────┐         ┌─────────────┐ │
│ │ activeJobs  │────────▶│ filtered    │────────▶│ sorted      │ │
│ │             │  filter │ ActiveJobs  │   sort  │ ActiveJobs  │ │
│ └─────────────┘         └─────────────┘         └─────────────┘ │
│                                                        │        │
│                                                        ▼        │
│                                                  Rendered to UI │
│                                                                 │
│ ┌──────────────┐       ┌───────────────┐       ┌───────────────┐│
│ │ FilterComponent│     │SortingComponent│      │JobsGrid/Table  ││
│ └──────────────┘       └───────────────┘       └───────────────┘│
└────────────────────────────────────────────────────────────────┘
```

### Key State Variables in JobsPage

- `activeJobs` - Original list of active jobs
- `filteredActiveJobs` - Jobs after filters are applied
- `sortedActiveJobs` - Jobs after sorting is applied (rendered to UI)
- `activeFilters` - Current active filters

### Filtering Process

1. User selects filters in the FilterComponent
2. FilterComponent calls `onFilterChange` with filter criteria
3. JobsPage's `handleFilterChange` processes the filters:
   - Updates `activeFilters` state
   - Filters jobs using `matchesFilters` helper function
   - Updates `filteredActiveJobs`
   - Applies recommended sorting to filtered jobs
   - Updates `sortedActiveJobs`

### Sorting Process

1. User selects a sort option in SortingComponent
2. Or filtering occurs, which automatically resets to "recommended" sort
3. SortingComponent's `sortJobs` method sorts the jobs based on criteria
4. SortingComponent calls `onSortChange` with sorted jobs
5. JobsPage updates `sortedActiveJobs` state
6. Sorted jobs are rendered to UI

### Notable Functionality

#### Automatic Sorting Reset

When filters change, the SortingComponent automatically resets to "recommended" sorting:

```typescript
// In SortingComponent
useEffect(() => {
  if (jobs.length > 0) {
    sortJobs("recommended");
    setSortOption("recommended");
  }
}, [jobs]);
```

#### Sort Types

Currently supported sort options:
- `recommended` - Due date (ascending), then impact (descending)
- `dueDate-asc` - Due date (ascending)
- `dueDate-desc` - Due date (descending)
- `hoursRequired-asc` - Hours required (ascending)
- `hoursRequired-desc` - Hours required (descending)

#### Filter Types

Currently supported filter options:
- Hours required range
- Focus level
- Joy level
- Business function
- Owner
- Tags

### Extension Points

#### Adding New Sort Options

1. Add a new option to the `SortOption` type in SortingComponent
2. Add sort logic in the `sortJobs` method
3. Add UI elements in the component return statement
4. Add icon and label in the `getOptionDetails` helper function

Example:
```typescript
// Add to SortOption type
export type SortOption = "recommended" | ... | "newSortOption";

// Add case in sortJobs
case "newSortOption":
  sortedJobs.sort((a, b) => {
    // Custom sort logic
  });
  break;

// Add to getOptionDetails
case "newSortOption":
  return { label: "New Sort Option", icon: <Icon /> };

// Add UI element
<SelectItem value="newSortOption">
  <div className="flex items-center">
    <Icon className="h-4 w-4 mr-2" />
    New Sort Option
  </div>
</SelectItem>
```

#### Adding New Filter Options

1. Add UI elements to FilterComponent
2. Update filter handling in the component
3. Add case in `matchesFilters` function in JobsPage

Example:
```typescript
// In matchesFilters
case "newFilter":
  if (job.newFilterProperty !== value) matches = false;
  break;
```

### Best Practices

1. **State Management**: Keep sorting and filtering logic in the parent component
2. **Performance**: Avoid unnecessary re-renders by only updating state when needed
3. **Extensibility**: Follow the established patterns when adding new features
4. **Error Handling**: Provide default values for all properties used in sorting/filtering
5. **User Experience**: When filters change, automatically reset sorting to "recommended"

### Common Issues and Solutions

- **Problem**: Selected sort option resets when filters change
  - **Solution**: This is intentional; filters should always default to recommended sort
  - **Override**: If you want different behavior, modify the SortingComponent's useEffect dependency array

- **Problem**: Sort not applying to newly filtered jobs
  - **Solution**: Ensure sorting is applied immediately after filtering
  - **Check**: Look at handleFilterChange to make sure sorting is applied after filtering

- **Problem**: Filter doesn't affect certain job properties
  - **Solution**: Update the matchesFilters function to handle the property correctly

## Onboarding Tour

### Overview

The onboarding tour is a guided walkthrough for new users implemented using Driver.js. It highlights key UI elements across multiple pages and provides explanatory tooltips. The tour starts on the main dashboard and continues on the Google Calendar page.

### Component Structure

The tour system consists of three core components:

1. **OnboardingContext** (`onboarding-context.tsx`)
   * Manages tour state (active/inactive, completion status)
   * Provides methods to start, end, and reset the tour
   * Persists tour completion status in localStorage

2. **TourController** (`tour-controller.tsx`)
   * Controls when the tour is rendered
   * Handles accessibility features like ESC key to exit
   * Mounts/unmounts the DriverTour component

3. **DriverTour** (`driver-tour.tsx`)
   * Implements the main tour using driver.js
   * Defines tour steps for the main dashboard
   * Handles redirection to the Google Calendar page

4. **Google Calendar Page** (`CalendarPage`)
   * Detects URL parameters to continue the tour
   * Implements its own tour steps for the Calendar features

### Multi-Page Tour Implementation

The tour spans multiple pages through URL parameters:

1. The main tour (`DriverTour`) highlights elements on the dashboard
2. When the user reaches the Calendar step and clicks "Go to Calendar":
   * The tour is destroyed
   * The user is redirected to `/backstage/gcal?tour=gcal&step=0`
3. The Calendar page detects these parameters and starts its own tour
4. A `tourStartedRef` prevents the tour from starting multiple times

### Tour Steps

#### Main Dashboard Tour
* Jobs & Tasks section
* Organization View toggle
* Jija assistant
* Wellness Check
* Google Calendar integration (with redirection)

#### Google Calendar Tour
* Authorize Google Calendar button
* Get Calendars button
* Add Selected Calendar button
* Completion message

### How to Modify the Tour

#### Adding/Modifying Steps on Main Dashboard

1. Edit the `mainTourSteps` array in `driver-tour.tsx`:

```typescript
const mainTourSteps = [
  {
    element: '#element-id',  // CSS selector for the element
    popover: {
      title: 'Step Title',
      description: 'Step description text'
    }
  },
  // Additional steps...
];
```

#### Adding/Modifying Steps on Google Calendar Page

1. Edit the `tourSteps` array in the `startGcalTour` function:

```typescript
const tourSteps = [
  {
    element: '#element-id',
    popover: {
      title: 'Step Title',
      description: 'Step description text'
    }
  },
  // Additional steps...
];
```

#### Adding Additional Pages to the Tour

1. Use the URL parameter approach to link pages:
   * In the "last" step of your page, add an `onNextClick` handler
   * Redirect to the new page with `window.location.href = '/new-page?tour=newpage&step=0'`
   * Implement tour detection in the new page similar to the Google Calendar page

### Troubleshooting

#### Tour Not Starting on Google Calendar Page
* Check that URL parameters (`tour=gcal&step=0`) are present
* Verify that elements with correct IDs exist in the DOM
* Check console logs for initialization errors

#### Tour Loops or Restarts
* Make sure `tourStartedRef` is properly preventing multiple starts
* Ensure URL parameters are being cleaned up after tour detection

#### Tour Elements Not Found
* Verify IDs and CSS selectors in your tour steps
* Add a delay to ensure DOM elements are fully loaded before starting tour
* Check for dynamic elements that might not be ready when the tour initializes

### Best Practices

1. Use specific IDs for elements that need to be highlighted
2. Add detailed logging for debugging tour issues
3. Test the tour on all browser sizes and devices
4. Use consistent styling and messaging across all tour steps
5. Keep descriptions concise and helpful for new users

## Calendar Integration

### Overview
The Calendar Integration feature lets users integrate their personal calendars in Prioriwise. Users authorize and provide access to their calendars in Google account. It also creates a Prioriwise calendar in their google account. 

### Key Components
Google Calendar configuration in Google Cloud console. 
ClientID, ClientSecret, Redirect Uri in the app must match the configuration in Step 1
Google Calendar user auth, authorized calendarIds, prioriwise calendarId are stored in google_calendar_auth table
Must take caution to restrict events to read only from User's non-prioriwise Calendars. Currently, there are no api routes available to create events in non-prioriwise Calendars

### User Workflow
1. User is redirected to Google to Authorize prioriwise for access to his calendars -- must check  SELECT ALL when prompted by google
2. After the authorization, user is redirected to Prioriwise website. The redirect URL must be same as the one that user has logged in to.
3. After successful authorization and linkage, a user can request Prioriwise to pull its calendars and choose to integrate one or some of them with Prioriwise
4. A new calendar -- Prioriwise -- can also be created in user's google calendar on certain actions

### Events
Based on REPRIORITIZE_EVENT_TIME_IN_HOURS configuration setting, a user's events from the list of authorized calendars are pulled. 

### FAQ in case of Errors
Check redirect URI, it MUST be same as the URL that a user logged in to
Allow access to individual users on Google Cloud console
Make sure redirect uri is added to the list of callbacks on Google console

## PI Table

### Overview
The PI Table is used to store and display all PI(Performance Indicators) a user creates. The PI table is located in the backstage. 

### Key Rules
Each PI is related to a job to a certain outcome. It holds a starting value, a target value, and a deadline. 



## Search

### Overview
Search lets a user finds jobs and tasks by a keyword in job's name/title, notes and  task's name/title, notes, and tags

#### Key Rules
Indices are created on Job and Task collection on title, notes, and tags. To enable search on other fields, add them to an index in models
A Mongoose query that performs a full-text search on a Job and Task  collection  and returns results sorted by relevance score. 


## Next Step For Each Job

### Overview
The feature displays or selects the  task in the series that is due next.

#### Key Rules
Each job has an array of tasks that belong to it
Each job has a nextTaskId field that shows the next task 
After a job is created, the first task is set as next task by default
Marking a current task as complete, BE selects the first incomplete and active task in the tasks array as the next task
Deleting a current task, BE selects the next incomplete and active task in the array as next task
A user can also select a next Task from the dropdown on Job Details view


## Unit Testing

### Overview
Using jest as testing framework. Jest configuration is set in jest.config.ts

### How to write unit tests
Tests are written in  \_\_tests\_\_  folder.
For Unit tests, all dependencies in a function are mocked. 

### Execute tests
Run tests by running command-- 
npx jest \<test-filename\>.
For example: npx jest  \_\_tests__/api/jobs.test.ts