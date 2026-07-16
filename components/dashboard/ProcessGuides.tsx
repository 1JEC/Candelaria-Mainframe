"use client";

import { useState } from "react";

interface Guide {
  id: string;
  title: string;
  category: string;
  description: string;
  steps: string[];
  icon: string;
}

const PROCESS_GUIDES: Guide[] = [
  {
    id: "respond-to-lead",
    title: "Responding to New Leads",
    category: "Client Management",
    description: "Best practices for engaging with incoming leads from the website",
    steps: [
      "Review lead information in the CRM",
      "Check if lead matches ideal client profile",
      "Send personalized welcome email within 2 hours",
      "Schedule discovery call if qualified",
      "Log follow-up in audit system",
    ],
    icon: "📧",
  },
  {
    id: "create-post",
    title: "Publishing Social Media Content",
    category: "Content Strategy",
    description: "Step-by-step guide to creating and publishing content",
    steps: [
      "Create content in draft mode",
      "Add relevant hashtags and mentions",
      "Schedule post for optimal time",
      "Get manager approval before publishing",
      "Monitor engagement for 24 hours",
      "Share results in weekly report",
    ],
    icon: "📱",
  },
  {
    id: "onboard-client",
    title: "Onboarding a New Client",
    category: "Client Management",
    description: "Complete checklist for bringing new clients into the system",
    steps: [
      "Send welcome package and project brief",
      "Schedule kickoff meeting",
      "Collect client branding guidelines",
      "Set up project in project management tool",
      "Create communication schedule",
      "Begin discovery phase",
    ],
    icon: "🤝",
  },
  {
    id: "track-metrics",
    title: "Tracking Performance Metrics",
    category: "Analytics",
    description: "How to measure and report on campaign performance",
    steps: [
      "Collect data from all platforms daily",
      "Update dashboard metrics",
      "Analyze trends and anomalies",
      "Create weekly summary report",
      "Identify optimization opportunities",
      "Present insights to client",
    ],
    icon: "📊",
  },
  {
    id: "handle-email",
    title: "Managing Client Communications",
    category: "Client Management",
    description: "Protocol for handling incoming and outgoing emails",
    steps: [
      "Check inbox at start of day",
      "Triage emails by priority",
      "Respond within 4 business hours",
      "Log conversation in CRM",
      "Archive when complete",
      "Include in client communication log",
    ],
    icon: "💬",
  },
  {
    id: "approve-deliverables",
    title: "Approving Project Deliverables",
    category: "Quality Assurance",
    description: "QA process for website projects before client delivery",
    steps: [
      "Review against project specification",
      "Test all functionality and links",
      "Check responsive design on devices",
      "Verify SEO implementation",
      "Get stakeholder sign-off",
      "Deliver to client",
    ],
    icon: "✅",
  },
];

export default function ProcessGuides() {
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(PROCESS_GUIDES.map((g) => g.category)));
  const filteredGuides = selectedCategory ? PROCESS_GUIDES.filter((g) => g.category === selectedCategory) : PROCESS_GUIDES;
  const selectedGuideData = PROCESS_GUIDES.find((g) => g.id === selectedGuide);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-black mb-2">Process Guides</h2>
        <p className="text-gray-600">Step-by-step guides for common agency tasks</p>
      </div>

      {!selectedGuide ? (
        <>
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedCategory === null
                  ? "bg-brand-green text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  selectedCategory === category
                    ? "bg-brand-green text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Guides grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGuides.map((guide) => (
              <div
                key={guide.id}
                className="p-6 bg-white border border-gray-200 rounded-lg hover:border-brand-green hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedGuide(guide.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{guide.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-brand-black mb-1">{guide.title}</h3>
                    <p className="text-xs text-brand-green font-medium mb-2">{guide.category}</p>
                    <p className="text-sm text-gray-600">{guide.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : selectedGuideData ? (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedGuide(null)}
            className="inline-flex items-center gap-2 text-brand-green hover:text-brand-green-dark font-medium text-sm"
          >
            ← Back to Guides
          </button>

          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-5xl">{selectedGuideData.icon}</div>
              <div>
                <h1 className="text-3xl font-bold text-brand-black mb-2">{selectedGuideData.title}</h1>
                <p className="text-gray-600">{selectedGuideData.description}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-brand-black mb-4">Step-by-Step</h2>
              <div className="space-y-4">
                {selectedGuideData.steps.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-brand-green text-white font-semibold">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 mt-8 pt-6">
              <div className="bg-brand-green/5 border border-brand-green/20 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Pro tip:</strong> Save this guide to your bookmarks for quick reference. All actions are logged in
                  the audit system for compliance tracking.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
