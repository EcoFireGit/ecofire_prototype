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
  const [itemColors, setItemColors] = useState<Map<string, string>>(new Map());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredBarItem, setHoveredBarItem] = useState<string | null>(null);
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

  // Initialize colors for all items when mapping data is loaded
  useEffect(() => {
    if (mappingData) {
      const newItemColors = new Map<string, string>();
      
      // Collect all unique item names
      const allItems = new Set<string>();
      
      // Add all job names
      mappingData.jobs.forEach(job => allItems.add(job.name));
      
      // Add all output names
      mappingData.outputs.forEach(output => allItems.add(output.name));
      
      // Generate colors for all items
      allItems.forEach(itemName => {
        // Generate a hash code from the item name
        const hashCode = itemName.split('').reduce((acc, char) => {
          return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        // Try to find a unique color
        let attempts = 0;
        let color: string;
        let h: number, s: number, l: number;
        
        do {
          // Use the hash as base, but add attempts to find unique colors
          h = Math.abs((hashCode + attempts * 137) % 360);
          s = 65 + ((hashCode + attempts) % 20);
          l = 55 + ((hashCode + attempts * 2) % 15);
          
          color = `hsl(${h}, ${s}%, ${l}%)`;
          attempts++;
          
          if (attempts > 100) {
            console.warn(`Could not find unique color for ${itemName} after 100 attempts`);
            break;
          }
        } while (Array.from(newItemColors.values()).includes(color));
        
        newItemColors.set(itemName, color);
      });
      
      setItemColors(newItemColors);
    }
  }, [mappingData]);

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

  // Get the color for an item (colors are pre-generated)
  const getItemColor = (itemName: string) => {
    return itemColors.get(itemName) || '#6B7280'; // fallback gray color
  };

  // Calculate Job % impact on Output
  const calculateJobOutputImpact = (jobId: string, outputId: string): number => {
    if (!mappingData) return 0;
    
    const mapping = mappingData.jobOutputMappings.find(
      m => m.jobId === jobId && m.outputId === outputId
    );
    
    if (!mapping) return 0;
    
    const output = mappingData.outputs.find(o => o.id === outputId);
    if (!output) return 0;
    
    const denominator = output.targetValue - output.beginningValue;
    if (denominator <= 0) return 0;
    
    // Return raw impact value, we'll normalize it later
    const result = mapping.impactValue / denominator;
    
    return result;
  };

  // Calculate Output % impact on Outcome
  const calculateOutputOutcomeImpact = (outputId: string, outcomeId: string): number => {
    if (!mappingData) return 0;
    
    const mapping = mappingData.outputOutcomeMappings.find(
      m => m.outputId === outputId && m.outcomeId === outcomeId
    );
    
    if (!mapping) return 0;
    
    const outcome = mappingData.outcomes.find(o => o.id === outcomeId);
    if (!outcome) return 0;
    
    const denominator = outcome.targetValue - outcome.beginningValue;
    if (denominator <= 0) return 0;
    
    // Calculate raw impact: output-outcome impact / (outcome target - outcome beginning)
    const result = mapping.impact / denominator;
    
    return result;
  };

  // Calculate Job % impact on Outcome
  const calculateJobOutcomeImpact = (jobId: string, outcomeId: string): number => {
    if (!mappingData) return 0;
    
    let totalImpact = 0;
    
    // Get all outputs that this job impacts
    const jobOutputs = mappingData.jobOutputMappings.filter(m => m.jobId === jobId);
    
    jobOutputs.forEach((jobOutput) => {
      // Calculate job's impact on this output
      const jobOutputImpact = calculateJobOutputImpact(jobId, jobOutput.outputId);
      
      // Calculate this output's impact on the outcome
      const outputOutcomeImpact = calculateOutputOutcomeImpact(jobOutput.outputId, outcomeId);
      
      // Multiply the two raw impacts
      const pathImpact = jobOutputImpact * outputOutcomeImpact;
      totalImpact += pathImpact;
    });
    
    return totalImpact;
  };

  const renderJobOutcomeChart = () => {
    if (!mappingData) return null;

    // Group by outcomes, with jobs as stacks
    const outcomeJobData = mappingData.outcomes.map(outcome => {
      const jobImpacts = mappingData.jobs.map(job => {
        const impact = calculateJobOutcomeImpact(job.id, outcome.id);
        return {
          jobId: job.id,
          jobName: job.name,
          impact
        };
      }).filter(job => job.impact > 0)
      .sort((a, b) => b.impact - a.impact);

      // Calculate total impact for this outcome to normalize to percentages
      const totalImpact = jobImpacts.reduce((sum, job) => sum + job.impact, 0);
      
      // Convert to percentages
      const jobImpactsWithPercentages = jobImpacts.map(job => {
        const percentage = totalImpact > 0 ? (job.impact / totalImpact) * 100 : 0;
        return {
          ...job,
          impact: percentage
        };
      });

      return {
        outcomeId: outcome.id,
        outcomeName: outcome.name,
        jobs: jobImpactsWithPercentages
      };
    }).filter(outcome => outcome.jobs.length > 0)
    .sort((a, b) => {
      const aTotal = a.jobs.reduce((sum, job) => sum + job.impact, 0);
      const bTotal = b.jobs.reduce((sum, job) => sum + job.impact, 0);
      return bTotal - aTotal;
    });

    const displayData = expandedCharts.jobOutcome ? outcomeJobData : outcomeJobData.slice(0, 5);
    const hasMoreItems = outcomeJobData.length > 5;

    return (
      <div className="space-y-4">
        {displayData.map((outcome, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{outcome.outcomeName}</h4>
            </div>
            
            <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
              {outcome.jobs.map((job, jobIndex) => {
                const isFirst = jobIndex === 0;
                const isLast = jobIndex === outcome.jobs.length - 1;
                
                return (
                  <div
                    key={jobIndex}
                    className={`absolute h-full transition-all duration-200 hover:brightness-110 cursor-pointer ${
                      isFirst ? 'rounded-l-full' : ''
                    } ${
                      isLast ? 'rounded-r-full' : ''
                    }`}
                    style={{
                      left: `${outcome.jobs.slice(0, jobIndex).reduce((sum, j) => sum + j.impact, 0)}%`,
                      width: `${job.impact}%`,
                      backgroundColor: getItemColor(job.jobName)
                    }}
                    title={`"${job.jobName}" contributes ${job.impact.toFixed(1)}%`}
                    onMouseEnter={() => setHoveredBarItem(job.jobName)}
                    onMouseLeave={() => setHoveredBarItem(null)}
                  />
                );
              })}
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {outcome.jobs.map((job, jobIndex) => (
                <div 
                  key={jobIndex} 
                  className="flex items-center text-xs cursor-pointer"
                  onMouseEnter={() => setHoveredItem(job.jobName)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div 
                    className="w-3 h-3 rounded mr-1"
                    style={{ backgroundColor: getItemColor(job.jobName) }}
                  ></div>
                  <span className={`text-gray-600 ${(hoveredItem === job.jobName || hoveredBarItem === job.jobName) ? '' : 'truncate max-w-[80px]'}`}>
                    {(hoveredItem === job.jobName || hoveredBarItem === job.jobName)
                      ? <>{job.jobName} <span className="text-gray-400">({job.impact.toFixed(1)}%)</span></>
                      : (job.jobName.length > 10 ? `${job.jobName.substring(0, 10)}...` : job.jobName)
                    }
                  </span>
                </div>
              ))}
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
                  View More ({outcomeJobData.length - 5} more)
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

    // Group by outputs, with jobs as stacks
    const outputJobData = mappingData.outputs.map(output => {
      const jobImpacts = mappingData.jobs.map(job => {
        const impact = calculateJobOutputImpact(job.id, output.id);
        return {
          jobId: job.id,
          jobName: job.name,
          impact
        };
      }).filter(job => job.impact > 0)
      .sort((a, b) => b.impact - a.impact);

      // Calculate total impact for this output to normalize to percentages
      const totalImpact = jobImpacts.reduce((sum, job) => sum + job.impact, 0);
      
      // Convert to percentages
      const jobImpactsWithPercentages = jobImpacts.map(job => {
        const percentage = totalImpact > 0 ? (job.impact / totalImpact) * 100 : 0;
        return {
          ...job,
          impact: percentage
        };
      });

      return {
        outputId: output.id,
        outputName: output.name,
        jobs: jobImpactsWithPercentages
      };
    }).filter(output => output.jobs.length > 0)
    .sort((a, b) => {
      const aTotal = a.jobs.reduce((sum, job) => sum + job.impact, 0);
      const bTotal = b.jobs.reduce((sum, job) => sum + job.impact, 0);
      return bTotal - aTotal;
    });

    const displayData = expandedCharts.jobOutput ? outputJobData : outputJobData.slice(0, 5);
    const hasMoreItems = outputJobData.length > 5;

    return (
      <div className="space-y-4">
        {displayData.map((output, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{output.outputName}</h4>
            </div>
            
            <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
              {output.jobs.map((job, jobIndex) => {
                const isFirst = jobIndex === 0;
                const isLast = jobIndex === output.jobs.length - 1;
                
                return (
                  <div
                    key={jobIndex}
                    className={`absolute h-full transition-all duration-200 hover:brightness-110 cursor-pointer ${
                      isFirst ? 'rounded-l-full' : ''
                    } ${
                      isLast ? 'rounded-r-full' : ''
                    }`}
                    style={{
                      left: `${output.jobs.slice(0, jobIndex).reduce((sum, j) => sum + j.impact, 0)}%`,
                      width: `${job.impact}%`,
                      backgroundColor: getItemColor(job.jobName)
                    }}
                    title={`"${job.jobName}" contributes ${job.impact.toFixed(1)}%`}
                    onMouseEnter={() => setHoveredBarItem(job.jobName)}
                    onMouseLeave={() => setHoveredBarItem(null)}
                  />
                );
              })}
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {output.jobs.map((job, jobIndex) => (
                <div 
                  key={jobIndex} 
                  className="flex items-center text-xs cursor-pointer"
                  onMouseEnter={() => setHoveredItem(job.jobName)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div 
                    className="w-3 h-3 rounded mr-1"
                    style={{ backgroundColor: getItemColor(job.jobName) }}
                  ></div>
                  <span className={`text-gray-600 ${(hoveredItem === job.jobName || hoveredBarItem === job.jobName) ? '' : 'truncate max-w-[80px]'}`}>
                    {(hoveredItem === job.jobName || hoveredBarItem === job.jobName)
                      ? <>{job.jobName} <span className="text-gray-400">({job.impact.toFixed(1)}%)</span></>
                      : (job.jobName.length > 10 ? `${job.jobName.substring(0, 10)}...` : job.jobName)
                    }
                  </span>
                </div>
              ))}
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
                  View More ({outputJobData.length - 5} more)
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

    // Group by outcomes, with outputs as stacks
    const outcomeOutputData = mappingData.outcomes.map(outcome => {
      const outputImpacts = mappingData.outputs.map(output => {
        const impact = calculateOutputOutcomeImpact(output.id, outcome.id);
        return {
          outputId: output.id,
          outputName: output.name,
          impact
        };
      }).filter(output => output.impact > 0)
      .sort((a, b) => b.impact - a.impact);
      


      // Calculate total impact for this outcome to normalize to percentages
      const totalImpact = outputImpacts.reduce((sum, output) => sum + output.impact, 0);
      
      // Convert to percentages
      const outputImpactsWithPercentages = outputImpacts.map(output => {
        const percentage = totalImpact > 0 ? (output.impact / totalImpact) * 100 : 0;
        return {
          ...output,
          impact: percentage
        };
      });
      


      return {
        outcomeId: outcome.id,
        outcomeName: outcome.name,
        outputs: outputImpactsWithPercentages
      };
    }).filter(outcome => outcome.outputs.length > 0)
    .sort((a, b) => {
      const aTotal = a.outputs.reduce((sum, output) => sum + output.impact, 0);
      const bTotal = b.outputs.reduce((sum, output) => sum + output.impact, 0);
      return bTotal - aTotal;
    });

    const displayData = expandedCharts.outputOutcome ? outcomeOutputData : outcomeOutputData.slice(0, 5);
    const hasMoreItems = outcomeOutputData.length > 5;

    return (
      <div className="space-y-4">
        {displayData.map((outcome, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{outcome.outcomeName}</h4>
            </div>
            
            <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
              {outcome.outputs.map((output, outputIndex) => {
                const isFirst = outputIndex === 0;
                const isLast = outputIndex === outcome.outputs.length - 1;
                
                return (
                  <div
                    key={outputIndex}
                    className={`absolute h-full transition-all duration-200 hover:brightness-110 cursor-pointer ${
                      isFirst ? 'rounded-l-full' : ''
                    } ${
                      isLast ? 'rounded-r-full' : ''
                    }`}
                    style={{
                      left: `${outcome.outputs.slice(0, outputIndex).reduce((sum, o) => sum + o.impact, 0)}%`,
                      width: `${output.impact}%`,
                      backgroundColor: getItemColor(output.outputName)
                    }}
                    title={`"${output.outputName}" contributes ${output.impact.toFixed(1)}%`}
                    onMouseEnter={() => setHoveredBarItem(output.outputName)}
                    onMouseLeave={() => setHoveredBarItem(null)}
                  />
                );
              })}
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {outcome.outputs.map((output, outputIndex) => (
                <div 
                  key={outputIndex} 
                  className="flex items-center text-xs cursor-pointer"
                  onMouseEnter={() => setHoveredItem(output.outputName)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div 
                    className="w-3 h-3 rounded mr-1"
                    style={{ backgroundColor: getItemColor(output.outputName) }}
                  ></div>
                  <span className={`text-gray-600 ${(hoveredItem === output.outputName || hoveredBarItem === output.outputName) ? '' : 'truncate max-w-[80px]'}`}>
                    {(hoveredItem === output.outputName || hoveredBarItem === output.outputName)
                      ? <>{output.outputName} <span className="text-gray-400">({output.impact.toFixed(1)}%)</span></>
                      : (output.outputName.length > 10 ? `${output.outputName.substring(0, 10)}...` : output.outputName)
                    }
                  </span>
                </div>
              ))}
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
                  View More ({outcomeOutputData.length - 5} more)
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
        return "Shows how jobs contribute to outcomes through their impact on outputs.";
      case "job-output":
        return "Shows how jobs directly impact outputs in your organization.";
      case "output-outcome":
        return "Shows how outputs contribute to outcomes in your organization.";
      default:
        return "Shows how jobs contribute to outcomes through their impact on outputs.";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{userPreferences.enableBackstage ? "Job-Output-Outcome Mapping" : "Outcome → Jobs Mapping"}</CardTitle>
      </CardHeader>
      <CardContent>
        {userPreferences.enableBackstage ? (
          <Tabs defaultValue="job-outcome" className="w-full" onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <TabsTrigger value="job-outcome" className="px-4 py-2">Outcome → Jobs</TabsTrigger>
                <TabsTrigger value="job-output" className="px-4 py-2">Output → Jobs</TabsTrigger>
                <TabsTrigger value="output-outcome" className="px-4 py-2">Outcome → Outputs</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p>{getTabDescription(activeTab)}</p>
            </div>
            
            <TabsContent value="job-outcome" className="mt-6">
              {renderJobOutcomeChart()}
            </TabsContent>
            
            <TabsContent value="job-output" className="mt-6">
              {renderJobOutputChart()}
            </TabsContent>
            
            <TabsContent value="output-outcome" className="mt-6">
              {renderOutputOutcomeChart()}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="w-full">
            <div className="mt-4 text-sm text-gray-600">
              <p>{getTabDescription("job-outcome")}</p>
            </div>
            
            <div className="mt-6">
              {renderJobOutcomeChart()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MappingChart; 