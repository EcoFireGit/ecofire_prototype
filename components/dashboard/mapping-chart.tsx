"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface MappingData {
  jobs: Array<{
    id: string;
    name: string;
    businessFunctionId?: string;
  }>;
  outputs: Array<{
    id: string;
    name: string;
    unit?: string;
    targetValue: number;
    beginningValue: number;
  }>;
  outcomes: Array<{
    id: string;
    name: string;
    unit?: string;
    targetValue: number;
    currentValue: number;
    beginningValue: number;
    points: number;
  }>;
  jobOutputMappings: Array<{
    jobId: string;
    jobName: string;
    outputId: string;
    outputName: string;
    impactValue: number;
    target: number;
  }>;
  outputOutcomeMappings: Array<{
    outputId: string;
    outputName: string;
    outcomeId: string;
    outcomeName: string;
    impact: number;
    outputTarget: number;
    outcomeTarget: number;
  }>;
}

interface MappingChartProps {}

const MappingChart: React.FC<MappingChartProps> = () => {
  const [mappingData, setMappingData] = useState<MappingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] = useState({
    enableBackstage: false,
    enableTableView: false,
  });
  const [activeTab, setActiveTab] = useState("job-outcome");
  const [expandedCharts, setExpandedCharts] = useState({
    jobOutcome: false,
    jobOutput: false,
    outputOutcome: false,
  });
  const { toast } = useToast();

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      const result = await response.json();

      if (result.success) {
        setUserPreferences({
          enableBackstage: result.data.enableBackstage,
          enableTableView: result.data.enableTableView,
        });
      }
    } catch (error) {
      console.error("Failed to fetch user preferences:", error);
    }
  };

  useEffect(() => {
    fetchMappingData();
    fetchUserPreferences();
  }, []);

  const fetchMappingData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/jobs/mapping-data");
      const result = await response.json();

      if (result.success) {
        setMappingData(result.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch mapping data");
        toast({
          title: "Error",
          description: "Failed to load mapping data",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error fetching mapping data:", err);
      setError("An error occurred while fetching mapping data");
      toast({
        title: "Error",
        description: "Failed to load mapping data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleChartExpansion = (chartType: 'jobOutcome' | 'jobOutput' | 'outputOutcome') => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartType]: !prev[chartType]
    }));
  };

  const renderJobOutcomeChart = () => {
    if (!mappingData) return null;

    // First, calculate the total impact for each outcome across ALL jobs
    const totalOutcomeImpact = new Map<string, number>();
    
    mappingData.jobs.forEach(job => {
      const jobOutputMappings = mappingData.jobOutputMappings.filter(
        mapping => mapping.jobId === job.id
      );

      jobOutputMappings.forEach(jobOutput => {
        const outputOutcomeMappings = mappingData.outputOutcomeMappings.filter(
          mapping => mapping.outputId === jobOutput.outputId
        );

        outputOutcomeMappings.forEach(outputOutcome => {
          const contribution = jobOutput.impactValue * outputOutcome.impact;
          const current = totalOutcomeImpact.get(outputOutcome.outcomeName) || 0;
          totalOutcomeImpact.set(outputOutcome.outcomeName, current + contribution);
        });
      });
    });

    // Now calculate each job's contribution to outcomes
    const jobOutcomeData = mappingData.jobs.map(job => {
      const jobOutputMappings = mappingData.jobOutputMappings.filter(
        mapping => mapping.jobId === job.id
      );

      const outcomeContributions = jobOutputMappings.map(jobOutput => {
        const outputOutcomeMappings = mappingData.outputOutcomeMappings.filter(
          mapping => mapping.outputId === jobOutput.outputId
        );

        return outputOutcomeMappings.map(outputOutcome => {
          const contribution = jobOutput.impactValue * outputOutcome.impact;
          return {
            outcomeName: outputOutcome.outcomeName,
            contribution
          };
        });
      }).flat();

      // Aggregate contributions by outcome
      const outcomeMap = new Map<string, number>();
      outcomeContributions.forEach(contribution => {
        const current = outcomeMap.get(contribution.outcomeName) || 0;
        outcomeMap.set(contribution.outcomeName, current + contribution.contribution);
      });

      const outcomes = Array.from(outcomeMap.entries())
        .filter(([name]) => name && name.trim() !== '') // Filter out empty outcome names
        .map(([name, value]) => {
          const percentage = (totalOutcomeImpact.get(name) || 0) > 0 ? (value / (totalOutcomeImpact.get(name) || 1)) * 100 : 0;
          
          return {
            name,
            value,
            percentage
          };
        });

      // Calculate job's contribution to mission impact
      const jobMissionContribution = outcomes.reduce((sum, outcome) => {
        // Find the corresponding outcome to get its mission points
        const outcomeData = mappingData.outcomes.find(o => o.name === outcome.name);
        const missionPoints = outcomeData?.points || 0;
        // Calculate this job's contribution to this outcome's mission impact
        const outcomeContribution = (outcome.percentage / 100) * missionPoints;
        return sum + outcomeContribution;
      }, 0);
      
      // Calculate total mission impact
      const totalMissionImpact = mappingData.outcomes.reduce((sum, outcome) => sum + (outcome.points || 0), 0);
      const totalImpactPercentage = totalMissionImpact > 0 ? (jobMissionContribution / totalMissionImpact) * 100 : 0;

      return {
        jobName: job.name,
        outcomes,
        totalImpact: totalImpactPercentage
      };
    }).filter(job => job.outcomes.length > 0)
    .sort((a, b) => b.totalImpact - a.totalImpact); // Always sort high-to-low by default

    const displayData = expandedCharts.jobOutcome ? jobOutcomeData : jobOutcomeData.slice(0, 5);
    const hasMoreItems = jobOutcomeData.length > 5;

    return (
      <div className="space-y-4">
        {displayData.map((job, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{job.jobName}</h4>
              <span className="text-sm text-gray-500">Total Mission Impact: {job.totalImpact.toFixed(1)}%</span>
            </div>
            
            <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
              {job.outcomes.map((outcome, outcomeIndex) => {
                const colors = ['bg-blue-600', 'bg-green-600', 'bg-yellow-500', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
                const color = colors[outcomeIndex % colors.length];
                const isFirst = outcomeIndex === 0;
                const isLast = outcomeIndex === job.outcomes.length - 1;
                
                return (
                  <div
                    key={outcomeIndex}
                    className={`absolute h-full ${color} transition-all duration-200 hover:brightness-110 cursor-pointer ${
                      isFirst ? 'rounded-l-full' : ''
                    } ${
                      isLast ? 'rounded-r-full' : ''
                    }`}
                    style={{
                      left: `${job.outcomes.slice(0, outcomeIndex).reduce((sum, o) => sum + o.percentage, 0)}%`,
                      width: `${outcome.percentage}%`
                    }}
                    title={`This job contributes ${outcome.percentage.toFixed(1)}% of total impact on the outcome, ${outcome.name}`}
                  />
                );
              })}
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {job.outcomes.map((outcome, outcomeIndex) => {
                const colors = ['bg-blue-600', 'bg-green-600', 'bg-yellow-500', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
                const color = colors[outcomeIndex % colors.length];
                
                return (
                  <div key={outcomeIndex} className="flex items-center text-xs">
                    <div className={`w-3 h-3 ${color} rounded mr-1`}></div>
                    <span className="text-gray-600">{outcome.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {hasMoreItems && (
          <div className="flex justify-center mt-4">
            <Button
              variant="ghost"
              onClick={() => toggleChartExpansion('jobOutcome')}
              className="flex items-center gap-2"
            >
              {expandedCharts.jobOutcome ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  View More ({jobOutcomeData.length - 5} more)
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderJobOutputChart = () => {
    if (!mappingData) return null;

    // Group mappings by job
    const jobOutputData = mappingData.jobs.map(job => {
      const jobOutputMappings = mappingData.jobOutputMappings.filter(
        mapping => mapping.jobId === job.id
      );

      const outputs = jobOutputMappings.map(mapping => ({
        id: mapping.outputId,
        name: mapping.outputName,
        impactValue: mapping.impactValue,
        target: mapping.target
      }));

      const totalRawImpact = outputs.reduce((sum, output) => sum + output.impactValue, 0);
      
      // For Job → Output chart: Calculate job's mission impact through its outputs
      const totalJobOutputImpact = outputs.reduce((sum, output) => sum + output.impactValue, 0);
      
      // Calculate job's contribution to mission through its outputs
      const jobMissionContribution = outputs.reduce((sum, output) => {
        // Find all outcomes this output contributes to
        const outputOutcomes = mappingData.outputOutcomeMappings.filter(mapping => mapping.outputId === output.id);
        let outputContribution = 0;
        
        outputOutcomes.forEach(outputOutcome => {
          const outcomeData = mappingData.outcomes.find(o => o.name === outputOutcome.outcomeName);
          const missionPoints = outcomeData?.points || 0;
          
          // Calculate how many outputs are associated with this outcome
          const outputsForThisOutcome = mappingData.outputOutcomeMappings.filter(mapping => 
            mapping.outcomeName === outputOutcome.outcomeName
          ).length;
          
          // Calculate how many jobs are associated with this output
          const jobsForThisOutput = mappingData.jobOutputMappings.filter(mapping => 
            mapping.outputId === output.id
          ).length;
          
          // Mission impact is distributed equally among outputs, then among jobs
          const outputMissionShare = missionPoints / outputsForThisOutcome;
          const jobMissionShare = outputMissionShare / jobsForThisOutput;
          
          outputContribution += jobMissionShare;
        });
        
        return sum + outputContribution;
      }, 0);
      
      // Calculate total mission impact (sum of all outcome points)
      const totalMissionImpact = mappingData.outcomes.reduce((sum, outcome) => sum + (outcome.points || 0), 0);
      
      // Calculate total mission contribution from all jobs
      const allJobsMissionContribution = mappingData.jobs.reduce((totalJobContribution, job) => {
        const jobOutputs = mappingData.jobOutputMappings.filter(mapping => mapping.jobId === job.id);
        const jobOutputsWithData = jobOutputs.map(mapping => {
          const output = mappingData.outputs.find(o => o.id === mapping.outputId);
          return { ...mapping, outputName: output?.name || mapping.outputName };
        });
        
        return totalJobContribution + jobOutputsWithData.reduce((sum, output) => {
          const outputOutcomes = mappingData.outputOutcomeMappings.filter(mapping => mapping.outputId === output.outputId);
          let outputContribution = 0;
          
          outputOutcomes.forEach(outputOutcome => {
            const outcomeData = mappingData.outcomes.find(o => o.name === outputOutcome.outcomeName);
            const missionPoints = outcomeData?.points || 0;
            
            const outputsForThisOutcome = mappingData.outputOutcomeMappings.filter(mapping => 
              mapping.outcomeName === outputOutcome.outcomeName
            ).length;
            
            const jobsForThisOutput = mappingData.jobOutputMappings.filter(mapping => 
              mapping.outputId === output.outputId
            ).length;
            
            const outputMissionShare = missionPoints / outputsForThisOutcome;
            const jobMissionShare = outputMissionShare / jobsForThisOutput;
            
            outputContribution += jobMissionShare;
          });
          
          return sum + outputContribution;
        }, 0);
      }, 0);
      
      // Calculate percentage relative to total mission contribution from all jobs
      const totalImpactPercentage = allJobsMissionContribution > 0 ? (jobMissionContribution / allJobsMissionContribution) * 100 : 0;

      return {
        jobName: job.name,
        outputs: outputs.map(output => {
          // Use the actual impact value from the database
          const jobOutputMapping = mappingData.jobOutputMappings.find(mapping => 
            mapping.jobId === job.id && mapping.outputId === output.id
          );
          
          return {
            ...output,
            percentage: jobOutputMapping ? jobOutputMapping.impactValue : 0
          };
        }),
        totalImpact: totalImpactPercentage
      };
    }).filter(job => job.outputs.length > 0)
    .sort((a, b) => b.totalImpact - a.totalImpact); // Always sort high-to-low by default

    const displayData = expandedCharts.jobOutput ? jobOutputData : jobOutputData.slice(0, 5);
    const hasMoreItems = jobOutputData.length > 5;

    return (
      <div className="space-y-4">
        {displayData.map((job, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{job.jobName}</h4>
              <span className="text-sm text-gray-500">Total Mission Impact: {job.totalImpact.toFixed(1)}%</span>
            </div>
            
            <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
              {job.outputs.map((output, outputIndex) => {
                const colors = ['bg-green-600', 'bg-blue-600', 'bg-yellow-500', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
                const color = colors[outputIndex % colors.length];
                const isFirst = outputIndex === 0;
                const isLast = outputIndex === job.outputs.length - 1;
                
                return (
                  <div
                    key={outputIndex}
                    className={`absolute h-full ${color} transition-all duration-200 hover:brightness-110 cursor-pointer ${
                      isFirst ? 'rounded-l-full' : ''
                    } ${
                      isLast ? 'rounded-r-full' : ''
                    }`}
                    style={{
                      left: `${job.outputs.slice(0, outputIndex).reduce((sum, o) => sum + o.percentage, 0)}%`,
                      width: `${output.percentage}%`
                    }}
                    title={`This job contributes ${output.percentage.toFixed(1)}% of total impact on the output, ${output.name}`}
                  />
                );
              })}
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {job.outputs.map((output, outputIndex) => {
                const colors = ['bg-green-600', 'bg-blue-600', 'bg-yellow-500', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
                const color = colors[outputIndex % colors.length];
                
                return (
                  <div key={outputIndex} className="flex items-center text-xs">
                    <div className={`w-3 h-3 ${color} rounded mr-1`}></div>
                    <span className="text-gray-600">{output.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {hasMoreItems && (
          <div className="flex justify-center mt-4">
            <Button
              variant="ghost"
              onClick={() => toggleChartExpansion('jobOutput')}
              className="flex items-center gap-2"
            >
              {expandedCharts.jobOutput ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  View More ({jobOutputData.length - 5} more)
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderOutputOutcomeChart = () => {
    if (!mappingData) return null;

    // Group mappings by output
    const outputOutcomeData = mappingData.outputs.map(output => {
      const outputOutcomeMappings = mappingData.outputOutcomeMappings.filter(
        mapping => mapping.outputId === output.id
      );

      const outcomes = outputOutcomeMappings.map(mapping => ({
        name: mapping.outcomeName,
        impact: mapping.impact
      }));

      // Calculate output's contribution to mission impact
      const outputMissionContribution = outcomes.reduce((sum, outcome) => {
        const outcomeData = mappingData.outcomes.find(o => o.name === outcome.name);
        const missionPoints = outcomeData?.points || 0;
        // Calculate this output's contribution to this outcome's mission impact
        const outcomeContribution = (outcome.impact / 100) * missionPoints;
        return sum + outcomeContribution;
      }, 0);
      
      // Calculate total mission impact from all outputs
      const allOutputsMissionContribution = mappingData.outputs.reduce((totalOutputContribution, output) => {
        const outputOutcomeMappings = mappingData.outputOutcomeMappings.filter(
          mapping => mapping.outputId === output.id
        );
        
        return totalOutputContribution + outputOutcomeMappings.reduce((sum, mapping) => {
          const outcomeData = mappingData.outcomes.find(o => o.name === mapping.outcomeName);
          const missionPoints = outcomeData?.points || 0;
          const outcomeContribution = (mapping.impact / 100) * missionPoints;
          return sum + outcomeContribution;
        }, 0);
      }, 0);
      
      // Calculate percentage relative to total mission contribution from all outputs
      const totalImpactPercentage = allOutputsMissionContribution > 0 ? (outputMissionContribution / allOutputsMissionContribution) * 100 : 0;

      return {
        outputName: output.name,
        outcomes: outcomes.map(outcome => {
          // Calculate total impact for this specific outcome across ALL outputs
          const totalOutcomeImpact = mappingData.outputOutcomeMappings
            .filter(mapping => mapping.outcomeName === outcome.name)
            .reduce((sum, mapping) => sum + mapping.impact, 0);
          
          // Calculate this output's percentage contribution to this outcome
          const outcomePercentage = totalOutcomeImpact > 0 ? (outcome.impact / totalOutcomeImpact) * 100 : 0;
          
          return {
            ...outcome,
            percentage: outcomePercentage
          };
        }),
        totalImpact: totalImpactPercentage
      };
    }).filter(output => output.outcomes.length > 0)
    .sort((a, b) => b.totalImpact - a.totalImpact); // Always sort high-to-low by default

    const displayData = expandedCharts.outputOutcome ? outputOutcomeData : outputOutcomeData.slice(0, 5);
    const hasMoreItems = outputOutcomeData.length > 5;

    return (
      <div className="space-y-4">
        {displayData.map((output, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{output.outputName}</h4>
              <span className="text-sm text-gray-500">Total Mission Impact: {output.totalImpact.toFixed(1)}%</span>
            </div>
            
            <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
              {output.outcomes.map((outcome, outcomeIndex) => {
                const colors = ['bg-yellow-500', 'bg-blue-600', 'bg-green-600', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
                const color = colors[outcomeIndex % colors.length];
                const isFirst = outcomeIndex === 0;
                const isLast = outcomeIndex === output.outcomes.length - 1;
                
                return (
                  <div
                    key={outcomeIndex}
                    className={`absolute h-full ${color} transition-all duration-200 hover:brightness-110 cursor-pointer ${
                      isFirst ? 'rounded-l-full' : ''
                    } ${
                      isLast ? 'rounded-r-full' : ''
                    }`}
                    style={{
                      left: `${output.outcomes.slice(0, outcomeIndex).reduce((sum, o) => sum + o.percentage, 0)}%`,
                      width: `${outcome.percentage}%`
                    }}
                    title={`This output contributes ${outcome.percentage.toFixed(1)}% of total impact on the outcome, ${outcome.name}`}
                  />
                );
              })}
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {output.outcomes.map((outcome, outcomeIndex) => {
                const colors = ['bg-yellow-500', 'bg-blue-600', 'bg-green-600', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
                const color = colors[outcomeIndex % colors.length];
                
                return (
                  <div key={outcomeIndex} className="flex items-center text-xs">
                    <div className={`w-3 h-3 ${color} rounded mr-1`}></div>
                    <span className="text-gray-600">{outcome.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {hasMoreItems && (
          <div className="flex justify-center mt-4">
            <Button
              variant="ghost"
              onClick={() => toggleChartExpansion('outputOutcome')}
              className="flex items-center gap-2"
            >
              {expandedCharts.outputOutcome ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  View More ({outputOutcomeData.length - 5} more)
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{userPreferences.enableBackstage ? "Job-Output-Outcome Mapping" : "Job-Outcome Mapping"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="ml-2 text-gray-500">Loading mapping data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{userPreferences.enableBackstage ? "Job-Output-Outcome Mapping" : "Job-Outcome Mapping"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40 text-red-500">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case "job-outcome":
        return "Shows the impact relationships between jobs and outcomes in your organization.";
      case "job-output":
        return "Shows the impact relationships between jobs and outputs in your organization.";
      case "output-outcome":
        return "Shows the impact relationships between outputs and outcomes in your organization.";
      default:
        return "Shows the impact relationships between jobs and outcomes in your organization.";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{userPreferences.enableBackstage ? "Job-Output-Outcome Mapping" : "Job-Outcome Mapping"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="job-outcome" className="w-full" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="job-outcome" className="px-4 py-2">Job → Outcome</TabsTrigger>
              {userPreferences.enableBackstage && (
                <>
                  <TabsTrigger value="job-output" className="px-4 py-2">Job → Output</TabsTrigger>
                  <TabsTrigger value="output-outcome" className="px-4 py-2">Output → Outcome</TabsTrigger>
                </>
              )}
            </TabsList>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>{getTabDescription(activeTab)}</p>
          </div>
          
          <TabsContent value="job-outcome" className="mt-6">
            {renderJobOutcomeChart()}
          </TabsContent>
          
          {userPreferences.enableBackstage && (
            <>
              <TabsContent value="job-output" className="mt-6">
                {renderJobOutputChart()}
              </TabsContent>
              
              <TabsContent value="output-outcome" className="mt-6">
                {renderOutputOutcomeChart()}
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MappingChart; 