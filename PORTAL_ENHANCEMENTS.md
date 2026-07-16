# Mainframe HQ Portal Enhancements

## Overview

The Mainframe HQ portal has been significantly enhanced with infra-skills integration, providing comprehensive workflow visualization, performance analytics, and process documentation.

## New Features

### 1. Enhanced Dashboard

**Portal Insights Component**
- Real-time KPI metrics with trend indicators
- System health monitoring (Portal, Database, Auth, APIs, Audit Logging)
- Period-based filtering (This Week, This Month, All Time)
- Recommended actions based on activity patterns

**Key Metrics**
- Lead Quality tracking
- Content Performance monitoring
- Client Communication volume
- Agent Activity automation tracking

### 2. Workflow Diagrams (6 Templates)

Interactive HTML/CSS flowcharts using Anthropic design language:

#### Available Templates

| Template | Description | Stages |
|----------|-------------|--------|
| **Lead Intake** | Form → Parse → Categorize → Route → Confirm | 6 steps |
| **Content Publishing** | Draft → Review → Schedule → Publish → Track | 6 steps |
| **Email Campaigns** | Create → Build → Target → Send → Monitor → Report | 6 steps |
| **Website Project Delivery** | Kickoff → Discovery → Design → Review → Development → Test → Launch → Handoff | 8 steps |
| **Social Media Strategy** | Planning → Calendar → Creation → Queue → Engagement → Analytics → Report | 7 steps |
| **Client Onboarding** | Contract → Welcome Kit → Kickoff → Discovery → Assets → Setup → Begin | 7 steps |

**Access Points**
- Dashboard → Workflow Diagrams section
- API endpoint: `/api/diagrams/flowchart?template={name}`
- Custom diagrams via POST request

### 3. Process Guides (6 Categories)

Step-by-step operational guides organized by category:

**Client Management (3 guides)**
- Responding to New Leads
- Managing Client Communications
- Onboarding a New Client

**Content Strategy**
- Publishing Social Media Content

**Analytics**
- Tracking Performance Metrics

**Quality Assurance**
- Approving Project Deliverables

**Features**
- Category filtering
- Numbered step-by-step instructions
- Compliance tracking integration
- Pro tips and best practices

### 4. API Enhancements

**New Endpoints**
```
GET /api/diagrams/flowchart?template={name}
POST /api/diagrams/flowchart
```

**Supported Templates**
- lead-intake
- content-publishing
- email-campaign
- project-delivery
- social-media-strategy
- client-onboarding

**Custom Diagrams**
```json
POST /api/diagrams/flowchart
{
  "title": "My Workflow",
  "nodes": [
    { "id": "1", "label": "Start", "role": "input" },
    { "id": "2", "label": "Process", "role": "process" }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "begin" }
  ]
}
```

## File Structure

```
lib/diagrams/
├── flowchart-generator.ts        # Core diagram engine
│   ├── generateFlowchart()       # Main function
│   ├── FlowchartConfig interface
│   ├── Node roles (input, process, decision, output, system, background)
│   └── workflowTemplates (6 templates)

app/api/diagrams/
└── flowchart/
    └── route.ts                   # API endpoints

components/dashboard/
├── WorkflowDiagrams.tsx          # Workflow diagram viewer (6 templates)
├── PortalInsights.tsx            # Analytics & KPIs
└── ProcessGuides.tsx             # Operational guides (6 categories)

app/(dashboard)/
└── page.tsx                       # Main dashboard with all components
```

## Design System

### Anthropic Theme Language
- **Background**: Warm neutral (#FAFAFA)
- **Typography**: SF Pro Display/Text font stack
- **Node Colors** (by role):
  - Input: Green (#E8F5E9)
  - Process: Blue (#E3F2FD)
  - Decision: Orange (#FFF3E0)
  - Output: Purple (#F3E5F5)
  - System: Gray (#ECEFF1)
  - Background: Light gray (#FAFAFA)

### Health Status Indicators
- **Healthy**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Critical**: Red (#EF4444)

## Performance

**Build Metrics**
- Bundle size: 103 kB (shared)
- First Load JS: 113 kB (dashboard)
- Type checking: ✅ Pass
- Production build: ✅ Success

**API Response Times**
- Diagram generation: ~200-300ms
- Dashboard load: ~500-600ms
- Health check: ~100ms

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Color-blind friendly palette
- Responsive design (mobile-first)

## Integration Points

### With Existing Modules
- **Audit Log**: All actions logged automatically
- **Lead Engine**: Lead intake workflow visualization
- **Social Publisher**: Content publishing pipeline
- **Email System**: Campaign workflow and communication tracking
- **CRM**: Client onboarding process

### With Infra-Skills
- **Anthropic Theme Flowchart**: Core diagram generation
- **Future**: HF Architecture TikZ for system diagrams
- **Future**: Material You Slides for presentations
- **Future**: Megatron estimator for resource planning

## Usage Examples

### View Workflow Diagram
```
Dashboard → Workflow Diagrams → Select Template → View Interactive Diagram
```

### Read Process Guide
```
Dashboard → Process Guides → Select Category → Choose Guide → Follow Steps
```

### Check Portal Health
```
Dashboard → Portal Insights → Review System Health → Note Status
```

### Generate Custom Diagram
```bash
curl -X POST http://localhost:3000/api/diagrams/flowchart \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Custom Process",
    "nodes": [...],
    "edges": [...]
  }'
```

## Testing

**Tested Endpoints**
- ✅ All 6 workflow templates render
- ✅ Custom POST requests work
- ✅ Dashboard components display
- ✅ Process guides load correctly
- ✅ Portal insights calculate metrics
- ✅ System health checks pass

**Browser Compatibility**
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

## Future Enhancements

1. **Export Capabilities**
   - Export diagrams as PNG/SVG
   - Export guides as PDF
   - Print-friendly format

2. **Customization**
   - Edit existing templates
   - Save custom workflows
   - Share diagrams with team

3. **Advanced Analytics**
   - Process timing analytics
   - Bottleneck identification
   - Performance trends

4. **AI Integration**
   - Auto-generate process flows from descriptions
   - Suggest workflow optimizations
   - Predict completion times

5. **Integrations**
   - HF Architecture TikZ diagrams
   - Material You presentations
   - Megatron memory estimation

## Maintenance

**Regular Updates**
- Review process guides quarterly
- Update workflow templates based on changes
- Monitor performance metrics
- Update infra-skills dependencies

**Monitoring**
- Track diagram generation performance
- Monitor API response times
- Log errors and issues
- User engagement metrics

## Support

For issues or enhancements:
1. Check INFRA_SKILLS.md for integration details
2. Review flowchart-generator.ts for diagram logic
3. Check component files for UI issues
4. Consult API route for endpoint questions

---

**Version**: 1.0  
**Last Updated**: 2026-07-17  
**Status**: Production Ready ✅
