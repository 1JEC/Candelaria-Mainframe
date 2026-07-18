"use client";

import { useState } from "react";
import ProcessGuides from "@/components/dashboard/ProcessGuides";
import WorkflowDiagrams from "@/components/dashboard/WorkflowDiagrams";

export default function SkillsPage() {
  const [tab, setTab] = useState<"guides" | "workflows">("guides");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("guides")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "guides"
              ? "border-brand-green text-brand-green"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Process Guides
        </button>
        <button
          onClick={() => setTab("workflows")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "workflows"
              ? "border-brand-green text-brand-green"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Workflow Diagrams
        </button>
      </div>

      {tab === "guides" ? <ProcessGuides /> : <WorkflowDiagrams />}
    </div>
  );
}
