const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function estimateCalories(
  name: string,
  quantity: number | null,
  unit: "g" | "portion",
): Promise<number | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;

  const qty =
    quantity === null
      ? "1 standard serving"
      : unit === "g"
        ? `${quantity} grams`
        : `${quantity} serving${quantity === 1 ? "" : "s"}`;

  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        messages: [
          {
            role: "system",
            content:
              "You are a nutrition estimator. Reply with only an integer number of kilocalories. No words, no units, no explanation.",
          },
          {
            role: "user",
            content: `Estimate the calorie count for: ${qty} of ${name}. Respond with only a number, no explanation.`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    const match = text.replace(/,/g, "").match(/\d+(\.\d+)?/);
    if (!match) return null;
    const value = Number(match[0]);
    if (!isFinite(value) || value <= 0 || value > 20000) return null;
    return Math.round(value);
  } catch {
    return null;
  }
}
