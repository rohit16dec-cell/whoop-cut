import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/whoop-callback")({
  head: () => ({
    meta: [
      { title: "Whoop Connected — Cut Tracker" },
      { name: "description", content: "Whoop OAuth callback placeholder for Cut Tracker." },
      { property: "og:title", content: "Whoop Connected — Cut Tracker" },
      { property: "og:description", content: "Whoop OAuth callback placeholder for Cut Tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WhoopCallback,
});

function WhoopCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-lg">Whoop connected successfully</p>
    </div>
  );
}
