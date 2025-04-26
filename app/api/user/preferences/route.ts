import { NextResponse } from 'next/server';
import { UserPreferencesService } from '@/lib/services/user-preferences.service';
import { validateAuth } from '@/lib/utils/auth-utils';

const userPreferencesService = new UserPreferencesService();

export async function GET() {
  try {
    const authResult = await validateAuth();
   
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
   
    const userId = authResult.userId;
    
    // Get user preferences
    const preferences = await userPreferencesService.getUserPreferences(userId!);
   
    return NextResponse.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error in GET /api/user/preferences:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await validateAuth();
   
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const updates = await request.json();
    
    // Ensure we only allow updating the specific fields we want
    const validUpdates: Partial<{ enableBackstage: boolean, enableTableView: boolean }> = {};
    
    if (updates.hasOwnProperty('enableBackstage')) {
      validUpdates.enableBackstage = Boolean(updates.enableBackstage);
    }
    
    if (updates.hasOwnProperty('enableTableView')) {
      validUpdates.enableTableView = Boolean(updates.enableTableView);
    }
    
    // Update user preferences
    const updatedPreferences = await userPreferencesService.updateUserPreferences(
      userId!,
      validUpdates
    );
    
    return NextResponse.json({
      success: true,
      data: updatedPreferences
    });
  } catch (error) {
    console.error('Error in PATCH /api/user/preferences:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}