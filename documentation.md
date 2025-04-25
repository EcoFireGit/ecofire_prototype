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

## Project Overview
EcoFire Prototype is a job management system built with Next.js, featuring active and completed jobs tracking. The application uses MongoDB for data storage and Clerk for authentication.

## Technology Stack
- **Frontend**: Next.js 15.1.6, React 19
- **Database**: MongoDB with Mongoose
- **Authentication**: Clerk
- **UI Components**: shadcn/ui, Radix UI
- **Styling**: TailwindCSS
- **Table Management**: TanStack Table
- **Development**: TypeScript

## Project Structure
```
ECOFIRE_PROTOTYPE/
├── .next/
├── app/
│   ├── api/                    # API routes
│   ├── dashboard/              # Dashboard pages
├──components/                  # Shared components
│   ├── business-funtions/      # Business function components
│   ├── dashboard/              # Dashboard components
│   ├── jobs/                   # Job management components
│   └── ui/                    # UI components (shadcn)
├── hooks/                    # Custom React hooks
├── lib/                     # Utility functions and services
│   ├── models/             # MongoDB models
│   ├── services/          # Business logic services
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

## Authentication
- Implemented using Clerk
- User ID is required for all job operations
- Authentication state is managed through Clerk's hooks and middleware

## State Management
- Local state management using React hooks
- Table selection state managed by TanStack Table
- Toast notifications for user feedback
- Modal state for job creation/editing

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