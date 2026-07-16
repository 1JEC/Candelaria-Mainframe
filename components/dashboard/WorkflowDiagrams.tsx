"use client";

import { useState } from "react";

interface Workflow {
  id: string;
  name: string;
  description: string;
  template: string;
}

const WORKFLOWS: Workflow[] = [
  {
    id: "lead-intake",
    name: "Lead Intake Workflow",
    description: "End-to-end process for capturing and routing new leads",
    template: "lead-intake",
  },
  {
    id: "content-publishing",
    name: "Content Publishing Pipeline",
    description: "From draft to multi-platform publication with metrics tracking",
    template: "content-publishing",
  },
  {
    id: "email-campaign",
    name: "Email Campaign Workflow",
    description: "Create, build, send, and monitor email campaigns",
    template: "email-campaign",
  },
  {
    id: "project-delivery",
    name: "Website Project Delivery",
    description: "Complete website project lifecycle from kickoff to launch",
    template: "project-delivery",
  },
  {
    id: "social-media-strategy",
    name: "Social Media Strategy Execution",
    description: "Monthly planning through content creation and analytics",
    template: "social-media-strategy",
  },
  {
    id: "client-onboarding",
    name: "Client Onboarding Process",
    description: "Structured process for welcoming and setting up new clients",
    template: "client-onboarding",
  },
];

export default function WorkflowDiagrams() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleViewWorkflow = (template: string) => {
    setIsLoading(true);
    setSelectedWorkflow(template);
    // The iframe will load the flowchart from the API
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-black mb-2">Workflow Diagrams</h2>
        <p className="text-gray-600">Visualize agency workflows and processes</p>
      </div>

      {!selectedWorkflow ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WORKFLOWS.map((workflow) => (
            <div
              key={workflow.id}
              className="p-6 border border-gray-200 rounded-lg hover:border-brand-green hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleViewWorkflow(workflow.template)}
            >
              <h3 className="font-semibold text-brand-black mb-2">{workflow.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{workflow.description}</p>
              <button className="text-brand-green hover:text-brand-green-dark font-medium text-sm">
                View Diagram →
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedWorkflow(null)}
            className="inline-flex items-center gap-2 text-brand-green hover:text-brand-green-dark font-medium text-sm"
          >
            ← Back to Workflows
          </button>

          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {isLoading && (
              <div className="flex items-center justify-center h-96 bg-gray-50">
                <div className="text-gray-500">Loading diagram...</div>
              </div>
            )}
            <iframe
              key={selectedWorkflow}
              src={`/api/diagrams/flowchart?template=${selectedWorkflow}`}
              className="w-full h-screen border-0"
              title="Workflow Diagram"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
