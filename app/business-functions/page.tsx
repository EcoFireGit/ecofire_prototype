"use client";

import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/business-functions/table/business-functions-table";
import { columns as businessFunctionColumns } from "@/components/business-functions/table/columns";
import { Button } from "@/components/ui/button";

export default function BusinessFunctionsPage() {
  const [businessFunctions, setBusinessFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessFunctions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/business-functions");
      const data = await res.json();
      if (data.success) {
        setBusinessFunctions(
          data.data.map((bf: any) => ({
            id: bf._id,
            name: bf.name,
            isDefault: bf.isDefault,
            jobCount: bf.jobCount,
          }))
        );
      } else {
        setError(data.error || "Failed to fetch business functions");
      }
    } catch (e) {
      setError("Failed to fetch business functions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinessFunctions();
    // Listen for job updates to refresh
    const handler = () => fetchBusinessFunctions();
    window.addEventListener("refreshBusinessFunctions", handler);
    return () => window.removeEventListener("refreshBusinessFunctions", handler);
  }, [fetchBusinessFunctions]);

  // Pass refresh to table actions if needed
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Business Functions</h1>
        <Button onClick={fetchBusinessFunctions} disabled={loading}>
          Refresh
        </Button>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <DataTable columns={businessFunctionColumns(() => fetchBusinessFunctions(), () => {})} data={businessFunctions} />
    </div>
  );
}
