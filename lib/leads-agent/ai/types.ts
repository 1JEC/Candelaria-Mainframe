/** Shared result shape for budget/key-gated AI jobs — §5: "pipeline continues without AI, leads marked ai_pending, never silent." */
export type AiJobResult<T> =
  | { ok: true; data: T; model: string; strippedSentences: string[] }
  | { ok: false; reason: "budget_exceeded" | "no_api_key" };
