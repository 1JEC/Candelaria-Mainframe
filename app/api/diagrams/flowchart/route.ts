import { NextRequest, NextResponse } from "next/server";
import { generateFlowchart, workflowTemplates } from "@/lib/diagrams/flowchart-generator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const template = searchParams.get("template");

  try {
    let config;

    switch (template) {
      case "lead-intake":
        config = workflowTemplates.leadIntake();
        break;
      case "content-publishing":
        config = workflowTemplates.contentPublishing();
        break;
      case "email-campaign":
        config = workflowTemplates.emailCampaign();
        break;
      case "project-delivery":
        config = workflowTemplates.projectDelivery();
        break;
      case "social-media-strategy":
        config = workflowTemplates.socialMediaStrategy();
        break;
      case "client-onboarding":
        config = workflowTemplates.clientOnboarding();
        break;
      default:
        return NextResponse.json(
          {
            error: "Invalid template",
            validOptions: [
              "lead-intake",
              "content-publishing",
              "email-campaign",
              "project-delivery",
              "social-media-strategy",
              "client-onboarding",
            ],
          },
          { status: 400 }
        );
    }

    const html = generateFlowchart(config);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Flowchart generation error:", error);
    return NextResponse.json({ error: "Failed to generate flowchart" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, nodes, edges, layout } = body;

    if (!title || !nodes || !edges) {
      return NextResponse.json(
        { error: "Missing required fields: title, nodes, edges" },
        { status: 400 }
      );
    }

    const html = generateFlowchart({
      title,
      nodes,
      edges,
      layout,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Flowchart generation error:", error);
    return NextResponse.json({ error: "Failed to generate flowchart" }, { status: 500 });
  }
}
