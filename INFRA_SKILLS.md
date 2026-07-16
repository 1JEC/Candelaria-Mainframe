# Infra-Skills Integration

Mainframe HQ integrates specialized AI infrastructure skills from the [infra-skills repository](https://github.com/yzlnew/infra-skills.git).

## Overview

The integration provides:

- **Workflow Diagrams** — Visualize agency processes with HTML/CSS flowcharts using Anthropic design language
- **Architecture Diagrams** — Generate technical architecture visualizations
- **Performance Estimation** — Memory and resource usage calculators for infrastructure planning

## Available Features

### 1. Workflow Diagrams

Generate visual flowcharts for agency workflows:

**Pre-built Templates:**
- **Lead Intake** — Website form → Parse → Categorize → Route → Confirm
- **Content Publishing** — Draft → Review → Schedule → Publish → Track metrics
- **Email Campaigns** — Create → Build → Target → Send → Monitor

**Access:**
- Navigate to Dashboard → Workflow Diagrams
- Select a template to view the interactive diagram
- Or use the API: `GET /api/diagrams/flowchart?template=lead-intake`

**Custom Diagrams:**

POST to `/api/diagrams/flowchart` with:

```json
{
  "title": "Custom Workflow",
  "nodes": [
    { "id": "1", "label": "Start", "role": "input" },
    { "id": "2", "label": "Process", "role": "process" },
    { "id": "3", "label": "Decision", "role": "decision" },
    { "id": "4", "label": "End", "role": "output" }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "begin" },
    { "from": "2", "to": "3", "label": "check" },
    { "from": "3", "to": "4", "label": "complete" }
  ]
}
```

**Node Roles:**
- `input` — External data source
- `process` — Action or transformation
- `decision` — Branch point
- `output` — Result or delivery
- `system` — Internal system
- `background` — Support process

### 2. Anthropic Design Language

Workflow diagrams use:

- **Warm neutral surfaces** — `#FAFAFA` background
- **Pastel role-based fills** — Color-coded by function
- **Transparent grouping** — Dashed containers for related nodes
- **SF Pro typography** — System font stack for modern look
- **Orthogonal connectors** — Clean, right-angle arrows
- **Restrained shadows** — Subtle depth

## File Structure

```
lib/diagrams/
├── flowchart-generator.ts      # Diagram generation logic
│   ├── generateFlowchart()     # Core function
│   ├── workflowTemplates       # Pre-built workflows
│   └── roleColors              # Design tokens

app/api/diagrams/
└── flowchart/
    └── route.ts                 # API endpoints

components/dashboard/
└── WorkflowDiagrams.tsx        # Dashboard component
```

## Reference Implementation

The `flowchart-generator.ts` module provides:

```typescript
// Generate flowchart
const html = generateFlowchart({
  title: "My Workflow",
  nodes: [...],
  edges: [...],
  layout: "single-column"
});

// Use templates
const config = workflowTemplates.leadIntake();
```

## Future Enhancements

Potential integrations with other infra-skills:

- **HF Architecture TikZ** — Visualize LLM model architectures
- **Material You Slides** — Generate presentation templates
- **Megatron Memory Estimator** — Resource usage calculations
- **TikZ Flowcharts** — LaTeX-based technical diagrams

## Related Resources

- [Infra-Skills Repository](https://github.com/yzlnew/infra-skills.git)
- [Anthropic Flowchart Skill](../infra-skills/anthropic-theme-flowchart/SKILL.md)
- Installed at: `/Users/jcandelaria/infra-skills/`

## Development

To modify diagram templates:

1. Edit `workflowTemplates` in `lib/diagrams/flowchart-generator.ts`
2. Run `npm run build` to verify compilation
3. Test via dashboard or API endpoint

To customize colors:

1. Modify `roleColors` object
2. Update design tokens in Tailwind config if needed
3. Rebuild and test
