import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type WhoopStats = {
  strain: number | null;
  recovery: number | null;
  calories: number | null;
};

const SUMMARY_EVERY = 15;
const RAW_WINDOW = 8;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export const listChatMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(`Failed to load chat: ${error.message}`);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      role: (r.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: r.content as string,
      created_at: r.created_at as string,
    })) satisfies ChatMessage[];
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { content: string; whoop?: WhoopStats | null }) => {
      const content = String(data?.content ?? "").trim();
      if (!content) throw new Error("Message cannot be empty");
      if (content.length > 4000) throw new Error("Message is too long");
      const w = data?.whoop ?? null;
      const num = (v: unknown) =>
        typeof v === "number" && isFinite(v) ? v : null;
      return {
        content,
        whoop: w
          ? { strain: num(w.strain), recovery: num(w.recovery), calories: num(w.calories) }
          : null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error: insertUserError } = await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "user",
      content: data.content,
    });
    if (insertUserError) throw new Error(`Failed to save message: ${insertUserError.message}`);

    // --- gather compact context ---
    const [recentRes, summaryRes, prefsRes, logsRes, countRes] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(RAW_WINDOW),
      supabase
        .from("chat_summaries")
        .select("summary, messages_covered")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("diet_preferences")
        .select("diet_type, food_items, deficit_kcal")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("food_logs")
        .select("name, quantity, unit, calories")
        .eq("user_id", userId)
        .eq("entry_date", todayUtc()),
      supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    const recent = (recentRes.data ?? []).slice().reverse() as {
      role: string;
      content: string;
    }[];
    const summary = (summaryRes.data?.summary as string | undefined) ?? "";
    const prefs = prefsRes.data as
      | { diet_type: string | null; food_items: unknown; deficit_kcal: number | null }
      | null;
    const logs = (logsRes.data ?? []) as {
      name: string;
      quantity: number | null;
      unit: string;
      calories: number | null;
    }[];

    const eaten = logs.reduce((sum, l) => sum + (Number(l.calories) || 0), 0);
    const deficit = prefs?.deficit_kcal === null || prefs?.deficit_kcal === undefined
      ? null
      : Number(prefs.deficit_kcal);
    const burned = data.whoop?.calories ?? null;
    const target = deficit !== null && burned !== null ? Math.round(burned - deficit) : null;
    const remaining = target !== null ? target - Math.round(eaten) : null;

    const foodList = Array.isArray(prefs?.food_items)
      ? (prefs.food_items as { name?: string }[])
          .map((f) => f?.name)
          .filter(Boolean)
          .slice(0, 40)
          .join(", ")
      : "";

    const contextBlock = [
      "TODAY'S WHOOP STATS:",
      `- Strain: ${data.whoop?.strain ?? "unknown"}`,
      `- Recovery: ${data.whoop?.recovery ?? "unknown"}%`,
      `- Calories burned: ${burned ?? "unknown"}`,
      "",
      "DIET & BUDGET:",
      `- Diet type: ${prefs?.diet_type ?? "not set"}`,
      `- Preferred foods: ${foodList || "none saved"}`,
      `- Daily deficit target: ${deficit ?? "not set"} kcal`,
      `- Calorie target today: ${target ?? "unknown"} kcal`,
      `- Calories eaten today: ${Math.round(eaten)} kcal`,
      `- Remaining calories today: ${remaining ?? "unknown"} kcal`,
      `- Foods logged today: ${
        logs.length
          ? logs
              .map(
                (l) =>
                  `${l.name}${l.quantity ? ` ${l.quantity}${l.unit === "g" ? "g" : " portion(s)"}` : ""}`,
              )
              .join(", ")
          : "nothing yet"
      }`,
      "",
      summary ? `CONVERSATION SUMMARY SO FAR:\n${summary}` : "CONVERSATION SUMMARY SO FAR: (none yet)",
    ].join("\n");

    const { runCoach, inputItem } = await import("@/lib/coach.server");

    const systemPrompt =
      "You are a personal cut/bulk coaching assistant inside a fitness tracker app. " +
      "You advise on calories, macros, training load, recovery and food choices based on the user's " +
      "Whoop data, diet preferences and calorie budget. Be concise, practical and specific — " +
      "prefer short paragraphs and bullet points. Respect the user's diet type. " +
      "Never invent numbers: if a stat is unknown, say so and ask the user. " +
      "You are not a doctor; suggest professional advice for medical concerns. " +
      "Keep answers under 200 words unless the user asks for detail.";

    let reply = "";
    try {
      reply = await runCoach([
        inputItem("system", `${systemPrompt}\n\n${contextBlock}`),
        ...recent.map((m) =>
          inputItem(m.role === "assistant" ? "assistant" : "user", m.content),
        ),
      ]);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e));
    }
    if (!reply) reply = "I couldn't generate a response just now. Please try again.";

    const { error: insertAssistantError } = await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "assistant",
      content: reply,
    });
    if (insertAssistantError) {
      throw new Error(`Failed to save reply: ${insertAssistantError.message}`);
    }

    // --- refresh the running summary every 15 messages ---
    const total = (countRes.count ?? recent.length) + 1; // + assistant message
    const covered = Number(summaryRes.data?.messages_covered ?? 0);
    if (total - covered >= SUMMARY_EVERY) {
      try {
        const { data: history } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(40);
        const transcript = (history ?? [])
          .slice()
          .reverse()
          .map((m) => `${m.role === "assistant" ? "Coach" : "User"}: ${m.content}`)
          .join("\n")
          .slice(0, 12000);

        const newSummary = await runCoach([
          inputItem(
            "system",
            "Summarize this coaching conversation into a compact running summary (max 180 words). " +
              "Keep the user's goals, constraints, injuries, food likes/dislikes, agreed plans and open questions. " +
              "Output only the summary text.",
          ),
          inputItem(
            "user",
            `${summary ? `Previous summary:\n${summary}\n\n` : ""}Recent conversation:\n${transcript}`,
          ),
        ]);

        if (newSummary) {
          await supabase.from("chat_summaries").upsert(
            {
              user_id: userId,
              summary: newSummary,
              messages_covered: total,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        }
      } catch (e) {
        console.error("Failed to update chat summary", e);
      }
    }

    return { reply };
  });
