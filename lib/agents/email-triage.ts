import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { emails, agentRuns } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const client = new Anthropic();

export async function triageEmail(emailId: string) {
  const runId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const email = await db.query.emails.findFirst({
      where: eq(emails.id, emailId),
    });

    if (!email) throw new Error("Email not found");

    const prompt = `
Classify this email and assign priority (1=high, 5=low):

From: ${email.from}
Subject: ${email.subject}
Body: ${email.bodyPlain?.slice(0, 500) || ""}

Categories: new_request, customer, invoice, spam, other

Return JSON:
{
  "category": "new_request",
  "priority": 1,
  "reasoning": "..."
}
`;

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const content =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Update email with triage
    await db
      .update(emails)
      .set({
        aiTriageCategory: result.category || "other",
        aiTriagePriority: result.priority || 3,
      })
      .where(eq(emails.id, emailId));

    // Log agent run
    await db.insert(agentRuns).values({
      id: runId,
      agentType: "triage",
      module: "mail",
      inputSummary: `Triage email from ${email.from}`,
      toolsCalled: [],
      outputSummary: `Categorized as ${result.category}`,
      success: true,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      estimatedCost: "0.001",
      duration: Date.now() - startTime,
      createdAt: new Date(),
      completedAt: new Date(),
    });

    return result;
  } catch (error) {
    await db.insert(agentRuns).values({
      id: runId,
      agentType: "triage",
      module: "mail",
      inputSummary: "Email triage",
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
