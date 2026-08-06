const RESPONSES_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

type InputItem = {
  role: "system" | "user" | "assistant";
  content: { type: "input_text" | "output_text"; text: string }[];
};

export function inputItem(
  role: "system" | "user" | "assistant",
  text: string,
): InputItem {
  return {
    role,
    content: [{ type: role === "assistant" ? "output_text" : "input_text", text }],
  };
}

/**
 * Calls the Lovable AI gateway Responses API with streaming (required for
 * reasoning models) and returns the accumulated final text.
 */
export async function runCoach(input: InputItem[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing key).");

  const res = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI is rate limited. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && !text) {
          text = evt.response?.output_text ?? "";
        }
      } catch {
        // ignore malformed keep-alive chunks
      }
    }
  }

  return text.trim();
}
