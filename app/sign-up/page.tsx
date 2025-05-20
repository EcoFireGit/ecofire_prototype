// app/sign-up/page.tsx
'use client'; // This marks the file as a Client Component

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';  // Import useSearchParams from next/navigation
import { SignUp, useUser } from '@clerk/clerk-react'; // Clerk components
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";

const SignUpPage = () => {
  const searchParams = useSearchParams(); // Use this to get the query parameters
  const orgId = searchParams.get('orgId');
  const token = searchParams.get('__clerk_ticket');
  
  const { user, isLoaded, isSignedIn } = useUser();  // Clerk's useUser hook to get user data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // New error state

  useEffect(() => {
    if (!token || !orgId) {
      setError('Missing required parameters.');
      setLoading(false);
      return;
    }

    if (isLoaded && isSignedIn) {
      // If user data is loaded and the user is signed in, associate the user with the organization
      if (user) {
        console.log('User ID:', user.id);
        associateUserWithOrg(user.id, orgId);
      }
    } else if (!isLoaded) {
      console.log('User data is still loading...');
    } else if (!isSignedIn) {
      console.log('User is not signed in.');
      setError('User is not signed in.');
      setLoading(false); // Stop loading if user is not signed in
    }

    // If user is not signed in or loading, stop loading
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, orgId, token, user]);

  // Function to associate user with the organization
  const associateUserWithOrg = async (userId: string, orgId: string) => {
    console.log('Associating user with organization...');
    try {
      const response = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, orgId }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log('User associated with organization:', data.organization);
        window.location.href = '/jobs';  // Redirect after successful association
      } else {
        console.error('Error associating user with organization:', data.message);
        setError('Error associating user with organization.');
      }
    } catch (error) {
      console.error('Error associating user with organization:', error);
      setError('An error occurred while associating user with organization.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <ClerkProvider>

      <div>
        <h2>Complete Your Registration</h2>
        <SignUp
          path="/sign-up"
          redirectUrl={`/jobs`}  // Redirect to your app's dashboard after successful sign-up
        />
      </div>
      </ClerkProvider>
  );
};

export default SignUpPage;
