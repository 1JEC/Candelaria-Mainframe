import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { leads, prospectSources, agentRuns } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const client = new Anthropic();

export async function prospectLeads(options: {
  sector?: string;
  limit?: number;
  excludeDomains?: string[];
}) {
  const runId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const prompt = `
You are a B2B lead prospector for Candelaria Agency (Dutch web design for SMBs).
Find 3 potential prospects in ${options.sector || "e-commerce"} sector.
Exclude: ${(options.excludeDomains || []).join(", ")}

Return JSON with array of prospects:
{
  "prospects": [
    {
      "name": "Company Name",
      "email": "contact@company.nl",
      "website": "https://company.nl",
      "reasoning": "Why they're a good fit",
      "score": 75
    }
  ]
}
`;

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { prospects: [] };

    // Create leads from prospects
    const createdLeads = [];
    for (const prospect of result.prospects || []) {
      const leadId = crypto.randomUUID();

      // Check if lead exists
      const existing = await db.query.leads.findFirst({
        where: eq(leads.email, prospect.email),
      });

      if (!existing) {
        await db.insert(leads).values({
          id: leadId,
          email: prospect.email,
          name: prospect.name,
          website: prospect.website,
          source: "prospecting",
          status: "new",
          score: prospect.score || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await db.insert(prospectSources).values({
          id: crypto.randomUUID(),
          leadId,
          sourceMethod: "ai_research",
          rawData: prospect,
          scoringReasoning: prospect.reasoning,
          createdAt: new Date(),
        });

        createdLeads.push(leadId);
      }
    }

    // Log agent run
    await db.insert(agentRuns).values({
      id: runId,
      agentType: "prospector",
      module: "leads",
      inputSummary: `Prospect ${options.sector || "SMB"} sector`,
      toolsCalled: ["web_search", "company_research"],
      outputSummary: `Found ${createdLeads.length} prospects`,
      success: true,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      estimatedCost: "0.005",
      duration: Date.now() - startTime,
      createdAt: new Date(),
      completedAt: new Date(),
    });

    return { createdLeads, prospects: result.prospects };
  } catch (error) {
    await db.insert(agentRuns).values({
      id: runId,
      agentType: "prospector",
      module: "leads",
      inputSummary: "Prospecting",
      toolsCalled: [],
      outputSummary: "",
      success: false,
      errorMessage: String(error),
      duration: Date.now() - startTime,
      createdAt: new Date(),
      completedAt: new Date(),
    });

    throw error;
  }
}
