// components/QBOProgressChart.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { QBOProgressService, QBOProgressData } from '@/lib/services/qbo-progress.service';
import { QBOs } from '@/lib/models/qbo.model';

// Define a simpler type that captures just the fields we need for calculating progress
export interface QBOData {
  _id: string;
  name: string;
  beginningValue: number;
  currentValue: number;
  targetValue: number;
  deadline: Date | string;
  unit?: string;
  [key: string]: any; // Allow other properties to exist but we don't care about them
}

interface QBOProgressChartProps {
  qbos: QBOData[] | QBOs[];
  className?: string;
  width?: string;
}

const QBOProgressChart: React.FC<QBOProgressChartProps> = ({ 
  qbos = [], 
  className = '',
  width = '50%'  // Default to 50% width
}) => {
  const [progressData, setProgressData] = useState<QBOProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadProgressData = async () => {
      if (qbos.length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const progressService = new QBOProgressService();
        const data = await progressService.transformQBOsForProgressChart(qbos);
        setProgressData(data);
        setError(null);
      } catch (err) {
        console.error('Error loading progress data:', err);
        setError('Failed to calculate progress data');
      } finally {
        setLoading(false);
      }
    };
    
    loadProgressData();
  }, [qbos]);

  if (loading) {
    return (
      <div style={{ width }} className={`bg-gray-50 p-6 rounded-lg shadow-sm ${className}`}>
        <div className="flex justify-center items-center h-40">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-2 text-gray-500">Calculating progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width }} className={`bg-gray-50 p-6 rounded-lg shadow-sm ${className}`}>
        <div className="flex justify-center items-center h-40 text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (qbos.length === 0 || progressData.length === 0) {
    return (
      <div style={{ width }} className={`bg-gray-50 p-6 rounded-lg shadow-sm ${className}`}>
        <div className="flex justify-center items-center h-40">
          <p className="text-gray-500">No QBO data available</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width }} className={`bg-gray-50 p-6 rounded-lg shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Progress towards mission</h3>
        <div className="text-gray-400 cursor-help">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      </div>
      
      <div className="space-y-4">
        {progressData.map((item, index) => (
          <div key={index} className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 w-36 text-right pr-2">{item.name}</span>
              <div className="flex-1">
                {/* Expected Outcome Bar */}
                <div className="relative h-5 mb-1">
                  <div
                    className="absolute bg-blue-500 h-full rounded"
                    style={{ width: `${item.expectedOutcome}%` }}
                  ></div>
                </div>
                
                {/* Achieved Outcome Bar */}
                <div className="relative h-5">
                  <div
                    className="absolute bg-green-500 h-full rounded"
                    style={{ width: `${item.achievedOutcome}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex flex-col">
        {/* Legend */}
        <div className="flex mb-4">
          <div className="flex items-center mr-4">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm">Expected Outcome</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm">Achieved Outcome</span>
          </div>
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between px-6">
          <span className="text-xs text-gray-500">0</span>
          <span className="text-xs text-gray-500">25</span>
          <span className="text-xs text-gray-500">50</span>
          <span className="text-xs text-gray-500">75</span>
          <span className="text-xs text-gray-500">100</span>
        </div>
        <div className="text-center text-xs text-gray-500 mt-1">
          % progress
        </div>
      </div>
    </div>
  );
};

export default QBOProgressChart;