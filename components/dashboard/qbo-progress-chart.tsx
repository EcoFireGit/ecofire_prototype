// components/dashboard/qbo-progress-chart.tsx
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
  onRefresh?: () => void; // Optional callback to refresh data after update
}

const QBOProgressChart: React.FC<QBOProgressChartProps> = ({ 
  qbos = [], 
  className = '',
  width = '100%',
  onRefresh
}) => {
  const [progressData, setProgressData] = useState<QBOProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQBO, setSelectedQBO] = useState<QBOData | QBOs | null>(null);
  const [updatedValue, setUpdatedValue] = useState<number | ''>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);
  const [updateMessage, setUpdateMessage] = useState('');
  
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

  // Handle QBO bar click
  const handleQBOClick = (qbo: QBOData | QBOs) => {
    setSelectedQBO(qbo);
    setUpdatedValue(qbo.currentValue);
    setUpdateSuccess(null);
    setUpdateMessage('');
  };

  // Handle QBO update
  const handleUpdateQBO = async () => {
    if (!selectedQBO || updatedValue === '') return;
    
    setIsUpdating(true);
    setUpdateSuccess(null);
    setUpdateMessage('');
    
    try {
      // Call API to update QBO
      const response = await fetch(`/api/qbos/${selectedQBO._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentValue: Number(updatedValue)
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUpdateSuccess(true);
        setUpdateMessage('QBO updated successfully');
        
        // If onRefresh callback is provided, call it to refresh data
        if (onRefresh) {
          onRefresh();
        }
        
        // Automatically close modal after successful update
        setTimeout(() => {
          handleCloseModal();
        }, 1000); // Close after 1 second so user can see success message
      } else {
        setUpdateSuccess(false);
        setUpdateMessage(data.error || 'Failed to update QBO');
      }
    } catch (err) {
      console.error('Error updating QBO:', err);
      setUpdateSuccess(false);
      setUpdateMessage('An error occurred while updating QBO');
    } finally {
      setIsUpdating(false);
    }
  };

  // Close update modal
  const handleCloseModal = () => {
    setSelectedQBO(null);
    setUpdatedValue('');
    setUpdateSuccess(null);
    setUpdateMessage('');
  };

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
        <div className="flex items-center space-x-6">
          {/* Legend - Moved to top right */}
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm">Expected Outcome</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm">Achieved Outcome</span>
          </div>
          <div className="text-gray-400 cursor-help relative group">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div className="absolute hidden group-hover:block right-0 top-full mt-2 bg-gray-800 text-white text-xs rounded py-1 px-2 w-48 z-10">
              Click on objective names on the left to update current values
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative py-10"> {/* Added padding to bottom of container */}
        {/* Progress bars */}
        <div className="space-y-4 mb-8"> {/* Keep reasonable margin */}
        
        {/* X-axis labels - Positioned at bottom with more distance from bars */}
        <div className="absolute bottom-0 left-0 right-0 mt-8 pt-4"> {/* Added more top padding/margin */}
          <div className="flex justify-between px-0 ml-36">
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
          {progressData.map((item, index) => {
            const qbo = qbos.find(q => q.name === item.name);
            return (
              <div key={index} className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span 
                    className="text-sm text-gray-600 w-36 text-right pr-2 cursor-pointer hover:text-blue-600 hover:font-medium transition-colors"
                    onClick={() => qbo ? handleQBOClick(qbo) : null}
                    title="Click to update current value"
                  >
                    {item.name}
                  </span>
                  <div className="flex-1">
                    {/* Expected Outcome Bar */}
                    <div className="relative h-5 mb-1 group">
                      <div
                        className="absolute bg-blue-500 h-full rounded"
                        style={{ width: `${item.expectedOutcome}%` }}
                      ></div>
                      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 z-10">
                        Expected: {item.expectedOutcome.toFixed(1)}%
                      </div>
                    </div>
                    
                    {/* Achieved Outcome Bar - No longer clickable */}
                    <div className="relative h-5 group">
                      <div
                        className="absolute bg-green-500 h-full rounded"
                        style={{ width: `${item.achievedOutcome}%` }}
                      ></div>
                      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 z-10">
                        Achieved: {item.achievedOutcome.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Update Modal */}
      {selectedQBO && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Update {selectedQBO.name}</h3>
            
            <div className="mb-4">
              <div className="mb-2">
                <span className="font-medium">Beginning Value:</span> {selectedQBO.beginningValue} {selectedQBO.unit || ''}
              </div>
              <div className="mb-2">
                <span className="font-medium">Target Value:</span> {selectedQBO.targetValue} {selectedQBO.unit || ''}
              </div>
              <div className="mb-2">
                <span className="font-medium">Current Value:</span> {selectedQBO.currentValue} {selectedQBO.unit || ''}
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="currentValue" className="block text-sm font-medium text-gray-700 mb-1">
                New Current Value:
              </label>
              <input
                type="number"
                id="currentValue"
                value={updatedValue}
                onChange={(e) => setUpdatedValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter new value"
                min={selectedQBO.beginningValue}
                max={selectedQBO.targetValue}
                step="any"
              />
            </div>
            
            {updateMessage && (
              <div className={`mb-4 p-2 rounded ${updateSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {updateMessage}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateQBO}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isUpdating || updatedValue === ''}
              >
                {isUpdating ? 'Updating...' : 'Update QBO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QBOProgressChart;