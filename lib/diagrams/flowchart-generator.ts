/**
 * Flowchart generation using Anthropic theme design language
 * Integrates with infra-skills anthropic-theme-flowchart
 */

export interface FlowchartNode {
  id: string;
  label: string;
  description?: string;
  role: "input" | "process" | "decision" | "output" | "system" | "background";
}

export interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowchartConfig {
  title: string;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  layout?: "single-column" | "two-lane";
}

/**
 * Generate an HTML/CSS flowchart using Anthropic design language
 * Based on anthropic-theme-flowchart skill from infra-skills
 */
export function generateFlowchart(config: FlowchartConfig): string {
  const { title, nodes, edges } = config;

  // Color palette for roles (pastel theme)
  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    input: {
      bg: "#E8F5E9",
      text: "#2E7D32",
      border: "#81C784",
    },
    process: {
      bg: "#E3F2FD",
      text: "#1565C0",
      border: "#64B5F6",
    },
    decision: {
      bg: "#FFF3E0",
      text: "#E65100",
      border: "#FFB74D",
    },
    output: {
      bg: "#F3E5F5",
      text: "#6A1B9A",
      border: "#BA68C8",
    },
    system: {
      bg: "#ECEFF1",
      text: "#455A64",
      border: "#90A4AE",
    },
    background: {
      bg: "#FAFAFA",
      text: "#616161",
      border: "#BDBDBD",
    },
  };

  // Calculate layout dimensions
  const nodeWidth = 160;
  const nodeHeight = 80;
  const horizontalGap = 40;
  const verticalGap = 80;

  // Sort nodes for layout
  const sortedNodes = nodes.sort((a, b) => a.id.localeCompare(b.id));

  // Generate SVG connector lines
  let connectorSVG = "";
  const nodePositions: Record<string, { x: number; y: number }> = {};

  sortedNodes.forEach((node, index) => {
    nodePositions[node.id] = {
      x: horizontalGap + (index % 2) * (nodeWidth + 120),
      y: Math.floor(index / 2) * (nodeHeight + verticalGap) + verticalGap,
    };
  });

  edges.forEach((edge) => {
    const fromPos = nodePositions[edge.from];
    const toPos = nodePositions[edge.to];

    if (fromPos && toPos) {
      const x1 = fromPos.x + nodeWidth / 2;
      const y1 = fromPos.y + nodeHeight;
      const x2 = toPos.x + nodeWidth / 2;
      const y2 = toPos.y;

      connectorSVG += `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#999" stroke-width="2" marker-end="url(#arrowhead)" />
        ${edge.label ? `<text x="${(x1 + x2) / 2 + 10}" y="${(y1 + y2) / 2}" font-size="12" fill="#666">${edge.label}</text>` : ""}
      `;
    }
  });

  // Generate node elements
  let nodeHTML = "";
  sortedNodes.forEach((node) => {
    const pos = nodePositions[node.id];
    const colors = roleColors[node.role];

    nodeHTML += `
      <div class="flowchart-node" style="
        position: absolute;
        left: ${pos.x}px;
        top: ${pos.y}px;
        width: ${nodeWidth}px;
        background: ${colors.bg};
        border: 2px solid ${colors.border};
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      ">
        <div style="
          font-weight: 600;
          color: ${colors.text};
          font-size: 14px;
          line-height: 1.3;
          margin-bottom: 4px;
        ">${node.label}</div>
        ${node.description ? `<div style="font-size: 11px; color: ${colors.text}; opacity: 0.8;">${node.description}</div>` : ""}
      </div>
    `;
  });

  const svgHeight = Math.max(...Object.values(nodePositions).map((p) => p.y)) + nodeHeight + 40;
  const svgWidth = Math.max(...Object.values(nodePositions).map((p) => p.x)) + nodeWidth + 40;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #FAFAFA;
          padding: 40px;
          margin: 0;
        }
        .flowchart-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          padding: 40px;
        }
        h1 {
          color: #1a7f3f;
          margin-top: 0;
          margin-bottom: 30px;
          font-size: 24px;
          font-weight: 600;
        }
        .flowchart-canvas {
          position: relative;
          width: 100%;
          height: ${svgHeight}px;
          background: white;
          border: 1px solid #E0E0E0;
          border-radius: 8px;
          margin-top: 20px;
        }
        .flowchart-node {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
        }
        .flowchart-node:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="flowchart-container">
        <h1>${title}</h1>
        <svg width="${svgWidth}" height="${svgHeight}" style="position: absolute; top: 80px; left: 40px; pointer-events: none;">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#999"/>
            </marker>
          </defs>
          ${connectorSVG}
        </svg>
        <div class="flowchart-canvas">
          ${nodeHTML}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Pre-built flowchart templates for common agency workflows
 */
export const workflowTemplates = {
  leadIntake: (): FlowchartConfig => ({
    title: "Lead Intake Workflow",
    layout: "two-lane",
    nodes: [
      { id: "1", label: "Website Form", role: "input" },
      { id: "2", label: "Parse Submission", role: "process" },
      { id: "3", label: "Auto Categorize", role: "decision" },
      { id: "4", label: "Route to Specialist", role: "process" },
      { id: "5", label: "Send Confirmation", role: "output" },
      { id: "6", label: "Log to CRM", role: "system" },
    ],
    edges: [
      { from: "1", to: "2", label: "raw data" },
      { from: "2", to: "3", label: "parsed" },
      { from: "3", to: "4", label: "category" },
      { from: "4", to: "5", label: "assigned" },
      { from: "5", to: "6", label: "confirm" },
    ],
  }),

  contentPublishing: (): FlowchartConfig => ({
    title: "Content Publishing Pipeline",
    layout: "two-lane",
    nodes: [
      { id: "1", label: "Draft Content", role: "input" },
      { id: "2", label: "Review & Approve", role: "decision" },
      { id: "3", label: "Schedule Post", role: "process" },
      { id: "4", label: "Publish to Platforms", role: "process" },
      { id: "5", label: "Track Metrics", role: "system" },
      { id: "6", label: "Send Report", role: "output" },
    ],
    edges: [
      { from: "1", to: "2", label: "submit" },
      { from: "2", to: "3", label: "approved" },
      { from: "3", to: "4", label: "scheduled" },
      { from: "4", to: "5", label: "published" },
      { from: "5", to: "6", label: "data" },
    ],
  }),

  emailCampaign: (): FlowchartConfig => ({
    title: "Email Campaign Workflow",
    layout: "single-column",
    nodes: [
      { id: "1", label: "Create Campaign", role: "input" },
      { id: "2", label: "Build Email", role: "process" },
      { id: "3", label: "Set Recipients", role: "decision" },
      { id: "4", label: "Send Campaign", role: "process" },
      { id: "5", label: "Monitor Engagement", role: "system" },
      { id: "6", label: "Generate Report", role: "output" },
    ],
    edges: [
      { from: "1", to: "2" },
      { from: "2", to: "3" },
      { from: "3", to: "4" },
      { from: "4", to: "5" },
      { from: "5", to: "6" },
    ],
  }),

  projectDelivery: (): FlowchartConfig => ({
    title: "Website Project Delivery",
    layout: "two-lane",
    nodes: [
      { id: "1", label: "Project Kickoff", role: "input" },
      { id: "2", label: "Discovery & Planning", role: "process" },
      { id: "3", label: "Design Phase", role: "process" },
      { id: "4", label: "Client Review", role: "decision" },
      { id: "5", label: "Development", role: "process" },
      { id: "6", label: "Testing & QA", role: "system" },
      { id: "7", label: "Launch", role: "process" },
      { id: "8", label: "Handoff & Support", role: "output" },
    ],
    edges: [
      { from: "1", to: "2", label: "start" },
      { from: "2", to: "3", label: "ready" },
      { from: "3", to: "4", label: "designs" },
      { from: "4", to: "5", label: "approved" },
      { from: "5", to: "6", label: "build" },
      { from: "6", to: "7", label: "pass" },
      { from: "7", to: "8", label: "live" },
    ],
  }),

  socialMediaStrategy: (): FlowchartConfig => ({
    title: "Social Media Strategy Execution",
    layout: "single-column",
    nodes: [
      { id: "1", label: "Monthly Planning", role: "input" },
      { id: "2", label: "Content Calendar", role: "process" },
      { id: "3", label: "Content Creation", role: "process" },
      { id: "4", label: "Queue Posts", role: "process" },
      { id: "5", label: "Engage & Respond", role: "background" },
      { id: "6", label: "Weekly Analytics", role: "system" },
      { id: "7", label: "Monthly Report", role: "output" },
    ],
    edges: [
      { from: "1", to: "2" },
      { from: "2", to: "3" },
      { from: "3", to: "4" },
      { from: "4", to: "5" },
      { from: "5", to: "6" },
      { from: "6", to: "7" },
    ],
  }),

  clientOnboarding: (): FlowchartConfig => ({
    title: "Client Onboarding Process",
    layout: "two-lane",
    nodes: [
      { id: "1", label: "Contract Signed", role: "input" },
      { id: "2", label: "Send Welcome Kit", role: "process" },
      { id: "3", label: "Schedule Kickoff", role: "process" },
      { id: "4", label: "Discovery Meeting", role: "background" },
      { id: "5", label: "Collect Assets", role: "decision" },
      { id: "6", label: "Setup Accounts", role: "system" },
      { id: "7", label: "Project Begins", role: "output" },
    ],
    edges: [
      { from: "1", to: "2" },
      { from: "2", to: "3" },
      { from: "3", to: "4" },
      { from: "4", to: "5" },
      { from: "5", to: "6" },
      { from: "6", to: "7" },
    ],
  }),
};
