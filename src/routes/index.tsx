import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cut and Buk Tracker" },
      { name: "description", content: "Track fitness and diet with Cut Tracker." },
      { property: "og:title", content: "Cut and Buk Tracker" },
      { property: "og:description", content: "Track fitness and diet with Cut Tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold">Cut and Buk Tracker</h1>
      <button
        type="button"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Connect Whoop
      </button>
    </div>
  );
}
