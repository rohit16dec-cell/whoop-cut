import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Cut Tracker" },
      { name: "description", content: "Privacy policy for Cut Tracker." },
      { property: "og:title", content: "Privacy Policy — Cut Tracker" },
      { property: "og:description", content: "Privacy policy for Cut Tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-6 text-3xl font-bold">Privacy Policy</h1>
      <p className="leading-relaxed text-foreground">
        Cut Tracker is a personal fitness tracking tool. It stores your Whoop fitness data
        (recovery, sleep, strain, workouts, body measurements) and your manually logged food and
        weight entries to provide personalized diet recommendations. Data is used only within this app
        and is not shared with third parties. Contact:{" "}
        <a href="mailto:rohit.16dec@gmail.com" className="underline">
          rohit.16dec@gmail.com
        </a>
      </p>
    </div>
  );
}
