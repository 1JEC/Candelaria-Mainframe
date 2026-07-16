import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { agentRuns } from "@/drizzle/schema";

const client = new Anthropic();

export async function generateContent(request: {
  platforms: string[];
  contentType: string;
  tone: string;
  topic?: string;
}) {
  const runId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const prompt = `
You are a social media content expert for Candelaria Agency (Dutch web design bureau).
Generate ${request.platforms.join("/")} content in ${request.tone} tone.
Content type: ${request.contentType}
${request.topic ? `Topic: ${request.topic}` : ""}

Return JSON with this structure:
{
  "versions": [
    {
      "platform": "instagram",
      "caption": "...",
      "hashtags": ["..."],
      "callToAction": "optional"
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

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { versions: [] };

    // Log agent run
    await db.insert(agentRuns).values({
      id: runId,
      agentType: "content_generator",
      module: "social",
      inputSummary: `Generate ${request.contentType} for ${request.platforms.join("/")}`,
      toolsCalled: [],
      outputSummary: `Generated ${result.versions.length} variations`,
      success: true,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      estimatedCost: (
        (message.usage.input_tokens * 0.000003 +
          message.usage.output_tokens * 0.000015) *
        1.2 // Buffer for model pricing
      ).toFixed(4),
      duration: Date.now() - startTime,
      createdAt: new Date(),
      completedAt: new Date(),
    });

    return result;
  } catch (error) {
    // Log failure
    await db.insert(agentRuns).values({
      id: runId,
      agentType: "content_generator",
      module: "social",
      inputSummary: `Generate ${request.contentType}`,
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
