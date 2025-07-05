"use client";

import MatrixTree from "../../components/outcome-decision-tree/outcome-decision-tree";

export default function OutcomeDecisionTreePage() {
  return (
    <div className="w-full px-4 py-8 max-w-full" style={{ maxWidth: "100vw" }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Outcome Decision Tree</h1>
      </div>
      
      <div className="w-full max-w-none">
        <MatrixTree />
      </div>
    </div>
  );
}