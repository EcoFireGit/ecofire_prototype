// lib/services/qbo-actual-progress.service.ts
import { QBOs } from '@/lib/models/qbo.model';
import { PIs } from '@/lib/models/pi.model';
import { QBOData } from '@/components/dashboard/qbo-progress-chart';

export interface QBOProgressData {
  name: string;
  achievedOutcome: number; // Actual progress percentage
  expectedOutcome: number; // Expected progress percentage
}

export interface Jobs {
  _id: string;
  title: string;
  notes: string;
  businessFunctionId: string;   
  userId: string;
  dueDate?: Date;
  isDone: boolean;
  impact?: number;
  nextTaskId?: string;
  tasks?: string[];
}

export interface PIJobMapping {
  _id: string;
  piId: string;
  jobId: string;
  piImpactValue: number;
  userId: string;
}

export interface PIQBOMapping {
  _id: string;
  piId: string;
  qboId: string;
  piTarget: number;
  qboTarget: number;
  qboImpact: number;
  notes?: string;
  userId: string;
}

export class QBOProgressService {
  /**
   * Calculate the actual progress percentage for QBOs based on the provided formula
   * @param qbos Array of QBO objects
   * @returns Object with QBO IDs as keys and progress percentages as values
   */
  async calculateActualProgress(qbos: (QBOData | QBOs)[]): Promise<Record<string, number>> {
    // Using the provided formula:
    // (currentValue - beginningValue) / (targetValue - beginningValue)
    const result = Object.fromEntries(
      qbos.map(qbo => {
        const divisor = qbo.targetValue - qbo.beginningValue;
        const progress = divisor === 0 ? 0 : ((qbo.currentValue - qbo.beginningValue) / divisor) * 100;
        // Ensure progress is between 0 and 100
        return [qbo._id, Math.min(Math.max(progress, 0), 100)];
      })
    );
    
    console.log('Actual Progress for QBOs:', 
      Object.fromEntries(
        qbos.map(qbo => [
          qbo.name, 
          {
            progress: result[qbo._id].toFixed(2) + '%',
            currentValue: qbo.currentValue,
            beginningValue: qbo.beginningValue,
            targetValue: qbo.targetValue,
            calculation: `(${qbo.currentValue} - ${qbo.beginningValue}) / (${qbo.targetValue} - ${qbo.beginningValue}) * 100 = ${result[qbo._id].toFixed(2)}%`
          }
        ])
      )
    );
    
    return result;
  }

  /**
   * Calculate expected progress based on completed jobs and their impact on PIs
   * @param qbos Array of QBO objects
   * @returns Promise resolving to object with QBO IDs as keys and expected progress percentages as values
   */
  async calculateExpectedProgress(qbos: (QBOData | QBOs)[]): Promise<Record<string, number>> {
    // Step 1: Get all PIs
    const piResponse = await fetch('/api/pis');
    if (!piResponse.ok) {
      throw new Error('Failed to fetch PIs');
    }
    
    const piData = await piResponse.json();
    if (!piData.success) {
      throw new Error(piData.error || 'Failed to get PI data');
    }
    
    const pis: PIs[] = piData.data;
    console.log('Retrieved PIs:', pis.map(pi => ({ 
      name: pi.name, 
      id: pi._id,
      beginning: pi.beginningValue,
      target: pi.targetValue
    })));
    
    // Step 2: Get all PI-QBO mappings
    const piQboMappingsResponse = await fetch('/api/pi-qbo-mappings');
    if (!piQboMappingsResponse.ok) {
      throw new Error('Failed to fetch PI-QBO mappings');
    }
    
    const piQboMappingsData = await piQboMappingsResponse.json();
    if (!piQboMappingsData.success) {
      throw new Error(piQboMappingsData.error || 'Failed to get PI-QBO mapping data');
    }
    
    const piQboMappings: PIQBOMapping[] = piQboMappingsData.data;
    
    // Step 3: Get all completed jobs
    const jobsResponse = await fetch('/api/jobs');
    if (!jobsResponse.ok) {
      throw new Error('Failed to fetch jobs');
    }
    
    const jobsData = await jobsResponse.json();
    if (!jobsData.success) {
      throw new Error(jobsData.error || 'Failed to get jobs data');
    }
    
    const allJobs: Jobs[] = jobsData.data;
    const completedJobs = allJobs.filter(job => job.isDone);
    console.log(`Retrieved ${completedJobs.length} completed jobs out of ${allJobs.length} total jobs`);
    
    // Step 4: Get PI-Job mappings
    const piJobMappingsResponse = await fetch('/api/pi-job-mappings');
    if (!piJobMappingsResponse.ok) {
      throw new Error('Failed to fetch PI-Job mappings');
    }
    
    const piJobMappingsData = await piJobMappingsResponse.json();
    if (!piJobMappingsData.success) {
      throw new Error(piJobMappingsData.error || 'Failed to get PI-Job mapping data');
    }
    
    const piJobMappings: PIJobMapping[] = piJobMappingsData.data;
    
    // Step 5: Calculate current PI progress based on completed jobs
    
    // Initialize progress tracking object for PIs
    // Format: { PI_ID: [PI_Name, 0] }
    let progressPIs: Record<string, [string, number]> = Object.fromEntries(
      pis.map(pi => [pi._id, [pi.name, 0]])
    );
    
    // Get completed job IDs
    const completedJobIds = completedJobs.map(job => job._id);
    console.log('Completed Job IDs:', completedJobIds);
    
    // Filter job impact entries for completed jobs only
    const completedJobImpacts = piJobMappings.filter(mapping => 
      completedJobIds.includes(mapping.jobId)
    );
    console.log(`Found ${completedJobImpacts.length} PI impact entries for completed jobs`);
    
    // Accumulate job impacts for each PI
    completedJobImpacts.forEach(impact => {
      const piEntry = progressPIs[impact.piId];
      if (piEntry) {
        piEntry[1] += impact.piImpactValue;
        console.log(`Job impact: Adding ${impact.piImpactValue} to ${piEntry[0]} (total: ${piEntry[1]})`);
      }
    });
    
    // Normalize PI progress by dividing accumulated impact by (target - beginning)
    pis.forEach(pi => {
      const piEntry = progressPIs[pi._id];
      if (piEntry) {
        const denominator = pi.targetValue - pi.beginningValue;
        if (denominator !== 0) {
          piEntry[1] = piEntry[1] / denominator;
        } else {
          piEntry[1] = 0; // Avoid division by zero
        }
        console.log(`PI progress for ${pi.name}: ${(piEntry[1] * 100).toFixed(2)}% (normalized by ${denominator})`);
      }
    });
    
    // Step 6: Calculate QBO expected progress based on PI progress
    
    // Initialize progress tracking object for QBOs
    // Format: { QBO_ID: [QBO_Name, 0] }
    let progressQBOs: Record<string, [string, number]> = Object.fromEntries(
      qbos.map(qbo => [qbo._id, [qbo.name, 0]])
    );
    
    // Update QBO progress based on PI progress & impact
    piQboMappings.forEach(mapping => {
      const qboEntry = progressQBOs[mapping.qboId];
      const piEntry = progressPIs[mapping.piId];
      
      if (qboEntry && piEntry) {
        // Find the corresponding QBO object to get target and beginning values
        const qbo = qbos.find(q => q._id === mapping.qboId);
        if (qbo) {
          const qboDifference = qbo.targetValue - qbo.beginningValue;
          // Calculate contribution using qboImpact value from mapping and normalize by QBO's target-beginning difference
          const contributionAmount = qboDifference !== 0 ? 
            (mapping.qboImpact * piEntry[1]) / qboDifference : 0;
          console.log(`${piEntry[0]} contributes ${(contributionAmount * 100).toFixed(2)}% to ${qboEntry[0]} with impact factor ${mapping.qboImpact} and normalized by ${qboDifference}`);
          qboEntry[1] += contributionAmount;
        }
      }
    });
    
    console.log('QBO Progress After PI Contributions:', Object.fromEntries(
      Object.entries(progressQBOs).map(([id, [name, rawProgress]]) => [name, (rawProgress * 100).toFixed(2) + '%'])
    ));
    
    // Step 7: Convert raw progress values to percentages
    const result: Record<string, number> = {};
    
    qbos.forEach(qbo => {
      const qboEntry = progressQBOs[qbo._id];
      if (qboEntry) {
        // Convert raw progress to percentage
        const progressPercentage = qboEntry[1] * 100;
        // Ensure it's between 0 and 100
        result[qbo._id] = Math.min(Math.max(progressPercentage, 0), 100);
      }
    });
    
    console.log('Final Expected Progress for QBOs:', 
      Object.fromEntries(
        qbos.map(qbo => [
          qbo.name, 
          {
            progress: result[qbo._id].toFixed(2) + '%',
            rawProgress: progressQBOs[qbo._id]?.[1].toFixed(4)
          }
        ])
      )
    );
    
    return result;
  }

  /**
   * Transform QBOs into data format needed for the progress chart
   * @param qbos Array of QBO objects
   * @returns Promise resolving to Array of QBOProgressData objects
   */
  async transformQBOsForProgressChart(qbos: (QBOData | QBOs)[]): Promise<QBOProgressData[]> {
    console.log('Transforming QBOs for progress chart:', 
      qbos.map(qbo => ({ name: qbo.name, id: qbo._id }))
    );
    
    const actualProgressObj = await this.calculateActualProgress(qbos);
    const expectedProgressObj = await this.calculateExpectedProgress(qbos);
    
    const result = qbos.map(qbo => ({
      name: qbo.name,
      achievedOutcome: actualProgressObj[qbo._id] || 0,
      expectedOutcome: expectedProgressObj[qbo._id] || 0
    }));
    
    console.log('Final QBO Progress Chart Data:', result);
    
    return result;
  }
}