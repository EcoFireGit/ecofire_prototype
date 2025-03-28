// app/qbo-progress/page.tsx
'use client';

import { useState, useEffect } from 'react';
import QBOProgressChart, { QBOData } from '@/components/dashboard/qbo-progress-chart';
import { QBOs } from '@/lib/models/qbo.model';

export default function Dashboard() {
  const [qbos, setQbos] = useState<QBOs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQBOs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/qbos');
      const data = await response.json();
      
      if (data.success) {
        setQbos(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch QBOs');
      }
    } catch (err) {
      setError('An error occurred while fetching QBOs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQBOs();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button 
          onClick={fetchQBOs}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
      
      {loading && qbos.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-2">Loading QBO data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      ) : (
        <div className="w-screen flex">
          <QBOProgressChart 
            qbos={qbos.length > 0 ? qbos : [
              // Demo data in case API returns empty array
              {
                _id: '1',
                name: 'progress toward prototype',
                unit: '%',
                beginningValue: 0,
                currentValue: 0,
                targetValue: 100,
                deadline: new Date('2025-05-01'),
                points: 10,
                userId: 'user123'
              } as QBOData,
              {
                _id: '2',
                name: 'marketing efforts',
                unit: '%',
                beginningValue: 0,
                currentValue: 25,
                targetValue: 100,
                deadline: new Date('2025-05-01'),
                points: 10,
                userId: 'user123'
              } as QBOData
            ]} 
            width="50%" 
            onRefresh={fetchQBOs}
          />
        </div>
      )}
    </div>
  );
}