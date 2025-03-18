// components/gcal/googleauth-button.tsx
'use client';

import { useState } from 'react';

export default function GoogleAuthButton() {
  const [loading, setLoading] = useState(false);

  const handleAuthClick = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gcal/route');
      if (!response.ok) throw new Error('Authorization failed');
      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleAuthClick} disabled={loading}>
      {loading ? 'Redirecting...' : 'Authorize with Google'}
    </button>
  );
}
