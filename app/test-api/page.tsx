
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TestAPI() {
  const [missionStatement, setMissionStatement] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test GET request
  const testGetMission = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mission");
      const data = await response.json();
      setResponse(data);
      if (data.statement) {
        setMissionStatement(data.statement);
      }
    } catch (err) {
      setError("Error fetching mission: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // Test POST request
  const testPostMission = async () => {
    if (!missionStatement.trim()) {
      setError("Please enter a mission statement");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statement: missionStatement }),
      });
      const data = await response.json();
      setResponse(data);
    } catch (err) {
      setError("Error updating mission: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // Load mission on component mount
  useEffect(() => {
    testGetMission();
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">API Testing Page</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Mission API</h2>
        
        <div className="space-y-4 mb-4">
          <div>
            <label className="block mb-2">Mission Statement</label>
            <Input
              value={missionStatement}
              onChange={(e) => setMissionStatement(e.target.value)}
              placeholder="Enter mission statement"
              className="w-full"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={testGetMission} disabled={isLoading}>
              GET Mission
            </Button>
            <Button onClick={testPostMission} disabled={isLoading}>
              POST Mission
            </Button>
          </div>
        </div>

        {isLoading && <div className="text-blue-500">Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        
        {response && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Response:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
