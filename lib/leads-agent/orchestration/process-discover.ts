import { DISCOVERY_SOURCES, classifyCandidate } from "@/lib/leads-agent/discovery";
import { createTasks } from "./task-queue";
import { emitEvent } from "./events";

interface DiscoverTarget {
  sourceKey: string;
  city: string;
  sector: string;
  limit: number;
}

export async function processDiscoverTask(runId: string, taskId: string, targetJson: string) {
  const target: DiscoverTarget = JSON.parse(targetJson);
  const source = DISCOVERY_SOURCES.find((s) => s.key === target.sourceKey);
  if (!source) throw new Error(`Onbekende bron: ${target.sourceKey}`);

  await emitEvent({
    runId,
    taskId,
    code: "source.query",
    messageNl: `Zoeken via ${source.label}: "${target.sector}" in ${target.city}.`,
  });

  const candidates = await source.discover({ city: target.city, sector: target.sector, limit: target.limit });

  const newTargets: string[] = [];
  let duplicates = 0;
  let suppressed = 0;

  for (const candidate of candidates) {
    const outcome = await classifyCandidate(candidate);
    if (outcome.status === "new") {
      newTargets.push(JSON.stringify(candidate));
      await emitEvent({
        runId,
        taskId,
        code: "candidate.found",
        messageNl: `Gevonden: ${candidate.companyName}${candidate.city ? ` (${candidate.city})` : ""}.`,
        payload: { sourceMethod: candidate.sourceMethod, website: candidate.website ?? null },
      });
    } else if (outcome.status === "duplicate") {
      duplicates++;
      await emitEvent({ runId, taskId, code: "dedupe.skip", messageNl: `Overgeslagen (al bekend): ${candidate.companyName}.`, level: "info" });
    } else {
      suppressed++;
      await emitEvent({ runId, taskId, code: "suppression.skip", messageNl: `Overgeslagen (onderdrukkingslijst): ${candidate.companyName}.`, level: "info" });
    }
  }

  await createTasks(runId, "process_candidate", newTargets);

  return { found: candidates.length, new: newTargets.length, duplicates, suppressed };
}
